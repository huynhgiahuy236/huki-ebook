import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/authApi';
import { userApi, type UserProfile, type UpdateProfilePayload } from '../api/userApi';
import { businessApi, type BusinessData } from '../api/businessApi';
import { tokenStorage } from '../api/tokenStorage';
import { can as canPermission } from '../utils/permissions';
import { getTracker } from '@/lib/tracker';
import type { ApiResponse, UserSession, BusinessMembership } from '../api/types';

export interface AuthContextType {
  user: UserSession | null;
  setUser: React.Dispatch<React.SetStateAction<UserSession | null>>;
  isLoggedIn: boolean;
  isLoading: boolean;
  authError: string | null;
  activeBusinessId: string | null;
  setActiveBusinessId: React.Dispatch<React.SetStateAction<string | null>>;
  login: (emailOrPhone?: string, password?: string) => Promise<{ success: boolean; user?: UserSession; error?: string; code?: string }>;
  loginWithGoogle: (googleData?: { idToken?: string; accessToken?: string; email?: string; fullName?: string; avatar?: string }) => Promise<{ success: boolean; user?: UserSession; error?: string }>;
  logout: () => Promise<void>;
  register: (formData: { email: string; password?: string; name?: string; fullName?: string; phone?: string }) => Promise<{ success: boolean; user?: UserSession; error?: string }>;
  changePassword: (currentPassword?: string, newPassword?: string) => Promise<ApiResponse<{ message: string }>>;
  verifyEmail: (token: string) => Promise<ApiResponse<{ message: string; user?: UserSession }>>;
  resendVerification: (email: string) => Promise<ApiResponse<{ message: string }>>;
  refreshBusiness: () => Promise<BusinessData | null>;
  updateUserProfile: (payload: UpdateProfilePayload) => Promise<ApiResponse<UserProfile>>;
  completeOnboarding: (preferences: Partial<UpdateProfilePayload>) => Promise<ApiResponse<UserProfile>>;
  hasRole: (allowedRoles: string | string[]) => boolean;
  hasPermission: (permission: string, targetBusinessId?: string) => boolean;
  can: (permission: string, bizId?: string) => boolean;
  pendingResetTarget?: string | null;
  setPendingResetTarget?: (target: string | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const isLoggedIn = Boolean(user);

  const normalizeUserData = (userData: any): UserSession | null => {
    if (!userData) return null;
    const normalizedName =
      userData.fullName ||
      userData.name ||
      userData.profile?.fullName ||
      (userData.role === 'PLATFORM_ADMIN'
        ? 'Super Admin'
        : userData.role === 'BUSINESS'
        ? 'Chủ Doanh Nghiệp'
        : userData.email?.split('@')[0] || 'Người Dùng');
    return {
      ...userData,
      name: normalizedName,
      fullName: userData.fullName || normalizedName,
    };
  };

  const hydrateBusiness = async (rawUserData: any): Promise<UserSession | null> => {
    if (!rawUserData) return null;
    let userData = normalizeUserData(rawUserData);
    if (!userData) return null;
    if (userData.role === 'PLATFORM_ADMIN') return userData;
    try {
      const bizRes = await businessApi.getMyBusiness();
      if (!bizRes.success || !bizRes.data) return userData;
      if (bizRes.data.id) setActiveBusinessId(bizRes.data.id);
      const isApproved = bizRes.data.status === 'APPROVED';
      const existingMemberships: BusinessMembership[] = Array.isArray(userData.memberships) ? [...userData.memberships] : [];
      const isOwner = bizRes.data.ownerId === userData.id || (bizRes.data as any).currentMember?.role === 'OWNER';

      const currentMember = (bizRes.data as any).currentMember;
      if (currentMember && !existingMemberships.some((m) => m.businessId === bizRes.data?.id)) {
        existingMemberships.push({
          businessId: bizRes.data.id,
          role: isOwner ? 'OWNER' : (currentMember.role || 'MEMBER'),
          status: 'ACTIVE',
          permissions: isOwner ? ['*'] : (currentMember.permissions || []),
        });
      }
      if (isApproved) {
        userData = {
          ...userData,
          role: 'BUSINESS',
          business: {
            ...bizRes.data,
            id: bizRes.data.id,
            name: bizRes.data.name,
            ownerId: bizRes.data.ownerId,
            status: bizRes.data.status,
            bankName: bizRes.data.bankName,
            bankAccountNumber: bizRes.data.bankAccountNumber,
            bankAccountHolderName: bizRes.data.bankAccountHolderName,
            bankBranch: bizRes.data.bankBranch,
            currentMember: currentMember,
          },
          memberships: existingMemberships,
          hasApprovedBusiness: true,
        };
        try {
          const tokenRes = await authApi.refreshToken();
          if (tokenRes.success && tokenRes.data?.accessToken) {
            tokenStorage.setTokens(tokenRes.data);
          }
        } catch {
          // ignore
        }
        return userData;
      }
      return {
        ...userData,
        business: {
          ...bizRes.data,
          id: bizRes.data.id,
          name: bizRes.data.name,
          ownerId: bizRes.data.ownerId,
          status: bizRes.data.status,
          currentMember: currentMember,
        },
        memberships: existingMemberships,
        hasApprovedBusiness: false,
      };
    } catch {
      return userData;
    }
  };

  // Bootstrap session khi ứng dụng tải
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      const tokens = tokenStorage.getTokens();
      if (!tokens) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const res = await authApi.getMe();
        if (isMounted) {
          if (res.success && res.data) {
            let userData: any = (res.data as any).user || res.data;
            userData = await hydrateBusiness(userData);
            setUser(userData);
            // Wire tracker với user đã đăng nhập
            if (userData?.id) {
              getTracker().setUserId(userData.id);
            }
            if (Array.isArray(userData?.memberships) && userData.memberships.length > 0) {
              setActiveBusinessId(userData.memberships[0].businessId);
            }
          } else {
            tokenStorage.clearTokens();
            setUser(null);
          }
        }
      } catch {
        if (isMounted) {
          tokenStorage.clearTokens();
          setUser(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

    // Shopee-style: Đồng bộ 1 tài khoản duy nhất trên tất cả các tab trình duyệt
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'huki_access_token') {
        if (!e.newValue) {
          // Tab khác đã đăng xuất -> đồng bộ đăng xuất trên tab này
          setUser(null);
          setActiveBusinessId(null);
        } else if (e.newValue !== e.oldValue) {
          // Tab khác đăng nhập tài khoản mới -> làm mới dữ liệu user theo tài khoản mới
          initAuth();
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Đăng nhập thật qua API Gateway
  const login = async (emailOrPhone?: string, password?: string) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const res = await authApi.login({ emailOrPhone, password });
      if (res.success && res.data) {
        const rawData: any = res.data;
        const accessToken = rawData.accessToken || rawData.tokens?.accessToken;
        const refreshToken = rawData.refreshToken || rawData.tokens?.refreshToken || '';
        let userData = rawData.user || rawData;

        if (accessToken) {
          tokenStorage.setTokens({ accessToken, refreshToken });
        }

        userData = await hydrateBusiness(userData);

        setUser(userData);

        // Wire tracker với userId sau khi login thành công
        if (userData?.id) {
          getTracker().setUserId(userData.id);
        }

        if (Array.isArray(userData?.memberships) && userData.memberships.length > 0) {
          setActiveBusinessId(userData.memberships[0].businessId);
        }

        setIsLoading(false);
        return { success: true, user: userData };
      } else {
        const errorMsg = res.error?.message || 'Đăng nhập không thành công.';
        setAuthError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg, code: res.error?.code };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi kết nối API.';
      setAuthError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  };

  // Đăng ký thật qua API Gateway
  const register = async (formData: { email: string; password?: string; name?: string; fullName?: string; phone?: string }) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const res = await authApi.register({
        email: formData.email,
        password: formData.password,
        fullName: formData.name || formData.fullName || '',
        phone: formData.phone,
      });

      if (res.success && res.data) {
        const rawData: any = res.data;
        const accessToken = rawData.accessToken || rawData.tokens?.accessToken;
        const refreshToken = rawData.refreshToken || rawData.tokens?.refreshToken || '';
        const userData = rawData.user || rawData;

        // Chỉ lưu session & setUser khi có token và tài khoản đã ACTIVE (không PENDING)
        if (accessToken && userData?.status === 'ACTIVE') {
          tokenStorage.setTokens({ accessToken, refreshToken });
          setUser(normalizeUserData(userData));
          // Wire tracker với userId sau khi register thành công
          if (userData?.id) {
            getTracker().setUserId(userData.id);
          }
        } else {
          tokenStorage.clearTokens();
          setUser(null);
        }

        setIsLoading(false);
        return { success: true, user: userData };
      } else {
        const errorMsg = res.error?.message || 'Đăng ký không thành công.';
        setAuthError(errorMsg);
        setIsLoading(false);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi kết nối API.';
      setAuthError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  };

  // Đăng xuất
  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors and proceed to clear client session
    } finally {
      tokenStorage.clearTokens();
      setUser(null);
      setActiveBusinessId(null);
      // Clear tracker userId khi logout
      getTracker().clearUserId();
      // Flush các event còn lại
      getTracker().flush();
      setIsLoading(false);
    }
  };

  // Đổi mật khẩu
  const changePassword = async (currentPassword?: string, newPassword?: string) => {
    const res = await authApi.changePassword({ currentPassword, newPassword });
    if (res.success) {
      setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : null));
    }
    return res;
  };

  // Xác thực Email
  const verifyEmail = async (token: string) => {
    return authApi.verifyEmail(token);
  };

  // Gửi lại Email xác thực
  const resendVerification = async (email: string) => {
    return authApi.resendVerification(email);
  };

  const refreshBusiness = async () => {
    if (!user) return null;
    const nextUser = await hydrateBusiness(user);
    setUser(nextUser);
    return (nextUser?.business as any) || null;
  };

  // Kiểm tra Global Role (USER, BUSINESS, PLATFORM_ADMIN)
  const hasRole = (allowedRoles: string | string[]) => {
    if (!user) return false;
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const isSellerOrBusiness = user.role === 'BUSINESS' || Boolean(user.hasApprovedBusiness);
    const mappedRole = user.role === 'PLATFORM_ADMIN' ? 'admin' : isSellerOrBusiness ? 'seller' : 'reader';
    return (
      roles.includes(user.role) ||
      roles.includes(mappedRole) ||
      (isSellerOrBusiness && (roles.includes('BUSINESS') || roles.includes('seller')))
    );
  };

  // Kiểm tra Granular Permission
  const hasPermission = (permission: string, targetBusinessId?: string) => {
    return canPermission(permission, targetBusinessId || activeBusinessId || undefined, user);
  };

  // Cập nhật thông tin cá nhân (Họ tên, SĐT, Avatar)
  const updateUserProfile = async (payload: UpdateProfilePayload) => {
    const res = await userApi.updateProfile(payload);
    if (res.success && res.data) {
      setUser((prev) => {
        if (!prev) return null;
        return normalizeUserData({
          ...prev,
          ...res.data,
        });
      });
    }
    return res;
  };

  // Lưu onboarding preferences & đánh dấu đã hoàn thành
  const completeOnboarding = async (preferences: Partial<UpdateProfilePayload>) => {
    try {
      const res = await userApi.updateProfile({
        ...preferences,
        hasCompletedOnboarding: true,
      });

      if (res.success && res.data) {
        // Cập nhật user state với hasCompletedOnboarding = true
        setUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            hasCompletedOnboarding: true,
            profile: {
              ...(prev.profile || {}),
              ...preferences,
            },
          };
        });

        // Xóa local storage onboarding preferences cache
        if (typeof window !== 'undefined') {
          localStorage.removeItem('huki_onboarding_preferences');
        }
        return res;
      }

      return {
        success: false,
        error: res.error || { code: 'UPDATE_FAILED', message: 'Không thể lưu thông tin hồ sơ onboarding.' },
      };
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      // KHÔNG đánh dấu hoàn tất nếu API thất bại
      const message = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ khi lưu hồ sơ.';
      return { success: false, error: { code: 'NETWORK_ERROR', message } };
    }
  };

  // Đăng nhập Google
  const loginWithGoogle = async (googleData?: { idToken?: string; accessToken?: string; email?: string; fullName?: string; avatar?: string }) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const email = googleData?.email;
      const fullName = googleData?.fullName;

      // Gửi yêu cầu đăng nhập Google lên Backend Platform (Identity Service)
      const res = await authApi.loginGoogle({
        idToken: googleData?.idToken,
        accessToken: googleData?.accessToken,
        email,
        fullName,
        avatar: googleData?.avatar,
      });

      if (res.success && res.data) {
        const { accessToken, refreshToken, user: rawUser } = res.data as any;
        if (accessToken) {
          tokenStorage.setTokens({ accessToken, refreshToken: refreshToken || '' });
        }

        const isNewUser = Boolean((res.data as any).isNewUser);
        let userData: UserSession = rawUser
          ? {
              ...rawUser,
              isNewUser,
              hasCompletedOnboarding: rawUser.hasCompletedOnboarding ?? !isNewUser,
            }
          : {
              id: `google_${(email || 'user').replace(/[^a-zA-Z0-9]/g, '_')}`,
              email: email || '',
              fullName: fullName || 'Người dùng Google',
              name: fullName || 'Người dùng Google',
              role: 'USER',
              hasCompletedOnboarding: !isNewUser,
              isNewUser,
              avatar: googleData?.avatar,
            };

        userData = (await hydrateBusiness(userData)) || userData;
        setUser(userData);

        if (userData.id) {
          getTracker().setUserId(userData.id);
        }

        setIsLoading(false);
        return { success: true, user: userData };
      }

      // Nếu API trả về lỗi
      const errorMsg = res.error?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.';
      setAuthError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ khi đăng nhập Google.';
      setAuthError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  };

  const value: AuthContextType = useMemo(
    () => ({
      user,
      setUser,
      isLoggedIn,
      isLoading,
      authError,
      activeBusinessId,
      setActiveBusinessId,
      login,
      loginWithGoogle,
      logout,
      register,
      changePassword,
      verifyEmail,
      resendVerification,
      refreshBusiness,
      updateUserProfile,
      completeOnboarding,
      hasRole,
      hasPermission,
      can: (permission: string, bizId?: string) => canPermission(permission, bizId || activeBusinessId || undefined, user),
    }),
    [user, isLoggedIn, isLoading, authError, activeBusinessId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
