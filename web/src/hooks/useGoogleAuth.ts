"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { useRouter } from 'next/navigation';
import { authApi } from '@/ui/api/authApi';

export function useGoogleAuth(redirectTarget: string = '/') {
  const { loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const cachedClientIdRef = useRef<string | null>(null);

  // 1. Tải Google Identity Services (GSI) SDK từ máy chủ Google
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existing = document.getElementById('google-gsi-client');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    // Tiền tải Google Client ID từ Backend để sẵn sàng khi user click
    authApi.getGoogleClientId().then((res) => {
      if (res.success && res.data?.clientId) {
        cachedClientIdRef.current = res.data.clientId.trim();
      }
    }).catch(() => {
      // Backend offline hoặc chưa cấu hình
    });
  }, []);

  const triggerGoogleLogin = useCallback(async () => {
    // 2. Lấy Client ID từ Backend (hoặc fallback biến env)
    let clientId = cachedClientIdRef.current || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

    if (!clientId) {
      try {
        const res = await authApi.getGoogleClientId();
        if (res.success && res.data?.clientId) {
          clientId = res.data.clientId.trim();
          cachedClientIdRef.current = clientId;
        }
      } catch {
        // lỗi kết nối backend
      }
    }

    if (!clientId) {
      showToast({
        title: 'Chưa cấu hình Google Client ID',
        message: 'Vui lòng điền GOOGLE_CLIENT_ID vào file platform/.env ở Backend.',
        type: 'error',
      });
      return;
    }

    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      showToast({
        title: 'Đang kết nối tới Google',
        message: 'Dịch vụ Google đang khởi tạo, vui lòng bấm lại sau 1-2 giây.',
        type: 'info',
      });
      return;
    }

    setIsGoogleLoading(true);

    try {
      // 3. Khởi tạo Google OAuth2 Token Client mở cửa sổ Popup chính thức của Google
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.error) {
            setIsGoogleLoading(false);
            showToast({
              title: 'Đăng nhập Google thất bại',
              message: tokenResponse.error_description || tokenResponse.error || 'Đã đóng cửa sổ đăng nhập Google.',
              type: 'error',
            });
            return;
          }

          if (tokenResponse?.access_token) {
            try {
              // 4. Gửi Access Token nhận từ Google về Backend HUKI để xác thực và cấp session
              const res = await loginWithGoogle({ accessToken: tokenResponse.access_token });
              if (res.success && res.user) {
                showToast({
                  title: 'Đăng nhập Google thành công',
                  message: `Chào mừng ${res.user.fullName || res.user.email} đến với HUKI EBOOK!`,
                  type: 'success',
                });

                const isNewUser = Boolean((res.user as any)?.isNewUser);
                const hasFinishedOnboarding = Boolean(res.user.hasCompletedOnboarding);
                const userLocalCompleted =
                  typeof window !== 'undefined' && res.user.id
                    ? localStorage.getItem(`huki_onboarding_completed_${res.user.id}`) === 'true'
                    : false;

                if (res.user.role === 'PLATFORM_ADMIN') {
                  router.push('/admin');
                } else if (res.user.role === 'BUSINESS') {
                  router.push('/seller/dashboard');
                } else if (isNewUser && !hasFinishedOnboarding && !userLocalCompleted) {
                  router.push('/onboarding');
                } else {
                  router.push(redirectTarget);
                }
              } else {
                showToast({
                  title: 'Đăng nhập thất bại',
                  message: res.error || 'Không thể xác thực thông tin tài khoản với máy chủ.',
                  type: 'error',
                });
              }
            } catch (err: any) {
              showToast({
                title: 'Lỗi đăng nhập',
                message: err?.message || 'Có lỗi xảy ra khi xác thực Google.',
                type: 'error',
              });
            } finally {
              setIsGoogleLoading(false);
            }
          } else {
            setIsGoogleLoading(false);
          }
        },
      });

      // 5. Mở Popup chính thức của Google: accounts.google.com
      tokenClient.requestAccessToken();
    } catch (err: any) {
      setIsGoogleLoading(false);
      showToast({
        title: 'Lỗi mở cửa sổ Google',
        message: err?.message || 'Không thể kích hoạt cửa sổ đăng nhập Google.',
        type: 'error',
      });
    }
  }, [loginWithGoogle, redirectTarget, router, showToast]);

  return {
    triggerGoogleLogin,
    isGoogleLoading,
  };
}
