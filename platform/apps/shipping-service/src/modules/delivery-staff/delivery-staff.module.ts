import { Module } from '@nestjs/common';
import {
  DeliveryStaffController,
  ShipmentAssignmentController,
} from './delivery-staff.controller';
import { DeliveryStaffService } from './delivery-staff.service';
@Module({
  controllers: [DeliveryStaffController, ShipmentAssignmentController],
  providers: [DeliveryStaffService],
})
export class DeliveryStaffModule {}
