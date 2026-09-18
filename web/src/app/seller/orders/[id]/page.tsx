"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { orderApi } from '@/ui/api/orderApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { can, PERMISSIONS } from '@/ui/utils/permissions';

const STATUS_CONFIG: Record<string, { label: string; bg: string; icon: string }> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', bg: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300', icon: 'pending' },
  PENDING_CONFIRMATION: { label: 'Chờ xác nhận', bg: 'bg-secondary-fixed text-on-secondary-fixed-variant border-secondary/30', icon: 'hourglass_top' },
  CONFIRMED: { label: 'Đã xác nhận', bg: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300', icon: 'check_circle' },
  PREPARING: { label: 'Đang đóng gói', bg: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300', icon: 'inventory' },
  SHIPPED: { label: 'Đang luân chuyển', bg: 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300', icon: 'local_shipping' },
  DELIVERED: { label: 'Đã giao hàng', bg: 'bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-300', icon: 'verified' },
  COMPLETED: { label: 'Hoàn tất', bg: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300', icon: 'task_alt' },
  CANCELLED: { label: 'Đã hủy', bg: 'bg-error-container text-on-error-container border-error/30', icon: 'cancel' },
  REFUNDED: { label: 'Đã hoàn tiền', bg: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300', icon: 'currency_exchange' },
};

const money = (val?: number) => `${Number(val || 0).toLocaleString('vi-VN')}đ`;
const dateTime = (val?: string) => (val ? new Date(val).toLocaleString('vi-VN') : '—');

interface OrderDetailItem {
  id?: string;
  bookId?: string;
  title?: string;
  bookTitle?: string;
  coverUrl?: string;
  coverImage?: string;
  bookCoverUrl?: string;
  format?: string;
  price?: number;
  unitPrice?: number;
  quantity?: number;
  subtotal?: number;
}

interface OrderTimelineEvent {
  id?: string;
  toStatus?: string;
  title?: string;
  description?: string;
  createdAt?: string;
}

interface SellerOrderDetailData {
  id: string;
  orderId?: string;
  code?: string;
  status: string;
  createdAt?: string;
  itemSubtotal?: number;
  voucherDiscount?: number;
  shippingFee?: number;
  grandTotal?: number;
  requiresShipping?: boolean;
  carrier?: string;
  trackingCode?: string;
  note?: string;
  customerNote?: string;
  cancelReason?: string;
  requiresInvoice?: boolean;
  vatInvoice?: {
    company?: string;
    taxCode?: string;
    email?: string;
    address?: string;
  };
  useVatInvoice?: boolean;
  buyerName?: string;
  recipientName?: string;
  items?: OrderDetailItem[];
  timeline?: OrderTimelineEvent[];
  order?: {
    buyerEmail?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    note?: string;
    requiresInvoice?: boolean;
    useVatInvoice?: boolean;
    vatInvoice?: {
      company?: string;
      taxCode?: string;
      email?: string;
      address?: string;
    };
    buyer?: {
      fullName?: string;
      name?: string;
      phone?: string;
    };
    user?: {
      fullName?: string;
      displayName?: string;
      phone?: string;
    };
    shippingAddress?: {
      fullName?: string;
      recipientName?: string;
      name?: string;
      phone?: string;
      phoneNumber?: string;
      fullAddress?: string;
      line1?: string;
      address?: string;
      ward?: string;
      district?: string;
      province?: string;
      city?: string;
      company?: string;
      taxCode?: string;
      email?: string;
    };
  };
  shippingAddress?: {
    fullName?: string;
    recipientName?: string;
    name?: string;
    phone?: string;
    phoneNumber?: string;
    fullAddress?: string;
    line1?: string;
    address?: string;
    ward?: string;
    district?: string;
    province?: string;
    city?: string;
    company?: string;
    taxCode?: string;
    email?: string;
  };
}

export default function SellerOrderDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || '';
  const router = useRouter();
  const { user, activeBusinessId } = useAuth();
  const { showToast } = useToast();

  const [order, setOrder] = useState<SellerOrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals for Ship & Cancel
  const [modalState, setModalState] = useState<{ type: 'SHIP' | 'CANCEL' } | null>(null);
  const [carrier, setCarrier] = useState('GHTK');
  const [trackingCode, setTrackingCode] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const businessId = user?.business?.id || activeBusinessId || undefined;
  const canProcessOrders = can(PERMISSIONS.ORDER_PROCESS, businessId, user);
  const canCancelOrders = can(PERMISSIONS.ORDER_CANCEL, businessId, user);

  const fetchOrderDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await orderApi.getSellerOrderDetail(id);
      if (res.success && res.data) {
        setOrder(res.data as unknown as SellerOrderDetailData);
      } else {
        showToast?.(res.error?.message || 'Không tìm thấy thông tin đơn hàng.', 'error');
      }
    } catch (err) {
      console.error('Error loading order detail:', err);
      showToast?.('Lỗi kết nối khi tải chi tiết đơn hàng.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const handleConfirm = async () => {
    if (!order?.id) return;
    setActionLoading(true);
    try {
      const res = await orderApi.confirmOrder(order.id);
      if (res.success) {
        showToast?.('Đã xác nhận đơn hàng thành công!', 'success');
        await fetchOrderDetail();
      } else {
        showToast?.(res.error?.message || 'Không thể xác nhận đơn hàng.', 'error');
      }
    } catch {
      showToast?.('Lỗi máy chủ khi xác nhận đơn hàng.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrepare = async () => {
    if (!order?.id) return;
    setActionLoading(true);
    try {
      const res = await orderApi.prepareOrder(order.id);
      if (res.success) {
        showToast?.('Đã chuyển đơn hàng sang trạng thái Chuẩn Bị Đóng Gói!', 'success');
        await fetchOrderDetail();
      } else {
        showToast?.(res.error?.message || 'Không thể cập nhật đóng gói.', 'error');
      }
    } catch {
      showToast?.('Lỗi máy chủ khi cập nhật đóng gói.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShipSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!order?.id) return;
    if (!carrier) {
      showToast?.('Vui lòng chọn đơn vị vận chuyển.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      const res = await orderApi.shipOrder(order.id, {
        carrier,
        trackingCode: trackingCode.trim(),
      });
      if (res.success) {
        showToast?.('Đã bàn giao vận chuyển thành công!', 'success');
        setModalState(null);
        setTrackingCode('');
        await fetchOrderDetail();
      } else {
        showToast?.(res.error?.message || 'Không thể cập nhật vận chuyển.', 'error');
      }
    } catch {
      showToast?.('Lỗi máy chủ khi bàn giao vận chuyển.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliver = async () => {
    if (!order?.id) return;
    setActionLoading(true);
    try {
      const res = await orderApi.deliverOrder(order.id);
      if (res.success) {
        showToast?.('Xác nhận đã giao hàng thành công!', 'success');
        await fetchOrderDetail();
      } else {
        showToast?.(res.error?.message || 'Không thể hoàn tất giao hàng.', 'error');
      }
    } catch {
      showToast?.('Lỗi máy chủ khi xác nhận giao hàng.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!order?.id) return;
    if (!cancelReason.trim()) {
      showToast?.('Vui lòng nhập lý do hủy đơn hàng.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      const res = await orderApi.cancelSellerOrder(order.id, {
        reason: cancelReason.trim(),
      });
      if (res.success) {
        showToast?.('Đã hủy đơn hàng thành công.', 'info');
        setModalState(null);
        setCancelReason('');
        await fetchOrderDetail();
      } else {
        showToast?.(res.error?.message || 'Không thể hủy đơn hàng.', 'error');
      }
    } catch {
      showToast?.('Lỗi máy chủ khi hủy đơn hàng.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-surface-container rounded-lg"></div>
        <div className="h-24 bg-surface-container rounded-2xl"></div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="h-64 bg-surface-container rounded-2xl"></div>
            <div className="h-36 bg-surface-container rounded-2xl"></div>
          </div>
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="h-48 bg-surface-container rounded-2xl"></div>
            <div className="h-48 bg-surface-container rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-10 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-error-container text-error flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px]">error_outline</span>
        </div>
        <h2 className="text-title-lg font-bold text-on-surface">Không tìm thấy đơn hàng</h2>
        <p className="text-body-sm text-on-surface-variant">
          Đơn hàng không tồn tại hoặc bạn không có quyền truy cập đơn hàng này.
        </p>
        <div className="pt-2">
          <Link
            href="/seller/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-xs hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Trở lại danh sách đơn hàng
          </Link>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[order.status] || {
    label: order.status,
    bg: 'bg-surface-container text-on-surface border-outline-variant',
    icon: 'info',
  };

  const address = order?.order?.shippingAddress || order?.shippingAddress || {};
  const recipientName =
    address.recipientName ||
    address.fullName ||
    address.name ||
    order?.order?.buyer?.fullName ||
    order?.order?.buyer?.name ||
    order?.order?.user?.fullName ||
    order?.order?.user?.displayName ||
    order?.buyerName ||
    order?.recipientName ||
    'Khách hàng HUKI';
  const recipientPhone =
    address.phone ||
    address.phoneNumber ||
    order?.order?.buyer?.phone ||
    order?.order?.user?.phone ||
    'Chưa cập nhật SĐT';
  const addressText =
    address.fullAddress ||
    [address.line1 || address.address, address.ward, address.district, address.province || address.city]
      .filter(Boolean)
      .join(', ') ||
    address.address ||
    'Không yêu cầu giao hàng (Đơn số DRM)';

  const isDigitalOnly = order.items?.every((it) => it.format === 'DIGITAL') || !order.requiresShipping;
  const rawNote = order?.order?.note || order?.note || order?.customerNote || '';
  const orderNote = rawNote.replace(/\[VAT:[^\]]+\]/gi, '').trim();

  // VAT Invoice determination
  const hasVatInvoice = Boolean(
    order?.order?.requiresInvoice ||
    order?.requiresInvoice ||
    order?.order?.vatInvoice ||
    order?.vatInvoice ||
    order?.useVatInvoice ||
    order?.order?.useVatInvoice ||
    rawNote.includes('[VAT:') ||
    rawNote.toLowerCase().includes('hóa đơn') ||
    rawNote.toLowerCase().includes('vat')
  );

  const vatDetails = order?.order?.vatInvoice || order?.vatInvoice || (hasVatInvoice ? {
    company: address.company || 'Doanh nghiệp / Cá nhân theo tài khoản đặt hàng',
    taxCode: address.taxCode || 'Theo MST đăng ký',
    email: address.email || order?.order?.buyerEmail || user?.email || 'Gửi về email tài khoản đặt hàng',
    address: address.fullAddress || addressText,
  } : null);

  const timeline = order?.timeline?.length
    ? order.timeline
    : [
        {
          toStatus: order.status,
          title: statusCfg.label,
          description: 'Cập nhật trạng thái đơn hàng',
          createdAt: order.createdAt,
        },
      ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumbs & Back Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push('/seller/orders')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-2xs"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Quay lại danh sách đơn hàng</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <Link href="/seller/dashboard" className="hover:text-primary">Kênh Người Bán</Link>
          <span>/</span>
          <Link href="/seller/orders" className="hover:text-primary">Quản Lý Đơn Hàng</Link>
          <span>/</span>
          <span className="font-mono font-bold text-on-surface">#{order.code || order.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      {/* Main Order Header Card */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-on-surface tracking-tight font-editorial">
              Đơn Hàng #{order.code || order.id}
            </h1>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${statusCfg.bg}`}
            >
              <span className="material-symbols-outlined text-[15px]">{statusCfg.icon}</span>
              {statusCfg.label}
            </span>
            {isDigitalOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-300">
                <span className="material-symbols-outlined text-[14px]">lock_open</span>
                EBOOK DRM
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-outline">schedule</span>
            <span>Đặt hàng lúc: <strong>{dateTime(order.createdAt)}</strong></span>
          </p>
        </div>

        {/* Operational Workflow Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {canCancelOrders && ['PENDING_CONFIRMATION', 'CONFIRMED', 'PREPARING'].includes(order.status) && (
            <button
              type="button"
              onClick={() => {
                setCancelReason('');
                setModalState({ type: 'CANCEL' });
              }}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl border border-error/40 text-error hover:bg-error/10 font-bold text-xs sm:text-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              Hủy Đơn Hàng
            </button>
          )}

          {canProcessOrders && order.status === 'PENDING_CONFIRMATION' && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              <span>Xác Nhận Đơn</span>
            </button>
          )}

          {canProcessOrders && order.status === 'CONFIRMED' && (
            <button
              type="button"
              onClick={handlePrepare}
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              <span>Chuẩn Bị Đóng Gói</span>
            </button>
          )}

          {canProcessOrders && order.status === 'PREPARING' && (
            <button
              type="button"
              onClick={() => setModalState({ type: 'SHIP' })}
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">local_shipping</span>
              <span>Bàn Giao Vận Chuyển</span>
            </button>
          )}

          {canProcessOrders && order.status === 'SHIPPED' && (
            <button
              type="button"
              onClick={handleDeliver}
              disabled={actionLoading}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">task_alt</span>
              <span>Xác Nhận Đã Giao</span>
            </button>
          )}

          {hasVatInvoice && (
            <Link
              href={`/orders/${order.orderId || order.id}/invoice`}
              target="_blank"
              className="px-4 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest hover:bg-surface-container text-on-surface font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-amber-600">receipt_long</span>
              <span>Xem Hóa Đơn VAT</span>
            </Link>
          )}
        </div>
      </div>

      {/* Main Content 2-Column Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Order Items, Notes, VAT & Timeline */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* 1. Products in Order */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-bold text-base text-on-surface flex items-center gap-2 font-editorial">
                <span className="material-symbols-outlined text-primary text-[20px]">auto_stories</span>
                Danh Sách Sản Phẩm ({(order.items || []).length} ấn phẩm)
              </h2>
              <span className="text-xs text-on-surface-variant font-medium">
                Kho người bán đóng gói
              </span>
            </div>

            <div className="divide-y divide-outline-variant/60">
              {(order.items || []).map((item, idx) => {
                const itTitle = item.title || item.bookTitle || 'Ấn phẩm HUKI';
                const itCover = item.coverUrl || item.coverImage || item.bookCoverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80';
                const itFormat = item.format === 'DIGITAL' ? 'Sách điện tử DRM' : item.format === 'BOTH' ? 'Combo Hybrid' : 'Sách giấy vật lý';
                const unitPrice = Number(item.price ?? item.unitPrice ?? 0);
                const quantity = item.quantity || 1;
                const subtotal = item.subtotal ?? unitPrice * quantity;

                return (
                  <div key={item.id || idx} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-surface-container-low/40 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={itCover}
                        alt={itTitle}
                        className="w-14 h-19 sm:w-16 sm:h-22 rounded-xl object-cover bg-surface-container border border-outline-variant shadow-2xs shrink-0"
                      />
                      <div className="min-w-0 space-y-1">
                        <Link
                          href={`/book/${item.bookId || item.id}`}
                          className="font-bold text-sm sm:text-base text-on-surface hover:text-primary line-clamp-2 transition-colors block"
                        >
                          {itTitle}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${
                            item.format === 'DIGITAL'
                              ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}>
                            {itFormat}
                          </span>
                          <span className="text-on-surface-variant">
                            Đơn giá: <strong className="text-on-surface">{money(unitPrice)}</strong>
                          </span>
                          <span className="text-on-surface-variant">
                            Số lượng: <strong className="text-on-surface">x{quantity}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs text-on-surface-variant block">Thành tiền</span>
                      <span className="font-title-md text-sm sm:text-base font-bold text-primary">
                        {money(subtotal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2. Customer Order Note */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs space-y-3">
            <h2 className="font-bold text-base text-on-surface flex items-center gap-2 font-editorial">
              <span className="material-symbols-outlined text-amber-600 text-[20px]">sticky_note_2</span>
              Ghi Chú Đơn Hàng Của Khách
            </h2>

            {orderNote ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm text-on-surface leading-relaxed">
                <p className="font-medium text-amber-900 dark:text-amber-200">{orderNote}</p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-surface-container-low/60 border border-outline-variant/60 text-xs sm:text-sm text-outline italic">
                Khách hàng không để lại ghi chú đặc biệt cho đơn hàng này.
              </div>
            )}
          </section>

          {/* 3. VAT Invoice Section */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-bold text-base text-on-surface flex items-center gap-2 font-editorial">
                <span className="material-symbols-outlined text-emerald-700 text-[20px]">receipt_long</span>
                Thông Tin Hóa Đơn Điện Tử (VAT)
              </h2>
              {hasVatInvoice ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Có yêu cầu xuất hóa đơn VAT
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-container-high text-on-surface-variant border border-outline-variant">
                  <span className="material-symbols-outlined text-[14px]">remove_circle_outline</span>
                  Không yêu cầu xuất hóa đơn
                </span>
              )}
            </div>

            {hasVatInvoice ? (
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs sm:text-sm space-y-2.5">
                <div className="grid sm:grid-cols-2 gap-3 text-on-surface">
                  <div>
                    <span className="text-on-surface-variant text-xs block">Tên đơn vị / Khách hàng xuất hóa đơn:</span>
                    <strong className="font-semibold text-sm">{vatDetails?.company || recipientName}</strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant text-xs block">Mã số thuế (MST):</span>
                    <strong className="font-mono text-sm">{vatDetails?.taxCode || 'Theo MST cá nhân/doanh nghiệp'}</strong>
                  </div>
                  <div>
                    <span className="text-on-surface-variant text-xs block">Email nhận e-Invoice:</span>
                    <span className="font-medium text-primary">{vatDetails?.email || 'Gửi qua email tài khoản'}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant text-xs block">Địa chỉ xuất hóa đơn:</span>
                    <span className="font-medium">{vatDetails?.address || addressText}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    Hóa đơn điện tử hợp lệ theo quy định của Tổng cục Thuế.
                  </span>
                  <Link
                    href={`/orders/${order.orderId || order.id}/invoice`}
                    target="_blank"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Mở bản in hóa đơn</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">
                Khách hàng chọn không xuất hóa đơn GTGT cho đơn hàng này.
              </p>
            )}
          </section>

          {/* 4. Order Timeline & History */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs space-y-4">
            <h2 className="font-bold text-base text-on-surface flex items-center gap-2 font-editorial">
              <span className="material-symbols-outlined text-purple-600 text-[20px]">timeline</span>
              Lịch Sử &amp; Hành Trình Đơn Hàng
            </h2>

            <ol className="space-y-0 pl-1">
              {timeline.map((event, index) => (
                <li key={event.id || `${event.toStatus}-${index}`} className="relative pl-7 pb-5 last:pb-0">
                  {index < timeline.length - 1 && (
                    <span className="absolute left-[7px] top-4 bottom-0 w-px bg-outline-variant" />
                  )}
                  <span className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary ring-4 ring-primary/20" />
                  <p className="font-bold text-sm text-on-surface">
                    {event.title || event.toStatus}
                  </p>
                  {event.description && (
                    <p className="text-xs text-on-surface-variant mt-0.5">{event.description}</p>
                  )}
                  <time className="text-[11px] text-outline block mt-0.5">
                    {dateTime(event.createdAt)}
                  </time>
                </li>
              ))}
            </ol>

            {order.cancelReason && (
              <div className="rounded-xl bg-error-container text-on-error-container p-3.5 text-xs sm:text-sm space-y-1">
                <strong className="font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  Lý do hủy đơn:
                </strong>
                <p>{order.cancelReason}</p>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Customer info, Payment, Financial summary & Logistics */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Customer & Shipping Address Card */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs space-y-3.5">
            <h2 className="font-bold text-base text-on-surface flex items-center gap-2 font-editorial">
              <span className="material-symbols-outlined text-primary text-[20px]">person_pin</span>
              Thông Tin Khách Hàng
            </h2>

            <div className="space-y-2 text-xs sm:text-sm text-on-surface">
              <div>
                <span className="text-xs text-on-surface-variant block">Tên người nhận:</span>
                <strong className="font-bold text-sm sm:text-base text-on-surface">{recipientName}</strong>
              </div>

              <div>
                <span className="text-xs text-on-surface-variant block">Số điện thoại:</span>
                <span className="font-semibold text-primary">{recipientPhone}</span>
              </div>

              <div className="pt-2 border-t border-outline-variant/60">
                <span className="text-xs text-on-surface-variant flex items-center gap-1 mb-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                  Địa chỉ nhận hàng:
                </span>
                <p className="leading-relaxed font-medium">{addressText}</p>
              </div>
            </div>
          </section>

          {/* Payment & Logistics Card */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs space-y-3.5">
            <h2 className="font-bold text-base text-on-surface flex items-center gap-2 font-editorial">
              <span className="material-symbols-outlined text-amber-600 text-[20px]">payments</span>
              Thanh Toán &amp; Vận Chuyển
            </h2>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Phương thức:</span>
                <strong className="font-semibold text-on-surface">
                  {order?.order?.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : order?.order?.paymentMethod || 'PayOS / QR Code'}
                </strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Trạng thái thanh toán:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                  order?.order?.paymentStatus === 'PAID'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                }`}>
                  {order?.order?.paymentStatus === 'PAID' ? 'Đã Thanh Toán' : 'Chờ Thanh Toán'}
                </span>
              </div>

              <div className="pt-2 border-t border-outline-variant/60">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-on-surface-variant">Đơn vị vận chuyển:</span>
                  <span className="font-semibold">{order.carrier || 'Chưa phân bổ'}</span>
                </div>
                {order.trackingCode && (
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Mã vận đơn:</span>
                    <span className="font-mono font-bold text-primary">{order.trackingCode}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Financial Summary Card */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs space-y-3">
            <h2 className="font-bold text-base text-on-surface flex items-center gap-2 font-editorial">
              <span className="material-symbols-outlined text-primary text-[20px]">receipt</span>
              Tổng Kết Chi Phí Đơn
            </h2>

            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between text-on-surface-variant">
                <span>Tạm tính tiền sách:</span>
                <span className="font-medium text-on-surface">{money(order.itemSubtotal)}</span>
              </div>

              {(order.voucherDiscount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <span>Giảm giá Voucher:</span>
                  <span className="font-medium">-{money(order.voucherDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-on-surface-variant">
                <span>Phí vận chuyển:</span>
                <span className="font-medium text-on-surface">{money(order.shippingFee)}</span>
              </div>

              <div className="pt-3 border-t border-outline-variant flex justify-between items-baseline">
                <span className="font-bold text-sm sm:text-base text-on-surface">Tổng thanh toán:</span>
                <span className="font-title-lg text-lg sm:text-xl font-black text-primary">
                  {money(order.grandTotal)}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Ship Order Modal */}
      {modalState?.type === 'SHIP' && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 space-y-5 border border-outline-variant shadow-xl animate-scaleIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-600">
                <span className="material-symbols-outlined text-[24px]">local_shipping</span>
                <h3 className="text-title-lg font-bold text-on-surface">Bàn Giao Vận Chuyển</h3>
              </div>
              <button
                onClick={() => setModalState(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-body-sm text-on-surface-variant">
              Cập nhật mã vận đơn cho đơn hàng <strong className="text-on-surface font-bold">#{order.code || order.id}</strong> để người mua có thể theo dõi hành trình giao nhận.
            </p>

            <form onSubmit={handleShipSubmit} className="space-y-4">
              <div>
                <label className="block text-body-sm font-semibold text-on-surface mb-1">
                  Đơn Vị Vận Chuyển
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</option>
                  <option value="GHN">Giao Hàng Nhanh (GHN)</option>
                  <option value="VIETTEL_POST">Viettel Post</option>
                  <option value="VNPOST">VNPost / Bưu Điện Việt Nam</option>
                  <option value="HUKI_EXPRESS">HUKI Hỏa Tốc</option>
                </select>
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-on-surface mb-1">
                  Mã Vận Đơn (Tracking Code)
                </label>
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Ví dụ: GHTK-883921001"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalState(null)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface font-semibold text-body-sm hover:bg-surface-container cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white font-bold text-body-sm hover:bg-purple-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {actionLoading ? 'Đang cập nhật...' : 'Xác Nhận Xuất Kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {modalState?.type === 'CANCEL' && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 space-y-5 border border-outline-variant shadow-xl animate-scaleIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-error">
                <span className="material-symbols-outlined text-[24px]">cancel</span>
                <h3 className="text-title-lg font-bold text-on-surface">Hủy Đơn Hàng</h3>
              </div>
              <button
                onClick={() => setModalState(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-body-sm text-on-surface-variant">
              Bạn có chắc chắn muốn hủy đơn hàng <strong className="text-on-surface font-bold">#{order.code || order.id}</strong>? Thao tác này sẽ hoàn tiền lại cho khách nếu đơn đã thanh toán.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-body-sm font-semibold text-on-surface mb-1">
                  Lý Do Hủy Đơn <span className="text-error">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ví dụ: Hết hàng trong kho, lỗi in ấn từ nhà xuất bản, khách hàng đổi ý..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-error"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalState(null)}
                  className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface font-semibold text-body-sm hover:bg-surface-container cursor-pointer"
                >
                  Quay Lại
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !cancelReason.trim()}
                  className="px-5 py-2 rounded-xl bg-error text-on-error font-bold text-body-sm hover:bg-error/90 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {actionLoading ? 'Đang xử lý...' : 'Xác Nhận Hủy Đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
