import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto, ALLOWED_TELEMETRY_EVENT_TYPES } from '../dto/events.dto';

export interface IngestionResult {
  status: 'success' | 'deduplicated';
  eventId: string;
  deduplicated?: boolean;
}

@Injectable()
export class EventCollector {
  private readonly logger = new Logger(EventCollector.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Collect a single client telemetry event
   */
  async collectEvent(
    dto: CreateEventDto,
    authenticatedUserId?: string | null,
  ): Promise<IngestionResult> {
    const eventId = dto.event_id || dto.sourceEventId;
    const eventType = dto.event_type || dto.eventType;
    if (!eventId || !eventType) {
      throw new BadRequestException('event_id and event_type are required');
    }

    // 1. Validate allowlist
    if (!ALLOWED_TELEMETRY_EVENT_TYPES.includes(eventType as any)) {
      throw new BadRequestException(
        `Invalid event_type "${eventType}". Client telemetry only accepts: ${ALLOWED_TELEMETRY_EVENT_TYPES.join(', ')}`,
      );
    }

    // 2. Server-derives authenticated userId (prevents impersonation)
    const effectiveUserId = authenticatedUserId || null;

    // 3. Idempotent check
    const existing = await this.prisma.analyticsEvent.findUnique({
      where: { sourceEventId: eventId },
    });

    if (existing) {
      return {
        status: 'deduplicated',
        eventId,
        deduplicated: true,
      };
    }

    // 4. Persist raw event
    const createdAt = dto.timestamp ? new Date(dto.timestamp) : (dto.createdAt ? new Date(dto.createdAt) : new Date());

    try {
      await this.prisma.analyticsEvent.create({
        data: {
          sourceEventId: eventId,
          eventType,
          userId: effectiveUserId,
          sessionId: dto.session_id || dto.sessionId || null,
          storeId: dto.store_id || dto.storeId || null,
          bookId: dto.book_id || dto.bookId || null,
          properties: dto.properties ? JSON.parse(JSON.stringify(dto.properties)) : undefined,
          context: dto.context ? JSON.parse(JSON.stringify(dto.context)) : undefined,
          createdAt,
        },
      });

      return {
        status: 'success',
        eventId,
      };
    } catch (err: any) {
      if (err.code === 'P2002') {
        // Unique constraint violation on sourceEventId (concurrent duplicate)
        return {
          status: 'deduplicated',
          eventId,
          deduplicated: true,
        };
      }
      throw err;
    }
  }

  /**
   * Collect a batch of client telemetry events
   */
  async collectBatch(
    events: CreateEventDto[],
    authenticatedUserId?: string | null,
  ): Promise<{ total: number; ingested: number; deduplicated: number; results: IngestionResult[] }> {
    const results: IngestionResult[] = [];
    let ingested = 0;
    let deduplicated = 0;

    for (const event of events) {
      const res = await this.collectEvent(event, authenticatedUserId);
      results.push(res);
      if (res.status === 'deduplicated') {
        deduplicated++;
      } else {
        ingested++;
      }
    }

    return {
      total: events.length,
      ingested,
      deduplicated,
      results,
    };
  }
}
