import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
