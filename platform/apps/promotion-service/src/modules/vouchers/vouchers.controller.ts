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
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { Request } from 'express';
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

@ApiTags('Vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchers: VouchersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({
    summary: 'Create a new voucher',
    description: 'Creates a new voucher. Requires PLATFORM_ADMIN role.',
  })
  @ApiResponse({ status: 201, description: 'Voucher created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid voucher data' })
  @ApiForbiddenResponse({ description: 'Requires PLATFORM_ADMIN role' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  create(@Body() dto: CreateVoucherDto) {
    return this.vouchers.create(dto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all vouchers',
    description: 'Returns a paginated list of vouchers.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of vouchers' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  findAll(@Query() query: VoucherQueryDto) {
    return this.vouchers.findAll(query);
  }

  @Get('available')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get available vouchers for user',
    description: 'Returns vouchers available for the current user based on cart context.',
  })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (from internal service or JWT)' })
  @ApiResponse({ status: 200, description: 'List of available vouchers' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async getAvailableVouchers(
    @Headers('x-user-id') userId: string,
  ) {
    // Use header if available (internal service call), otherwise extract from request
    const effectiveUserId = userId || this.extractUserIdFromRequest(arguments[0]);
    const vouchers = await this.vouchers.getUserVouchers(effectiveUserId);
    return { data: vouchers };
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get voucher by ID',
    description: 'Returns voucher details by ID.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiResponse({ status: 200, description: 'Voucher details' })
  @ApiNotFoundResponse({ description: 'Voucher not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.vouchers.findOne(id);
  }

  @Get('code/:code')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get voucher by code',
    description: 'Returns voucher details by promo code.',
  })
  @ApiParam({ name: 'code', description: 'Voucher code' })
  @ApiResponse({ status: 200, description: 'Voucher details' })
  @ApiNotFoundResponse({ description: 'Voucher not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  findByCode(@Param('code') code: string) {
    return this.vouchers.findByCode(code);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({
    summary: 'Update voucher',
    description: 'Updates voucher details. Requires PLATFORM_ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiResponse({ status: 200, description: 'Voucher updated successfully' })
  @ApiNotFoundResponse({ description: 'Voucher not found' })
  @ApiForbiddenResponse({ description: 'Requires PLATFORM_ADMIN role' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVoucherDto,
  ) {
    return this.vouchers.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({
    summary: 'Delete voucher',
    description: 'Deletes a voucher. Requires PLATFORM_ADMIN role.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiResponse({ status: 200, description: 'Voucher deleted successfully' })
  @ApiNotFoundResponse({ description: 'Voucher not found' })
  @ApiForbiddenResponse({ description: 'Requires PLATFORM_ADMIN role' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.vouchers.delete(id);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Validate voucher for checkout',
    description: 'Validates a voucher against cart/order items and calculates discount amount. Used during checkout.',
  })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (from internal service or JWT)' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  @ApiBadRequestResponse({ description: 'Invalid voucher code or conditions not met' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  validate(
    @Headers('x-user-id') userIdHeader: string,
    @Body() dto: ValidateVoucherDto,
  ) {
    // Use header if available (internal service call)
    const userId = userIdHeader || 'anonymous';
    return this.vouchers.validate(userId, dto);
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Apply/consume voucher',
    description: 'Consumes voucher usage after successful order. Called by commerce-service.',
  })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Voucher applied successfully' })
  @ApiBadRequestResponse({ description: 'Failed to apply voucher' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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

  private extractUserIdFromRequest(request: any): string {
    // Try to extract from JWT in Authorization header
    // This is a fallback for when x-user-id is not provided
    return request?.user?.sub || request?.user?.id || 'anonymous';
  }
}
