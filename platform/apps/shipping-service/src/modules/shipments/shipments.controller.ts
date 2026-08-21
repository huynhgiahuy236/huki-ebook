import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentActor } from '../../common/current-actor.decorator';
import {
  AuthenticatedGuard,
  InternalApiGuard,
  ShippingActor,
} from '../../common/shipping-auth.guard';
import { CreateShipmentsFromOrderDto } from './dto/create-shipments.dto';
import { ShipmentQueryDto } from './dto/shipment-query.dto';
import {
  CancelShipmentDto,
  GhtkCallbackDto,
  UpdateShipmentStatusDto,
} from './dto/shipment-status.dto';
import { ShipmentsService } from './shipments.service';

@ApiTags('Internal shipping')
@Controller('internal/shipments')
export class InternalShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}
  @Post('from-order')
  @UseGuards(InternalApiGuard)
  @ApiOperation({
    summary: 'Idempotently create shipments from an order event payload',
  })
  create(@Body() dto: CreateShipmentsFromOrderDto) {
    return this.shipments.createFromOrder(dto);
  }
  @Post(':sellerOrderId/cancel')
  @UseGuards(InternalApiGuard)
  cancel(
    @Param('sellerOrderId', ParseUUIDPipe) id: string,
    @Body() dto: CancelShipmentDto,
  ) {
    return this.shipments.cancelBySellerOrder(id, dto);
  }
}

@ApiTags('Shipments')
@ApiBearerAuth()
@UseGuards(AuthenticatedGuard)
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}
  @Get() list(
    @CurrentActor() actor: ShippingActor,
    @Query() query: ShipmentQueryDto,
  ) {
    return this.shipments.list(actor, query);
  }
  @Get('tracking/:trackingNumber') tracking(
    @CurrentActor() actor: ShippingActor,
    @Param('trackingNumber') code: string,
  ) {
    return this.shipments.tracking(actor, code);
  }
  @Patch(':id/status') updateStatus(
    @CurrentActor() actor: ShippingActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    return this.shipments.updateStatus(actor, id, dto);
  }
  @Get(':id') detail(
    @CurrentActor() actor: ShippingActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shipments.detail(actor, id);
  }
}

@ApiTags('Carrier callbacks')
@Controller('callbacks/ghtk')
export class GhtkCallbackController {
  constructor(private readonly shipments: ShipmentsService) {}
  @Post() callback(@Body() dto: GhtkCallbackDto) {
    return this.shipments.handleGhtkCallback(dto);
  }
}
