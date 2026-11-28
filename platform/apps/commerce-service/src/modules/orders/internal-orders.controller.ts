import {
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { PrismaService } from '../../prisma/prisma.service';

export interface CommercialObligationsResponse {
  hasActiveBuyerOrders: boolean;
  buyerOrders: Array<{ id: string; code: string; status: string }>;
  hasActiveSellerOrders: boolean;
  sellerOrderCount: number;
}

@ApiTags('Internal - Orders')
@ApiHeader({ name: 'x-internal-service-key', required: true, description: 'Internal service authentication key' })
@Controller('internal/orders')
export class InternalOrdersController {
  constructor(private readonly prisma: PrismaService) {}

  private verifyInternalKey(serviceKey?: string): void {
    const expected = process.env.INTERNAL_SERVICE_KEY;
    if (!expected || serviceKey !== expected) {
      throw new HttpException(
        'Unauthorized internal service',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Get('commercial-obligations/:userId')
  @ApiOperation({
    summary: 'Internal API: Check pending orders before user deletion',
  })
  @ApiSuccessResponse(undefined, { description: 'Commercial obligations status' })
  @ApiStandardErrors(401)
  async checkCommercialObligations(
    @Param('userId') userId: string,
    @Headers('x-internal-service-key') serviceKey: string,
  ): Promise<CommercialObligationsResponse> {
    this.verifyInternalKey(serviceKey);

    // 1. Kiểm tra đơn mua chưa hoàn tất
    const activeBuyerOrders = await this.prisma.order.findMany({
      where: {
        userId,
        status: {
          in: ['PENDING', 'PENDING_PAYMENT', 'PROCESSING', 'SHIPPING'],
        },
      },
      select: {
        id: true,
        code: true,
        status: true,
      },
      take: 5,
    });

    // 2. Kiểm tra đơn bán chưa hoàn tất (nếu tài khoản là chủ gian hàng)
    const activeSellerOrders = await this.prisma.sellerOrder.findMany({
      where: {
        ownerUserId: userId,
        status: {
          in: [
            'PENDING_PAYMENT',
            'PENDING_CONFIRMATION',
            'CONFIRMED',
            'PREPARING',
            'SHIPPED',
          ],
        },
      },
      select: {
        id: true,
        status: true,
      },
      take: 5,
    });

    return {
      hasActiveBuyerOrders: activeBuyerOrders.length > 0,
      buyerOrders: activeBuyerOrders,
      hasActiveSellerOrders: activeSellerOrders.length > 0,
      sellerOrderCount: activeSellerOrders.length,
    };
  }
}
