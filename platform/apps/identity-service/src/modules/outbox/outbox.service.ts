import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '../../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IdentityOutboxService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add an event to the outbox for reliable publishing.
   * Can accept an existing Prisma transaction client to guarantee atomicity.
   */
  async addToOutbox(
    type: string,
    aggregateId: string,
    payload: Prisma.InputJsonValue,
    tx?: any,
  ): Promise<void> {
    const client = tx || this.prisma;
    await client.outboxEvent.create({
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
    tx?: any,
  ): Promise<void> {
    if (events.length === 0) return;
    const client = tx || this.prisma;

    await client.outboxEvent.createMany({
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
