"use client";

import React, { useState } from 'react';
import { useAuth } from '@/ui/context/AuthContext';
import { userApi } from '@/ui/api/userApi';
import { tokenStorage } from '@/ui/api/tokenStorage';

export default function AccountPendingDeletionModal() {
  const { user, setUser, logout } = useAuth();
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Chỉ hiển thị khi user đã đăng nhập và đang ở trạng thái PENDING_DELETION
  const isPendingDeletion = Boolean(
    user?.status === 'PENDING_DELETION' ||
    (user as any)?.isPendingDeletion === true
  );

  if (!isPendingDeletion || !user) {
    return null;
  }

  // Tính số ngày còn lại
  let remainingDays = (user as any).remainingDays;
  const scheduledAt = user.deletionScheduledAt || (user as any).deletion_scheduled_at;
  if ((remainingDays === undefined || remainingDays === null) && scheduledAt) {
    const diff = new Date(scheduledAt).getTime() - Date.now();
    remainingDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
  const displayDays = typeof remainingDays === 'number' && !isNaN(remainingDays) ? remainingDays : 7;

  const formattedScheduledDate = scheduledAt
    ? new Date(scheduledAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const handleRestoreAccount = async () => {
    try {
      setIsRestoring(true);
      setErrorMessage(null);
      const res = await userApi.cancelDeletion();
      if (res.success) {
        // Cập nhật trạng thái người dùng trong AuthContext & tokenStorage về ACTIVE
        const updatedUser = {
          ...user,
          status: 'ACTIVE',
          isPendingDeletion: false,
          deletionScheduledAt: null,
          remainingDays: null,
        };
        setUser(updatedUser);
        tokenStorage.setUserSession(updatedUser);
      } else {
        setErrorMessage(res.error?.message || 'Không thể khôi phục tài khoản. Vui lòng thử lại sau.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Đã xảy ra lỗi khi kết nối máy chủ.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleContinueDeletion = async () => {
    // Đăng xuất và giữ nguyên trạng thái chờ xóa của tài khoản
    await logout();
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in font-sans">
      <div
        className="w-full max-w-lg bg-[#031510] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pending-deletion-title"
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-slate-900/60 p-6 border-b border-amber-500/20 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-[28px] text-amber-400 animate-pulse">
              history_toggle_off
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider font-mono">
                Ân hạn {displayDays} ngày
              </span>
              <span className="text-[11px] text-amber-400 font-medium">
                Nghị định 13/2023/NĐ-CP
              </span>
            </div>
            <h3
              id="pending-deletion-title"
              className="text-lg font-bold text-white leading-snug tracking-tight font-editorial"
            >
              Tài Khoản Đang Chờ Xóa Vĩnh Viễn
            </h3>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs leading-relaxed text-emerald-100/80">
          <p>
            Xin chào <strong className="text-white font-semibold">{user.fullName || user.email}</strong>, tài khoản của bạn trước đó đã gửi yêu cầu xóa vĩnh viễn khỏi hệ sinh thái HuKi Ebook.
          </p>

          <div className="p-4 rounded-2xl bg-[#00261C] border border-amber-500/25 space-y-2">
            <div className="flex items-center justify-between text-amber-300 font-semibold text-xs">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">hourglass_top</span>
                Thời gian ân hạn còn lại:
              </span>
              <span className="font-mono text-sm font-bold bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                {displayDays} ngày
              </span>
            </div>
            {formattedScheduledDate && (
              <p className="text-[11px] text-emerald-200/60">
                Thời điểm thanh lọc dự kiến: <span className="font-mono text-emerald-300 font-medium">{formattedScheduledDate}</span>
              </p>
            )}
            <p className="text-[11px] text-emerald-200/70 border-t border-emerald-800/40 pt-2 mt-2">
              Trong thời gian này, dữ liệu đơn hàng, tủ sách số và thông tin cá nhân của bạn vẫn được lưu giữ an toàn. Bạn có thể chọn tiếp tục sử dụng để kích hoạt lại tài khoản ngay lập tức.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="text-[11px] text-white/50 italic">
            * Nếu bạn chọn tiếp tục xóa, hệ thống sẽ tự động đăng xuất và duy trì lịch hẹn thanh lọc như dự kiến.
          </p>
        </div>

        {/* Actions Footer */}
        <div className="p-6 bg-black/30 border-t border-emerald-900/40 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            disabled={isRestoring}
            onClick={handleContinueDeletion}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/20 text-white/70 hover:text-white hover:bg-white/10 text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            <span>Tiếp tục xóa (Đăng xuất)</span>
          </button>

          <button
            type="button"
            disabled={isRestoring}
            onClick={handleRestoreAccount}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isRestoring ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang khôi phục...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">verified</span>
                <span>Khôi phục tài khoản & Sử dụng</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

