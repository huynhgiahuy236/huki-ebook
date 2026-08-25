import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { InventoryReservationService } from './inventory-reservation.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SellerOrdersController } from './seller-orders.controller';
import { OrderCompletionService } from './order-completion.service';

@Module({
  imports: [CartModule],
  controllers: [CheckoutController, OrdersController, SellerOrdersController],
  providers: [
    CheckoutService,
    OrdersService,
    InventoryReservationService,
    OrderCompletionService,
  ],
  exports: [OrdersService, InventoryReservationService, OrderCompletionService],
})
export class OrdersModule {}
