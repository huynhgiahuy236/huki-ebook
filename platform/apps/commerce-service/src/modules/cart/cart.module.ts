import { Module } from '@nestjs/common';
import { AuthenticatedGuard } from '../../common/book-auth.guard';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  controllers: [CartController],
  providers: [CartService, AuthenticatedGuard],
  exports: [CartService],
})
export class CartModule {}
