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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  @Post() create(@Body() dto: CreateDeliveryStaffDto) {
    return this.staff.create(dto);
  }
  @Get() list(
    @Query('status', new ParseEnumPipe(StaffStatus, { optional: true }))
    status?: StaffStatus,
  ) {
    return this.staff.list(status);
  }
  @Patch(':id') update(
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
  @Post(':id/assign') assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDeliveryStaffDto,
  ) {
    return this.staff.assign(id, dto);
  }
}
