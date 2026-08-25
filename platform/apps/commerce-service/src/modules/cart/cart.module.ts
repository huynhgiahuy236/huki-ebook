import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartCacheService } from './cart-cache.service';

@Module({
  controllers: [CartController],
  providers: [CartService, CartCacheService],
  exports: [CartService],
})
export class CartModule {}
