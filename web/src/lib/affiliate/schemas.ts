import { z } from 'zod';

// ==========================================
// 1. ENUMS & CONSTANTS
// ==========================================
export const PromotionMethodEnum = z.enum([
  'REVIEW',
  'VIDEO',
  'SOCIAL_POST',
  'BLOG_ARTICLE',
  'LIVESTREAM',
  'COMMUNITY_GROUP',
]);

export const PaidTrafficSourceEnum = z.enum([
  'FACEBOOK_ADS',
  'GOOGLE_ADS',
  'TIKTOK_ADS',
  'YOUTUBE_ADS',
  'NATIVE_ADS',
  'OTHER',
]);

export const ChannelTypeEnum = z.enum([
  'FACEBOOK',
  'TIKTOK',
  'YOUTUBE',
  'BLOG',
  'INSTAGRAM',
  'OTHER',
]);

export const FollowersRangeEnum = z.enum([
  'UNDER_5K',
  'FROM_5K_TO_20K',
  'FROM_20K_TO_100K',
  'OVER_100K',
]);

export const ApplicantTypeEnum = z.enum(['INDIVIDUAL', 'BUSINESS']);

// Danh sách tham số bảo mật nhạy cảm cấm xuất hiện trong URL kênh (so khớp case-insensitive)
export const SENSITIVE_URL_PARAMS = [
  'access_token',
  'token',
  'session_id',
  'auth',
  'password',
  'key',
  'secret',
  'email',
];

/**
 * Phân tích và chuẩn hóa an toàn đường dẫn kênh quảng bá
 */
export function validateAndCanonicalizeChannelUrl(rawUrl: string): {
  valid: boolean;
  error?: string;
  canonicalUrl?: string;
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'Đường dẫn URL không hợp lệ.' };
  }
  const trimmed = rawUrl.trim();
  if (trimmed.length > 2048) {
    return { valid: false, error: 'Đường dẫn quá dài (tối đa 2048 ký tự).' };
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Định dạng URL không hợp lệ.' };
  }
  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Đường dẫn kênh bắt buộc sử dụng giao thức bảo mật HTTPS.' };
  }
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'Đường dẫn không được chứa thông tin xác thực username/password.' };
  }
  for (const [key] of parsed.searchParams.entries()) {
    if (SENSITIVE_URL_PARAMS.includes(key.toLowerCase())) {
      return {
        valid: false,
        error: `Đường dẫn chứa tham số bảo mật nhạy cảm (${key}) không được phép sử dụng.`,
      };
    }
  }

  const hostname = parsed.hostname.toLowerCase();
  const port = parsed.port === '443' ? '' : parsed.port ? `:${parsed.port}` : '';
  let pathname = parsed.pathname || '/';
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // Giữ nguyên query param và hash có ý nghĩa
  const canonical = `https://${hostname}${port}${pathname}${parsed.search || ''}${parsed.hash || ''}`;
  return { valid: true, canonicalUrl: canonical };
}

/**
 * Chuẩn hóa số điện thoại di động Việt Nam về định dạng E.164 (+84...)
 */
export function normalizeVietnamesePhone(val: string): string | null {
  const cleaned = val.trim();
  if (/^0[35789]\d{8}$/.test(cleaned)) {
    return '+84' + cleaned.slice(1);
  }
  if (/^84[35789]\d{8}$/.test(cleaned)) {
    return '+' + cleaned;
  }
  if (/^\+84[35789]\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

// ==========================================
// 2. BASE OBJECT SHAPES TỪNG BƯỚC
// ==========================================

export const affiliateStep1BaseShape = {
  displayName: z
    .string()
    .trim()
    .min(2, { message: 'Họ tên hiển thị phải có ít nhất 2 ký tự.' })
    .max(80, { message: 'Họ tên hiển thị không được vượt quá 80 ký tự.' })
    .regex(/^[\p{L}\p{N}\s._-]+$/u, {
      message: 'Họ tên hiển thị không được chứa ký tự đặc biệt nguy hiểm.',
    }),

  affiliateCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, { message: 'Mã đối tác phải có ít nhất 4 ký tự.' })
    .max(24, { message: 'Mã đối tác không được vượt quá 24 ký tự.' })
    .regex(/^[A-Z0-9_]{4,24}$/, {
      message: 'Mã chỉ gồm chữ in hoa, chữ số và gạch dưới (VD: HUKI_MINH).',
    })
    .refine(
      (code) => !['ADMIN', 'HUKI', 'ROOT', 'SYSTEM', 'SUPPORT'].includes(code),
      { message: 'Mã này thuộc từ khóa hệ thống, vui lòng chọn mã khác.' }
    ),

  bio: z
    .string()
    .trim()
    .min(30, { message: 'Phần giới thiệu kinh nghiệm phải có ít nhất 30 ký tự.' })
    .max(500, { message: 'Phần giới thiệu không được vượt quá 500 ký tự.' }),

  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Địa chỉ email không đúng định dạng.' })
    .max(254, { message: 'Email quá dài (tối đa 254 ký tự).' }),

  contactPhone: z
    .string()
    .trim()
    .transform((val, ctx) => {
      const normalized = normalizeVietnamesePhone(val);
      if (!normalized) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Số điện thoại di động Việt Nam không đúng định dạng (VD: 0901234567 hoặc +84901234567).',
        });
        return z.NEVER;
      }
      return normalized;
    }),

  useAccountAvatar: z.boolean().default(true),

  avatarUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(
      (url) => {
        if (!url) return true;
        // Chỉ chấp nhận relative path nội bộ hoặc CDN domain allowlist
        return (
          url.startsWith('/') ||
          url.startsWith('https://cdn.huki.vn/') ||
          url.startsWith('https://huki.vn/')
        );
      },
      {
        message: 'Ảnh đại diện phải thuộc hệ thống lưu trữ nội bộ hoặc CDN của HuKi.',
      }
    )
    .nullable()
    .optional(),
};

export const channelItemBaseShape = {
  type: ChannelTypeEnum,
  url: z
    .string()
    .trim()
    .max(2048, { message: 'Đường dẫn quá dài (tối đa 2048 ký tự).' })
    .transform((val, ctx) => {
      const res = validateAndCanonicalizeChannelUrl(val);
      if (!res.valid) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: res.error! });
        return z.NEVER;
      }
      return val;
    }),
  handle: z.string().trim().max(100, { message: 'Handle không quá 100 ký tự.' }).optional(),
  followersRange: FollowersRangeEnum,
  isPrimary: z.boolean().default(false),
};

export const affiliateStep2BaseShape = {
  channels: z
    .array(z.object(channelItemBaseShape))
    .min(1, { message: 'Bạn phải khai báo ít nhất 1 kênh quảng bá.' })
    .max(10, { message: 'Bạn chỉ được khai báo tối đa 10 kênh quảng bá.' }),

  contentCategories: z
    .array(z.string().trim().min(1))
    .transform((arr) => Array.from(new Set(arr)))
    .refine((arr) => arr.length >= 1 && arr.length <= 8, {
      message: 'Vui lòng chọn từ 1 đến 8 thể loại sách tiếp thị.',
    }),

  promotionMethods: z
    .array(PromotionMethodEnum)
    .transform((arr) => Array.from(new Set(arr)))
    .refine((arr) => arr.length >= 1 && arr.length <= 6, {
      message: 'Vui lòng chọn ít nhất 1 phương thức quảng bá.',
    }),
};

export const affiliateStep3BaseShape = {
  applicantType: ApplicantTypeEnum.default('INDIVIDUAL'),

  promotionDescription: z
    .string()
    .trim()
    .min(50, { message: 'Kế hoạch quảng bá chi tiết phải từ 50 ký tự trở lên.' })
    .max(1000, { message: 'Kế hoạch quảng bá không được vượt quá 1000 ký tự.' }),

  hasPaidTraffic: z.boolean().default(false),

  paidTrafficSources: z
    .array(PaidTrafficSourceEnum)
    .default([])
    .transform((arr) => Array.from(new Set(arr))),

  taxId: z
    .string()
    .trim()
    .regex(/^$|^\d{10}(-\d{3})?$/, {
      message: 'Mã số thuế không đúng định dạng (gồm 10 số hoặc dạng 10 số-3 số chi nhánh).',
    })
    .optional(),

  payoutSetupLater: z.boolean().default(true),
};

export const affiliateStep4BaseShape = {
  acceptedAffiliateTerms: z.literal(true, {
    message: 'Bạn phải đọc và đồng ý với Quy chế hoạt động Tiếp thị Liên kết của HuKi.',
  }),

  acceptedPrivacyNotice: z.literal(true, {
    message: 'Bạn phải xác nhận đã hiểu Chính sách quyền riêng tư và dữ liệu cá nhân.',
  }),

  confirmedInformationAccuracy: z.literal(true, {
    message: 'Bạn phải cam kết thông tin khai báo trong hồ sơ là hoàn toàn chính xác.',
  }),

  marketingConsent: z.boolean().default(false),
};

// ==========================================
// 3. STEP SCHEMAS RIÊNG CHO TỪNG BƯỚC FORM WIZARD
// ==========================================

export const affiliateStep1Schema = z
  .object(affiliateStep1BaseShape)
  .superRefine((data, ctx) => {
    if (!data.useAccountAvatar && !data.avatarUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn ảnh đại diện nếu không sử dụng ảnh của tài khoản.',
        path: ['avatarUrl'],
      });
    }
  });

export const affiliateStep2Schema = z
  .object(affiliateStep2BaseShape)
  .superRefine((data, ctx) => {
    const primaryCount = data.channels.filter((c) => c.isPrimary).length;
    if (primaryCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn chính xác một kênh làm kênh quảng bá chính của bạn.',
        path: ['channels'],
      });
    }

    const seenCanonical = new Set<string>();
    data.channels.forEach((c, index) => {
      const res = validateAndCanonicalizeChannelUrl(c.url);
      if (res.valid && res.canonicalUrl) {
        if (seenCanonical.has(res.canonicalUrl)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Đường dẫn kênh này bị trùng lặp với một kênh khác trong hồ sơ của bạn.',
            path: ['channels', index, 'url'],
          });
        } else {
          seenCanonical.add(res.canonicalUrl);
        }
      }
    });
  });

export const affiliateStep3Schema = z
  .object(affiliateStep3BaseShape)
  .superRefine((data, ctx) => {
    if (data.hasPaidTraffic && data.paidTrafficSources.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bạn đã bật quảng cáo trả phí, vui lòng chọn ít nhất một nguồn quảng cáo.',
        path: ['paidTrafficSources'],
      });
    }
  })
  .transform((data) => ({
    ...data,
    paidTrafficSources: data.hasPaidTraffic ? data.paidTrafficSources : [],
  }));

export const affiliateStep4Schema = z.object(affiliateStep4BaseShape);

// ==========================================
// 4. COMBINED REGISTRATION SCHEMA HOÀN CHỈNH
// ==========================================

export const affiliateRegistrationSchema = z
  .object({
    ...affiliateStep1BaseShape,
    ...affiliateStep2BaseShape,
    ...affiliateStep3BaseShape,
    ...affiliateStep4BaseShape,
  })
  .superRefine((data, ctx) => {
    // 1. Kiểm tra Avatar
    if (!data.useAccountAvatar && !data.avatarUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn ảnh đại diện nếu không sử dụng ảnh của tài khoản.',
        path: ['avatarUrl'],
      });
    }

    // 2. Kiểm tra chính xác 1 kênh chính
    const primaryCount = data.channels.filter((c) => c.isPrimary).length;
    if (primaryCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn chính xác một kênh làm kênh quảng bá chính của bạn.',
        path: ['channels'],
      });
    }

    // 3. Kiểm tra kênh trùng lặp canonical
    const seenCanonical = new Set<string>();
    data.channels.forEach((c, index) => {
      const res = validateAndCanonicalizeChannelUrl(c.url);
      if (res.valid && res.canonicalUrl) {
        if (seenCanonical.has(res.canonicalUrl)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Đường dẫn kênh này bị trùng lặp với một kênh khác trong hồ sơ của bạn.',
            path: ['channels', index, 'url'],
          });
        } else {
          seenCanonical.add(res.canonicalUrl);
        }
      }
    });

    // 4. Kiểm tra có điều kiện Paid Traffic
    if (data.hasPaidTraffic && data.paidTrafficSources.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bạn đã bật quảng cáo trả phí, vui lòng chọn ít nhất một nguồn quảng cáo.',
        path: ['paidTrafficSources'],
      });
    }
  })
  .transform((data) => ({
    ...data,
    paidTrafficSources: data.hasPaidTraffic ? data.paidTrafficSources : [],
  }));

export type AffiliateRegistrationInput = z.infer<typeof affiliateRegistrationSchema>;
