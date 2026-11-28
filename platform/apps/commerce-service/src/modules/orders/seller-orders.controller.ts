import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { BookActor, BookWriteGuard } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { CancelOrderDto, ShipOrderDto } from './dto/checkout.dto';
import { SellerOrderQueryDto } from './dto/order-query.dto';
import { OrdersService } from './orders.service';

@ApiTags('Seller orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(BookWriteGuard)
@Controller('seller/orders')
export class SellerOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List seller orders' })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'Paginated seller orders' })
  @ApiStandardErrors(401, 403)
  list(@CurrentBookActor() actor: BookActor, @Query() query: SellerOrderQueryDto) {
    return this.orders.sellerList(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get seller order details' })
  @ApiSuccessResponse(undefined, { description: 'Seller order detail' })
  @ApiStandardErrors(401, 403, 404)
  detail(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.sellerDetail(actor, id);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm a new order' })
  @ApiSuccessResponse(undefined, { description: 'Order confirmed' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  confirm(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.confirm(actor, id);
  }

  @Patch(':id/prepare')
  @ApiOperation({ summary: 'Mark order as preparing' })
  @ApiSuccessResponse(undefined, { description: 'Order marked as preparing' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  prepare(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.prepare(actor, id);
  }

  @Patch(':id/ship')
  @ApiOperation({ summary: 'Mark order as shipped' })
  @ApiSuccessResponse(undefined, { description: 'Order marked as shipped' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  ship(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ShipOrderDto) {
    return this.orders.ship(actor, id, dto);
  }

  @Patch(':id/deliver')
  @ApiOperation({ summary: 'Mark order as delivered' })
  @ApiSuccessResponse(undefined, { description: 'Order marked as delivered' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  deliver(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.deliver(actor, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiSuccessResponse(undefined, { description: 'Order cancelled' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  cancel(@CurrentBookActor() actor: BookActor, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelOrderDto) {
    return this.orders.cancelSeller(actor, id, dto);
  }

  @Patch(':id/approve-cancellation')
  @ApiOperation({ summary: 'Approve buyer cancellation request during packing phase (Task 59)' })
  @ApiSuccessResponse(undefined, { description: 'Cancellation approved' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  approveCancellation(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto?: CancelOrderDto,
  ) {
    return this.orders.approveCancellation(actor, id, dto);
  }

  @Patch(':id/reject-cancellation')
  @ApiOperation({ summary: 'Reject buyer cancellation request during packing phase (Task 59)' })
  @ApiSuccessResponse(undefined, { description: 'Cancellation rejected' })
  @ApiStandardErrors(400, 401, 403, 404, 409)
  rejectCancellation(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.rejectCancellation(actor, id, dto);
  }
}
