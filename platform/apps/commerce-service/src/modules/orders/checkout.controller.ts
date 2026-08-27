import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Preview checkout with shipping and payment options' })
  preview(@CurrentBookActor() actor: BookActor, @Body() dto: CheckoutPreviewDto) {
    return this.checkout.preview(actor.sub, dto);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm checkout and create order' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Unique key to prevent duplicate orders' })
  confirm(@CurrentBookActor() actor: BookActor, @Headers('idempotency-key') key: string, @Body() dto: CheckoutConfirmDto) {
    return this.checkout.confirm(actor.sub, key, dto);
  }
}
