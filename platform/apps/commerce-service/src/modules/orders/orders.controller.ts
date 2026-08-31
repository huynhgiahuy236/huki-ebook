/**
 * HUKI EBOOK - Orders Controller
 *
 * Handles buyer order management
 */

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiParam,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthenticatedGuard, BookActor } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { CancelOrderDto } from './dto/checkout.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AuthenticatedGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'List user orders',
    description: 'Returns a paginated list of orders for the authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of orders' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  list(
    @CurrentBookActor() actor: BookActor,
    @Query() query: OrderQueryDto,
  ) {
    return this.orders.buyerList(actor.sub, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get order details',
    description: 'Returns detailed information about a specific order.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Order does not belong to user' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  detail(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.buyerDetail(actor.sub, id);
  }

  @Get(':id/tracking')
  @ApiOperation({
    summary: 'Track order status',
    description: 'Returns real-time tracking information for an order.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order tracking information' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Order does not belong to user' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  tracking(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.tracking(actor.sub, id);
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Get order status history',
    description: 'Returns the complete status change history for an order.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order status history' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Order does not belong to user' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  history(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.tracking(actor.sub, id);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel an order',
    description: 'Cancels an order. Only possible before payment or shipment.',
  })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  @ApiForbiddenResponse({ description: 'Order does not belong to user' })
  @ApiBadRequestResponse({ description: 'Order cannot be cancelled (already shipped/paid)' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  cancel(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.cancelBuyer(actor.sub, id, dto);
  }
}
