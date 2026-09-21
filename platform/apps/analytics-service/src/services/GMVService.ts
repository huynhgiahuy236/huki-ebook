import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AggregateScope, Prisma } from '../../prisma/generated/client';

export interface PlatformGmvTimelineItem {
  period: string;
  gmv: string;
  orders: number;
}

export interface StoreGmvTimelineItem {
  period: string;
  gmv: string;
}

export interface PlatformGmvByStoreItem {
  storeId: string;
  gmv: string;
}

export interface StoreGmvByBookItem {
  bookId: string;
  gmv: string;
  units: number;
}

export interface PlatformGmvResponse {
  totalGmv: string;
  completedOrders: number;
  from: string | null;
  to: string | null;
  interval: 'daily' | 'weekly' | 'monthly';
  timeline: PlatformGmvTimelineItem[];
  byStore: PlatformGmvByStoreItem[];
}

export interface StoreGmvResponse {
  storeId: string;
  totalGmv: string;
  from: string | null;
  to: string | null;
  interval: 'daily' | 'weekly' | 'monthly';
  timeline: StoreGmvTimelineItem[];
  byBook: StoreGmvByBookItem[];
}

@Injectable()
export class GMVService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: Parse and validate date range (from <= to)
   */
  private parseDateRange(from?: string, to?: string): { fromDate?: Date; toDate?: Date } {
    if (from && to && from > to) {
      throw new BadRequestException(`Invalid date range: 'from' (${from}) must be less than or equal to 'to' (${to})`);
    }

    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (from) {
      const parts = from.split('-').map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) {
        throw new BadRequestException(`Invalid date format for 'from': expected YYYY-MM-DD`);
      }
      fromDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0));
    }

    if (to) {
      const parts = to.split('-').map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) {
        throw new BadRequestException(`Invalid date format for 'to': expected YYYY-MM-DD`);
      }
      toDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999));
    }

    return { fromDate, toDate };
  }

  /**
   * Helper: Format Date object to ISO week string YYYY-Www
   */
  private getIsoWeek(date: Date): string {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    const paddedWeek = weekNo < 10 ? `0${weekNo}` : `${weekNo}`;
    return `${d.getUTCFullYear()}-W${paddedWeek}`;
  }

  /**
   * Helper: Format Date object to calendar month string YYYY-MM
   */
  private getMonth(date: Date): string {
    const month = date.getUTCMonth() + 1;
    const paddedMonth = month < 10 ? `0${month}` : `${month}`;
    return `${date.getUTCFullYear()}-${paddedMonth}`;
  }

  /**
   * Helper: Format Date object to daily string YYYY-MM-DD
   */
  private getDay(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Platform GMV Overview (Admin)
   * Strictly reads from DailyAggregate for scope = PLATFORM and scope = STORE
   */
  async getPlatformGMV(
    from?: string,
    to?: string,
    interval: 'daily' | 'weekly' | 'monthly' = 'daily',
  ): Promise<PlatformGmvResponse> {
    const { fromDate, toDate } = this.parseDateRange(from, to);

    // 1. Query platform-level daily aggregates
    const platformWhere: Prisma.DailyAggregateWhereInput = {
      scope: AggregateScope.PLATFORM,
      dimensionKey: 'PLATFORM',
      metricName: { in: ['PLATFORM_GMV', 'COMPLETED_ORDER_COUNT'] },
    };

    if (fromDate || toDate) {
      platformWhere.businessDate = {};
      if (fromDate) platformWhere.businessDate.gte = fromDate;
      if (toDate) platformWhere.businessDate.lte = toDate;
    }

    const platformAggregates = await this.prisma.dailyAggregate.findMany({
      where: platformWhere,
      orderBy: [{ businessDate: 'asc' }, { metricName: 'asc' }],
    });

    let totalGmvDecimal = new Prisma.Decimal(0);
    let totalCompletedOrders = 0;

    // Timeline grouping map: period -> { gmv: Decimal, orders: number }
    const timelineMap = new Map<string, { gmv: Prisma.Decimal; orders: number }>();

    for (const agg of platformAggregates) {
      let period: string;
      if (interval === 'weekly') {
        period = this.getIsoWeek(agg.businessDate);
      } else if (interval === 'monthly') {
        period = this.getMonth(agg.businessDate);
      } else {
        period = this.getDay(agg.businessDate);
      }

      const current = timelineMap.get(period) || {
        gmv: new Prisma.Decimal(0),
        orders: 0,
      };

      if (agg.metricName === 'PLATFORM_GMV') {
        totalGmvDecimal = totalGmvDecimal.add(agg.metricValue);
        current.gmv = current.gmv.add(agg.metricValue);
      } else if (agg.metricName === 'COMPLETED_ORDER_COUNT') {
        const orderCount = Number(agg.metricValue);
        totalCompletedOrders += orderCount;
        current.orders += orderCount;
      }

      timelineMap.set(period, current);
    }

    const timeline: PlatformGmvTimelineItem[] = Array.from(timelineMap.entries()).map(([period, data]) => ({
      period,
      gmv: data.gmv.toFixed(2),
      orders: data.orders,
    }));

    // 2. Query store-level GMV breakdown (scope = STORE)
    const storeWhere: Prisma.DailyAggregateWhereInput = {
      scope: AggregateScope.STORE,
      metricName: 'STORE_GMV',
    };

    if (fromDate || toDate) {
      storeWhere.businessDate = {};
      if (fromDate) storeWhere.businessDate.gte = fromDate;
      if (toDate) storeWhere.businessDate.lte = toDate;
    }

    const storeAggregates = await this.prisma.dailyAggregate.findMany({
      where: storeWhere,
    });

    const storeMap = new Map<string, Prisma.Decimal>();
    for (const agg of storeAggregates) {
      if (!agg.storeId) continue;
      const current = storeMap.get(agg.storeId) || new Prisma.Decimal(0);
      storeMap.set(agg.storeId, current.add(agg.metricValue));
    }

    // Sort by store GMV desc
    const sortedStores = Array.from(storeMap.entries()).sort((a, b) => {
      const diff = b[1].comparedTo(a[1]);
      if (diff !== 0) return diff;
      return a[0].localeCompare(b[0]);
    });

    const byStore: PlatformGmvByStoreItem[] = sortedStores.map(([storeId, gmvDecimal]) => ({
      storeId,
      gmv: gmvDecimal.toFixed(2),
    }));

    return {
      totalGmv: totalGmvDecimal.toFixed(2),
      completedOrders: totalCompletedOrders,
      from: from || null,
      to: to || null,
      interval,
      timeline,
      byStore,
    };
  }

  /**
   * Store GMV Overview (Store Owner / Seller / Admin)
   * Strictly reads from DailyAggregate for scope = STORE and scope = BOOK
   */
  async getStoreGMV(
    storeId: string,
    from?: string,
    to?: string,
    interval: 'daily' | 'weekly' | 'monthly' = 'daily',
  ): Promise<StoreGmvResponse> {
    const { fromDate, toDate } = this.parseDateRange(from, to);

    // 1. Query store-level daily aggregates for target store
    const storeWhere: Prisma.DailyAggregateWhereInput = {
      scope: AggregateScope.STORE,
      storeId,
      dimensionKey: `STORE:${storeId}`,
      metricName: 'STORE_GMV',
    };

    if (fromDate || toDate) {
      storeWhere.businessDate = {};
      if (fromDate) storeWhere.businessDate.gte = fromDate;
      if (toDate) storeWhere.businessDate.lte = toDate;
    }

    const storeAggregates = await this.prisma.dailyAggregate.findMany({
      where: storeWhere,
      orderBy: [{ businessDate: 'asc' }],
    });

    let totalGmvDecimal = new Prisma.Decimal(0);
    const timelineMap = new Map<string, Prisma.Decimal>();

    for (const agg of storeAggregates) {
      let period: string;
      if (interval === 'weekly') {
        period = this.getIsoWeek(agg.businessDate);
      } else if (interval === 'monthly') {
        period = this.getMonth(agg.businessDate);
      } else {
        period = this.getDay(agg.businessDate);
      }

      totalGmvDecimal = totalGmvDecimal.add(agg.metricValue);
      const current = timelineMap.get(period) || new Prisma.Decimal(0);
      timelineMap.set(period, current.add(agg.metricValue));
    }

    const timeline: StoreGmvTimelineItem[] = Array.from(timelineMap.entries()).map(([period, gmvDecimal]) => ({
      period,
      gmv: gmvDecimal.toFixed(2),
    }));

    // 2. Query store book-level aggregates (scope = BOOK, storeId = targetStoreId)
    const bookWhere: Prisma.DailyAggregateWhereInput = {
      scope: AggregateScope.BOOK,
      storeId,
      metricName: 'BOOK_GMV',
      dimensionKey: { startsWith: `BOOK:STORE:${storeId}:` },
    };

    if (fromDate || toDate) {
      bookWhere.businessDate = {};
      if (fromDate) bookWhere.businessDate.gte = fromDate;
      if (toDate) bookWhere.businessDate.lte = toDate;
    }

    const bookAggregates = await this.prisma.dailyAggregate.findMany({
      where: bookWhere,
    });

    const bookMap = new Map<string, { gmv: Prisma.Decimal; units: number }>();

    for (const agg of bookAggregates) {
      if (!agg.bookId) continue;
      const current = bookMap.get(agg.bookId) || {
        gmv: new Prisma.Decimal(0),
        units: 0,
      };

      current.gmv = current.gmv.add(agg.metricValue);
      if (agg.dimensions && (agg.dimensions as any).units) {
        current.units += Number((agg.dimensions as any).units);
      }

      bookMap.set(agg.bookId, current);
    }

    const sortedBooks = Array.from(bookMap.entries()).sort((a, b) => {
      const diff = b[1].gmv.comparedTo(a[1].gmv);
      if (diff !== 0) return diff;
      return a[0].localeCompare(b[0]);
    });

    const byBook: StoreGmvByBookItem[] = sortedBooks.map(([bookId, data]) => ({
      bookId,
      gmv: data.gmv.toFixed(2),
      units: data.units,
    }));

    return {
      storeId,
      totalGmv: totalGmvDecimal.toFixed(2),
      from: from || null,
      to: to || null,
      interval,
      timeline,
      byBook,
    };
  }
}
