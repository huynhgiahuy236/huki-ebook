import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';
import { FlashSalesModule } from './modules/flash-sales/flash-sales.module';
import { BannersModule } from './modules/banners/banners.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { PromotionOutboxModule } from './modules/outbox/outbox.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    VouchersModule,
    FlashSalesModule,
    BannersModule,
    PromotionsModule,
    PromotionOutboxModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
