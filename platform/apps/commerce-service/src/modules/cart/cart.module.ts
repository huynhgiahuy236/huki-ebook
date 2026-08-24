import { Module } from '@nestjs/common';
import { AuthenticatedGuard } from '../../common/book-auth.guard';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartCacheService } from './cart-cache.service';

@Module({
  controllers: [CartController],
  providers: [CartService, CartCacheService, AuthenticatedGuard],
  exports: [CartService],
})
export class CartModule {}
