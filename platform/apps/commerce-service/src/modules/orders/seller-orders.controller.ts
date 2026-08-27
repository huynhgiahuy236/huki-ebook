import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookActor, BookWriteGuard } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { CancelOrderDto, ShipOrderDto } from './dto/checkout.dto';
import { SellerOrderQueryDto } from './dto/order-query.dto';
import { OrdersService } from './orders.service';

@ApiTags('Seller orders')
@ApiBearerAuth()
@UseGuards(BookWriteGuard)
@Controller('seller/orders')
export class SellerOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List seller orders' })
  list(@CurrentBookActor() actor: BookActor, @Query() query: SellerOrderQueryDto) {
    return this.orders.sellerList(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get seller order details' })
  detail(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.sellerDetail(actor, id);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm a new order' })
  confirm(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.confirm(actor, id);
  }

  @Patch(':id/prepare')
  @ApiOperation({ summary: 'Mark order as preparing' })
  prepare(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.prepare(actor, id);
  }

  @Patch(':id/ship')
  @ApiOperation({ summary: 'Mark order as shipped' })
  ship(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ShipOrderDto) {
    return this.orders.ship(actor, id, dto);
  }

  @Patch(':id/deliver')
  @ApiOperation({ summary: 'Mark order as delivered' })
  deliver(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.deliver(actor, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  cancel(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelOrderDto) {
    return this.orders.cancelSeller(actor, id, dto);
  }
}
