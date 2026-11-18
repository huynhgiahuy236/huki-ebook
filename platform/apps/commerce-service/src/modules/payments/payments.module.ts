import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrdersModule } from '../orders/orders.module';
import { AffiliateModule } from '../affiliate/affiliate.module';
import { PayOSService } from './payos.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [ConfigModule, OrdersModule, AffiliateModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PayOSService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
