'use client';

import React, { useState, useId } from 'react';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { playNotificationChime } from '@/ui/utils/soundEffects';

export type DispatchSenderRole = 'SELLER' | 'SHIPPER' | 'USER' | 'ADMIN';
export type DispatchTargetRole = 'SELLER' | 'SHIPPER' | 'USER' | 'ADMIN';

export interface QuickDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderRole: DispatchSenderRole;
  targetRole: DispatchTargetRole;
  targetId: string;
  targetName: string;
  orderCode?: string;
  orderId?: string;
  onSuccess?: (dispatched: any) => void;
}

interface PresetOption {
  title: string;
  message: string;
  priority: 'NORMAL' | 'HIGH';
}

function getPresetTemplates(sender: DispatchSenderRole, target: DispatchTargetRole, orderCode?: string): PresetOption[] {
  const code = orderCode ? `#${orderCode}` : '';

  if (sender === 'SELLER' && target === 'SHIPPER') {
    return [
      {
        title: `📦 Lưu ý kiện hàng ${code}: Sách quý / Bìa cứng`,
        message: `Đơn ${code} có chứa sách bìa cứng/sách quý dễ cấn móp góc. Nhờ bưu tá xếp cẩn thận và che chắn mưa nắng giúp gian hàng nhé!`,
        priority: 'HIGH',
      },
      {
        title: `⏱️ Hẹn giờ giao đơn ${code}: Trước 17:00 chiều`,
        message: `Khách hàng ghi chú nhận sách tại văn phòng cơ quan, vui lòng ưu tiên phát trước 17:00 chiều nay. Cảm ơn bưu tá!`,
        priority: 'HIGH',
      },
      {
        title: `📞 Nhờ gọi trước khi phát đơn ${code}`,
        message: `Khách hàng thường xuyên đi công tác, nhờ bưu tá liên hệ trước 15-20 phút khi tới địa chỉ phát hàng.`,
        priority: 'NORMAL',
      },
    ];
  }

  if (sender === 'SELLER' && target === 'USER') {
    return [
      {
        title: `✨ Đơn hàng ${code} đã được shop kiểm tra & đóng gói kỹ`,
        message: `Sách của bạn đã được bọc xốp bóng khí 2 lớp kèm thẻ đánh dấu trang (bookmark) độc quyền từ shop. Sắp tới tay bạn nhé!`,
        priority: 'NORMAL',
      },
      {
        title: `🚚 Bàn giao đơn ${code} cho đơn vị vận chuyển`,
        message: `Đơn hàng ${code} vừa được trao cho bưu tá giao vận. Bạn có thể theo dõi hành trình di chuyển trực tiếp trên ứng dụng.`,
        priority: 'NORMAL',
      },
      {
        title: `📹 Lưu ý đồng kiểm khi nhận bưu phẩm ${code}`,
        message: `Để bảo vệ quyền lợi tối đa, bạn vui lòng quay video ngắn khi khui mở kiện sách để được hỗ trợ 100% nếu có cấn móp phát sinh trong lúc vận chuyển nhé!`,
        priority: 'HIGH',
      },
    ];
  }

  if (sender === 'SHIPPER' && target === 'USER') {
    return [
      {
        title: `🛵 Shipper đang trên đường tới giao đơn ${code}`,
        message: `Bưu tá đang di chuyển tới địa chỉ nhận của bạn và sẽ có mặt sau khoảng 10 - 15 phút nữa. Quý khách chú ý chuông điện thoại nhé!`,
        priority: 'HIGH',
      },
      {
        title: `📞 Chưa liên lạc được khi giao đơn ${code}`,
        message: `Bưu tá đã có mặt tại điểm giao nhưng gọi chưa thấy quý khách nghe máy. Shipper sẽ liên hệ lại hoặc bạn có thể gọi lại cho shipper nhé!`,
        priority: 'HIGH',
      },
      {
        title: `📦 Đã gửi bưu phẩm ${code} tại quầy Lễ tân / Bảo vệ`,
        message: `Bưu tá đã gửi kiện hàng tại khu vực lễ tân/bảo vệ tòa nhà theo trao đổi với bạn. Quý khách nhớ ghé lấy nhé!`,
        priority: 'NORMAL',
      },
    ];
  }

  if (sender === 'SHIPPER' && target === 'SELLER') {
    return [
      {
        title: `📅 Khách hẹn lùi lịch nhận đơn ${code}`,
        message: `Khách hàng bận việc đột xuất nên hẹn dời thời gian giao hàng sang ca sáng mai. Bưu tá sẽ tiếp tục lưu kho phát lại.`,
        priority: 'NORMAL',
      },
      {
        title: `❓ Cần xác nhận lại số điện thoại / địa chỉ đơn ${code}`,
        message: `Số nhà hoặc số điện thoại người nhận có sự sai lệch nhỏ khiến bưu tá chưa tìm thấy. Nhờ Shop nhắn tin xác nhận lại với khách giúp nhé!`,
        priority: 'HIGH',
      },
      {
        title: `↩️ Khách từ chối nhận kiện hàng ${code}`,
        message: `Người mua từ chối nhận bưu kiện ${code}. Bưu tá ghi nhận biên bản sự cố và chuẩn bị tiến trình hoàn hàng về cho Shop.`,
        priority: 'HIGH',
      },
    ];
  }

  if (sender === 'USER' && target === 'SELLER') {
    return [
      {
        title: `🎁 Dặn dò đóng gói đơn ${code}: Sách làm quà tặng`,
        message: `Shop đóng gói cẩn thận chống gãy mép bìa giúp mình nhé, mình mua làm quà tặng sinh nhật bạn!`,
        priority: 'NORMAL',
      },
      {
        title: `⚡ Cần sách sớm trước cuối tuần cho đơn ${code}`,
        message: `Mình đang cần đọc sách này gấp cho bài luận cuối kỳ, mong Shop xác nhận và xuất kho sớm giúp mình nhé! Cảm ơn Shop.`,
        priority: 'HIGH',
      },
      {
        title: `📝 Xuất hóa đơn / Thiệp chúc cho đơn ${code}`,
        message: `Shop gửi kèm phiếu giao hàng có kê chi tiết tên sách hoặc thiệp chúc nhỏ giúp mình nhé. Cảm ơn Shop nhiều!`,
        priority: 'NORMAL',
      },
    ];
  }

  // Default fallback
  return [
    {
      title: `💬 Tin nhắn nhanh liên quan đơn ${code}`,
      message: `Xin chào, mình gửi thông báo liên quan đến đơn hàng ${code}. Vui lòng kiểm tra và hỗ trợ nhé!`,
      priority: 'NORMAL',
    },
  ];
}

export default function QuickDispatchNotificationModal({
  isOpen,
  onClose,
  senderRole,
  targetRole,
  targetId,
  targetName,
  orderCode,
  orderId,
  onSuccess,
}: QuickDispatchModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const titleId = useId();

  const presets = getPresetTemplates(senderRole, targetRole, orderCode);

  const [title, setTitle] = useState(presets[0]?.title || '');
  const [message, setMessage] = useState(presets[0]?.message || '');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH'>(presets[0]?.priority || 'NORMAL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleApplyPreset = (p: PresetOption) => {
    setTitle(p.title);
    setMessage(p.message);
    setPriority(p.priority);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast({ type: 'error', message: 'Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Resolve authorization token
      let token = '';
      if (typeof window !== 'undefined') {
        token =
          localStorage.getItem('token') ||
          localStorage.getItem('accessToken') ||
          localStorage.getItem('huki_auth_token') ||
          '';
      }

      const recipientTypeMap: Record<DispatchTargetRole, string> = {
        SELLER: 'BUSINESS',
        SHIPPER: 'DELIVERY',
        USER: 'USER',
        ADMIN: 'ADMIN',
      };

      const payload = {
        recipientId: targetId,
        recipientType: recipientTypeMap[targetRole] || 'USER',
        title: title.trim(),
        message: message.trim(),
        priority,
        category: 'MANUAL_DIRECT',
        type: 'ORDER_MESSAGE',
        actionUrl: orderId ? (senderRole === 'SELLER' ? `/seller/orders` : `/orders/${orderId}`) : '',
        payload: {
          orderCode,
          orderId,
          senderRole,
          targetRole,
        },
      };

      const res = await fetch('/api/v1/notifications/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi máy chủ (${res.status})`);
      }

      const result = await res.json();
      playNotificationChime(priority);
      showToast({
        type: 'success',
        message: `Đã gửi thông báo thành công tới ${targetName}!`,
      });

      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err: any) {
      console.error('Failed to dispatch notification:', err);
      showToast({
        type: 'error',
        message: err.message || 'Không thể gửi thông báo. Vui lòng thử lại!',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTargetBadgeColor = () => {
    switch (targetRole) {
      case 'SHIPPER':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case 'SELLER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
      case 'USER':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">send_time_extension</span>
            </span>
            <div>
              <h2 id={titleId} className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                Gửi Thông Báo Tương Tác
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getTargetBadgeColor()}`}>
                  Tới: {targetName}
                </span>
                {orderCode && (
                  <span className="text-[11px] font-semibold text-neutral-500">
                    Đơn #{orderCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
              ⚡ Gợi ý mẫu dặn dò nhanh (1 chạm):
            </label>
            <div className="flex flex-col gap-1.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="text-left p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all text-xs group cursor-pointer"
                >
                  <div className="flex items-center justify-between font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-primary">
                    <span className="line-clamp-1">{p.title}</span>
                    {p.priority === 'HIGH' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 shrink-0 font-bold ml-1">
                        GẤP
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                    {p.message}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Tiêu đề thông báo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="VD: Lưu ý kiện hàng sách quý..."
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Message Content */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Nội dung chi tiết <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              placeholder="Nhập nội dung cần nhắn gửi..."
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Priority Choice */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Mức độ ưu tiên
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPriority('NORMAL')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  priority === 'NORMAL'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">notifications</span>
                <span>Thông Thường</span>
              </button>

              <button
                type="button"
                onClick={() => setPriority('HIGH')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  priority === 'HIGH'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 ring-2 ring-amber-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-amber-500">priority_high</span>
                <span>Quan Trọng / Gấp</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Bắn Thông Báo Ngay</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
