import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BookActor, BookWriteGuard } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { CancelOrderDto, ShipOrderDto } from './dto/checkout.dto';
import { SellerOrderQueryDto } from './dto/order-query.dto';
import { OrdersService } from './orders.service';

@ApiTags('Seller orders') @ApiBearerAuth() @UseGuards(BookWriteGuard) @Controller('seller/orders')
export class SellerOrdersController {
  constructor(private readonly orders: OrdersService) {}
  @Get() list(@CurrentBookActor() actor: BookActor, @Query() query: SellerOrderQueryDto) { return this.orders.sellerList(actor, query); }
  @Get(':id') detail(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string) { return this.orders.sellerDetail(actor, id); }
  @Patch(':id/confirm') confirm(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string) { return this.orders.confirm(actor, id); }
  @Patch(':id/prepare') prepare(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string) { return this.orders.prepare(actor, id); }
  @Patch(':id/ship') ship(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ShipOrderDto) { return this.orders.ship(actor, id, dto); }
  @Patch(':id/deliver') deliver(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string) { return this.orders.deliver(actor, id); }
  @Patch(':id/cancel') cancel(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelOrderDto) { return this.orders.cancelSeller(actor, id, dto); }
}
