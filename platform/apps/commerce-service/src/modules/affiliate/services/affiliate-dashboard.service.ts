import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AffiliateCommissionStatus } from '../../../../prisma/generated/client';
import { resolveStoreAndBusinessIds } from '../../../common/seller-scope.util';

export interface CtvDashboardStatsDto {
  profile: {
    id: string;
    affiliateCode: string;
    displayName: string;
    status: string;
  };
  metrics: {
    clicksCount: number;
    conversionsCount: number;
    conversionRate: number; // percentage e.g. 3.45%
    pendingCommission: number;
    holdingCommission: number;
    availableCommission: number;
    netAvailableCommission: number;
    debtCommission: number;
    lifetimePaid: number;
    reversedCommission: number;
    currency: string;
  };
  recentCommissions: Array<{
    id: string;
    orderId: string;
    orderItemId: string;
    bookTitle: string;
    commissionAmount: number;
    commissionRate: number;
    status: string;
    holdingUntil: Date | null;
    createdAt: Date;
  }>;
  topLinks: Array<{
    id: string;
    shortCode: string;
    targetType: string;
    clickCount: number;
    conversionCount: number;
    createdAt: Date;
  }>;
  version: string;
  refreshedAt: string;
}

export interface SellerDashboardStatsDto {
  storeId: string;
  metrics: {
    totalAttributedOrders: number;
    totalAttributedRevenue: number;
    totalCommissionCost: number;
    pendingCommissionCost: number;
    settledCommissionCost: number;
    currency: string;
  };
  topBooks: Array<{
    bookId: string;
    bookTitle: string;
    coverUrl?: string | null;
    format?: string;
    price?: number;
    ordersCount: number;
    revenue: number;
    commissionCost: number;
  }>;
  version: string;
  refreshedAt: string;
}

export interface AdminDashboardStatsDto {
  partners: {
    total: number;
    active: number;
    pendingReview: number;
    suspended: number;
    rejected: number;
  };
  financials: {
    totalAttributedRevenue: number;
    totalCommissionsPaid: number;
    totalCommissionsAvailable: number;
    totalCommissionsHolding: number;
    totalCommissionsPending: number;
    totalCommissionsReversed: number;
    currency: string;
  };
  traffic: {
    totalClicks: number;
    totalConversions: number;
    averageConversionRate: number;
  };
  version: string;
  refreshedAt: string;
}

@Injectable()
export class AffiliateDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Get CTV Dashboard Statistics
   */
  async getCtvDashboardStats(userId: string): Promise<CtvDashboardStatsDto> {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { userId },
      include: {
        wallet: true,
        links: {
          orderBy: { clickCount: 'desc' },
          take: 5,
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Affiliate profile not found for user ${userId}`);
    }

    const profileId = profile.id;
    const wallet = profile.wallet;

    // Aggregate links click & conversion counts
    const linkAgg = await this.prisma.affiliateLink.aggregate({
      where: { profileId },
      _sum: {
        clickCount: true,
        conversionCount: true,
      },
    });

    const clicksCount = linkAgg._sum.clickCount || 0;
    const conversionsCount = linkAgg._sum.conversionCount || 0;
    const conversionRate = clicksCount > 0 ? Number(((conversionsCount / clicksCount) * 100).toFixed(2)) : 0;

    // Aggregate commissions
    const [pendingAgg, holdingAgg, reversedAgg] = await Promise.all([
      this.prisma.affiliateCommission.aggregate({
        where: { profileId, status: AffiliateCommissionStatus.PENDING },
        _sum: { commissionAmount: true },
      }),
      this.prisma.affiliateCommission.aggregate({
        where: { profileId, status: AffiliateCommissionStatus.HOLDING },
        _sum: { commissionAmount: true },
      }),
      this.prisma.affiliateCommission.aggregate({
        where: { profileId, status: AffiliateCommissionStatus.REVERSED },
        _sum: { commissionAmount: true },
      }),
    ]);

    const pendingCommission = Number(pendingAgg._sum.commissionAmount || 0);
    const holdingCommission = Number(holdingAgg._sum.commissionAmount || 0);
    const reversedCommission = Number(reversedAgg._sum.commissionAmount || 0);

    const availableBalance = wallet ? Number(wallet.availableBalance) : 0;
    const netAvailableCommission = Math.max(0, availableBalance);
    const debtCommission = availableBalance < 0 ? Math.abs(availableBalance) : 0;
    const lifetimePaid = wallet ? Number(wallet.lifetimePaid) : 0;

    // Fetch top 10 recent commissions
    const recentCommissionsRaw = await this.prisma.affiliateCommission.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const recentCommissions = recentCommissionsRaw.map((c) => ({
      id: c.id,
      orderId: c.orderId,
      orderItemId: c.orderItemId,
      bookTitle: c.bookTitle || 'Sách',
      commissionAmount: Number(c.commissionAmount),
      commissionRate: Number(c.commissionRate),
      status: c.status,
      holdingUntil: c.holdingUntil,
      createdAt: c.createdAt,
    }));

    const topLinks = profile.links.map((link) => ({
      id: link.id,
      shortCode: link.shortCode,
      targetType: link.targetType,
      clickCount: link.clickCount,
      conversionCount: link.conversionCount,
      createdAt: link.createdAt,
    }));

    const now = new Date().toISOString();

    return {
      profile: {
        id: profile.id,
        affiliateCode: profile.affiliateCode,
        displayName: profile.displayName,
        status: profile.status,
      },
      metrics: {
        clicksCount,
        conversionsCount,
        conversionRate,
        pendingCommission,
        holdingCommission,
        availableCommission: availableBalance,
        netAvailableCommission,
        debtCommission,
        lifetimePaid,
        reversedCommission,
        currency: 'VND',
      },
      recentCommissions,
      topLinks,
      version: now,
      refreshedAt: now,
    };
  }

  /**
   * 2. Get Seller Dashboard Statistics
   */
  async getSellerDashboardStats(storeId: string): Promise<SellerDashboardStatsDto> {
    const storeAndBizIds = await resolveStoreAndBusinessIds(storeId);
    const commissions = await this.prisma.affiliateCommission.findMany({
      where: { storeId: { in: storeAndBizIds } },
    });

    const uniqueOrders = new Set<string>();
    let totalAttributedRevenue = 0;
    let totalCommissionCost = 0;
    let pendingCommissionCost = 0;
    let settledCommissionCost = 0;

    const bookMap = new Map<string, { title: string; orders: Set<string>; revenue: number; cost: number }>();

    for (const comm of commissions) {
      uniqueOrders.add(comm.orderId);
      const amount = Number(comm.commissionAmount);
      const itemRev = Number(comm.itemPrice) * (comm.quantity || 1);

      totalAttributedRevenue += itemRev;
      totalCommissionCost += amount;

      if (
        comm.status === AffiliateCommissionStatus.PENDING ||
        comm.status === AffiliateCommissionStatus.HOLDING
      ) {
        pendingCommissionCost += amount;
      } else if (comm.status === AffiliateCommissionStatus.AVAILABLE) {
        settledCommissionCost += amount;
      }

      if (comm.bookId) {
        const bId = comm.bookId;
        const existing = bookMap.get(bId) || {
          title: comm.bookTitle || 'Sách',
          orders: new Set<string>(),
          revenue: 0,
          cost: 0,
        };
        existing.orders.add(comm.orderId);
        existing.revenue += itemRev;
        existing.cost += amount;
        bookMap.set(bId, existing);
      }
    }

    const bookIds = Array.from(bookMap.keys());
    const booksDetail = bookIds.length > 0 ? await this.prisma.book.findMany({
      where: { id: { in: bookIds } },
      select: { id: true, title: true, coverUrl: true, format: true, price: true },
    }) : [];
    const bookDetailMap = new Map(booksDetail.map(b => [b.id, b]));

    const topBooks = Array.from(bookMap.entries())
      .map(([bookId, data]) => {
        const detail = bookDetailMap.get(bookId);
        return {
          bookId,
          bookTitle: detail?.title || data.title,
          coverUrl: detail?.coverUrl || null,
          format: detail?.format || 'PHYSICAL',
          price: detail?.price ? Number(detail.price) : 0,
          ordersCount: data.orders.size,
          revenue: data.revenue,
          commissionCost: data.cost,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 50);

    const now = new Date().toISOString();

    return {
      storeId,
      metrics: {
        totalAttributedOrders: uniqueOrders.size,
        totalAttributedRevenue,
        totalCommissionCost,
        pendingCommissionCost,
        settledCommissionCost,
        currency: 'VND',
      },
      topBooks,
      version: now,
      refreshedAt: now,
    };
  }

  /**
   * 3. Get Platform Admin Dashboard Statistics
   */
  async getAdminDashboardStats(): Promise<AdminDashboardStatsDto> {
    const [profiles, walletAgg, linkAgg, commissionAggs] = await Promise.all([
      this.prisma.affiliateProfile.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.affiliateWallet.aggregate({
        _sum: {
          availableBalance: true,
          holdingBalance: true,
          pendingBalance: true,
          lifetimePaid: true,
        },
      }),
      this.prisma.affiliateLink.aggregate({
        _sum: {
          clickCount: true,
          conversionCount: true,
        },
      }),
      this.prisma.affiliateCommission.aggregate({
        _sum: {
          commissionAmount: true,
        },
      }),
    ]);

    const partnerCounts: Record<string, number> = {};
    let totalPartners = 0;
    for (const p of profiles) {
      partnerCounts[p.status] = p._count.id;
      totalPartners += p._count.id;
    }

    const totalClicks = linkAgg._sum.clickCount || 0;
    const totalConversions = linkAgg._sum.conversionCount || 0;
    const averageConversionRate = totalClicks > 0 ? Number(((totalConversions / totalClicks) * 100).toFixed(2)) : 0;

    const now = new Date().toISOString();

    return {
      partners: {
        total: totalPartners,
        active: partnerCounts['ACTIVE'] || 0,
        pendingReview: partnerCounts['PENDING_REVIEW'] || 0,
        suspended: partnerCounts['SUSPENDED'] || 0,
        rejected: partnerCounts['REJECTED'] || 0,
      },
      financials: {
        totalAttributedRevenue: Number(commissionAggs._sum.commissionAmount || 0) * 10, // Approx base
        totalCommissionsPaid: Number(walletAgg._sum.lifetimePaid || 0),
        totalCommissionsAvailable: Number(walletAgg._sum.availableBalance || 0),
        totalCommissionsHolding: Number(walletAgg._sum.holdingBalance || 0),
        totalCommissionsPending: Number(walletAgg._sum.pendingBalance || 0),
        totalCommissionsReversed: 0,
        currency: 'VND',
      },
      traffic: {
        totalClicks,
        totalConversions,
        averageConversionRate,
      },
      version: now,
      refreshedAt: now,
    };
  }

  /**
   * 4. Export Report (CSV / Excel format)
   * Returns UTF-8 BOM CSV content compatible with Excel and Google Sheets
   */
  async exportReport(
    scope: 'CTV' | 'SELLER' | 'ADMIN',
    identifier: string,
    format: 'csv' | 'xlsx' = 'csv',
    fromDate?: string,
    toDate?: string,
  ): Promise<{ filename: string; contentType: string; content: string }> {
    const where: any = {};

    if (scope === 'CTV') {
      const profile = await this.prisma.affiliateProfile.findUnique({
        where: { userId: identifier },
      });
      if (!profile) throw new NotFoundException('Profile not found');
      where.profileId = profile.id;
    } else if (scope === 'SELLER') {
      const storeAndBizIds = await resolveStoreAndBusinessIds(identifier);
      where.storeId = { in: storeAndBizIds };
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const commissions = await this.prisma.affiliateCommission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const escapeCsv = (str: any) => {
      const val = str !== null && str !== undefined ? String(str) : '';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const header = [
      'Mã Hoa Hồng',
      'Thời Gian',
      'Mã Đơn Hàng',
      'Tên Sách',
      'Đơn Giá (VNĐ)',
      'Số Lượng',
      'Tỷ Lệ (%)',
      'Tiền Hoa Hồng (VNĐ)',
      'Trạng Thái',
      'Hạn Đối Soát',
    ].join(',');

    const rows = commissions.map((c) => {
      const title = c.bookTitle || 'Sách';
      const price = c.itemPrice ? Number(c.itemPrice) : 0;
      const qty = c.quantity || 1;
      const holdUntil = c.holdingUntil ? new Date(c.holdingUntil).toLocaleDateString('vi-VN') : '';
      const createdDate = new Date(c.createdAt).toLocaleDateString('vi-VN');

      return [
        escapeCsv(c.id),
        escapeCsv(createdDate),
        escapeCsv(c.orderId),
        escapeCsv(title),
        escapeCsv(price),
        escapeCsv(qty),
        escapeCsv(Number(c.commissionRate)),
        escapeCsv(Number(c.commissionAmount)),
        escapeCsv(c.status),
        escapeCsv(holdUntil),
      ].join(',');
    });

    // Add UTF-8 BOM for Microsoft Excel proper Vietnamese accent rendering
    const content = '\uFEFF' + [header, ...rows].join('\r\n');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `huki-affiliate-${scope.toLowerCase()}-${timestamp}.${format === 'xlsx' ? 'csv' : 'csv'}`;

    return {
      filename,
      contentType: 'text/csv; charset=utf-8',
      content,
    };
  }
}
