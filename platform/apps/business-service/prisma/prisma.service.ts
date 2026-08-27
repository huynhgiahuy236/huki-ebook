import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from './generated/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      // Outbox polling runs every second. Logging every Prisma query makes the
      // development console look like an error stream even when the queue is
      // idle, so keep operational messages and suppress routine SQL output.
      log: ['info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('📦 Business Service - Prisma connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
