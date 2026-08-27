import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { DomainEvent, RabbitMqEventBus } from '../../../../../libs/shared/src';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PromotionOutboxPublisher
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(PromotionOutboxPublisher.name);
  private timer?: NodeJS.Timeout;
  private publishing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: RabbitMqEventBus,
  ) {}

  onApplicationBootstrap(): void {
    // Recover stale PROCESSING events (may have been left by a crashed publisher)
    void this.prisma.outboxEvent
      .updateMany({
        where: {
          status: 'PROCESSING',
          updatedAt: { lt: new Date(Date.now() - 60_000) },
        },
        data: { status: 'PENDING' },
      })
      .catch((error) =>
        this.logger.error('Unable to recover stale outbox rows', error),
      );

    // Start polling
    void this.publishPending();
    this.timer = setInterval(() => void this.publishPending(), 1_000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async publishPending(): Promise<void> {
    if (this.publishing) return;
    this.publishing = true;

    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });

      for (const row of events) {
        // Claim the event (optimistic locking)
        const claimed = await this.prisma.outboxEvent.updateMany({
          where: { id: row.id, status: 'PENDING' },
          data: { status: 'PROCESSING', attempts: { increment: 1 } },
        });

        if (!claimed.count) continue; // Already claimed by another instance

        try {
          const event: DomainEvent = {
            eventId: row.eventId,
            eventType: row.type,
            occurredAt: row.createdAt.toISOString(),
            producer: 'promotion-service',
            version: 1,
            aggregateId: row.aggregateId,
            payload: row.payload as Record<string, unknown>,
          };

          await this.eventBus.publish(event);
          await this.prisma.outboxEvent.update({
            where: { id: row.id },
            data: { status: 'COMPLETED', publishedAt: new Date() },
          });
        } catch (error) {
          // Retry logic: mark as PENDING for retry, or FAILED after 3 attempts
          const terminal = row.attempts + 1 >= 3;
          await this.prisma.outboxEvent.update({
            where: { id: row.id },
            data: { status: terminal ? 'FAILED' : 'PENDING' },
          });

          this.logger.error(
            `Unable to publish ${row.eventId}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    } finally {
      this.publishing = false;
    }
  }
}
