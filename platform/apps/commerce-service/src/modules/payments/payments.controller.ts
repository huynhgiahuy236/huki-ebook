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
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { AuthenticatedGuard, BookActor } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { CreateRefundDto, InitiatePaymentDto, PayOSWebhookDto, SettleRefundDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';
import { throwForbidden, ErrorCode } from '@huki/shared/errors';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('orders/:orderId/initiate')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Create or reuse a PayOS payment link for an online order' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Payment link created or reused' })
  @ApiStandardErrors(400, 401, 404, 409)
  initiate(
    @CurrentBookActor() actor: BookActor,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.payments.initiate(actor.sub, orderId, dto);
  }

  @Post('orders/:orderId/simulate-success')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Simulate PayOS payment success for fast testing and money flow' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Payment simulated as paid' })
  @ApiStandardErrors(401, 403, 404, 409)
  simulateSuccess(
    @CurrentBookActor() actor: BookActor,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throwForbidden(
        ErrorCode.AUTHZ_FORBIDDEN,
        'Endpoint mô phỏng thanh toán bị vô hiệu hóa hoàn toàn trên môi trường Production',
      );
    }
    const isPlatformAdmin = actor.role === 'PLATFORM_ADMIN' || actor.role === 'ADMIN';
    return this.payments.simulateSuccess(actor.sub, orderId, isPlatformAdmin);
  }

  @Get('orders/:orderId')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Get payment and refund status for an order' })
  @ApiSuccessResponse(undefined, { description: 'Order payment and refund status' })
  @ApiStandardErrors(401, 404)
  status(
    @CurrentBookActor() actor: BookActor,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.payments.getOrderPayment(actor.sub, orderId);
  }

  @Post('orders/:orderId/refunds')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Request a full or partial PayOS refund' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Refund requested' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  refund(
    @CurrentBookActor() actor: BookActor,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CreateRefundDto,
  ) {
    return this.payments.requestRefund(actor, orderId, dto);
  }

  @Post('refunds/:refundId/settle')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Reconcile a PayOS refund (platform admin only)' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Refund settled' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  settleRefund(
    @CurrentBookActor() actor: BookActor,
    @Param('refundId', ParseUUIDPipe) refundId: string,
    @Body() dto: SettleRefundDto,
  ) {
    return this.payments.settleRefund(actor, refundId, dto);
  }

  @Get('refunds')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'List refund requests with role filtering (Task 60)' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Refund requests list' })
  @ApiStandardErrors(401)
  listRefunds(
    @CurrentBookActor() actor: BookActor,
  ) {
    return this.payments.listRefunds(actor);
  }

  @Get('refunds/:refundId')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Get details of a specific refund (Task 60)' })
  @ApiSuccessResponse(undefined, { description: 'Refund detail' })
  @ApiStandardErrors(401, 403, 404)
  getRefund(
    @CurrentBookActor() actor: BookActor,
    @Param('refundId', ParseUUIDPipe) refundId: string,
  ) {
    return this.payments.getRefund(actor, refundId);
  }

  @Post('refunds/:refundId/retry')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({ summary: 'Admin retry for failed refund (Task 60)' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Refund retry triggered' })
  @ApiStandardErrors(401, 403, 404, 409)
  retryRefund(
    @CurrentBookActor() actor: BookActor,
    @Param('refundId', ParseUUIDPipe) refundId: string,
  ) {
    return this.payments.retryRefund(actor, refundId);
  }

  @Post('webhooks/payos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive a signed PayOS webhook' })
  @ApiSuccessResponse(undefined, { description: 'PayOS webhook processed' })
  @ApiStandardErrors(400, 401)
  webhook(
    @Body(new ValidationPipe({ transform: false, whitelist: false, forbidNonWhitelisted: false }))
    payload: PayOSWebhookDto,
  ) {
    return this.payments.handlePayOSWebhook(payload);
  }
}
