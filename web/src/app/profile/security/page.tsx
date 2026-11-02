"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';
import AccountLayout from '@/ui/components/layout/AccountLayout';
import { userApi, type UserProfile } from '@/ui/api/userApi';
import { sessionApi, type UserSessionItem } from '@/ui/api/sessionApi';
import { tokenStorage } from '@/ui/api/tokenStorage';

export default function UserSecurityPage() {
  const { showToast } = useToast();
  const { user, logout, changePassword } = useAuth();

  // Profile data from Backend
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);

  // Active sessions
  const [activeSessions, setActiveSessions] = useState<UserSessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Cancellation state
  const [isCancellingDeletion, setIsCancellingDeletion] = useState(false);

  // Modal Xóa Tài Khoản (GitHub Style + OTP + Policy Checkboxes)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteReason, setDeleteReason] = useState('');

  // 5 Checkboxes chính sách bắt buộc
  const [check7Days, setCheck7Days] = useState(false);
  const [checkNoOrders, setCheckNoOrders] = useState(false);
  const [checkForfeit, setCheckForfeit] = useState(false);
  const [checkQuota, setCheckQuota] = useState(false);
  const [checkDecree13, setCheckDecree13] = useState(false);

  // GitHub-style confirmation text
  const [confirmText, setConfirmText] = useState('');

  // OTP step
  const [otpCode, setOtpCode] = useState('');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Fetch Profile & Sessions
  const fetchProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      const res = await userApi.getProfile();
      if (res.success && res.data) {
        setProfile(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch user profile:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const res = await sessionApi.getSessions();
      if (res.success && res.data) {
        setActiveSessions(res.data);
      }
    } catch {
      // Giữ phiên an toàn
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchSessions();
  }, [fetchProfile, fetchSessions]);

  // Countdown timer for resending OTP
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Handle Revoke Session
  const handleRevokeSession = async (sessionId: string, deviceName?: string) => {
    try {
      const res = await sessionApi.revokeSession(sessionId);
      if (res.success) {
        setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
        showToast(`Đã thu hồi quyền truy cập của ${deviceName || 'thiết bị'}!`, 'info');
      } else {
        showToast(res.error?.message || 'Không thể thu hồi phiên đăng nhập.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi thu hồi phiên đăng nhập.', 'error');
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    try {
      const res = await sessionApi.revokeAllOtherSessions();
      if (res.success) {
        setActiveSessions((prev) => prev.filter((s) => s.isCurrent));
        showToast('Đã đăng xuất khỏi tất cả các thiết bị khác!', 'success');
      } else {
        showToast(res.error?.message || 'Không thể đăng xuất các thiết bị khác.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi đăng xuất các thiết bị.', 'error');
    }
  };

  const formatSessionTime = (dateStr?: string, isCurrent?: boolean) => {
    if (isCurrent) return 'Đang hoạt động (Hiện tại)';
    if (!dateStr) return 'Gần đây';
    try {
      const d = new Date(dateStr);
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 5) return 'Vừa mới hoạt động';
      if (diffMins < 60) return `${diffMins} phút trước`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return `Hôm qua lúc ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
      return `${d.toLocaleDateString('vi-VN')} lúc ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return 'Gần đây';
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast('Vui lòng nhập đầy đủ mật khẩu!', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Mật khẩu mới phải có tối thiểu 6 ký tự!', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp!', 'error');
      return;
    }

    setIsLoadingPassword(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showToast('Đổi mật khẩu thành công! Tài khoản đã được bảo mật.', 'success');
      } else {
        showToast(res.error?.message || 'Không thể đổi mật khẩu.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi đổi mật khẩu.', 'error');
    } finally {
      setIsLoadingPassword(false);
    }
  };

  // Remaining deletion requests
  const deletionCount = profile?.deletionCount || 0;
  const maxDeletionCount = 3;
  const remainingDeletions = Math.max(0, maxDeletionCount - deletionCount);

  // Verification text check (Hỗ trợ "xoa tai khoan" không dấu)
  const isTextConfirmed = useMemo(() => {
    const normalize = (str: string) =>
      str
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');

    const input = normalize(confirmText);
    const target = 'xoa tai khoan';
    const userEmail = normalize(user?.email || profile?.email || '');
    return input === target || (userEmail && input === userEmail);
  }, [confirmText, user?.email, profile?.email]);

  const allCheckboxesChecked = check7Days && checkNoOrders && checkForfeit && checkQuota && checkDecree13;
  const canProceedToOtp = allCheckboxesChecked && isTextConfirmed && remainingDeletions > 0;

  // Step 1: Request OTP and move to Step 2
  const handleProceedToOtp = async () => {
    if (!canProceedToOtp) return;
    setIsRequestingOtp(true);
    try {
      const res = await userApi.requestDeletionOtp();
      if (res.success) {
        showToast(res.data?.message || 'Mã xác thực OTP đã được gửi đến email của bạn!', 'success');
        setDeleteStep(2);
        setOtpCountdown(60);
      } else {
        showToast(res.error?.message || 'Không thể gửi mã OTP xác thực.', 'error');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi khi yêu cầu mã OTP.';
      showToast(msg, 'error');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    setIsRequestingOtp(true);
    try {
      const res = await userApi.requestDeletionOtp();
      if (res.success) {
        showToast('Đã gửi lại mã OTP mới đến email của bạn!', 'success');
        setOtpCountdown(60);
      } else {
        showToast(res.error?.message || 'Không thể gửi lại mã OTP.', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Lỗi gửi mã OTP.', 'error');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Step 2: Confirm Deletion (Kích hoạt 7 ngày chờ xóa)
  const handleConfirmDeletion = async () => {
    if (!otpCode.trim()) {
      showToast('Vui lòng nhập mã OTP 6 số!', 'error');
      return;
    }
    setIsConfirmingDelete(true);
    try {
      const res = await userApi.confirmDeletion({
        confirmationText: confirmText,
        otp: otpCode.trim(),
        reason: deleteReason,
      });

      if (res.success) {
        showToast('Yêu cầu xóa tài khoản đã được kích hoạt! Bạn có 7 ngày ân hạn để đổi ý.', 'success');
        setShowDeleteModal(false);
        // Reset modal form
        setDeleteStep(1);
        setConfirmText('');
        setOtpCode('');
        setCheck7Days(false);
        setCheckNoOrders(false);
        setCheckForfeit(false);
        setCheckQuota(false);
        setCheckDecree13(false);
        // Refresh profile to reflect PENDING_DELETION
        fetchProfile();
      } else {
        showToast(res.error?.message || 'Không thể xác nhận xóa tài khoản.', 'error');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi khi xác nhận xóa tài khoản.';
      showToast(msg, 'error');
    } finally {
      setIsConfirmingDelete(false);
    }
  };

  // Cancel Deletion (Hủy lệnh xóa trong 7 ngày)
  const handleCancelDeletion = async () => {
    setIsCancellingDeletion(true);
    try {
      const res = await userApi.cancelDeletion();
      if (res.success) {
        showToast('Đã hủy yêu cầu xóa tài khoản thành công! Tài khoản của bạn đã được an toàn.', 'success');
        fetchProfile();
      } else {
        showToast(res.error?.message || 'Không thể hủy yêu cầu xóa.', 'error');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Lỗi khi gửi yêu cầu hủy xóa.';
      showToast(msg, 'error');
    } finally {
      setIsCancellingDeletion(false);
    }
  };

  // Is pending deletion?
  const isPendingDeletion = profile?.status === 'PENDING_DELETION';
  const remainingDays = profile?.remainingDays ?? 7;
  const scheduledDateStr = profile?.deletionScheduledAt
    ? new Date(profile.deletionScheduledAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '7 ngày nữa';

  return (
    <AccountLayout>
      <div className="p-6 sm:p-8 space-y-6">
        
        {/* BANNER CẢNH BÁO CHỜ XÓA 7 NGÀY (NẾU ĐANG TRONG THỜI GIAN ÂN HẠN) */}
        {isPendingDeletion && (
          <div className="rounded-3xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-2 border-amber-500/30 p-5 sm:p-6 shadow-sm animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 animate-pulse">
                  <span className="material-symbols-outlined text-2xl">hourglass_top</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-extrabold uppercase tracking-wide">
                      Đang Chờ Xóa (Còn {remainingDays} ngày)
                    </span>
                    <span className="text-xs text-on-surface-variant font-medium">
                      Thời hạn cuối: <strong className="text-on-surface">{scheduledDateStr}</strong>
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-on-surface mt-1">
                    Tài khoản của bạn đang trong thời gian ân hạn 7 ngày
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed max-w-2xl">
                    Hệ thống đang bảo lưu toàn bộ dữ liệu đơn hàng, tủ sách và ví cá nhân của bạn phòng trường hợp bạn đổi ý. 
                    Bạn có thể nhấn hủy lệnh xóa bất kỳ lúc nào để khôi phục hoạt động bình thường.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCancelDeletion}
                disabled={isCancellingDeletion}
                className="w-full md:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm active:scale-98 cursor-pointer shrink-0"
              >
                {isCancellingDeletion ? (
                  <span>Đang khôi phục...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">restore</span>
                    <span>Hủy Yêu Cầu Xóa (Khôi Phục Ngay)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Header Bar */}
        <div className="border-b border-gray-100 dark:border-gray-800 pb-4">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Đổi Mật Khẩu &amp; Bảo Mật
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Left Column: Change Password & 2FA (7 cols) */}
          <div className="md:col-span-7 space-y-6">
            
            {/* Change Password Card */}
            <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs">
              <h3 className="font-editorial text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-theme-primary">lock_reset</span>
                <span>Đổi Mật Khẩu</span>
              </h3>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu cũ..."
                    className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface focus:bg-theme-surface focus:border-theme-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự..."
                    className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface focus:bg-theme-surface focus:border-theme-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới..."
                    className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface focus:bg-theme-surface focus:border-theme-primary outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoadingPassword}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-theme-primary hover:bg-theme-primary/90 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    {isLoadingPassword ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
                  </button>
                </div>
              </form>
            </div>

            {/* 2FA Card */}
            <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-editorial text-xl font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-theme-primary">verified_user</span>
                    <span>Xác Thực 2 Bước (2FA)</span>
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                    Bảo vệ tài khoản bằng việc yêu cầu mã xác thực OTP gửi qua Email mỗi khi đăng nhập trên thiết bị lạ hoặc thực hiện các tác vụ nhạy cảm (như đổi mật khẩu, xóa tài khoản).
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Đang Bật
                </span>
              </div>
            </div>

          </div>

          {/* Right Column: Active Sessions (5 cols) */}
          <div className="md:col-span-5 space-y-6">
            <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-editorial text-xl font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-theme-primary">devices</span>
                  <span>Phiên Đăng Nhập</span>
                </h3>
                {activeSessions.length > 1 && (
                  <button
                    onClick={handleRevokeAllOtherSessions}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold transition-colors cursor-pointer"
                  >
                    Đăng xuất các thiết bị khác
                  </button>
                )}
              </div>

              <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
                Danh sách các thiết bị hiện đang duy trì phiên đăng nhập vào tài khoản của bạn.
              </p>

              {isLoadingSessions ? (
                <div className="space-y-3 py-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 rounded-2xl bg-theme-bg/60 animate-pulse" />
                  ))}
                </div>
              ) : activeSessions.length === 0 ? (
                <div className="p-4 rounded-2xl bg-theme-bg/40 text-center text-xs text-on-surface-variant">
                  Chưa có thông tin phiên đăng nhập
                </div>
              ) : (
                <div className="space-y-3">
                  {activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3.5 rounded-2xl border border-theme-border bg-theme-bg/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-lg">
                            {session.deviceType === 'MOBILE' ? 'smartphone' : session.deviceType === 'TABLET' ? 'tablet' : 'laptop_mac'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-on-surface truncate">{session.deviceName || 'Thiết bị Web'}</p>
                            {session.isCurrent && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-theme-primary/15 text-theme-primary">
                                Hiện tại
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-on-surface-variant truncate">
                            {session.location || 'Việt Nam'} • {formatSessionTime(session.lastActiveAt, session.isCurrent)}
                          </p>
                        </div>
                      </div>

                      {!session.isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(session.id, session.deviceName)}
                          className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[11px] font-bold transition-all shrink-0 cursor-pointer"
                        >
                          Thu hồi
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* BOTTOM: DANGER ZONE - XÓA TÀI KHOẢN (7 NGÀY ÂN HẠN + ANTI-SPAM) */}
        <div className="pt-6 border-t border-theme-border">
          <div className="bg-rose-500/5 rounded-3xl border border-rose-500/20 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600 text-xl">warning</span>
                <h4 className="font-bold text-on-surface text-sm sm:text-base">Khu Vực Nguy Hiểm: Hủy Tài Khoản</h4>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px] font-extrabold border border-rose-500/20">
                  Còn {remainingDeletions}/3 lượt
                </span>
              </div>
              <p className="text-xs text-on-surface-variant max-w-2xl leading-relaxed">
                Khi kích hoạt, tài khoản của bạn sẽ bước vào **chế độ ân hạn 7 ngày** để bạn có thể đổi ý bất cứ lúc nào. 
                Sau 7 ngày, tài khoản sẽ được đóng hoàn toàn. Quy định tối đa 3 lần yêu cầu xóa trên mỗi tài khoản.
              </p>
            </div>

            {isPendingDeletion ? (
              <button
                type="button"
                onClick={handleCancelDeletion}
                disabled={isCancellingDeletion}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shrink-0 flex items-center gap-2 cursor-pointer shadow-xs active:scale-98"
              >
                <span className="material-symbols-outlined text-sm">restore</span>
                <span>{isCancellingDeletion ? 'Đang khôi phục...' : 'Hủy lệnh chờ xóa tài khoản'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDeleteStep(1);
                  setShowDeleteModal(true);
                }}
                disabled={remainingDeletions <= 0}
                className="px-5 py-2.5 rounded-2xl border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold text-xs transition-all shrink-0 flex items-center gap-2 cursor-pointer shadow-xs active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">person_remove</span>
                <span>Yêu cầu xóa tài khoản...</span>
              </button>
            )}
          </div>
        </div>

        {/* MODAL XÓA TÀI KHOẢN (GITHUB STYLE + 5 CHECKBOX + OTP 2FA + 7 NGÀY ÂN HẠN) */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-theme-surface p-6 sm:p-8 shadow-2xl border border-theme-border text-on-surface relative animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 mb-5 border-b border-theme-border pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">
                      {deleteStep === 1 ? 'shield_lock' : 'mark_email_read'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-editorial text-lg sm:text-xl font-bold text-on-surface">
                        {deleteStep === 1 ? 'Chính Sách & Xác Nhận Xóa' : 'Xác Thực OTP Bảo Mật'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-theme-bg border border-theme-border text-on-surface-variant">
                        Bước {deleteStep}/2
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Tài khoản: <strong className="text-on-surface">{user?.email || profile?.email || 'N/A'}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isRequestingOtp || isConfirmingDelete}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-theme-bg hover:text-on-surface transition-colors cursor-pointer"
                  title="Đóng"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* BƯỚC 1: CHÍNH SÁCH + 5 CHECKBOX CAM KẾT + GÕ CHỮ KIỂU GITHUB */}
              {deleteStep === 1 && (
                <div className="space-y-4">
                  {/* Quota alert badge */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">info</span>
                    <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                      <p className="font-bold">Cơ chế ân hạn 7 ngày &amp; Hạn mức yêu cầu:</p>
                      <p className="mt-0.5">
                        Tài khoản sẽ được giữ trong <strong>7 ngày</strong> để bạn có thể đổi ý và hủy xóa bất cứ lúc nào. 
                        Bạn hiện còn <strong>{remainingDeletions}/3 lượt</strong> yêu cầu xóa tài khoản.
                      </p>
                    </div>
                  </div>

                  {/* 5 Checkboxes chính sách bắt buộc */}
                  <div className="space-y-2.5 pt-1">
                    <p className="text-xs font-bold text-on-surface uppercase tracking-wider text-[11px]">
                      Vui lòng đọc và xác nhận các điều khoản bên dưới:
                    </p>

                    <label className="flex items-start gap-3 p-2.5 rounded-xl bg-theme-bg/60 border border-theme-border cursor-pointer select-none group hover:border-theme-primary/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={check7Days}
                        onChange={(e) => setCheck7Days(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                      />
                      <span className="text-xs text-on-surface-variant group-hover:text-on-surface leading-relaxed font-medium">
                        Tôi hiểu rằng tôi có <strong>7 ngày ân hạn</strong> để đổi ý và hủy lệnh xóa. Sau 7 ngày, tài khoản sẽ bị đóng hoàn toàn.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 p-2.5 rounded-xl bg-theme-bg/60 border border-theme-border cursor-pointer select-none group hover:border-theme-primary/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={checkNoOrders}
                        onChange={(e) => setCheckNoOrders(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                      />
                      <span className="text-xs text-on-surface-variant group-hover:text-on-surface leading-relaxed font-medium">
                        Tôi xác nhận <strong>không có đơn hàng nào</strong> đang trong quá trình đóng gói, vận chuyển, khiếu nại hoặc tranh chấp hoàn tiền.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 p-2.5 rounded-xl bg-theme-bg/60 border border-theme-border cursor-pointer select-none group hover:border-theme-primary/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={checkForfeit}
                        onChange={(e) => setCheckForfeit(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                      />
                      <span className="text-xs text-on-surface-variant group-hover:text-on-surface leading-relaxed font-medium">
                        Tôi hiểu rằng mọi quyền lợi thành viên, điểm thưởng, voucher và quyền truy cập vào các tựa sách điện tử đã mua sẽ bị vô hiệu hóa.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 p-2.5 rounded-xl bg-theme-bg/60 border border-theme-border cursor-pointer select-none group hover:border-theme-primary/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={checkQuota}
                        onChange={(e) => setCheckQuota(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                      />
                      <span className="text-xs text-on-surface-variant group-hover:text-on-surface leading-relaxed font-medium">
                        Tôi hiểu quy định <strong>tối đa 3 lần yêu cầu xóa</strong> trên mỗi tài khoản nhằm phòng tránh hành vi gian lận và trục lợi khuyến mãi.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 p-2.5 rounded-xl bg-theme-bg/60 border border-theme-border cursor-pointer select-none group hover:border-theme-primary/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={checkDecree13}
                        onChange={(e) => setCheckDecree13(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                      />
                      <span className="text-xs text-on-surface-variant group-hover:text-on-surface leading-relaxed font-medium">
                        Tôi đồng ý với chính sách xử lý dữ liệu cá nhân theo <strong>Nghị định 13/2023/NĐ-CP</strong> của sàn thương mại điện tử HuKi.
                      </span>
                    </label>
                  </div>

                  {/* Lý do rời đi (tùy chọn) */}
                  <div className="space-y-1 pt-1">
                    <label className="block text-xs font-bold text-on-surface">Lý do rời đi (tùy chọn):</label>
                    <select
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      className="w-full bg-theme-bg border border-theme-border rounded-xl px-3 py-2 text-xs text-on-surface outline-none"
                    >
                      <option value="">Chọn lý do nếu muốn chia sẻ...</option>
                      <option value="rarely_used">Tôi ít khi có nhu cầu sử dụng dịch vụ</option>
                      <option value="privacy">Tôi muốn bảo mật quyền riêng tư cá nhân</option>
                      <option value="alternate">Tôi đã có một tài khoản HuKi khác</option>
                      <option value="experience">Trải nghiệm chưa phù hợp kỳ vọng</option>
                      <option value="other">Lý do khác</option>
                    </select>
                  </div>

                  {/* GitHub-Style Text Confirmation */}
                  <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                    <label className="block text-xs font-bold text-on-surface">
                      Để xác nhận, vui lòng gõ chính xác cụm từ <code className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono text-[11px]">xóa tài khoản</code> hoặc email của bạn vào ô bên dưới:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder='Gõ "xoa tai khoan" vào đây...'
                        className="w-full bg-theme-bg border border-theme-border rounded-xl px-3.5 py-2.5 text-xs text-on-surface font-mono outline-none focus:border-rose-500 transition-colors"
                      />
                      {isTextConfirmed && (
                        <span className="absolute right-3 top-2.5 text-emerald-600 flex items-center gap-1 text-[11px] font-bold">
                          <span className="material-symbols-outlined text-base">check_circle</span>
                          <span>Đã khớp</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-3 border-t border-theme-border">
                    <button
                      type="button"
                      onClick={() => setShowDeleteModal(false)}
                      disabled={isRequestingOtp}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-theme-border bg-theme-bg hover:bg-theme-surface text-on-surface font-bold text-xs transition-colors cursor-pointer"
                    >
                      Giữ lại tài khoản
                    </button>
                    <button
                      type="button"
                      onClick={handleProceedToOtp}
                      disabled={!canProceedToOtp || isRequestingOtp}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs active:scale-98"
                    >
                      {isRequestingOtp ? (
                        <span>Đang gửi OTP...</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">forward_to_inbox</span>
                          <span>Tiếp Tục Xác Thực OTP</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* BƯỚC 2: NHẬP MÃ OTP 6 CHỮ SỐ GỬI VỀ EMAIL */}
              {deleteStep === 2 && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                    <span className="material-symbols-outlined text-blue-600 text-xl shrink-0 mt-0.5">mail</span>
                    <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                      <p className="font-bold">Mã xác thực 6 chữ số đã được gửi!</p>
                      <p className="mt-0.5">
                        Vui lòng kiểm tra hộp thư của email <strong>{user?.email || profile?.email}</strong> (kể cả mục Thư rác/Spam) và nhập mã OTP để kích hoạt chế độ 7 ngày chờ xóa.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-on-surface">Nhập mã OTP (6 chữ số):</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      autoFocus
                      className="w-full bg-theme-bg border-2 border-theme-border focus:border-rose-500 rounded-2xl px-4 py-3 text-center text-xl sm:text-2xl font-mono tracking-widest text-on-surface outline-none transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-on-surface-variant">
                    <span>Không nhận được mã?</span>
                    {otpCountdown > 0 ? (
                      <span className="text-on-surface font-semibold text-[11px]">
                        Gửi lại mã sau <strong>{otpCountdown}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isRequestingOtp}
                        className="text-theme-primary hover:underline font-bold cursor-pointer"
                      >
                        Gửi lại mã OTP mới
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-theme-border">
                    <button
                      type="button"
                      onClick={() => setDeleteStep(1)}
                      disabled={isConfirmingDelete}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-theme-border text-on-surface font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                      <span>Quay lại</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmDeletion}
                      disabled={otpCode.length < 6 || isConfirmingDelete}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs active:scale-98"
                    >
                      {isConfirmingDelete ? (
                        <span>Đang xác thực...</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          <span>Xác Nhận Kích Hoạt 7 Ngày Chờ Xóa</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </AccountLayout>
  );
}
