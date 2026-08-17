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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Get current user cart' })
  get(@CurrentBookActor() actor: BookActor) {
    return this.cartService.getCart(actor.sub);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  add(@CurrentBookActor() actor: BookActor, @Body() dto: AddCartItemDto) {
    return this.cartService.add(actor.sub, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  update(
    @CurrentBookActor() actor: BookActor,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.update(actor.sub, itemId, dto.quantity);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  remove(
    @CurrentBookActor() actor: BookActor,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.cartService.remove(actor.sub, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire cart' })
  async clear(@CurrentBookActor() actor: BookActor) {
    await this.cartService.clear(actor.sub);
    return { message: 'Cart cleared' };
  }
}
