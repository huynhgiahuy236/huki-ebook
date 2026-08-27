import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '../../../prisma/generated/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class BusinessOutboxService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add an event to the outbox for reliable publishing
   */
  async addToOutbox(type: string, aggregateId: string, payload: Prisma.InputJsonValue): Promise<void> {
    await this.prisma.outboxEvent.create({
      data: {
        eventId: randomBytes(16).toString('hex'),
        type,
        aggregateId,
        payload,
        status: 'PENDING',
      },
    });
  }

  /**
   * Add multiple events to the outbox in a single transaction
   */
  async addManyToOutbox(
    events: Array<{ type: string; aggregateId: string; payload: Prisma.InputJsonValue }>,
  ): Promise<void> {
    if (events.length === 0) return;

    await this.prisma.outboxEvent.createMany({
      data: events.map((event) => ({
        eventId: randomBytes(16).toString('hex'),
        type: event.type,
        aggregateId: event.aggregateId,
        payload: event.payload,
        status: 'PENDING',
      })),
    });
  }
}
