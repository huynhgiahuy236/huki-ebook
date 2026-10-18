"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useShipper } from '@/ui/context/ShipperContext';
import QuickDispatchNotificationModal from '../common/QuickDispatchNotificationModal';

export default function ShipperActiveDeliveriesView() {
  const { activeDeliveries, confirmPickup, completeDelivery, failDelivery } = useShipper();

  const [selectedOrderToFail, setSelectedOrderToFail] = useState<string | null>(null);
  const [failReason, setFailReason] = useState('Khách không nghe máy (đã gọi 3 lần)');
  const [dispatchModal, setDispatchModal] = useState<{
    open: boolean;
    targetRole: 'SELLER' | 'USER';
    targetId: string;
    targetName: string;
    orderCode: string;
    orderId?: string;
  }>({
    open: false,
    targetRole: 'USER',
    targetId: '',
    targetName: '',
    orderCode: '',
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--theme-border,#e8e5df)] pb-3.5">
        <div>
          <h1 className="font-editorial text-xl sm:text-2xl font-bold text-[var(--theme-text,#1c1b1f)] flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">route</span>
            </span>
            <span>Đơn Hàng Đang Thực Hiện ({activeDeliveries.length})</span>
          </h1>
          <p className="text-xs text-[var(--theme-text-muted,#49454f)] mt-0.5">
            Cập nhật tiến trình lấy hàng từ Shop và giao tận tay người nhận sách.
          </p>
        </div>

        <Link
          href="/shipper/available-orders"
          className="px-4 py-2 rounded-xl bg-[var(--theme-surface,#ffffff)] border border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003B2B)] text-xs font-bold text-[var(--theme-text,#1c1b1f)] flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
        >
          <span className="material-symbols-outlined text-[16px] text-emerald-600">add</span>
          <span>Nhận thêm đơn mới</span>
        </Link>
      </div>

      {activeDeliveries.length === 0 ? (
        <div className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] p-12 text-center text-xs text-[var(--theme-text-muted,#49454f)] space-y-3 shadow-2xs">
          <span className="material-symbols-outlined text-[42px] text-neutral-300">task_alt</span>
          <p className="font-bold text-sm sm:text-base text-[var(--theme-text,#1c1b1f)]">
            Bạn hiện chưa có đơn hàng nào đang chạy!
          </p>
          <p>Hãy vào sàn đơn hàng chờ nhận để lấy đơn sách và gia tăng thu nhập hôm nay.</p>
          <Link
            href="/shipper/available-orders"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white text-xs font-bold hover:opacity-95 shadow-sm mt-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">electric_moped</span>
            <span>Vào Sàn Nhận Đơn Ngay</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {activeDeliveries.map((order) => {
            const isReturn = order.orderType === 'RETURN';
            const isPickingUp = order.status === 'PICKING_UP';
            const isInTransit = order.status === 'IN_TRANSIT';
            const pickupMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              isReturn ? `${order.deliveryAddress}, ${order.deliveryProvince}` : order.shopAddress
            )}`;
            const dropoffMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              isReturn ? order.shopAddress : `${order.deliveryAddress}, ${order.deliveryProvince}`
            )}`;

            return (
              <div
                key={order.id}
                className={`bg-[var(--theme-surface,#ffffff)] rounded-2xl border-2 p-5 sm:p-6 shadow-xs space-y-4 transition-all ${
                  isReturn
                    ? 'border-purple-300 dark:border-purple-800/60 ring-2 ring-purple-500/10'
                    : 'border-[var(--theme-border,#e8e5df)]'
                }`}
              >
                {/* Header & Status Indicator */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[var(--theme-border,#e8e5df)] gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-black text-sm sm:text-base text-[var(--theme-text,#1c1b1f)]">
                      {order.code}
                    </span>
                    {isReturn ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                        <span>
                          {isPickingUp
                            ? 'LẤY HÀNG HOÀN • BƯỚC 1: ĐẾN NHÀ KHÁCH THU HỒI SÁCH'
                            : 'LẤY HÀNG HOÀN • BƯỚC 2: VẬN CHUYỂN TRẢ VỀ KHO SHOP'}
                        </span>
                      </span>
                    ) : (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 ${
                          isPickingUp
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300 animate-pulse'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current"></span>
                        <span>{isPickingUp ? 'BƯỚC 1: ĐẾN SHOP LẤY SÁCH' : 'BƯỚC 2: ĐANG GIAO ĐẾN KHÁCH'}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-[var(--theme-text-muted,#49454f)]">
                      Cước công ship:{' '}
                      <strong className={`font-black text-sm ${isReturn ? 'text-purple-700 dark:text-purple-400' : 'text-[#00875A]'}`}>
                        +{order.shippingFee.toLocaleString('vi-VN')}đ
                      </strong>
                    </span>
                    {isReturn ? (
                      <span className="px-2 py-0.5 bg-purple-50 rounded border border-purple-200 text-purple-800 font-bold text-[11px]">
                        COD: 0đ (Miễn phí khách)
                      </span>
                    ) : (
                      order.codAmount > 0 && (
                        <span className="px-2 py-0.5 bg-amber-50 rounded border border-amber-200 text-amber-800 font-bold text-[11px]">
                          Thu COD: {order.codAmount.toLocaleString('vi-VN')}đ
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Return Reason Box if Reverse Logistics */}
                {isReturn && order.returnReason && (
                  <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/40 text-xs flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-purple-700 shrink-0 mt-0.5">info</span>
                    <div>
                      <strong className="text-purple-900 dark:text-purple-300 font-bold block">
                        Lý do khách hoàn hàng:
                      </strong>
                      <span className="text-purple-800 dark:text-purple-400 font-medium">
                        {order.returnReason}
                      </span>
                    </div>
                  </div>
                )}

                {/* Main Action Route Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Step 1: Pickup Location */}
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      isPickingUp
                        ? isReturn
                          ? 'bg-purple-50/60 border-purple-300 ring-2 ring-purple-500/20'
                          : 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-500/20'
                        : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`flex items-center gap-1.5 font-bold ${
                          isReturn ? 'text-purple-900 dark:text-purple-300' : 'text-amber-900 dark:text-amber-300'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] ${
                            isReturn ? 'bg-purple-600' : 'bg-amber-500'
                          }`}
                        >
                          1
                        </span>
                        <span>{isReturn ? 'ĐIỂM 1: THU HỒI SÁCH (NHÀ KHÁCH)' : 'ĐIỂM 1: LẤY SÁCH (SHOP)'}</span>
                      </div>
                      {!isPickingUp && (
                        <span className="text-[10.5px] text-emerald-600 font-bold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Đã lấy xong lúc {order.pickedUpAt || 'vừa xong'}
                        </span>
                      )}
                    </div>

                    <p className="font-bold text-sm text-[var(--theme-text,#1c1b1f)]">
                      {isReturn ? order.customerName : order.shopName}
                    </p>
                    <p className="text-[var(--theme-text-muted,#49454f)] mt-0.5">
                      {isReturn
                        ? `${order.deliveryAddress}, ${order.deliveryWard}, ${order.deliveryDistrict}, ${order.deliveryProvince}`
                        : order.shopAddress}
                    </p>
                    <p className="text-[var(--theme-text-muted,#49454f)] mt-0.5">
                      Liên hệ: {isReturn ? `SĐT Khách: ${order.customerPhone}` : `Hotline Shop: ${order.shopPhone}`}
                    </p>

                    {isPickingUp && (
                      <div className="mt-3.5 pt-3 border-t border-[var(--theme-border,#e8e5df)] flex items-center gap-2">
                        <a
                          href={`tel:${isReturn ? order.customerPhone : order.shopPhone}`}
                          className="px-3 py-1.5 rounded-lg bg-white border border-[var(--theme-border,#e8e5df)] text-[var(--theme-text,#1c1b1f)] font-bold text-xs hover:bg-neutral-50 flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">call</span>
                          {isReturn ? 'Gọi Khách' : 'Gọi Shop'}
                        </a>
                        <a
                          href={pickupMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-white border border-[var(--theme-border,#e8e5df)] text-[var(--theme-text,#1c1b1f)] font-bold text-xs hover:bg-neutral-50 flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">navigation</span>
                          Chỉ đường
                        </a>
                        <button
                          type="button"
                          onClick={() => confirmPickup(order.id)}
                          className={`ml-auto px-4 py-1.5 rounded-lg text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer transition-all ${
                            isReturn
                              ? 'bg-purple-600 hover:bg-purple-700'
                              : 'bg-amber-600 hover:bg-amber-700'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          <span>{isReturn ? 'Đã Nhận Sách Hoàn Từ Khách' : 'Xác Nhận Đã Nhận Hàng'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Dropoff Location */}
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      isInTransit
                        ? isReturn
                          ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-500/20'
                          : 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`flex items-center gap-1.5 font-bold ${
                          isReturn ? 'text-indigo-900 dark:text-indigo-300' : 'text-emerald-900 dark:text-emerald-300'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] ${
                            isReturn ? 'bg-indigo-600' : 'bg-emerald-600'
                          }`}
                        >
                          2
                        </span>
                        <span>{isReturn ? 'ĐIỂM 2: TRẢ HÀNG VỀ KHO (SHOP/NXB)' : 'ĐIỂM 2: GIAO SÁCH (NGƯỜI NHẬN)'}</span>
                      </div>
                      {isInTransit && (
                        <span
                          className={`text-[10.5px] font-bold animate-pulse ${
                            isReturn ? 'text-indigo-700' : 'text-emerald-700'
                          }`}
                        >
                          {isReturn ? 'Đang chuyển về kho Shop...' : 'Đang trên đường giao...'}
                        </span>
                      )}
                    </div>

                    <p className="font-bold text-sm text-[var(--theme-text,#1c1b1f)]">
                      {isReturn ? order.shopName : order.customerName}
                    </p>
                    <p className="text-[var(--theme-text-muted,#49454f)] mt-0.5">
                      {isReturn
                        ? order.shopAddress
                        : `${order.deliveryAddress}, ${order.deliveryWard}, ${order.deliveryDistrict}, ${order.deliveryProvince}`}
                    </p>
                    <p className="text-[var(--theme-text-muted,#49454f)] mt-0.5">
                      Liên hệ: {isReturn ? `Hotline Shop: ${order.shopPhone}` : `SĐT Khách: ${order.customerPhone}`}
                    </p>

                    {isInTransit && (
                      <div className="mt-3.5 pt-3 border-t border-[var(--theme-border,#e8e5df)] flex items-center gap-2">
                        <a
                          href={`tel:${isReturn ? order.shopPhone : order.customerPhone}`}
                          className="px-3 py-1.5 rounded-lg bg-white border border-[var(--theme-border,#e8e5df)] text-[var(--theme-text,#1c1b1f)] font-bold text-xs hover:bg-neutral-50 flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">call</span>
                          {isReturn ? 'Gọi Shop' : 'Gọi Khách'}
                        </a>
                        <a
                          href={dropoffMapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-white border border-[var(--theme-border,#e8e5df)] text-[var(--theme-text,#1c1b1f)] font-bold text-xs hover:bg-neutral-50 flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">navigation</span>
                          Chỉ đường
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items in Parcel */}
                <div className="p-3 bg-[var(--theme-background,#F2FBF9)]/60 rounded-xl border border-[var(--theme-border,#e8e5df)] text-xs">
                  <span className="font-bold text-[var(--theme-text,#1c1b1f)] block mb-1">
                    {isReturn ? 'Chi tiết sách hoàn cần bàn giao về kho:' : 'Chi tiết kiện sách cần giao:'}
                  </span>
                  <div className="flex items-center gap-4 flex-wrap">
                    {order.items.map((item, idx) => (
                      <span key={idx} className="bg-white px-2.5 py-1 rounded-md border border-[var(--theme-border,#e8e5df)]">
                        📚 {item.quantity}x {item.title} ({item.format})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Step-2 Final Confirmation Bar */}
                {isInTransit && (
                  <div className="pt-3 border-t border-[var(--theme-border,#e8e5df)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-[var(--theme-text-muted,#49454f)] block">
                        {isReturn ? 'Tiền thu từ khách/shop:' : 'Số tiền cần thu từ người nhận:'}
                      </span>
                      <strong
                        className={`text-base sm:text-lg font-black block ${
                          isReturn ? 'text-purple-700' : 'text-amber-700'
                        }`}
                      >
                        {isReturn
                          ? '0đ (Đơn thu hồi đổi trả miễn phí)'
                          : order.codAmount > 0
                          ? `${order.codAmount.toLocaleString('vi-VN')}đ (Tiền mặt COD)`
                          : '0đ (Khách đã thanh toán trực tuyến)'}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          setDispatchModal({
                            open: true,
                            targetRole: 'USER',
                            targetId: order.customerPhone || order.deliveryAddress,
                            targetName: `Khách hàng: ${order.customerName || 'Người nhận'}`,
                            orderCode: order.code,
                            orderId: order.id,
                          })
                        }
                        className="px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">phone_in_talk</span>
                        <span>Nhắn Khách</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setDispatchModal({
                            open: true,
                            targetRole: 'SELLER',
                            targetId: order.shopAddress || 'store_channel',
                            targetName: `Shop: ${order.shopName || 'Gian hàng'}`,
                            orderCode: order.code,
                            orderId: order.id,
                          })
                        }
                        className="px-3 py-2 rounded-xl border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">storefront</span>
                        <span>Báo Shop</span>
                      </button>

                      {!isReturn && (
                        <button
                          type="button"
                          onClick={() => setSelectedOrderToFail(order.id)}
                          className="px-4 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer"
                        >
                          Báo Giao Thất Bại
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => completeDelivery(order.id)}
                        className={`px-6 py-2.5 rounded-xl text-white text-xs sm:text-sm font-black hover:opacity-95 shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                          isReturn
                            ? 'bg-gradient-to-r from-purple-700 to-indigo-800'
                            : 'bg-gradient-to-r from-[#00875A] to-[#005a40]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">verified</span>
                        <span>{isReturn ? 'Xác Nhận Đã Bàn Giao Về Kho Shop' : 'Xác Nhận Giao & Thu Tiền'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fail Delivery Reason Modal */}
      {selectedOrderToFail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--theme-border,#e8e5df)]">
              <h3 className="font-bold text-sm text-[var(--theme-text,#1c1b1f)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-rose-600">warning</span>
                Báo Cáo Giao Hàng Thất Bại
              </h3>
              <button
                onClick={() => setSelectedOrderToFail(null)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[var(--theme-text-muted,#49454f)]">
              Kiện hàng sẽ được ghi nhận hoàn hàng về Shop. Vui lòng chọn lý do chính xác:
            </p>

            <div className="space-y-2 text-xs">
              {[
                'Khách không nghe máy (đã gọi 3 lần)',
                'Khách từ chối nhận hàng (Boom hàng)',
                'Khách hẹn giao lại vào ngày khác',
                'Sai địa chỉ / Không tìm thấy người nhận',
              ].map((reason) => (
                <label
                  key={reason}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    failReason === reason
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                      : 'border-[var(--theme-border,#e8e5df)] text-[var(--theme-text,#1c1b1f)] hover:bg-neutral-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="fail_reason"
                    checked={failReason === reason}
                    onChange={() => setFailReason(reason)}
                    className="text-rose-600"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedOrderToFail(null)}
                className="px-4 py-2 rounded-xl border border-neutral-300 text-xs font-semibold hover:bg-neutral-100"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  failDelivery(selectedOrderToFail, failReason);
                  setSelectedOrderToFail(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-xs"
              >
                Xác Nhận Hủy Giao
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cross-role Dispatch Modal */}
      {dispatchModal.open && (
        <QuickDispatchNotificationModal
          isOpen={dispatchModal.open}
          onClose={() => setDispatchModal((prev) => ({ ...prev, open: false }))}
          senderRole="SHIPPER"
          targetRole={dispatchModal.targetRole}
          targetId={dispatchModal.targetId}
          targetName={dispatchModal.targetName}
          orderCode={dispatchModal.orderCode}
          orderId={dispatchModal.orderId}
        />
      )}
    </div>
  );
}
