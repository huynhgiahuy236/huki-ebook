/**
 * HUKI EBOOK - Checkout Controller
 *
 * Handles checkout preview and confirmation
 */

import { Body, Controller, Headers, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AuthenticatedGuard, BookActor } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { CheckoutService } from './checkout.service';
import { CheckoutConfirmDto, CheckoutPreviewDto } from './dto/checkout.dto';

@ApiTags('Checkout')
@ApiBearerAuth()
@UseGuards(AuthenticatedGuard)
@Controller('cart/checkout')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview checkout',
    description: 'Returns a preview of the checkout including shipping options, payment methods, and total.',
  })
  @ApiResponse({ status: 200, description: 'Checkout preview' })
  @ApiBadRequestResponse({ description: 'Invalid checkout data' })
  @ApiNotFoundResponse({ description: 'Cart or item not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  preview(@CurrentBookActor() actor: BookActor, @Body() dto: CheckoutPreviewDto) {
    return this.checkout.preview(actor.sub, dto);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm checkout',
    description: 'Confirms the checkout and creates the order. Requires Idempotency-Key header.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Unique key to prevent duplicate orders (UUID recommended)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: 'Order created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid checkout data or expired quote' })
  @ApiNotFoundResponse({ description: 'Cart, address, or item not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  confirm(
    @CurrentBookActor() actor: BookActor,
    @Headers('idempotency-key') key: string,
    @Body() dto: CheckoutConfirmDto,
  ) {
    return this.checkout.confirm(actor.sub, key, dto);
  }
}
