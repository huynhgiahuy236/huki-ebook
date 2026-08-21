import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrdersModule } from '../orders/orders.module';
import { AuthenticatedGuard } from '../../common/book-auth.guard';
import { PayOSService } from './payos.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [ConfigModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PayOSService, AuthenticatedGuard],
  exports: [PaymentsService],
})
export class PaymentsModule {}
