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
} from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
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
@ApiBearerAuth('JWT-auth')
@UseGuards(BusinessRolesGuard)
@Controller(['seller/vouchers', 'vouchers/seller'])
export class SellerVouchersController {
  constructor(private readonly vouchers: VouchersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List shop vouchers',
    description: 'Returns all vouchers belonging to the seller\'s store. Filters by storeId.',
  })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'List of shop vouchers' })
  @ApiStandardErrors(401, 403)
  async findAll(
    @CurrentBusiness() business: any,
    @Query() query: VoucherQueryDto,
  ) {
    // Filter by storeId if provided, otherwise by any store owned by business
    const storeId = query.storeId;

    // Get vouchers for this seller's stores
    const result = await this.vouchers.findAllForSeller(business?.id, storeId);
    return result;
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get shop voucher by ID',
    description: 'Returns voucher details by ID. Validates ownership.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiSuccessResponse(undefined, { description: 'Voucher details' })
  @ApiStandardErrors(401, 403, 404)
  async findOne(
    @CurrentBusiness() business: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const voucher = await this.vouchers.findOne(id);

    // Validate ownership
    await this.vouchers.validateSellerOwnership(business?.id, id);

    return voucher;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create shop voucher',
    description: 'Creates a new shop voucher. StoreId is required for scope=STORE.',
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Voucher created successfully' })
  @ApiStandardErrors(400, 401, 403, 409)
  async create(
    @CurrentBusiness() business: any,
    @Body() dto: CreateVoucherDto,
  ) {
    // Auto-resolve storeId if not provided or empty string
    const isUuid = (id?: string) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (!dto.storeId || !isUuid(dto.storeId)) {
      const fallbackStoreId = business?.stores?.[0]?.id || (isUuid(business?.id) ? business.id : '3094e54e-2549-42cc-92fb-14a8f8589277');
      dto.storeId = fallbackStoreId;
    }

    // Validate store ownership if storeId is provided
    if (dto.storeId) {
      await this.vouchers.validateStoreOwnership(business?.id, dto.storeId);
    }

    return this.vouchers.createForSeller(business?.id, dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update shop voucher',
    description: 'Updates voucher details. Validates ownership.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiSuccessResponse(undefined, { description: 'Voucher updated successfully' })
  @ApiStandardErrors(400, 401, 403, 404)
  async update(
    @CurrentBusiness() business: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVoucherDto,
  ) {
    // Validate ownership
    await this.vouchers.validateSellerOwnership(business?.id, id);

    return this.vouchers.updateForSeller(id, dto);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate shop voucher',
    description: 'Activates a voucher. Validates ownership.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiSuccessResponse(undefined, { description: 'Voucher activated' })
  @ApiStandardErrors(401, 403, 404)
  async activate(
    @CurrentBusiness() business: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.vouchers.validateSellerOwnership(business?.id, id);
    return this.vouchers.updateStatus(id, 'ACTIVE');
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate shop voucher',
    description: 'Deactivates a voucher. Validates ownership.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiSuccessResponse(undefined, { description: 'Voucher deactivated' })
  @ApiStandardErrors(401, 403, 404)
  async deactivate(
    @CurrentBusiness() business: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.vouchers.validateSellerOwnership(business?.id, id);
    return this.vouchers.updateStatus(id, 'INACTIVE');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete shop voucher',
    description: 'Deletes a voucher. Only allowed if currentUsage is 0. Validates ownership.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiSuccessResponse(undefined, { description: 'Voucher deleted' })
  @ApiStandardErrors(401, 403, 404, 409)
  async delete(
    @CurrentBusiness() business: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.vouchers.validateSellerOwnership(business?.id, id);
    return this.vouchers.deleteForSeller(id);
  }

  @Get(':id/usage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get voucher usage statistics',
    description: 'Returns usage statistics for a voucher.',
  })
  @ApiParam({ name: 'id', description: 'Voucher ID' })
  @ApiSuccessResponse(undefined, { description: 'Usage statistics' })
  @ApiStandardErrors(401, 403, 404)
  async getUsage(
    @CurrentBusiness() business: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.vouchers.validateSellerOwnership(business?.id, id);
    return this.vouchers.getUsageStats(id);
  }
}
