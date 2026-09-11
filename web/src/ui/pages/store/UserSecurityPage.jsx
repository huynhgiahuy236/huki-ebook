import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function UserSecurityPage() {
  const { showToast } = useToast();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [activeSessions, setActiveSessions] = useState([
    {
      id: 1,
      device: 'MacBook Pro 14" (Chrome 124)',
      location: 'Hà Nội, Việt Nam (IP: 113.190.24.88)',
      lastActive: 'Đang hoạt động (Hiện tại)',
      isCurrent: true,
      icon: 'laptop_mac'
    },
    {
      id: 2,
      device: 'iPhone 15 Pro (HUKI Reader App v2.4)',
      location: 'Hà Nội, Việt Nam (IP: 14.162.19.12)',
      lastActive: '2 giờ trước',
      isCurrent: false,
      icon: 'smartphone'
    },
    {
      id: 3,
      device: 'Máy đọc sách Boox Palma (Android 11)',
      location: 'Hà Nội, Việt Nam (IP: 113.190.24.88)',
      lastActive: 'Hôm qua lúc 21:40',
      isCurrent: false,
      icon: 'tablet_android'
    }
  ]);

  const handleChangePassword = (e) => {
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

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Đổi mật khẩu thành công! Tài khoản đã được bảo mật.', 'success');
    }, 600);
  };

  const handleRevokeSession = (sessionId, deviceName) => {
    setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
    showToast(`Đã thu hồi quyền truy cập của ${deviceName}!`, 'info');
  };

  return (
    <div className="min-h-screen bg-theme-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-6">
          <Link to="/profile" className="hover:text-theme-primary font-medium">Tài Khoản</Link>
          <span>/</span>
          <Link to="/settings" className="hover:text-theme-primary font-medium">Cài Đặt</Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">Bảo Mật &amp; Phiên Đăng Nhập</span>
        </div>

        {/* Header Bar */}
        <div 
          style={{ background: 'linear-gradient(to right, var(--theme-hero-from, #003b2b), var(--theme-hero-via, #004D38), var(--theme-hero-to, #00271E))' }}
          className="text-white rounded-3xl p-6 sm:p-8 shadow-lg mb-8 relative overflow-hidden">
          <div className="flex items-center gap-2 text-[var(--theme-header-top-accent,#94f5d6)] text-xs font-bold uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-base">shield_person</span>
            <span>Trung Tâm An Ninh &amp; DRM</span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold mb-1">
            Bảo Mật Tài Khoản Độc Giả
          </h1>
          <p className="text-white/80 text-xs sm:text-sm font-light">
            Quản lý mật khẩu, xác thực 2 lớp (2FA) và bảo vệ bản quyền sách điện tử trên các thiết bị.
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
                    disabled={isLoading}
                    className="w-full bg-theme-primary text-white py-2.5 rounded-xl text-xs font-bold hover:bg-theme-primary-hover transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>Cập Nhật Mật Khẩu</span>
                  </button>
                </div>
              </form>
            </div>

            {/* 2FA Toggle Card */}
            <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-theme-secondary-subtle text-theme-secondary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">verified_user</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-on-surface">Xác thực 2 lớp (2FA)</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Yêu cầu mã OTP SMS/Email mỗi khi đăng nhập trên thiết bị lạ
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTwoFactorEnabled(!twoFactorEnabled);
                    showToast(
                      twoFactorEnabled ? 'Đã tắt xác thực 2 lớp' : 'Đã bật xác thực 2 lớp bảo mật!',
                      'success'
                    );
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    twoFactorEnabled ? 'bg-theme-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
                      twoFactorEnabled ? 'left-6.5' : 'left-0.5'
                    }`}
                  ></span>
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Active Sessions & DRM binding (5 cols) */}
          <div className="md:col-span-5 space-y-6">
            
            {/* Active Sessions */}
            <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 shadow-xs">
              <h4 className="font-editorial text-lg font-bold text-on-surface mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-theme-primary">devices</span>
                <span>Phiên Đăng Nhập ({activeSessions.length})</span>
              </h4>

              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <div key={session.id} className="p-3.5 rounded-2xl bg-theme-bg border border-theme-border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-theme-secondary text-xl mt-0.5">
                          {session.icon}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                            <span>{session.device}</span>
                            {session.isCurrent && (
                              <span className="text-[10px] bg-theme-secondary-subtle text-theme-primary px-2 py-0.5 rounded font-bold">
                                Thiết bị này
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-on-surface-variant mt-0.5">{session.location}</div>
                          <div className="text-xs text-theme-secondary font-semibold mt-0.5">{session.lastActive}</div>
                        </div>
                      </div>

                      {!session.isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(session.id, session.device)}
                          className="text-xs font-bold text-theme-accent hover:underline"
                        >
                          Đăng xuất
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-theme-border mt-4">
                <Link
                  to="/settings/devices"
                  className="w-full bg-theme-secondary-subtle text-theme-primary border border-theme-border py-2 rounded-xl text-xs font-bold hover:bg-theme-primary hover:text-white transition-all flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">settings_remote</span>
                  <span>Quản Lý 5 Thiết Bị DRM</span>
                </Link>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
