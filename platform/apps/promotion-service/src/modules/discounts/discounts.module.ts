import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DiscountsService } from './discounts.service';
import { SellerDiscountsController } from './seller-discounts.controller';
import { DiscountsController } from './discounts.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SellerDiscountsController, DiscountsController],
  providers: [DiscountsService],
  exports: [DiscountsService],
})
export class DiscountsModule {}
