import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, AggregateScope } from '../../prisma/generated/client';

export interface RollupResult {
  date: string;
  aggregatesUpdated: number;
  scopes: {
    platform: number;
    store: number;
    book: number;
  };
}

@Injectable()
export class DailyRollupService {
  private readonly logger = new Logger(DailyRollupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Parse a date string YYYY-MM-DD into start and end Date objects in ICT timezone (Asia/Ho_Chi_Minh = UTC+7)
   */
  private getDateWindow(dateStr: string): { start: Date; end: Date; businessDate: Date } {
    // ICT is UTC+7
    const [year, month, day] = dateStr.split('-').map(Number);
    const start = new Date(Date.UTC(year, month - 1, day, 0 - 7, 0, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, day, 23 - 7, 59, 59, 999));
    const businessDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    return { start, end, businessDate };
  }

  /**
   * Recompute daily aggregates for a specific business date
   */
  async aggregateDay(dateStr: string): Promise<RollupResult> {
    const { start, end, businessDate } = this.getDateWindow(dateStr);

    let platformCount = 0;
    let storeCount = 0;
    let bookCount = 0;

    // ==========================================
    // 1. TELEMETRY ROLLUP (from analytics_events)
    // ==========================================
    const telemetryEvents = await this.prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      where: {
        createdAt: { gte: start, lte: end },
      },
      _count: { id: true },
    });

    for (const group of telemetryEvents) {
      const metricName = `${group.eventType}_COUNT`;
      const metricValue = new Prisma.Decimal(group._count.id);

      await this.prisma.dailyAggregate.upsert({
        where: {
          unique_daily_aggregate_grain: {
            businessDate,
            metricName,
            scope: AggregateScope.PLATFORM,
            dimensionKey: 'PLATFORM',
          },
        },
        create: {
          businessDate,
          metricName,
          scope: AggregateScope.PLATFORM,
          dimensionKey: 'PLATFORM',
          metricValue,
          dimensions: { count: group._count.id },
        },
        update: {
          metricValue,
          dimensions: { count: group._count.id },
          updatedAt: new Date(),
        },
      });
      platformCount++;
    }

    // ==========================================
    // 2. BUSINESS DOMAIN FACTS ROLLUP
    // ==========================================
    const facts = await this.prisma.domainFactSnapshot.findMany({
      where: {
        occurredAt: { gte: start, lte: end },
      },
    });

    // 2.1 PLATFORM GRAIN AGGREGATION
    const platformFactsByType = new Map<string, { totalAmount: Prisma.Decimal; totalQty: number; count: number }>();
    for (const f of facts) {
      const current = platformFactsByType.get(f.factType) || {
        totalAmount: new Prisma.Decimal(0),
        totalQty: 0,
        count: 0,
      };
      current.totalAmount = current.totalAmount.add(f.amount);
      current.totalQty += f.quantity;
      current.count += 1;
      platformFactsByType.set(f.factType, current);
    }

    for (const [factType, data] of platformFactsByType.entries()) {
      let metricValue = data.totalAmount;
      if (factType === 'UNITS_SOLD') {
        metricValue = new Prisma.Decimal(data.totalQty);
      } else if (factType === 'COMPLETED_ORDER_COUNT' || factType === 'PAID_ORDER_COUNT') {
        metricValue = new Prisma.Decimal(data.count);
      }

      await this.prisma.dailyAggregate.upsert({
        where: {
          unique_daily_aggregate_grain: {
            businessDate,
            metricName: factType,
            scope: AggregateScope.PLATFORM,
            dimensionKey: 'PLATFORM',
          },
        },
        create: {
          businessDate,
          metricName: factType,
          scope: AggregateScope.PLATFORM,
          dimensionKey: 'PLATFORM',
          metricValue,
          dimensions: { amount: data.totalAmount.toString(), count: data.count, quantity: data.totalQty },
        },
        update: {
          metricValue,
          dimensions: { amount: data.totalAmount.toString(), count: data.count, quantity: data.totalQty },
          updatedAt: new Date(),
        },
      });
      platformCount++;
    }

    // 2.2 STORE GRAIN AGGREGATION
    const storeFacts = facts.filter((f) => !!f.storeId);
    const storeMap = new Map<string, Map<string, { totalAmount: Prisma.Decimal; totalQty: number; count: number }>>();

    for (const f of storeFacts) {
      const storeId = f.storeId!;
      let typeMap = storeMap.get(storeId);
      if (!typeMap) {
        typeMap = new Map();
        storeMap.set(storeId, typeMap);
      }
      const current = typeMap.get(f.factType) || {
        totalAmount: new Prisma.Decimal(0),
        totalQty: 0,
        count: 0,
      };
      current.totalAmount = current.totalAmount.add(f.amount);
      current.totalQty += f.quantity;
      current.count += 1;
      typeMap.set(f.factType, current);
    }

    for (const [storeId, typeMap] of storeMap.entries()) {
      const dimensionKey = `STORE:${storeId}`;
      for (const [factType, data] of typeMap.entries()) {
        let metricValue = data.totalAmount;
        if (factType === 'UNITS_SOLD') {
          metricValue = new Prisma.Decimal(data.totalQty);
        } else if (factType === 'COMPLETED_ORDER_COUNT' || factType === 'PAID_ORDER_COUNT') {
          metricValue = new Prisma.Decimal(data.count);
        }

        await this.prisma.dailyAggregate.upsert({
          where: {
            unique_daily_aggregate_grain: {
              businessDate,
              metricName: factType,
              scope: AggregateScope.STORE,
              dimensionKey,
            },
          },
          create: {
            businessDate,
            metricName: factType,
            scope: AggregateScope.STORE,
            dimensionKey,
            storeId,
            metricValue,
            dimensions: { amount: data.totalAmount.toString(), count: data.count, quantity: data.totalQty },
          },
          update: {
            metricValue,
            dimensions: { amount: data.totalAmount.toString(), count: data.count, quantity: data.totalQty },
            updatedAt: new Date(),
          },
        });
        storeCount++;
      }
    }

    // 2.3 BOOK GRAIN AGGREGATION (Store Book & Platform Book)
    const bookFacts = facts.filter((f) => !!f.bookId);

    // Store Book Grain
    const storeBookMap = new Map<string, { storeId: string; bookId: string; totalAmount: Prisma.Decimal; totalQty: number }>();
    for (const f of bookFacts) {
      if (f.storeId && f.factType === 'STORE_BOOK_GMV') {
        const key = `${f.storeId}:${f.bookId}`;
        const current = storeBookMap.get(key) || {
          storeId: f.storeId,
          bookId: f.bookId!,
          totalAmount: new Prisma.Decimal(0),
          totalQty: 0,
        };
        current.totalAmount = current.totalAmount.add(f.amount);
        current.totalQty += f.quantity;
        storeBookMap.set(key, current);
      }
    }

    for (const [key, data] of storeBookMap.entries()) {
      const dimensionKey = `BOOK:STORE:${data.storeId}:${data.bookId}`;
      // Store Book GMV
      await this.prisma.dailyAggregate.upsert({
        where: {
          unique_daily_aggregate_grain: {
            businessDate,
            metricName: 'BOOK_GMV',
            scope: AggregateScope.BOOK,
            dimensionKey,
          },
        },
        create: {
          businessDate,
          metricName: 'BOOK_GMV',
          scope: AggregateScope.BOOK,
          dimensionKey,
          storeId: data.storeId,
          bookId: data.bookId,
          metricValue: data.totalAmount,
          dimensions: { units: data.totalQty },
        },
        update: {
          metricValue: data.totalAmount,
          dimensions: { units: data.totalQty },
          updatedAt: new Date(),
        },
      });
      bookCount++;

      // Store Book Units Sold
      await this.prisma.dailyAggregate.upsert({
        where: {
          unique_daily_aggregate_grain: {
            businessDate,
            metricName: 'UNITS_SOLD',
            scope: AggregateScope.BOOK,
            dimensionKey,
          },
        },
        create: {
          businessDate,
          metricName: 'UNITS_SOLD',
          scope: AggregateScope.BOOK,
          dimensionKey,
          storeId: data.storeId,
          bookId: data.bookId,
          metricValue: new Prisma.Decimal(data.totalQty),
          dimensions: { gmv: data.totalAmount.toString() },
        },
        update: {
          metricValue: new Prisma.Decimal(data.totalQty),
          dimensions: { gmv: data.totalAmount.toString() },
          updatedAt: new Date(),
        },
      });
      bookCount++;
    }

    // Platform Book Grain (Platform-wide)
    const platformBookMap = new Map<string, { bookId: string; totalAmount: Prisma.Decimal; totalQty: number }>();
    for (const f of bookFacts) {
      if (f.factType === 'PLATFORM_BOOK_GMV') {
        const bookId = f.bookId!;
        const current = platformBookMap.get(bookId) || {
          bookId,
          totalAmount: new Prisma.Decimal(0),
          totalQty: 0,
        };
        current.totalAmount = current.totalAmount.add(f.amount);
        current.totalQty += f.quantity;
        platformBookMap.set(bookId, current);
      }
    }

    for (const [bookId, data] of platformBookMap.entries()) {
      const dimensionKey = `BOOK:PLATFORM:${bookId}`;
      // Platform Book GMV
      await this.prisma.dailyAggregate.upsert({
        where: {
          unique_daily_aggregate_grain: {
            businessDate,
            metricName: 'BOOK_GMV',
            scope: AggregateScope.BOOK,
            dimensionKey,
          },
        },
        create: {
          businessDate,
          metricName: 'BOOK_GMV',
          scope: AggregateScope.BOOK,
          dimensionKey,
          bookId,
          metricValue: data.totalAmount,
          dimensions: { units: data.totalQty },
        },
        update: {
          metricValue: data.totalAmount,
          dimensions: { units: data.totalQty },
          updatedAt: new Date(),
        },
      });
      bookCount++;

      // Platform Book Units Sold
      await this.prisma.dailyAggregate.upsert({
        where: {
          unique_daily_aggregate_grain: {
            businessDate,
            metricName: 'UNITS_SOLD',
            scope: AggregateScope.BOOK,
            dimensionKey,
          },
        },
        create: {
          businessDate,
          metricName: 'UNITS_SOLD',
          scope: AggregateScope.BOOK,
          dimensionKey,
          bookId,
          metricValue: new Prisma.Decimal(data.totalQty),
          dimensions: { gmv: data.totalAmount.toString() },
        },
        update: {
          metricValue: new Prisma.Decimal(data.totalQty),
          dimensions: { gmv: data.totalAmount.toString() },
          updatedAt: new Date(),
        },
      });
      bookCount++;
    }

    this.logger.log(`Daily rollup completed for ${dateStr}: Platform=${platformCount}, Store=${storeCount}, Book=${bookCount}`);

    return {
      date: dateStr,
      aggregatesUpdated: platformCount + storeCount + bookCount,
      scopes: {
        platform: platformCount,
        store: storeCount,
        book: bookCount,
      },
    };
  }
}
