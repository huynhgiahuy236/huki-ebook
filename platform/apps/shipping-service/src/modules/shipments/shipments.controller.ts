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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
  create(@Body() dto: CreateShipmentsFromOrderDto) {
    return this.shipments.createFromOrder(dto);
  }
  @Post(':sellerOrderId/cancel')
  @UseGuards(InternalApiGuard)
  @ApiOperation({ summary: 'Cancel a shipment by seller order ID (internal)' })
  @ApiHeader({ name: 'x-internal-api-key', required: true })
  @ApiParam({ name: 'sellerOrderId', description: 'Seller order UUID' })
  @ApiResponse({ status: 200, description: 'Shipment cancelled or already terminal' })
  @ApiUnauthorizedResponse({ description: 'Invalid internal API key' })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
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
  @Get()
  @ApiOperation({ summary: 'List shipments visible to the authenticated actor' })
  @ApiResponse({ status: 200, description: 'Paginated shipment list' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  list(
    @CurrentActor() actor: ShippingActor,
    @Query() query: ShipmentQueryDto,
  ) {
    return this.shipments.list(actor, query);
  }
  @Get('tracking/:trackingNumber')
  @ApiOperation({ summary: 'Track a shipment by tracking number' })
  @ApiParam({ name: 'trackingNumber', description: 'Carrier tracking number' })
  @ApiResponse({ status: 200, description: 'Shipment tracking details and timeline' })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  @ApiForbiddenResponse({ description: 'Shipment is outside the actor scope' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
  tracking(
    @CurrentActor() actor: ShippingActor,
    @Param('trackingNumber') code: string,
  ) {
    return this.shipments.tracking(actor, code);
  }
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update shipment status' })
  @ApiParam({ name: 'id', description: 'Shipment UUID' })
  @ApiResponse({ status: 200, description: 'Shipment status updated' })
  @ApiBadRequestResponse({ description: 'Invalid status transition' })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  @ApiForbiddenResponse({ description: 'Actor cannot perform this transition' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
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
  @ApiResponse({ status: 200, description: 'Shipment details' })
  @ApiNotFoundResponse({ description: 'Shipment not found' })
  @ApiForbiddenResponse({ description: 'Shipment is outside the actor scope' })
  @ApiUnauthorizedResponse({ description: 'Authentication required' })
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
  @ApiResponse({ status: 201, description: 'Callback accepted or already processed' })
  @ApiUnauthorizedResponse({ description: 'Invalid callback signature' })
  @ApiBadRequestResponse({ description: 'Invalid callback payload' })
  callback(@Body() dto: GhtkCallbackDto) {
    return this.shipments.handleGhtkCallback(dto);
  }
}
