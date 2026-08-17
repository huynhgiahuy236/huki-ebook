import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user cart' })
  async getCart(@Query('userId') userId: string) {
    const cart = await this.cartService.getCart(userId);
    return { data: cart };
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add item to cart' })
  async addToCart(
    @Query('userId') userId: string,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.addToCart(userId, dto);
  }

  @Patch('items/:bookId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateCartItem(
    @Query('userId') userId: string,
    @Param('bookId') bookId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(userId, bookId, dto);
  }

  @Delete('items/:bookId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeFromCart(
    @Query('userId') userId: string,
    @Param('bookId') bookId: string,
  ) {
    return this.cartService.removeFromCart(userId, bookId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear entire cart' })
  async clearCart(@Query('userId') userId: string) {
    return this.cartService.clearCart(userId);
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merge guest cart to user cart' })
  async mergeGuestCart(
    @Query('userId') userId: string,
    @Body() items: { bookId: string; quantity: number }[],
  ) {
    const cart = await this.cartService.mergeGuestCart(userId, items);
    return { data: cart };
  }
}
