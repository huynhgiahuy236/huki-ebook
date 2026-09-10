import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function DeviceManagementPage() {
  const { showToast } = useToast();

  const [devices, setDevices] = useState([
    {
      id: 'dev-1',
      name: 'Apple MacBook Pro M3 (Chrome Browser 128)',
      type: 'laptop',
      icon: 'laptop_mac',
      isCurrent: true,
      ip: '14.232.88.192 (TP. Hồ Chí Minh)',
      lastActive: '5 phút trước',
      syncedBooks: 14,
      status: 'Đang trực tuyến'
    },
    {
      id: 'dev-2',
      name: 'Máy Đọc Sách Boox Palma (Android 11 E-ink Edition)',
      type: 'e-reader',
      icon: 'auto_stories',
      isCurrent: false,
      ip: '113.161.72.45 (TP. Hồ Chí Minh)',
      lastActive: 'Hôm qua lúc 22:15',
      syncedBooks: 18,
      status: 'Đã đồng bộ ngoại tuyến'
    },
    {
      id: 'dev-3',
      name: 'iPhone 15 Pro Max (iOS 18.1 Huki App)',
      type: 'mobile',
      icon: 'phone_iphone',
      isCurrent: false,
      ip: '14.232.88.192 (TP. Hồ Chí Minh)',
      lastActive: '05/09/2026 lúc 18:30',
      syncedBooks: 8,
      status: 'Đã đồng bộ'
    }
  ]);

  const [revokeTarget, setRevokeTarget] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const handleRevoke = () => {
    if (!revokeTarget) return;
    setDevices(prev => prev.filter(d => d.id !== revokeTarget.id));
    showToast(`Đã thu hồi bản quyền DRM và đăng xuất khỏi thiết bị: ${revokeTarget.name}`, 'success');
    setRevokeTarget(null);
  };

  const activeCount = devices.length;
  const maxDevices = 5;
  const progressPercent = (activeCount / maxDevices) * 100;

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 font-body-md">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-body-sm text-on-surface-variant mb-6 flex-wrap">
        <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link to="/profile" className="hover:text-primary transition-colors">Cài Đặt Tài Khoản</Link>
        <span>/</span>
        <span className="text-theme-primary font-semibold">Bảo Mật & Quản Lý Thiết Bị Đọc DRM</span>
      </nav>

      {/* DRM CORE 2026 Hero Status & Device Quota Banner */}
      <div
        className="rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden border border-white/15"
        style={{ background: 'linear-gradient(to right, var(--theme-hero-from, #003B2B), var(--theme-hero-via, #004D38), var(--theme-hero-to, #00271E))' }}
      >
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/15 text-[var(--theme-header-top-accent,#94F5D6)] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            HUKI DRM CORE 2026 — ACTIVE
          </div>
          <span className="material-symbols-outlined text-4xl text-[var(--theme-header-top-accent,#94F5D6)] opacity-80">security</span>
        </div>

        <h1 className="font-editorial text-2xl sm:text-3xl font-bold leading-tight mb-3 relative z-10 text-white">
          Bảo Vệ Bản Quyền Tác Giả & Quản Lý Thiết Bị Ngoại Tuyến
        </h1>
        <p className="text-xs sm:text-sm text-white/80 max-w-3xl mb-6 relative z-10 leading-relaxed">
          Tài khoản của bạn được cấp phép tải sách đọc offline trên tối đa 5 thiết bị cá nhân (Điện thoại, Máy đọc sách E-ink, Tablet, Máy tính). Bạn có toàn quyền thu hồi bản quyền từ xa khi đổi máy mới.
        </p>

        {/* Quota Progress Bar */}
        <div className="bg-white/10 rounded-2xl p-5 border border-white/15 backdrop-blur-xs relative z-10">
          <div className="flex items-center justify-between text-xs font-bold text-white mb-2.5">
            <span>Thiết bị đang kích hoạt: <strong className="text-[var(--theme-header-top-accent,#94F5D6)] text-sm ml-1">{activeCount} / {maxDevices} Slot</strong></span>
            <span className="text-white/70 font-normal">Còn trống {maxDevices - activeCount} vị trí khả dụng</span>
          </div>
          <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--theme-header-top-accent,#94F5D6)] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Active Registered Devices List */}
      <div className="mb-10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div>
            <h2 className="font-editorial text-2xl font-bold text-on-surface">
              Danh Sách Thiết Bị Đang Kích Hoạt DRM ({activeCount})
            </h2>
            <p className="text-xs text-on-surface-variant">Được phép tải sách mã hóa và đọc ngoại tuyến không cần Internet.</p>
          </div>
          <button
            onClick={() => showToast('Đã làm mới trạng thái đồng bộ tất cả thiết bị!', 'success')}
            className="self-start sm:self-auto bg-theme-secondary-subtle hover:bg-theme-border text-on-surface px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Làm Mới Đồng Bộ
          </button>
        </div>

        {/* Active Cards */}
        {devices.map(device => (
          <div
            key={device.id}
            className={`p-6 rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${
              device.isCurrent
                ? 'bg-theme-secondary-subtle/50 border-2 border-theme-secondary'
                : 'bg-theme-surface border border-theme-border hover:border-slate-300'
            }`}
          >
            <div className="flex items-start md:items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                device.isCurrent ? 'bg-theme-secondary text-white' : 'bg-theme-primary text-[var(--theme-header-top-accent,#94F5D6)]'
              }`}>
                <span className="material-symbols-outlined text-2xl">{device.icon}</span>
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-on-surface">{device.name}</h3>
                  {device.isCurrent && (
                    <span className="bg-theme-secondary text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      THIẾT BỊ NÀY — ĐANG TRỰC TUYẾN
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant">
                  IP: {device.ip} · Đăng nhập lần cuối: {device.lastActive} · Đã tải <strong>{device.syncedBooks} cuốn Ebook DRM</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto">
              {device.isCurrent ? (
                <span className="text-xs font-bold text-theme-secondary bg-theme-secondary-subtle px-3 py-1.5 rounded-xl flex items-center gap-1 border border-theme-border">
                  <span className="material-symbols-outlined text-[16px]">verified</span> Bản quyền số hợp lệ
                </span>
              ) : (
                <button
                  onClick={() => setRevokeTarget(device)}
                  className="border border-[#ac2c19]/30 text-[#ac2c19] hover:bg-[#ac2c19] hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">devices_off</span>
                  Thu Hồi Bản Quyền & Đăng Xuất
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Empty Slots */}
        {Array.from({ length: maxDevices - activeCount }).map((_, index) => (
          <div
            key={index}
            className="border-2 border-dashed border-theme-border rounded-3xl p-5 bg-theme-secondary-subtle/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-slate-400">add_to_queue</span>
              <span className="text-xs font-medium text-on-surface-variant">
                Vị trí kích hoạt trống (Slot {activeCount + index + 1}/{maxDevices}) — Đăng nhập trên máy tính bảng hoặc máy đọc sách E-ink mới để tự động liên kết.
              </span>
            </div>
            <button
              onClick={() => setShowQRModal(true)}
              className="bg-theme-surface border border-theme-border text-on-surface px-4 py-2 rounded-xl text-xs font-bold hover:bg-theme-bg transition-colors flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
              Quét Mã QR Đăng Nhập
            </button>
          </div>
        ))}
      </div>

      {/* DRM 2026 Policy & Encryption FAQ */}
      <section className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-sm">
        <h3 className="font-editorial text-xl font-bold text-on-surface mb-4">
          Quy Chuẩn Bảo Mật DRM Core 2026
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
          <div className="space-y-2 p-4 bg-theme-secondary-subtle rounded-2xl border border-theme-border/50">
            <span className="material-symbols-outlined text-2xl text-theme-secondary">lock</span>
            <h4 className="font-bold text-on-surface">Mã Hóa AES-256 GCM</h4>
            <p className="text-xs">Tất cả tệp Ebook tải về máy đều được mã hóa bằng khóa riêng biệt gắn với phần cứng thiết bị của bạn.</p>
          </div>
          <div className="space-y-2 p-4 bg-theme-secondary-subtle rounded-2xl border border-theme-border/50">
            <span className="material-symbols-outlined text-2xl text-theme-secondary">cloud_off</span>
            <h4 className="font-bold text-on-surface">Đọc Offline 30 Ngày</h4>
            <p className="text-xs">Bạn có thể mang thiết bị đi máy bay hoặc vùng không có mạng để đọc sách liên tục trong vòng 30 ngày.</p>
          </div>
          <div className="space-y-2 p-4 bg-theme-secondary-subtle rounded-2xl border border-theme-border/50">
            <span className="material-symbols-outlined text-2xl text-theme-secondary">sync</span>
            <h4 className="font-bold text-on-surface">Đồng Bộ Ghi Chú & Dấu Trang</h4>
            <p className="text-xs">Tiến độ đọc, highlights và trích dẫn được đồng bộ tự động ngay khi thiết bị kết nối lại Wi-Fi.</p>
          </div>
        </div>
      </section>

      {/* Revoke Confirmation Modal */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-theme-surface rounded-3xl max-w-md w-full p-6 sm:p-8 text-center space-y-4 shadow-2xl border border-theme-border">
            <div className="w-14 h-14 rounded-full bg-red-100 text-[#ac2c19] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">devices_off</span>
            </div>
            <h3 className="font-editorial text-xl font-bold text-on-surface">Xác Nhận Thu Hồi Bản Quyền?</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Bạn có chắc chắn muốn hủy kích hoạt và đăng xuất khỏi <strong>"{revokeTarget.name}"</strong>? Mọi sách DRM đã tải trên thiết bị này sẽ bị khóa mã hóa ngoại tuyến ngay lập tức.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setRevokeTarget(null)}
                className="flex-1 py-2.5 border border-theme-border rounded-xl text-xs font-semibold text-on-surface hover:bg-theme-bg transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleRevoke}
                className="flex-1 py-2.5 bg-[#ac2c19] hover:bg-[#8e1404] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Thu Hồi Thiết Bị
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Login Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-theme-surface rounded-3xl max-w-sm w-full p-6 sm:p-8 text-center space-y-4 shadow-2xl border border-theme-border">
            <div className="flex items-center justify-between pb-2 border-b border-theme-border">
              <h3 className="font-bold text-sm text-on-surface">Đăng Nhập Bằng Mã QR</h3>
              <button onClick={() => setShowQRModal(false)} className="p-1 hover:bg-theme-bg rounded-lg cursor-pointer">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="w-48 h-48 mx-auto bg-theme-secondary-subtle rounded-2xl p-4 flex items-center justify-center border border-theme-border">
              <span className="material-symbols-outlined text-8xl text-theme-primary">qr_code_2</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Mở ứng dụng HukiReader trên máy đọc sách hoặc tablet của bạn, chọn <strong>"Quét Mã Đăng Nhập"</strong> để kích hoạt tức thì.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
