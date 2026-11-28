/**
 * HUKI EBOOK - Seller Penalty Points Engine (Hệ Thống Sao Quả Tạ & Sức Khỏe Gian Hàng)
 * Phase 1: Data Model, Tier Calculator, Flash Sale Eligibility Guard & Realtime Sync
 * Chuẩn Shopee Seller Penalty Points System
 */

import { realtimeSyncBus } from './realtimeSyncBus';
import { tokenStorage } from '../api/tokenStorage';

export type ViolationType =
  | 'NON_FULFILLMENT'       // Tỷ lệ hủy đơn cao do lỗi người bán (+1 hoặc +2 điểm)
  | 'LATE_SHIPMENT'         // Tỷ lệ giao hàng trễ cho Shipper > 24h (+1 điểm)
  | 'COPYRIGHT_VIOLATION'   // Vi phạm bản quyền, bán sách scan lậu (+3 điểm)
  | 'PROMOTION_FRAUD'       // Gian lận khuyến mãi, cướp slot Flash Sale, đơn ảo (+4 điểm)
  | 'COMMUNICATION_ABUSE';  // Ngôn từ khiếm nhã với khách hàng (+2 điểm)

export type PenaltyTier =
  | 'TIER_0_GOOD'               // 0 - 1 điểm: Rất tốt, đủ điều kiện Flash Sale Sàn 100%
  | 'TIER_1_WARNING'            // 2 điểm: Cảnh báo, giới hạn tối đa 3 sách / Slot Sàn
  | 'TIER_2_BLOCKED_FLASH_SALE' // 3 - 5 điểm: Chế tài Cấp 1: CẤM Flash Sale Sàn 28 ngày
  | 'TIER_3_SEARCH_DEBOOST'     // 6 - 8 điểm: Chế tài Cấp 2: Cấm Flash Sale Sàn + Giảm hiển thị tìm kiếm
  | 'TIER_4_FROZEN';            // >= 9 điểm: Chế tài Cấp 3: Tạm khóa gian hàng

export interface PenaltyRecord {
  id: string;
  storeId: string;
  violationType: ViolationType;
  violationName: string;
  code?: string;
  points: number;
  reason: string;
  evidenceNotes?: string;
  relatedOrderId?: string;
  relatedBookTitle?: string;
  status?: 'ACTIVE' | 'RESOLVED';
  createdAt: string;
  expiresAt: string;
  isAppealed?: boolean;
  canAppeal?: boolean;
  appealStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  appealReason?: string;
  appealProof?: string;
  appealAdminNote?: string;
  appealReviewedAt?: string;
}

export interface EligibilityChecklistItem {
  id: string;
  title: string;
  requirement: string;
  benchmark?: string;
  currentValue: string;
  isPassed: boolean;
  passed?: boolean;
  icon: string;
  description: string;
}

export const PENALTY_TIER_CONFIG: Record<PenaltyTier, { name: string; points: string; color: string; description: string }> = {
  TIER_0_GOOD: {
    name: 'Hạng Tốt',
    points: '0-1 điểm',
    color: 'emerald',
    description: 'Gian hàng tuân thủ quy chuẩn chất lượng, đủ điều kiện tham gia Flash Sale của Sàn.',
  },
  TIER_1_WARNING: {
    name: 'Cảnh Báo Nhẹ',
    points: '2 điểm',
    color: 'amber',
    description: 'Gian hàng có vi phạm nhỏ. Giới hạn tối đa 3 cuốn sách cho mỗi slot Flash Sale Sàn.',
  },
  TIER_2_BLOCKED_FLASH_SALE: {
    name: 'Khóa Flash Sale Sàn',
    points: '3-5 điểm',
    color: 'rose',
    description: 'Bị tước quyền đăng ký Flash Sale của Sàn trong 28 ngày do điểm Sao Quả Tạ đạt từ 3 điểm.',
  },
  TIER_3_SEARCH_DEBOOST: {
    name: 'Giảm Hiển Thị',
    points: '6-8 điểm',
    color: 'purple',
    description: 'Tước quyền Flash Sale Sàn và giảm độ ưu tiên hiển thị trên trang tìm kiếm.',
  },
  TIER_4_FROZEN: {
    name: 'Đóng Băng',
    points: '≥9 điểm',
    color: 'slate',
    description: 'Gian hàng vi phạm nghiêm trọng quy chuẩn sàn, tạm dừng giao dịch.',
  },
};

export interface StorePenaltyProfile {
  storeId: string;
  storeName?: string;
  totalPoints: number;
  penaltyPoints: number;
  tier: PenaltyTier;
  tierLabel: string;
  tierDescription: string;
  badgeColor: string; // 'emerald' | 'amber' | 'rose' | 'purple' | 'slate'
  canJoinPlatformFlashSale: boolean;
  maxBooksPerPlatformSlot: number; // 20 nếu Tier 0, 3 nếu Tier 1, 0 nếu Tier 2+
  activeSanctionMessage?: string;
  sanctionExpiresAt?: string;
  quarterlyResetDate: string;
  metrics: {
    nonFulfillmentRate: number; // % hủy đơn, e.g. 1.2
    lateShipmentRate: number;   // % giao trễ, e.g. 2.1
    responseRate: number;       // % phản hồi chat, e.g. 95
    rating: number;             // Đánh giá sao shop, e.g. 4.8
  };
  history: PenaltyRecord[];
  violationHistory: PenaltyRecord[];
  quarterCycle: string; // e.g. 'Q4-2026'
  checklist: EligibilityChecklistItem[];
}

const STORAGE_KEY = 'huki_seller_penalty_profiles_v1';

// Zero hardcoded mock stores — hydrated dynamically from real DB stores
const DEFAULT_SEED_PROFILES: Record<string, StorePenaltyProfile> = {};

/**
 * Tính toán Hạng chế tài và Quyền lợi dựa trên số điểm Sao Quả Tạ
 */
export function calculatePenaltyTier(points: number): {
  tier: PenaltyTier;
  tierLabel: string;
  tierDescription: string;
  badgeColor: string;
  canJoinPlatformFlashSale: boolean;
  maxBooksPerPlatformSlot: number;
  sanctionMessage?: string;
} {
  if (points <= 1) {
    return {
      tier: 'TIER_0_GOOD',
      tierLabel: 'Hạng Tốt (Uy Tín)',
      tierDescription: 'Gian hàng có chỉ số vận hành xuất sắc. Được quyền đăng ký mọi slot Flash Sale của Sàn.',
      badgeColor: 'emerald',
      canJoinPlatformFlashSale: true,
      maxBooksPerPlatformSlot: 20,
    };
  }

  if (points === 2) {
    return {
      tier: 'TIER_1_WARNING',
      tierLabel: 'Cảnh Báo Nhẹ (2 điểm)',
      tierDescription: 'Gian hàng có vi phạm nhỏ. Giới hạn tối đa 3 cuốn sách cho mỗi slot Flash Sale Sàn.',
      badgeColor: 'amber',
      canJoinPlatformFlashSale: true,
      maxBooksPerPlatformSlot: 3,
      sanctionMessage: 'Hạn chế số lượng: Tối đa 3 sách / slot Flash Sale của Sàn.',
    };
  }

  if (points >= 3 && points <= 5) {
    return {
      tier: 'TIER_2_BLOCKED_FLASH_SALE',
      tierLabel: 'Chế Tài Cấp 1 (3-5 điểm)',
      tierDescription: 'Bị tước quyền đăng ký Flash Sale của Sàn trong 28 ngày do chỉ số hủy đơn/giao trễ cao.',
      badgeColor: 'rose',
      canJoinPlatformFlashSale: false,
      maxBooksPerPlatformSlot: 0,
      sanctionMessage: 'BỊ KHÓA QUYỀN THAM GIA FLASH SALE SÀN TRONG 28 NGÀY. (Vẫn được tạo Flash Sale riêng của Shop).',
    };
  }

  if (points >= 6 && points <= 8) {
    return {
      tier: 'TIER_3_SEARCH_DEBOOST',
      tierLabel: 'Chế Tài Cấp 2 (6-8 điểm)',
      tierDescription: 'Tước quyền Flash Sale Sàn và giảm độ ưu tiên hiển thị trên trang tìm kiếm.',
      badgeColor: 'purple',
      canJoinPlatformFlashSale: false,
      maxBooksPerPlatformSlot: 0,
      sanctionMessage: 'CẤM FLASH SALE SÀN & GIẢM HIỂN THỊ TÌM KIẾM.',
    };
  }

  return {
    tier: 'TIER_4_FROZEN',
    tierLabel: 'Chế Tài Cấp 3 (≥9 điểm)',
    tierDescription: 'Gian hàng vi phạm nghiêm trọng quy chuẩn sàn, tạm dừng giao dịch.',
    badgeColor: 'slate',
    canJoinPlatformFlashSale: false,
    maxBooksPerPlatformSlot: 0,
    sanctionMessage: 'TẠM KHÓA GIAN HÀNG & ĐÓNG BĂNG RÚT TIỀN.',
  };
}

/**
 * Xây dựng danh sách Checklist điều kiện tham gia Flash Sale Sàn
 */
export function buildEligibilityChecklist(profile: {
  points: number;
  metrics: { nonFulfillmentRate: number; lateShipmentRate: number; responseRate: number; rating: number };
}): EligibilityChecklistItem[] {
  const p0 = profile.points < 3;
  const p1 = profile.metrics.rating >= 4.0;
  const p2 = profile.metrics.nonFulfillmentRate < 5.0;
  const p3 = profile.metrics.lateShipmentRate < 10.0;
  const p4 = profile.metrics.responseRate >= 70;

  return [
    {
      id: 'PENALTY_POINTS',
      title: 'Điểm Sao Quả Tạ',
      requirement: '< 3 điểm vi phạm',
      benchmark: '< 3 điểm',
      currentValue: `${profile.points} điểm`,
      isPassed: p0,
      passed: p0,
      icon: 'stars',
      description: 'Số điểm phạt phát sinh từ việc hủy đơn, giao trễ hoặc vi phạm tiêu chuẩn cộng đồng.',
    },
    {
      id: 'STORE_RATING',
      title: 'Đánh Giá Gian Hàng',
      requirement: '≥ 4.0 / 5.0 sao',
      benchmark: '≥ 4.0 ★',
      currentValue: `${profile.metrics.rating.toFixed(1)} ★`,
      isPassed: p1,
      passed: p1,
      icon: 'hotel_class',
      description: 'Mức độ hài lòng của độc giả sau khi nhận sách từ gian hàng.',
    },
    {
      id: 'NON_FULFILLMENT',
      title: 'Tỷ Lệ Hủy Đơn Hàng (NFR)',
      requirement: '< 5.0%',
      benchmark: '< 5.0%',
      currentValue: `${profile.metrics.nonFulfillmentRate.toFixed(1)}%`,
      isPassed: p2,
      passed: p2,
      icon: 'cancel_schedule_send',
      description: 'Tỷ lệ đơn hàng bị người bán tự ý hủy hoặc Shipper báo không có hàng giao.',
    },
    {
      id: 'LATE_SHIPMENT',
      title: 'Tỷ Lệ Giao Trễ Hạn (LSR)',
      requirement: '< 10.0%',
      benchmark: '< 10.0%',
      currentValue: `${profile.metrics.lateShipmentRate.toFixed(1)}%`,
      isPassed: p3,
      passed: p3,
      icon: 'schedule',
      description: 'Tỷ lệ đơn hàng không bàn giao cho Shipper trong vòng 24h kể từ khi có đơn.',
    },
    {
      id: 'RESPONSE_RATE',
      title: 'Tỷ Lệ Phản Hồi Chat',
      requirement: '≥ 70%',
      benchmark: '≥ 70%',
      currentValue: `${profile.metrics.responseRate}%`,
      isPassed: p4,
      passed: p4,
      icon: 'chat',
      description: 'Tỷ lệ trả lời tin nhắn thắc mắc của độc giả trong vòng 12h.',
    },
  ];
}

/**
 * Kiểm định sách tham gia Flash Sale chống giá ảo (30-day anti fake discount)
 */
export function validateBookForFlashSale(
  originalPrice: number,
  salePrice: number,
  lowestPrice30Days?: number,
  requiredDiscountPercent = 10
): {
  isValid: boolean;
  reason?: string;
  maxAllowedSalePrice: number;
} {
  if (originalPrice <= 0) {
    return { isValid: false, reason: 'Giá niêm yết của sách phải lớn hơn 0', maxAllowedSalePrice: 0 };
  }
  if (salePrice <= 0) {
    return { isValid: false, reason: 'Giá Flash Sale phải lớn hơn 0', maxAllowedSalePrice: 0 };
  }
  if (salePrice >= originalPrice) {
    return { isValid: false, reason: 'Giá Flash Sale phải thấp hơn giá niêm yết', maxAllowedSalePrice: originalPrice - 1 };
  }

  // 1. Giá trần tính theo tỷ lệ giảm giá yêu cầu từ giá gốc (ví dụ: giảm tối thiểu 30% thì salePrice <= orig * 0.7)
  const maxByOriginal = Math.round(originalPrice * (1 - requiredDiscountPercent / 100));

  // 2. Chống giá ảo (Anti-Fake Discount): Giá Flash Sale không được cao hơn giá bán thấp nhất trong 30 ngày qua (nếu có khuyến mãi trước đó)
  const maxAllowed = lowestPrice30Days && lowestPrice30Days > 0 && lowestPrice30Days < originalPrice
    ? Math.min(maxByOriginal, lowestPrice30Days)
    : maxByOriginal;

  if (salePrice > maxAllowed) {
    return {
      isValid: false,
      reason: `Chống giá ảo (Quy chế 30 ngày): Giá Flash Sale (${salePrice.toLocaleString('vi-VN')} đ) phải thấp hơn hoặc bằng ${maxAllowed.toLocaleString('vi-VN')} đ (đảm bảo giảm ít nhất ${requiredDiscountPercent}% so với giá gốc ${originalPrice.toLocaleString('vi-VN')} đ)`,
      maxAllowedSalePrice: maxAllowed,
    };
  }

  return {
    isValid: true,
    maxAllowedSalePrice: maxAllowed,
  };
}

class SellerPenaltyService {
  private profiles: Record<string, StorePenaltyProfile> = {};
  private isSyncing = false;

  constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined') {
      this.syncFromServer();
      window.addEventListener('focus', () => this.syncFromServer());
    }
  }

  public registerRealStores(stores: Array<{ id: string; name: string }>): void {
    const legacyMockKeys = ['default-store', 'store-youth', 'store-saigon', 'store-hanoi'];
    let changed = false;
    for (const k of legacyMockKeys) {
      if (this.profiles[k]) {
        delete this.profiles[k];
        changed = true;
      }
    }
    for (const st of stores) {
      if (!st.id) continue;
      if (!this.profiles[st.id]) {
        const tierInfo = calculatePenaltyTier(0);
        this.profiles[st.id] = {
          storeId: st.id,
          storeName: st.name || `Gian Hàng ${st.id.slice(0, 8)}`,
          totalPoints: 0,
          penaltyPoints: 0,
          tier: tierInfo.tier,
          tierLabel: tierInfo.tierLabel,
          tierDescription: tierInfo.tierDescription,
          badgeColor: tierInfo.badgeColor,
          canJoinPlatformFlashSale: tierInfo.canJoinPlatformFlashSale,
          maxBooksPerPlatformSlot: tierInfo.maxBooksPerPlatformSlot,
          quarterlyResetDate: '2027-01-01',
          metrics: {
            nonFulfillmentRate: 0,
            lateShipmentRate: 0,
            responseRate: 100,
            rating: 5.0,
          },
          history: [],
          violationHistory: [],
          quarterCycle: 'Q4-2026',
          checklist: [],
        };
        changed = true;
      } else if (st.name && this.profiles[st.id].storeName !== st.name) {
        this.profiles[st.id].storeName = st.name;
        changed = true;
      }
    }
    if (changed && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profiles));
      } catch {}
    }
  }

  public async syncFromServer(): Promise<void> {
    if (typeof window === 'undefined' || this.isSyncing) return;
    this.isSyncing = true;
    try {
      const token = tokenStorage.getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/v1/seller/penalties', { headers, cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && typeof json.data === 'object') {
          this.profiles = { ...DEFAULT_SEED_PROFILES, ...json.data };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profiles));
          } catch { }
        }
      }
    } catch {
      // offline fallback
    } finally {
      this.isSyncing = false;
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') {
      this.profiles = { ...DEFAULT_SEED_PROFILES };
      return;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.profiles = JSON.parse(raw);
        Object.keys(DEFAULT_SEED_PROFILES).forEach((key) => {
          if (!this.profiles[key]) {
            this.profiles[key] = DEFAULT_SEED_PROFILES[key];
          }
        });
      } else {
        this.profiles = { ...DEFAULT_SEED_PROFILES };
      }
    } catch {
      this.profiles = { ...DEFAULT_SEED_PROFILES };
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profiles));
    } catch { }

    // Persist to server if running in real browser with origin
    if (typeof window !== 'undefined' && window.location?.origin && window.location.origin.startsWith('http')) {
      const token = tokenStorage.getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      fetch('/api/v1/seller/penalties', {
        method: 'POST',
        headers,
        body: JSON.stringify({ profiles: this.profiles }),
      }).catch(() => { });
    }
  }

  /**
   * Lấy hồ sơ Sức khỏe & Sao Quả Tạ của Gian hàng
   */
  public getProfile(storeId?: string | null): StorePenaltyProfile {
    const sId = storeId || 'default-store';
    let profile = this.profiles[sId];

    if (!profile) {
      profile = {
        storeId: sId,
        storeName: 'Gian Hàng Người Bán',
        totalPoints: 0,
        penaltyPoints: 0,
        tier: 'TIER_0_GOOD',
        tierLabel: '🟢 Hạng Tốt (Uy Tín)',
        tierDescription: 'Gian hàng tuân thủ quy chuẩn chất lượng, đủ điều kiện tham gia Flash Sale của Sàn.',
        badgeColor: 'emerald',
        canJoinPlatformFlashSale: true,
        maxBooksPerPlatformSlot: 20,
        quarterlyResetDate: '2027-01-01',
        metrics: {
          nonFulfillmentRate: 1.0,
          lateShipmentRate: 2.0,
          responseRate: 94,
          rating: 4.8,
        },
        history: [],
        violationHistory: [],
        quarterCycle: 'Q4-2026',
        checklist: [],
      };
      this.profiles[sId] = profile;
      this.saveToStorage();
    }

    // Refresh dynamically
    const tierInfo = calculatePenaltyTier(profile.totalPoints);
    const checklist = buildEligibilityChecklist({
      points: profile.totalPoints,
      metrics: profile.metrics,
    });

    profile.tier = tierInfo.tier;
    profile.tierLabel = tierInfo.tierLabel;
    profile.tierDescription = tierInfo.tierDescription;
    profile.badgeColor = tierInfo.badgeColor;
    profile.canJoinPlatformFlashSale = tierInfo.canJoinPlatformFlashSale && checklist.every((c) => c.isPassed);
    profile.maxBooksPerPlatformSlot = tierInfo.maxBooksPerPlatformSlot;
    profile.activeSanctionMessage = tierInfo.sanctionMessage;
    profile.checklist = checklist;
    profile.penaltyPoints = profile.totalPoints;
    profile.violationHistory = profile.history;
    profile.quarterlyResetDate = profile.quarterlyResetDate || '2027-01-01';

    return profile;
  }

  /**
   * Kiểm tra nhanh xem Gian hàng có đủ điều kiện tham gia Flash Sale của Sàn hay không
   */
  public canJoinPlatformFlashSale(storeId?: string | null): {
    eligible: boolean;
    reason?: string;
    points: number;
    tier: PenaltyTier;
  } {
    const profile = this.getProfile(storeId);
    if (!profile.canJoinPlatformFlashSale) {
      const failed = profile.checklist.filter((c) => !c.isPassed).map((c) => `${c.title} (${c.currentValue})`);
      return {
        eligible: false,
        reason: profile.activeSanctionMessage || `Chưa đạt tiêu chuẩn: ${failed.join(', ')}`,
        points: profile.totalPoints,
        tier: profile.tier,
      };
    }

    return {
      eligible: true,
      points: profile.totalPoints,
      tier: profile.tier,
    };
  }

  /**
   * Xây dựng danh sách kiểm tra điều kiện tham gia Flash Sale Sàn
   */
  public buildEligibilityChecklist(storeId?: string | null): {
    isEligible: boolean;
    points: number;
    tier: PenaltyTier;
    maxBooksPerSlot: number;
    items: EligibilityChecklistItem[];
  } {
    const profile = this.getProfile(storeId);
    return {
      isEligible: profile.canJoinPlatformFlashSale,
      points: profile.totalPoints,
      tier: profile.tier,
      maxBooksPerSlot: profile.maxBooksPerPlatformSlot,
      items: profile.checklist,
    };
  }

  /**
   * Kiểm định sách tham gia Flash Sale chống giá ảo (30-day anti fake discount)
   */
  public validateBookForFlashSale(
    originalPrice: number,
    salePrice: number,
    lowestPrice30Days?: number,
    requiredDiscountPercent = 10
  ): {
    isValid: boolean;
    reason?: string;
    maxAllowedSalePrice: number;
  } {
    return validateBookForFlashSale(originalPrice, salePrice, lowestPrice30Days, requiredDiscountPercent);
  }

  /**
   * Áp dụng vi phạm (alias tiện ích cho simulator và nghiệp vụ)
   */
  public applyViolation(
    storeId: string,
    type: ViolationType,
    points: number,
    reason: string,
    evidence?: string
  ): StorePenaltyProfile {
    return this.recordViolation(storeId, type, points, reason, { bookTitle: evidence });
  }

  /**
   * Ghi nhận vi phạm & Cộng điểm Sao Quả Tạ (Có phát sự kiện Realtime)
   */
  public recordViolation(
    storeId: string,
    violationType: ViolationType,
    points: number,
    reason: string,
    metadata?: { orderId?: string; bookTitle?: string }
  ): StorePenaltyProfile {
    const profile = this.getProfile(storeId);
    const now = new Date();
    const expires = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000); // 28 ngày

    const violationNames: Record<ViolationType, string> = {
      NON_FULFILLMENT: 'Tỷ lệ hủy đơn hàng cao (NFR > 5%)',
      LATE_SHIPMENT: 'Giao hàng trễ hạn cho bưu tá (> 24h)',
      COPYRIGHT_VIOLATION: 'Bán sách vi phạm bản quyền / DRM lậu',
      PROMOTION_FRAUD: 'Gian lận khuyến mãi / Đơn ảo Flash Sale',
      COMMUNICATION_ABUSE: 'Ngôn từ khiếm nhã trong tin nhắn khách hàng',
    };

    const newRecord: PenaltyRecord = {
      id: `pen-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      storeId,
      violationType,
      violationName: violationNames[violationType] || violationType,
      points,
      reason,
      relatedOrderId: metadata?.orderId,
      relatedBookTitle: metadata?.bookTitle,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      isAppealed: false,
      appealStatus: 'NONE',
    };

    profile.history.unshift(newRecord);
    profile.totalPoints += points;
    profile.penaltyPoints = profile.totalPoints;
    profile.sanctionExpiresAt = expires.toISOString();

    if (violationType === 'NON_FULFILLMENT') {
      profile.metrics.nonFulfillmentRate = Math.min(25, profile.metrics.nonFulfillmentRate + 2.5);
    } else if (violationType === 'LATE_SHIPMENT') {
      profile.metrics.lateShipmentRate = Math.min(30, profile.metrics.lateShipmentRate + 3.0);
    }

    this.profiles[storeId] = profile;
    this.saveToStorage();

    // Broadcast Realtime Event
    realtimeSyncBus.publish('SELLER_PENALTY_UPDATED', {
      storeId,
      currentPoints: profile.totalPoints,
      tier: profile.tier,
      canJoinPlatformFlashSale: profile.canJoinPlatformFlashSale,
      reason,
      penaltyExpiresAt: profile.sanctionExpiresAt,
    });

    return this.getProfile(storeId);
  }

  /**
   * Người bán gửi yêu cầu khiếu nại điểm phạt (Appeal)
   */
  public submitAppeal(
    storeId: string,
    recordId: string,
    appealReason: string,
    evidenceNotes?: string
  ): { success: boolean; message: string } {
    const profile = this.getProfile(storeId);
    const record = profile.history.find((r) => r.id === recordId);
    if (!record) {
      return { success: false, message: 'Không tìm thấy hồ sơ vi phạm cần khiếu nại.' };
    }

    record.isAppealed = true;
    record.appealStatus = 'PENDING';
    record.appealReason = appealReason;
    if (evidenceNotes) {
      record.evidenceNotes = evidenceNotes;
      record.appealProof = evidenceNotes;
    }

    this.profiles[storeId] = profile;
    this.saveToStorage();

    realtimeSyncBus.publish('SELLER_PENALTY_UPDATED', {
      storeId,
      currentPoints: profile.totalPoints,
      tier: profile.tier,
      action: 'APPEAL_SUBMITTED',
      recordId,
    });

    return { success: true, message: 'Đã gửi khiếu nại thành công đến Hội đồng Sàn HuKi.' };
  }

  /**
   * Admin xem xét và chấp nhận khiếu nại -> Gỡ điểm phạt tức thì
   */
  public arbitrateAppeal(
    storeId: string,
    recordId: string,
    isApproved: boolean,
    adminNote?: string
  ): { success: boolean; message: string } {
    const profile = this.getProfile(storeId);
    const record = profile.history.find((r) => r.id === recordId);
    if (!record) {
      return { success: false, message: 'Không tìm thấy vi phạm để xử lý.' };
    }

    record.appealStatus = isApproved ? 'APPROVED' : 'REJECTED';
    record.appealReviewedAt = new Date().toISOString();
    if (adminNote) {
      record.appealAdminNote = adminNote;
    }

    if (isApproved) {
      // Giảm điểm đã phạt
      profile.totalPoints = Math.max(0, profile.totalPoints - record.points);
      profile.penaltyPoints = profile.totalPoints;
      if (profile.totalPoints < 3) {
        profile.canJoinPlatformFlashSale = true;
      }
    }

    this.profiles[storeId] = profile;
    this.saveToStorage();

    realtimeSyncBus.publish('SELLER_PENALTY_UPDATED', {
      storeId,
      currentPoints: profile.totalPoints,
      tier: profile.tier,
      action: isApproved ? 'APPEAL_APPROVED_POINTS_REMOVED' : 'APPEAL_REJECTED',
      recordId,
    });

    return {
      success: true,
      message: isApproved
        ? `Đã chấp thuận khiếu nại! Xóa ${record.points} điểm phạt cho gian hàng.`
        : 'Đã bác bỏ khiếu nại. Giữ nguyên điểm phạt.',
    };
  }

  /**
   * Đặt lại điểm phạt về 0 (Reset định kỳ theo Quý)
   */
  public resetQuarterly(storeId: string, newQuarter = 'Q1-2027'): StorePenaltyProfile {
    const profile = this.getProfile(storeId);
    profile.totalPoints = 0;
    profile.penaltyPoints = 0;
    profile.quarterCycle = newQuarter;
    profile.sanctionExpiresAt = undefined;

    this.profiles[storeId] = profile;
    this.saveToStorage();

    realtimeSyncBus.publish('SELLER_PENALTY_UPDATED', {
      storeId,
      currentPoints: 0,
      tier: 'TIER_0_GOOD',
      canJoinPlatformFlashSale: true,
      action: 'QUARTERLY_RESET',
      quarter: newQuarter,
    });

    return this.getProfile(storeId);
  }

  /**
   * Lấy danh sách toàn bộ hồ sơ gian hàng để Admin giám sát sức khỏe sàn
   */
  public getAllProfiles(): StorePenaltyProfile[] {
    return Object.keys(this.profiles).map((id) => this.getProfile(id));
  }

  /**
   * Lấy toàn bộ hàng đợi hồ sơ kháng nghị xử phạt của người bán
   */
  public getAllAppeals(): { storeId: string; storeName: string; record: PenaltyRecord }[] {
    const list: { storeId: string; storeName: string; record: PenaltyRecord }[] = [];
    Object.values(this.profiles).forEach((profile) => {
      profile.history.forEach((rec) => {
        if (rec.appealStatus && rec.appealStatus !== 'NONE') {
          list.push({
            storeId: profile.storeId,
            storeName: profile.storeName || 'Gian Hàng Người Bán',
            record: rec,
          });
        }
      });
    });
    return list.sort((a, b) => new Date(b.record.createdAt).getTime() - new Date(a.record.createdAt).getTime());
  }
}

export const sellerPenaltyService = new SellerPenaltyService();
