/**
 * HUKI EBOOK - Vouchers Controller
 *
 * Handles voucher management and validation
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { Request } from 'express';
import { getJwtSecret } from '@huki/shared';
import { VouchersService } from './vouchers.service';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  VoucherQueryDto,
  ValidateVoucherDto,
} from './dto/voucher.dto';
import { RolesGuard, Roles } from '../../common/roles.guard';
import { throwBadRequest } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';
import * as jwt from 'jsonwebtoken';

@ApiTags('Vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchers: VouchersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({
    summary: 'Create a new voucher',
    description: 'Creates a new voucher. Requires PLATFORM_ADMIN role.',
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Voucher created successfully' })
  @ApiStandardErrors(400, 401, 403, 409)
  create(@Body() dto: CreateVoucherDto) {
    return this.vouchers.create(dto);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List all vouchers',
    description: 'Returns a paginated list of vouchers.',
  })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Paginated list of vouchers' })
  @ApiStandardErrors(401)
  findAll(@Query() query: VoucherQueryDto) {
    return this.vouchers.findAll(query);
  }

  @Get('eligible-feed')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get eligible vouchers feed for user',
    description: 'Returns vouchers filtered by user eligibility (platform + shop vouchers grouped by store).',
  })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID' })
  @ApiSuccessResponse(undefined, { description: 'Eligible vouchers feed' })
  @ApiStandardErrors(401)
  async getEligibleFeed(
    @Headers('x-user-id') userId: string,
    @Req() req: Request,
  ) {
    const effectiveUserId = userId || this.extractUserIdFromRequest(req);
    return this.vouchers.getEligibleFeed(effectiveUserId);
  }

  @Get('homepage-feed')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get homepage vouchers feed for user',
    description: 'Returns platform vouchers and followed store vouchers that user is eligible for.',
  })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID' })
  @ApiSuccessResponse(undefined, { description: 'Homepage vouchers feed' })
  async getHomepageFeed(
    @Headers('x-user-id') userId: string,
    @Req() req: Request,
  ) {
    const effectiveUserId = userId || this.extractUserIdFromRequest(req);
    return this.vouchers.getHomepageFeed(effectiveUserId);
  }

  @Get('wallet')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user voucher wallet',
    description: 'Returns all valid saved vouchers in user wallet (split into platform freeship, discount, and shop vouchers).',
  })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID' })
  @ApiSuccessResponse(undefined, { description: 'User voucher wallet' })
  @ApiStandardErrors(401)
  async getWallet(
    @Headers('x-user-id') userId: string,
    @Req() req: Request,
  ) {
    const effectiveUserId = userId || this.extractUserIdFromRequest(req);
    return this.vouchers.getWalletVouchers(effectiveUserId);
  }

  @Post(':id/save')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Save voucher to wallet',
    description: 'Saves a voucher to the user wallet after checking eligibility.',
  })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID' })
  @ApiSuccessResponse(undefined, { description: 'Voucher saved to wallet' })
  @ApiStandardErrors(400, 401, 404, 409)
  async saveToWallet(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Req() req: Request,
  ) {
    const effectiveUserId = userId || this.extractUserIdFromRequest(req);
    return this.vouchers.saveToWallet(effectiveUserId, id);
  }

  @Delete(':id/save')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Unsave voucher from wallet',
    description: 'Removes a voucher from the user wallet.',
  })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID' })
  @ApiSuccessResponse(undefined, { description: 'Voucher removed from wallet' })
  @ApiStandardErrors(401, 404)
  async unsaveFromWallet(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Req() req: Request,
  ) {
    const effectiveUserId = userId || this.extractUserIdFromRequest(req);
    return this.vouchers.unsaveFromWallet(effectiveUserId, id);
  }

  @Get('available')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get available vouchers for user',
    description: 'Returns vouchers available for the current user based on cart context.',
  })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (from internal service or JWT)' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'List of available vouchers' })
  @ApiStandardErrors(401)
  async getAvailableVouchers(
    @Headers('x-user-id') userId: string,
    @Req() req: Request,
  ) {
    const effectiveUserId = userId || this.extractUserIdFromRequest(req);
    const vouchers = await this.vouchers.getUserVouchers(effectiveUserId);
    return { data: vouchers, success: true };
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get voucher by ID',
    description: 'Returns voucher details by ID.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiSuccessResponse(undefined, { description: 'Voucher details' })
  @ApiStandardErrors(401, 404)
  findOne(@Param('id') id: string) {
    return this.vouchers.findOne(id);
  }

  @Get('code/:code')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get voucher by code',
    description: 'Returns voucher details by promo code.',
  })
  @ApiParam({ name: 'code', description: 'Voucher code' })
  @ApiSuccessResponse(undefined, { description: 'Voucher details' })
  @ApiStandardErrors(401, 404)
  findByCode(@Param('code') code: string) {
    return this.vouchers.findByCode(code);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({
    summary: 'Update voucher',
    description: 'Updates voucher details. Requires PLATFORM_ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiSuccessResponse(undefined, { description: 'Voucher updated successfully' })
  @ApiStandardErrors(400, 401, 403, 404)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVoucherDto,
  ) {
    return this.vouchers.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({
    summary: 'Delete voucher',
    description: 'Deletes a voucher. Requires PLATFORM_ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiSuccessResponse(undefined, { description: 'Voucher deleted successfully' })
  @ApiStandardErrors(401, 403, 404)
  delete(@Param('id') id: string) {
    return this.vouchers.delete(id);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Validate voucher for checkout',
    description: 'Validates a voucher against cart/order items and calculates discount amount. Used during checkout.',
  })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (from internal service or JWT)' })
  @ApiSuccessResponse(undefined, { description: 'Validation result' })
  @ApiStandardErrors(400, 401, 404, 409)
  validate(
    @Req() req: Request,
    @Headers('x-user-id') userIdHeader: string,
    @Body() dto: ValidateVoucherDto,
  ) {
    // Use header if available (internal service call) or extract from JWT
    const userId = userIdHeader || this.extractUserIdFromRequest(req);
    return this.vouchers.validate(userId, dto);
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Apply/consume voucher',
    description: 'Consumes voucher usage after successful order. Called by commerce-service.',
  })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'User ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['code', 'orderId', 'discountAmount'],
      properties: {
        code: { type: 'string' },
        orderId: { type: 'string' },
        discountAmount: { type: 'number' },
      },
    },
  })
  @ApiSuccessResponse(undefined, { description: 'Voucher applied successfully' })
  @ApiStandardErrors(400, 401, 404, 409)
  async apply(
    @Headers('x-user-id') userId: string,
    @Body() body: { code: string; orderId: string; discountAmount: number },
  ) {
    if (!userId) {
      throwBadRequest(ErrorCode.VALIDATION_REQUIRED, 'x-user-id header is required');
    }
    if (!body.code || !body.orderId) {
      throwBadRequest(ErrorCode.VALIDATION_REQUIRED, 'code and orderId are required');
    }
    await this.vouchers.applyByCode(userId, body.code, body.orderId, body.discountAmount);
    return { success: true };
  }

  @Post('rollback')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Rollback voucher usage',
    description: 'Rolls back voucher usages for a cancelled or refunded order.',
  })
  @ApiBody({ schema: { type: 'object', required: ['orderId'], properties: { orderId: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { description: 'Voucher usage rolled back' })
  @ApiStandardErrors(400, 401)
  async rollback(@Body() body: { orderId: string }) {
    if (!body.orderId) {
      throwBadRequest(ErrorCode.VALIDATION_REQUIRED, 'orderId is required');
    }
    return this.vouchers.rollbackByOrderId(body.orderId);
  }

  @Post('usages-by-orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get voucher usages by order IDs',
    description: 'Returns voucher usages with voucher details for given order IDs.',
  })
  @ApiBody({ schema: { type: 'object', required: ['orderIds'], properties: { orderIds: { type: 'array', items: { type: 'string' } } } } })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Voucher usages list' })
  async getUsagesByOrders(@Body() body: { orderIds: string[] }) {
    const usages = await this.vouchers.getUsagesByOrderIds(body?.orderIds || []);
    return { data: usages };
  }

  private extractUserIdFromRequest(request: any): string {
    if (request?.user?.id || request?.user?.sub) return request.user.id || request.user.sub;
    if (request?.headers?.['x-user-id']) return request.headers['x-user-id'];
    const authHeader = request?.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = jwt.verify(token, getJwtSecret()) as any;
        return payload.sub || payload.id || payload.userId || 'anonymous';
      } catch {
        return 'anonymous';
      }
    }
    return 'anonymous';
  }
}
