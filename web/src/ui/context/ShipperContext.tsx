"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from './ToastContext';

export interface ShipperProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  vehicleType: string;
  licensePlate: string;
  rating: number;
  totalDelivered: number;
  activeZone: string;
  identityCard: string;
  joinDate: string;
}

export interface ShipperOrder {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryWard: string;
  deliveryDistrict: string;
  deliveryProvince: string;
  shopName: string;
  shopPhone: string;
  shopAddress: string;
  items: Array<{
    title: string;
    quantity: number;
    format: string;
    coverUrl?: string;
  }>;
  totalWeight: number; // in grams
  shippingFee: number; // shipper earning (e.g. 25.000đ - 35.000đ)
  codAmount: number; // Cash to collect from customer (0 if prepaid online)
  paymentMethod: 'COD' | 'ONLINE_PAYMENT';
  distanceKm: number;
  status: 'AVAILABLE' | 'PICKING_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
  createdAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  completedAt?: string;
  failureReason?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'EARNING' | 'WITHDRAWAL' | 'COD_COLLECT' | 'COD_REMITTANCE';
  amount: number;
  title: string;
  description: string;
  orderCode?: string;
  createdAt: string;
  status: 'SUCCESS' | 'PENDING';
}

export interface ShipperContextType {
  isOnline: boolean;
  setIsOnline: (val: boolean) => void;
  profile: ShipperProfile;
  updateProfile: (data: Partial<ShipperProfile>) => void;
  availableOrders: ShipperOrder[];
  activeDeliveries: ShipperOrder[];
  historyOrders: ShipperOrder[];
  wallet: {
    availableEarnings: number;
    codDebt: number;
    todayEarnings: number;
    todayCompletedCount: number;
    totalEarnings: number;
  };
  transactions: WalletTransaction[];
  acceptOrder: (orderId: string) => void;
  confirmPickup: (orderId: string) => void;
  completeDelivery: (orderId: string, note?: string) => void;
  failDelivery: (orderId: string, reason: string) => void;
  remitCodDebt: (amount: number, method: string) => void;
  requestWithdrawal: (amount: number, bankInfo: { bank: string; account: string; name: string }) => void;
  resetDemoData: () => void;
}

const INITIAL_PROFILE: ShipperProfile = {
  id: 'SHIPPER-8899',
  name: 'Nguyễn Văn Hưng',
  phone: '0988 776 655',
  email: 'shipper.hung@huki.vn',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  vehicleType: 'Xe máy Honda Wave Alpha 110cc',
  licensePlate: '66-F1 987.65',
  rating: 4.95,
  totalDelivered: 148,
  activeZone: 'Đồng Tháp (TP. Cao Lãnh & TP. Sa Đéc)',
  identityCard: '087098001234',
  joinDate: '15/01/2026',
};

const INITIAL_AVAILABLE_ORDERS: ShipperOrder[] = [
  {
    id: 'SHIP-ORD-101',
    code: 'ORD-2026-8801',
    customerName: 'Huỳnh Gia Huy',
    customerPhone: '0912 345 678',
    deliveryAddress: '123 Đường Nguyễn Huệ, Phường 2',
    deliveryWard: 'Phường 2',
    deliveryDistrict: 'TP. Cao Lãnh',
    deliveryProvince: 'Đồng Tháp',
    shopName: 'Nhà Sách HuKi Miền Tây',
    shopPhone: '0277 388 999',
    shopAddress: '45 Đường Hùng Vương, Phường 1, TP. Cao Lãnh',
    items: [
      { title: 'Tư Duy Nhanh Và Chậm (Bìa Cứng)', quantity: 1, format: 'Sách In Bìa Cứng', coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=150&q=80' },
      { title: 'Đắc Nhân Tâm (Bản Đặc Biệt)', quantity: 1, format: 'Sách In Bìa Mềm', coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=150&q=80' },
    ],
    totalWeight: 850,
    shippingFee: 32000,
    codAmount: 285000,
    paymentMethod: 'COD',
    distanceKm: 2.8,
    status: 'AVAILABLE',
    createdAt: 'Hôm nay, 10:15',
  },
  {
    id: 'SHIP-ORD-102',
    code: 'ORD-2026-8802',
    customerName: 'Lê Minh Khang',
    customerPhone: '0938 112 233',
    deliveryAddress: '88 Đường Lý Thường Kiệt, Phường 4',
    deliveryWard: 'Phường 4',
    deliveryDistrict: 'TP. Cao Lãnh',
    deliveryProvince: 'Đồng Tháp',
    shopName: 'HuKi Official Store',
    shopPhone: '1900 8866',
    shopAddress: '12 Đường 30/4, Phường 1, TP. Cao Lãnh',
    items: [
      { title: 'Từ Không Đến Một (Zero to One)', quantity: 1, format: 'Sách In', coverUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=150&q=80' },
    ],
    totalWeight: 420,
    shippingFee: 26000,
    codAmount: 145000,
    paymentMethod: 'COD',
    distanceKm: 1.9,
    status: 'AVAILABLE',
    createdAt: 'Hôm nay, 10:45',
  },
  {
    id: 'SHIP-ORD-103',
    code: 'ORD-2026-8803',
    customerName: 'Trần Thị Mai',
    customerPhone: '0977 445 566',
    deliveryAddress: '56 Đường Tôn Đức Thắng, Phường 1',
    deliveryWard: 'Phường 1',
    deliveryDistrict: 'TP. Cao Lãnh',
    deliveryProvince: 'Đồng Tháp',
    shopName: 'Sách Nhã Nam Flagship',
    shopPhone: '028 3822 4455',
    shopAddress: 'Bưu Cục HuKi Hub Cao Lãnh, Đồng Tháp',
    items: [
      { title: 'Nhà Giả Kim (Ấn bản kỷ niệm)', quantity: 2, format: 'Sách In', coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=150&q=80' },
    ],
    totalWeight: 600,
    shippingFee: 28000,
    codAmount: 0,
    paymentMethod: 'ONLINE_PAYMENT',
    distanceKm: 3.4,
    status: 'AVAILABLE',
    createdAt: 'Hôm nay, 11:20',
  },
];

const INITIAL_ACTIVE_ORDERS: ShipperOrder[] = [
  {
    id: 'SHIP-ORD-100',
    code: 'ORD-2026-8799',
    customerName: 'Phạm Hoàng Nam',
    customerPhone: '0909 888 777',
    deliveryAddress: '234 Đường Điện Biên Phủ, Phường Mỹ Phú',
    deliveryWard: 'Phường Mỹ Phú',
    deliveryDistrict: 'TP. Cao Lãnh',
    deliveryProvince: 'Đồng Tháp',
    shopName: 'Thế Giới Sách Tri Thức',
    shopPhone: '0277 366 888',
    shopAddress: '15 Đường Lê Lợi, Phường 2, TP. Cao Lãnh',
    items: [
      { title: 'Khởi Nghiệp Tinh Gọn (The Lean Startup)', quantity: 1, format: 'Sách In', coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=150&q=80' },
    ],
    totalWeight: 510,
    shippingFee: 30000,
    codAmount: 189000,
    paymentMethod: 'COD',
    distanceKm: 2.1,
    status: 'IN_TRANSIT',
    createdAt: 'Hôm nay, 09:30',
    acceptedAt: '09:40',
    pickedUpAt: '09:55',
  },
];

const INITIAL_HISTORY_ORDERS: ShipperOrder[] = [
  {
    id: 'SHIP-ORD-099',
    code: 'ORD-2026-8788',
    customerName: 'Ngô Thanh Vân',
    customerPhone: '0903 555 666',
    deliveryAddress: '45 Đường Nguyễn Thái Học, Phường 4, TP. Cao Lãnh',
    deliveryWard: 'Phường 4',
    deliveryDistrict: 'TP. Cao Lãnh',
    deliveryProvince: 'Đồng Tháp',
    shopName: 'HuKi Official Store',
    shopPhone: '1900 8866',
    shopAddress: '12 Đường 30/4, Phường 1, TP. Cao Lãnh',
    items: [{ title: 'Hành Trình Về Phương Đông', quantity: 1, format: 'Sách In' }],
    totalWeight: 400,
    shippingFee: 25000,
    codAmount: 120000,
    paymentMethod: 'COD',
    distanceKm: 1.5,
    status: 'DELIVERED',
    createdAt: 'Hôm nay, 08:15',
    completedAt: '08:50',
  },
  {
    id: 'SHIP-ORD-098',
    code: 'ORD-2026-8780',
    customerName: 'Võ Minh Quân',
    customerPhone: '0918 222 333',
    deliveryAddress: '12 Đường Thiên Hộ Dương, Phường 6, TP. Cao Lãnh',
    deliveryWard: 'Phường 6',
    deliveryDistrict: 'TP. Cao Lãnh',
    deliveryProvince: 'Đồng Tháp',
    shopName: 'Nhà Sách Phương Nam',
    shopPhone: '0277 399 111',
    shopAddress: '50 Đường Hùng Vương, Phường 2, TP. Cao Lãnh',
    items: [{ title: 'Sapiens: Lược Sử Loài Người', quantity: 1, format: 'Sách In Bìa Cứng' }],
    totalWeight: 920,
    shippingFee: 35000,
    codAmount: 0,
    paymentMethod: 'ONLINE_PAYMENT',
    distanceKm: 4.2,
    status: 'DELIVERED',
    createdAt: 'Hôm qua, 16:20',
    completedAt: '17:10',
  },
];

const INITIAL_TRANSACTIONS: WalletTransaction[] = [
  {
    id: 'TX-1001',
    type: 'EARNING',
    amount: 25000,
    title: 'Tiền công giao hàng',
    description: 'Hoàn tất đơn hàng ORD-2026-8788',
    orderCode: 'ORD-2026-8788',
    createdAt: 'Hôm nay, 08:50',
    status: 'SUCCESS',
  },
  {
    id: 'TX-1002',
    type: 'COD_COLLECT',
    amount: 120000,
    title: 'Thu tiền mặt COD từ khách',
    description: 'Đã nhận 120.000đ tiền mặt đơn ORD-2026-8788',
    orderCode: 'ORD-2026-8788',
    createdAt: 'Hôm nay, 08:50',
    status: 'SUCCESS',
  },
  {
    id: 'TX-1003',
    type: 'EARNING',
    amount: 35000,
    title: 'Tiền công giao hàng',
    description: 'Hoàn tất đơn hàng ORD-2026-8780',
    orderCode: 'ORD-2026-8780',
    createdAt: 'Hôm qua, 17:10',
    status: 'SUCCESS',
  },
];

const ShipperContext = createContext<ShipperContextType | null>(null);

const STORAGE_KEY = 'huki_shipper_state_v1';

export const ShipperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [profile, setProfile] = useState<ShipperProfile>(INITIAL_PROFILE);
  const [availableOrders, setAvailableOrders] = useState<ShipperOrder[]>(INITIAL_AVAILABLE_ORDERS);
  const [activeDeliveries, setActiveDeliveries] = useState<ShipperOrder[]>(INITIAL_ACTIVE_ORDERS);
  const [historyOrders, setHistoryOrders] = useState<ShipperOrder[]>(INITIAL_HISTORY_ORDERS);
  const [wallet, setWallet] = useState({
    availableEarnings: 450000,
    codDebt: 120000,
    todayEarnings: 60000,
    todayCompletedCount: 2,
    totalEarnings: 3850000,
  });
  const [transactions, setTransactions] = useState<WalletTransaction[]>(INITIAL_TRANSACTIONS);

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.availableOrders) setAvailableOrders(parsed.availableOrders);
        if (parsed.activeDeliveries) setActiveDeliveries(parsed.activeDeliveries);
        if (parsed.historyOrders) setHistoryOrders(parsed.historyOrders);
        if (parsed.wallet) setWallet(parsed.wallet);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (typeof parsed.isOnline === 'boolean') setIsOnline(parsed.isOnline);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save to local storage
  const saveState = useCallback(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          isOnline,
          profile,
          availableOrders,
          activeDeliveries,
          historyOrders,
          wallet,
          transactions,
        })
      );
    } catch {
      // Ignore
    }
  }, [isOnline, profile, availableOrders, activeDeliveries, historyOrders, wallet, transactions]);

  useEffect(() => {
    saveState();
  }, [saveState]);

  const updateProfile = (data: Partial<ShipperProfile>) => {
    setProfile((prev) => ({ ...prev, ...data }));
    showToast({ title: 'Cập nhật hồ sơ', message: 'Thông tin tài xế đã được lưu thành công!' }, 'success');
  };

  // 1. Shipper accepts an available order
  const acceptOrder = (orderId: string) => {
    const target = availableOrders.find((o) => o.id === orderId);
    if (!target) return;

    setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const updatedOrder: ShipperOrder = {
      ...target,
      status: 'PICKING_UP',
      acceptedAt: nowStr,
    };
    setActiveDeliveries((prev) => [updatedOrder, ...prev]);

    showToast(
      {
        title: 'Nhận đơn thành công!',
        message: `Đã nhận đơn ${target.code}. Vui lòng di chuyển đến Shop "${target.shopName}" để lấy sách.`,
      },
      'success'
    );
  };

  // 2. Shipper confirms picking up items from seller
  const confirmPickup = (orderId: string) => {
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setActiveDeliveries((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'IN_TRANSIT',
              pickedUpAt: nowStr,
            }
          : o
      )
    );

    showToast(
      {
        title: 'Đã lấy hàng thành công!',
        message: 'Kiện sách đã được nhận. Vui lòng di chuyển giao cho khách hàng.',
      },
      'info'
    );
  };

  // 3. Complete delivery & collect COD
  const completeDelivery = (orderId: string, note?: string) => {
    const target = activeDeliveries.find((o) => o.id === orderId);
    if (!target) return;

    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const completedOrder: ShipperOrder = {
      ...target,
      status: 'DELIVERED',
      completedAt: nowStr,
    };

    setActiveDeliveries((prev) => prev.filter((o) => o.id !== orderId));
    setHistoryOrders((prev) => [completedOrder, ...prev]);

    // Update Wallet
    const earningAmount = target.shippingFee;
    const codCollected = target.codAmount;

    setWallet((prev) => ({
      ...prev,
      availableEarnings: prev.availableEarnings + earningAmount,
      todayEarnings: prev.todayEarnings + earningAmount,
      todayCompletedCount: prev.todayCompletedCount + 1,
      totalEarnings: prev.totalEarnings + earningAmount,
      codDebt: prev.codDebt + codCollected,
    }));

    // Add Transactions
    const newTxList: WalletTransaction[] = [
      {
        id: `TX-${Date.now()}-1`,
        type: 'EARNING',
        amount: earningAmount,
        title: 'Tiền công giao hàng',
        description: `Giao thành công đơn ${target.code} (+${earningAmount.toLocaleString('vi-VN')}đ)`,
        orderCode: target.code,
        createdAt: `Hôm nay, ${nowStr}`,
        status: 'SUCCESS',
      },
    ];

    if (codCollected > 0) {
      newTxList.push({
        id: `TX-${Date.now()}-2`,
        type: 'COD_COLLECT',
        amount: codCollected,
        title: 'Thu tiền mặt COD từ khách',
        description: `Đã thu ${codCollected.toLocaleString('vi-VN')}đ tiền mặt đơn ${target.code}`,
        orderCode: target.code,
        createdAt: `Hôm nay, ${nowStr}`,
        status: 'SUCCESS',
      });
    }

    setTransactions((prev) => [...newTxList, ...prev]);

    showToast(
      {
        title: 'Giao hàng thành công! 🎉',
        message: `+${earningAmount.toLocaleString('vi-VN')}đ tiền công đã cộng vào ví.${
          codCollected > 0 ? ` Đã ghi nhận thu hộ COD: ${codCollected.toLocaleString('vi-VN')}đ.` : ''
        }`,
      },
      'success'
    );
  };

  // 4. Delivery failed / boom hàng
  const failDelivery = (orderId: string, reason: string) => {
    const target = activeDeliveries.find((o) => o.id === orderId);
    if (!target) return;

    const failedOrder: ShipperOrder = {
      ...target,
      status: 'FAILED',
      failureReason: reason,
    };

    setActiveDeliveries((prev) => prev.filter((o) => o.id !== orderId));
    setHistoryOrders((prev) => [failedOrder, ...prev]);

    showToast(
      {
        title: 'Đã báo giao thất bại',
        message: `Đơn ${target.code} được chuyển sang trạng thái hoàn hàng về shop. Lý do: ${reason}`,
      },
      'warning'
    );
  };

  // 5. Remit collected COD cash back to HuKi Platform
  const remitCodDebt = (amount: number, method: string) => {
    if (amount <= 0 || amount > wallet.codDebt) {
      showToast({ title: 'Số tiền không hợp lệ', message: 'Vui lòng nhập số tiền nhỏ hơn hoặc bằng nợ COD hiện tại.' }, 'warning');
      return;
    }

    setWallet((prev) => ({
      ...prev,
      codDebt: Math.max(0, prev.codDebt - amount),
    }));

    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const newTx: WalletTransaction = {
      id: `TX-${Date.now()}`,
      type: 'COD_REMITTANCE',
      amount: amount,
      title: 'Nộp tiền COD về quỹ HuKi',
      description: `Đã chuyển nộp tiền COD qua ${method} (-${amount.toLocaleString('vi-VN')}đ)`,
      createdAt: `Hôm nay, ${nowStr}`,
      status: 'SUCCESS',
    };

    setTransactions((prev) => [newTx, ...prev]);

    showToast(
      {
        title: 'Nộp COD thành công!',
        message: `Đã đối soát và nộp ${amount.toLocaleString('vi-VN')}đ về quỹ sàn HuKi.`,
      },
      'success'
    );
  };

  // 6. Request withdrawal of earnings
  const requestWithdrawal = (amount: number, bankInfo: { bank: string; account: string; name: string }) => {
    if (amount <= 0 || amount > wallet.availableEarnings) {
      showToast({ title: 'Số dư không đủ', message: 'Số tiền rút vượt quá thu nhập khả dụng.' }, 'warning');
      return;
    }

    setWallet((prev) => ({
      ...prev,
      availableEarnings: prev.availableEarnings - amount,
    }));

    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const newTx: WalletTransaction = {
      id: `TX-${Date.now()}`,
      type: 'WITHDRAWAL',
      amount: amount,
      title: 'Rút tiền thu nhập về ngân hàng',
      description: `Chuyển về ${bankInfo.bank} (${bankInfo.account} - ${bankInfo.name})`,
      createdAt: `Hôm nay, ${nowStr}`,
      status: 'SUCCESS',
    };

    setTransactions((prev) => [newTx, ...prev]);

    showToast(
      {
        title: 'Lệnh rút tiền thành công!',
        message: `Đã chuyển ${amount.toLocaleString('vi-VN')}đ về tài khoản ngân hàng của bạn.`,
      },
      'success'
    );
  };

  const resetDemoData = () => {
    setProfile(INITIAL_PROFILE);
    setAvailableOrders(INITIAL_AVAILABLE_ORDERS);
    setActiveDeliveries(INITIAL_ACTIVE_ORDERS);
    setHistoryOrders(INITIAL_HISTORY_ORDERS);
    setWallet({
      availableEarnings: 450000,
      codDebt: 120000,
      todayEarnings: 60000,
      todayCompletedCount: 2,
      totalEarnings: 3850000,
    });
    setTransactions(INITIAL_TRANSACTIONS);
    setIsOnline(true);
    localStorage.removeItem(STORAGE_KEY);
    showToast({ title: 'Khôi phục dữ liệu mẫu', message: 'Đã làm mới toàn bộ đơn hàng và ví tiền Shipper!' }, 'info');
  };

  return (
    <ShipperContext.Provider
      value={{
        isOnline,
        setIsOnline,
        profile,
        updateProfile,
        availableOrders,
        activeDeliveries,
        historyOrders,
        wallet,
        transactions,
        acceptOrder,
        confirmPickup,
        completeDelivery,
        failDelivery,
        remitCodDebt,
        requestWithdrawal,
        resetDemoData,
      }}
    >
      {children}
    </ShipperContext.Provider>
  );
};

export const useShipper = (): ShipperContextType => {
  const context = useContext(ShipperContext);
  if (!context) {
    throw new Error('useShipper must be used within a ShipperProvider');
  }
  return context;
};
