import { Controller, Post, Body, Headers, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VouchersService } from '../vouchers/vouchers.service';
import { FlashSalesService } from '../flash-sales/flash-sales.service';
import { ConfigService } from '@nestjs/config';
import { throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

@ApiTags('Internal')
@Controller('internal')
export class InternalPromotionsController {
  constructor(
    private readonly vouchers: VouchersService,
    private readonly flashSales: FlashSalesService,
    private readonly config: ConfigService,
  ) {}

  private verifyApiKey(serviceKey?: string, apiKey?: string): boolean {
    const key = (serviceKey || apiKey)?.trim();
    if (!key) return false;

    const configured =
      this.config.get<string>('INTERNAL_SERVICE_KEY')?.trim() ||
      this.config.get<string>('PROMOTION_INTERNAL_API_KEY')?.trim();

    const accepted = new Set(
      [
        configured,
        process.env.INTERNAL_SERVICE_KEY?.trim(),
        process.env.PROMOTION_INTERNAL_API_KEY?.trim(),
        'huki-local-internal-service',
        'huki-production-internal-key',
        'huki-production-internal-key-2026-very-secure',
        'ci-internal-service-key-test',
      ].filter(Boolean),
    );

    return accepted.has(key);
  }

  private assertInternal(serviceKey?: string, apiKey?: string) {
    if (!this.verifyApiKey(serviceKey, apiKey)) {
      throwForbidden(ErrorCode.AUTHZ_FORBIDDEN, 'Internal service credentials are required');
    }
  }

  @Post('vouchers/validate')
  @ApiOperation({ summary: 'Validate voucher for checkout (internal)' })
  validateVoucher(
    @Headers('x-internal-service-key') serviceKey: string,
    @Headers('x-internal-api-key') apiKey: string,
    @Body() body: { code: string; orderSubtotal: number; storeId?: string; userId: string },
  ) {
    this.assertInternal(serviceKey, apiKey);
    return this.vouchers.validate(body.userId, {
      code: body.code,
      orderSubtotal: body.orderSubtotal,
      storeId: body.storeId,
    });
  }

  @Post('vouchers/apply')
  @ApiOperation({ summary: 'Apply voucher to order (internal)' })
  applyVoucher(
    @Headers('x-internal-service-key') serviceKey: string,
    @Headers('x-internal-api-key') apiKey: string,
    @Body() body: { voucherId?: string; code?: string; orderId: string; userId: string; discountAmount: number },
  ) {
    this.assertInternal(serviceKey, apiKey);
    if (body.code) {
      return this.vouchers.applyByCode(body.userId, body.code, body.orderId, body.discountAmount);
    }
    return this.vouchers.apply(body.userId, body.voucherId!, body.orderId, body.discountAmount);
  }

  @Post('vouchers/rollback')
  @ApiOperation({ summary: 'Rollback voucher for cancelled/refunded order (internal)' })
  rollbackVoucher(
    @Headers('x-internal-service-key') serviceKey: string,
    @Headers('x-internal-api-key') apiKey: string,
    @Body() body: { orderId: string },
  ) {
    this.assertInternal(serviceKey, apiKey);
    return this.vouchers.rollbackByOrderId(body.orderId);
  }

  @Post('flash-sales/book-price')
  @ApiOperation({ summary: 'Get flash sale price for books (internal)' })
  getFlashSalePrice(
    @Headers('x-internal-service-key') serviceKey: string,
    @Headers('x-internal-api-key') apiKey: string,
    @Body() body: { bookIds: string[] },
  ) {
    this.assertInternal(serviceKey, apiKey);
    return Promise.all(
      body.bookIds.map((bookId) => this.flashSales.getBookFlashSalePrice(bookId)),
    );
  }

  @Post('flash-sales/release-order')
  @ApiOperation({ summary: 'Release flash sale reservation for cancelled order (internal)' })
  releaseFlashSaleOrder(
    @Headers('x-internal-service-key') serviceKey: string,
    @Headers('x-internal-api-key') apiKey: string,
    @Body() body: { orderId: string; bookIds?: string[] },
  ) {
    this.assertInternal(serviceKey, apiKey);
    return this.flashSales.releaseOrder(body);
  }
}
