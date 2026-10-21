import { describe, it, expect } from 'vitest';
import {
  validateAndCanonicalizeChannelUrl,
  normalizeVietnamesePhone,
  affiliateStep1Schema,
  affiliateStep2Schema,
  affiliateStep3Schema,
  affiliateStep4Schema,
  affiliateRegistrationSchema,
  type AffiliateRegistrationInput,
} from '../schemas';

describe('Affiliate Module - Validation & Zod Contracts (Vitest Test Suite)', () => {
  describe('1. Phone Number Normalization (E.164)', () => {
    it('TC-VAL-01: normalizes local mobile number starting with 0', () => {
      expect(normalizeVietnamesePhone('0901234567')).toBe('+84901234567');
      expect(normalizeVietnamesePhone('0328889999')).toBe('+84328889999');
      expect(normalizeVietnamesePhone('0771234567')).toBe('+84771234567');
      expect(normalizeVietnamesePhone('0868888888')).toBe('+84868888888');
      expect(normalizeVietnamesePhone('0568888888')).toBe('+84568888888');
    });

    it('TC-VAL-02: normalizes numbers starting with 84 or +84', () => {
      expect(normalizeVietnamesePhone('84901234567')).toBe('+84901234567');
      expect(normalizeVietnamesePhone('+84901234567')).toBe('+84901234567');
    });

    it('TC-VAL-03: rejects invalid phone prefixes or lengths', () => {
      expect(normalizeVietnamesePhone('0123456789')).toBeNull(); // 01 is old/invalid prefix
      expect(normalizeVietnamesePhone('090123456')).toBeNull(); // only 9 digits
      expect(normalizeVietnamesePhone('09012345678')).toBeNull(); // 11 digits
      expect(normalizeVietnamesePhone('abc')).toBeNull();
    });
  });

  describe('2. URL Canonicalization & Security', () => {
    it('TC-VAL-04: accepts valid https URL and canonicalizes trailing slash', () => {
      const res = validateAndCanonicalizeChannelUrl('https://YouTube.com/channel/huki/');
      expect(res.valid).toBe(true);
      expect(res.canonicalUrl).toBe('https://youtube.com/channel/huki');
    });

    it('TC-VAL-05: rejects non-HTTPS protocols', () => {
      const httpRes = validateAndCanonicalizeChannelUrl('http://youtube.com/channel');
      expect(httpRes.valid).toBe(false);
      expect(httpRes.error).toContain('HTTPS');

      const jsRes = validateAndCanonicalizeChannelUrl('javascript:alert(1)');
      expect(jsRes.valid).toBe(false);
    });

    it('TC-VAL-06: rejects URLs with credentials (username/password)', () => {
      const res = validateAndCanonicalizeChannelUrl('https://admin:pass@youtube.com/channel');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('username/password');
    });

    it('TC-VAL-07: rejects sensitive query parameters case-insensitively', () => {
      const res1 = validateAndCanonicalizeChannelUrl('https://youtube.com?access_token=secret');
      expect(res1.valid).toBe(false);
      expect(res1.error).toContain('access_token');

      const res2 = validateAndCanonicalizeChannelUrl('https://youtube.com?Token=secret');
      expect(res2.valid).toBe(false);
      expect(res2.error).toContain('Token');

      const res3 = validateAndCanonicalizeChannelUrl('https://youtube.com?SESSION_ID=abc');
      expect(res3.valid).toBe(false);
      expect(res3.error).toContain('SESSION_ID');
    });

    it('TC-VAL-08: preserves meaningful query parameters and fragments', () => {
      const res = validateAndCanonicalizeChannelUrl('https://youtube.com/watch?v=dQw4w9WgXcQ#t=10s');
      expect(res.valid).toBe(true);
      expect(res.canonicalUrl).toBe('https://youtube.com/watch?v=dQw4w9WgXcQ#t=10s');
    });
  });

  describe('3. Step 1: Profile Schema', () => {
    it('TC-VAL-09: validates valid Step 1 payload', () => {
      const valid = {
        displayName: 'Nguyễn Văn Minh',
        affiliateCode: 'MINH_REVIEW',
        bio: 'Tôi có 3 năm kinh nghiệm làm video review sách trên các nền tảng mạng xã hội.',
        contactEmail: 'minh.affiliate@gmail.com',
        contactPhone: '0901234567',
        useAccountAvatar: true,
      };
      const res = affiliateStep1Schema.safeParse(valid);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.contactPhone).toBe('+84901234567');
      }
    });

    it('TC-VAL-10: rejects reserved affiliate codes', () => {
      const payload = {
        displayName: 'Admin User',
        affiliateCode: 'ADMIN',
        bio: 'Tôi có 3 năm kinh nghiệm làm video review sách trên các nền tảng mạng xã hội.',
        contactEmail: 'admin@huki.vn',
        contactPhone: '0901234567',
        useAccountAvatar: true,
      };
      const res = affiliateStep1Schema.safeParse(payload);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('từ khóa hệ thống');
      }
    });

    it('TC-VAL-11: requires avatarUrl if useAccountAvatar is false', () => {
      const payload = {
        displayName: 'Nguyễn Văn Minh',
        affiliateCode: 'MINH_REVIEW',
        bio: 'Tôi có 3 năm kinh nghiệm làm video review sách trên các nền tảng mạng xã hội.',
        contactEmail: 'minh@gmail.com',
        contactPhone: '0901234567',
        useAccountAvatar: false,
        avatarUrl: null,
      };
      const res = affiliateStep1Schema.safeParse(payload);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].path).toContain('avatarUrl');
      }
    });
  });

  describe('4. Step 2: Channels Schema', () => {
    it('TC-VAL-12: rejects duplicate canonical channel URLs in the same profile', () => {
      const payload = {
        channels: [
          {
            type: 'YOUTUBE' as const,
            url: 'https://youtube.com/@minhbooks/',
            followersRange: 'FROM_10K_TO_50K' as const,
            isPrimary: true,
          },
          {
            type: 'YOUTUBE' as const,
            url: 'https://youtube.com/@minhbooks',
            followersRange: 'FROM_10K_TO_50K' as const,
            isPrimary: false,
          },
        ],
        contentCategories: ['cat-van-hoc'],
        promotionMethods: ['REVIEW' as const],
      };
      const res = affiliateStep2Schema.safeParse(payload);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('trùng lặp');
      }
    });

    it('TC-VAL-13: requires exactly one primary channel', () => {
      const payloadZeroPrimary = {
        channels: [
          {
            type: 'YOUTUBE' as const,
            url: 'https://youtube.com/@minhbooks',
            followersRange: 'FROM_10K_TO_50K' as const,
            isPrimary: false,
          },
        ],
        contentCategories: ['cat-van-hoc'],
        promotionMethods: ['REVIEW' as const],
      };
      const res = affiliateStep2Schema.safeParse(payloadZeroPrimary);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('chính xác một kênh làm kênh quảng bá chính');
      }
    });

    it('TC-VAL-14: automatically dedupes categories and promotion methods', () => {
      const payload = {
        channels: [
          {
            type: 'YOUTUBE' as const,
            url: 'https://youtube.com/@minhbooks',
            followersRange: 'FROM_10K_TO_50K' as const,
            isPrimary: true,
          },
        ],
        contentCategories: ['cat-1', 'cat-2', 'cat-1'],
        promotionMethods: ['REVIEW' as const, 'VIDEO' as const, 'REVIEW' as const],
      };
      const res = affiliateStep2Schema.safeParse(payload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.contentCategories).toEqual(['cat-1', 'cat-2']);
        expect(res.data.promotionMethods).toEqual(['REVIEW', 'VIDEO']);
      }
    });
  });

  describe('5. Step 3: Activities & Paid Traffic', () => {
    it('TC-VAL-15: requires at least 1 paid traffic source when hasPaidTraffic is true', () => {
      const payload = {
        applicantType: 'INDIVIDUAL' as const,
        promotionDescription:
          'Kế hoạch sản xuất nội dung video review chuyên sâu và giới thiệu sách tại HuKi.',
        hasPaidTraffic: true,
        paidTrafficSources: [],
        payoutSetupLater: true,
      };
      const res = affiliateStep3Schema.safeParse(payload);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('chọn ít nhất một nguồn quảng cáo');
      }
    });

    it('TC-VAL-16: resets paidTrafficSources to empty array when hasPaidTraffic is false', () => {
      const payload = {
        applicantType: 'INDIVIDUAL' as const,
        promotionDescription:
          'Kế hoạch sản xuất nội dung video review chuyên sâu và giới thiệu sách tại HuKi.',
        hasPaidTraffic: false,
        paidTrafficSources: ['FACEBOOK_ADS' as const],
        payoutSetupLater: true,
      };
      const res = affiliateStep3Schema.safeParse(payload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.paidTrafficSources).toEqual([]);
      }
    });
  });

  describe('6. Combined Full Registration Schema', () => {
    it('TC-VAL-17: successfully parses valid 4-step registration payload', () => {
      const fullValidPayload: AffiliateRegistrationInput = {
        displayName: 'Nguyễn Văn Minh',
        affiliateCode: 'MINH_HUKI',
        bio: 'Tôi có 3 năm kinh nghiệm làm video review sách trên YouTube và TikTok với hơn 20k người theo dõi.',
        contactEmail: 'minh.affiliate@gmail.com',
        contactPhone: '0901234567',
        useAccountAvatar: true,
        channels: [
          {
            type: 'YOUTUBE',
            url: 'https://youtube.com/@minhbooks',
            handle: '@minhbooks',
            followersRange: 'FROM_10K_TO_50K',
            isPrimary: true,
          },
          {
            type: 'TIKTOK',
            url: 'https://tiktok.com/@minhbooks',
            handle: '@minhbooks',
            followersRange: 'FROM_5K_TO_10K',
            isPrimary: false,
          },
        ],
        contentCategories: ['cat-van-hoc', 'cat-kinh-te'],
        promotionMethods: ['REVIEW', 'VIDEO'],
        applicantType: 'INDIVIDUAL',
        promotionDescription:
          'Kế hoạch của tôi là sản xuất mỗi tuần 2 video phân tích sách văn học và sách kinh doanh kèm link giới thiệu sách tại HuKi.',
        hasPaidTraffic: false,
        paidTrafficSources: ['FACEBOOK_ADS'],
        taxId: '0123456789',
        payoutSetupLater: true,
        acceptedAffiliateTerms: true,
        acceptedPrivacyNotice: true,
        confirmedInformationAccuracy: true,
        marketingConsent: true,
      };

      const res = affiliateRegistrationSchema.safeParse(fullValidPayload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.contactPhone).toBe('+84901234567');
        expect(res.data.paidTrafficSources).toEqual([]); // reset because hasPaidTraffic is false
      }
    });

    it('TC-VAL-18: rejects when terms are not accepted', () => {
      const invalidPayload = {
        displayName: 'Nguyễn Văn Minh',
        affiliateCode: 'MINH_HUKI',
        bio: 'Tôi có 3 năm kinh nghiệm làm video review sách trên YouTube và TikTok với hơn 20k người theo dõi.',
        contactEmail: 'minh.affiliate@gmail.com',
        contactPhone: '0901234567',
        useAccountAvatar: true,
        channels: [
          {
            type: 'YOUTUBE' as const,
            url: 'https://youtube.com/@minhbooks',
            followersRange: 'FROM_10K_TO_50K' as const,
            isPrimary: true,
          },
        ],
        contentCategories: ['cat-van-hoc'],
        promotionMethods: ['REVIEW' as const],
        applicantType: 'INDIVIDUAL' as const,
        promotionDescription:
          'Kế hoạch của tôi là sản xuất mỗi tuần 2 video phân tích sách văn học.',
        hasPaidTraffic: false,
        paidTrafficSources: [],
        payoutSetupLater: true,
        acceptedAffiliateTerms: false,
        acceptedPrivacyNotice: true,
        confirmedInformationAccuracy: true,
        marketingConsent: false,
      };

      const res = affiliateRegistrationSchema.safeParse(invalidPayload);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues.some((i) => i.path.includes('acceptedAffiliateTerms'))).toBe(true);
      }
    });
  });

  describe('7. Production Hygiene: No Mock API or Fake Data in Runtime', () => {
    it('TC-VAL-19: verifies production code does not import mockApi or fake affiliate data', async () => {
      const fs = await import('fs');
      const path = await import('path');

      // 1. mockApi.ts must not exist
      const mockApiPath = path.resolve(__dirname, '../../affiliate/mockApi.ts');
      expect(fs.existsSync(mockApiPath)).toBe(false);

      // 2. Scan production source files
      const prodDirs = [
        path.resolve(__dirname, '../../../app/account/affiliate'),
        path.resolve(__dirname, '../../../app/affiliate'),
        path.resolve(__dirname, '../../../app/r'),
        path.resolve(__dirname, '../../../ui/components/affiliate'),
      ];

      for (const dir of prodDirs) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir, { recursive: true }) as string[];
        for (const file of files) {
          const filePath = path.join(dir, file);
          if (fs.statSync(filePath).isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
            const content = fs.readFileSync(filePath, 'utf-8');
            expect(content).not.toContain('mockApi');
            expect(content).not.toContain('mockAffiliateApi');
            expect(content).not.toContain('MOCK_DASHBOARD_KPIS');
            expect(content).not.toContain('MOCK_DAILY_CHART');
            expect(content).not.toContain('MOCK_RECENT_COMMISSIONS');
          }
        }
      }
    });
  });
});

