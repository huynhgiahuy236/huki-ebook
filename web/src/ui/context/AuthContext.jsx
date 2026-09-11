import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { currentUser, sellerShop } from '../data/mockData';

const AuthContext = createContext();

export const DEMO_ACCOUNTS = {
  reader: {
    id: 'usr_001',
    name: 'Nguyễn Văn An',
    email: 'nguyenvanan@huki.vn',
    phone: '0912 345 678',
    role: 'Độc giả VIP (Gold)',
    roleKey: 'reader',
    permissions: ['catalog.read', 'library.read', 'orders.manage', 'profile.manage'],
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    joinedDate: '12/2023',
    hukiCoins: 1250,
    activeDevices: 3,
    maxDevices: 5,
    booksOwned: 18,
    streakDays: 14
  },
  seller: {
    id: 'usr_002',
    name: 'Alpha Books Official',
    email: 'contact@alphabooks.vn',
    phone: '0988 888 999',
    role: 'Nhà Xuất Bản / Tác Giả',
    roleKey: 'seller',
    sellerStatus: 'approved',
    permissions: ['catalog.read', 'library.read', 'orders.manage', 'profile.manage', 'seller.manage'],
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=200',
    joinedDate: '01/2022',
    hukiCoins: 58000,
    activeDevices: 5,
    maxDevices: 10,
    booksOwned: 142,
    streakDays: 45
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const persistedUser = window.localStorage.getItem('huki.session.user');
      return persistedUser ? JSON.parse(persistedUser) : null;
    } catch {
      return null;
    }
  });
  const isLoggedIn = Boolean(user);
  const [seller, setSeller] = useState(sellerShop);
  const [activeTab, setActiveTab] = useState('store'); // 'store' | 'community'
  const [pendingResetTarget, setPendingResetTarget] = useState('nguyenvanan@huki.vn');

  useEffect(() => {
    try {
      if (user) {
        window.localStorage.setItem('huki.session.user', JSON.stringify(user));
      } else {
        window.localStorage.removeItem('huki.session.user');
      }
    } catch {
      // The app still works when storage is unavailable (private mode, quota, etc.).
    }
  }, [user]);

  // Đăng nhập
  const login = (emailOrPhone, password) => {
    // Mock login validation
    const foundUser = Object.values(DEMO_ACCOUNTS).find(
      u => u.email.toLowerCase() === emailOrPhone.toLowerCase() || u.phone === emailOrPhone
    ) || {
      id: `usr_${Date.now()}`,
      name: emailOrPhone.split('@')[0] || 'Độc giả HUKI',
      email: emailOrPhone.includes('@') ? emailOrPhone : `${emailOrPhone}@huki.vn`,
      phone: emailOrPhone.includes('@') ? '0912 345 678' : emailOrPhone,
      role: 'Độc giả Thành viên',
      roleKey: 'reader',
      permissions: ['catalog.read', 'library.read', 'orders.manage', 'profile.manage'],
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
      joinedDate: 'Vừa tham gia',
      hukiCoins: 100,
      activeDevices: 1,
      maxDevices: 5,
      booksOwned: 0,
      streakDays: 1
    };

    setUser(foundUser);
    return { success: true, user: foundUser };
  };

  // Đăng xuất
  const logout = () => {
    setUser(null);
  };

  // Đăng ký mới
  const register = (formData) => {
    const newUser = {
      id: `usr_${Date.now()}`,
      name: formData.name || 'Độc giả HUKI Mới',
      email: formData.email,
      phone: formData.phone || '',
      role: 'Độc giả Thành viên mới',
      roleKey: 'reader',
      permissions: ['catalog.read', 'library.read', 'orders.manage', 'profile.manage'],
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
      joinedDate: 'Vừa tham gia',
      hukiCoins: 100, // Thưởng 100 xu tân thủ
      activeDevices: 1,
      maxDevices: 5,
      booksOwned: 1, // Tặng 1 Ebook khai phóng
      streakDays: 1,
      favoriteGenres: formData.favoriteGenres || []
    };

    setUser(newUser);
    return { success: true, user: newUser };
  };

  // Yêu cầu quên mật khẩu
  const forgotPassword = (emailOrPhone) => {
    setPendingResetTarget(emailOrPhone);
    return { success: true, target: emailOrPhone };
  };

  // Xác thực OTP
  const verifyOtp = (otpCode) => {
    // Bất kỳ mã 6 số nào hoặc mã 123456
    if (otpCode && otpCode.length === 6) {
      return { success: true };
    }
    return { success: false, message: 'Mã OTP không hợp lệ. Vui lòng thử lại!' };
  };

  // Đặt lại mật khẩu
  const resetPassword = (newPassword) => {
    if (newPassword && newPassword.length >= 6) {
      return { success: true };
    }
    return { success: false, message: 'Mật khẩu phải có tối thiểu 6 ký tự!' };
  };

  // Switch demo preset account
  const switchDemoAccount = (accountKey) => {
    if (accountKey === 'guest') {
      logout();
    } else if (DEMO_ACCOUNTS[accountKey]) {
      setUser(DEMO_ACCOUNTS[accountKey]);
    }
  };

  const hasRole = (allowedRoles) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return Boolean(user?.roleKey && roles.includes(user.roleKey));
  };

  const hasPermission = (permission) => Boolean(user?.permissions?.includes(permission));

  const value = useMemo(() => ({
    user,
    isLoggedIn,
    seller,
    activeTab,
    setActiveTab,
    pendingResetTarget,
    setPendingResetTarget,
    login,
    logout,
    register,
    forgotPassword,
    verifyOtp,
    resetPassword,
    switchDemoAccount,
    hasRole,
    hasPermission,
    DEMO_ACCOUNTS
  }), [user, isLoggedIn, seller, activeTab, pendingResetTarget]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
