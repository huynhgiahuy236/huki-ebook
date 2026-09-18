import { Module } from "@nestjs/common";
import { CartModule } from "../cart/cart.module";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
import { InventoryReservationService } from "./inventory-reservation.service";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { SellerOrdersController } from "./seller-orders.controller";
import { OrderCompletionService } from "./order-completion.service";
import { FlashSaleClientService } from "./flash-sale-client.service";
import { EscrowService } from "./escrow.service";
import { SettlementService } from "./settlement.service";
import { ShippingModule } from "../shipping/shipping.module";
import { VoucherModule } from "../voucher/voucher.module";
import { WalletModule } from "../wallet/wallet.module";
import { LedgerModule } from "../ledger/ledger.module";
import { PolicyConfigService } from "../../../../../libs/shared/src/config/policy-config.service";

@Module({
  imports: [CartModule, ShippingModule, VoucherModule, WalletModule, LedgerModule],
  controllers: [CheckoutController, OrdersController, SellerOrdersController],
  providers: [
    CheckoutService,
    OrdersService,
    InventoryReservationService,
    OrderCompletionService,
    FlashSaleClientService,
    EscrowService,
    SettlementService,
    PolicyConfigService,
  ],
  exports: [
    OrdersService,
    InventoryReservationService,
    OrderCompletionService,
    FlashSaleClientService,
    EscrowService,
    SettlementService,
  ],
})
export class OrdersModule {}
