import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
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
  @Post('preview') preview(@CurrentBookActor() actor: BookActor, @Body() dto: CheckoutPreviewDto) { return this.checkout.preview(actor.sub, dto); }
  @Post('confirm')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  confirm(@CurrentBookActor() actor: BookActor, @Headers('idempotency-key') key: string, @Body() dto: CheckoutConfirmDto) { return this.checkout.confirm(actor.sub, key, dto); }
}

