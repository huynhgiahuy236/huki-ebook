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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'List user orders' })
  list(
    @CurrentBookActor() actor: BookActor,
    @Query() query: OrderQueryDto,
  ) {
    return this.orders.buyerList(actor.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  detail(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.buyerDetail(actor.sub, id);
  }

  @Get(':id/tracking')
  @ApiOperation({ summary: 'Track order status' })
  tracking(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.tracking(actor.sub, id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get order status history' })
  history(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orders.tracking(actor.sub, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  cancel(
    @CurrentBookActor() actor: BookActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.cancelBuyer(actor.sub, id, dto);
  }
}
