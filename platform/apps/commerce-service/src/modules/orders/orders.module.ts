import { Module } from '@nestjs/common';
import { AuthenticatedGuard, BookWriteGuard } from '../../common/book-auth.guard';
import { CartModule } from '../cart/cart.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { InventoryReservationService } from './inventory-reservation.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SellerOrdersController } from './seller-orders.controller';

@Module({
  imports: [CartModule],
  controllers: [CheckoutController, OrdersController, SellerOrdersController],
  providers: [
    CheckoutService,
    OrdersService,
    InventoryReservationService,
    AuthenticatedGuard,
    BookWriteGuard,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
