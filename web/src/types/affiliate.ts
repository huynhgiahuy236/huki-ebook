/**
 * Affiliate Marketing (Đối tác tiếp thị) Domain Types
 * Based on approved UX Contract AFF-SPEC-UX-CONTRACT-001 (Phase 1)
 */

export type PartnerStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'REQUEST_CHANGES'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'TERMINATED';

export type CommissionStatus =
  | 'PENDING'
  | 'HOLDING'
  | 'AVAILABLE'
  | 'CANCELLED'
  | 'REVERSED';

export type PromotionMethod =
  | 'REVIEW'
  | 'VIDEO'
  | 'SOCIAL_POST'
  | 'BLOG_ARTICLE'
  | 'LIVESTREAM'
  | 'COMMUNITY_GROUP';

export type PaidTrafficSource =
  | 'FACEBOOK_ADS'
  | 'GOOGLE_ADS'
  | 'TIKTOK_ADS'
  | 'YOUTUBE_ADS'
  | 'NATIVE_ADS'
  | 'OTHER';

export type ChannelType =
  | 'FACEBOOK'
  | 'TIKTOK'
  | 'YOUTUBE'
  | 'BLOG'
  | 'INSTAGRAM'
  | 'OTHER';

export type FollowersRange =
  | 'UNDER_1K'
  | 'FROM_1K_TO_5K'
  | 'FROM_5K_TO_10K'
  | 'FROM_10K_TO_50K'
  | 'FROM_50K_TO_100K'
  | 'ABOVE_100K';

export type ApplicantType = 'INDIVIDUAL' | 'BUSINESS';

export interface PromotionChannel {
  id?: string;
  type: ChannelType;
  url: string;
  canonicalUrl?: string;
  handle?: string;
  followersRange: FollowersRange;
  isPrimary: boolean;
}

export interface AffiliateProfile {
  id: string;
  userId: string;
  displayName: string;
  affiliateCode: string;
  bio: string;
  contactEmail: string;
  contactPhone: string;
  avatarUrl?: string | null;
  status: PartnerStatus;
  statusReason?: string;
  rejectionReason?: string;
  applicantType: ApplicantType;
  channels: PromotionChannel[];
  contentCategories: string[];
  promotionMethods: PromotionMethod[];
  hasPaidTraffic: boolean;
  paidTrafficSources: PaidTrafficSource[];
  promotionDescription: string;
  taxId?: string;
  payoutSetupLater: boolean;
  marketingConsent: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 7 Core KPI Metrics on Affiliate Dashboard
 */
export interface AffiliateDashboardKPIs {
  /** 1. Lượt click hợp lệ (đã lọc bot & dedupe) */
  validClicks: number;
  /** 2. Chuyển đổi: số đơn thành công & tỷ lệ % */
  conversion: {
    ordersCount: number;
    ratePercent: number;
  };
  /** 3. Hoa hồng chờ xử lý (đơn mới phát sinh) */
  pending: number;
  /** 4. Hoa hồng tạm giữ đối soát (7 ngày physical, 24h digital) */
  holding: number;
  /** 5. Hoa hồng khả dụng (đã qua holding, sẵn sàng rút) */
  available: number;
  /** 6. Hoa hồng đã thanh toán (Aggregate từ Payout COMPLETED) */
  paid: number;
  /** 7. Hoa hồng đã thu hồi/bù trừ */
  reversed: number;
}

export interface AffiliateLinkItem {
  id: string;
  shortCode: string;
  targetUrl: string;
  bookId?: string;
  bookTitle?: string;
  bookCover?: string;
  campaign?: string;
  subId?: string;
  estimatedRatePercent: number;
  clicksCount: number;
  conversionCount: number;
  createdAt: string;
}

export interface CommissionItem {
  id: string;
  orderItemId: string;
  orderCodeMasked: string;
  bookTitle: string;
  format: 'PHYSICAL' | 'EBOOK' | 'AUDIOBOOK';
  sellerName: string;
  orderItemAmount: number;
  commissionRatePercent: number;
  commissionAmount: number;
  status: CommissionStatus;
  holdingStartedAt?: string;
  holdingUntil?: string;
  hasDispute: boolean;
  createdAt: string;
  ledgerRef?: string;
}

/**
 * Async checking state for affiliate code
 */
export type AffiliateCodeAsyncState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'unavailable'
  | 'rate_limited'
  | 'network_error';

/**
 * Standardized API Error format
 */
export interface ApiErrorResponse {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId: string;
}
