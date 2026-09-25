"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { orderApi } from '@/ui/api/orderApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { can, PERMISSIONS } from '@/ui/utils/permissions';
import {
  SellerStatusBadge,
  SellerActionButton,
} from '@/ui/components/seller/SellerUI';

const money = (val?: number) => `${Number(val || 0).toLocaleString('vi-VN')} đ`;
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
  deliveredAt?: string;
  completedAt?: string;
  updatedAt?: string;
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

  // In-Page Action Box (No-Popup architecture)
  const [activeActionBox, setActiveActionBox] = useState<'SHIP' | 'CANCEL' | null>(null);
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
        showToast?.({ title: 'Lỗi', message: res.error?.message || 'Không tìm thấy thông tin đơn hàng.', type: 'error' });
      }
    } catch (err) {
      console.error('Error loading order detail:', err);
      showToast?.({ title: 'Lỗi kết nối', message: 'Lỗi kết nối khi tải chi tiết đơn hàng.', type: 'error' });
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
        showToast?.({ title: 'Thành công', message: 'Đã xác nhận đơn hàng thành công!', type: 'success' });
        await fetchOrderDetail();
      } else {
        showToast?.({ title: 'Lỗi', message: res.error?.message || 'Không thể xác nhận đơn hàng.', type: 'error' });
      }
    } catch {
      showToast?.({ title: 'Lỗi máy chủ', message: 'Lỗi máy chủ khi xác nhận đơn hàng.', type: 'error' });
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
        showToast?.({ title: 'Thành công', message: 'Đã chuyển đơn hàng sang trạng thái Chuẩn Bị Đóng Gói!', type: 'success' });
        await fetchOrderDetail();
      } else {
        showToast?.({ title: 'Lỗi', message: res.error?.message || 'Không thể cập nhật đóng gói.', type: 'error' });
      }
    } catch {
      showToast?.({ title: 'Lỗi máy chủ', message: 'Lỗi máy chủ khi cập nhật đóng gói.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleShipSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!order?.id) return;
    if (!trackingCode.trim()) {
      showToast?.({ title: 'Thông báo', message: 'Vui lòng nhập mã vận đơn.', type: 'warning' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await orderApi.shipOrder(order.id, {
        carrier,
        trackingCode: trackingCode.trim(),
      });
      if (res.success) {
        showToast?.({ title: 'Thành công', message: 'Đã bàn giao vận chuyển thành công!', type: 'success' });
        setActiveActionBox(null);
        setTrackingCode('');
        await fetchOrderDetail();
      } else {
        showToast?.({ title: 'Lỗi', message: res.error?.message || 'Không thể cập nhật vận chuyển.', type: 'error' });
      }
    } catch {
      showToast?.({ title: 'Lỗi máy chủ', message: 'Lỗi máy chủ khi bàn giao vận chuyển.', type: 'error' });
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
        showToast?.({ title: 'Thành công', message: 'Xác nhận đã giao hàng thành công!', type: 'success' });
        await fetchOrderDetail();
      } else {
        showToast?.({ title: 'Lỗi', message: res.error?.message || 'Không thể hoàn tất giao hàng.', type: 'error' });
      }
    } catch {
      showToast?.({ title: 'Lỗi máy chủ', message: 'Lỗi máy chủ khi xác nhận giao hàng.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!order?.id) return;
    if (!cancelReason.trim()) {
      showToast?.({ title: 'Thông báo', message: 'Vui lòng nhập lý do hủy đơn hàng.', type: 'warning' });
      return;
    }
    setActionLoading(true);
    try {
      const res = await orderApi.cancelSellerOrder(order.id, {
        reason: cancelReason.trim(),
      });
      if (res.success) {
        showToast?.({ title: 'Thành công', message: 'Đã hủy đơn hàng thành công.', type: 'info' });
        setActiveActionBox(null);
        setCancelReason('');
        await fetchOrderDetail();
      } else {
        showToast?.({ title: 'Lỗi', message: res.error?.message || 'Không thể hủy đơn hàng.', type: 'error' });
      }
    } catch {
      showToast?.({ title: 'Lỗi máy chủ', message: 'Lỗi máy chủ khi hủy đơn hàng.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded-xl"></div>
        <div className="h-24 bg-white border border-slate-200 rounded-2xl"></div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="h-64 bg-white border border-slate-200 rounded-2xl"></div>
          </div>
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="h-48 bg-white border border-slate-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 max-w-xl mx-auto text-center space-y-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
        <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
          <span className="material-symbols-outlined text-[30px]">error_outline</span>
        </div>
        <h2 className="text-lg font-bold text-slate-900">Không tìm thấy thông tin đơn hàng</h2>
        <p className="text-xs text-slate-500">
          Đơn hàng không tồn tại hoặc bạn không có quyền truy cập đơn hàng này.
        </p>
        <div className="pt-2">
          <Link
            href="/seller/orders"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] text-white font-semibold text-xs shadow-2xs hover:bg-[#00704A] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Trở lại danh sách đơn hàng</span>
          </Link>
        </div>
      </div>
    );
  }

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
    '—';
  const addressText =
    address.fullAddress ||
    [address.line1 || address.address, address.ward, address.province || address.city]
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
          title: 'Khởi tạo đơn hàng',
          description: 'Cập nhật trạng thái đơn hàng',
          createdAt: order.createdAt,
        },
      ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* 1. Header & Điều hướng quay lại */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <button
          type="button"
          onClick={() => router.push('/seller/orders')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[16px] text-slate-500">arrow_back</span>
          <span>Quay lại danh sách đơn hàng</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/seller/dashboard" className="hover:text-slate-900">Kênh Người Bán</Link>
          <span className="text-slate-300">/</span>
          <Link href="/seller/orders" className="hover:text-slate-900">Quản Lý Đơn Hàng</Link>
          <span className="text-slate-300">/</span>
          <span className="font-mono font-bold text-slate-900">#{order.code || order.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      {/* 2. Order Header Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold font-editorial text-slate-900 tracking-tight">
              Đơn Hàng #{order.code || order.id}
            </h1>
            <SellerStatusBadge status={order.status} />
            {isDigitalOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                <span className="material-symbols-outlined text-[13px]">lock_open</span>
                <span>EBOOK DRM</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-slate-400">schedule</span>
            <span>Đặt hàng lúc: <strong className="font-medium text-slate-700">{dateTime(order.createdAt)}</strong></span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canCancelOrders && order.status === 'PENDING_CONFIRMATION' && (
            <SellerActionButton
              variant="danger"
              label="Hủy Đơn Hàng"
              icon="cancel"
              onClick={() => setActiveActionBox('CANCEL')}
            />
          )}

          {canProcessOrders && order.status === 'PENDING_CONFIRMATION' && (
            <SellerActionButton
              variant="success"
              label="Xác Nhận Đơn"
              icon="check"
              onClick={handleConfirm}
              loading={actionLoading}
            />
          )}

          {canProcessOrders && order.status === 'CONFIRMED' && (
            <SellerActionButton
              variant="info"
              label="Đóng Gói Xong"
              icon="inventory_2"
              onClick={handlePrepare}
              loading={actionLoading}
            />
          )}

          {order.status === 'PREPARING' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">
              <span className="material-symbols-outlined text-[16px] text-purple-600 animate-pulse">two_wheeler</span>
              <span>Đã đóng gói — Chờ Shipper đến lấy hàng</span>
            </span>
          )}

          {order.status === 'SHIPPED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs">
              <span className="material-symbols-outlined text-[16px] text-sky-600">local_shipping</span>
              <span>Bưu tá đang giao hàng tận tay khách</span>
            </span>
          )}

          {(order.status === 'DELIVERED' || order.status === 'COMPLETED') && (
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                <span>Giao hàng thành công</span>
              </span>
              {(() => {
                const rawTime = (order as any).deliveredAt || order.completedAt || (order as any).updatedAt;
                const elapsed = rawTime ? (Date.now() - new Date(rawTime).getTime()) / 1000 : 999;
                if (elapsed < 120) {
                  return (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs animate-pulse"
                      title="Đang trong thời hạn đổi trả 2 phút demo (Ký quỹ Escrow bảo vệ)"
                    >
                      <span className="material-symbols-outlined text-[15px] text-amber-700 font-black">priority_high</span>
                      <span>Hạn Đổi Trả (2 phút demo)</span>
                    </span>
                  );
                }
                return (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                    title="Đã hết hạn đổi trả, tiền đã giải ngân vào Ví Gian Hàng"
                  >
                    <span className="material-symbols-outlined text-[14px] text-emerald-600">account_balance_wallet</span>
                    <span>Đã giải ngân Quỹ Sàn</span>
                  </span>
                );
              })()}
            </div>
          )}

          {hasVatInvoice && (
            <Link
              href={`/orders/${order.orderId || order.id}/invoice`}
              target="_blank"
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <span className="material-symbols-outlined text-[15px] text-amber-600">receipt_long</span>
              <span>Xem Hóa Đơn VAT</span>
            </Link>
          )}
        </div>
      </div>

      {/* 3. In-Page Collapsible Action Box (Giao bưu tá hoặc Hủy đơn - Không Popup) */}
      {activeActionBox && (
        <div className="bg-white rounded-2xl p-5 border-2 border-slate-300 shadow-sm animate-in fade-in slide-in-from-top-3 duration-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeActionBox === 'SHIP' ? 'bg-purple-50 text-purple-700' : 'bg-rose-50 text-rose-700'}`}>
                <span className="material-symbols-outlined text-[20px]">
                  {activeActionBox === 'SHIP' ? 'local_shipping' : 'cancel'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {activeActionBox === 'SHIP' ? 'Bàn Giao Vận Chuyển Cho Bưu Tá' : 'Xác Nhận Hủy Đơn Hàng Này'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Cập nhật hành trình xử lý cho đơn hàng <strong className="font-mono text-slate-800">#{order.code || order.id}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveActionBox(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {activeActionBox === 'SHIP' ? (
            <form onSubmit={handleShipSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Đơn vị vận chuyển
                  </label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#00875A] focus:bg-white"
                  >
                    <option value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</option>
                    <option value="GHN">Giao Hàng Nhanh (GHN)</option>
                    <option value="VIETTEL_POST">Viettel Post</option>
                    <option value="VNPOST">VNPost / Bưu Điện Việt Nam</option>
                    <option value="HUKI_EXPRESS">HUKI Hỏa Tốc</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mã vận đơn (Tracking Code)
                  </label>
                  <input
                    type="text"
                    required
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="Ví dụ: GHTK-883921001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#00875A] focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <SellerActionButton
                  variant="neutral"
                  label="Hủy bỏ"
                  onClick={() => setActiveActionBox(null)}
                />
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#00875A] hover:bg-[#00704A] text-white rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-[0.96]"
                >
                  <span className="material-symbols-outlined text-[15px]">local_shipping</span>
                  <span>{actionLoading ? 'Đang cập nhật...' : 'Xác nhận xuất kho'}</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Lý do hủy đơn <span className="text-rose-600">*</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {['Hết hàng trong kho', 'Khách hàng đổi ý / yêu cầu hủy', 'Lỗi in ấn từ NXB', 'Sai địa chỉ không liên hệ được'].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setCancelReason(reason)}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        cancelReason === reason
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 font-semibold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <textarea
                  required
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhập chi tiết lý do hủy đơn..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <SellerActionButton
                  variant="neutral"
                  label="Quay lại"
                  onClick={() => setActiveActionBox(null)}
                />
                <button
                  type="submit"
                  disabled={actionLoading || !cancelReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-[0.96]"
                >
                  <span className="material-symbols-outlined text-[15px]">cancel</span>
                  <span>{actionLoading ? 'Đang xử lý...' : 'Xác nhận hủy đơn'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 4. Grid 2 cột chi tiết: Trái (Sản phẩm, Ghi chú, VAT, Timeline) - Phải (Khách hàng, Thanh toán, Tổng kết) */}
      <div className="grid grid-cols-12 gap-6">
        {/* Cột Trái (8/12) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Danh sách sản phẩm */}
          <section className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 font-editorial">
                <span className="material-symbols-outlined text-[#00875A] text-[18px]">auto_stories</span>
                <span>Danh Sách Sản Phẩm ({(order.items || []).length} ấn phẩm)</span>
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">Kho Người Bán</span>
            </div>

            <div className="divide-y divide-slate-100">
              {(order.items || []).map((item, idx) => {
                const itTitle = item.title || item.bookTitle || 'Ấn phẩm HUKI';
                const itCover = item.coverUrl || item.coverImage || item.bookCoverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80';
                const itFormat = item.format === 'DIGITAL' ? 'Ebook DRM' : item.format === 'BOTH' ? 'Combo Hybrid' : 'Sách In (Giấy)';
                const unitPrice = Number(item.price ?? item.unitPrice ?? 0);
                const quantity = item.quantity || 1;
                const subtotal = item.subtotal ?? unitPrice * quantity;
                const isEbook = item.format === 'DIGITAL';

                return (
                  <div key={item.id || idx} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={itCover}
                        alt={itTitle}
                        className="w-12 h-16 sm:w-14 sm:h-19 rounded-lg object-cover bg-slate-100 border border-slate-200 shadow-2xs shrink-0"
                      />
                      <div className="min-w-0 space-y-1">
                        <Link
                          href={`/book/${item.bookId || item.id}`}
                          className="font-medium text-xs sm:text-sm text-slate-900 hover:text-[#00875A] line-clamp-2 transition-colors block"
                        >
                          {itTitle}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isEbook
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                          }`}>
                            {itFormat}
                          </span>
                          <span className="text-slate-500">
                            Đơn giá: <strong className="text-slate-800 font-mono">{money(unitPrice)}</strong>
                          </span>
                          <span className="text-slate-500">
                            Số lượng: <strong className="text-slate-800">x{quantity}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-slate-400 block">Thành tiền</span>
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {money(subtotal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Ghi chú đơn hàng */}
          <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 font-editorial">
              <span className="material-symbols-outlined text-amber-600 text-[18px]">sticky_note_2</span>
              <span>Ghi Chú Của Khách Hàng</span>
            </h2>

            {orderNote ? (
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 leading-relaxed font-medium">
                {orderNote}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-400 italic">
                Khách hàng không để lại ghi chú đặc biệt cho đơn hàng này.
              </div>
            )}
          </section>

          {/* Hóa đơn VAT */}
          <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 font-editorial">
                <span className="material-symbols-outlined text-[#00875A] text-[18px]">receipt_long</span>
                <span>Thông Tin Hóa Đơn Điện Tử (VAT)</span>
              </h2>
              {hasVatInvoice ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Yêu cầu xuất hóa đơn</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                  <span>Không xuất hóa đơn</span>
                </span>
              )}
            </div>

            {hasVatInvoice && vatDetails && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="grid sm:grid-cols-2 gap-3 text-slate-800">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Tên đơn vị xuất hóa đơn:</span>
                    <strong className="font-semibold text-xs">{vatDetails.company}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Mã số thuế (MST):</span>
                    <strong className="font-mono text-xs">{vatDetails.taxCode}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Email nhận e-Invoice:</span>
                    <span className="font-medium text-[#00875A]">{vatDetails.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Địa chỉ xuất hóa đơn:</span>
                    <span className="font-medium">{vatDetails.address}</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Hành trình đơn hàng */}
          <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 font-editorial">
              <span className="material-symbols-outlined text-purple-600 text-[18px]">timeline</span>
              <span>Lịch Sử &amp; Hành Trình Đơn Hàng</span>
            </h2>

            <ol className="space-y-0 pl-1">
              {timeline.map((event, index) => (
                <li key={event.id || `${event.toStatus}-${index}`} className="relative pl-7 pb-5 last:pb-0">
                  {index < timeline.length - 1 && (
                    <span className="absolute left-[7px] top-4 bottom-0 w-px bg-slate-200" />
                  )}
                  <span className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-[#00875A] ring-4 ring-emerald-50" />
                  <p className="font-bold text-xs sm:text-sm text-slate-900">
                    {event.title || event.toStatus}
                  </p>
                  {event.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>
                  )}
                  <time className="text-[10.5px] text-slate-400 block mt-0.5">
                    {dateTime(event.createdAt)}
                  </time>
                </li>
              ))}
            </ol>

            {order.cancelReason && (
              <div className="rounded-xl bg-rose-50 text-rose-800 border border-rose-200 p-3.5 text-xs space-y-1">
                <strong className="font-bold flex items-center gap-1 text-rose-900">
                  <span className="material-symbols-outlined text-[15px]">info</span>
                  <span>Lý do hủy đơn:</span>
                </strong>
                <p>{order.cancelReason}</p>
              </div>
            )}
          </section>
        </div>

        {/* Cột Phải (4/12) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Khách hàng & Địa chỉ */}
          <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 font-editorial">
              <span className="material-symbols-outlined text-[#00875A] text-[18px]">person_pin</span>
              <span>Thông Tin Khách Hàng</span>
            </h2>

            <div className="space-y-2 text-xs text-slate-800">
              <div>
                <span className="text-[11px] text-slate-400 block">Người nhận hàng:</span>
                <strong className="font-bold text-sm text-slate-900">{recipientName}</strong>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Số điện thoại:</span>
                <span className="font-mono font-semibold text-slate-800">{recipientPhone}</span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                  <span className="material-symbols-outlined text-[14px] text-slate-400">location_on</span>
                  <span>Địa chỉ giao nhận:</span>
                </span>
                <p className="leading-relaxed font-medium text-slate-700">{addressText}</p>
              </div>
            </div>
          </section>

          {/* Thanh toán & Vận chuyển */}
          <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 font-editorial">
              <span className="material-symbols-outlined text-amber-600 text-[18px]">payments</span>
              <span>Thanh Toán &amp; Vận Chuyển</span>
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Phương thức:</span>
                <strong className="font-medium text-slate-900">
                  {order?.order?.paymentMethod === 'COD' ? 'Thu hộ khi nhận (COD)' : order?.order?.paymentMethod || 'PayOS / QR'}
                </strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Trạng thái thanh toán:</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold text-[10.5px] ${
                  order?.order?.paymentStatus === 'PAID'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {order?.order?.paymentStatus === 'PAID' ? 'Đã Thanh Toán' : 'Chờ Thanh Toán'}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Đơn vị vận chuyển:</span>
                  <span className="font-semibold text-slate-800">{order.carrier || 'Chưa phân bổ'}</span>
                </div>
                {order.trackingCode && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Mã vận đơn:</span>
                    <span className="font-mono font-bold text-[#00875A]">{order.trackingCode}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Chi phí & Tổng kết */}
          <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 font-editorial">
              <span className="material-symbols-outlined text-[#00875A] text-[18px]">receipt</span>
              <span>Tổng Kết Chi Phí</span>
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Tạm tính tiền sách:</span>
                <span className="font-mono font-medium text-slate-900">{money(order.itemSubtotal)}</span>
              </div>

              {(order.voucherDiscount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Giảm giá Voucher:</span>
                  <span className="font-mono">-{money(order.voucherDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-500">
                <span>Phí vận chuyển:</span>
                <span className="font-mono font-medium text-slate-900">{money(order.shippingFee)}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-sm text-slate-900">Tổng thanh toán:</span>
                <span className="font-mono text-base font-bold text-[#00875A]">
                  {money(order.grandTotal)}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
