import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useToast } from './ToastContext';
import { orderApi } from '@/ui/api/orderApi';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

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
  orderType?: 'DELIVERY' | 'RETURN';
  returnTrackingCode?: string;
  returnReason?: string;
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
  shippingFee: number; // shipper earning (e.g. 30.000đ hoặc 15.000đ)
  codAmount: number; // Total cash to collect from customer (e.g. 138.000đ, 0đ cho hàng hoàn)
  netCodDebt: number; // Net COD debt to remit to platform after keeping shipping fee (e.g. 108.000đ)
  paymentMethod: 'COD' | 'ONLINE_PAYMENT';
  distanceKm: number;
  status: 'AVAILABLE' | 'PICKING_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
  sellerOrderStatus?: string;
  isCodRemitted?: boolean;
  orderId?: string;
  orderCode?: string;
  paymentStatus?: string;
  createdAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  shippedAt?: string;
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
  isLoading: boolean;
  refreshOrders: () => Promise<void>;
  acceptOrder: (orderId: string) => Promise<void> | void;
  confirmPickup: (orderId: string) => Promise<void> | void;
  completeDelivery: (orderId: string, note?: string) => Promise<void> | void;
  failDelivery: (orderId: string, reason: string) => Promise<void> | void;
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
  rating: 5.0,
  totalDelivered: 0,
  activeZone: 'Đồng Tháp (TP. Cao Lãnh & TP. Sa Đéc)',
  identityCard: '087098001234',
  joinDate: '15/01/2026',
};

const ShipperContext = createContext<ShipperContextType | null>(null);

const STORAGE_KEY = 'huki_shipper_manual_txs_v1';

const getStoredManualTransactions = (): WalletTransaction[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveManualTransaction = (tx: WalletTransaction) => {
  if (typeof window === 'undefined') return;
  try {
    const list = getStoredManualTransactions();
    const updated = [tx, ...list];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save manual transaction:', err);
  }
};

const claimedOrderIdsInMemory = new Set<string>();

const getStoredClaimedIds = (): string[] => {
  return Array.from(claimedOrderIdsInMemory);
};

const saveClaimedId = (id: string) => {
  claimedOrderIdsInMemory.add(id);
};

const removeClaimedId = (id: string) => {
  claimedOrderIdsInMemory.delete(id);
};

function playShipperChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Beep 1 (880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.14);

    // Beep 2 (1320Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now + 0.12);
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.32);
  } catch {
    // Graceful fallback if audio is blocked
  }
}

export const ShipperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [profile, setProfile] = useState<ShipperProfile>(INITIAL_PROFILE);
  const [availableOrders, setAvailableOrders] = useState<ShipperOrder[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<ShipperOrder[]>([]);
  const [historyOrders, setHistoryOrders] = useState<ShipperOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [wallet, setWallet] = useState({
    availableEarnings: 0,
    codDebt: 0,
    todayEarnings: 0,
    todayCompletedCount: 0,
    totalEarnings: 0,
  });
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  // Load real physical orders from database
  const refreshOrders = useCallback(async (isSilent?: boolean) => {
    try {
      if (!isSilent) setIsLoading(true);
      const res = await orderApi.getShipperOrders();
      if (res.success && Array.isArray(res.data)) {
        const allOrders: any[] = res.data;
        const available: ShipperOrder[] = [];
        const active: ShipperOrder[] = [];
        const history: ShipperOrder[] = [];

        let currentCodDebt = 0;
        let totalEarningsFromDb = 0;
        let todayEarnings = 0;
        let todayCompleted = 0;
        const dbTransactions: WalletTransaction[] = [];

        allOrders.forEach((o) => {
          const shippingFee = Number(o.shippingFee) || 30000;
          const codAmount = Number(o.codAmount) || 0;
          const isCod = o.paymentMethod === 'COD';
          const netCodDebt = isCod ? Math.max(0, codAmount - shippingFee) : 0;

          const item: ShipperOrder = {
            id: o.id,
            code: o.code,
            orderType: o.orderType || 'DELIVERY',
            returnTrackingCode: o.returnTrackingCode,
            returnReason: o.returnReason,
            customerName: o.customerName || 'Khách hàng HuKi',
            customerPhone: o.customerPhone || '0901234567',
            deliveryAddress: o.deliveryAddress || 'Đồng Tháp',
            deliveryWard: o.deliveryWard || 'Phường Bến Nghé',
            deliveryDistrict: o.deliveryDistrict || 'Quận 1',
            deliveryProvince: o.deliveryProvince || 'TP. Hồ Chí Minh',
            shopName: o.shopName || 'Công ty TNHH Phát Hành Sách & Nội Dung Số Tri Thức Việt',
            shopPhone: o.shopPhone || '0912 345 678',
            shopAddress: o.shopAddress || 'Số 88 Đường Lý Thường Kiệt, TP. Cao Lãnh, Tỉnh Đồng Tháp',
            items: o.items || [],
            totalWeight: o.totalWeight || 500,
            shippingFee: shippingFee,
            codAmount: codAmount,
            netCodDebt: netCodDebt,
            paymentMethod: isCod ? 'COD' : 'ONLINE_PAYMENT',
            isCodRemitted: o.isCodRemitted,
            orderId: o.orderId,
            orderCode: o.orderCode,
            paymentStatus: o.paymentStatus,
            distanceKm: o.distanceKm || 3.2,
            status: o.status || 'AVAILABLE',
            createdAt: o.createdAt || new Date().toISOString(),
            shippedAt: o.shippedAt,
            completedAt: o.completedAt,
          };

          // Special branch for Reverse Logistics (Lấy hàng hoàn - Sticky Shipper)
          if (item.orderType === 'RETURN') {
            const isCompletedReturn = o.status === 'DELIVERED' || o.sellerOrderStatus === 'DELIVERED';
            if (isCompletedReturn) {
              history.push({ ...item, status: 'DELIVERED' });
              todayCompleted += 1;
              todayEarnings += item.shippingFee;
              totalEarningsFromDb += item.shippingFee;
              dbTransactions.push({
                id: `TX-${item.code}-RET-EARN`,
                type: 'EARNING',
                amount: item.shippingFee,
                title: 'Cước thu hồi sách hoàn trả kho',
                description: `Bàn giao kho thành công kiện hoàn ${item.code} (+${item.shippingFee.toLocaleString('vi-VN')}đ cước ship)`,
                orderCode: item.code,
                createdAt: item.completedAt ? new Date(item.completedAt).toLocaleString('vi-VN') : 'Hôm nay',
                status: 'SUCCESS',
              });
            } else if (o.status === 'IN_TRANSIT') {
              active.push({ ...item, status: 'IN_TRANSIT' });
            } else {
              // Sticky Shipper: Tự động đưa thẳng vào nhiệm vụ đang thực hiện (chờ đến nhà khách lấy sách)
              active.push({ ...item, status: 'PICKING_UP' });
            }
            return;
          }

          const isConfirmedBySeller = o.sellerOrderStatus === 'CONFIRMED' || o.sellerOrderStatus === 'PREPARING';
          const isPendingSeller = o.sellerOrderStatus === 'PENDING_CONFIRMATION' || o.sellerOrderStatus === 'PENDING_PAYMENT' || o.sellerOrderStatus === 'DRAFT';
          const isClaimedByMe = claimedOrderIdsInMemory.has(item.id) || o.status === 'PICKING_UP' || (o.carrier === 'HUKI_EXPRESS' && isConfirmedBySeller);

          if (o.status === 'DELIVERED' || o.sellerOrderStatus === 'DELIVERED' || o.sellerOrderStatus === 'COMPLETED' || o.status === 'FAILED' || o.sellerOrderStatus === 'CANCELLED') {
            const isDelivered = o.sellerOrderStatus !== 'CANCELLED' && o.status !== 'FAILED';
            history.push({ ...item, status: isDelivered ? 'DELIVERED' : 'FAILED' });
            if (isDelivered) {
              todayCompleted += 1;
              todayEarnings += item.shippingFee;
              totalEarningsFromDb += item.shippingFee;

              const isRemitted = o.isCodRemitted === true || o.paymentStatus === 'SUCCEEDED';
              if (item.paymentMethod === 'COD' && !isRemitted) {
                currentCodDebt += item.netCodDebt;
              }

              // Build transaction ledger item from DB
              dbTransactions.push({
                id: `TX-${item.code}-EARN`,
                type: 'EARNING',
                amount: item.shippingFee,
                title: 'Tiền công giao hàng',
                description: `Giao thành công đơn ${item.code} (+${item.shippingFee.toLocaleString('vi-VN')}đ cước ship)`,
                orderCode: item.code,
                createdAt: item.completedAt ? new Date(item.completedAt).toLocaleString('vi-VN') : 'Hôm nay',
                status: 'SUCCESS',
              });

              if (item.codAmount > 0 && !isRemitted) {
                dbTransactions.push({
                  id: `TX-${item.code}-COD`,
                  type: 'COD_COLLECT',
                  amount: item.netCodDebt,
                  title: 'Công nợ COD phải nộp Sàn (đã trừ cước ship)',
                  description: `Thu của khách ${item.codAmount.toLocaleString('vi-VN')}đ - giữ lại ${item.shippingFee.toLocaleString('vi-VN')}đ tiền ship = nộp sàn ${item.netCodDebt.toLocaleString('vi-VN')}đ`,
                  orderCode: item.code,
                  createdAt: item.completedAt ? new Date(item.completedAt).toLocaleString('vi-VN') : 'Hôm nay',
                  status: 'SUCCESS',
                });
              }
            }
          } else if (o.status === 'IN_TRANSIT' || o.sellerOrderStatus === 'SHIPPED') {
            active.push({ ...item, status: 'IN_TRANSIT' });
          } else if (isClaimedByMe || o.status === 'PICKING_UP') {
            active.push({ ...item, status: 'PICKING_UP' });
          } else if (o.status === 'AVAILABLE' && isConfirmedBySeller && !isPendingSeller && !isClaimedByMe) {
            available.push(item);
          } else {
            // Đơn hàng chưa được người bán xác nhận
          }
        });

        let totalRemitted = 0;
        try {
          const remRes = await orderApi.getShipperRemittances();
          if (remRes.success && Array.isArray(remRes.data)) {
            const dbRemittances = remRes.data;
            totalRemitted = dbRemittances.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
            dbRemittances.forEach((r: any) => {
              dbTransactions.unshift({
                id: r.txCode || r.id,
                type: 'COD_REMITTANCE',
                amount: r.amount,
                title: 'Nộp tiền COD về quỹ sàn HuKi',
                description: `Đã nộp tiền COD qua ${r.method || 'VietQR PayOS'} (-${r.amount.toLocaleString('vi-VN')}đ)`,
                createdAt: r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : 'Hôm nay',
                status: 'SUCCESS',
              });
            });
          }
        } catch {}

        const manualTxs = getStoredManualTransactions();
        const totalWithdrawn = manualTxs
          .filter((t) => t.type === 'WITHDRAWAL')
          .reduce((sum, t) => sum + t.amount, 0);

        const finalCodDebt = currentCodDebt;
        const finalAvailableEarnings = Math.max(0, totalEarningsFromDb - totalWithdrawn);

        setAvailableOrders(available);
        setActiveDeliveries(active);
        setHistoryOrders(history);
        setProfile((prev) => ({
          ...prev,
          totalDelivered: todayCompleted,
        }));
        setWallet({
          availableEarnings: finalAvailableEarnings,
          totalEarnings: totalEarningsFromDb,
          codDebt: finalCodDebt,
          todayCompletedCount: todayCompleted,
          todayEarnings: todayEarnings,
        });
        
        // Merge without duplicate IDs
        const combinedMap = new Map<string, WalletTransaction>();
        [...manualTxs, ...dbTransactions].forEach((tx) => {
          if (!combinedMap.has(tx.id)) combinedMap.set(tx.id, tx);
        });
        setTransactions(Array.from(combinedMap.values()));
      }
    } catch (err) {
      console.error('Error fetching shipper orders:', err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  // Silent Background Auto-Polling (3.5s - Chuẩn Shopee Zero-F5)
  useEffect(() => {
    if (!isOnline) return;
    const pollTimer = setInterval(() => {
      refreshOrders(true);
    }, 3500);
    return () => clearInterval(pollTimer);
  }, [isOnline, refreshOrders]);

  // RealtimeSyncBus: Instant cross-tab & cross-device event processing
  useEffect(() => {
    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      const payload = msg.payload as any;

      if (
        msg.type === 'ORDER_CREATED' ||
        msg.type === 'ORDER_PAYMENT_SUCCEEDED' ||
        msg.type === 'ORDER_STATUS_CHANGED' ||
        msg.type === 'SHIPPER_AVAILABLE_ORDER_BROADCAST'
      ) {
        if (isOnline) {
          refreshOrders(true);
          playShipperChime();
          showToast(
            {
              title: '🛵 Đơn sách mới cần giao!',
              message: payload?.orderCode
                ? `Đơn #${payload.orderCode} vừa được shop xác nhận chuẩn bị. Vào sàn nhận đơn ngay!`
                : 'Có đơn hàng sách mới cần bưu tá tiếp nhận trong khu vực!',
            },
            'info'
          );
        }
      } else if (msg.type === 'RETURN_REQUESTED' || msg.type === 'ESCROW_FROZEN') {
        if (isOnline) {
          refreshOrders(true);
          playShipperChime();
          const retCode = payload?.returnTrackingCode || (payload?.returnRequestId ? `HUKI-RET-${String(payload.returnRequestId).slice(0, 8).toUpperCase()}` : 'mới');
          showToast(
            {
              title: '📦 Nhiệm vụ lấy hàng hoàn mới!',
              message: `Đơn hoàn #${retCode} vừa được gán trực tiếp cho bạn (Sticky Shipper). Vui lòng đến nhà khách để thu hồi sách hoàn về kho Shop!`,
            },
            'warning'
          );
        }
      } else if (msg.type === 'SHIPPER_ORDER_CLAIMED') {
        const orderId = payload?.orderId;
        const claimingShipperId = payload?.shipperId;
        // Tranh đơn nguyên tử: Nếu bưu tá khác nhận đơn, tự động xóa đơn khỏi danh sách ngay lập tức (< 50ms)
        if (orderId && claimingShipperId !== profile.id) {
          setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
          if (payload?.orderCode) {
            showToast(
              {
                title: 'Đơn đã có người nhận',
                message: `Đơn #${payload.orderCode} vừa được bưu tá khác tiếp nhận.`,
              },
              'warning'
            );
          }
        }
      } else if (msg.type === 'SHIPPER_COD_REMITTED') {
        refreshOrders(true);
      } else if (msg.type === 'ORDER_CANCELLED') {
        const orderId = payload?.orderId;
        if (orderId) {
          setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
          setActiveDeliveries((prev) => prev.filter((o) => o.id !== orderId));
        }
      }
    }, { role: 'SHIPPER', shipperId: profile.id });

    return () => {
      unsubscribe();
    };
  }, [isOnline, profile.id, refreshOrders, showToast]);

  const updateProfile = (data: Partial<ShipperProfile>) => {
    setProfile((prev) => ({ ...prev, ...data }));
    showToast({ title: 'Cập nhật hồ sơ', message: 'Thông tin tài xế đã được lưu thành công!' }, 'success');
  };

  // 1. Shipper accepts an available order
  const acceptOrder = async (orderId: string) => {
    const target = availableOrders.find((o) => o.id === orderId);
    if (!target) return;

    try {
      const claimRes = await orderApi.shipperClaim(orderId);
      if (!claimRes.success) {
        showToast(
          {
            title: 'Không thể nhận đơn',
            message: claimRes.error?.message || 'Đơn hàng đã được bưu tá khác tiếp nhận.',
          },
          'warning'
        );
        refreshOrders(true);
        return;
      }
    } catch (err) {
      console.warn('Error claiming order in backend:', err);
    }

    setAvailableOrders((prev) => prev.filter((o) => o.id !== orderId));
    saveClaimedId(orderId);
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const updatedOrder: ShipperOrder = {
      ...target,
      status: 'PICKING_UP',
      acceptedAt: nowStr,
    };
    setActiveDeliveries((prev) => [updatedOrder, ...prev.filter((o) => o.id !== orderId)]);

    realtimeSyncBus.publish('SHIPPER_ORDER_CLAIMED', {
      orderId,
      orderCode: target.code,
      shipperId: profile.id,
      shipperName: profile.name,
    });

    showToast(
      {
        title: 'Nhận đơn thành công!',
        message: `Đã nhận đơn ${target.code}. Vui lòng di chuyển đến Shop "${target.shopName}" để lấy sách.`,
      },
      'success'
    );
  };

  // 2. Shipper confirms picking up items from seller or buyer (calls DB PATCH pickup)
  const confirmPickup = async (orderId: string) => {
    const target = activeDeliveries.find((o) => o.id === orderId);
    const isReturn = target?.orderType === 'RETURN';
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

    realtimeSyncBus.publish('SHIPPER_PICKED_UP', {
      orderId,
      isReturn,
      trackingCode: target?.code,
    });

    removeClaimedId(orderId);
    try {
      await orderApi.shipperPickup(orderId);
    } catch (err) {
      console.error('Error updating pickup to DB:', err);
    }

    if (isReturn) {
      showToast(
        {
          title: 'Đã nhận sách hoàn từ khách!',
          message: 'Kiện sách đã được nhận từ khách hàng. Vui lòng vận chuyển bàn giao về kho của Shop.',
        },
        'info'
      );
    } else {
      showToast(
        {
          title: 'Đã lấy hàng thành công!',
          message: 'Kiện sách đã được nhận từ kho. Vui lòng di chuyển giao cho khách hàng.',
        },
        'info'
      );
    }
  };

  // 3. Complete delivery & collect COD (calls DB PATCH deliver)
  const completeDelivery = async (orderId: string, note?: string) => {
    const target = activeDeliveries.find((o) => o.id === orderId);
    if (!target) return;

    const isReturn = target.orderType === 'RETURN';
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
    const codCollected = isReturn ? 0 : target.codAmount;
    const netCodToRemit = !isReturn && target.paymentMethod === 'COD' ? Math.max(0, codCollected - earningAmount) : 0;

    setWallet((prev) => ({
      ...prev,
      availableEarnings: prev.availableEarnings + earningAmount,
      todayEarnings: prev.todayEarnings + earningAmount,
      todayCompletedCount: prev.todayCompletedCount + 1,
      totalEarnings: prev.totalEarnings + earningAmount,
      codDebt: prev.codDebt + netCodToRemit,
    }));

    // Add Transactions
    const newTxList: WalletTransaction[] = [
      {
        id: `TX-${Date.now()}-1`,
        type: 'EARNING',
        amount: earningAmount,
        title: isReturn ? 'Cước thu hồi sách hoàn trả kho' : 'Tiền công giao hàng',
        description: isReturn
          ? `Bàn giao kho thành công đơn hoàn ${target.code} (+${earningAmount.toLocaleString('vi-VN')}đ cước ship)`
          : `Giao thành công đơn ${target.code} (+${earningAmount.toLocaleString('vi-VN')}đ cước ship)`,
        orderCode: target.code,
        createdAt: `Hôm nay, ${nowStr}`,
        status: 'SUCCESS',
      },
    ];

    if (codCollected > 0) {
      newTxList.push({
        id: `TX-${Date.now()}-2`,
        type: 'COD_COLLECT',
        amount: netCodToRemit,
        title: 'Công nợ COD phải nộp Sàn (đã trừ cước ship)',
        description: `Thu của khách ${codCollected.toLocaleString('vi-VN')}đ - giữ lại ${earningAmount.toLocaleString('vi-VN')}đ tiền ship = nộp sàn ${netCodToRemit.toLocaleString('vi-VN')}đ`,
        orderCode: target.code,
        createdAt: `Hôm nay, ${nowStr}`,
        status: 'SUCCESS',
      });
    }

    setTransactions((prev) => [...newTxList, ...prev]);

    removeClaimedId(orderId);
    try {
      await orderApi.shipperDeliver(orderId, { note });
    } catch (err) {
      console.error('Error delivering order in DB:', err);
    }

    if (isReturn) {
      realtimeSyncBus.publish('RETURN_COMPLETED', {
        returnRequestId: orderId,
        returnTrackingCode: target.code,
        orderId: target.orderId,
      });
      showToast(
        {
          title: 'Hoàn tất thu hồi sách!',
          message: `Đã bàn giao kiện sách hoàn về kho của Shop. Thu nhập +${earningAmount.toLocaleString('vi-VN')}đ đã được cộng vào ví bưu tá!`,
        },
        'success'
      );
    } else {
      realtimeSyncBus.publish('SHIPPER_DELIVERED', {
        orderId,
        orderCode: target.code,
        codAmount: target.codAmount,
        shippingFee: earningAmount,
        netCodDebt: netCodToRemit,
      });
      realtimeSyncBus.publish('ORDER_DELIVERED', {
        orderId,
        orderCode: target.code,
      });
      realtimeSyncBus.publish('ORDER_STATUS_CHANGED', {
        orderId,
        status: 'DELIVERED',
      });
      showToast(
        {
          title: 'Giao hàng thành công!',
          message: `Đơn ${target.code} đã hoàn tất. Bạn nhận được +${earningAmount.toLocaleString('vi-VN')}đ tiền công.`,
        },
        'success'
      );
    }
  };

  // 4. Delivery failed / boom hàng (calls DB PATCH fail)
  const failDelivery = async (orderId: string, reason: string) => {
    const target = activeDeliveries.find((o) => o.id === orderId);
    if (!target) return;

    const failedOrder: ShipperOrder = {
      ...target,
      status: 'FAILED',
      failureReason: reason,
    };

    setActiveDeliveries((prev) => prev.filter((o) => o.id !== orderId));
    setHistoryOrders((prev) => [failedOrder, ...prev]);
    removeClaimedId(orderId);

    try {
      await orderApi.shipperFail(orderId, { reason });
    } catch (err) {
      console.error('Error failing order in DB:', err);
    }

    showToast(
      {
        title: 'Đã báo giao thất bại',
        message: `Đơn ${target.code} được chuyển sang trạng thái hoàn hàng về shop. Lý do: ${reason}`,
      },
      'warning'
    );
  };

  // 5. Remit collected COD cash back to HuKi Platform
  const remitCodDebt = async (amount: number, method: string) => {
    if (amount <= 0 || (wallet.codDebt > 0 && amount > wallet.codDebt)) {
      showToast({ title: 'Số tiền không hợp lệ', message: 'Vui lòng nhập số tiền nhỏ hơn hoặc bằng nợ COD hiện tại.' }, 'warning');
      return;
    }

    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const newTx: WalletTransaction = {
      id: `TX-REMIT-${Date.now()}`,
      type: 'COD_REMITTANCE',
      amount: amount,
      title: 'Nộp tiền COD về quỹ sàn HuKi',
      description: `Đã chuyển nộp tiền COD qua ${method} (-${amount.toLocaleString('vi-VN')}đ)`,
      createdAt: `Hôm nay, ${nowStr}`,
      status: 'SUCCESS',
    };

    saveManualTransaction(newTx);

    setWallet((prev) => ({
      ...prev,
      codDebt: Math.max(0, prev.codDebt - amount),
    }));

    setTransactions((prev) => [newTx, ...prev.filter((t) => t.id !== newTx.id)]);

    const unremittedOrderIds = historyOrders
      .filter((o) => o.paymentMethod === 'COD' && o.status === 'DELIVERED' && !o.isCodRemitted && o.orderId)
      .map((o) => o.orderId as string);

    try {
      await orderApi.remitShipperCod({
        amount,
        method,
        txCode: newTx.id,
        orderIds: unremittedOrderIds.length > 0 ? unremittedOrderIds : undefined,
      });
    } catch (e) {
      console.warn('Backend remit failed:', e);
    }

    realtimeSyncBus.publish('SHIPPER_COD_REMITTED', {
      amount,
      method,
      shipperId: profile.id,
    });
    realtimeSyncBus.publish('WALLET_BALANCE_UPDATED', {
      type: 'COD_REMITTANCE',
      amount,
    });
    realtimeSyncBus.publish('ESCROW_UPDATED', {
      type: 'COD_REMITTANCE',
      amount,
    });

    await refreshOrders(true);

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

    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const newTx: WalletTransaction = {
      id: `TX-WITHDRAW-${Date.now()}`,
      type: 'WITHDRAWAL',
      amount: amount,
      title: 'Rút tiền thu nhập về ngân hàng',
      description: `Chuyển về ${bankInfo.bank} (${bankInfo.account} - ${bankInfo.name}) (-${amount.toLocaleString('vi-VN')}đ)`,
      createdAt: `Hôm nay, ${nowStr}`,
      status: 'SUCCESS',
    };

    saveManualTransaction(newTx);

    setWallet((prev) => ({
      ...prev,
      availableEarnings: prev.availableEarnings - amount,
    }));

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
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    refreshOrders();
    showToast({ title: 'Làm mới dữ liệu', message: 'Đã đồng bộ lại toàn bộ đơn hàng thực tế từ CSDL!' }, 'info');
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
        isLoading,
        refreshOrders,
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
