import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AggregateScope, Prisma } from '../../prisma/generated/client';

export interface BestsellerItem {
  bookId: string;
  metricValue: string;
  units: number;
  gmv: string;
}

@Injectable()
export class AnalyticsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDateRange(from?: string, to?: string): { fromDate?: Date; toDate?: Date } {
    if (from && to && from > to) {
      throw new BadRequestException(`Invalid date range: 'from' (${from}) must be less than or equal to 'to' (${to})`);
    }

    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (from) {
      const [y, m, d] = from.split('-').map(Number);
      fromDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    }

    if (to) {
      const [y, m, d] = to.split('-').map(Number);
      toDate = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
    }

    return { fromDate, toDate };
  }

  /**
   * Platform Analytics Summary (Admin)
   */
  async getPlatformSummary(from?: string, to?: string) {
    const { fromDate, toDate } = this.parseDateRange(from, to);

    const where: Prisma.DailyAggregateWhereInput = {
      scope: AggregateScope.PLATFORM,
      dimensionKey: 'PLATFORM',
    };

    if (fromDate || toDate) {
      where.businessDate = {};
      if (fromDate) where.businessDate.gte = fromDate;
      if (toDate) where.businessDate.lte = toDate;
    }

    const aggregates = await this.prisma.dailyAggregate.findMany({
      where,
    });

    const summary: Record<string, string> = {
      PLATFORM_GMV: '0.00',
      COMPLETED_ORDER_COUNT: '0',
      PAID_ORDER_COUNT: '0',
      UNITS_SOLD: '0',
      PLATFORM_COMMISSION: '0.00',
      PLATFORM_SUBSIDY: '0.00',
      PAGE_VIEW_COUNT: '0',
      PRODUCT_VIEW_COUNT: '0',
      ADD_TO_CART_COUNT: '0',
      SEARCH_QUERY_COUNT: '0',
    };

    const decimalSums = new Map<string, Prisma.Decimal>();

    for (const agg of aggregates) {
      const current = decimalSums.get(agg.metricName) || new Prisma.Decimal(0);
      decimalSums.set(agg.metricName, current.add(agg.metricValue));
    }

    for (const [metric, val] of decimalSums.entries()) {
      if (metric.endsWith('_COUNT') || metric === 'UNITS_SOLD') {
        summary[metric] = val.toString();
      } else {
        summary[metric] = val.toFixed(2);
      }
    }

    return {
      scope: 'PLATFORM',
      from: from || null,
      to: to || null,
      metrics: summary,
    };
  }

  /**
   * Platform Daily Metrics Time Series
   */
  async getPlatformDaily(from?: string, to?: string, metricName?: string) {
    const { fromDate, toDate } = this.parseDateRange(from, to);

    const where: Prisma.DailyAggregateWhereInput = {
      scope: AggregateScope.PLATFORM,
      dimensionKey: 'PLATFORM',
    };

    if (metricName) {
      where.metricName = metricName;
    }

    if (fromDate || toDate) {
      where.businessDate = {};
      if (fromDate) where.businessDate.gte = fromDate;
      if (toDate) where.businessDate.lte = toDate;
    }

    const aggregates = await this.prisma.dailyAggregate.findMany({
      where,
      orderBy: [{ businessDate: 'asc' }, { metricName: 'asc' }],
    });

    return {
      scope: 'PLATFORM',
      from: from || null,
      to: to || null,
      metric: metricName || 'ALL',
      data: aggregates.map((a) => ({
        date: a.businessDate.toISOString().split('T')[0],
        metric: a.metricName,
        value: a.metricValue.toString(),
        dimensions: a.dimensions,
      })),
    };
  }

  /**
   * Platform Bestseller Rankings
   */
  async getPlatformBestsellers(
    from?: string,
    to?: string,
    by: 'UNITS' | 'GMV' = 'UNITS',
    limit: number = 10,
  ): Promise<{ scope: string; from: string | null; to: string | null; by: string; items: BestsellerItem[] }> {
    const { fromDate, toDate } = this.parseDateRange(from, to);

    const targetMetric = by === 'GMV' ? 'BOOK_GMV' : 'UNITS_SOLD';

    const where: Prisma.DailyAggregateWhereInput = {
      scope: AggregateScope.BOOK,
      metricName: targetMetric,
      dimensionKey: { startsWith: 'BOOK:PLATFORM:' },
    };

    if (fromDate || toDate) {
      where.businessDate = {};
      if (fromDate) where.businessDate.gte = fromDate;
      if (toDate) where.businessDate.lte = toDate;
    }

    const aggregates = await this.prisma.dailyAggregate.findMany({
      where,
    });

    // Group by bookId
    const bookMap = new Map<string, { totalMetric: Prisma.Decimal; totalUnits: number; totalGmv: Prisma.Decimal }>();

    for (const agg of aggregates) {
      if (!agg.bookId) continue;
      const current = bookMap.get(agg.bookId) || {
        totalMetric: new Prisma.Decimal(0),
        totalUnits: 0,
        totalGmv: new Prisma.Decimal(0),
      };

      current.totalMetric = current.totalMetric.add(agg.metricValue);
      if (by === 'UNITS') {
        current.totalUnits += Number(agg.metricValue);
        if (agg.dimensions && (agg.dimensions as any).gmv) {
          current.totalGmv = current.totalGmv.add(new Prisma.Decimal((agg.dimensions as any).gmv));
        }
      } else {
        current.totalGmv = current.totalGmv.add(agg.metricValue);
        if (agg.dimensions && (agg.dimensions as any).units) {
          current.totalUnits += Number((agg.dimensions as any).units);
        }
      }

      bookMap.set(agg.bookId, current);
    }

    // Sort with deterministic tie-breaking: metric DESC, bookId ASC
    const sorted = Array.from(bookMap.entries()).sort((a, b) => {
      const diff = b[1].totalMetric.comparedTo(a[1].totalMetric);
      if (diff !== 0) return diff;
      return a[0].localeCompare(b[0]);
    });

    const items: BestsellerItem[] = sorted.slice(0, limit).map(([bookId, data]) => ({
      bookId,
      metricValue: data.totalMetric.toString(),
      units: data.totalUnits,
      gmv: data.totalGmv.toFixed(2),
    }));

    return {
      scope: 'PLATFORM',
      from: from || null,
      to: to || null,
      by,
      items,
    };
  }

  /**
   * Store Analytics Summary (Store Owner / Seller)
   */
  async getStoreSummary(storeId: string, from?: string, to?: string) {
    const { fromDate, toDate } = this.parseDateRange(from, to);

    const where: Prisma.DailyAggregateWhereInput = {
      scope: AggregateScope.STORE,
      storeId,
      dimensionKey: `STORE:${storeId}`,
    };

    if (fromDate || toDate) {
      where.businessDate = {};
      if (fromDate) where.businessDate.gte = fromDate;
      if (toDate) where.businessDate.lte = toDate;
    }

    const aggregates = await this.prisma.dailyAggregate.findMany({
      where,
    });

    const summary: Record<string, string> = {
      STORE_GMV: '0.00',
      COMPLETED_ORDER_COUNT: '0',
      UNITS_SOLD: '0',
      SELLER_NET: '0.00',
      PLATFORM_COMMISSION: '0.00',
    };

    const decimalSums = new Map<string, Prisma.Decimal>();

    for (const agg of aggregates) {
      const current = decimalSums.get(agg.metricName) || new Prisma.Decimal(0);
      decimalSums.set(agg.metricName, current.add(agg.metricValue));
    }

    for (const [metric, val] of decimalSums.entries()) {
      if (metric === 'COMPLETED_ORDER_COUNT' || metric === 'UNITS_SOLD') {
        summary[metric] = val.toString();
      } else {
        summary[metric] = val.toFixed(2);
      }
    }

    return {
      scope: 'STORE',
      storeId,
      from: from || null,
      to: to || null,
      metrics: summary,
    };
  }

  /**
   * Store Daily Metrics Time Series
   */
  async getStoreDaily(storeId: string, from?: string, to?: string, metricName?: string) {
    const { fromDate, toDate } = this.parseDateRange(from, to);

    const where: Prisma.DailyAggregateWhereInput = {
      scope: AggregateScope.STORE,
      storeId,
      dimensionKey: `STORE:${storeId}`,
    };

    if (metricName) {
      where.metricName = metricName;
    }

    if (fromDate || toDate) {
      where.businessDate = {};
      if (fromDate) where.businessDate.gte = fromDate;
      if (toDate) where.businessDate.lte = toDate;
    }

    const aggregates = await this.prisma.dailyAggregate.findMany({
      where,
      orderBy: [{ businessDate: 'asc' }, { metricName: 'asc' }],
    });

    return {
      scope: 'STORE',
      storeId,
      from: from || null,
      to: to || null,
      metric: metricName || 'ALL',
      data: aggregates.map((a) => ({
        date: a.businessDate.toISOString().split('T')[0],
        metric: a.metricName,
        value: a.metricValue.toString(),
        dimensions: a.dimensions,
      })),
    };
  }

  /**
   * Store Bestseller Rankings
   */
  async getStoreBestsellers(
    storeId: string,
    from?: string,
    to?: string,
    by: 'UNITS' | 'GMV' = 'UNITS',
    limit: number = 10,
  ): Promise<{ scope: string; storeId: string; from: string | null; to: string | null; by: string; items: BestsellerItem[] }> {
    const { fromDate, toDate } = this.parseDateRange(from, to);

    const targetMetric = by === 'GMV' ? 'BOOK_GMV' : 'UNITS_SOLD';

    const where: Prisma.DailyAggregateWhereInput = {
      scope: AggregateScope.BOOK,
      storeId,
      metricName: targetMetric,
      dimensionKey: { startsWith: `BOOK:STORE:${storeId}:` },
    };

    if (fromDate || toDate) {
      where.businessDate = {};
      if (fromDate) where.businessDate.gte = fromDate;
      if (toDate) where.businessDate.lte = toDate;
    }

    const aggregates = await this.prisma.dailyAggregate.findMany({
      where,
    });

    const bookMap = new Map<string, { totalMetric: Prisma.Decimal; totalUnits: number; totalGmv: Prisma.Decimal }>();

    for (const agg of aggregates) {
      if (!agg.bookId) continue;
      const current = bookMap.get(agg.bookId) || {
        totalMetric: new Prisma.Decimal(0),
        totalUnits: 0,
        totalGmv: new Prisma.Decimal(0),
      };

      current.totalMetric = current.totalMetric.add(agg.metricValue);
      if (by === 'UNITS') {
        current.totalUnits += Number(agg.metricValue);
        if (agg.dimensions && (agg.dimensions as any).gmv) {
          current.totalGmv = current.totalGmv.add(new Prisma.Decimal((agg.dimensions as any).gmv));
        }
      } else {
        current.totalGmv = current.totalGmv.add(agg.metricValue);
        if (agg.dimensions && (agg.dimensions as any).units) {
          current.totalUnits += Number((agg.dimensions as any).units);
        }
      }

      bookMap.set(agg.bookId, current);
    }

    const sorted = Array.from(bookMap.entries()).sort((a, b) => {
      const diff = b[1].totalMetric.comparedTo(a[1].totalMetric);
      if (diff !== 0) return diff;
      return a[0].localeCompare(b[0]);
    });

    const items: BestsellerItem[] = sorted.slice(0, limit).map(([bookId, data]) => ({
      bookId,
      metricValue: data.totalMetric.toString(),
      units: data.totalUnits,
      gmv: data.totalGmv.toFixed(2),
    }));

    return {
      scope: 'STORE',
      storeId,
      from: from || null,
      to: to || null,
      by,
      items,
    };
  }
}
