import { Controller, Post, Body, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VouchersService } from '../vouchers/vouchers.service';
import { FlashSalesService } from '../flash-sales/flash-sales.service';
import { ConfigService } from '@nestjs/config';
import { throwUnauthorized } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

@ApiTags('Internal')
@Controller('internal')
export class InternalPromotionsController {
  constructor(
    private readonly vouchers: VouchersService,
    private readonly flashSales: FlashSalesService,
    private readonly config: ConfigService,
  ) {}

  private verifyApiKey(apiKey: string): boolean {
    const validKey = this.config.get('PROMOTION_INTERNAL_API_KEY')
      || process.env.PROMOTION_INTERNAL_API_KEY;
    return validKey && apiKey === validKey;
  }

  @Post('vouchers/validate')
  @ApiOperation({ summary: 'Validate voucher for checkout (internal)' })
  validateVoucher(
    @Headers('x-internal-api-key') apiKey: string,
    @Body() body: { code: string; orderSubtotal: number; storeId?: string; userId: string },
  ) {
    if (!this.verifyApiKey(apiKey)) {
      throwUnauthorized(ErrorCode.SYSTEM_INTERNAL_ERROR);
    }
    return this.vouchers.validate(body.userId, {
      code: body.code,
      orderSubtotal: body.orderSubtotal,
      storeId: body.storeId,
    });
  }

  @Post('vouchers/apply')
  @ApiOperation({ summary: 'Apply voucher to order (internal)' })
  applyVoucher(
    @Headers('x-internal-api-key') apiKey: string,
    @Body() body: { voucherId: string; orderId: string; userId: string; discountAmount: number },
  ) {
    if (!this.verifyApiKey(apiKey)) {
      throwUnauthorized(ErrorCode.SYSTEM_INTERNAL_ERROR);
    }
    return this.vouchers.apply(body.userId, body.voucherId, body.orderId, body.discountAmount);
  }

  @Post('flash-sales/book-price')
  @ApiOperation({ summary: 'Get flash sale price for books (internal)' })
  getFlashSalePrice(
    @Headers('x-internal-api-key') apiKey: string,
    @Body() body: { bookIds: string[] },
  ) {
    if (!this.verifyApiKey(apiKey)) {
      throwUnauthorized(ErrorCode.SYSTEM_INTERNAL_ERROR);
    }
    return Promise.all(
      body.bookIds.map((bookId) => this.flashSales.getBookFlashSalePrice(bookId))
    );
  }
}
