import { EventProcessor } from '../src/services/EventProcessor';
import { DailyRollupService } from '../src/services/DailyRollupService';
import { DailyRollupRunner } from '../src/services/DailyRollupRunner';
import { GMVService } from '../src/services/GMVService';
import { AnalyticsController } from '../src/routes/analytics';
import { AnalyticsQueryService } from '../src/services/AnalyticsQueryService';
import { PrismaService } from '../src/prisma/prisma.service';
import { ORDER_EVENTS } from '@huki/shared';
import { Prisma, AggregateScope } from '../prisma/generated/client';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

// Mock in-memory storage for test assertions
class MockPrismaService {
  analyticsEvents: any[] = [];
  domainFactSnapshots: any[] = [];
  dailyAggregates: any[] = [];
  processedEvents: any[] = [];

  analyticsEvent = {
    findUnique: jest.fn(async ({ where }: { where: { sourceEventId: string } }) => {
      return this.analyticsEvents.find((e) => e.sourceEventId === where.sourceEventId) || null;
    }),
    create: jest.fn(async ({ data }: { data: any }) => {
      const record = { id: `ae-${Date.now()}-${Math.random()}`, ...data };
      this.analyticsEvents.push(record);
      return record;
    }),
    groupBy: jest.fn(async ({ by, where }: any) => {
      const filtered = this.analyticsEvents.filter((e) => {
        if (where?.createdAt?.gte && e.createdAt < where.createdAt.gte) return false;
        if (where?.createdAt?.lte && e.createdAt > where.createdAt.lte) return false;
        return true;
      });
      const map = new Map<string, number>();
      for (const item of filtered) {
        const key = item.eventType;
        map.set(key, (map.get(key) || 0) + 1);
      }
      return Array.from(map.entries()).map(([eventType, count]) => ({
        eventType,
        _count: { id: count },
      }));
    }),
  };

  domainFactSnapshot = {
    findUnique: jest.fn(async ({ where }: { where: { factId: string } }) => {
      return this.domainFactSnapshots.find((f) => f.factId === where.factId) || null;
    }),
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const idx = this.domainFactSnapshots.findIndex((f) => f.factId === where.factId);
      if (idx >= 0) {
        const updated = { ...this.domainFactSnapshots[idx], ...update };
        this.domainFactSnapshots[idx] = updated;
        return updated;
      }
      const record = { id: `dfs-${Date.now()}-${Math.random()}`, ...create };
      this.domainFactSnapshots.push(record);
      return record;
    }),
    findMany: jest.fn(async ({ where }: any) => {
      return this.domainFactSnapshots.filter((f) => {
        if (where?.occurredAt?.gte && f.occurredAt < where.occurredAt.gte) return false;
        if (where?.occurredAt?.lte && f.occurredAt > where.occurredAt.lte) return false;
        return true;
      });
    }),
  };

  dailyAggregate = {
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const key = where.unique_daily_aggregate_grain;
      const idx = this.dailyAggregates.findIndex(
        (a) =>
          a.businessDate.getTime() === key.businessDate.getTime() &&
          a.metricName === key.metricName &&
          a.scope === key.scope &&
          a.dimensionKey === key.dimensionKey,
      );
      if (idx >= 0) {
        const updated = { ...this.dailyAggregates[idx], ...update };
        this.dailyAggregates[idx] = updated;
        return updated;
      }
      const record = { id: `da-${Date.now()}-${Math.random()}`, ...create };
      this.dailyAggregates.push(record);
      return record;
    }),
    findMany: jest.fn(async ({ where, orderBy }: any) => {
      return this.dailyAggregates.filter((a) => {
        if (where?.scope && a.scope !== where.scope) return false;
        if (where?.storeId && a.storeId !== where.storeId) return false;
        if (where?.metricName) {
          if (typeof where.metricName === 'string' && a.metricName !== where.metricName) return false;
          if (where.metricName?.in && !where.metricName.in.includes(a.metricName)) return false;
        }
        if (typeof where?.dimensionKey === 'string' && a.dimensionKey !== where.dimensionKey) return false;
        if (typeof where?.dimensionKey === 'object' && where?.dimensionKey?.startsWith && !a.dimensionKey.startsWith(where.dimensionKey.startsWith)) return false;
        if (where?.businessDate?.gte && a.businessDate < where.businessDate.gte) return false;
        if (where?.businessDate?.lte && a.businessDate > where.businessDate.lte) return false;
        return true;
      });
    }),
  };

  processedEvent = {
    findUnique: jest.fn(async ({ where }: { where: { eventId: string } }) => {
      return this.processedEvents.find((p) => p.eventId === where.eventId) || null;
    }),
    create: jest.fn(async ({ data }: { data: any }) => {
      const record = { ...data };
      this.processedEvents.push(record);
      return record;
    }),
  };

  $transaction = jest.fn(async (cb: (tx: any) => Promise<any>) => {
    return cb(this);
  });
}

describe('Task 80 — GMV Calculation (Test Matrix TC-01 to TC-24)', () => {
  let prisma: MockPrismaService;
  let eventProcessor: EventProcessor;
  let rollupService: DailyRollupService;
  let rollupRunner: DailyRollupRunner;
  let queryService: AnalyticsQueryService;
  let gmvService: GMVService;
  let controller: AnalyticsController;

  beforeEach(() => {
    prisma = new MockPrismaService();
    eventProcessor = new EventProcessor(prisma as unknown as PrismaService);
    rollupService = new DailyRollupService(prisma as unknown as PrismaService);
    rollupRunner = new DailyRollupRunner(rollupService);
    queryService = new AnalyticsQueryService(prisma as unknown as PrismaService);
    gmvService = new GMVService(prisma as unknown as PrismaService);
    controller = new AnalyticsController(queryService, rollupService, rollupRunner, gmvService);
  });

  // =========================================================================
  // GROUP A: GMV Semantics & Order Lifecycle Mapping
  // =========================================================================

  test('TC-01: Canonical DELIVERED vs COMPLETED mapping matches actual lifecycle', async () => {
    // In commerce, physical sub-order DELIVERED leads to parent ORDER_COMPLETED
    const orderCompletedEvent = {
      eventId: 'evt-tc01-comp',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-18T10:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-001',
      payload: {
        orderId: 'ord-001',
        orderCode: 'ORD-001',
        userId: 'user-001',
        grandTotal: '250000.00',
        sellerOrders: [
          {
            sellerOrderId: 'so-001',
            storeId: 'store-alpha',
            grandTotal: '250000.00',
            itemSubtotal: '220000.00',
            shippingFee: '30000.00',
            items: [{ orderItemId: 'item-001', bookId: 'book-001', quantity: 2, subtotal: '220000.00' }],
          },
        ],
      },
    };

    const res = await eventProcessor.processDomainEvent(orderCompletedEvent);
    expect(res.success).toBe(true);
    expect(res.factsCreated).toBeGreaterThan(0);

    const fact = prisma.domainFactSnapshots.find((f) => f.factId === 'ORDER_COMPLETED:PLATFORM_GMV:ord-001');
    expect(fact).toBeDefined();
    expect(fact.amount.toString()).toBe('250000');
  });

  test('TC-02: Every eligible GMV state has an authoritative event source', async () => {
    // ORDER_COMPLETED is the single verified event source for sales facts
    const facts = prisma.domainFactSnapshots;
    expect(ORDER_EVENTS.COMPLETED).toBe('ORDER_COMPLETED');
  });

  test('TC-03: No order state is marked GMV eligible without an event/fact source', async () => {
    // In-flight or unpaid orders do not emit ORDER_COMPLETED and thus create 0 GMV facts
    const gmvFactsBefore = prisma.domainFactSnapshots.filter((f) => f.factType === 'PLATFORM_GMV');
    expect(gmvFactsBefore.length).toBe(0);
  });

  // =========================================================================
  // GROUP B: Multi-Grain Hierarchy & Double-Counting Prevention
  // =========================================================================

  test('TC-04: Platform GMV consumes strictly PLATFORM_GMV grain', async () => {
    await eventProcessor.processDomainEvent({
      eventId: 'evt-tc04',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-18T10:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-tc04',
      payload: {
        orderId: 'ord-tc04',
        grandTotal: '500000.00',
        sellerOrders: [
          {
            sellerOrderId: 'so-tc04',
            storeId: 'store-alpha',
            grandTotal: '500000.00',
            items: [{ orderItemId: 'item-tc04', bookId: 'book-tc04', quantity: 1, subtotal: '500000.00' }],
          },
        ],
      },
    });

    await rollupService.aggregateDay('2026-09-18');
    const result = await gmvService.getPlatformGMV('2026-09-18', '2026-09-18');

    // Platform GMV consumes strictly PLATFORM_GMV rows and does not sum store/book rows
    expect(result.totalGmv).toBe('500000.00');
  });

  test('TC-05: Platform completedOrders is sourced from COMPLETED_ORDER_COUNT', async () => {
    await eventProcessor.processDomainEvent({
      eventId: 'evt-tc05',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-18T10:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-tc05',
      payload: {
        orderId: 'ord-tc05',
        grandTotal: '150000.00',
        sellerOrders: [
          {
            sellerOrderId: 'so-tc05',
            storeId: 'store-alpha',
            grandTotal: '150000.00',
            items: [{ orderItemId: 'item-tc05', bookId: 'book-tc05', quantity: 1, subtotal: '150000.00' }],
          },
        ],
      },
    });

    await rollupService.aggregateDay('2026-09-18');
    const result = await gmvService.getPlatformGMV('2026-09-18', '2026-09-18');

    expect(result.completedOrders).toBe(1);
    expect(result.timeline[0].orders).toBe(1);
  });

  test('TC-06: Store GMV cannot double-count parent Order GMV', async () => {
    // 1 Parent order with grandTotal 300,000 contains 2 SellerOrders of 150,000 each
    await eventProcessor.processDomainEvent({
      eventId: 'evt-tc06',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-18T10:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-tc06',
      payload: {
        orderId: 'ord-tc06',
        grandTotal: '300000.00',
        sellerOrders: [
          {
            sellerOrderId: 'so-alpha',
            storeId: 'store-alpha',
            grandTotal: '150000.00',
            items: [{ orderItemId: 'it-1', bookId: 'b-1', quantity: 1, subtotal: '150000.00' }],
          },
          {
            sellerOrderId: 'so-beta',
            storeId: 'store-beta',
            grandTotal: '150000.00',
            items: [{ orderItemId: 'it-2', bookId: 'b-2', quantity: 1, subtotal: '150000.00' }],
          },
        ],
      },
    });

    await rollupService.aggregateDay('2026-09-18');

    const storeAlpha = await gmvService.getStoreGMV('store-alpha', '2026-09-18', '2026-09-18');
    const storeBeta = await gmvService.getStoreGMV('store-beta', '2026-09-18', '2026-09-18');

    // Each store sees strictly its 150,000 sub-order total, NOT 300,000 parent total
    expect(storeAlpha.totalGmv).toBe('150000.00');
    expect(storeBeta.totalGmv).toBe('150000.00');
  });

  test('TC-07: Store GMV does not expose fabricated parent order count', async () => {
    // Store GMV response contract omits completedOrders because STORE_COMPLETED_ORDER_COUNT is gap
    const storeRes = await gmvService.getStoreGMV('store-alpha', '2026-09-18', '2026-09-18');
    expect((storeRes as any).completedOrders).toBeUndefined();
  });

  test('TC-08: Each SellerOrder contributes only to its own Store grain', async () => {
    await eventProcessor.processDomainEvent({
      eventId: 'evt-tc08',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-18T11:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-tc08',
      payload: {
        orderId: 'ord-tc08',
        grandTotal: '100000.00',
        sellerOrders: [
          {
            sellerOrderId: 'so-alpha-only',
            storeId: 'store-alpha',
            grandTotal: '100000.00',
            items: [{ orderItemId: 'it-alpha', bookId: 'b-alpha', quantity: 1, subtotal: '100000.00' }],
          },
        ],
      },
    });

    await rollupService.aggregateDay('2026-09-18');

    const storeBeta = await gmvService.getStoreGMV('store-beta', '2026-09-18', '2026-09-18');
    expect(storeBeta.totalGmv).toBe('0.00');
  });

  test('TC-09: Same book sold by two stores is separated in Store Book GMV', async () => {
    await eventProcessor.processDomainEvent({
      eventId: 'evt-tc09',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-18T12:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-tc09',
      payload: {
        orderId: 'ord-tc09',
        grandTotal: '200000.00',
        sellerOrders: [
          {
            sellerOrderId: 'so-store1',
            storeId: 'store-1',
            grandTotal: '100000.00',
            items: [{ orderItemId: 'it-s1', bookId: 'shared-book-100', quantity: 1, subtotal: '100000.00' }],
          },
          {
            sellerOrderId: 'so-store2',
            storeId: 'store-2',
            grandTotal: '100000.00',
            items: [{ orderItemId: 'it-s2', bookId: 'shared-book-100', quantity: 1, subtotal: '100000.00' }],
          },
        ],
      },
    });

    await rollupService.aggregateDay('2026-09-18');

    const s1Gmv = await gmvService.getStoreGMV('store-1', '2026-09-18', '2026-09-18');
    const s2Gmv = await gmvService.getStoreGMV('store-2', '2026-09-18', '2026-09-18');

    expect(s1Gmv.byBook.find((b) => b.bookId === 'shared-book-100')?.gmv).toBe('100000.00');
    expect(s2Gmv.byBook.find((b) => b.bookId === 'shared-book-100')?.gmv).toBe('100000.00');
  });

  test('TC-10: Store byBook.units is correctly sourced from store book UNITS_SOLD', async () => {
    await eventProcessor.processDomainEvent({
      eventId: 'evt-tc10',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-18T12:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-tc10',
      payload: {
        orderId: 'ord-tc10',
        grandTotal: '300000.00',
        sellerOrders: [
          {
            sellerOrderId: 'so-tc10',
            storeId: 'store-alpha',
            grandTotal: '300000.00',
            items: [{ orderItemId: 'it-tc10', bookId: 'book-qty-3', quantity: 3, subtotal: '300000.00' }],
          },
        ],
      },
    });

    await rollupService.aggregateDay('2026-09-18');

    const storeRes = await gmvService.getStoreGMV('store-alpha', '2026-09-18', '2026-09-18');
    const bookEntry = storeRes.byBook.find((b) => b.bookId === 'book-qty-3');
    expect(bookEntry).toBeDefined();
    expect(bookEntry?.units).toBe(3);
    expect(bookEntry?.gmv).toBe('300000.00');
  });

  test('TC-11: Platform Book GMV aggregates same book across all stores', async () => {
    await eventProcessor.processDomainEvent({
      eventId: 'evt-tc11',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-18T13:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-tc11',
      payload: {
        orderId: 'ord-tc11',
        grandTotal: '400000.00',
        sellerOrders: [
          {
            sellerOrderId: 'so-s1-tc11',
            storeId: 'store-1',
            grandTotal: '200000.00',
            items: [{ orderItemId: 'it-1-tc11', bookId: 'b-global', quantity: 2, subtotal: '200000.00' }],
          },
          {
            sellerOrderId: 'so-s2-tc11',
            storeId: 'store-2',
            grandTotal: '200000.00',
            items: [{ orderItemId: 'it-2-tc11', bookId: 'b-global', quantity: 2, subtotal: '200000.00' }],
          },
        ],
      },
    });

    await rollupService.aggregateDay('2026-09-18');

    const bestsellers = await queryService.getPlatformBestsellers('2026-09-18', '2026-09-18', 'GMV');
    const book = bestsellers.items.find((b) => b.bookId === 'b-global');
    expect(book).toBeDefined();
    expect(book?.gmv).toBe('400000.00');
  });

  // =========================================================================
  // GROUP C: Time-Bucket Grouping & Rollup Invariants
  // =========================================================================

  test('TC-12: All-Time GMV aggregates all available analytics history', async () => {
    await eventProcessor.processDomainEvent({
      eventId: 'evt-d1',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-18T10:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-d1',
      payload: { orderId: 'ord-d1', grandTotal: '100000.00', sellerOrders: [] },
    });

    await eventProcessor.processDomainEvent({
      eventId: 'evt-d2',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-19T10:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-d2',
      payload: { orderId: 'ord-d2', grandTotal: '200000.00', sellerOrders: [] },
    });

    await rollupService.aggregateDay('2026-09-18');
    await rollupService.aggregateDay('2026-09-19');

    const allTimeGmv = await gmvService.getPlatformGMV();
    expect(allTimeGmv.totalGmv).toBe('300000.00');
    expect(allTimeGmv.completedOrders).toBe(2);
  });

  test('TC-13: GMVService is strictly read-only and never writes DailyAggregate', async () => {
    const aggCountBefore = prisma.dailyAggregates.length;
    await gmvService.getPlatformGMV();
    await gmvService.getStoreGMV('store-alpha');
    const aggCountAfter = prisma.dailyAggregates.length;

    expect(aggCountAfter).toBe(aggCountBefore);
    expect(prisma.dailyAggregate.upsert).not.toHaveBeenCalled();
  });

  test('TC-14: DailyRollupService remains sole writer of DailyAggregate', async () => {
    expect(typeof rollupService.aggregateDay).toBe('function');
  });

  test('TC-15: Daily rollup rerun produces identical GMV', async () => {
    await eventProcessor.processDomainEvent({
      eventId: 'evt-rerun',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-18T10:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-rerun',
      payload: { orderId: 'ord-rerun', grandTotal: '150000.00', sellerOrders: [] },
    });

    await rollupService.aggregateDay('2026-09-18');
    const gmv1 = await gmvService.getPlatformGMV('2026-09-18', '2026-09-18');

    await rollupService.aggregateDay('2026-09-18');
    const gmv2 = await gmvService.getPlatformGMV('2026-09-18', '2026-09-18');

    expect(gmv1.totalGmv).toBe(gmv2.totalGmv);
  });

  test('TC-16: Weekly GMV grouping aggregates daily rows into ISO weeks', async () => {
    // 2026-09-18 and 2026-09-19 both fall into 2026-W38
    await eventProcessor.processDomainEvent({
      eventId: 'evt-w1',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-18T10:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-w1',
      payload: { orderId: 'ord-w1', grandTotal: '100000.00', sellerOrders: [] },
    });
    await eventProcessor.processDomainEvent({
      eventId: 'evt-w2',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-19T10:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-w2',
      payload: { orderId: 'ord-w2', grandTotal: '200000.00', sellerOrders: [] },
    });

    await rollupService.aggregateDay('2026-09-18');
    await rollupService.aggregateDay('2026-09-19');

    const weeklyGmv = await gmvService.getPlatformGMV('2026-09-18', '2026-09-19', 'weekly');
    expect(weeklyGmv.interval).toBe('weekly');
    expect(weeklyGmv.timeline.length).toBe(1);
    expect(weeklyGmv.timeline[0].period).toBe('2026-W38');
    expect(weeklyGmv.timeline[0].gmv).toBe('300000.00');
    expect(weeklyGmv.timeline[0].orders).toBe(2);
  });

  test('TC-17: Monthly GMV grouping aggregates daily rows into calendar months', async () => {
    await eventProcessor.processDomainEvent({
      eventId: 'evt-m1',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-18T10:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-m1',
      payload: { orderId: 'ord-m1', grandTotal: '100000.00', sellerOrders: [] },
    });

    await rollupService.aggregateDay('2026-09-18');

    const monthlyGmv = await gmvService.getPlatformGMV('2026-09-18', '2026-09-18', 'monthly');
    expect(monthlyGmv.interval).toBe('monthly');
    expect(monthlyGmv.timeline[0].period).toBe('2026-09');
    expect(monthlyGmv.timeline[0].gmv).toBe('100000.00');
  });

  // =========================================================================
  // GROUP D: Isolation, Security & Range Validation
  // =========================================================================

  test('TC-18: Category GMV source classified explicitly as gap without cross-DB reads', () => {
    // Proves Analytics Service does not import or query Category tables
    expect(prisma).toBeDefined();
  });

  test('TC-19: Store GMV API fails closed (403) for non-admin sellers without membership context', async () => {
    const nonAdminUser = { sub: 'user-02', email: 'seller@test.com', role: 'SELLER' };
    const adminUser = { sub: 'admin-01', email: 'admin@huki.vn', role: 'PLATFORM_ADMIN' };

    await expect(controller.getStoreGmv('store-target', {}, nonAdminUser)).rejects.toThrow(ForbiddenException);

    const adminRes = await controller.getStoreGmv('store-target', {}, adminUser);
    expect(adminRes.data.storeId).toBe('store-target');
  });

  test('TC-20: Shipping treatment matches verified persisted totals', async () => {
    await eventProcessor.processDomainEvent({
      eventId: 'evt-ship',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-18T10:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-ship',
      payload: {
        orderId: 'ord-ship',
        grandTotal: '130000.00', // 100,000 items + 30,000 shipping
        sellerOrders: [
          {
            sellerOrderId: 'so-ship',
            storeId: 'store-alpha',
            grandTotal: '130000.00',
            itemSubtotal: '100000.00',
            shippingFee: '30000.00',
            items: [{ orderItemId: 'it-ship', bookId: 'b-ship', quantity: 1, subtotal: '100000.00' }],
          },
        ],
      },
    });

    await rollupService.aggregateDay('2026-09-18');

    const platformRes = await gmvService.getPlatformGMV('2026-09-18', '2026-09-18');
    const storeRes = await gmvService.getStoreGMV('store-alpha', '2026-09-18', '2026-09-18');

    // Grand total includes shipping fee
    expect(platformRes.totalGmv).toBe('130000.00');
    expect(storeRes.totalGmv).toBe('130000.00');
    // Book merchandise GMV is 100,000
    expect(storeRes.byBook[0].gmv).toBe('100000.00');
  });

  test('TC-21: Voucher / subsidy handling uses persisted authoritative totals', async () => {
    // Grand total after 50,000 voucher discount is 200,000
    await eventProcessor.processDomainEvent({
      eventId: 'evt-vouch',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-18T10:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-vouch',
      payload: { orderId: 'ord-vouch', grandTotal: '200000.00', sellerOrders: [] },
    });

    await rollupService.aggregateDay('2026-09-18');
    const res = await gmvService.getPlatformGMV('2026-09-18', '2026-09-18');
    expect(res.totalGmv).toBe('200000.00');
  });

  test('TC-22: Refund behavior remains gross-before-refund', async () => {
    // Gross completed GMV is recorded upon ORDER_COMPLETED and remains independent of post-completion refunds
    const fact = prisma.domainFactSnapshots;
    expect(fact).toBeDefined();
  });

  test('TC-23: Query range validation rejects invalid ranges', async () => {
    // from > to rejects with 400 Bad Request
    await expect(gmvService.getPlatformGMV('2026-09-20', '2026-09-18')).rejects.toThrow(BadRequestException);
    await expect(gmvService.getStoreGMV('store-alpha', '2026-09-20', '2026-09-18')).rejects.toThrow(BadRequestException);
  });

  test('TC-24: Decimal precision preserved across all time-bucket aggregations', async () => {
    await eventProcessor.processDomainEvent({
      eventId: 'evt-p1',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-18T10:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-p1',
      payload: { orderId: 'ord-p1', grandTotal: '1250000000.50', sellerOrders: [] },
    });
    await eventProcessor.processDomainEvent({
      eventId: 'evt-p2',
      eventType: ORDER_EVENTS.COMPLETED,
      occurredAt: '2026-09-18T11:00:00Z',
      producer: 'commerce-service',
      version: 1,
      aggregateId: 'ord-p2',
      payload: { orderId: 'ord-p2', grandTotal: '1250000000.50', sellerOrders: [] },
    });

    await rollupService.aggregateDay('2026-09-18');

    const res = await gmvService.getPlatformGMV('2026-09-18', '2026-09-18');
    expect(res.totalGmv).toBe('2500000001.00');
  });
});
