import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedGuard, BookActor } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { CreateRefundDto, InitiatePaymentDto, PayOSWebhookDto, SettleRefundDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('orders/:orderId/initiate')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Create or reuse a PayOS payment link for an online order' })
  initiate(
    @CurrentBookActor() actor: BookActor,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.payments.initiate(actor.sub, orderId, dto);
  }

  @Get('orders/:orderId')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Get payment and refund status for an order' })
  status(
    @CurrentBookActor() actor: BookActor,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.payments.getOrderPayment(actor.sub, orderId);
  }

  @Post('orders/:orderId/refunds')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Request a full or partial PayOS refund' })
  refund(
    @CurrentBookActor() actor: BookActor,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateRefundDto,
  ) {
    return this.payments.requestRefund(actor, orderId, dto);
  }

  @Post('refunds/:refundId/settle')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Reconcile a PayOS refund (platform admin only)' })
  settleRefund(
    @CurrentBookActor() actor: BookActor,
    @Param('refundId', ParseUUIDPipe) refundId: string,
    @Body() dto: SettleRefundDto,
  ) {
    return this.payments.settleRefund(actor, refundId, dto);
  }

  @Post('webhooks/payos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive a signed PayOS webhook' })
  webhook(@Body() payload: PayOSWebhookDto) {
    return this.payments.handlePayOSWebhook(payload);
  }
}
