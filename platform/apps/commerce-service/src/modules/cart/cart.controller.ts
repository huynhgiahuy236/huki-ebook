/**
 * HUKI EBOOK - Cart Controller
 *
 * Handles user shopping cart operations
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiParam,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthenticatedGuard, BookActor } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(AuthenticatedGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({
    summary: 'Get current user cart',
    description: 'Returns the current user\'s shopping cart with all items.',
  })
  @ApiResponse({ status: 200, description: 'Cart details' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  get(@CurrentBookActor() actor: BookActor) {
    return this.cartService.getCart(actor.sub);
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add item to cart',
    description: 'Adds a book to the user\'s shopping cart.',
  })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  @ApiBadRequestResponse({ description: 'Invalid item or quantity' })
  @ApiNotFoundResponse({ description: 'Book not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  add(@CurrentBookActor() actor: BookActor, @Body() dto: AddCartItemDto) {
    return this.cartService.add(actor.sub, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({
    summary: 'Update cart item quantity',
    description: 'Updates the quantity of an item in the cart.',
  })
  @ApiParam({ name: 'itemId', description: 'Cart item ID' })
  @ApiResponse({ status: 200, description: 'Item quantity updated' })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  @ApiBadRequestResponse({ description: 'Invalid quantity' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  update(
    @CurrentBookActor() actor: BookActor,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.update(actor.sub, itemId, dto.quantity);
  }

  @Delete('items/:itemId')
  @ApiOperation({
    summary: 'Remove item from cart',
    description: 'Removes a specific item from the cart.',
  })
  @ApiParam({ name: 'itemId', description: 'Cart item ID' })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  @ApiNotFoundResponse({ description: 'Cart item not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  remove(
    @CurrentBookActor() actor: BookActor,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.cartService.remove(actor.sub, itemId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear entire cart',
    description: 'Removes all items from the user\'s cart.',
  })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async clear(@CurrentBookActor() actor: BookActor) {
    await this.cartService.clear(actor.sub);
    return { message: 'Đã xóa giỏ hàng' };
  }
}
