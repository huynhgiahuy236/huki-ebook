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
// BOOK ACCESS TIER - Cấp độ truy cập
// ============================================

/**
 * Cấp độ truy cập sách của user:
 * - BASIC: Chỉ đọc sách FREE hoặc đã mua
 * - PREMIUM: Đọc được cả sách PREMIUM (có subscription)
 */
export enum BookAccessTier {
  /** Cơ bản - chỉ đọc sách đã mua */
  BASIC = 'BASIC',
  /** Premium - đọc được cả sách premium */
  PREMIUM = 'PREMIUM',
}

// ============================================
// SUBSCRIPTION - Gói subscription
// ============================================

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum SubscriptionTier {
  BASIC = 'BASIC',      // Đọc sách FREE + một số PREMIUM nhất định
  STANDARD = 'STANDARD', // Đọc nhiều sách PREMIUM hơn
  PREMIUM = 'PREMIUM',  // Đọc tất cả sách PREMIUM
}

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
