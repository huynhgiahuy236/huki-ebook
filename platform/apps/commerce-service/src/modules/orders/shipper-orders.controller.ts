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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookActor, OptionalBookAuthGuard } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { OrdersService } from './orders.service';

@ApiTags('Shipper orders')
@UseGuards(OptionalBookAuthGuard)
@Controller('orders/shipper')
export class ShipperOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get(['orders', 'available-orders'])
  @ApiOperation({ summary: 'Shipper lists all physical orders from database' })
  listOrders(@CurrentBookActor() actor?: BookActor) {
    return this.orders.shipperListOrders(actor);
  }

  @Get(['admin/shippers', 'admin-shippers', 'fleet'])
  @ApiOperation({ summary: 'Admin lists all shipper drivers with dynamic statistics from DB' })
  listAdminShippers(@CurrentBookActor() actor?: BookActor) {
    return this.orders.adminListShippers(actor);
  }

  @Patch(['orders/:id/pickup', ':id/pickup'])
  @ApiOperation({ summary: 'Shipper confirms picking up order from store' })
  pickup(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentBookActor() actor?: BookActor,
    @Body() body?: { carrier?: string; trackingCode?: string },
  ) {
    return this.orders.shipperPickupOrder(actor, id, body);
  }

  @Patch(['orders/:id/deliver', ':id/deliver'])
  @ApiOperation({ summary: 'Shipper confirms delivering order to customer' })
  deliver(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentBookActor() actor?: BookActor,
    @Body() body?: { note?: string },
  ) {
    return this.orders.shipperDeliverOrder(actor, id, body);
  }

  @Patch(['orders/:id/fail', ':id/fail'])
  @ApiOperation({ summary: 'Shipper reports failed delivery' })
  fail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentBookActor() actor?: BookActor,
    @Body() body?: { reason: string },
  ) {
    return this.orders.shipperFailOrder(actor, id, body || { reason: 'Không liên lạc được khách hàng' });
  }

  @Post(['remit-cod', 'wallet/remit'])
  @ApiOperation({ summary: 'Shipper remits COD cash to platform' })
  remitCod(
    @CurrentBookActor() actor?: BookActor,
    @Body() body?: { amount: number; method?: string; txCode?: string },
  ) {
    return this.orders.shipperRemitCod(actor, body);
  }

  @Get(['remittances', 'wallet/remittances'])
  @ApiOperation({ summary: 'List COD remittances' })
  listRemittances() {
    return this.orders.listRemittances();
  }
}
