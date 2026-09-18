"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { orderApi } from "@/ui/api/orderApi";
import { useAuth } from "@/ui/context/AuthContext";

/**
 * OrderSuccessPage - Migrated to Next.js App Router
 * Displays order confirmation, package fulfillments (physical/digital), tracking info, and recommendations.
 */

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const { user } = (useAuth() || {}) as any;

  const orderId = searchParams?.get("orderId") || "";
  const initialCode =
    searchParams?.get("code") ||
    (orderId
      ? `#${orderId.slice(0, 8)}`
      : "#HUKI" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "99");
  const initialPaymentMethod = searchParams?.get("paymentMethod") || "COD";

  const [order, setOrder] = useState<any>(null);
  const [, setIsLoading] = useState<boolean>(Boolean(orderId));

  const loadOrderDetail = useCallback(async () => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const res = await orderApi.getBuyerOrderDetail(orderId);
      if (res.success && res.data) {
        setOrder(res.data);
      }
    } catch {
      // Fallback to query params if not found or guest
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

  // Derived real data
  const orderCode = order?.code || initialCode;
  const paymentMethod = order?.paymentMethod || initialPaymentMethod;
  const isCod = paymentMethod.toUpperCase() === "COD";
  const grandTotal = order?.grandTotal ?? 0;
  const itemSubtotal = order?.itemSubtotal ?? grandTotal;
  const shippingFee = order?.shippingFee ?? 0;
  const discountAmount = order?.discountAmount ?? 0;

  // Status Vietnamese mapping
  const getStatusText = (status: string) => {
    switch (status?.toUpperCase()) {
      case "PENDING_PAYMENT":
        return "Chờ thanh toán";
      case "PENDING_CONFIRMATION":
        return "Chờ xác nhận";
      case "CONFIRMED":
        return "Đã tiếp nhận đơn";
      case "PROCESSING":
      case "PREPARING":
        return "Đang chuẩn bị hàng";
      case "SHIPPED":
        return "Đang vận chuyển";
      case "DELIVERED":
      case "COMPLETED":
        return "Giao thành công";
      case "CANCELLED":
        return "Đã hủy";
      default:
        return "Đã tiếp nhận đơn";
    }
  };

  // Flattened items from sellerOrders if present, or order.items
  const allItems =
    order?.sellerOrders?.flatMap((so: any) => so.items || []) || order?.items || [];
  const physicalItems = allItems.filter(
    (i: any) => i.format === "PHYSICAL" || i.format === "BOTH" || i.type === "physical"
  );
  const digitalItems = allItems.filter(
    (i: any) => i.format === "DIGITAL" || i.type === "ebook"
  );

  const hasPhysical = physicalItems.length > 0 || allItems.length === 0;
  const hasDigital = digitalItems.length > 0;

  // Shipping address parsing
  const addrObj = order?.shippingAddress;
  const recipientName =
    addrObj?.fullName ||
    addrObj?.recipientName ||
    user?.fullName ||
    user?.name ||
    "Khách Hàng HUKI";
  const recipientPhone = addrObj?.phone || user?.phone || "09••••••••";
  const fullAddress = addrObj
    ? [
        addrObj.line1 || addrObj.address,
        addrObj.ward,
        addrObj.district,
        addrObj.city || addrObj.province,
      ]
        .filter(Boolean)
        .join(", ")
    : "12 Nguyễn Văn Bảo, Phường 5, Quận Gò Vấp, TP. Hồ Chí Minh";

  const formattedDate = order?.createdAt
    ? new Date(order.createdAt).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleDateString("vi-VN") +
      " · " +
      new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(orderCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-[#f8fafc] text-on-surface font-body-md min-h-screen py-8">
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-8">
        {/* Progress Stepper */}
        <nav aria-label="Tiến trình thanh toán" className="w-full bg-white border border-slate-200/80 rounded-2xl px-6 sm:px-8 py-5 shadow-xs">
          <ol className="flex items-center justify-between max-w-3xl mx-auto relative">
            <div className="absolute left-6 right-6 top-4 -translate-y-1/2 h-[2px] bg-emerald-600 z-0"></div>

            <li className="flex flex-col items-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white ring-4 ring-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[18px]">check</span>
              </div>
              <span className="mt-2 text-slate-700 text-xs font-medium">Giỏ hàng</span>
            </li>

            <li className="flex flex-col items-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white ring-4 ring-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[18px]">check</span>
              </div>
              <span className="mt-2 text-slate-700 text-xs font-medium">Thông tin</span>
            </li>

            <li className="flex flex-col items-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white ring-4 ring-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[18px]">check</span>
              </div>
              <span className="mt-2 text-slate-700 text-xs font-medium">Thanh toán</span>
            </li>

            <li className="flex flex-col items-center relative z-10">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white ring-4 ring-emerald-100 flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[18px]">check</span>
              </div>
              <span className="mt-2 text-xs text-emerald-700 font-bold">Hoàn tất</span>
            </li>
          </ol>
        </nav>

        {/* Status Confirmation Hero */}
        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xs text-center flex flex-col items-center relative">
          <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-4 shadow-md shadow-emerald-600/20 ring-8 ring-emerald-50">
            <span className="material-symbols-outlined text-[32px]">done_all</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl text-slate-900 font-extrabold tracking-tight">
            {isCod ? "Đặt Hàng Thành Công!" : "Thanh Toán Thành Công!"}
          </h1>
          <p className="text-slate-600 max-w-xl mt-2 text-xs sm:text-sm leading-relaxed">
            Cảm ơn bạn đã tin tưởng chọn mua sách tại HUKI. Đơn hàng của bạn đã được tiếp nhận và các nhà sách đối tác đang chuẩn bị đóng gói giao hàng.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-xs font-medium">Mã đơn hàng:</span>
              <span className="font-mono text-slate-800 tracking-wide font-bold text-sm" id="order-code">
                {orderCode.startsWith("#") ? orderCode : `#${orderCode}`}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 px-1.5 py-0.5 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer text-xs font-medium"
                onClick={handleCopyCode}
                title="Sao chép mã đơn"
              >
                {copied ? (
                  <>
                    <span className="material-symbols-outlined text-[15px] text-emerald-600" data-icon="done">done</span>
                    <span className="text-[11px] text-emerald-700 font-bold">Đã sao chép</span>
                  </>
                ) : (
                  <span className="material-symbols-outlined text-[18px]" data-icon="content_copy">content_copy</span>
                )}
              </button>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {isCod ? "Thanh toán COD khi nhận sách" : "Đã thanh toán (PayOS)"}
            </span>
          </div>

          {/* Metric Tiles */}
          <div className="mt-6 pt-6 border-t border-slate-100 w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phương thức</span>
              <span className="text-xs sm:text-sm text-slate-800 font-bold flex items-center gap-1.5 mt-0.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-600" data-icon={isCod ? "payments" : "qr_code_2"}>
                  {isCod ? "payments" : "qr_code_2"}
                </span>
                {isCod ? "COD (Tiền mặt)" : "PayOS (VietQR)"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Thời gian đặt</span>
              <span className="text-xs sm:text-sm text-slate-800 font-bold mt-0.5">{formattedDate}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng thanh toán</span>
              <span className="text-xs sm:text-sm text-[#9e2a2b] font-black mt-0.5">
                {grandTotal > 0 ? `${grandTotal.toLocaleString("vi-VN")}đ` : "179.000đ"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Trạng thái</span>
              <span className="text-xs sm:text-sm text-emerald-700 font-bold mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {getStatusText(order?.status)}
              </span>
            </div>
          </div>
        </section>

        {/* Fulfillment Packages */}
        {hasPhysical && !hasDigital ? (
          <section className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start justify-between">
              {/* Left Column: Fulfillment Status & Timeline */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[26px]" data-icon="local_shipping">local_shipping</span>
                  </div>
                  <div>
                    <span className="uppercase tracking-wider text-emerald-700 text-[11px] font-bold">Đơn hàng hiện vật</span>
                    <h3 className="text-lg font-bold text-slate-900">Sách Giấy Đang Được Chuẩn Bị</h3>
                  </div>
                </div>

                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  Các nhà sách đối tác đã nhận được đơn hàng và đang đóng gói cẩn thận để bàn giao cho đơn vị vận chuyển tiêu chuẩn.
                </p>

                {/* Tracking Steps Preview */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-800 font-medium">
                    <span className="material-symbols-outlined text-emerald-600 text-[20px]" data-icon="event_available">event_available</span>
                    <span><strong>Dự kiến nhận hàng:</strong> 2 - 3 ngày làm việc</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                    <span className="material-symbols-outlined text-slate-400 text-[18px]" data-icon="verified">verified</span>
                    <span>Đơn vị giao vận: <strong>Viettel Post / GHTK Chuyển phát tiêu chuẩn</strong></span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href={orderId ? `/orders/${orderId}` : "/orders"}
                    className="h-10 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]" data-icon="local_shipping">local_shipping</span>
                    Theo Dõi Đơn Hàng
                  </Link>
                  <Link
                    href="/"
                    className="h-10 px-5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]" data-icon="west">west</span>
                    Tiếp tục mua sắm
                  </Link>
                </div>
              </div>

              {/* Right Column: Delivery Address Card */}
              <div className="w-full lg:w-[420px] p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-slate-600" data-icon="pin_drop">pin_drop</span>
                      Địa chỉ nhận hàng
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                      {physicalItems.length > 0 ? `${physicalItems.reduce((s: number, i: any) => s + (i.quantity || 1), 0)} cuốn sách` : "1 kiện hàng"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-start gap-3">
                    <span className="material-symbols-outlined text-slate-400 text-[22px] flex-shrink-0 mt-0.5" data-icon="location_on">location_on</span>
                    <div className="text-xs sm:text-sm">
                      <p className="font-bold text-slate-900">{recipientName} <span className="text-slate-500 font-normal">({recipientPhone})</span></p>
                      <p className="text-slate-600 mt-1 leading-relaxed">{fullAddress}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-600 text-[16px]" data-icon="shield">shield</span>
                    Bảo hiểm hàng hóa 100%
                  </span>
                  <span className="font-medium text-slate-700">Đồng kiểm khi nhận</span>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className={`grid gap-6 ${hasPhysical && hasDigital ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
            {/* Package 1: Physical Books */}
            {hasPhysical && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 lg:p-7 flex flex-col justify-between shadow-sm relative">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[26px]" data-icon="local_shipping">local_shipping</span>
                      </div>
                      <div>
                        <span className="uppercase tracking-wider text-slate-500 text-[11px] font-bold">Đơn hàng hiện vật</span>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900">Sách Giấy Đang Được Chuẩn Bị</h3>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                      {physicalItems.length > 0 ? `${physicalItems.reduce((s: number, i: any) => s + (i.quantity || 1), 0)} cuốn` : "1 kiện"}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-4 text-xs sm:text-sm leading-relaxed">
                    Các nhà sách đối tác đã nhận được đơn hàng và đang đóng gói cẩn thận để bàn giao cho đơn vị vận chuyển tiêu chuẩn.
                  </p>

                  <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/60 flex flex-col gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 text-slate-800">
                      <span className="material-symbols-outlined text-emerald-600 text-[20px]" data-icon="event_available">event_available</span>
                      <span><strong>Dự kiến nhận hàng:</strong> 2 - 3 ngày làm việc</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-600 pt-2 border-t border-slate-200/60">
                      <span className="material-symbols-outlined text-slate-400 text-[20px] flex-shrink-0 mt-0.5" data-icon="location_on">location_on</span>
                      <div>
                        <strong className="text-slate-900">{recipientName}</strong> · {recipientPhone}<br />
                        <span className="text-slate-600">{fullAddress}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={orderId ? `/orders/${orderId}` : "/orders"}
                    className="h-10 px-5 rounded-xl border border-emerald-700 text-emerald-700 hover:bg-emerald-50 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]" data-icon="local_shipping">local_shipping</span>
                    Theo Dõi Đơn Hàng
                  </Link>
                  <span className="text-xs text-slate-500 font-medium">Giao bởi Viettel Post / GHTK</span>
                </div>
              </div>
            )}

            {/* Package 2: Ebook DRM Activation */}
            {hasDigital && (
              <div className="bg-[#f0f9f6] border border-emerald-200/80 rounded-3xl p-6 lg:p-7 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl pointer-events-none"></div>
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-[26px] fill-icon" data-icon="menu_book">menu_book</span>
                      </div>
                      <div>
                        <span className="uppercase tracking-wider text-emerald-800 font-bold text-[11px]">Tài nguyên số Huki</span>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900">Ebook Đã Sẵn Sàng Trong Tủ Sách!</h3>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]" data-icon="lock_open">lock_open</span>
                      {digitalItems.length} ebook bản quyền
                    </span>
                  </div>
                  <p className="text-slate-600 mt-4 text-xs sm:text-sm leading-relaxed">
                    Bản quyền số vĩnh viễn đã được cấp thành công vào tài khoản <strong className="text-slate-900 font-medium">{user?.email || "của bạn"}</strong> trên hệ sinh thái ứng dụng và web reader của HUKI.
                  </p>

                  <div className="mt-5 p-3.5 rounded-2xl bg-white border border-emerald-200/60 flex items-center gap-4 shadow-xs">
                    <div className="w-14 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200 shadow-xs flex items-center justify-center">
                      <span className="material-symbols-outlined text-[32px] text-emerald-700">auto_stories</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">Ebook (EPUB DRM)</span>
                        <span className="text-slate-500 text-[11px]">Không giới hạn đọc offline</span>
                      </div>
                      <h4 className="text-slate-900 truncate mt-1 font-bold text-xs sm:text-sm">
                        {digitalItems[0]?.title || "Kho Sách Điện Tử Cá Nhân HUKI"}
                      </h4>
                      <p className="text-slate-500 text-xs">Đồng bộ ghi chú, highlight và vị trí đọc tức thì</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-3">
                  <Link className="h-10 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer" href="/reader">
                    Đọc Ngay Bây Giờ
                    <span className="material-symbols-outlined text-[18px]" data-icon="arrow_forward">arrow_forward</span>
                  </Link>
                  <Link className="text-xs sm:text-sm text-emerald-800 hover:underline font-bold flex items-center gap-1 cursor-pointer" href="/library">
                    Mở Tủ Sách Của Tôi
                    <span className="material-symbols-outlined text-[16px]" data-icon="open_in_new">open_in_new</span>
                  </Link>
                </div>
              </div>
            )}
          </section>
        )}

        <div className="flex items-center justify-center -mt-2">
          <Link className="font-body-md text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors" href="/">
            <span className="material-symbols-outlined text-[18px]" data-icon="west">west</span>
            Tiếp tục mua sắm các tựa sách khác trên HUKI
          </Link>
        </div>

        {/* Real Order Items by Seller and Payment Summary */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-surface-variant pb-3">
              <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[24px]" data-icon="inventory_2">inventory_2</span>
                Chi Tiết Đơn Hàng Theo Nhà Xuất Bản &amp; Đối Tác
              </h2>
              <span className="font-body-sm text-on-surface-variant">
                {order?.sellerOrders?.length ? `${order.sellerOrders.length} kiện hàng` : "Chi tiết kiện hàng"}
              </span>
            </div>

            {/* Dynamic Seller Orders / Items */}
            {order?.sellerOrders && order.sellerOrders.length > 0 ? (
              order.sellerOrders.map((so: any) => (
                <div key={so.id} className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-surface-container-low px-5 py-3.5 border-b border-surface-variant flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-primary text-[20px]" data-icon="store">store</span>
                      <span className="font-title-md text-body-md text-on-surface">Nhà Sách Đối Tác HUKI</span>
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-label-sm">Chính Hãng</span>
                      <span className="text-surface-dim">•</span>
                      <span className="font-body-sm text-on-surface-variant">Mã kiện: {so.code}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm flex items-center gap-1 font-semibold">
                      <span className="material-symbols-outlined text-[14px]" data-icon="hourglass_top">hourglass_top</span>
                      {so.status || "Đang chuẩn bị hàng"}
                    </span>
                  </div>

                  <div className="p-5 flex flex-col divide-y divide-surface-variant">
                    {so.items?.map((item: any) => (
                      <div key={item.id || item.bookId} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                        <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container border border-surface-variant shadow-sm flex items-center justify-center">
                          {item.coverImage || item.coverUrl ? (
                            <img className="w-full h-full object-cover" alt={item.title} src={item.coverImage || item.coverUrl} />
                          ) : (
                            <span className="material-symbols-outlined text-[28px] text-on-surface-variant">menu_book</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-title-md text-body-md text-on-surface">{item.title}</h4>
                              <p className="font-body-sm text-on-surface-variant mt-0.5">Mã sách: {item.bookId}</p>
                            </div>
                            <span className="font-title-md text-body-md text-on-surface flex-shrink-0">
                              {(item.price || 0).toLocaleString("vi-VN")}đ
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-body-sm">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm">
                                {item.format === "DIGITAL" ? "Ebook số" : "Sách giấy vật lý"}
                              </span>
                              <span className="text-on-surface-variant">Số lượng: x{item.quantity || 1}</span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-on-surface-variant font-label-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                              Đang chuẩn bị tại kho
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-surface-container-low/50 px-5 py-3 border-t border-surface-variant flex items-center justify-between text-body-sm">
                    <span className="text-on-surface-variant flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]" data-icon="local_shipping">local_shipping</span>
                      Phí vận chuyển kiện hàng:
                    </span>
                    <span className="font-title-md text-on-surface">{(so.shippingFee || 0).toLocaleString("vi-VN")}đ</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-surface-container-low px-5 py-3.5 border-b border-surface-variant flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-primary text-[20px]" data-icon="store">store</span>
                    <span className="font-title-md text-body-md text-on-surface">Nhà Sách HUKI Official</span>
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-label-sm">Chính Hãng</span>
                    <span className="text-surface-dim">•</span>
                    <span className="font-body-sm text-on-surface-variant">Mã đơn: #{orderCode}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[14px]" data-icon="hourglass_top">hourglass_top</span>
                    Đang chuẩn bị hàng
                  </span>
                </div>

                <div className="p-5 flex flex-col divide-y divide-surface-variant">
                  <div className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                    <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container border border-surface-variant shadow-sm flex items-center justify-center">
                      <span className="material-symbols-outlined text-[28px] text-on-surface-variant">auto_stories</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-title-md text-body-md text-on-surface">Đơn Hàng Sách Đã Được Xác Nhận</h4>
                          <p className="font-body-sm text-on-surface-variant mt-0.5">Các tựa sách trong đơn hàng đang được chuẩn bị đóng gói.</p>
                        </div>
                        <span className="font-title-md text-body-md text-on-surface flex-shrink-0">
                          {grandTotal > 0 ? `${grandTotal.toLocaleString("vi-VN")}đ` : "461.000đ"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-body-sm">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm">Giao tận nơi</span>
                          <span className="text-on-surface-variant">Số lượng: 1 kiện</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Summary Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="border-b border-surface-variant pb-3">
              <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]" data-icon="receipt">receipt</span>
                Tóm Tắt Thanh Toán
              </h2>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant/70 rounded-xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between text-body-md">
                <span className="text-on-surface-variant">Tổng tiền hàng:</span>
                <span className="font-body-md text-on-surface">
                  {itemSubtotal > 0 ? `${itemSubtotal.toLocaleString("vi-VN")}đ` : `${grandTotal.toLocaleString("vi-VN")}đ`}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-body-md">
                  <span className="text-on-surface-variant flex items-center gap-1">
                    Voucher &amp; Ưu đãi:
                    <span className="material-symbols-outlined text-primary text-[16px]" data-icon="sell">sell</span>
                  </span>
                  <span className="font-body-md text-primary font-medium">-{discountAmount.toLocaleString("vi-VN")}đ</span>
                </div>
              )}
              <div className="flex items-center justify-between text-body-md">
                <span className="text-on-surface-variant">Phí vận chuyển:</span>
                <span className="font-body-md text-on-surface">
                  {shippingFee > 0 ? `${shippingFee.toLocaleString("vi-VN")}đ` : "20.000đ"}
                </span>
              </div>
              <div className="h-[1px] bg-surface-variant my-1"></div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="font-title-lg text-title-lg text-on-surface block">
                    {isCod ? "Tổng Cần Thanh Toán" : "Tổng Đã Thanh Toán"}
                  </span>
                  <span className="font-label-sm text-tertiary">
                    {isCod ? "COD • Thanh toán khi nhận hàng" : "PayOS • Giao dịch hoàn tất"}
                  </span>
                </div>
                <span className="font-headline-md text-headline-md font-bold text-primary">
                  {grandTotal > 0 ? `${grandTotal.toLocaleString("vi-VN")}đ` : "461.000đ"}
                </span>
              </div>

              <div className="mt-4 p-3.5 rounded-lg bg-surface-container-low border border-surface-variant text-body-sm flex items-start gap-2.5">
                <span className="material-symbols-outlined text-tertiary text-[20px] flex-shrink-0 mt-0.5" data-icon="description">description</span>
                <div>
                  <strong className="text-on-surface font-title-md">Thông tin đơn hàng:</strong>
                  <p className="text-on-surface-variant text-[12px] mt-0.5">
                    Hóa đơn và thông tin cập nhật lộ trình giao hàng được đồng bộ tự động vào tài khoản của bạn.
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <button
                  onClick={() => typeof window !== "undefined" && window.print()}
                  className="w-full h-10 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface font-title-md text-body-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]" data-icon="print">print</span>
                  In Biên Lai Đơn Hàng
                </button>
                <Link
                  href="/help"
                  className="w-full h-10 rounded-lg text-tertiary hover:bg-tertiary/5 font-title-md text-body-sm flex items-center justify-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]" data-icon="support_agent">support_agent</span>
                  Cần hỗ trợ về đơn hàng này?
                </Link>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low/60 border border-surface-variant flex items-center gap-3">
              <span className="material-symbols-outlined text-tertiary text-[28px]" data-icon="security">security</span>
              <div className="text-body-sm">
                <span className="font-title-md text-on-surface block">Cam Kết Độc Quyền HUKI</span>
                <span className="text-on-surface-variant text-[12px]">Đổi trả sách giấy trong 7 ngày nếu lỗi in ấn. Ebook cam kết bản quyền chính chủ 100%.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Ecosystem promo */}
        <section className="bg-surface-container-lowest border border-outline-variant/70 rounded-2xl p-8 shadow-sm">
          <div className="max-w-2xl">
            <span className="font-label-sm uppercase tracking-wider text-tertiary font-semibold">Hệ sinh thái đọc HUKI</span>
            <h2 className="font-headline-md text-headline-md text-on-surface mt-1">
              Hành Trình Đọc Của Bạn Bắt Đầu Từ Đây
            </h2>
            <p className="font-body-md text-on-surface-variant mt-1.5">
              Dù đọc ebook tức thì hay đón chờ sách giấy về tận tay, bạn đã là một phần của cộng đồng yêu sách HUKI.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="p-5 rounded-xl bg-surface-container-low border border-surface-variant flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center font-bold mb-4 font-headline-sm">
                  1
                </div>
                <h3 className="font-title-lg text-title-md text-on-surface">Mở Ebook Đọc Ngay</h3>
                <p className="font-body-sm text-on-surface-variant mt-2">
                  Trải nghiệm trình đọc hiện đại Huki Reader trên trình duyệt web hoặc ứng dụng di động iOS/Android không cần tải file nặng.
                </p>
              </div>
              <Link className="mt-4 font-title-md text-body-sm text-tertiary hover:underline flex items-center gap-1" href="/reader">
                Khám phá Web Reader
                <span className="material-symbols-outlined text-[16px]" data-icon="arrow_forward">arrow_forward</span>
              </Link>
            </div>

            <div className="p-5 rounded-xl bg-surface-container-low border border-surface-variant flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center font-bold mb-4 font-headline-sm">
                  2
                </div>
                <h3 className="font-title-lg text-title-md text-on-surface">Đồng Bộ &amp; Ghi Chú</h3>
                <p className="font-body-sm text-on-surface-variant mt-2">
                  Highlight các đoạn văn tâm đắc, lưu trích dẫn và đồng bộ trang đang đọc liền mạch giữa điện thoại, máy tính bảng và laptop.
                </p>
              </div>
              <Link className="mt-4 font-title-md text-body-sm text-tertiary hover:underline flex items-center gap-1" href="/library">
                Xem Tủ Sách Cá Nhân
                <span className="material-symbols-outlined text-[16px]" data-icon="arrow_forward">arrow_forward</span>
              </Link>
            </div>

            <div className="p-5 rounded-xl bg-surface-container-low border border-surface-variant flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center font-bold mb-4 font-headline-sm">
                  3
                </div>
                <h3 className="font-title-lg text-title-md text-on-surface">Thảo Luận &amp; Viết Review</h3>
                <p className="font-body-sm text-on-surface-variant mt-2">
                  Tham gia phòng đọc ảo cùng 48.000+ thành viên mê sách, trao đổi góc nhìn và nhận điểm thưởng cho mỗi bài review chất lượng.
                </p>
              </div>
              <Link className="mt-4 font-title-md text-body-sm text-tertiary hover:underline flex items-center gap-1" href="/community">
                Ghé Mạng Xã Hội Sách
                <span className="material-symbols-outlined text-[16px]" data-icon="arrow_forward">arrow_forward</span>
              </Link>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-surface-container flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[28px]" data-icon="celebration">celebration</span>
              <div>
                <span className="font-title-md text-body-md text-on-surface block">Chia sẻ cuốn sách mới bạn vừa sở hữu</span>
                <span className="font-body-sm text-on-surface-variant">Lan tỏa cảm hứng đọc sách cùng bạn bè trên Mạng xã hội HUKI</span>
              </div>
            </div>
            <button className="h-10 px-5 rounded-lg bg-primary hover:bg-[#922313] text-on-primary font-title-md text-body-sm flex items-center gap-2 transition-colors shadow-sm">
              <span className="material-symbols-outlined text-[18px]" data-icon="share">share</span>
              Đăng Lên Bảng Tin Huki
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl text-emerald-700 animate-pulse">
              check_circle
            </span>
            <p className="mt-4 text-slate-600 font-medium">Đang tải...</p>
          </div>
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
