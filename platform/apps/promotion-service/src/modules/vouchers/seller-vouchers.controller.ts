/**
 * HUKI EBOOK - Seller Vouchers Controller
 *
 * Handles Shop Voucher management for Sellers
 * Sellers can only manage vouchers belonging to their own store
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
} from '@nestjs/swagger';
import { VouchersService } from './vouchers.service';
import {
  CreateVoucherDto,
  UpdateVoucherDto,
  VoucherQueryDto,
} from './dto/voucher.dto';
import { BusinessRolesGuard, BusinessRoles } from '../../common/business-roles.guard';
import { CurrentBusiness } from '../../common/current-business.decorator';
import { throwBadRequest, throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

@ApiTags('Seller - Vouchers')
@ApiBearerAuth()
@UseGuards(BusinessRolesGuard)
@Controller('seller/vouchers')
export class SellerVouchersController {
  constructor(private readonly vouchers: VouchersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List shop vouchers',
    description: 'Returns all vouchers belonging to the seller\'s store. Filters by storeId.',
  })
  @ApiResponse({ status: 200, description: 'List of shop vouchers' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  @ApiForbiddenResponse({ description: 'Not a business owner' })
  async findAll(
    @CurrentBusiness() business: any,
    @Query() query: VoucherQueryDto,
  ) {
    // Filter by storeId if provided, otherwise by any store owned by business
    const storeId = query.storeId;

    // Get vouchers for this seller's stores
    const result = await this.vouchers.findAllForSeller(business.id, storeId);
    return result;
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get shop voucher by ID',
    description: 'Returns voucher details by ID. Validates ownership.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiResponse({ status: 200, description: 'Voucher details' })
  @ApiNotFoundResponse({ description: 'Voucher not found' })
  @ApiForbiddenResponse({ description: 'Voucher does not belong to seller' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async findOne(
    @CurrentBusiness() business: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const voucher = await this.vouchers.findOne(id);

    // Validate ownership
    await this.vouchers.validateSellerOwnership(business.id, id);

    return voucher;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create shop voucher',
    description: 'Creates a new shop voucher. StoreId is required for scope=STORE.',
  })
  @ApiResponse({ status: 201, description: 'Voucher created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid voucher data or storeId required' })
  @ApiForbiddenResponse({ description: 'Not a business owner' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async create(
    @CurrentBusiness() business: any,
    @Body() dto: CreateVoucherDto,
  ) {
    // Shop vouchers MUST have storeId
    if (dto.scope === 'STORE' && !dto.storeId) {
      throwBadRequest(ErrorCode.VALIDATION_REQUIRED, 'storeId is required for shop vouchers');
    }

    // Validate store ownership if storeId is provided
    if (dto.storeId) {
      await this.vouchers.validateStoreOwnership(business.id, dto.storeId);
    }

    return this.vouchers.createForSeller(business.id, dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update shop voucher',
    description: 'Updates voucher details. Validates ownership.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiResponse({ status: 200, description: 'Voucher updated successfully' })
  @ApiNotFoundResponse({ description: 'Voucher not found' })
  @ApiForbiddenResponse({ description: 'Voucher does not belong to seller' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async update(
    @CurrentBusiness() business: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVoucherDto,
  ) {
    // Validate ownership
    await this.vouchers.validateSellerOwnership(business.id, id);

    return this.vouchers.updateForSeller(id, dto);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate shop voucher',
    description: 'Activates a voucher. Validates ownership.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiResponse({ status: 200, description: 'Voucher activated' })
  @ApiForbiddenResponse({ description: 'Voucher does not belong to seller' })
  async activate(
    @CurrentBusiness() business: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.vouchers.validateSellerOwnership(business.id, id);
    return this.vouchers.updateStatus(id, 'ACTIVE');
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate shop voucher',
    description: 'Deactivates a voucher. Validates ownership.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiResponse({ status: 200, description: 'Voucher deactivated' })
  @ApiForbiddenResponse({ description: 'Voucher does not belong to seller' })
  async deactivate(
    @CurrentBusiness() business: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.vouchers.validateSellerOwnership(business.id, id);
    return this.vouchers.updateStatus(id, 'INACTIVE');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete shop voucher',
    description: 'Deletes a voucher. Only allowed if currentUsage is 0. Validates ownership.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiResponse({ status: 200, description: 'Voucher deleted' })
  @ApiNotFoundResponse({ description: 'Voucher not found' })
  @ApiForbiddenResponse({ description: 'Voucher does not belong to seller or has been used' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  async delete(
    @CurrentBusiness() business: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.vouchers.validateSellerOwnership(business.id, id);
    return this.vouchers.deleteForSeller(id);
  }

  @Get(':id/usage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get voucher usage statistics',
    description: 'Returns usage statistics for a voucher.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiResponse({ status: 200, description: 'Usage statistics' })
  @ApiForbiddenResponse({ description: 'Voucher does not belong to seller' })
  async getUsage(
    @CurrentBusiness() business: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.vouchers.validateSellerOwnership(business.id, id);
    return this.vouchers.getUsageStats(id);
  }
}
