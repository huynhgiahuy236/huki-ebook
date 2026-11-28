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
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
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
  @ApiHeader({ name: 'x-internal-api-key', required: true })
  @ApiOperation({
    summary: 'Idempotently create shipments from an order event payload',
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Shipments created idempotently' })
  @ApiStandardErrors(400, 401)
  create(@Body() dto: CreateShipmentsFromOrderDto) {
    return this.shipments.createFromOrder(dto);
  }
  @Post(':sellerOrderId/cancel')
  @UseGuards(InternalApiGuard)
  @ApiOperation({ summary: 'Cancel a shipment by seller order ID (internal)' })
  @ApiHeader({ name: 'x-internal-api-key', required: true })
  @ApiParam({ name: 'sellerOrderId', description: 'Seller order UUID' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Shipment cancelled or already terminal' })
  @ApiStandardErrors(401, 404)
  cancel(
    @Param('sellerOrderId', ParseUUIDPipe) id: string,
    @Body() dto: CancelShipmentDto,
  ) {
    return this.shipments.cancelBySellerOrder(id, dto);
  }
}

@ApiTags('Shipments')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthenticatedGuard)
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}
  @Get()
  @ApiOperation({ summary: 'List shipments visible to the authenticated actor' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Paginated shipment list' })
  @ApiStandardErrors(401)
  list(
    @CurrentActor() actor: ShippingActor,
    @Query() query: ShipmentQueryDto,
  ) {
    return this.shipments.list(actor, query);
  }
  @Get('tracking/:trackingNumber')
  @ApiOperation({ summary: 'Track a shipment by tracking number' })
  @ApiParam({ name: 'trackingNumber', description: 'Carrier tracking number' })
  @ApiSuccessResponse(undefined, { description: 'Shipment tracking details and timeline' })
  @ApiStandardErrors(401, 403, 404)
  tracking(
    @CurrentActor() actor: ShippingActor,
    @Param('trackingNumber') code: string,
  ) {
    return this.shipments.tracking(actor, code);
  }
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update shipment status' })
  @ApiParam({ name: 'id', description: 'Shipment UUID' })
  @ApiSuccessResponse(undefined, { description: 'Shipment status updated' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  updateStatus(
    @CurrentActor() actor: ShippingActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    return this.shipments.updateStatus(actor, id, dto);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get shipment details' })
  @ApiParam({ name: 'id', description: 'Shipment UUID' })
  @ApiSuccessResponse(undefined, { description: 'Shipment details' })
  @ApiStandardErrors(401, 403, 404)
  detail(
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
  @Post()
  @ApiOperation({ summary: 'Receive a signed GHTK shipment callback' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Callback accepted or already processed' })
  @ApiStandardErrors(400, 401)
  callback(@Body() dto: GhtkCallbackDto) {
    return this.shipments.handleGhtkCallback(dto);
  }
}
