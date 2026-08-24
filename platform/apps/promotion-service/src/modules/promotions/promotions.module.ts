import { Module } from '@nestjs/common';
import { InternalPromotionsController } from './internal.controller';
import { VouchersModule } from '../vouchers/vouchers.module';
import { FlashSalesModule } from '../flash-sales/flash-sales.module';

@Module({
  imports: [VouchersModule, FlashSalesModule],
  controllers: [InternalPromotionsController],
})
export class PromotionsModule {}
