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
          deletionCount: (res.data as any)?.deletionCount ?? ((user as any).deletionCount || 1),
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
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800 animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pending-deletion-title"
      >
        {/* Header Banner - Clean White with subtle Amber accent */}
        <div className="bg-white p-5 sm:p-6 border-b border-slate-100 flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 shadow-2xs">
            <span className="material-symbols-outlined text-[24px] text-amber-600">
              hourglass_top
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full font-mono tracking-wider">
                Ân hạn {displayDays} ngày
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Nghị định 13/2023/NĐ-CP
              </span>
            </div>
            <h3
              id="pending-deletion-title"
              className="text-base sm:text-lg font-bold text-slate-900 leading-snug tracking-tight font-editorial"
            >
              Tài Khoản Đang Chờ Xóa Vĩnh Viễn
            </h3>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 text-xs leading-relaxed text-slate-600">
          <p>
            Xin chào <strong className="text-slate-900 font-semibold">{user.fullName || user.email}</strong>, tài khoản của bạn trước đó đã gửi yêu cầu xóa vĩnh viễn khỏi hệ sinh thái HuKi Ebook.
          </p>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-slate-800 font-semibold text-xs">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="material-symbols-outlined text-sm text-amber-600">history_toggle_off</span>
                Thời gian ân hạn còn lại:
              </span>
              <span className="font-mono text-xs font-bold bg-amber-100/80 text-amber-800 px-2.5 py-0.5 rounded-lg border border-amber-200">
                {displayDays} ngày
              </span>
            </div>
            {formattedScheduledDate && (
              <p className="text-[11px] text-slate-500">
                Thời điểm thanh lọc dự kiến: <span className="font-mono text-slate-800 font-semibold">{formattedScheduledDate}</span>
              </p>
            )}
            <p className="text-[11.5px] text-slate-600 border-t border-slate-200/60 pt-2 mt-1">
              Trong thời gian này, dữ liệu đơn hàng, tủ sách số và thông tin cá nhân của bạn vẫn được lưu giữ an toàn. Bạn có thể chọn tiếp tục sử dụng để kích hoạt lại tài khoản ngay lập tức.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-base shrink-0 text-rose-500">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-400 italic">
            * Nếu bạn chọn tiếp tục xóa, hệ thống sẽ tự động đăng xuất và duy trì lịch hẹn thanh lọc như dự kiến.
          </p>
        </div>

        {/* Actions Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isRestoring}
            onClick={handleContinueDeletion}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-500">logout</span>
            <span>Tiếp tục xóa (Đăng xuất)</span>
          </button>

          <button
            type="button"
            disabled={isRestoring}
            onClick={handleRestoreAccount}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#003B2B] hover:bg-[#00281d] text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isRestoring ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang khôi phục...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>Khôi phục tài khoản &amp; Sử dụng</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

