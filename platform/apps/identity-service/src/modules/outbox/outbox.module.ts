import { Module } from '@nestjs/common';
import { EventsModule as SharedEventsModule } from '../../../../../libs/shared/src';
import { IdentityOutboxService } from './outbox.service';
import { IdentityOutboxPublisher } from './identity-outbox.publisher';

@Module({
  imports: [SharedEventsModule],
  providers: [IdentityOutboxService, IdentityOutboxPublisher],
  exports: [IdentityOutboxService],
})
export class IdentityOutboxModule {}
