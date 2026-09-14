import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../../api/orderApi';
import { businessApi } from '../../api/businessApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { can, PERMISSIONS } from '../../utils/permissions';
import OrderDetailDrawer from '../../components/seller/OrderDetailDrawer';

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất Cả' },
  { key: 'PENDING_CONFIRMATION', label: 'Chờ Xác Nhận' },
  { key: 'PREPARING', label: 'Đang Chuẩn Bị' },
  { key: 'SHIPPED', label: 'Đang Giao' },
  { key: 'COMPLETED', label: 'Hoàn Tất' },
  { key: 'CANCELLED', label: 'Hủy & Hoàn Tiền' },
];

const STATUS_CONFIG = {
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

export default function SellerOrdersPage() {
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const { showToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  // Modal states
  const [modalState, setModalState] = useState(null); // { type: 'SHIP' | 'CANCEL', order }
  const [carrier, setCarrier] = useState('GHTK');
  const [trackingCode, setTrackingCode] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [drawerOrder, setDrawerOrder] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const businessId = user?.business?.id || activeBusinessId;
  const canViewOrders = can(PERMISSIONS.ORDER_VIEW, businessId, user);
  const canProcessOrders = can(PERMISSIONS.ORDER_PROCESS, businessId, user);
  const canCancelOrders = can(PERMISSIONS.ORDER_CANCEL, businessId, user);

  // Load Business Name and Orders
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Resolve business name
      let bizId = user?.business?.id || activeBusinessId;
      if (!bizId) {
        try {
          const bizRes = await businessApi.getMyBusiness();
          if (bizRes.success && bizRes.data) {
            bizId = bizRes.data.id;
            setActiveBusinessId(bizId);
            setBusinessName(bizRes.data.displayName || bizRes.data.name || 'Gian Hàng Của Tôi');
          }
        } catch {
          // ignore
        }
      } else {
        try {
          const bizRes = await businessApi.getMyBusiness();
          if (bizRes.success && bizRes.data) {
            setBusinessName(bizRes.data.displayName || bizRes.data.name || 'Gian Hàng Của Tôi');
          }
        } catch {
          // ignore
        }
      }

      // 2. Fetch seller orders
      const orderRes = await orderApi.getSellerOrders({ limit: 100 });
      if (orderRes.success && orderRes.data) {
        const items = Array.isArray(orderRes.data)
          ? orderRes.data
          : Array.isArray(orderRes.data?.data)
          ? orderRes.data.data
          : Array.isArray(orderRes.data?.items)
          ? orderRes.data.items
          : [];
        setOrders(items);
      } else {
        setOrders([]);
        if (orderRes.error?.code === 'AUTHZ_ROLE_INSUFFICIENT' || orderRes.error?.status === 403) {
          showToast({
            title: 'Chưa đồng bộ quyền Người Bán',
            message: 'Tài khoản của bạn đang cập nhật quyền Doanh Nghiệp. Vui lòng bấm tải lại hoặc đăng nhập lại.',
          }, 'warning');
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

  const openOrderDrawer = async (orderId) => {
    setDrawerLoading(true);
    try {
      const res = await orderApi.getSellerOrderDetail(orderId);
      if (res.success && res.data) setDrawerOrder(res.data);
      else showToast?.(res.error?.message || 'Không thể tải chi tiết đơn hàng.', 'error');
    } catch {
      showToast?.('Lỗi kết nối khi tải chi tiết đơn hàng.', 'error');
    } finally {
      setDrawerLoading(false);
    }
  };

  const refreshAfterAction = async (orderId) => {
    await loadData();
    if (drawerOrder?.id === orderId) await openOrderDrawer(orderId);
  };

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
        const buyerName = order.order?.shippingAddress?.fullName?.toLowerCase() || '';
        const buyerPhone = order.order?.shippingAddress?.phone?.toLowerCase() || '';
        const itemMatch = order.items?.some((it) => it.title?.toLowerCase().includes(query));

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

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, formatFilter]);

  // Total pages and paginated items
  const totalItems = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, validPage, pageSize]);

  const startIndex = totalItems === 0 ? 0 : (validPage - 1) * pageSize + 1;
  const endIndex = Math.min(validPage * pageSize, totalItems);

  // Order Handlers
  const handleConfirm = async (orderId) => {
    setActionLoading(true);
    try {
      const res = await orderApi.confirmOrder(orderId);
      if (res.success) {
        showToast?.('Đã xác nhận đơn hàng thành công!', 'success');
        await refreshAfterAction(orderId);
      } else {
        showToast?.(res.error?.message || 'Không thể xác nhận đơn hàng', 'error');
      }
    } catch {
      showToast?.('Lỗi kết nối khi xác nhận đơn hàng', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrepare = async (orderId) => {
    setActionLoading(true);
    try {
      const res = await orderApi.prepareOrder(orderId);
      if (res.success) {
        showToast?.('Đã chuyển đơn hàng sang trạng thái đóng gói!', 'success');
        await refreshAfterAction(orderId);
      } else {
        showToast?.(res.error?.message || 'Không thể chuẩn bị đơn hàng', 'error');
      }
    } catch {
      showToast?.('Lỗi kết nối khi chuẩn bị đơn hàng', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShipSubmit = async (e) => {
    e.preventDefault();
    if (!modalState?.order?.id) return;
    if (!trackingCode.trim()) {
      showToast?.('Vui lòng nhập mã vận đơn', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const res = await orderApi.shipOrder(modalState.order.id, {
        carrier,
        trackingCode: trackingCode.trim(),
      });
      if (res.success) {
        showToast?.('Đã bàn giao cho đơn vị vận chuyển thành công!', 'success');
        setModalState(null);
        setTrackingCode('');
        await refreshAfterAction(modalState.order.id);
      } else {
        showToast?.(res.error?.message || 'Không thể cập nhật vận chuyển', 'error');
      }
    } catch {
      showToast?.('Lỗi kết nối khi giao hàng', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliver = async (orderId) => {
    setActionLoading(true);
    try {
      const res = await orderApi.deliverOrder(orderId);
      if (res.success) {
        showToast?.('Đã cập nhật giao hàng thành công!', 'success');
        await refreshAfterAction(orderId);
      } else {
        showToast?.(res.error?.message || 'Không thể hoàn tất đơn hàng', 'error');
      }
    } catch {
      showToast?.('Lỗi kết nối khi hoàn tất đơn hàng', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!modalState?.order?.id) return;
    if (!cancelReason.trim()) {
      showToast?.('Vui lòng nhập lý do hủy đơn', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const res = await orderApi.cancelSellerOrder(modalState.order.id, {
        reason: cancelReason.trim(),
      });
      if (res.success) {
        showToast?.('Đã hủy đơn hàng thành công', 'success');
        setModalState(null);
        setCancelReason('');
        await refreshAfterAction(modalState.order.id);
      } else {
        showToast?.(res.error?.message || 'Không thể hủy đơn hàng', 'error');
      }
    } catch {
      showToast?.('Lỗi kết nối khi hủy đơn hàng', 'error');
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

  const toggleSelectOrder = (id) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (!canViewOrders) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-4xl text-amber-600 mb-3">lock</span>
        <h2 className="text-xl font-bold text-on-surface">Không Có Quyền Truy Cập</h2>
        <p className="text-sm text-on-surface-variant mt-2">Tài khoản chưa được cấp quyền xem đơn hàng (`ORDER_VIEW`).</p>
        <Link to="/seller/dashboard" className="mt-5 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm">Quay lại Bảng Điều Khiển</Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-background text-on-surface font-body-md text-body-md antialiased min-h-screen py-6">
      <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-space-sm pb-1">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-medium">
              Quản Lý Đơn Hàng
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              Theo dõi, xử lý và phân loại thực hiện đơn hàng cho{' '}
              <strong className="text-on-surface font-semibold">
                {businessName || 'Doanh Nghiệp / Gian Hàng Của Bạn'}
              </strong>
              .
            </p>
          </div>
          <div className="flex items-center gap-space-xs">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-title-md text-body-sm font-medium hover:border-on-surface transition-all shadow-xs"
            >
              <span className={`material-symbols-outlined text-[18px] text-on-surface-variant ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Làm mới</span>
            </button>
            <Link
              to="/seller/books"
              className="flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-primary text-on-primary font-title-md text-body-sm font-medium hover:bg-primary/90 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
              <span>Xem Sách Đang Bán</span>
            </Link>
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-space-sm">
          {/* Card 1: Chờ xác nhận */}
          <div
            onClick={() => setActiveTab('PENDING_CONFIRMATION')}
            className={`bg-surface-container-lowest border rounded-xl p-space-md flex flex-col justify-between shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'PENDING_CONFIRMATION' ? 'border-secondary ring-2 ring-secondary/20' : 'border-outline-variant'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-secondary"></div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-md text-label-md font-semibold">Chờ xác nhận</span>
              <span className="material-symbols-outlined text-[20px] text-secondary">hourglass_top</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg font-bold text-secondary">
                {counts.pending}
              </span>
              <span className="font-label-sm text-[11px] text-secondary font-medium">
                {counts.pending > 0 ? 'Cần duyệt ngay' : 'Đã xử lý xong'}
              </span>
            </div>
          </div>

          {/* Card 2: Đang chuẩn bị */}
          <div
            onClick={() => setActiveTab('PREPARING')}
            className={`bg-surface-container-lowest border rounded-xl p-space-md flex flex-col justify-between shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'PREPARING' ? 'border-primary ring-2 ring-primary/20' : 'border-outline-variant'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary"></div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-md text-label-md font-semibold">Đang chuẩn bị kho</span>
              <span className="material-symbols-outlined text-[20px] text-primary">inventory</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {counts.preparing}
              </span>
              <span className="font-label-sm text-[11px] text-primary font-medium">
                {counts.preparing > 0 ? 'Đóng gói gửi đi' : 'Không có tồn đọng'}
              </span>
            </div>
          </div>

          {/* Card 3: Đang giao */}
          <div
            onClick={() => setActiveTab('SHIPPED')}
            className={`bg-surface-container-lowest border rounded-xl p-space-md flex flex-col justify-between shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'SHIPPED' ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-outline-variant'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500"></div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-md text-label-md font-semibold">Đang luân chuyển</span>
              <span className="material-symbols-outlined text-[20px] text-purple-600">local_shipping</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {counts.shipped}
              </span>
              <span className="font-label-sm text-[11px] text-on-surface-variant">
                Đang giao khách
              </span>
            </div>
          </div>

          {/* Card 4: Hoàn tất */}
          <div
            onClick={() => setActiveTab('COMPLETED')}
            className={`bg-surface-container-lowest border rounded-xl p-space-md flex flex-col justify-between shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'COMPLETED' ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-outline-variant'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500"></div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-md text-label-md font-semibold">Giao &amp; Hoàn tất</span>
              <span className="material-symbols-outlined text-[20px] text-teal-600">task_alt</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg font-bold text-teal-700 dark:text-teal-300">
                {counts.completed}
              </span>
              <span className="font-label-sm text-[11px] text-teal-700 dark:text-teal-300 font-medium">
                Thành công
              </span>
            </div>
          </div>

          {/* Card 5: Hủy / Hoàn tiền */}
          <div
            onClick={() => setActiveTab('CANCELLED')}
            className={`bg-surface-container-lowest border rounded-xl p-space-md flex flex-col justify-between shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden ${
              activeTab === 'CANCELLED' ? 'border-error ring-2 ring-error/20' : 'border-outline-variant'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-error"></div>
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-label-md text-label-md font-semibold">Đã hủy / Hoàn trả</span>
              <span className="material-symbols-outlined text-[20px] text-error">error_outline</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg font-bold text-error">
                {counts.cancelled}
              </span>
              <span className="font-label-sm text-[11px] text-error font-medium">
                {counts.cancelled > 0 ? 'Đã hủy' : '0 đơn hủy'}
              </span>
            </div>
          </div>
        </div>

        {/* Main Orders Table Section */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xs overflow-hidden">
          {/* Status Navigation Tabs */}
          <div className="flex items-center gap-space-xs px-space-md pt-2 border-b border-outline-variant overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              let tabCount = counts.total;
              if (tab.key === 'PENDING_CONFIRMATION') tabCount = counts.pending;
              else if (tab.key === 'PREPARING') tabCount = counts.preparing;
              else if (tab.key === 'SHIPPED') tabCount = counts.shipped;
              else if (tab.key === 'COMPLETED') tabCount = counts.completed;
              else if (tab.key === 'CANCELLED') tabCount = counts.cancelled;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-space-md py-3 font-title-md text-body-sm font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-primary-fixed text-on-primary-fixed-variant'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    {tabCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filters Bar */}
          <div className="p-space-md flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-low/40">
            <div className="flex flex-wrap items-center gap-space-xs flex-1">
              {/* Search */}
              <div className="relative min-w-[300px] flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo mã đơn #..., người nhận, SĐT, tựa sách..."
                  className="w-full pl-9 pr-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm placeholder:text-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>

              {/* Format Filter */}
              <div className="relative">
                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                  className="appearance-none bg-surface-container-lowest border border-outline-variant text-on-surface rounded-lg pl-3 pr-8 py-2 text-body-sm cursor-pointer hover:border-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="ALL">Tất cả định dạng</option>
                  <option value="PHYSICAL">Sách Giấy Vật Lý</option>
                  <option value="DIGITAL">Ebook DRM Kỹ Thuật Số</option>
                  <option value="BOTH">Combo Hybrid (Giấy + Ebook)</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                  expand_more
                </span>
              </div>
            </div>

            {(searchQuery || formatFilter !== 'ALL' || activeTab !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFormatFilter('ALL');
                  setActiveTab('ALL');
                }}
                className="px-3 py-2 rounded-lg text-on-surface-variant hover:text-primary text-body-sm flex items-center gap-1 font-medium transition-colors"
                title="Đặt lại bộ lọc"
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>Đặt lại</span>
              </button>
            )}
          </div>

          {/* Selected count action bar */}
          {selectedOrderIds.length > 0 && (
            <div className="px-space-md py-2.5 bg-primary-fixed/40 border-t border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-space-xs text-on-primary-fixed">
                <span className="material-symbols-outlined text-[20px] text-primary">check_circle</span>
                <span className="font-title-md text-body-sm font-semibold">
                  Đã chọn {selectedOrderIds.length} đơn hàng
                </span>
              </div>
              <div className="flex items-center gap-space-xs">
                <button
                  onClick={() => setSelectedOrderIds([])}
                  className="px-3 py-1.5 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container rounded-lg text-body-sm font-medium transition-colors"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
          )}

          {/* Table / Empty State */}
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-on-surface-variant font-medium">Đang tải danh sách đơn hàng...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center space-y-4 max-w-md mx-auto px-4">
              <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center mx-auto text-on-surface-variant">
                <span className="material-symbols-outlined text-[36px]">receipt_long</span>
              </div>
              <div>
                <h3 className="text-title-lg font-bold text-on-surface">Chưa có đơn hàng nào</h3>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  {orders.length === 0
                    ? 'Hiện tại gian hàng của bạn chưa nhận được đơn hàng mới từ người mua.'
                    : 'Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại.'}
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                {orders.length === 0 ? (
                  <Link
                    to="/seller/books/hybrid/new"
                    className="px-4 py-2 bg-primary text-on-primary rounded-lg text-body-sm font-medium hover:bg-primary/90 transition-colors shadow-xs inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Đăng thêm sách bán</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFormatFilter('ALL');
                      setActiveTab('ALL');
                    }}
                    className="px-4 py-2 border border-outline-variant bg-surface-container-lowest rounded-lg text-body-sm font-medium hover:bg-surface-container transition-colors inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                    <span>Xóa bộ lọc</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
                    <th className="py-3.5 pl-space-md pr-2 w-10">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-outline text-primary focus:ring-primary"
                      />
                    </th>
                    <th className="py-3.5 px-3">Mã Đơn Hàng</th>
                    <th className="py-3.5 px-3 min-w-[160px]">Khách Hàng</th>
                    <th className="py-3.5 px-3 min-w-[280px]">Sản Phẩm</th>
                    <th className="py-3.5 px-3">Định Dạng</th>
                    <th className="py-3.5 px-3 text-right">Tổng Tiền</th>
                    <th className="py-3.5 px-3">Thanh Toán</th>
                    <th className="py-3.5 px-3 min-w-[160px]">Vận Chuyển</th>
                    <th className="py-3.5 px-3 min-w-[160px]">Trạng Thái</th>
                    <th className="py-3.5 pr-space-md pl-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant text-body-sm">
                  {paginatedOrders.map((order) => {
                    const isSelected = selectedOrderIds.includes(order.id);
                    const statusCfg = STATUS_CONFIG[order.status] || {
                      label: order.status,
                      bg: 'bg-surface-container text-on-surface-variant',
                      icon: 'info',
                    };
                    const buyerName = order.order?.shippingAddress?.fullName || 'Khách Hàng';
                    const buyerPhone = order.order?.shippingAddress?.phone || 'Chưa cập nhật SĐT';
                    const buyerAddress = order.order?.shippingAddress?.fullAddress || order.order?.shippingAddress?.address || order.order?.shippingAddress?.city || 'Địa chỉ tiêu chuẩn';
                    const isDigitalOnly = order.items?.every((it) => it.format === 'DIGITAL') || !order.requiresShipping;

                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-surface-container-low/60 transition-colors ${
                          isSelected ? 'bg-primary-fixed/10' : 'bg-surface-container-lowest'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-4 pl-space-md pr-2 align-top">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOrder(order.id)}
                            className="w-4 h-4 rounded border-outline text-primary focus:ring-primary"
                          />
                        </td>

                        {/* Order Code & Date */}
                        <td className="py-4 px-3 align-top">
                          <span className="font-title-md text-primary font-bold block">
                            #{order.code || order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="text-[11px] text-outline block mt-0.5">
                            {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'Mới tạo'}
                          </span>
                        </td>

                        {/* Customer Info */}
                        <td className="py-4 px-3 align-top">
                          <div className="font-semibold text-on-surface">{buyerName}</div>
                          <div className="text-[12px] text-on-surface-variant">{buyerPhone}</div>
                          <div className="text-[11px] text-outline truncate max-w-[180px]" title={buyerAddress}>
                            {buyerAddress}
                          </div>
                        </td>

                        {/* Products List */}
                        <td className="py-4 px-3 align-top">
                          <div className="space-y-2">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item, idx) => {
                                const itTitle = item.title || item.bookTitle || 'Sách HUKI';
                                const itCover = item.coverImage || item.coverUrl || item.bookCoverUrl;
                                const itPrice = Number(item.price ?? item.unitPrice ?? 0);
                                return (
                                  <div key={item.id || idx} className="flex items-start gap-2.5">
                                    <div className="w-9 h-12 bg-surface-container rounded shrink-0 overflow-hidden border border-outline-variant">
                                      {itCover ? (
                                        <img
                                          src={itCover}
                                          alt={itTitle}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-surface-container-high text-outline">
                                          <span className="material-symbols-outlined text-[16px]">menu_book</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-on-surface text-[13px] leading-tight truncate max-w-[220px]" title={itTitle}>
                                        {itTitle}
                                      </p>
                                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                                        SL: <strong className="text-on-surface">{item.quantity || 1}</strong> × {itPrice > 0 ? `${itPrice.toLocaleString('vi-VN')}đ` : '0đ'}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-outline text-[12px] italic">Chi tiết sản phẩm...</p>
                            )}
                          </div>
                        </td>

                        {/* Format */}
                        <td className="py-4 px-3 align-top">
                          {isDigitalOnly ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-300">
                              EBOOK DRM
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-container-high text-on-surface-variant border border-outline-variant">
                              SÁCH GIẤY
                            </span>
                          )}
                        </td>

                        {/* Grand Total */}
                        <td className="py-4 px-3 align-top text-right">
                          <span className="font-title-md text-body-md font-bold text-primary block">
                            {order.grandTotal ? `${order.grandTotal.toLocaleString('vi-VN')}đ` : '0đ'}
                          </span>
                          {order.shippingFee > 0 && (
                            <span className="text-[11px] text-outline block">
                              Ship: {order.shippingFee.toLocaleString('vi-VN')}đ
                            </span>
                          )}
                        </td>

                        {/* Payment */}
                        <td className="py-4 px-3 align-top">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-tertiary-fixed text-on-tertiary-fixed-variant">
                            <span className="material-symbols-outlined text-[14px]">
                              {order.order?.paymentMethod === 'COD' ? 'payments' : 'check_circle'}
                            </span>
                            {order.order?.paymentMethod || 'PayOS / QR'}
                          </span>
                        </td>

                        {/* Shipping */}
                        <td className="py-4 px-3 align-top">
                          {isDigitalOnly ? (
                            <div className="text-[12px] text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px] text-cyan-600">lock_open</span>
                              <span>Cấp quyền số (DRM)</span>
                            </div>
                          ) : order.carrier ? (
                            <div>
                              <p className="font-semibold text-on-surface text-[12px]">{order.carrier}</p>
                              {order.trackingCode && (
                                <p className="text-[11px] font-mono text-outline">{order.trackingCode}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[12px] text-outline italic">Chưa bàn giao ship</span>
                          )}
                        </td>

                        {/* Operational Status */}
                        <td className="py-4 px-3 align-top">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusCfg.bg}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">{statusCfg.icon}</span>
                            {statusCfg.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 pr-space-md pl-3 align-top text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openOrderDrawer(order.id)}
                              className="px-3 py-1.5 rounded-lg border border-outline-variant text-primary font-bold text-[12px] hover:bg-primary/5 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[15px]">visibility</span>
                              Xem chi tiết
                            </button>
                            {/* Các thao tác nghiệp vụ được tập trung trong side drawer. */}
                            {false && (
                            <>
                            {order.status === 'PENDING_CONFIRMATION' && (
                              <>
                                {can(PERMISSIONS.ORDER_PROCESS, user?.business?.id || activeBusinessId, user) && (
                                  <button
                                    onClick={() => handleConfirm(order.id)}
                                    disabled={actionLoading}
                                    className="px-3 py-1 bg-primary text-on-primary rounded text-[12px] font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1 shadow-xs"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">check</span>
                                    <span>Xác nhận</span>
                                  </button>
                                )}
                                {can(PERMISSIONS.ORDER_CANCEL, user?.business?.id || activeBusinessId, user) && (
                                  <button
                                    onClick={() => setModalState({ type: 'CANCEL', order })}
                                    disabled={actionLoading}
                                    className="px-2 py-0.5 text-error hover:bg-error/10 rounded text-[11px] font-medium transition-colors"
                                  >
                                    Hủy đơn
                                  </button>
                                )}
                              </>
                            )}

                            {order.status === 'CONFIRMED' && (
                              can(PERMISSIONS.ORDER_PROCESS, user?.business?.id || activeBusinessId, user) ? (
                                <button
                                  onClick={() => handlePrepare(order.id)}
                                  disabled={actionLoading}
                                  className="px-3 py-1 bg-indigo-600 text-white rounded text-[12px] font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-1 shadow-xs"
                                >
                                  <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                                  <span>Chuẩn bị kho</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-outline italic">Đã xác nhận</span>
                              )
                            )}

                            {order.status === 'PREPARING' && (
                              can(PERMISSIONS.ORDER_PROCESS, user?.business?.id || activeBusinessId, user) ? (
                                <button
                                  onClick={() => setModalState({ type: 'SHIP', order })}
                                  disabled={actionLoading}
                                  className="px-3 py-1 bg-purple-600 text-white rounded text-[12px] font-semibold hover:bg-purple-700 transition-colors flex items-center gap-1 shadow-xs"
                                >
                                  <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                                  <span>Giao hàng</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-outline italic">Đang đóng gói</span>
                              )
                            )}

                            {order.status === 'SHIPPED' && (
                              can(PERMISSIONS.ORDER_PROCESS, user?.business?.id || activeBusinessId, user) ? (
                                <button
                                  onClick={() => handleDeliver(order.id)}
                                  disabled={actionLoading}
                                  className="px-3 py-1 bg-teal-600 text-white rounded text-[12px] font-semibold hover:bg-teal-700 transition-colors flex items-center gap-1 shadow-xs"
                                >
                                  <span className="material-symbols-outlined text-[14px]">task_alt</span>
                                  <span>Đã giao xong</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-outline italic">Đang giao</span>
                              )
                            )}

                            {(order.status === 'COMPLETED' || order.status === 'CANCELLED' || order.status === 'DELIVERED') && (
                              <span className="text-[11px] text-outline">Hoàn tất quy trình</span>
                            )}
                            </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalItems > 0 && (
              <div className="px-space-md py-3 bg-surface-container-low/40 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-3 text-body-sm text-on-surface-variant">
                <div className="flex flex-wrap items-center gap-2">
                  <span>
                    Hiển thị <strong className="text-on-surface font-semibold">{startIndex} - {endIndex}</strong> trên tổng số <strong className="text-on-surface font-semibold">{totalItems}</strong> đơn hàng
                  </span>
                  <span className="text-outline">|</span>
                  <div className="flex items-center gap-1.5">
                    <span>Mỗi trang:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 bg-surface-container-lowest border border-outline-variant rounded text-on-surface text-body-sm focus:outline-none focus:border-primary"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={validPage <= 1}
                    className="p-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Trang trước"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                    const isActive = p === validPage;
                    return (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-[32px] h-8 px-2 rounded-lg text-body-sm font-semibold transition-colors ${
                          isActive
                            ? 'bg-primary text-on-primary shadow-xs'
                            : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validPage >= totalPages}
                    className="p-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Trang sau"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </main>

      <OrderDetailDrawer
        order={drawerOrder}
        loading={drawerLoading}
        onClose={() => { setDrawerOrder(null); setDrawerLoading(false); }}
        onConfirm={handleConfirm}
        onPrepare={handlePrepare}
        onShip={(order) => setModalState({ type: 'SHIP', order })}
        onDeliver={handleDeliver}
        onCancel={(order) => { setCancelReason(''); setModalState({ type: 'CANCEL', order }); }}
        canProcess={canProcessOrders}
        canCancel={canCancelOrders}
        actionLoading={actionLoading}
      />

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
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-body-sm text-on-surface-variant">
              Cập nhật mã vận đơn cho đơn hàng{' '}
              <strong className="text-on-surface">#{modalState.order.code || modalState.order.id}</strong>.
            </p>

            <form onSubmit={handleShipSubmit} className="space-y-4">
              <div>
                <label className="block text-body-sm font-semibold text-on-surface mb-1">
                  Đơn vị vận chuyển
                </label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="GHTK">Giao Hàng Tiết Kiệm (GHTK)</option>
                  <option value="ViettelPost">Viettel Post</option>
                  <option value="VNPost">VNPost</option>
                  <option value="Ahamove">Ahamove / Giao Siêu Tốc</option>
                  <option value="TuGiao">Cửa Hàng Tự Vận Chuyển</option>
                </select>
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-on-surface mb-1">
                  Mã vận đơn / Tracking Code
                </label>
                <input
                  type="text"
                  required
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="VD: GHTK88291024VN..."
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalState(null)}
                  className="px-4 py-2 text-body-sm font-medium border border-outline-variant rounded-lg hover:bg-surface-container transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-body-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  {actionLoading ? 'Đang cập nhật...' : 'Xác nhận giao hàng'}
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
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-body-sm text-on-surface-variant">
              Bạn có chắc chắn muốn hủy đơn hàng{' '}
              <strong className="text-on-surface">#{modalState.order.code || modalState.order.id}</strong> không?
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-body-sm font-semibold text-on-surface mb-1">
                  Lý do hủy đơn
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {['Hết hàng', 'Khách yêu cầu', 'Sai địa chỉ'].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setCancelReason(reason)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${cancelReason === reason ? 'border-error bg-error/10 text-error' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="VD: Hết hàng trong kho, Khách yêu cầu hủy..."
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-sm text-on-surface focus:outline-none focus:border-error"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalState(null)}
                  className="px-4 py-2 text-body-sm font-medium border border-outline-variant rounded-lg hover:bg-surface-container transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-body-sm font-semibold bg-error hover:bg-error/90 text-on-error rounded-lg transition-colors shadow-xs"
                >
                  {actionLoading ? 'Đang xử lý...' : 'Xác nhận hủy đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
