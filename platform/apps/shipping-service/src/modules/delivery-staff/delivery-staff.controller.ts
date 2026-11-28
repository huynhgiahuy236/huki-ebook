import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { StaffStatus } from '../../../prisma/generated/client';
import {
  AuthenticatedGuard,
  PlatformAdminGuard,
  ShippingRequest,
} from '../../common/shipping-auth.guard';
import { throwForbidden, ErrorCode } from '@huki/shared/errors';
import { DeliveryStaffService } from './delivery-staff.service';
import {
  AssignDeliveryStaffDto,
  CreateDeliveryStaffDto,
  UpdateDeliveryStaffDto,
} from './dto/delivery-staff.dto';

@ApiTags('Delivery staff')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthenticatedGuard)
@Controller('delivery-staff')
export class DeliveryStaffController {
  constructor(private readonly staff: DeliveryStaffService) {}

  @Post()
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Create delivery staff (platform admin)' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Delivery staff created' })
  @ApiStandardErrors(400, 401, 403, 409)
  create(@Body() dto: CreateDeliveryStaffDto) {
    return this.staff.create(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current delivery staff profile' })
  @ApiSuccessResponse(undefined, { description: 'Current delivery staff profile' })
  @ApiStandardErrors(401)
  getMe(@Req() req: ShippingRequest) {
    return this.staff.getOrCreateStaffProfile(req.user!);
  }

  @Patch('me/status')
  @ApiOperation({ summary: 'Update current delivery staff duty status' })
  @ApiBody({ schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: Object.values(StaffStatus) } } } })
  @ApiSuccessResponse(undefined, { description: 'Status updated' })
  @ApiStandardErrors(400, 401)
  updateMyStatus(
    @Req() req: ShippingRequest,
    @Body('status', new ParseEnumPipe(StaffStatus)) status: StaffStatus,
  ) {
    return this.staff.updateStatusByUserId(req.user!.sub, status);
  }

  @Get()
  @ApiOperation({ summary: 'List delivery staff' })
  @ApiQuery({ name: 'status', required: false, enum: StaffStatus })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Delivery staff list' })
  @ApiStandardErrors(401)
  list(
    @Req() req: ShippingRequest,
    @Query('status', new ParseEnumPipe(StaffStatus, { optional: true }))
    status?: StaffStatus,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      return this.staff.listForStaff(req.user!.sub);
    }
    return this.staff.list(status);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update delivery staff' })
  @ApiParam({ name: 'id', description: 'Delivery staff UUID' })
  @ApiSuccessResponse(undefined, { description: 'Delivery staff updated' })
  @ApiStandardErrors(400, 401, 403, 404)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryStaffDto,
    @Req() req: ShippingRequest,
  ) {
    if (req.user?.role !== 'PLATFORM_ADMIN') {
      const staff = await this.staff.findByUserId(req.user!.sub);
      if (!staff || staff.id !== id) {
        throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT, 'Platform administrator role required');
      }
    }
    return this.staff.update(id, dto);
  }
}

@ApiTags('Shipment assignment')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthenticatedGuard, PlatformAdminGuard)
@Controller('shipments')
export class ShipmentAssignmentController {
  constructor(private readonly staff: DeliveryStaffService) {}

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign delivery staff to a shipment (platform admin)' })
  @ApiParam({ name: 'id', description: 'Shipment UUID' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Delivery staff assigned' })
  @ApiStandardErrors(400, 401, 403, 404)
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDeliveryStaffDto,
  ) {
    return this.staff.assign(id, dto);
  }
}
