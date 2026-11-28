import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { BookActor, ShipperGuard } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { OrdersService } from './orders.service';

@ApiTags('Shipper orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(ShipperGuard)
@Controller('orders/shipper')
export class ShipperOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get(['orders', 'available-orders'])
  @ApiOperation({ summary: 'Shipper lists all physical orders from database' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Shipper orders list' })
  @ApiStandardErrors(401, 403)
  listOrders(@CurrentBookActor() actor?: BookActor) {
    return this.orders.shipperListOrders(actor);
  }

  @Get(['admin/shippers', 'admin-shippers', 'fleet'])
  @ApiOperation({ summary: 'Admin lists all shipper drivers with dynamic statistics from DB' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Shipper fleet list' })
  @ApiStandardErrors(401, 403)
  listAdminShippers(@CurrentBookActor() actor?: BookActor) {
    return this.orders.adminListShippers(actor);
  }

  @Patch(['orders/:id/claim', ':id/claim'])
  @ApiOperation({ summary: 'Shipper claims order atomically' })
  @ApiSuccessResponse(undefined, { description: 'Order claimed' })
  @ApiStandardErrors(401, 403, 404, 409)
  claim(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentBookActor() actor?: BookActor,
  ) {
    return this.orders.shipperClaimOrder(actor, id);
  }

  @Patch(['orders/:id/pickup', ':id/pickup'])
  @ApiOperation({ summary: 'Shipper confirms picking up order from store' })
  @ApiBody({ required: false, schema: { type: 'object', properties: { carrier: { type: 'string' }, trackingCode: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { description: 'Order picked up' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  pickup(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentBookActor() actor?: BookActor,
    @Body() body?: { carrier?: string; trackingCode?: string },
  ) {
    return this.orders.shipperPickupOrder(actor, id, body);
  }

  @Patch(['orders/:id/deliver', ':id/deliver'])
  @ApiOperation({ summary: 'Shipper confirms delivering order to customer' })
  @ApiBody({ required: false, schema: { type: 'object', properties: { note: { type: 'string' }, podImageUrl: { type: 'string' }, evidenceImageUrl: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { description: 'Order delivered' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  deliver(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentBookActor() actor?: BookActor,
    @Body() body?: { note?: string; podImageUrl?: string; evidenceImageUrl?: string },
  ) {
    return this.orders.shipperDeliverOrder(actor, id, body);
  }

  @Patch(['orders/:id/fail', ':id/fail'])
  @ApiOperation({ summary: 'Shipper reports failed delivery' })
  @ApiBody({ required: false, schema: { type: 'object', properties: { reason: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { description: 'Failed delivery recorded' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  fail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentBookActor() actor?: BookActor,
    @Body() body?: { reason: string },
  ) {
    return this.orders.shipperFailOrder(actor, id, body || { reason: 'Không liên lạc được khách hàng' });
  }

  @Post(['remit-cod', 'wallet/remit'])
  @ApiOperation({ summary: 'Shipper remits COD cash to platform' })
  @ApiBody({ required: false, schema: { type: 'object', properties: { amount: { type: 'number' }, method: { type: 'string' }, txCode: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'COD remitted' })
  @ApiStandardErrors(400, 401, 403)
  remitCod(
    @CurrentBookActor() actor?: BookActor,
    @Body() body?: { amount: number; method?: string; txCode?: string },
  ) {
    return this.orders.shipperRemitCod(actor, body);
  }

  @Get(['remittances', 'wallet/remittances'])
  @ApiOperation({ summary: 'List COD remittances' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'COD remittances list' })
  @ApiStandardErrors(401, 403)
  listRemittances() {
    return this.orders.listRemittances();
  }

  @Get(['profile', 'shipper/profile'])
  @ApiOperation({ summary: 'Get current shipper driver profile' })
  @ApiSuccessResponse(undefined, { description: 'Shipper profile' })
  @ApiStandardErrors(401, 403)
  getProfile(@CurrentBookActor() actor?: BookActor) {
    return this.orders.getShipperProfile(actor);
  }

  @Patch(['profile', 'shipper/profile'])
  @ApiOperation({ summary: 'Update shipper driver profile' })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        vehicleType: { type: 'string' },
        licensePlate: { type: 'string' },
        activeZone: { type: 'string' },
        identityCard: { type: 'string' },
      },
    },
  })
  @ApiSuccessResponse(undefined, { description: 'Shipper profile updated' })
  @ApiStandardErrors(400, 401, 403)
  updateProfile(
    @CurrentBookActor() actor?: BookActor,
    @Body() body?: {
      name?: string;
      phone?: string;
      vehicleType?: string;
      licensePlate?: string;
      activeZone?: string;
      identityCard?: string;
    },
  ) {
    return this.orders.updateShipperProfile(actor, body);
  }
}
