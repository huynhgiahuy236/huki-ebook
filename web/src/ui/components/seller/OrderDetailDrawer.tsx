import React, { useEffect } from 'react';
import OrderItemBadge from '../common/OrderItemBadge';

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang chuẩn bị hàng',
  PROCESSING: 'Đang chuẩn bị hàng',
  SHIPPED: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
};

const money = (value?: number | string) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;
const dateTime = (value?: string | number | Date) => value ? new Date(value).toLocaleString('vi-VN') : '—';

export interface OrderDetailDrawerProps {
  order: any;
  loading?: boolean;
  onClose: () => void;
  onConfirm?: (orderId: string | number) => void;
  onPrepare?: (orderId: string | number) => void;
  onShip?: (order: any) => void;
  onDeliver?: (orderId: string | number) => void;
  onCancel?: (order: any) => void;
  canProcess?: boolean;
  canCancel?: boolean;
  actionLoading?: boolean;
}

export default function OrderDetailDrawer({
  order,
  loading,
  onClose,
  onConfirm,
  onPrepare,
  onShip,
  onDeliver,
  onCancel,
  canProcess,
  canCancel,
  actionLoading,
}: OrderDetailDrawerProps) {
  useEffect(() => {
    if (!order && !loading) return undefined;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [order, loading, onClose]);

  if (!order && !loading) return null;
  const address = order?.order?.shippingAddress || {};
  const recipient = address.recipientName || address.fullName || 'Chưa cập nhật';
  const addressText = address.fullAddress || [address.line1 || address.address, address.ward, address.district, address.province || address.city].filter(Boolean).join(', ') || 'Không yêu cầu giao hàng';
  const timeline = order?.timeline?.length ? order.timeline : order ? [{ toStatus: order.status, title: STATUS_LABELS[order.status], createdAt: order.createdAt }] : [];

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Chi tiết đơn hàng">
      <button type="button" aria-label="Đóng chi tiết đơn hàng" onClick={onClose} className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]" />
      <aside className="absolute inset-y-0 right-0 w-full max-w-2xl bg-white dark:bg-slate-950 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-slide-in-right">
        <header className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">Chi tiết đơn hàng</p>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">#{order?.code || order?.id || 'Đang tải'}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Đóng">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500"><span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>Đang tải chi tiết…</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            <section className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Người nhận</h3>
                <p className="font-bold text-slate-900 dark:text-white">{recipient}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{address.phone || 'Chưa cập nhật SĐT'}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{addressText}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Thanh toán</h3>
                <p className="font-bold text-slate-900 dark:text-white">{order?.order?.paymentMethod || 'COD'}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Trạng thái: {order?.order?.paymentStatus || 'PENDING'}</p>
                {order?.order?.note && <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Ghi chú: {order.order.note}</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <h3 className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 bg-slate-50 dark:bg-slate-900">Sản phẩm</h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {(order?.items || []).map((item: any) => (
                  <div key={item.id} className="p-4 flex gap-3 items-center">
                    <img src={item.coverUrl || item.coverImage || '/banners/hero-library.jpg'} alt="" className="w-11 h-14 rounded-lg object-cover bg-slate-100" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">{item.title}</p>
                        <OrderItemBadge format={item.format} />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">SL: {item.quantity} · Đơn giá: {money(item.price)}</p>
                    </div>
                    <p className="font-bold text-sm whitespace-nowrap">{money(item.subtotal ?? item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 space-y-2 text-sm">
                <div className="flex justify-between"><span>Tạm tính</span><span>{money(order?.itemSubtotal)}</span></div>
                <div className="flex justify-between"><span>Phí vận chuyển</span><span>{money(order?.shippingFee)}</span></div>
                <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-extrabold text-base"><span>Tổng cộng</span><span className="text-emerald-700">{money(order?.grandTotal)}</span></div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-4">Hành trình đơn hàng</h3>
              <ol className="space-y-0">
                {timeline.map((event: any, index: number) => (
                  <li key={event.id || `${event.toStatus}-${index}`} className="relative pl-7 pb-5 last:pb-0">
                    {index < timeline.length - 1 && <span className="absolute left-[7px] top-4 bottom-0 w-px bg-emerald-200" />}
                    <span className="absolute left-0 top-1 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{event.title || STATUS_LABELS[event.toStatus] || event.toStatus}</p>
                    {event.description && <p className="text-xs text-slate-500 mt-0.5">{event.description}</p>}
                    <time className="text-[11px] text-slate-400">{dateTime(event.createdAt)}</time>
                  </li>
                ))}
              </ol>
              {order?.cancelReason && <div className="mt-4 rounded-xl bg-rose-50 text-rose-700 p-3 text-sm"><strong>Lý do hủy:</strong> {order.cancelReason}</div>}
            </section>
          </div>
        )}

        {!loading && order && (
          <footer className="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-wrap justify-end gap-2">
            {canCancel && ['PENDING_CONFIRMATION', 'CONFIRMED', 'PREPARING'].includes(order.status) && onCancel && <button type="button" onClick={() => onCancel(order)} disabled={actionLoading} className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 font-bold text-sm hover:bg-rose-50 disabled:opacity-50 cursor-pointer">Hủy đơn hàng</button>}
            {canProcess && order.status === 'PENDING_CONFIRMATION' && onConfirm && <button type="button" onClick={() => onConfirm(order.id)} disabled={actionLoading} className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-50 cursor-pointer">Xác nhận đơn hàng</button>}
            {canProcess && order.status === 'CONFIRMED' && onPrepare && <button type="button" onClick={() => onPrepare(order.id)} disabled={actionLoading} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm disabled:opacity-50 cursor-pointer">Chuẩn bị đóng gói</button>}
            {canProcess && order.status === 'PREPARING' && onShip && <button type="button" onClick={() => onShip(order)} disabled={actionLoading} className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-sm disabled:opacity-50 cursor-pointer">Bàn giao vận chuyển</button>}
            {canProcess && order.status === 'SHIPPED' && onDeliver && <button type="button" onClick={() => onDeliver(order.id)} disabled={actionLoading} className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-sm disabled:opacity-50 cursor-pointer">Xác nhận đã giao</button>}
          </footer>
        )}
      </aside>
    </div>
  );
}
