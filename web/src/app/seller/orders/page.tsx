"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { orderApi } from '@/ui/api/orderApi';
import { businessApi } from '@/ui/api/businessApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { can, PERMISSIONS } from '@/ui/utils/permissions';
import {
  SellerStatusBadge,
  SellerFilterTabs,
  SellerPagination,
  SellerTableContainer,
  SellerActionButton,
} from '@/ui/components/seller/SellerUI';

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất Cả' },
  { key: 'PENDING_CONFIRMATION', label: 'Chờ Xác Nhận' },
  { key: 'PREPARING', label: 'Đang Chuẩn Bị' },
  { key: 'SHIPPED', label: 'Đang Giao' },
  { key: 'COMPLETED', label: 'Hoàn Tất' },
  { key: 'CANCELLED', label: 'Hủy & Hoàn Tiền' },
];

interface OrderItemProduct {
  id?: string;
  title?: string;
  bookTitle?: string;
  coverImage?: string;
  coverUrl?: string;
  bookCoverUrl?: string;
  price?: number;
  unitPrice?: number;
  quantity?: number;
  format?: string;
}

interface SellerOrder {
  id: string;
  code?: string;
  status: string;
  createdAt?: string;
  grandTotal?: number;
  totalAmount?: number;
  itemSubtotal?: number;
  shippingFee?: number;
  requiresShipping?: boolean;
  carrier?: string;
  trackingCode?: string;
  deliveredAt?: string;
  completedAt?: string;
  updatedAt?: string;
  items?: OrderItemProduct[];
  order?: {
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
    };
    buyer?: {
      fullName?: string;
      name?: string;
      phone?: string;
    };
    user?: {
      fullName?: string;
      name?: string;
      displayName?: string;
      phone?: string;
    };
    paymentMethod?: string;
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
  };
  buyerName?: string;
  recipientName?: string;
  user?: {
    fullName?: string;
    displayName?: string;
  };
}

function SellerOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(true);
  const tabFromUrl = searchParams.get('tab') || 'ALL';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  // In-Page Action Box state (No-Popup architecture)
  const [activeActionBox, setActiveActionBox] = useState<{
    type: 'SHIP' | 'CANCEL';
    order: SellerOrder;
  } | null>(null);
  const [carrier, setCarrier] = useState('GHTK');
  const [trackingCode, setTrackingCode] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  const toggleExpandOrder = (id: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  useEffect(() => {
    const currentParam = searchParams.get('tab') || 'ALL';
    if (currentParam !== activeTab) {
      setActiveTab(currentParam);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (newTab === 'ALL') {
      router.push('/seller/orders');
    } else {
      router.push(`/seller/orders?tab=${newTab}`);
    }
  };

  const businessId = user?.business?.id || activeBusinessId || undefined;
  const canViewOrders = can(PERMISSIONS.ORDER_VIEW, businessId, user);

  // Load Business Name and Orders
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let bizId = user?.business?.id || activeBusinessId;
      if (!bizId) {
        try {
          const bizRes = await businessApi.getMyBusiness();
          if (bizRes.success && bizRes.data) {
            bizId = bizRes.data.id;
            setActiveBusinessId(bizId);
            setBusinessName(bizRes.data.name || 'Gian Hàng Của Tôi');
          }
        } catch { /* ignore */ }
      } else {
        try {
          const bizRes = await businessApi.getMyBusiness();
          if (bizRes.success && bizRes.data) {
            setBusinessName(bizRes.data.name || 'Gian Hàng Của Tôi');
          }
        } catch { /* ignore */ }
      }

      const orderRes = await orderApi.getSellerOrders(bizId ? { limit: 100, business: bizId } : { limit: 100 });
      if (orderRes.success && orderRes.data) {
        const raw = orderRes.data as unknown;
        const items: SellerOrder[] = Array.isArray(raw)
          ? (raw as SellerOrder[])
          : Array.isArray((raw as { data?: SellerOrder[] })?.data)
          ? ((raw as { data: SellerOrder[] }).data)
          : Array.isArray((raw as { items?: SellerOrder[] })?.items)
          ? ((raw as { items: SellerOrder[] }).items)
          : [];
        setOrders(items);
      } else {
        setOrders([]);
        if (orderRes.error?.code === 'AUTHZ_ROLE_INSUFFICIENT') {
          showToast?.({
            title: 'Chưa đồng bộ quyền Người Bán',
            message: 'Tài khoản của bạn đang cập nhật quyền Doanh Nghiệp. Vui lòng bấm tải lại hoặc đăng nhập lại.',
            type: 'warning',
          });
        }
      }
    } catch (err) {
      console.error('Error fetching seller orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeBusinessId, setActiveBusinessId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Order counts & metrics
  const counts = useMemo(() => {
    const total = orders.length;
    let pending = 0;
    let preparing = 0;
    let shipped = 0;
    let completed = 0;
    let cancelled = 0;

    orders.forEach((o) => {
      const s = o.status;
      if (s === 'PENDING_CONFIRMATION' || s === 'PENDING_PAYMENT') pending++;
      else if (s === 'CONFIRMED' || s === 'PREPARING') preparing++;
      else if (s === 'SHIPPED') shipped++;
      else if (s === 'DELIVERED' || s === 'COMPLETED') completed++;
      else if (s === 'CANCELLED' || s === 'REFUNDED') cancelled++;
    });

    return { total, pending, preparing, shipped, completed, cancelled };
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab === 'PENDING_CONFIRMATION' && order.status !== 'PENDING_CONFIRMATION' && order.status !== 'PENDING_PAYMENT') return false;
      if (activeTab === 'PREPARING' && order.status !== 'PREPARING' && order.status !== 'CONFIRMED') return false;
      if (activeTab === 'SHIPPED' && order.status !== 'SHIPPED') return false;
      if (activeTab === 'COMPLETED' && order.status !== 'COMPLETED' && order.status !== 'DELIVERED') return false;
      if (activeTab === 'CANCELLED' && order.status !== 'CANCELLED' && order.status !== 'REFUNDED') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const codeMatch = order.code?.toLowerCase().includes(query) || order.id?.toLowerCase().includes(query);
        const address = order.order?.shippingAddress || order.shippingAddress || {};
        const buyerName = (
          address.recipientName ||
          address.fullName ||
          address.name ||
          order.order?.buyer?.fullName ||
          order.order?.user?.fullName ||
          order.buyerName ||
          ''
        ).toLowerCase();
        const buyerPhone = (
          address.phone ||
          address.phoneNumber ||
          order.order?.buyer?.phone ||
          order.order?.user?.phone ||
          ''
        ).toLowerCase();
        const itemMatch = order.items?.some((it) => (it.title || it.bookTitle)?.toLowerCase().includes(query));

        if (!codeMatch && !buyerName.includes(query) && !buyerPhone.includes(query) && !itemMatch) {
          return false;
        }
      }

      // Format filter
      if (formatFilter !== 'ALL') {
        const hasFormat = order.items?.some((it) => it.format === formatFilter);
        if (!hasFormat) return false;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery, formatFilter]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, formatFilter]);

  const totalItems = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, validPage, pageSize]);

  // Order Handlers
  const handleConfirm = async (orderId: string) => {
    setActionLoading(true);
    try {
      const res = await orderApi.confirmOrder(orderId);
      if (res.success) {
        showToast?.({ title: 'Thành công', message: 'Đã xác nhận đơn hàng thành công!', type: 'success' });
        await loadData();
      } else {
        showToast?.({ title: 'Lỗi', message: res.error?.message || 'Không thể xác nhận đơn hàng', type: 'error' });
      }
    } catch {
      showToast?.({ title: 'Lỗi kết nối', message: 'Không thể kết nối máy chủ khi xác nhận', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrepare = async (orderId: string) => {
    setActionLoading(true);
    try {
      const res = await orderApi.prepareOrder(orderId);
      if (res.success) {
        showToast?.({ title: 'Thành công', message: 'Đã chuyển đơn hàng sang trạng thái đóng gói!', type: 'success' });
        await loadData();
      } else {
        showToast?.({ title: 'Lỗi', message: res.error?.message || 'Không thể chuẩn bị đơn hàng', type: 'error' });
      }
    } catch {
      showToast?.({ title: 'Lỗi kết nối', message: 'Lỗi kết nối khi chuẩn bị đơn hàng', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleShipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActionBox?.order?.id) return;
    if (!trackingCode.trim()) {
      showToast?.({ title: 'Thông báo', message: 'Vui lòng nhập mã vận đơn', type: 'warning' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await orderApi.shipOrder(activeActionBox.order.id, {
        carrier,
        trackingCode: trackingCode.trim(),
      });
      if (res.success) {
        showToast?.({ title: 'Thành công', message: 'Đã bàn giao cho đơn vị vận chuyển thành công!', type: 'success' });
        setActiveActionBox(null);
        setTrackingCode('');
        await loadData();
      } else {
        showToast?.({ title: 'Lỗi', message: res.error?.message || 'Không thể cập nhật vận chuyển', type: 'error' });
      }
    } catch {
      showToast?.({ title: 'Lỗi', message: 'Lỗi kết nối khi giao hàng', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliver = async (orderId: string) => {
    setActionLoading(true);
    try {
      const res = await orderApi.deliverOrder(orderId);
      if (res.success) {
        showToast?.({ title: 'Thành công', message: 'Đã cập nhật giao hàng thành công!', type: 'success' });
        await loadData();
      } else {
        showToast?.({ title: 'Lỗi', message: res.error?.message || 'Không thể hoàn tất đơn hàng', type: 'error' });
      }
    } catch {
      showToast?.({ title: 'Lỗi', message: 'Lỗi kết nối khi hoàn tất đơn hàng', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeActionBox?.order?.id) return;
    if (!cancelReason.trim()) {
      showToast?.({ title: 'Thông báo', message: 'Vui lòng nhập lý do hủy đơn', type: 'warning' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await orderApi.cancelSellerOrder(activeActionBox.order.id, {
        reason: cancelReason.trim(),
      });
      if (res.success) {
        showToast?.({ title: 'Thành công', message: 'Đã hủy đơn hàng thành công', type: 'success' });
        setActiveActionBox(null);
        setCancelReason('');
        await loadData();
      } else {
        showToast?.({ title: 'Lỗi', message: res.error?.message || 'Không thể hủy đơn hàng', type: 'error' });
      }
    } catch {
      showToast?.({ title: 'Lỗi', message: 'Lỗi kết nối khi hủy đơn hàng', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (!canViewOrders) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-4xl text-amber-600 mb-3">lock</span>
        <h2 className="text-xl font-bold text-slate-900">Không Có Quyền Truy Cập</h2>
        <p className="text-xs text-slate-500 mt-1.5">Tài khoản chưa được cấp quyền xem đơn hàng (`ORDER_VIEW`).</p>
        <Link href="/seller/dashboard" className="mt-5 px-4 py-2 rounded-xl bg-[#00875A] text-white font-semibold text-xs shadow-2xs">
          Quay lại Bảng Điều Khiển
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#00875A] rounded-full inline-block"></span>
            <span>Quản Lý Đơn Hàng</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi, xác nhận và điều phối vận chuyển đơn hàng cho{' '}
            <strong className="text-slate-800 font-semibold">{businessName || 'Gian Hàng Của Bạn'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            <span className={`material-symbols-outlined text-[16px] text-slate-500 ${loading ? 'animate-spin text-[#00875A]' : ''}`}>
              refresh
            </span>
            <span>Làm mới dữ liệu</span>
          </button>

          <Link
            href="/seller/products"
            className="px-3.5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white font-semibold text-xs transition-all shadow-2xs flex items-center gap-1.5 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span>Kho Sách Đang Bán</span>
          </Link>
        </div>
      </div>



      {/* 3. In-Page Collapsible Action Box (Bàn giao bưu tá hoặc Hủy đơn - Không dùng Popup) */}
      {activeActionBox && (
        <div className="bg-white rounded-2xl p-5 border-2 border-slate-300 shadow-sm animate-in fade-in slide-in-from-top-3 duration-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeActionBox.type === 'SHIP' ? 'bg-purple-50 text-purple-700' : 'bg-rose-50 text-rose-700'}`}>
                <span className="material-symbols-outlined text-[20px]">
                  {activeActionBox.type === 'SHIP' ? 'local_shipping' : 'cancel'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {activeActionBox.type === 'SHIP' ? 'Bàn Giao Vận Chuyển Đơn Hàng' : 'Xác Nhận Hủy Đơn Hàng'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Mã đơn: <strong className="font-mono text-slate-800">#{activeActionBox.order.code || activeActionBox.order.id}</strong>
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

          {activeActionBox.type === 'SHIP' ? (
            <form onSubmit={handleShipSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <option value="ViettelPost">Viettel Post</option>
                    <option value="VNPost">VNPost</option>
                    <option value="Ahamove">Ahamove / Giao Siêu Tốc</option>
                    <option value="TuGiao">Cửa Hàng Tự Vận Chuyển</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mã vận đơn / Tracking Code
                  </label>
                  <input
                    type="text"
                    required
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="VD: GHTK88291024VN..."
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
                  <span>{actionLoading ? 'Đang cập nhật...' : 'Xác nhận giao bưu tá'}</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Lý do hủy đơn hàng
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {['Hết hàng trong kho', 'Khách hàng yêu cầu hủy', 'Sai địa chỉ giao nhận', 'Không liên hệ được người mua'].map((reason) => (
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
                  label="Đóng"
                  onClick={() => setActiveActionBox(null)}
                />
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-[0.96]"
                >
                  <span className="material-symbols-outlined text-[15px]">cancel</span>
                  <span>{actionLoading ? 'Đang xử lý...' : 'Xác nhận hủy đơn hàng'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 4. Bộ Lọc Tabs & Ô Tìm Kiếm */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Tabs Trạng Thái */}
        <SellerFilterTabs
          tabs={[
            { id: 'ALL', label: 'Tất Cả', count: counts.total },
            { id: 'PENDING_CONFIRMATION', label: 'Chờ Xác Nhận', count: counts.pending },
            { id: 'PREPARING', label: 'Đang Chuẩn Bị', count: counts.preparing },
            { id: 'SHIPPED', label: 'Đang Giao', count: counts.shipped },
            { id: 'COMPLETED', label: 'Hoàn Tất', count: counts.completed },
            { id: 'CANCELLED', label: 'Đã Hủy', count: counts.cancelled },
          ]}
          activeTab={activeTab}
          onChange={handleTabChange}
        />

        {/* Ô Tìm Kiếm & Format Filter */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Format Selector */}
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#00875A] focus:bg-white"
          >
            <option value="ALL">Mọi Định Dạng</option>
            <option value="PHYSICAL">Sách In (Giấy)</option>
            <option value="DIGITAL">Ebook (Bản Quyền)</option>
          </select>

          {/* Search Input */}
          <div className="relative w-full md:w-72 shrink-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã đơn, SĐT, tên sách..."
              className="w-full pl-9 pr-7 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Bảng Danh Sách Đơn Hàng */}
      <SellerTableContainer>
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <div className="w-9 h-9 border-3 border-[#00875A] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="font-medium text-xs mt-2.5">Đang tải danh sách đơn hàng...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-3xl text-slate-300">
                receipt_long
              </span>
              <p className="font-semibold text-slate-700">Chưa có đơn hàng nào</p>
              <p className="text-[11.5px] text-slate-400">
                {orders.length === 0
                  ? 'Hiện tại gian hàng chưa có đơn hàng phát sinh.'
                  : 'Không tìm thấy đơn hàng nào phù hợp với bộ lọc.'}
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3.5 pl-4 pr-1 w-8">
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-[#00875A] focus:ring-[#00875A]"
                  />
                </th>
                <th className="py-3.5 px-2 w-8 text-center"></th>
                <th className="py-3.5 px-3">Mã Đơn &amp; Ngày Tạo</th>
                <th className="py-3.5 px-3">Khách Hàng &amp; Giao Nhận</th>
                <th className="py-3.5 px-3">Sản Phẩm Đặt Mua</th>
                <th className="py-3.5 px-3">Tổng Tiền &amp; Thanh Toán</th>
                <th className="py-3.5 pl-3 pr-4 text-right">Trạng Thái &amp; Thao Tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedOrders.map((order) => {
                const isSelected = selectedOrderIds.includes(order.id);
                const isExpanded = expandedOrderIds.has(order.id);
                const address = order.order?.shippingAddress || order.shippingAddress || {};
                const buyerName =
                  address.recipientName ||
                  address.fullName ||
                  address.name ||
                  order.order?.buyer?.fullName ||
                  order.order?.buyer?.name ||
                  order.order?.user?.fullName ||
                  order.order?.user?.name ||
                  order.buyerName ||
                  order.recipientName ||
                  'Khách Hàng';
                const buyerPhone =
                  address.phone ||
                  address.phoneNumber ||
                  order.order?.buyer?.phone ||
                  order.order?.user?.phone ||
                  '—';
                const buyerAddress =
                  address.fullAddress ||
                  [address.line1 || address.address, address.ward, address.province || address.city]
                    .filter(Boolean)
                    .join(', ') ||
                  address.address ||
                  'Địa chỉ tiêu chuẩn';

                const items = order.items || [];
                const physicalItems = items.filter((it) => it.format !== 'DIGITAL' && it.format !== 'EBOOK');
                const ebookItems = items.filter((it) => it.format === 'DIGITAL' || it.format === 'EBOOK');
                const hasPhysical = physicalItems.length > 0 || (order.requiresShipping && ebookItems.length === 0);

                return (
                  <React.Fragment key={order.id}>
                    <tr
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isExpanded ? 'bg-emerald-50/30' : isSelected ? 'bg-emerald-50/20' : 'bg-white'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 pl-4 pr-1 align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="w-4 h-4 rounded border-slate-300 text-[#00875A] focus:ring-[#00875A]"
                        />
                      </td>

                      {/* Mũi tên mở rộng */}
                      <td className="py-3.5 px-2 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => toggleExpandOrder(order.id)}
                          className="w-6 h-6 rounded-md hover:bg-emerald-100 text-slate-500 hover:text-emerald-800 flex items-center justify-center transition-all cursor-pointer"
                          title={isExpanded ? 'Thu gọn chi tiết' : 'Mở rộng chi tiết đơn'}
                        >
                          <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${isExpanded ? 'rotate-90 text-emerald-700' : ''}`}>
                            chevron_right
                          </span>
                        </button>
                      </td>

                      {/* Mã đơn & Ngày tạo */}
                      <td className="py-3.5 px-3 align-middle">
                        <Link
                          href={`/seller/orders/${order.id}`}
                          className="font-mono text-[12.5px] font-bold text-slate-900 hover:text-[#00875A] transition-colors block"
                        >
                          #{order.code || order.id.slice(0, 8).toUpperCase()}
                        </Link>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'Mới tạo'}
                        </span>
                      </td>

                      {/* Khách hàng & Địa chỉ */}
                      <td className="py-3.5 px-3 align-middle">
                        <div className="font-semibold text-slate-800 text-[12.5px] truncate max-w-[190px]" title={buyerName}>
                          {buyerName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                          {buyerPhone}
                        </div>
                        <div className="text-[10.5px] text-slate-500 truncate max-w-[190px] mt-0.5" title={buyerAddress}>
                          {buyerAddress}
                        </div>
                      </td>

                      {/* Danh sách sản phẩm */}
                      <td className="py-3.5 px-3 align-middle">
                        <div className="space-y-1.5">
                          {items.slice(0, 2).map((item, idx) => {
                            const itTitle = item.title || item.bookTitle || 'Sách HUKI';
                            const itCover = item.coverImage || item.coverUrl || item.bookCoverUrl;
                            const itPrice = Number(item.price ?? item.unitPrice ?? 0);
                            const isEbook = item.format === 'DIGITAL' || item.format === 'EBOOK';

                            return (
                              <div key={item.id || idx} className="flex items-center gap-2">
                                <div className="w-7 h-9 rounded bg-slate-100 shrink-0 overflow-hidden border border-slate-200">
                                  {itCover ? (
                                    <img src={itCover} alt={itTitle} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                      <span className="material-symbols-outlined text-[13px]">menu_book</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1">
                                    {isEbook ? (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                        EBOOK
                                      </span>
                                    ) : (
                                      <span className="px-1 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                                        SÁCH IN
                                      </span>
                                    )}
                                    <span className="font-medium text-slate-900 text-xs truncate max-w-[200px]" title={itTitle}>
                                      {itTitle}
                                    </span>
                                  </div>
                                  <span className="text-[10.5px] text-slate-500 font-mono">
                                    SL: {item.quantity || 1} × {itPrice.toLocaleString('vi-VN')} đ
                                  </span>
                                </div>
                              </div>
                            );
                          })}

                          {items.length > 2 && (
                            <p className="text-[10.5px] text-slate-400 italic">
                              + {items.length - 2} sản phẩm khác...
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Tổng tiền & Thanh toán */}
                      <td className="py-3.5 px-3 align-middle">
                        <span className="font-mono text-xs font-bold text-slate-900 block">
                          {order.grandTotal ? `${order.grandTotal.toLocaleString('vi-VN')} đ` : '0 đ'}
                        </span>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <span>{order.order?.paymentMethod || 'PayOS'}</span>
                          </span>
                          {order.shippingFee !== undefined && order.shippingFee > 0 && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Ship: {order.shippingFee.toLocaleString('vi-VN')} đ
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Trạng thái & Thao tác */}
                      <td className="py-3.5 pl-3 pr-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <SellerStatusBadge status={order.status} />

                          <Link href={`/seller/orders/${order.id}`}>
                            <SellerActionButton
                              variant="view"
                              label="Chi tiết"
                              icon="visibility"
                              size="sm"
                            />
                          </Link>

                          {order.status === 'PENDING_CONFIRMATION' && (
                            <SellerActionButton
                              variant="success"
                              label={hasPhysical ? "Xác nhận" : "Kích hoạt"}
                              icon={hasPhysical ? "check" : "bolt"}
                              size="sm"
                              onClick={() => handleConfirm(order.id)}
                              loading={actionLoading}
                            />
                          )}

                          {order.status === 'CONFIRMED' && hasPhysical && (
                            <SellerActionButton
                              variant="info"
                              label="Đóng gói"
                              icon="inventory_2"
                              size="sm"
                              onClick={() => handlePrepare(order.id)}
                              loading={actionLoading}
                            />
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Master-Detail Expandable Subcard (3 cards) */}
                    {isExpanded && (
                      <tr className="bg-emerald-50/20 border-b border-emerald-100">
                        <td colSpan={7} className="p-4 sm:p-5">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-xl p-4 border border-emerald-200/70 shadow-xs">
                            {/* Cột 1: Thông tin người nhận & Địa chỉ */}
                            <div className="space-y-2 text-xs border-r border-slate-100 pr-3">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                                <span>Địa Chỉ Nhận Hàng &amp; Người Mua</span>
                              </div>
                              <div className="space-y-1.5 pt-1 text-[11px]">
                                <div><span className="text-slate-400">Người nhận: </span><span className="font-semibold text-slate-800">{buyerName}</span></div>
                                <div><span className="text-slate-400">Số điện thoại: </span><span className="font-mono font-semibold text-slate-800">{buyerPhone}</span></div>
                                <div><span className="text-slate-400">Địa chỉ: </span><span className="text-slate-700">{buyerAddress}</span></div>
                                <div><span className="text-slate-400">Thời gian đặt: </span><span className="font-mono text-slate-600">{order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '—'}</span></div>
                              </div>
                            </div>

                            {/* Cột 2: Chi tiết kiện hàng & Vận đơn */}
                            <div className="space-y-2 text-xs border-r border-slate-100 pr-3">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">inventory</span>
                                <span>Chi Tiết Kiện Hàng &amp; Vận Chuyển</span>
                              </div>
                              <div className="space-y-1.5 pt-1 text-[11px]">
                                <div><span className="text-slate-400">Đơn vị giao hàng: </span><span className="font-semibold">{order.carrier || (hasPhysical ? 'Chờ chọn bưu tá' : 'Ebook DRM Số')}</span></div>
                                {order.trackingCode && <div><span className="text-slate-400">Mã vận đơn: </span><span className="font-mono font-bold text-purple-700">{order.trackingCode}</span></div>}
                                <div><span className="text-slate-400">Tổng sản phẩm: </span><span className="font-semibold">{items.reduce((sum, it) => sum + (it.quantity || 1), 0)} cuốn ({items.length} đầu sách)</span></div>
                                <div><span className="text-slate-400">Tổng thanh toán: </span><span className="font-bold text-slate-900">{order.grandTotal?.toLocaleString('vi-VN')} đ</span></div>
                              </div>
                            </div>

                            {/* Cột 3: Hành động xử lý đơn */}
                            <div className="space-y-2 text-xs flex flex-col justify-between">
                              <div>
                                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[14px]">tune</span>
                                  <span>Xử Lý Đơn Hàng</span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">
                                  Bàn giao bưu tá hoặc in phiếu gửi hàng trực tiếp từ hệ thống.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-2">
                                <Link
                                  href={`/seller/orders/${order.id}`}
                                  className="px-3 py-1.5 rounded-lg bg-[#003B2B] hover:bg-[#00281D] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                                  <span>Mở Chi Tiết Đơn</span>
                                </Link>
                                {order.status === 'PREPARING' && hasPhysical && (
                                  <button
                                    onClick={() => setActiveActionBox({ type: 'SHIP', order })}
                                    className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                                    <span>Bàn Giao Bưu Tá</span>
                                  </button>
                                )}
                                {order.status === 'PENDING_CONFIRMATION' && (
                                  <button
                                    onClick={() => setActiveActionBox({ type: 'CANCEL', order })}
                                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                                  >
                                    Hủy Đơn
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Phân trang mặc định */}
        <SellerPagination
          currentPage={validPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="đơn hàng"
        />
      </SellerTableContainer>
    </div>
  );
}

export default function SellerOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-4xl text-[#00875A] animate-spin">
              refresh
            </span>
            <p className="mt-2 text-xs text-slate-500 font-medium">Đang tải đơn hàng...</p>
          </div>
        </div>
      }
    >
      <SellerOrdersContent />
    </Suspense>
  );
}
