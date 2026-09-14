import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { orderApi } from '../../api/orderApi';
import { useAuth } from '../../context/AuthContext';

export default function OrderTrackingPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [ordersList, setOrdersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orderReceived, setOrderReceived] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrdersData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (id) {
        // Fetch single order detail
        const res = await orderApi.getBuyerOrderDetail(id);
        if (res.success && res.data) {
          setOrder(res.data);
          const isDelivered =
            res.data.status === 'DELIVERED' ||
            res.data.status === 'COMPLETED' ||
            res.data.sellerOrders?.every(
              (so) => so.status === 'DELIVERED' || so.status === 'COMPLETED'
            );
          setOrderReceived(Boolean(isDelivered));
        } else {
          setOrder(null);
        }
      } else {
        // Fetch list of buyer orders
        const res = await orderApi.getBuyerOrders({ limit: 50 });
        if (res.success && res.data) {
          const items = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.data)
            ? res.data.data
            : Array.isArray(res.data?.items)
            ? res.data.items
            : [];
          setOrdersList(items);
        } else {
          setOrdersList([]);
        }
      }
    } catch {
      if (id) setOrder(null);
      else setOrdersList([]);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrdersData();
  }, [fetchOrdersData]);

  const handleConfirmReceived = () => {
    setOrderReceived(true);
    showToast(
      {
        title: 'Xác nhận thành công!',
        message: 'Đơn hàng đã được cập nhật sang trạng thái Đã nhận hàng.',
      },
      'success'
    );
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleDownloadVAT = () => {
    showToast(
      {
        title: 'Hóa đơn điện tử VAT',
        message: 'Đang khởi tạo và tải xuống bản thể hiện hóa đơn điện tử (PDF)...',
      },
      'info'
    );
  };

  // Helper Vietnamese status translator
  const getStatusLabel = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING_PAYMENT':
        return { text: 'Chờ thanh toán', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'PENDING_CONFIRMATION':
        return { text: 'Chờ xác nhận', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'CONFIRMED':
        return { text: 'Đã tiếp nhận đơn', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      case 'PROCESSING':
      case 'PREPARING':
        return { text: 'Đang đóng gói', color: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'SHIPPED':
        return { text: 'Đang vận chuyển', color: 'bg-orange-100 text-orange-800 border-orange-300' };
      case 'DELIVERED':
      case 'COMPLETED':
        return { text: 'Giao thành công', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'CANCELLED':
        return { text: 'Đã hủy', color: 'bg-red-100 text-red-800 border-red-300' };
      default:
        return { text: 'Đang xử lý', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  // Filtered orders list when in list view
  const filteredOrders = ordersList.filter((o) => {
    const matchesSearch =
      !searchQuery ||
      o.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.sellerOrders?.some((so) =>
        so.items?.some((it) => it.bookTitle?.toLowerCase().includes(searchQuery.toLowerCase()))
      );

    if (!matchesSearch) return false;

    if (activeTab === 'ALL') return true;
    if (activeTab === 'PROCESSING')
      return o.status === 'PROCESSING' || o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'PENDING_CONFIRMATION';
    if (activeTab === 'SHIPPED') return o.status === 'SHIPPED';
    if (activeTab === 'COMPLETED') return o.status === 'COMPLETED' || o.status === 'DELIVERED';
    if (activeTab === 'CANCELLED') return o.status === 'CANCELLED';
    return true;
  });

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse font-body-md">
        <div className="h-4 bg-slate-200 rounded w-48 mb-6"></div>
        <div className="h-32 bg-white rounded-3xl border border-slate-200 mb-8 p-6"></div>
        <div className="h-28 bg-white rounded-3xl border border-slate-200 mb-8 p-6"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-96 bg-white rounded-3xl border border-slate-200"></div>
          <div className="lg:col-span-5 h-96 bg-white rounded-3xl border border-slate-200"></div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: ORDERS LIST VIEW (When no :id in URL)
  // ==========================================
  if (!id) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-8 font-body-md">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-6">
            <Link to="/" className="hover:text-primary transition-colors">
              Trang chủ
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <Link to="/profile" className="hover:text-primary transition-colors">
              Tài khoản
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-slate-900 dark:text-white font-semibold">Lịch sử đơn hàng</span>
          </nav>

          {/* Header Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-headline-sm text-slate-900 dark:text-white tracking-tight">
                Đơn Hàng Của Bạn
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Theo dõi tiến trình vận chuyển, xem biên lai và quản lý toàn bộ ấn phẩm đã đặt.
              </p>
            </div>
            <Link
              to="/books"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-all shadow-sm w-fit"
            >
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
              Mua Thêm Sách Mới
            </Link>
          </div>

          {/* Filter Tabs & Search */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 mb-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
              {[
                { id: 'ALL', label: 'Tất cả', icon: 'receipt_long' },
                { id: 'PROCESSING', label: 'Đang xử lý', icon: 'inventory_2' },
                { id: 'SHIPPED', label: 'Đang giao', icon: 'local_shipping' },
                { id: 'COMPLETED', label: 'Hoàn tất', icon: 'check_circle' },
                { id: 'CANCELLED', label: 'Đã hủy', icon: 'cancel' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm mã đơn hoặc tên sách..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Orders List Container */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center max-w-xl mx-auto shadow-xs my-8">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <span className="material-symbols-outlined text-3xl">inbox</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Chưa có đơn hàng nào
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Bạn chưa thực hiện đơn đặt sách nào hoặc không có đơn hàng nào khớp với bộ lọc hiện tại.
              </p>
              <Link
                to="/books"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">auto_stories</span>
                Khám phá kho sách ngay
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((ord) => {
                const statusInfo = getStatusLabel(ord.status);
                const items = ord.sellerOrders?.flatMap((so) => so.items || []) || [];
                const firstItem = items[0];
                const totalItemsCount = items.reduce((s, it) => s + (it.quantity || 1), 0);

                return (
                  <div
                    key={ord.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                  >
                    {/* Left Info: Code, Date, First Book Thumbnail */}
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-16 h-20 sm:w-20 sm:h-24 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shrink-0 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center">
                        {firstItem?.bookCoverUrl ? (
                          <img
                            src={firstItem.bookCoverUrl}
                            alt={firstItem.bookTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="material-symbols-outlined text-3xl text-slate-400">menu_book</span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            {ord.code}
                          </span>
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.color}`}>
                            {statusInfo.text}
                          </span>
                          <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-medium">
                            {ord.paymentMethod === 'COD' ? 'COD Khi nhận hàng' : 'Thanh toán trực tuyến'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500">
                          Ngày đặt:{' '}
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {ord.createdAt
                              ? new Date(ord.createdAt).toLocaleString('vi-VN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Vừa xong'}
                          </span>
                        </p>

                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {firstItem?.bookTitle || 'Ấn phẩm HUKI'}
                          {totalItemsCount > 1 && (
                            <span className="text-slate-500 font-normal"> (và {totalItemsCount - 1} cuốn khác)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right Info: Total Price & CTA button */}
                    <div className="flex sm:items-center justify-between lg:justify-end gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="text-left lg:text-right">
                        <span className="text-xs text-slate-500 block">Tổng thanh toán:</span>
                        <span className="text-lg sm:text-xl font-black text-rose-600">
                          {(ord.grandTotal || 0).toLocaleString('vi-VN')}đ
                        </span>
                      </div>

                      <Link
                        to={`/orders/${ord.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        Xem Chi Tiết
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: SINGLE ORDER DETAIL VIEW (When :id is in URL)
  // ==========================================
  // Not Found / Empty Order State
  if (!order) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-body-md">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 mb-8">
          <Link to="/" className="hover:text-primary transition-colors">
            Trang chủ
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <Link to="/orders" className="hover:text-primary transition-colors">
            Lịch sử đơn hàng
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-slate-900 dark:text-slate-100 font-semibold">Theo dõi đơn hàng</span>
        </nav>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400 dark:text-slate-500">
            <span className="material-symbols-outlined text-4xl">search_off</span>
          </div>
          <h1 className="text-2xl font-headline-sm font-bold text-slate-900 dark:text-white mb-3">
            Không tìm thấy thông tin đơn hàng
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-8 max-w-md mx-auto">
            Mã đơn hàng không tồn tại trên hệ thống, đã hoàn tất từ phiên trước hoặc tài khoản bạn đang đăng nhập không có quyền truy cập đơn hàng này.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/orders"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">receipt_long</span>
              Xem tất cả đơn hàng
            </Link>
            <Link
              to="/books"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">auto_stories</span>
              Khám phá tủ sách
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Derived real data
  const orderCode = order?.code || (id ? `#${id.slice(0, 8)}` : '#HUKI-ORD');
  const paymentMethod = order?.paymentMethod || 'COD';
  const isCod = paymentMethod.toUpperCase() === 'COD';
  const grandTotal = order?.grandTotal ?? 0;
  const itemSubtotal = order?.itemSubtotal ?? grandTotal;
  const shippingTotal = order?.shippingTotal ?? order?.shippingFee ?? 0;
  const discountTotal = order?.discountTotal ?? order?.discountAmount ?? 0;

  const sellerOrders = order?.sellerOrders || [];
  const allItems = sellerOrders.flatMap((so) => so.items || []) || order?.items || [];
  const physicalItems = allItems.filter((i) => i.format === 'PHYSICAL' || i.format === 'BOTH' || i.type === 'physical');
  const digitalItems = allItems.filter((i) => i.format === 'DIGITAL' || i.type === 'ebook');

  const addrObj = order?.shippingAddress;
  const recipientName = addrObj?.fullName || addrObj?.recipientName || user?.fullName || user?.name || 'Khách Hàng HUKI';
  const recipientPhone = addrObj?.phone || user?.phone || '0988123456';
  const fullAddress = addrObj
    ? [addrObj.line1 || addrObj.address, addrObj.ward, addrObj.district, addrObj.city || addrObj.province].filter(Boolean).join(', ')
    : '12 Nguyễn Văn Bảo, Phường 5, Quận Gò Vấp, TP. Hồ Chí Minh';

  const formattedDate = order?.createdAt
    ? new Date(order.createdAt).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('vi-VN');

  // Primary Seller Order status drives the fulfillment lifecycle
  const primarySellerOrder = sellerOrders[0];
  const sellerStatus = (primarySellerOrder?.status || order?.status || 'PENDING_CONFIRMATION').toUpperCase();

  // Unified Status Mapping matching Seller Lifecycle
  const isPendingConfirmation = sellerStatus === 'PENDING_CONFIRMATION' || sellerStatus === 'PENDING_PAYMENT' || sellerStatus === 'PENDING';
  const isConfirmed = sellerStatus === 'CONFIRMED';
  const isPreparing = sellerStatus === 'PREPARING' || sellerStatus === 'PROCESSING';
  const isShipped = sellerStatus === 'SHIPPED';
  const isDelivered = sellerStatus === 'DELIVERED' || sellerStatus === 'COMPLETED' || orderReceived;

  // Header status badge
  const statusInfo = getStatusLabel(sellerStatus);

  // Stepper steps following real seller progression
  const trackingSteps = [
    {
      id: 1,
      title: 'Đặt Hàng Thành Công',
      time: formattedDate,
      status: 'completed',
      icon: 'check',
    },
    {
      id: 2,
      title: 'Tiếp Nhận Đơn Hàng',
      time: isConfirmed || isPreparing || isShipped || isDelivered ? (primarySellerOrder?.confirmedAt ? new Date(primarySellerOrder.confirmedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Đã tiếp nhận') : 'Chờ xác nhận',
      status: isConfirmed || isPreparing || isShipped || isDelivered ? 'completed' : isPendingConfirmation ? 'upcoming' : 'upcoming',
      icon: 'receipt_long',
    },
    {
      id: 3,
      title: 'NXB Đang Chuẩn Bị',
      time: isPreparing || isShipped || isDelivered ? 'Đang đóng gói' : 'Chưa xử lý',
      status: isPreparing || isShipped || isDelivered ? 'completed' : 'upcoming',
      icon: 'inventory_2',
    },
    {
      id: 4,
      title: 'Đang Vận Chuyển',
      time: isShipped || isDelivered ? (primarySellerOrder?.carrier || 'Đang giao') : 'Dự kiến 2-3 ngày',
      status: isDelivered ? 'completed' : isShipped ? 'current' : 'upcoming',
      icon: 'local_shipping',
    },
    {
      id: 5,
      title: 'Giao Thành Công',
      time: isDelivered ? (primarySellerOrder?.completedAt ? new Date(primarySellerOrder.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Đã giao') : 'Chưa giao',
      status: isDelivered ? 'completed' : 'upcoming',
      icon: 'home_pin',
    },
  ];

  // Stepper progress line width
  const progressLineWidth = isDelivered
    ? 'calc(100% - 6rem)'
    : isShipped
    ? '75%'
    : isPreparing
    ? '50%'
    : isConfirmed
    ? '25%'
    : '0%';

  return (
    <div className="w-full bg-[#f8fafc] text-on-surface font-body-md min-h-screen py-6 pb-20">
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-xs text-slate-500 gap-2 flex-wrap">
          <Link to="/" className="hover:text-emerald-700 transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <Link to="/profile" className="hover:text-emerald-700 transition-colors">
            Tài khoản độc giả
          </Link>
          <span>/</span>
          <span className="text-emerald-800 font-semibold">
            Chi tiết đơn hàng {orderCode}
          </span>
        </nav>

        {/* Order Header & Status Bar */}
        <div className="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Đơn Hàng {orderCode.startsWith('#') ? orderCode : `#${orderCode}`}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusInfo.color}`}
              >
                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                {statusInfo.text}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Thời gian đặt: <strong>{formattedDate}</strong> · Phương thức: <strong>{isCod ? 'COD (Tiền mặt khi nhận)' : 'PayOS (VietQR)'}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadVAT}
              className="border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              Hóa Đơn VAT
            </button>
            <button
              onClick={handlePrintInvoice}
              className="border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              In Đơn Hàng
            </button>
            <Link
              to="/seller/chat"
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">support_agent</span>
              Yêu Cầu Hỗ Trợ
            </Link>
          </div>
        </div>

        {/* Real-time Logistics Timeline */}
        <div className="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between mb-8 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-emerald-700 text-2xl">local_shipping</span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Hành Trình Giao Hàng &amp; Tiến Độ Xử Lý
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Cập nhật trực tiếp từ hệ thống đối tác
            </span>
          </div>

          {/* Stepper bar */}
          <div className="relative flex flex-col md:flex-row items-center justify-between w-full gap-6 md:gap-0 px-2 sm:px-6">
            <div className="hidden md:block absolute left-12 right-12 top-5 h-1 bg-slate-100 -z-0"></div>
            <div
              className="hidden md:block absolute left-12 top-5 h-1 bg-emerald-600 -z-0 transition-all duration-700"
              style={{ width: progressLineWidth }}
            ></div>

            {trackingSteps.map((step) => {
              const isCompleted = step.status === 'completed';
              const isCurrent = step.status === 'current';
              return (
                <div
                  key={step.id}
                  className="relative z-10 flex flex-row md:flex-col items-center text-left md:text-center gap-3 md:gap-1.5 max-w-[150px] w-full md:w-auto"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-xs ring-4 ring-white ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-amber-500 text-white ring-4 ring-amber-100'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {step.icon}
                    </span>
                  </div>
                  <div>
                    <span
                      className={`text-xs font-bold block ${
                        isCurrent
                          ? 'text-amber-700'
                          : isCompleted
                          ? 'text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.title}
                    </span>
                    <span className="text-[11px] text-slate-500">{step.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2-Column Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (7/12): Packages & Seller breakdown */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Real Packages breakdown by Seller */}
            {sellerOrders.length > 0 ? (
              sellerOrders.map((so) => {
                const soStatus = getStatusLabel(so.status);
                return (
                  <div
                    key={so.id}
                    className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs"
                  >
                    {/* Seller Order Header */}
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-emerald-700 text-[20px]">store</span>
                        <span className="font-bold text-sm text-slate-800">Nhà Sách Đối Tác HUKI</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Chính Hãng
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-xs text-slate-500 font-mono">Kiện: {so.code}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${soStatus.color}`}>
                        {soStatus.text}
                      </span>
                    </div>

                    {/* Logistics Carrier badge if shipped */}
                    {so.carrier && (
                      <div className="bg-emerald-50/60 px-6 py-2.5 border-b border-emerald-100 flex items-center justify-between text-xs">
                        <span className="text-emerald-800 flex items-center gap-1.5 font-medium">
                          <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                          Đơn vị vận chuyển: <strong>{so.carrier}</strong>
                        </span>
                        {so.trackingCode && (
                          <span className="font-mono text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-bold">
                            Mã vận đơn: {so.trackingCode}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Items List */}
                    <div className="p-6 divide-y divide-slate-100">
                      {so.items?.map((item) => {
                        const itemTitle = item.title || item.bookTitle || item.book?.title || 'Sách HUKI';
                        const itemCover = item.coverUrl || item.bookCoverUrl || item.book?.coverUrl;
                        const itemPrice = Number(item.price ?? item.unitPrice ?? 0);
                        const itemQty = item.quantity || 1;

                        return (
                          <div
                            key={item.id || item.bookId}
                            className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-16 h-22 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200 shadow-xs flex items-center justify-center">
                                {itemCover ? (
                                  <img
                                    className="w-full h-full object-cover"
                                    src={itemCover}
                                    alt={itemTitle}
                                  />
                                ) : (
                                  <span className="material-symbols-outlined text-slate-400 text-[28px]">
                                    menu_book
                                  </span>
                                )}
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md inline-block">
                                  {item.format === 'DIGITAL' ? 'Ebook EPUB DRM' : 'Sách Giấy In'}
                                </span>
                                <h4 className="font-bold text-sm text-slate-900 leading-snug">
                                  {itemTitle}
                                </h4>
                                <p className="text-xs text-slate-500 font-mono">Mã sản phẩm: {item.bookId}</p>
                                <span className="text-xs text-slate-600 block">
                                  Số lượng: <strong>x{itemQty}</strong>
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0 space-y-2">
                              <span className="font-black text-sm text-[#9e2a2b] block">
                                {itemPrice > 0 ? `${itemPrice.toLocaleString('vi-VN')}đ` : '0đ'}
                              </span>
                              {item.format === 'DIGITAL' && (
                                <Link
                                  to="/reader"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                                >
                                  <span className="material-symbols-outlined text-[15px]">auto_stories</span>
                                  Đọc Ngay
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Package Shipping Fee */}
                    <div className="bg-slate-50/70 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Phí vận chuyển kiện hàng:</span>
                      <span className="font-bold text-slate-800">
                        {(Number(so.shippingFee) || 0).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Fallback Single Package */
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-base text-slate-900">Chi Tiết Kiện Hàng #{orderCode}</h3>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Đang chuẩn bị tại kho
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 text-xs text-slate-600">
                  Đơn hàng của bạn đã được ghi nhận vào hệ thống và đang được xử lý chuyển tiếp.
                </div>
              </div>
            )}
          </div>

          {/* Right Column (5/12): Delivery Address & Payment Summary */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Recipient Address */}
            <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-emerald-700">location_on</span>
                  Địa Chỉ Nhận Hàng
                </h3>
                <span className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 rounded font-bold">
                  {physicalItems.length > 0 ? `${physicalItems.reduce((s, i) => s + (i.quantity || 1), 0)} cuốn sách` : 'Giao hàng tiêu chuẩn'}
                </span>
              </div>
              <div className="text-xs sm:text-sm text-slate-600 space-y-1 leading-relaxed">
                <p className="font-bold text-slate-900">
                  {recipientName} <span className="text-slate-500 font-normal">({recipientPhone})</span>
                </p>
                <p>{fullAddress}</p>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Tóm Tắt Thanh Toán</h3>
              <div className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Tổng tiền hàng:</span>
                  <span className="font-medium text-slate-900">
                    {itemSubtotal > 0 ? `${itemSubtotal.toLocaleString('vi-VN')}đ` : `${grandTotal.toLocaleString('vi-VN')}đ`}
                  </span>
                </div>

                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Mã giảm giá &amp; Ưu đãi:</span>
                    <span className="font-medium">-{discountTotal.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span className="font-medium text-slate-900">
                    {shippingTotal > 0 ? `${shippingTotal.toLocaleString('vi-VN')}đ` : 'Miễn phí'}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-between items-baseline">
                  <span className="font-bold text-sm text-slate-900">
                    {isCod ? 'Tổng Cần Thanh Toán (COD):' : 'Tổng Đã Thanh Toán:'}
                  </span>
                  <span className="font-black text-xl text-[#9e2a2b]">
                    {grandTotal > 0 ? `${grandTotal.toLocaleString('vi-VN')}đ` : '0đ'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  Phương thức: <strong>{isCod ? 'Thanh toán tiền mặt khi nhận sách (COD)' : 'Thanh toán trực tuyến PayOS'}</strong>
                </p>
              </div>

              {/* Quick Action Buttons */}
              <div className="pt-2 space-y-2.5">
                {!orderReceived ? (
                  <button
                    onClick={handleConfirmReceived}
                    className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Đã Nhận Được Hàng
                  </button>
                ) : (
                  <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    Đã xác nhận nhận hàng
                  </div>
                )}

                <Link
                  to={`/orders/${id}/return`}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                >
                  <span className="material-symbols-outlined text-[16px]">assignment_return</span>
                  Yêu Cầu Đổi Trả / Bảo Hành (7 Ngày)
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
