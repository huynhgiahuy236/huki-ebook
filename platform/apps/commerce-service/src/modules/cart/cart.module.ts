import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthenticatedGuard } from '../../common/book-auth.guard';
import { Book, Cart, CartItem } from '../../entities';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cart, CartItem, Book])],
  controllers: [CartController],
  providers: [CartService, AuthenticatedGuard],
  exports: [CartService],
})
export class CartModule {}
