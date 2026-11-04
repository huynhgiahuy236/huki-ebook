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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
@ApiBearerAuth()
@UseGuards(AuthenticatedGuard)
@Controller('delivery-staff')
export class DeliveryStaffController {
  constructor(private readonly staff: DeliveryStaffService) {}

  @Post()
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Create delivery staff (platform admin)' })
  @ApiResponse({ status: 201, description: 'Delivery staff created' })
  @ApiBadRequestResponse({ description: 'Invalid or duplicate staff data' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Platform administrator role required' })
  create(@Body() dto: CreateDeliveryStaffDto) {
    return this.staff.create(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current delivery staff profile' })
  @ApiResponse({ status: 200, description: 'Current delivery staff profile' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  getMe(@Req() req: ShippingRequest) {
    return this.staff.getOrCreateStaffProfile(req.user!);
  }

  @Patch('me/status')
  @ApiOperation({ summary: 'Update current delivery staff duty status' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  updateMyStatus(
    @Req() req: ShippingRequest,
    @Body('status', new ParseEnumPipe(StaffStatus)) status: StaffStatus,
  ) {
    return this.staff.updateStatusByUserId(req.user!.sub, status);
  }

  @Get()
  @ApiOperation({ summary: 'List delivery staff' })
  @ApiResponse({ status: 200, description: 'Delivery staff list' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
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
  @ApiResponse({ status: 200, description: 'Delivery staff updated' })
  @ApiNotFoundResponse({ description: 'Delivery staff not found' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
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
@ApiBearerAuth()
@UseGuards(AuthenticatedGuard, PlatformAdminGuard)
@Controller('shipments')
export class ShipmentAssignmentController {
  constructor(private readonly staff: DeliveryStaffService) {}

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign delivery staff to a shipment (platform admin)' })
  @ApiParam({ name: 'id', description: 'Shipment UUID' })
  @ApiResponse({ status: 201, description: 'Delivery staff assigned' })
  @ApiNotFoundResponse({ description: 'Shipment or delivery staff not found' })
  @ApiBadRequestResponse({ description: 'Shipment cannot be assigned' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Platform administrator role required' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDeliveryStaffDto,
  ) {
    return this.staff.assign(id, dto);
  }
}
