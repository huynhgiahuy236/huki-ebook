import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../../prisma/prisma.module';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [EventEmitterModule.forRoot(), PrismaModule, AuthModule],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
