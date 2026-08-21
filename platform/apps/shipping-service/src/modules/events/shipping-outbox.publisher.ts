import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { DomainEvent, RabbitMqEventBus } from '../../../../../libs/shared/src';
import { OutboxStatus } from '../../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ShippingOutboxPublisher
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ShippingOutboxPublisher.name);
  private timer?: NodeJS.Timeout;
  private publishing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: RabbitMqEventBus,
  ) {}

  onApplicationBootstrap(): void {
    void this.prisma.outboxEvent
      .updateMany({
        where: {
          status: OutboxStatus.PROCESSING,
          updatedAt: { lt: new Date(Date.now() - 60_000) },
        },
        data: { status: OutboxStatus.PENDING },
      })
      .catch((error) =>
        this.logger.error('Unable to recover stale outbox rows', error),
      );
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
        where: { status: OutboxStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });
      for (const row of events) {
        const claimed = await this.prisma.outboxEvent.updateMany({
          where: { id: row.id, status: OutboxStatus.PENDING },
          data: { status: OutboxStatus.PROCESSING, attempts: { increment: 1 } },
        });
        if (!claimed.count) continue;
        try {
          await this.eventBus.publish({
            eventId: row.eventId,
            eventType: row.type,
            occurredAt: row.createdAt.toISOString(),
            producer: 'shipping-service',
            version: 1,
            aggregateId: row.aggregateId,
            payload: row.payload as Record<string, unknown>,
          });
          await this.prisma.outboxEvent.update({
            where: { id: row.id },
            data: { status: OutboxStatus.COMPLETED, processedAt: new Date() },
          });
        } catch (error) {
          const terminal = row.attempts + 1 >= 3;
          await this.prisma.outboxEvent.update({
            where: { id: row.id },
            data: {
              status: terminal ? OutboxStatus.FAILED : OutboxStatus.PENDING,
            },
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
