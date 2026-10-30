'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { affiliateApi, type MyProfileResponse } from './affiliateApi';
import type { PartnerStatus } from '@/types/affiliate';

export type AffiliateStep =
  | 'GUEST'
  | 'REGISTER'
  | 'PENDING'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'BANK_SETUP'
  | 'ACTIVE';

export interface AffiliateGuardResult {
  isLoading: boolean;
  step: AffiliateStep;
  hasProfile: boolean;
  profileData: MyProfileResponse | null;
  kycData: any | null;
  hasBank: boolean;
  refetch: () => Promise<void>;
}

export interface UseAffiliateGuardOptions {
  /**
   * If true, will automatically enforce navigation guards:
   * - GUEST -> redirect to /login
   * - REGISTER -> redirect to /account/affiliate/register
   * - PENDING / CHANGES_REQUESTED / REJECTED -> redirect to /account/affiliate/application
   */
  enforceActive?: boolean;
}

export function useAffiliateGuard(options: UseAffiliateGuardOptions = {}): AffiliateGuardResult {
  const router = useRouter();
  const pathname = usePathname() || '';
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<MyProfileResponse | null>(null);
  const [kycData, setKycData] = useState<any | null>(null);
  const [step, setStep] = useState<AffiliateStep>('GUEST');

  const checkStatus = useCallback(async () => {
    if (authLoading) return;

    if (!isLoggedIn) {
      setStep('GUEST');
      setIsLoading(false);
      if (options.enforceActive) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    setIsLoading(true);
    try {
      const [profileRes, kycRes] = await Promise.allSettled([
        affiliateApi.getMyProfile(),
        affiliateApi.getMyKycStatus(),
      ]);

      let prof: MyProfileResponse | null = null;
      let kyc: any = null;

      if (profileRes.status === 'fulfilled' && profileRes.value.success && profileRes.value.data) {
        prof = profileRes.value.data;
        setProfileData(prof);
      }

      if (kycRes.status === 'fulfilled' && kycRes.value.success && kycRes.value.data) {
        kyc = kycRes.value.data;
        setKycData(kyc);
      }

      const hasProfile = Boolean(prof?.hasProfile && prof?.profile);
      const status: PartnerStatus | undefined = prof?.profile?.status;
      const hasBank = Boolean(kyc?.bankSnapshot || kyc?.isVerified);

      let computedStep: AffiliateStep = 'REGISTER';

      if (!hasProfile) {
        computedStep = 'REGISTER';
      } else if (status === 'PENDING_REVIEW' || status === 'DRAFT') {
        computedStep = 'PENDING';
      } else if (status === 'REQUEST_CHANGES') {
        computedStep = 'CHANGES_REQUESTED';
      } else if (status === 'REJECTED' || status === 'TERMINATED') {
        computedStep = 'REJECTED';
      } else if (status === 'ACTIVE') {
        if (!hasBank) {
          computedStep = 'BANK_SETUP';
        } else {
          computedStep = 'ACTIVE';
        }
      }

      setStep(computedStep);

      // Enforce navigation if requested
      if (options.enforceActive) {
        if (computedStep === 'REGISTER' && !pathname.includes('/register') && !pathname.includes('/application')) {
          showToast('Bạn chưa đăng ký tài khoản Đối tác Tiếp thị (CTV). Vui lòng hoàn tất biểu mẫu đăng ký.', 'info');
          router.push('/account/affiliate/register');
        } else if (
          (computedStep === 'PENDING' || computedStep === 'CHANGES_REQUESTED' || computedStep === 'REJECTED') &&
          !pathname.includes('/application')
        ) {
          showToast('Hồ sơ đối tác tiếp thị của bạn đang được thẩm định. Vui lòng theo dõi tiến độ.', 'info');
          router.push('/account/affiliate/application');
        }
      }
    } catch (err) {
      console.warn('Lỗi kiểm tra hồ sơ CTV:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, isLoggedIn, pathname, options.enforceActive, router, showToast]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    isLoading,
    step,
    hasProfile: Boolean(profileData?.hasProfile && profileData?.profile),
    profileData,
    kycData,
    hasBank: Boolean(kycData?.bankSnapshot || kycData?.isVerified),
    refetch: checkStatus,
  };
}

