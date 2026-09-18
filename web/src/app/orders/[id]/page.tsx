"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { orderApi } from '@/ui/api/orderApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import OrderItemBadge from '@/ui/components/common/OrderItemBadge';
import EscrowCountdown from '@/ui/components/order/EscrowCountdown';
import DisputeModal from '@/ui/components/order/DisputeModal';
import PaymentCountdownModal from '@/ui/components/checkout/PaymentCountdownModal';
import { paymentApi } from '@/ui/api/paymentApi';

export default function OrderDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [order, setOrder] = useState<any>(null);
  const [trackingInfo, setTrackingInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCodQrModal, setShowCodQrModal] = useState(false);
  const [showPayOsModal, setShowPayOsModal] = useState(false);
  const [payOsData, setPayOsData] = useState<any>(null);
  const [settledEscrowStores, setSettledEscrowStores] = useState<Record<string, boolean>>({});
  const [cancelSubOrderModal, setCancelSubOrderModal] = useState<{ open: boolean; subOrder: any; reason: string }>({ open: false, subOrder: null, reason: '' });
  const [cancelOrderModal, setCancelOrderModal] = useState<{ open: boolean; reason: string }>({ open: false, reason: '' });
  const [disputeModal, setDisputeModal] = useState<{ open: boolean; subOrder: any | null }>({ open: false, subOrder: null });
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

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
        // Fallback: fetch all buyer orders and find by id or code
        try {
          const listRes = await orderApi.getBuyerOrders({ page: 1, limit: 50 });
          if (listRes.success && listRes.data) {
            const rawData: any = listRes.data;
            const items = Array.isArray(rawData)
              ? rawData
              : Array.isArray(rawData.data)
              ? rawData.data
              : Array.isArray(rawData.items)
              ? rawData.items
              : [];
            const matched = items.find(
              (o: any) => o.id === id || o.code === id || o.code?.toLowerCase() === id?.toLowerCase()
            );
            if (matched) {
              setOrder(matched);
            } else {
              setNotFound(true);
            }
          } else {
            setNotFound(true);
          }
        } catch {
          setNotFound(true);
        }
      }
    } catch {
      // Fallback: try listing orders when direct fetch fails entirely
      try {
        const listRes = await orderApi.getBuyerOrders({ page: 1, limit: 50 });
        if (listRes.success && listRes.data) {
          const rawData: any = listRes.data;
          const items = Array.isArray(rawData)
            ? rawData
            : Array.isArray(rawData.data)
            ? rawData.data
            : Array.isArray(rawData.items)
            ? rawData.items
            : [];
          const matched = items.find(
            (o: any) => o.id === id || o.code === id || o.code?.toLowerCase() === id?.toLowerCase()
          );
          if (matched) {
            setOrder(matched);
          } else {
            setNotFound(true);
          }
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const handleCancelSubOrder = async () => {
    if (!cancelSubOrderModal.subOrder || !order) return;
    try {
      setIsSubmittingCancel(true);
      const res: any = await orderApi.cancelBuyerSubOrder(order.id, cancelSubOrderModal.subOrder.id, {
        reason: cancelSubOrderModal.reason || 'Người mua yêu cầu hủy kiện hàng này',
      });
      if (res.success) {
        showToast(
          {
            title: 'Hủy kiện hàng thành công',
            message: `Kiện hàng #${cancelSubOrderModal.subOrder.code} đã được hủy.`,
          },
          'success'
        );
        setCancelSubOrderModal({ open: false, subOrder: null, reason: '' });
        fetchOrderDetail();
      } else {
        showToast(
          {
            title: 'Hủy thất bại',
            message: res.message || res.error || 'Không thể hủy kiện hàng này.',
          },
          'error'
        );
      }
    } catch (err: any) {
      showToast(
        {
          title: 'Lỗi',
          message: err.message || 'Có lỗi xảy ra khi hủy kiện hàng.',
        },
        'error'
      );
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleCancelMasterOrder = async () => {
    if (!order) return;
    try {
      setIsSubmittingCancel(true);
      const res: any = await orderApi.cancelBuyerOrder(order.id, {
        reason: cancelOrderModal.reason || 'Người mua yêu cầu hủy toàn bộ đơn hàng',
      });
      if (res.success) {
        showToast(
          {
            title: 'Hủy đơn hàng thành công',
            message: `Đơn hàng #${order.code} đã được hủy hoàn tất.`,
          },
          'success'
        );
        setCancelOrderModal({ open: false, reason: '' });
        fetchOrderDetail();
      } else {
        showToast(
          {
            title: 'Hủy thất bại',
            message: res.message || res.error || 'Không thể hủy đơn hàng này.',
          },
          'error'
        );
      }
    } catch (err: any) {
      showToast(
        {
          title: 'Lỗi',
          message: err.message || 'Có lỗi xảy ra khi hủy đơn hàng.',
        },
        'error'
      );
    } finally {
      setIsSubmittingCancel(false);
    }
  };

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
  const getStepStatus = (stepIndex: number) => {
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
    const sellerStatuses = order?.sellerOrders?.map((s: any) => s.status) || [];
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
                href="/orders"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-theme-primary text-white font-bold text-xs hover:bg-theme-primary-hover transition-all shadow-xs inline-flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">receipt_long</span>
                <span>Về Danh Sách Đơn Hàng</span>
              </Link>
              <Link
                href="/"
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
    order.sellerOrders?.reduce((sum: number, so: any) => sum + (so.items?.length || 0), 0) || 0;

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
            <Link href="/" className="hover:text-theme-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">home</span>
              <span>Trang chủ</span>
            </Link>
            <span>/</span>
            <Link href="/orders" className="hover:text-theme-primary transition-colors">
              Lịch sử đơn hàng
            </Link>
            <span>/</span>
            <span className="text-on-surface font-bold">#{order.code}</span>
          </nav>

          <Link
            href="/orders"
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
                    Phương thức:{' '}
                    <b className="text-on-surface">
                      {order.paymentMethod === 'ONLINE_PAYMENT' ? 'Thanh toán trực tuyến PayOS (VietQR)' : 'Thanh toán khi nhận hàng (COD)'}
                    </b>
                  </span>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 self-start md:self-center print:hidden">
              {(order.status === 'PENDING_PAYMENT' || order.paymentStatus === 'PENDING') && order.paymentMethod === 'ONLINE_PAYMENT' && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await paymentApi.initiatePayment(order.id);
                      if (res.success && res.data) {
                        setPayOsData(res.data);
                      }
                    } catch {
                      // ignore
                    }
                    setShowPayOsModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer animate-pulse"
                >
                  <span className="material-symbols-outlined text-base">qr_code_2</span>
                  <span>Thanh Toán VietQR</span>
                </button>
              )}

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-theme-surface hover:bg-theme-bg border border-theme-border text-on-surface text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">print</span>
                <span>In Biên Lai</span>
              </button>

              {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && order.status !== 'SHIPPED' && (
                <button
                  type="button"
                  onClick={() => setCancelOrderModal({ open: true, reason: '' })}
                  className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-900 text-xs font-bold hover:bg-red-100 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">cancel</span>
                  <span>Hủy Toàn Bộ Đơn</span>
                </button>
              )}

              <Link
                href="/books"
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
                <p className="font-bold text-sm">
                  {order.cancelReason?.includes('2 phút') || order.paymentStatus === 'EXPIRED'
                    ? 'Đơn hàng đã tự động bị hủy do hết hạn thanh toán (2 phút)'
                    : 'Đơn hàng này đã bị hủy'}
                </p>
                <p className="mt-0.5 text-red-600 dark:text-red-400">
                  Lý do: {order.cancelReason || 'Quá hạn thanh toán 2m hoặc người mua/bán đã yêu cầu hủy.'} {order.cancelReason?.includes('2 phút') ? '(Số lượng sách đã được tự động hoàn trả về kho)' : ''}
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
            {order.sellerOrders?.map((so: any, sIdx: number) => {
              const isDigitalPackage = !so.requiresShipping || so.items?.every((item: any) => item.format?.toUpperCase().includes('DIGITAL') || item.format?.toLowerCase().includes('ebook'));
              const isSubOrderCancelled = so.status === 'CANCELLED';
              const isSubOrderShipped = so.status === 'SHIPPED';
              const isSubOrderDelivered = so.status === 'DELIVERED' || so.status === 'COMPLETED';
              const isSubOrderConfirmed = so.status === 'CONFIRMED' || so.status === 'PREPARING';
              const canCancelThisPackage = !isSubOrderCancelled && !isSubOrderShipped && !isSubOrderDelivered && order.status !== 'CANCELLED';

              const storeDisplayName = so.storeName || so.business?.displayName || so.business?.name || `Gian Hàng #${sIdx + 1}`;

              return (
                <div
                  key={so.id}
                  className={`bg-theme-surface rounded-3xl border ${isSubOrderCancelled ? 'border-red-200 dark:border-red-900/40 opacity-75' : 'border-theme-border'} p-6 sm:p-8 shadow-xs overflow-hidden transition-all`}
                >
                  {/* Package Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-theme-border mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl ${isDigitalPackage ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600' : 'bg-theme-primary/10 text-theme-primary'} flex items-center justify-center shrink-0`}>
                        <span className="material-symbols-outlined text-xl">
                          {isDigitalPackage ? 'menu_book' : 'storefront'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-editorial text-base font-bold text-on-surface">
                            {isDigitalPackage ? 'Kiện Hàng Số' : `Kiện Hàng ${sIdx + 1}`} · #{so.code}
                          </h3>
                          {/* Status Badge */}
                          <span
                            className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                              isSubOrderCancelled
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900'
                                : isSubOrderDelivered
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                                : isSubOrderShipped
                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900'
                                : isSubOrderConfirmed
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            <span>
                              {isSubOrderCancelled
                                ? 'Đã hủy kiện này'
                                : isSubOrderDelivered
                                ? 'Đã hoàn tất'
                                : isSubOrderShipped
                                ? 'Đang vận chuyển'
                                : isSubOrderConfirmed
                                ? 'Đang chuẩn bị hàng'
                                : 'Chờ xác nhận'}
                            </span>
                          </span>
                        </div>
                        <p className="text-[12px] font-medium text-on-surface-variant flex items-center gap-1 mt-0.5">
                          <span>Gian hàng:</span>
                          <b className="text-on-surface font-semibold">{storeDisplayName}</b>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {so.carrier && so.trackingCode && (
                        <div className="text-right text-xs bg-theme-surface-subtle px-3 py-1.5 rounded-xl border border-theme-border">
                          <span className="text-on-surface-variant">Vận chuyển: </span>
                          <b className="text-on-surface">{so.carrier}</b>
                          <span className="mx-1 text-on-surface-variant">•</span>
                          <span className="font-mono font-bold text-theme-primary">{so.trackingCode}</span>
                        </div>
                      )}

                      {canCancelThisPackage && !isDigitalPackage && (
                        <button
                          type="button"
                          onClick={() => setCancelSubOrderModal({ open: true, subOrder: so, reason: '' })}
                          className="px-3 py-1.5 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">cancel</span>
                          <span>Hủy Kiện Này</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pure Digital Banner */}
                  {isDigitalPackage && (
                    <div className="mb-4 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-200 text-xs">
                        <span className="material-symbols-outlined text-lg text-indigo-600">verified</span>
                        <span>Ấn phẩm Ebook số bản quyền DRM đã được kích hoạt trực tiếp vào Tủ sách của bạn.</span>
                      </div>
                      <Link
                        href="/library"
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">auto_stories</span>
                        <span>Mở Tủ Sách</span>
                      </Link>
                    </div>
                  )}

                  {/* Items in Package */}
                  <div className="divide-y divide-theme-border/60">
                    {so.items?.map((item: any) => (
                      <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
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
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className="font-editorial text-sm sm:text-base font-bold text-on-surface leading-snug">
                                {item.bookTitle}
                              </h4>
                              <OrderItemBadge format={item.format} type={item.type || (item.format?.toLowerCase().includes('ebook') || item.format?.toUpperCase().includes('DIGITAL') ? 'ebook' : 'physical')} />
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
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
                        </div>

                        {/* Subtotal & Action */}
                        <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                          <div className="font-bold text-sm sm:text-base text-theme-primary">
                            {Number(item.subtotal || item.unitPrice * item.quantity).toLocaleString(
                              'vi-VN'
                            )}
                            đ
                          </div>

                          {(item.format?.toUpperCase().includes('DIGITAL') || item.format?.toLowerCase().includes('ebook')) && (
                            <Link
                              href={`/reader/${item.bookId}`}
                              className="px-2.5 py-1 rounded-lg bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">chrome_reader_mode</span>
                              <span>Đọc Ngay</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sub-order Summary Footer */}
                  <div className="mt-4 pt-4 border-t border-theme-border/60 flex items-center justify-between text-xs text-on-surface-variant flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <span>Tiền hàng: <b className="text-on-surface">{Number(so.itemSubtotal).toLocaleString('vi-VN')}đ</b></span>
                      <span>•</span>
                      <span>Phí ship: <b className="text-on-surface">{Number(so.shippingFee).toLocaleString('vi-VN')}đ</b></span>
                    </div>
                    <div>
                      Tổng kiện: <b className="text-sm font-bold text-theme-primary">{Number(so.grandTotal).toLocaleString('vi-VN')}đ</b>
                    </div>
                  </div>

                  {/* 2-Minute Escrow Holding Countdown if Delivered */}
                  {(so.status === 'DELIVERED' || order.status === 'DELIVERED' || isDelivered) && (
                    <div className="mt-5 pt-5 border-t border-theme-border">
                      <EscrowCountdown
                        orderId={order.id}
                        subOrderId={so.id}
                        storeName={storeDisplayName}
                        amount={so.grandTotal || order.grandTotal}
                        onDispute={() => setDisputeModal({ open: true, subOrder: so })}
                        onReleaseEscrow={({ subOrderId, auto }: any) => {
                          setSettledEscrowStores((prev) => ({ ...prev, [subOrderId || so.id]: true }));
                          showToast(
                            {
                              title: auto ? 'Hết hạn ký quỹ 2 phút' : 'Xác nhận thành công!',
                              message: `Đã hoàn tất giải ngân cho gian hàng #${so.code}.`,
                            },
                            'success'
                          );
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* TIMELINE AUDIT TRAIL LOG */}
            {trackingInfo?.timeline && trackingInfo.timeline.length > 0 && (
              <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs">
                <h3 className="font-editorial text-base font-bold text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-theme-primary">history</span>
                  <span>Nhật Ký Trạng Thái Chi Tiết</span>
                </h3>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-theme-border">
                  {trackingInfo.timeline.map((item: any, idx: number) => (
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
                  {order.shippingAddress?.recipientName || (user as any)?.fullName || 'Người nhận'}
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

                <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base shrink-0">payments</span>
                    <span>Phương thức: <b>COD (Thanh toán khi nhận hàng)</b></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCodQrModal(true)}
                    className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700 transition-all shrink-0 cursor-pointer shadow-xs inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[12px]">qr_code_2</span>
                    <span>Quét QR</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PayOS COD Simulated QR Modal */}
      {showCodQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[var(--theme-surface,#ffffff)] rounded-3xl border border-[var(--theme-border,#e8e5df)] p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-border,#e8e5df)]">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                  <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                </span>
                <h3 className="font-editorial text-base font-bold text-on-surface">
                  Thanh Toán COD Qua PayOS QR
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCodQrModal(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="text-center py-2 space-y-3">
              <p className="text-xs text-on-surface-variant">
                Quét mã VietQR dưới đây để thanh toán trực tiếp cho bưu tá khi nhận kiện hàng.
              </p>

              {/* QR Code Container */}
              <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl border-2 border-emerald-600/30 shadow-inner flex flex-col items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=PAYOS_COD_${order.code}_${order.grandTotal}`}
                  alt="PayOS COD QR"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="bg-[var(--theme-surface-subtle,#f4f3ef)] p-3 rounded-xl border border-[var(--theme-border,#e8e5df)] text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Số tiền thanh toán:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {Number(order.grandTotal).toLocaleString('vi-VN')}₫
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Nội dung chuyển:</span>
                  <span className="font-mono font-bold text-on-surface">HUKI {order.code}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCodQrModal(false)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
              >
                Đã Thanh Toán Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PayOS Online Payment Live Countdown Modal */}
      {showPayOsModal && (
        <PaymentCountdownModal
          isOpen={showPayOsModal}
          onClose={() => setShowPayOsModal(false)}
          orderId={order.id}
          orderCode={order.code}
          grandTotal={Number(order.grandTotal) || 0}
          paymentData={payOsData}
          onSuccess={() => {
            setShowPayOsModal(false);
            fetchOrderDetail();
          }}
        />
      )}

      {/* Cancel Sub-Order Modal */}
      {cancelSubOrderModal.open && cancelSubOrderModal.subOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center text-sm font-bold">
                  <span className="material-symbols-outlined text-[18px]">remove_shopping_cart</span>
                </span>
                <h3 className="font-editorial text-base font-bold text-on-surface">
                  Hủy Kiện Hàng #{cancelSubOrderModal.subOrder.code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelSubOrderModal({ open: false, subOrder: null, reason: '' })}
                className="p-1 rounded-lg hover:bg-theme-surface-subtle text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Bạn có chắc chắn muốn hủy kiện hàng từ gian hàng{' '}
              <b className="text-on-surface">
                {cancelSubOrderModal.subOrder.storeName || cancelSubOrderModal.subOrder.business?.displayName || 'này'}
              </b>
              ? Các kiện hàng từ gian hàng khác trong đơn vẫn sẽ được tiếp tục xử lý bình thường.
            </p>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">
                Lý do hủy kiện hàng:
              </label>
              <textarea
                value={cancelSubOrderModal.reason}
                onChange={(e) =>
                  setCancelSubOrderModal((prev) => ({ ...prev, reason: e.target.value }))
                }
                rows={3}
                placeholder="Nhập lý do hủy (ví dụ: Đổi ý, muốn thay đổi số lượng, ...)"
                className="w-full px-3 py-2 rounded-xl border border-theme-border bg-theme-bg text-xs text-on-surface focus:outline-none focus:border-theme-primary resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={() => setCancelSubOrderModal({ open: false, subOrder: null, reason: '' })}
                className="px-4 py-2.5 rounded-xl border border-theme-border text-on-surface font-semibold text-xs hover:bg-theme-surface-subtle transition-all cursor-pointer"
              >
                Giữ Lại
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleCancelSubOrder}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingCancel ? 'Đang xử lý...' : 'Xác Nhận Hủy Kiện'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Master Order Modal */}
      {cancelOrderModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center text-sm font-bold">
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                </span>
                <h3 className="font-editorial text-base font-bold text-on-surface">
                  Hủy Toàn Bộ Đơn Hàng #{order.code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelOrderModal({ open: false, reason: '' })}
                className="p-1 rounded-lg hover:bg-theme-surface-subtle text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Thao tác này sẽ hủy toàn bộ các kiện hàng và sản phẩm thuộc đơn hàng #{order.code}. Số lượng tồn kho sẽ được tự động hoàn trả.
            </p>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">
                Lý do hủy đơn hàng:
              </label>
              <textarea
                value={cancelOrderModal.reason}
                onChange={(e) =>
                  setCancelOrderModal((prev) => ({ ...prev, reason: e.target.value }))
                }
                rows={3}
                placeholder="Nhập lý do hủy (ví dụ: Không còn nhu cầu, đặt nhầm sản phẩm, ...)"
                className="w-full px-3 py-2 rounded-xl border border-theme-border bg-theme-bg text-xs text-on-surface focus:outline-none focus:border-theme-primary resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={() => setCancelOrderModal({ open: false, reason: '' })}
                className="px-4 py-2.5 rounded-xl border border-theme-border text-on-surface font-semibold text-xs hover:bg-theme-surface-subtle transition-all cursor-pointer"
              >
                Giữ Lại
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleCancelMasterOrder}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingCancel ? 'Đang xử lý...' : 'Xác Nhận Hủy Toàn Bộ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute / Complaint Modal (Task 62 / POL-12) */}
      {disputeModal.open && (
        <DisputeModal
          isOpen={disputeModal.open}
          onClose={() => setDisputeModal({ open: false, subOrder: null })}
          orderId={order.id}
          orderCode={order.code}
          subOrderId={disputeModal.subOrder?.id || null}
          storeName={
            disputeModal.subOrder?.storeName ||
            disputeModal.subOrder?.business?.displayName ||
            order.sellerOrders?.[0]?.storeName ||
            'Gian Hàng'
          }
          onSuccess={(disputeResult) => {
            showToast(
              {
                title: 'Gửi khiếu nại thành công!',
                message: `Hồ sơ khiếu nại #${disputeResult.id.slice(0, 8)} đã được chuyển đến Ban trọng tài Sàn Huki. Tiền ký quỹ đã được tạm khóa để bảo vệ quyền lợi của bạn.`,
              },
              'success',
            );
            fetchOrderDetail();
          }}
        />
      )}
    </div>
  );
}

