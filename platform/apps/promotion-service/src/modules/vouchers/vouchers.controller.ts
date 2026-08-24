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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
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
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create a new voucher' })
  create(@Body() dto: CreateVoucherDto) {
    return this.vouchers.create(dto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all vouchers' })
  findAll(@Query() query: VoucherQueryDto) {
    return this.vouchers.findAll(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get voucher by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.vouchers.findOne(id);
  }

  @Get('code/:code')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get voucher by code' })
  findByCode(@Param('code') code: string) {
    return this.vouchers.findByCode(code);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Update voucher' })
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
  @ApiOperation({ summary: 'Delete voucher' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.vouchers.delete(id);
  }

  @Post('validate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate voucher for an order' })
  validate(
    @Body() dto: ValidateVoucherDto,
  ) {
    return this.vouchers.validate('current-user-id', dto); // userId from JWT
  }
}
