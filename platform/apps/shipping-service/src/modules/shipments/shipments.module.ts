import { Module } from '@nestjs/common';
import { ShippingModule } from '../shipping/shipping.module';
import {
  GhtkCallbackController,
  InternalShipmentsController,
  ShipmentsController,
} from './shipments.controller';
import { ShipmentsService } from './shipments.service';
@Module({
  imports: [ShippingModule],
  controllers: [
    ShipmentsController,
    InternalShipmentsController,
    GhtkCallbackController,
  ],
  providers: [ShipmentsService],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}
