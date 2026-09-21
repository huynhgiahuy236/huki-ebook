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
    // 1. Validate allowlist
    if (!ALLOWED_TELEMETRY_EVENT_TYPES.includes(dto.event_type as any)) {
      throw new BadRequestException(
        `Invalid event_type "${dto.event_type}". Client telemetry only accepts: ${ALLOWED_TELEMETRY_EVENT_TYPES.join(', ')}`,
      );
    }

    // 2. Server-derives authenticated userId (prevents impersonation)
    const effectiveUserId = authenticatedUserId || null;

    // 3. Idempotent check
    const existing = await this.prisma.analyticsEvent.findUnique({
      where: { sourceEventId: dto.event_id },
    });

    if (existing) {
      return {
        status: 'deduplicated',
        eventId: dto.event_id,
        deduplicated: true,
      };
    }

    // 4. Persist raw event
    const createdAt = dto.timestamp ? new Date(dto.timestamp) : new Date();

    try {
      await this.prisma.analyticsEvent.create({
        data: {
          sourceEventId: dto.event_id,
          eventType: dto.event_type,
          userId: effectiveUserId,
          sessionId: dto.session_id || null,
          storeId: dto.store_id || null,
          bookId: dto.book_id || null,
          properties: dto.properties ? JSON.parse(JSON.stringify(dto.properties)) : undefined,
          context: dto.context ? JSON.parse(JSON.stringify(dto.context)) : undefined,
          createdAt,
        },
      });

      return {
        status: 'success',
        eventId: dto.event_id,
      };
    } catch (err: any) {
      if (err.code === 'P2002') {
        // Unique constraint violation on sourceEventId (concurrent duplicate)
        return {
          status: 'deduplicated',
          eventId: dto.event_id,
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
