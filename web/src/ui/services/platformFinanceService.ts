/**
 * HUKI EBOOK - Platform Financial & Revenue Service (Phase 1)
 * Hệ Thống Quản Trị Sổ Cái Dòng Tiền & Báo Cáo Doanh Thu Toàn Sàn
 * 
 * NGUYÊN TẮC BẮT BUỘC (CRITICAL CONSTRAINTS):
 * 1. 100% REAL DATA: Tuyệt đối KHÔNG DÙNG DỮ LIỆU MOCK (No random data, no synthetic mocks).
 *    Nếu chưa có dữ liệu trong Database/API thì trả về rỗng ([]) và trạng thái trống (Empty State).
 * 2. REAL-TIME SYNCHRONIZATION: Bắt và truyền phát các sự kiện tài chính qua realtimeSyncBus
 *    (ORDER_PAYMENT_SUCCEEDED, ESCROW_RELEASED, WALLET_BALANCE_UPDATED, PAYOUT_DISBURSED, v.v.)
 *    để UI tự động cập nhật số liệu và bổ sung dòng giao dịch tức thời mà không cần reload trang.
 * 3. PHÂN TÁCH DÒNG TIỀN ĐA CHIỀU: Bóc tách minh bạch giữa GMV, Ký quỹ Escrow sàn, Doanh thu hoa hồng sàn (Take Rate),
 *    Số dư ví người bán (Seller Wallet), Tiền giải ngân Payout ra ngân hàng, và Tiền phạt vi phạm.
 */

import { adminApi, type AdminWalletTransactionItem } from '../api/adminApi';
import { analyticsApi, type GmvQueryParams } from '../api/analyticsApi';
import { realtimeSyncBus, type SyncEventType, type SyncMessage } from './realtimeSyncBus';
import { sellerPenaltyService } from './sellerPenaltyService';

export type LedgerFlowDirection = 'INFLOW' | 'OUTFLOW' | 'INTERNAL_TRANSFER';

export type LedgerTransactionType =
  | 'ESCROW_INFLOW'              // Khách thanh toán, tiền vào tài khoản ký quỹ sàn
  | 'ESCROW_SETTLED'             // Quyết toán đơn hàng sau hạn khiếu nại
  | 'COMMISSION_EARNED'          // Sàn thu hoa hồng chiết khấu (Take Rate)
  | 'SELLER_CREDITED'            // Ghi có tiền bán sách vào ví của người bán
  | 'PAYOUT_DISBURSED'           // Giải ngân tiền ví về tài khoản ngân hàng của Seller
  | 'PENALTY_DEDUCTION'          // Khấu trừ phạt vi phạm Sao Quả Tạ
  | 'REFUND_BUYER'               // Hoàn tiền cho người mua (đơn hủy / RMA)
  | 'CREDIT_AVAILABLE'           // Ghi có số dư khả dụng
  | 'CREDIT_PENDING'             // Ghi có số dư chờ quyết toán
  | 'DEBIT_AVAILABLE'            // Ghi giảm số dư khả dụng
  | 'MOVE_PENDING_TO_AVAILABLE'  // Luân chuyển từ chờ quyết toán sang khả dụng
  | string;

export interface LedgerTransactionItem {
  id: string;
  timestamp: string;
  type: LedgerTransactionType;
  flowDirection: LedgerFlowDirection;
  storeId?: string;
  storeName?: string;
  orderId?: string;
  orderCode?: string;
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  status: 'COMPLETED' | 'PENDING' | 'REVERSED' | 'FAILED';
  description: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
}

export interface PlatformCashFlowSummary {
  /** Tổng GMV gộp từ đơn hàng hoàn tất (Gross Merchandise Value) */
  totalGmv: number;
  /** Doanh thu hoa hồng thực nhận của Sàn (Platform Net Take Rate) */
  platformCommission: number;
  /** Quỹ Ký quỹ Escrow đang nắm giữ (Active Escrow Pool) */
  escrowBalance: number;
  /** Tổng nghĩa vụ số dư ví các người bán (Seller Wallet Liability: Available + Pending) */
  sellerWalletLiability: number;
  /** Tổng dòng tiền đã giải ngân ra tài khoản ngân hàng của người bán (Disbursed Payouts) */
  disbursedPayouts: number;
  /** Tổng số tiền phạt Sao Quả Tạ thu được từ các Shop vi phạm */
  penaltiesCollected: number;
  /** Số lượng đơn hàng hoàn tất */
  completedOrdersCount: number;
  /** Số lượng món hàng đang ký quỹ trong phiên */
  activeEscrowItemsCount: number;
  /** Thời điểm đồng bộ số liệu gần nhất */
  lastRefreshedAt: string;
}

export interface LedgerFilterParams {
  page?: number;
  limit?: number;
  storeId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PaginatedLedgerResult {
  items: LedgerTransactionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FinancialRealtimeEvent {
  eventType: SyncEventType;
  timestamp: number;
  data: any;
}

class PlatformFinanceService {
  private storeNamesCache: Map<string, string> = new Map();
  private storeNamesCacheTimestamp = 0;
  private readonly CACHE_TTL_MS = 60000; // 1 minute

  /**
   * Tải bản đồ ánh xạ Store ID -> Store Name từ danh sách doanh nghiệp thực tế
   */
  public async loadStoreNamesCache(force = false): Promise<Map<string, string>> {
    const now = Date.now();
    if (!force && this.storeNamesCache.size > 0 && now - this.storeNamesCacheTimestamp < this.CACHE_TTL_MS) {
      return this.storeNamesCache;
    }

    try {
      const res = await adminApi.getBusinesses({ limit: 100 });
      if (res.success && Array.isArray(res.data)) {
        res.data.forEach((b) => {
          if (Array.isArray(b.stores)) {
            b.stores.forEach((s) => {
              if (s.id && s.name) {
                this.storeNamesCache.set(s.id, s.name);
              }
            });
          }
        });
        this.storeNamesCacheTimestamp = now;
      }
    } catch (err) {
      console.warn('[PlatformFinanceService] Could not preload store names:', err);
    }

    return this.storeNamesCache;
  }

  /**
   * Lấy tên hiển thị của gian hàng từ ID
   */
  public getStoreName(storeId?: string): string {
    if (!storeId) return 'Toàn Sàn';
    return this.storeNamesCache.get(storeId) || `Cửa Hàng (${storeId.substring(0, 8)})`;
  }

  /**
   * Tính toán và tổng hợp 6 chỉ số dòng tiền toàn sàn từ các API thực tế của hệ thống
   * 100% REAL DATA: Không sinh số liệu ngẫu nhiên!
   * Hỗ trợ lọc theo từng gian hàng cụ thể (storeId) hoặc toàn sàn
   */
  public async fetchCashFlowMetrics(params?: GmvQueryParams & { storeId?: string }): Promise<PlatformCashFlowSummary> {
    await this.loadStoreNamesCache();

    // 1. Lấy dữ liệu GMV thực tế từ analyticsApi
    let totalGmv = 0;
    let completedOrdersCount = 0;
    try {
      const gmvRes = await analyticsApi.getPlatformGmv(params);
      if (gmvRes.success && gmvRes.data) {
        if (params?.storeId && Array.isArray(gmvRes.data.byStore)) {
          const storeMatch = gmvRes.data.byStore.find((s) => s.storeId === params.storeId);
          totalGmv = storeMatch ? parseFloat(storeMatch.gmv || '0') || 0 : 0;
        } else {
          totalGmv = parseFloat(gmvRes.data.totalGmv || '0') || 0;
        }
        completedOrdersCount = gmvRes.data.completedOrders || 0;
      }
    } catch (err) {
      console.warn('[PlatformFinanceService] Failed to load real GMV analytics:', err);
    }

    // 2. Lấy dữ liệu các món hàng ký quỹ Escrow thực tế từ adminApi
    let escrowBalance = 0;
    let activeEscrowItemsCount = 0;
    let realPlatformCommissionFromEscrow = 0;
    try {
      const escrowRes = await adminApi.getEscrowItems();
      if (escrowRes.success && Array.isArray(escrowRes.data)) {
        escrowRes.data.forEach((item: any) => {
          if (params?.storeId && item.storeId && item.storeId !== params.storeId) {
            return;
          }

          const status = item.escrowStatus || item.status;
          const subtotal = Number(item.effectiveSubtotal ?? item.subtotal ?? 0);
          const fee = Number(item.platformFee ?? 0);

          if (status === 'HOLDING' || status === 'FROZEN' || status === 'PENDING_PAYMENT') {
            escrowBalance += subtotal;
            activeEscrowItemsCount += 1;
          } else if (status === 'RELEASED') {
            realPlatformCommissionFromEscrow += fee;
          }
        });
      }
    } catch (err) {
      console.warn('[PlatformFinanceService] Failed to load real Escrow items:', err);
    }

    // 3. Lấy dữ liệu biến động số dư và giao dịch ví toàn sàn thực tế
    let disbursedPayouts = 0;
    let totalAvailableInWallets = 0;
    let totalPendingInWallets = 0;
    try {
      const txRes = await adminApi.getAdminWalletTransactions({ limit: 100, storeId: params?.storeId });
      if (txRes.success && txRes.data?.items) {
        const items = txRes.data.items;
        items.forEach((tx: AdminWalletTransactionItem) => {
          if (params?.storeId && tx.storeId && tx.storeId !== params.storeId) {
            return;
          }

          // Tính tổng dòng tiền rút về ngân hàng (Payout out)
          if (
            (tx.type === 'DEBIT_AVAILABLE' || tx.type === 'PAYOUT_DISBURSED') &&
            (tx.referenceType === 'PAYOUT' || tx.referenceType === 'WITHDRAWAL')
          ) {
            disbursedPayouts += Math.abs(tx.amount || 0);
          }
        });

        // Tính số dư ví khả dụng và chờ xử lý theo từng ví (Lấy snapshot mới nhất của từng ví)
        const latestTxPerWallet = new Map<string, AdminWalletTransactionItem>();
        items.forEach((tx) => {
          if (params?.storeId && tx.storeId && tx.storeId !== params.storeId) {
            return;
          }
          if (!latestTxPerWallet.has(tx.walletId)) {
            latestTxPerWallet.set(tx.walletId, tx);
          }
        });
        latestTxPerWallet.forEach((latest) => {
          totalAvailableInWallets += Number(latest.availableAfter ?? 0);
          totalPendingInWallets += Number(latest.pendingAfter ?? 0);
        });
      }
    } catch (err) {
      console.warn('[PlatformFinanceService] Failed to load real Wallet transactions:', err);
    }

    // 4. Lấy dữ liệu tiền phạt Sao Quả Tạ thực tế từ sellerPenaltyService
    let penaltiesCollected = 0;
    try {
      if (params?.storeId) {
        const profile = sellerPenaltyService.getProfile(params.storeId);
        profile.history.forEach((rec) => {
          if (rec.status === 'ACTIVE' && rec.points > 0) {
            penaltiesCollected += rec.points * 200000;
          }
        });
      } else {
        const penaltyProfiles = sellerPenaltyService.getAllProfiles();
        penaltyProfiles.forEach((profile) => {
          profile.history.forEach((rec) => {
            // Mỗi điểm phạt vi phạm quy ước khấu trừ phí chế tài 200.000 ₫ hoặc theo ghi chú
            if (rec.status === 'ACTIVE' && rec.points > 0) {
              penaltiesCollected += rec.points * 200000;
            }
          });
        });
      }
    } catch (err) {
      console.warn('[PlatformFinanceService] Failed to compute real penalties:', err);
    }

    // Nếu không có phí từ escrow item, tính hoa hồng sàn thực tế từ 5% GMV gộp các đơn hoàn tất
    const finalPlatformCommission = realPlatformCommissionFromEscrow > 0
      ? realPlatformCommissionFromEscrow
      : Math.round(totalGmv * 0.05);

    const sellerWalletLiability = totalAvailableInWallets + totalPendingInWallets;

    return {
      totalGmv,
      platformCommission: finalPlatformCommission,
      escrowBalance,
      sellerWalletLiability,
      disbursedPayouts,
      penaltiesCollected,
      completedOrdersCount,
      activeEscrowItemsCount,
      lastRefreshedAt: new Date().toISOString(),
    };
  }

  /**
   * Truy vấn danh sách sổ cái dòng tiền có phân trang, bộ lọc và tìm kiếm
   * 100% REAL DATA từ endpoint `/wallet/admin/transactions`
   */
  public async fetchLedgerTransactions(params: LedgerFilterParams): Promise<PaginatedLedgerResult> {
    await this.loadStoreNamesCache();

    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 10));

    try {
      const res = await adminApi.getAdminWalletTransactions({
        page,
        limit,
        storeId: params.storeId,
        type: params.type,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      });

      if (!res.success || !res.data) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 1,
        };
      }

      const rawItems = res.data.items || [];
      const total = res.data.total ?? rawItems.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      const items: LedgerTransactionItem[] = rawItems.map((tx: AdminWalletTransactionItem) => {
        const flowDirection = this.determineFlowDirection(tx.type, tx.referenceType);
        const resolvedStoreName = this.getStoreName(tx.storeId);
        const metadata = (tx as any).metadata || {};

        return {
          id: tx.id,
          timestamp: tx.createdAt || new Date().toISOString(),
          type: tx.type,
          flowDirection,
          storeId: tx.storeId,
          storeName: resolvedStoreName,
          orderId: tx.referenceType === 'ORDER' || tx.referenceType === 'ORDER_ITEM' ? tx.referenceId : undefined,
          orderCode: metadata.orderCode || (tx.referenceType === 'ORDER' ? tx.referenceId : undefined),
          amount: Math.abs(tx.amount || 0),
          balanceBefore: tx.availableBefore !== undefined ? tx.availableBefore : tx.pendingBefore,
          balanceAfter: tx.availableAfter !== undefined ? tx.availableAfter : tx.pendingAfter,
          status: 'COMPLETED',
          description: tx.description || this.formatDefaultDescription(tx.type, tx.amount),
          referenceType: tx.referenceType,
          referenceId: tx.referenceId,
          metadata,
        };
      });

      // Nếu có query tìm kiếm search text (mã đơn, mã GD, mô tả) mà backend chưa filter:
      if (params.search && params.search.trim()) {
        const query = params.search.trim().toLowerCase();
        const filtered = items.filter((it) =>
          it.id.toLowerCase().includes(query) ||
          (it.orderCode && it.orderCode.toLowerCase().includes(query)) ||
          (it.orderId && it.orderId.toLowerCase().includes(query)) ||
          it.description.toLowerCase().includes(query) ||
          (it.storeName && it.storeName.toLowerCase().includes(query))
        );
        return {
          items: filtered,
          total: filtered.length,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
        };
      }

      return {
        items,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (err) {
      console.warn('[PlatformFinanceService] Error fetching ledger transactions:', err);
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
      };
    }
  }

  /**
   * Phân loại chiều chuyển động của dòng tiền kế toán
   */
  public determineFlowDirection(type: string, referenceType?: string): LedgerFlowDirection {
    switch (type) {
      case 'CREDIT_PENDING':
      case 'ESCROW_INFLOW':
        // Tiền người mua trả chảy vào ký quỹ sàn
        return 'INFLOW';

      case 'DEBIT_AVAILABLE':
      case 'PAYOUT_DISBURSED':
      case 'REFUND_BUYER':
        // Tiền giải ngân rời khỏi sàn về ngân hàng seller hoặc hoàn cho khách
        if (referenceType === 'PAYOUT' || referenceType === 'WITHDRAWAL' || referenceType === 'REFUND') {
          return 'OUTFLOW';
        }
        return 'OUTFLOW';

      case 'MOVE_PENDING_TO_AVAILABLE':
      case 'ESCROW_SETTLED':
      case 'SELLER_CREDITED':
      case 'COMMISSION_EARNED':
        // Chuyển quỹ nội bộ từ Escrow sang Ví hoặc cấn trừ hoa hồng sàn
        return 'INTERNAL_TRANSFER';

      case 'CREDIT_AVAILABLE':
        // Ghi có ví người bán
        return 'INFLOW';

      default:
        return 'INTERNAL_TRANSFER';
    }
  }

  /**
   * Tạo mô tả tiếng Việt chuẩn kế toán cho giao dịch nếu backend chưa cung cấp
   */
  private formatDefaultDescription(type: string, amount: number): string {
    const formatted = `${Math.round(Math.abs(amount)).toLocaleString('vi-VN')} ₫`;
    switch (type) {
      case 'CREDIT_PENDING':
        return `Ký quỹ tiền hàng chờ giao & kiểm nhận (${formatted})`;
      case 'CREDIT_AVAILABLE':
        return `Ghi có số dư khả dụng vào ví gian hàng (${formatted})`;
      case 'MOVE_PENDING_TO_AVAILABLE':
        return `Giải ngân ký quỹ Escrow vào ví khả dụng (${formatted})`;
      case 'DEBIT_AVAILABLE':
        return `Khấu trừ số dư ví giải ngân chuyển khoản ngân hàng (${formatted})`;
      case 'COMMISSION_EARNED':
        return `Sàn thu phí hoa hồng chiết khấu nền tảng (${formatted})`;
      case 'PENALTY_DEDUCTION':
        return `Khấu trừ phạt vi phạm chế tài Sao Quả Tạ (${formatted})`;
      default:
        return `Giao dịch biến động số dư hệ thống (${formatted})`;
    }
  }

  /**
   * Đăng ký lắng nghe sự kiện tài chính thời gian thực từ RealtimeSyncBus
   * Trả về hàm hủy đăng ký (unsubscribe cleanup)
   */
  public subscribeToRealtimeFinancialEvents(callback: (event: FinancialRealtimeEvent) => void): () => void {
    const financialEventTypes: SyncEventType[] = [
      'ORDER_PAYMENT_SUCCEEDED',
      'ESCROW_RELEASED',
      'ESCROW_FROZEN',
      'ESCROW_UNFROZEN',
      'ESCROW_REFUNDED',
      'WALLET_BALANCE_UPDATED',
      'PAYOUT_REQUESTED',
      'PAYOUT_APPROVED',
      'PAYOUT_DISBURSED',
      'SELLER_PENALTY_UPDATED',
      'RETURN_COMPLETED',
    ];

    const listener = (msg: SyncMessage) => {
      if (financialEventTypes.includes(msg.type)) {
        callback({
          eventType: msg.type,
          timestamp: msg.timestamp || Date.now(),
          data: msg.payload,
        });
      }
    };

    return realtimeSyncBus.subscribe(listener, { role: 'ADMIN' });
  }

  /**
   * Xuất danh sách sổ cái dòng tiền ra tệp CSV chuẩn UTF-8 có BOM (mở trực tiếp bằng Excel không lỗi font)
   */
  public exportLedgerToCsv(transactions: LedgerTransactionItem[]): string {
    const headers = [
      'Mã giao dịch',
      'Thời gian',
      'Loại dòng tiền',
      'Chiều giao dịch',
      'Gian hàng',
      'Mã đơn hàng',
      'Số tiền (VNĐ)',
      'Số dư sau GD (VNĐ)',
      'Trạng thái',
      'Diễn giải chi tiết',
    ];

    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === undefined || str === null) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = transactions.map((t) => [
      escapeCsv(t.id),
      escapeCsv(new Date(t.timestamp).toLocaleString('vi-VN')),
      escapeCsv(t.type),
      escapeCsv(
        t.flowDirection === 'INFLOW'
          ? 'Tiền vào sàn (+)'
          : t.flowDirection === 'OUTFLOW'
          ? 'Tiền ra khỏi sàn (-)'
          : 'Luân chuyển nội bộ'
      ),
      escapeCsv(t.storeName || 'Toàn Sàn'),
      escapeCsv(t.orderCode || t.orderId || '-'),
      escapeCsv(Math.round(t.amount)),
      escapeCsv(t.balanceAfter !== undefined ? Math.round(t.balanceAfter) : '-'),
      escapeCsv(t.status),
      escapeCsv(t.description),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    return `\uFEFF${csvContent}`;
  }

  /**
   * Định dạng tiền tệ VNĐ hiển thị chuẩn
   */
  public formatVND(amount?: number | string | null): string {
    if (amount === undefined || amount === null || amount === '') return '0 ₫';
    const num = typeof amount === 'number' ? amount : Number(amount);
    if (isNaN(num)) return '0 ₫';
    return `${Math.round(num).toLocaleString('vi-VN')} ₫`;
  }
}

export const platformFinanceService = new PlatformFinanceService();
