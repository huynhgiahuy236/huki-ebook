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
} from '../../common/shipping-auth.guard';
import { DeliveryStaffService } from './delivery-staff.service';
import {
  AssignDeliveryStaffDto,
  CreateDeliveryStaffDto,
  UpdateDeliveryStaffDto,
} from './dto/delivery-staff.dto';
@ApiTags('Delivery staff')
@ApiBearerAuth()
@UseGuards(AuthenticatedGuard, PlatformAdminGuard)
@Controller('delivery-staff')
export class DeliveryStaffController {
  constructor(private readonly staff: DeliveryStaffService) {}
  @Post()
  @ApiOperation({ summary: 'Create delivery staff (platform admin)' })
  @ApiResponse({ status: 201, description: 'Delivery staff created' })
  @ApiBadRequestResponse({ description: 'Invalid or duplicate staff data' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Platform administrator role required' })
  create(@Body() dto: CreateDeliveryStaffDto) {
    return this.staff.create(dto);
  }
  @Get()
  @ApiOperation({ summary: 'List delivery staff (platform admin)' })
  @ApiResponse({ status: 200, description: 'Delivery staff list' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Platform administrator role required' })
  list(
    @Query('status', new ParseEnumPipe(StaffStatus, { optional: true }))
    status?: StaffStatus,
  ) {
    return this.staff.list(status);
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Update delivery staff (platform admin)' })
  @ApiParam({ name: 'id', description: 'Delivery staff UUID' })
  @ApiResponse({ status: 200, description: 'Delivery staff updated' })
  @ApiNotFoundResponse({ description: 'Delivery staff not found' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  @ApiForbiddenResponse({ description: 'Platform administrator role required' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryStaffDto,
  ) {
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
