import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DomainEvent, ORDER_EVENTS, SETTLEMENT_EVENTS, PAYMENT_EVENTS } from '@huki/shared';
import { Prisma } from '../../prisma/generated/client';

export interface ProcessEventResult {
  success: boolean;
  eventId: string;
  factsCreated: number;
  skipped?: boolean;
}

@Injectable()
export class EventProcessor {
  private readonly logger = new Logger(EventProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process incoming trusted domain event within an atomic transaction
   */
  async processDomainEvent(event: DomainEvent<any>): Promise<ProcessEventResult> {
    const { eventId, eventType, occurredAt, payload } = event;
    const eventTime = occurredAt ? new Date(occurredAt) : new Date();

    return this.prisma.$transaction(async (tx) => {
      // 1. Check message-level idempotency
      const alreadyProcessed = await tx.processedEvent.findUnique({
        where: { eventId },
      });

      if (alreadyProcessed) {
        this.logger.log(`Message ${eventId} already processed, acknowledging.`);
        return { success: true, eventId, factsCreated: 0, skipped: true };
      }

      let factsCount = 0;

      // 2. Dispatch event type to extract fact snapshots
      if (eventType === ORDER_EVENTS.PAID) {
        factsCount = await this.handleOrderPaid(tx, eventId, eventType, eventTime, payload);
      } else if (eventType === ORDER_EVENTS.COMPLETED) {
        factsCount = await this.handleOrderCompleted(tx, eventId, eventType, eventTime, payload);
      } else if (eventType === SETTLEMENT_EVENTS.COMPLETED) {
        factsCount = await this.handleSettlementCompleted(tx, eventId, eventType, eventTime, payload);
      } else if (eventType === PAYMENT_EVENTS.SUCCEEDED) {
        // Handled as part of payment telemetry if needed
        this.logger.debug(`Received PAYMENT_SUCCEEDED for order ${payload.orderId}`);
      } else {
        this.logger.debug(`Ignoring unhandled domain event type: ${eventType}`);
      }

      // 3. Mark message as processed
      await tx.processedEvent.create({
        data: {
          eventId,
          eventType,
          processedAt: new Date(),
        },
      });

      return {
        success: true,
        eventId,
        factsCreated: factsCount,
      };
    });
  }

  private async handleOrderPaid(
    tx: Prisma.TransactionClient,
    eventId: string,
    eventType: string,
    occurredAt: Date,
    payload: any,
  ): Promise<number> {
    const orderId = payload.orderId;
    if (!orderId) return 0;

    const factId = `ORDER_PAID:PAID_ORDER_COUNT:${orderId}`;
    const amount = payload.amount !== undefined ? new Prisma.Decimal(payload.amount.toString()) : new Prisma.Decimal(0);

    await tx.domainFactSnapshot.upsert({
      where: { factId },
      create: {
        factId,
        eventId,
        eventType,
        factType: 'PAID_ORDER_COUNT',
        orderId,
        amount,
        quantity: 1,
        occurredAt,
      },
      update: {},
    });

    return 1;
  }

  private async handleOrderCompleted(
    tx: Prisma.TransactionClient,
    eventId: string,
    eventType: string,
    occurredAt: Date,
    payload: any,
  ): Promise<number> {
    const orderId = payload.orderId;
    if (!orderId) return 0;

    let facts = 0;
    const grandTotal = new Prisma.Decimal((payload.grandTotal || payload.amount || '0').toString());

    // 1. PLATFORM_GMV fact
    const platformGmvFactId = `ORDER_COMPLETED:PLATFORM_GMV:${orderId}`;
    await tx.domainFactSnapshot.upsert({
      where: { factId: platformGmvFactId },
      create: {
        factId: platformGmvFactId,
        eventId,
        eventType,
        factType: 'PLATFORM_GMV',
        orderId,
        amount: grandTotal,
        quantity: 1,
        occurredAt,
      },
      update: {},
    });
    facts++;

    // 2. COMPLETED_ORDER_COUNT fact
    const orderCountFactId = `ORDER_COMPLETED:COMPLETED_ORDER_COUNT:${orderId}`;
    await tx.domainFactSnapshot.upsert({
      where: { factId: orderCountFactId },
      create: {
        factId: orderCountFactId,
        eventId,
        eventType,
        factType: 'COMPLETED_ORDER_COUNT',
        orderId,
        amount: grandTotal,
        quantity: 1,
        occurredAt,
      },
      update: {},
    });
    facts++;

    // 3. STORE_GMV, STORE_BOOK_GMV, PLATFORM_BOOK_GMV, UNITS_SOLD facts
    if (Array.isArray(payload.sellerOrders)) {
      for (const so of payload.sellerOrders) {
        const sellerOrderId = so.sellerOrderId;
        const storeId = so.storeId;
        const storeTotal = new Prisma.Decimal((so.grandTotal || '0').toString());

        if (sellerOrderId && storeId) {
          const storeGmvFactId = `ORDER_COMPLETED:STORE_GMV:${sellerOrderId}`;
          await tx.domainFactSnapshot.upsert({
            where: { factId: storeGmvFactId },
            create: {
              factId: storeGmvFactId,
              eventId,
              eventType,
              factType: 'STORE_GMV',
              orderId,
              sellerOrderId,
              storeId,
              amount: storeTotal,
              quantity: 1,
              occurredAt,
            },
            update: {},
          });
          facts++;
        }

        if (Array.isArray(so.items)) {
          for (const item of so.items) {
            const orderItemId = item.orderItemId;
            const bookId = item.bookId;
            const itemQty = Number(item.quantity || 1);
            const itemSubtotal = new Prisma.Decimal((item.subtotal || '0').toString());

            if (orderItemId && bookId) {
              // Store Book GMV
              const storeBookGmvFactId = `ORDER_COMPLETED:STORE_BOOK_GMV:${sellerOrderId}:${orderItemId}`;
              await tx.domainFactSnapshot.upsert({
                where: { factId: storeBookGmvFactId },
                create: {
                  factId: storeBookGmvFactId,
                  eventId,
                  eventType,
                  factType: 'STORE_BOOK_GMV',
                  orderId,
                  sellerOrderId,
                  storeId,
                  bookId,
                  amount: itemSubtotal,
                  quantity: itemQty,
                  occurredAt,
                },
                update: {},
              });
              facts++;

              // Platform Book GMV
              const platformBookGmvFactId = `ORDER_COMPLETED:PLATFORM_BOOK_GMV:${orderItemId}`;
              await tx.domainFactSnapshot.upsert({
                where: { factId: platformBookGmvFactId },
                create: {
                  factId: platformBookGmvFactId,
                  eventId,
                  eventType,
                  factType: 'PLATFORM_BOOK_GMV',
                  orderId,
                  sellerOrderId,
                  storeId,
                  bookId,
                  amount: itemSubtotal,
                  quantity: itemQty,
                  occurredAt,
                },
                update: {},
              });
              facts++;

              // Units Sold
              const unitsSoldFactId = `ORDER_COMPLETED:UNITS_SOLD:${sellerOrderId}:${orderItemId}`;
              await tx.domainFactSnapshot.upsert({
                where: { factId: unitsSoldFactId },
                create: {
                  factId: unitsSoldFactId,
                  eventId,
                  eventType,
                  factType: 'UNITS_SOLD',
                  orderId,
                  sellerOrderId,
                  storeId,
                  bookId,
                  amount: itemSubtotal,
                  quantity: itemQty,
                  occurredAt,
                },
                update: {},
              });
              facts++;
            }
          }
        }
      }
    }

    return facts;
  }

  private async handleSettlementCompleted(
    tx: Prisma.TransactionClient,
    eventId: string,
    eventType: string,
    occurredAt: Date,
    payload: any,
  ): Promise<number> {
    const sellerOrderId = payload.sellerOrderId;
    const storeId = payload.storeId;
    const orderId = payload.orderId;
    if (!sellerOrderId || !storeId) return 0;

    let facts = 0;
    const sellerNet = new Prisma.Decimal((payload.sellerNet || '0').toString());
    const platformCommission = new Prisma.Decimal((payload.platformCommission || '0').toString());
    const platformSubsidy = new Prisma.Decimal((payload.platformSubsidy || '0').toString());

    // 1. SELLER_NET fact
    const sellerNetFactId = `SETTLEMENT_COMPLETED:SELLER_NET:${sellerOrderId}`;
    await tx.domainFactSnapshot.upsert({
      where: { factId: sellerNetFactId },
      create: {
        factId: sellerNetFactId,
        eventId,
        eventType,
        factType: 'SELLER_NET',
        orderId,
        sellerOrderId,
        storeId,
        amount: sellerNet,
        quantity: 1,
        metadata: {
          commissionBasis: payload.commissionBasis,
          commissionPercent: payload.commissionPercent,
        },
        occurredAt,
      },
      update: {},
    });
    facts++;

    // 2. PLATFORM_COMMISSION fact
    const commissionFactId = `SETTLEMENT_COMPLETED:PLATFORM_COMMISSION:${sellerOrderId}`;
    await tx.domainFactSnapshot.upsert({
      where: { factId: commissionFactId },
      create: {
        factId: commissionFactId,
        eventId,
        eventType,
        factType: 'PLATFORM_COMMISSION',
        orderId,
        sellerOrderId,
        storeId,
        amount: platformCommission,
        quantity: 1,
        metadata: {
          commissionBasis: payload.commissionBasis,
          commissionPercent: payload.commissionPercent,
        },
        occurredAt,
      },
      update: {},
    });
    facts++;

    // 3. PLATFORM_SUBSIDY fact (if any)
    if (payload.platformSubsidy && new Prisma.Decimal(payload.platformSubsidy.toString()).gt(0)) {
      const subsidyFactId = `SETTLEMENT_COMPLETED:PLATFORM_SUBSIDY:${sellerOrderId}`;
      await tx.domainFactSnapshot.upsert({
        where: { factId: subsidyFactId },
        create: {
          factId: subsidyFactId,
          eventId,
          eventType,
          factType: 'PLATFORM_SUBSIDY',
          orderId,
          sellerOrderId,
          storeId,
          amount: platformSubsidy,
          quantity: 1,
          occurredAt,
        },
        update: {},
      });
      facts++;
    }

    return facts;
  }
}
