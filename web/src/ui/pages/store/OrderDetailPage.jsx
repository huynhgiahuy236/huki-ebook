import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { orderApi } from '../../api/orderApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [order, setOrder] = useState(null);
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchOrderDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setNotFound(false);

    try {
      const [detailRes, trackRes] = await Promise.all([
        orderApi.getBuyerOrderDetail(id),
        orderApi.getOrderTracking(id).catch(() => ({ success: false, data: null })),
      ]);

      if (detailRes.success && detailRes.data) {
        setOrder(detailRes.data);
        if (trackRes.success && trackRes.data) {
          setTrackingInfo(trackRes.data);
        }
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const handleCopyOrderCode = () => {
    if (!order?.code) return;
    navigator.clipboard.writeText(order.code);
    setCopiedCode(true);
    showToast(
      {
        title: 'Đã sao chép!',
        message: `Mã đơn hàng #${order.code} đã được lưu vào bộ nhớ tạm.`,
      },
      'success'
    );
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Status Stepper calculation
  const getStepStatus = (stepIndex) => {
    const status = order?.status;
    if (status === 'CANCELLED') return 'cancelled';

    // Steps: 0 = Đặt hàng, 1 = Tiếp nhận, 2 = Đóng gói, 3 = Đang giao, 4 = Hoàn tất
    let currentStepIndex = 0;
    if (status === 'PENDING_PAYMENT' || status === 'PENDING_CONFIRMATION') {
      currentStepIndex = 0;
    } else if (status === 'CONFIRMED') {
      currentStepIndex = 1;
    } else if (status === 'PROCESSING' || status === 'PREPARING') {
      currentStepIndex = 2;
    } else if (status === 'SHIPPED') {
      currentStepIndex = 3;
    } else if (status === 'DELIVERED' || status === 'COMPLETED') {
      currentStepIndex = 4;
    }

    // Check if any seller order has higher status
    const sellerStatuses = order?.sellerOrders?.map((s) => s.status) || [];
    if (sellerStatuses.includes('COMPLETED') || sellerStatuses.includes('DELIVERED')) {
      currentStepIndex = Math.max(currentStepIndex, 4);
    } else if (sellerStatuses.includes('SHIPPED')) {
      currentStepIndex = Math.max(currentStepIndex, 3);
    } else if (sellerStatuses.includes('PREPARING')) {
      currentStepIndex = Math.max(currentStepIndex, 2);
    } else if (sellerStatuses.includes('CONFIRMED')) {
      currentStepIndex = Math.max(currentStepIndex, 1);
    }

    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'upcoming';
  };

  const steps = [
    { label: 'Đặt Hàng', sub: 'Đã tạo đơn thành công', icon: 'receipt_long' },
    { label: 'Tiếp Nhận', sub: 'Người bán đã xác nhận', icon: 'task_alt' },
    { label: 'Đóng Gói', sub: 'Chuẩn bị kiện hàng', icon: 'inventory_2' },
    { label: 'Vận Chuyển', sub: 'Đang giao tận nơi', icon: 'local_shipping' },
    { label: 'Hoàn Tất', sub: 'Đã nhận hàng thành công', icon: 'check_circle' },
  ];

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex flex-col font-sans text-on-surface bg-theme-bg py-6 md:py-8">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 animate-pulse space-y-6">
          <div className="h-4 bg-theme-surface-subtle rounded w-48 mb-6"></div>
          <div className="h-28 bg-theme-surface rounded-3xl border border-theme-border p-6"></div>
          <div className="h-32 bg-theme-surface rounded-3xl border border-theme-border p-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 h-96 bg-theme-surface rounded-3xl border border-theme-border"></div>
            <div className="lg:col-span-4 h-96 bg-theme-surface rounded-3xl border border-theme-border"></div>
          </div>
        </div>
      </div>
    );
  }

  // Not Found or Unauthorized State
  if (notFound || !order) {
    return (
      <div className="w-full min-h-screen flex flex-col font-sans text-on-surface bg-theme-bg py-12">
        <div className="max-w-xl w-full mx-auto px-4 text-center">
          <div className="bg-theme-surface rounded-3xl border border-theme-border p-8 sm:p-12 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-100">
              <span className="material-symbols-outlined text-3xl">search_off</span>
            </div>
            <h2 className="font-editorial text-2xl font-bold text-on-surface mb-2">
              Không Tìm Thấy Đơn Hàng
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant mb-6 leading-relaxed">
              Mã đơn hàng không tồn tại hoặc bạn không có quyền truy cập đơn hàng này. Vui lòng kiểm tra lại đường dẫn.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/orders"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-theme-primary text-white font-bold text-xs hover:bg-theme-primary-hover transition-all shadow-xs inline-flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">receipt_long</span>
                <span>Về Danh Sách Đơn Hàng</span>
              </Link>
              <Link
                to="/"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-theme-surface hover:bg-theme-bg border border-theme-border text-on-surface font-semibold text-xs transition-all"
              >
                Trang Chủ
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isCancelled = order.status === 'CANCELLED';
  const totalItemsCount =
    order.sellerOrders?.reduce((sum, so) => sum + (so.items?.length || 0), 0) || 0;

  const primarySellerOrder = order.sellerOrders?.[0];
  const sellerStatus = (primarySellerOrder?.status || order.status || 'PENDING_CONFIRMATION').toUpperCase();

  const isPendingConfirmation =
    sellerStatus === 'PENDING_CONFIRMATION' ||
    sellerStatus === 'PENDING_PAYMENT' ||
    sellerStatus === 'PENDING';
  const isConfirmed = sellerStatus === 'CONFIRMED';
  const isPreparing = sellerStatus === 'PREPARING' || sellerStatus === 'PROCESSING';
  const isShipped = sellerStatus === 'SHIPPED';
  const isDelivered = sellerStatus === 'DELIVERED' || sellerStatus === 'COMPLETED';

  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('vi-VN');

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
      time: isConfirmed || isPreparing || isShipped || isDelivered
        ? (primarySellerOrder?.confirmedAt
            ? new Date(primarySellerOrder.confirmedAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Đã tiếp nhận')
        : 'Chờ xác nhận',
      status: isConfirmed || isPreparing || isShipped || isDelivered
        ? 'completed'
        : isPendingConfirmation
        ? 'current'
        : 'upcoming',
      icon: 'receipt_long',
    },
    {
      id: 3,
      title: 'NXB Đang Chuẩn Bị',
      time: isPreparing || isShipped || isDelivered ? 'Đang đóng gói' : 'Chưa xử lý',
      status: isShipped || isDelivered ? 'completed' : isPreparing ? 'current' : 'upcoming',
      icon: 'inventory_2',
    },
    {
      id: 4,
      title: 'Đang Vận Chuyển',
      time: isShipped || isDelivered
        ? (primarySellerOrder?.carrier || 'Đang giao tận nơi')
        : 'Dự kiến 2-3 ngày',
      status: isDelivered ? 'completed' : isShipped ? 'current' : 'upcoming',
      icon: 'local_shipping',
    },
    {
      id: 5,
      title: 'Giao Thành Công',
      time: isDelivered
        ? (primarySellerOrder?.completedAt
            ? new Date(primarySellerOrder.completedAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Đã giao thành công')
        : 'Chưa giao',
      status: isDelivered ? 'completed' : 'upcoming',
      icon: 'home_pin',
    },
  ];

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
    <div className="w-full min-h-screen flex flex-col font-sans text-on-surface bg-theme-bg py-6 md:py-8">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between mb-6">
          <nav className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
            <Link to="/" className="hover:text-theme-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">home</span>
              <span>Trang chủ</span>
            </Link>
            <span>/</span>
            <Link to="/orders" className="hover:text-theme-primary transition-colors">
              Lịch sử đơn hàng
            </Link>
            <span>/</span>
            <span className="text-on-surface font-bold">#{order.code}</span>
          </nav>

          <Link
            to="/orders"
            className="text-xs font-bold text-theme-primary hover:underline inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Tất cả đơn hàng</span>
          </Link>
        </div>

        {/* ORDER HEADER BANNER */}
        <section className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-theme-border">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                  Đơn Hàng #{order.code}
                </span>
                <button
                  onClick={handleCopyOrderCode}
                  className="px-2.5 py-1 rounded-lg bg-theme-surface-subtle hover:bg-theme-secondary-subtle text-on-surface-variant text-xs font-mono font-medium border border-theme-border inline-flex items-center gap-1 transition-colors cursor-pointer"
                  title="Sao chép mã đơn"
                >
                  <span className="material-symbols-outlined text-sm">
                    {copiedCode ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedCode ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-on-surface-variant">
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-theme-primary">calendar_today</span>
                  <span>
                    Đặt lúc:{' '}
                    <b className="text-on-surface">
                      {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </b>
                  </span>
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-theme-primary">payments</span>
                  <span>
                    Phương thức: <b className="text-on-surface">Thanh toán khi nhận hàng (COD)</b>
                  </span>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 self-start md:self-center print:hidden">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-theme-surface hover:bg-theme-bg border border-theme-border text-on-surface text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">print</span>
                <span>In Biên Lai</span>
              </button>

              <Link
                to="/books"
                className="px-4 py-2 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary-hover transition-all shadow-xs inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">shopping_bag</span>
                <span>Mua Thêm Sách</span>
              </Link>
            </div>
          </div>

          {/* VISUAL STATUS PROGRESS STEPPER (Horizontal Connected Progress Line) */}
          {isCancelled ? (
            <div className="mt-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-center gap-3 text-red-700 dark:text-red-300">
              <span className="material-symbols-outlined text-2xl shrink-0 text-red-500">cancel</span>
              <div className="text-xs">
                <p className="font-bold text-sm">Đơn hàng này đã bị hủy</p>
                <p className="mt-0.5 text-red-600 dark:text-red-400">
                  Lý do: {order.cancelReason || 'Người mua hoặc người bán đã yêu cầu hủy đơn.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-8 pb-3 border-b border-theme-border">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-theme-primary text-2xl">local_shipping</span>
                  <h2 className="text-lg sm:text-xl font-bold font-editorial text-on-surface">
                    Hành Trình Giao Hàng &amp; Tiến Độ Xử Lý
                  </h2>
                </div>
                <span className="text-xs text-on-surface-variant font-medium hidden sm:inline">
                  Cập nhật trực tiếp từ hệ thống đối tác
                </span>
              </div>

              {/* Stepper bar */}
              <div className="relative flex flex-col md:flex-row items-center justify-between w-full gap-6 md:gap-0 px-2 sm:px-6">
                <div className="hidden md:block absolute left-12 right-12 top-5 h-1 bg-theme-surface-subtle -z-0"></div>
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
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-xs ring-4 ring-white dark:ring-slate-900 transition-all ${
                          isCompleted
                            ? 'bg-emerald-600 text-white'
                            : isCurrent
                            ? 'bg-amber-500 text-white ring-4 ring-amber-100 dark:ring-amber-900/40 animate-pulse'
                            : 'bg-theme-surface-subtle text-on-surface-variant border border-theme-border'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isCompleted ? 'check' : step.icon}
                        </span>
                      </div>
                      <div>
                        <span
                          className={`text-xs font-bold block ${
                            isCurrent
                              ? 'text-amber-600 dark:text-amber-400'
                              : isCompleted
                              ? 'text-on-surface'
                              : 'text-on-surface-variant'
                          }`}
                        >
                          {step.title}
                        </span>
                        <span className="text-[11px] text-on-surface-variant">{step.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* MAIN 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN: ORDER ITEMS & PACKAGE DETAILS */}
          <div className="lg:col-span-8 space-y-6">
            {order.sellerOrders?.map((so, sIdx) => (
              <div
                key={so.id}
                className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs overflow-hidden"
              >
                {/* Package Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-theme-border mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-theme-primary/10 text-theme-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-xl">storefront</span>
                    </div>
                    <div>
                      <h3 className="font-editorial text-base font-bold text-on-surface">
                        Kiện hàng {sIdx + 1} · #{so.code}
                      </h3>
                      <p className="text-[11px] text-on-surface-variant">
                        Đóng gói và vận chuyển bởi Người bán HUKI
                      </p>
                    </div>
                  </div>

                  {so.carrier && so.trackingCode && (
                    <div className="text-right text-xs bg-theme-surface-subtle px-3 py-1.5 rounded-xl border border-theme-border">
                      <span className="text-on-surface-variant">Vận chuyển: </span>
                      <b className="text-on-surface">{so.carrier}</b>
                      <span className="mx-1 text-on-surface-variant">•</span>
                      <span className="font-mono font-bold text-theme-primary">{so.trackingCode}</span>
                    </div>
                  )}
                </div>

                {/* Items in Package */}
                <div className="divide-y divide-theme-border/60">
                  {so.items?.map((item) => (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                      {/* Book Cover */}
                      <div className="w-16 h-22 sm:w-20 sm:h-26 rounded-xl bg-theme-surface-subtle border border-theme-border overflow-hidden shrink-0 flex items-center justify-center">
                        {item.bookCoverUrl || item.coverUrl ? (
                          <img
                            src={item.bookCoverUrl || item.coverUrl}
                            alt={item.bookTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="material-symbols-outlined text-3xl text-theme-primary/40">
                            auto_stories
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-editorial text-sm sm:text-base font-bold text-on-surface leading-snug">
                          {item.bookTitle}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-theme-surface-subtle text-on-surface-variant border border-theme-border">
                            {item.format === 'DIGITAL' ? 'Sách Điện Tử (Ebook DRM)' : 'Sách In Bìa Cứng'}
                          </span>
                          {item.bookIsbn && (
                            <span className="text-[11px] text-on-surface-variant font-mono">
                              ISBN: {item.bookIsbn}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-on-surface-variant mt-1.5">
                          Số lượng: <b className="text-on-surface">{item.quantity}</b> ×{' '}
                          {Number(item.unitPrice).toLocaleString('vi-VN')}đ
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right shrink-0">
                        <div className="font-bold text-sm sm:text-base text-theme-primary">
                          {Number(item.subtotal || item.unitPrice * item.quantity).toLocaleString(
                            'vi-VN'
                          )}
                          đ
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* TIMELINE AUDIT TRAIL LOG */}
            {trackingInfo?.timeline && trackingInfo.timeline.length > 0 && (
              <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs">
                <h3 className="font-editorial text-base font-bold text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-theme-primary">history</span>
                  <span>Nhật Ký Trạng Thái Chi Tiết</span>
                </h3>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-theme-border">
                  {trackingInfo.timeline.map((item, idx) => (
                    <div key={item.id || idx} className="relative">
                      {/* Timeline Dot */}
                      <div
                        className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-theme-surface ${
                          idx === trackingInfo.timeline.length - 1
                            ? 'bg-theme-primary ring-4 ring-theme-primary/20'
                            : 'bg-emerald-600'
                        }`}
                      />

                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h5 className="font-bold text-xs text-on-surface">
                            {item.title || item.toStatus}
                          </h5>
                          <span className="text-[11px] text-on-surface-variant">
                            {new Date(item.createdAt).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        {item.actorType && (
                          <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded bg-theme-surface-subtle text-on-surface-variant border border-theme-border">
                            Tác nhân: {item.actorType === 'SELLER' ? 'Người bán' : item.actorType === 'USER' ? 'Người mua' : 'Hệ thống'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: RECIPIENT INFO & FINANCIAL SUMMARY */}
          <div className="lg:col-span-4 space-y-6">
            {/* Shipping Address Card */}
            <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 shadow-xs">
              <h4 className="font-editorial text-base font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-theme-primary">location_on</span>
                <span>Địa Chỉ Nhận Hàng</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div className="font-bold text-sm text-on-surface">
                  {order.shippingAddress?.recipientName || user?.fullName || 'Người nhận'}
                </div>
                <div className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">call</span>
                  <span>{order.shippingAddress?.phone || '0988123456'}</span>
                </div>
                <div className="text-on-surface-variant leading-relaxed pt-1">
                  {[
                    order.shippingAddress?.addressLine1 || order.shippingAddress?.line1,
                    order.shippingAddress?.ward,
                    order.shippingAddress?.district,
                    order.shippingAddress?.city || order.shippingAddress?.province,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </div>

                {order.note && (
                  <div className="mt-3 p-3 rounded-xl bg-theme-surface-subtle border border-theme-border text-[11px] text-on-surface-variant">
                    <b className="text-on-surface">Ghi chú:</b> {order.note}
                  </div>
                )}
              </div>
            </div>

            {/* Financial Payment Summary Card */}
            <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 shadow-xs">
              <h4 className="font-editorial text-base font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-theme-primary">receipt</span>
                <span>Tóm Tắt Thanh Toán</span>
              </h4>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Tạm tính ({totalItemsCount} cuốn):</span>
                  <span className="font-semibold text-on-surface">
                    {Number(order.itemSubtotal).toLocaleString('vi-VN')}đ
                  </span>
                </div>

                <div className="flex justify-between text-on-surface-variant">
                  <span>Phí vận chuyển tiêu chuẩn:</span>
                  <span className="font-semibold text-on-surface">
                    {Number(order.shippingTotal).toLocaleString('vi-VN')}đ
                  </span>
                </div>

                {Number(order.discountTotal || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Giảm giá:</span>
                    <span className="font-semibold">
                      -{Number(order.discountTotal).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-theme-border flex justify-between items-center text-sm">
                  <span className="font-bold text-on-surface">Tổng thanh toán:</span>
                  <span className="font-bold text-lg text-theme-primary">
                    {Number(order.grandTotal).toLocaleString('vi-VN')}đ
                  </span>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base shrink-0">payments</span>
                  <span>Phương thức: <b>COD (Thanh toán tiền mặt khi nhận hàng)</b></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
