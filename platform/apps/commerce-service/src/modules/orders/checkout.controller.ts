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
} from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { AuthenticatedGuard, BookActor } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { CheckoutService } from './checkout.service';
import { CheckoutConfirmDto, CheckoutPreviewDto } from './dto/checkout.dto';

@ApiTags('Checkout')
@ApiBearerAuth('JWT-auth')
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
  @ApiSuccessResponse(undefined, { description: 'Checkout preview' })
  @ApiStandardErrors(400, 401, 404)
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
  @ApiSuccessResponse(undefined, { description: 'Order created successfully' })
  @ApiStandardErrors(400, 401, 404, 409)
  confirm(
    @CurrentBookActor() actor: BookActor,
    @Headers('idempotency-key') key: string,
    @Body() dto: CheckoutConfirmDto,
    @Headers('x-affiliate-token') headerAffiliateToken?: string,
    @Headers('cookie') rawCookies?: string,
  ) {
    if (!dto.affiliateToken) {
      if (headerAffiliateToken) {
        dto.affiliateToken = headerAffiliateToken;
      } else if (rawCookies) {
        const cookiePairs = rawCookies.split(';').map((c) => c.trim());
        const clickMatch = cookiePairs.find((row) => row.startsWith('huki_aff_click='));
        if (clickMatch) {
          dto.affiliateToken = decodeURIComponent(clickMatch.substring('huki_aff_click='.length));
        } else {
          const codeMatch = cookiePairs.find((row) => row.startsWith('huki_aff_code='));
          if (codeMatch) {
            dto.affiliateToken = decodeURIComponent(codeMatch.substring('huki_aff_code='.length));
          }
        }
      }
    }
    return this.checkout.confirm(actor.sub, key, dto, actor.email);
  }
}
