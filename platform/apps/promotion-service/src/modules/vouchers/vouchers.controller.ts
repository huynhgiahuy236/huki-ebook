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
  ValidateVoucherDto,
} from './dto/voucher.dto';
import { RolesGuard, Roles } from '../../common/roles.guard';

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
    summary: 'Validate voucher',
    description: 'Validates a voucher code for use with an order.',
  })
  @ApiResponse({ status: 200, description: 'Validation result' })
  @ApiBadRequestResponse({ description: 'Invalid voucher code or conditions not met' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  validate(@Body() dto: ValidateVoucherDto) {
    return this.vouchers.validate('current-user-id', dto); // userId from JWT
  }
}
