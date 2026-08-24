/**
 * HUKI EBOOK - Business Enums
 *
 * Các enum dùng chung cho tất cả services
 * Bổ sung cho Prisma enums
 */

// ============================================
// BOOK ACCESS TYPE - Phân biệt sách FREE vs PREMIUM
// ============================================

/**
 * Loại truy cập sách:
 * - FREE: Sách thường, mua 1 lần đọc mãi mãi
 * - PREMIUM: Sách premium, cần subscription hoặc trả thêm phí
 *
 * Sáo từ: Sách FREE ai cũng mua được, còn PREMIUM phải tốn tiền thêm mới cho đọc
 */
export enum BookAccessType {
  /** Sách miễn phí sau khi mua - truy cập vĩnh viễn */
  FREE = 'FREE',
  /** Sách premium - cần subscription hoặc trả phí riêng */
  PREMIUM = 'PREMIUM',
}

// ============================================
// SUBSCRIPTION TIERS
// ============================================

export enum SubscriptionTier {
  BASIC = 'BASIC',      // Đọc sách FREE + một số PREMIUM nhất định
  STANDARD = 'STANDARD', // Đọc nhiều sách PREMIUM hơn
  PREMIUM = 'PREMIUM',  // Đọc tất cả sách PREMIUM
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',       // Dùng thử
  ACTIVE = 'ACTIVE',    // Đang hoạt động
  PAUSED = 'PAUSED',    // Tạm dừng
  CANCELLED = 'CANCELLED', // Đã hủy (hết period)
  EXPIRED = 'EXPIRED',  // Hết hạn
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

// ============================================
// ACCESS CHECK
// ============================================

export enum AccessReason {
  OWNED = 'OWNED',                         // Đã mua sách
  FREE_BOOK = 'FREE_BOOK',                 // Sách FREE
  PREMIUM_SUBSCRIPTION = 'PREMIUM_SUBSCRIPTION', // Có subscription Premium
  NO_SUBSCRIPTION = 'NO_SUBSCRIPTION',   // Không có subscription
  TIER_INSUFFICIENT = 'TIER_INSUFFICIENT', // Subscription không đủ tier
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',     // Hết lượt đọc
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED', // Subscription hết hạn
  BOOK_NOT_PUBLISHED = 'BOOK_NOT_PUBLISHED', // Sách chưa xuất bản
}

/**
 * Kết quả kiểm tra quyền truy cập sách
 */
export interface AccessCheckResult {
  allowed: boolean;
  reason: AccessReason;
  message?: string;
  subscription?: {
    tier: SubscriptionTier;
    expiresAt?: Date | null;
  };
}

/**
 * Ma trận truy cập: Subscription Tier vs Book Access Type
 *
 *                | FREE | PREMIUM |
 * ---------------+------+---------+
 * BASIC          |  ✅   |    ❌    |
 * STANDARD       |  ✅   |    ❌    |
 * PREMIUM        |  ✅   |    ✅    |
 * (mua 1 lần)   |  ✅   |    ✅    |
 *
 * Note: Mua 1 lần (OWNED) luôn có quyền truy cập bất kể access type
 */
export const ACCESS_MATRIX: Record<SubscriptionTier, BookAccessType[]> = {
  [SubscriptionTier.BASIC]: [BookAccessType.FREE],
  [SubscriptionTier.STANDARD]: [BookAccessType.FREE],
  [SubscriptionTier.PREMIUM]: [BookAccessType.FREE, BookAccessType.PREMIUM],
};

// ============================================
// SUBSCRIPTION PRICING (VNĐ)
// ============================================

export const SUBSCRIPTION_PRICING = {
  [SubscriptionTier.BASIC]: {
    monthly: 0,
    quarterly: 0,
    yearly: 0,
  },
  [SubscriptionTier.STANDARD]: {
    monthly: 49000,    // ~49k/tháng
    quarterly: 129000, // ~43k/tháng
    yearly: 399000,    // ~33k/tháng
  },
  [SubscriptionTier.PREMIUM]: {
    monthly: 99000,    // ~99k/tháng
    quarterly: 249000, // ~83k/tháng
    yearly: 799000,    // ~67k/tháng
  },
} as const;

// ============================================
// PLATFORM - Cấp độ platform
// ============================================

/**
 * Phân biệt platform SaaS cho doanh nghiệp:
 * - SINGLE: Platform đơn lẻ
 * - BUSINESS: Platform cho doanh nghiệp thuê
 */
export enum PlatformType {
  /** Platform đơn lẻ */
  SINGLE = 'SINGLE',
  /** Platform SaaS cho doanh nghiệp */
  BUSINESS = 'BUSINESS',
}

/**
 * Trạng thái business trong SaaS
 */
export enum BusinessAccountStatus {
  TRIAL = 'TRIAL',           // Dùng thử
  ACTIVE = 'ACTIVE',         // Đang hoạt động
  SUSPENDED = 'SUSPENDED',   // Bị tạm ngưng
  CANCELLED = 'CANCELLED',   // Đã hủy
}
