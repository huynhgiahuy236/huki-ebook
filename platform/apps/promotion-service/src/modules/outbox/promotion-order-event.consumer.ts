import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import {
  DomainEvent,
  ORDER_EVENTS,
  PAYMENT_EVENTS,
  RabbitMqEventBus,
} from '@huki/shared';
import { VouchersService } from '../vouchers/vouchers.service';
import { FlashSalesService } from '../flash-sales/flash-sales.service';

@Injectable()
export class PromotionOrderEventConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(PromotionOrderEventConsumer.name);

  constructor(
    private readonly bus: RabbitMqEventBus,
    private readonly vouchers: VouchersService,
    private readonly flashSales: FlashSalesService,
  ) {}

  onApplicationBootstrap(): void {
    this.bus.subscribe(
      'promotion-service.order-events',
      [
        ORDER_EVENTS.CANCELLED,
        ORDER_EVENTS.SELLER_CANCELLED,
        PAYMENT_EVENTS.FAILED,
      ],
      (event) => this.handle(event),
    );
  }

  private async handle(event: DomainEvent): Promise<void> {
    const orderId = String(event.payload?.orderId ?? event.aggregateId);
    if (!orderId) return;

    this.logger.log(
      `[PromotionOrderEventConsumer] Processing ${event.eventType} for order ${orderId} - rolling back vouchers & flash sale reservations`,
    );

    try {
      const rollbackResult = await this.vouchers.rollbackByOrderId(orderId);
      if (rollbackResult?.rolledBack) {
        this.logger.log(`[Voucher Rollback] Successfully rolled back voucher for order ${orderId}`);
      }
    } catch (err: any) {
      this.logger.warn(`[Voucher Rollback Error] Order ${orderId}: ${err.message}`);
    }

    try {
      const released = await this.flashSales.releaseOrder({ orderId });
      if (released) {
        this.logger.log(`[FlashSale Release] Successfully released ${released} reservations for order ${orderId}`);
      }
    } catch (err: any) {
      this.logger.warn(`[FlashSale Release Error] Order ${orderId}: ${err.message}`);
    }
  }
}
