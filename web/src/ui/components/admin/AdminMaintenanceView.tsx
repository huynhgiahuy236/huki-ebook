"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { maintenanceService, SystemMaintenanceConfig } from '@/ui/services/maintenanceService';
import CustomModal from '@/ui/components/common/CustomModal';

export default function AdminMaintenanceView() {
  const [config, setConfig] = useState<SystemMaintenanceConfig>(maintenanceService.getConfig());
  const [drainMinutes, setDrainMinutes] = useState<number>(5);
  const [reasonInput, setReasonInput] = useState<string>(config.reason);
  const [endTimeInput, setEndTimeInput] = useState<string>(
    config.scheduledEndTime ? config.scheduledEndTime.slice(0, 16) : ''
  );
  const [hotlineInput, setHotlineInput] = useState<string>(config.supportHotline);
  const [emailInput, setEmailInput] = useState<string>(config.supportEmail);
  const [bypassKeyInput, setBypassKeyInput] = useState<string>(config.masterBypassKey);
  const [whitelistInput, setWhitelistInput] = useState<string>(config.whitelistIps.join(', '));
  const [allowOfflineDrm, setAllowOfflineDrm] = useState<boolean>(config.allowOfflineDrm);
  const [allowShipperCod, setAllowShipperCod] = useState<boolean>(config.allowShipperOfflineCod);

  // Modal confirmations
  const [isBlackoutModalOpen, setIsBlackoutModalOpen] = useState(false);
  const [isDrainModalOpen, setIsDrainModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Remaining drain time
  const [remainingDrainSec, setRemainingDrainSec] = useState<number>(0);

  // Sync state
  useEffect(() => {
    const handleUpdate = () => {
      const current = maintenanceService.getConfig();
      setConfig(current);
      setReasonInput(current.reason);
      setHotlineInput(current.supportHotline);
      setEmailInput(current.supportEmail);
      setBypassKeyInput(current.masterBypassKey);
      setWhitelistInput(current.whitelistIps.join(', '));
      setAllowOfflineDrm(current.allowOfflineDrm);
      setAllowShipperCod(current.allowShipperOfflineCod);
      if (current.scheduledEndTime) {
        setEndTimeInput(current.scheduledEndTime.slice(0, 16));
      }
    };

    window.addEventListener('huki_system_maintenance_changed', handleUpdate);
    const interval = setInterval(() => {
      if (maintenanceService.isUnderGracefulDrain()) {
        setRemainingDrainSec(maintenanceService.getRemainingDrainSeconds());
      } else {
        setRemainingDrainSec(0);
      }
    }, 1000);

    return () => {
      window.removeEventListener('huki_system_maintenance_changed', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const ips = whitelistInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updated = maintenanceService.updateConfig({
      reason: reasonInput,
      scheduledEndTime: endTimeInput ? new Date(endTimeInput).toISOString() : undefined,
      supportHotline: hotlineInput,
      supportEmail: emailInput,
      masterBypassKey: bypassKeyInput,
      whitelistIps: ips,
      allowOfflineDrm,
      allowShipperOfflineCod: allowShipperCod,
    });

    setConfig(updated);
    showNotification('Đã cập nhật các thông số kỹ thuật bảo trì thành công!');
  };

  const handleTriggerInstantBlackout = () => {
    const updated = maintenanceService.activateInstantBlackout({
      reason: reasonInput,
      scheduledEndTime: endTimeInput ? new Date(endTimeInput).toISOString() : undefined,
      updatedBy: 'Admin Trung Tâm',
    });
    setConfig(updated);
    setIsBlackoutModalOpen(false);
    showNotification('🚨 ĐÃ KÍCH HOẠT CHẾ ĐỘ BẢO TRÌ KHẨN CẤP (BLACKOUT)!');
  };

  const handleTriggerGracefulDrain = () => {
    const updated = maintenanceService.activateGracefulDrain({
      drainDurationMinutes: drainMinutes,
      reason: reasonInput,
      scheduledEndTime: endTimeInput ? new Date(endTimeInput).toISOString() : undefined,
      updatedBy: 'Admin Trung Tâm',
    });
    setConfig(updated);
    setIsDrainModalOpen(false);
    showNotification(`⚠️ ĐÃ KÍCH HOẠT XẢ ÊM DỊU: Đếm ngược ${drainMinutes} phút trước khi ngắt toàn hệ thống!`);
  };

  const handleRestoreSystem = () => {
    const updated = maintenanceService.deactivateMaintenance('Admin Trung Tâm');
    setConfig(updated);
    setIsRestoreModalOpen(false);
    showNotification('✅ HỆ THỐNG ĐÃ ĐƯỢC PHỤC HỒI HOÀN TOÀN! Các dịch vụ đã hoạt động bình thường.');
  };

  const isUnderDrain = maintenanceService.isUnderGracefulDrain();
  const isFullBlackout = maintenanceService.isMaintenanceActive();

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700 animate-fade-in text-sm font-semibold">
          <span className="material-symbols-outlined text-emerald-400">task_alt</span>
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Bảo Trì Hệ Thống & Kill-Switch Khẩn Cấp
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
              VẬN HÀNH NỀN TẢNG
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Điều khiển ngắt khẩn cấp toàn diện sàn thương mại điện tử, bảo vệ giao dịch tiền tệ và điều hướng người dùng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/maintenance"
            target="_blank"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-sm">visibility</span>
            <span>Xem Trang Bảo Trì</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(config.masterBypassKey);
              showNotification('Đã sao chép Master Bypass Key vào clipboard!');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
            title="Sao chép khóa khẩn cấp"
          >
            <span className="material-symbols-outlined text-sm">key</span>
            <span>Copy Master Key</span>
          </button>
        </div>
      </div>

      {/* Live System Status Banner */}
      <div
        className={`rounded-2xl p-6 border transition-all shadow-sm ${
          isFullBlackout
            ? 'bg-rose-950/10 border-rose-300 text-rose-950'
            : isUnderDrain
            ? 'bg-amber-950/10 border-amber-300 text-amber-950'
            : 'bg-emerald-950/5 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                isFullBlackout
                  ? 'bg-rose-600 text-white animate-pulse'
                  : isUnderDrain
                  ? 'bg-amber-500 text-white animate-bounce'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              <span className="material-symbols-outlined text-3xl">
                {isFullBlackout ? 'power_settings_new' : isUnderDrain ? 'hourglass_top' : 'cloud_done'}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                  TRẠNG THÁI NỀN TẢNG
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    isFullBlackout
                      ? 'bg-rose-600 text-white'
                      : isUnderDrain
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isFullBlackout
                    ? 'BẢO TRÌ TOÀN SÀN (BLACKOUT)'
                    : isUnderDrain
                    ? 'ĐANG XẢ LƯU LƯỢNG (GRACEFUL DRAIN)'
                    : '100% HOẠT ĐỘNG BÌNH THƯỜNG'}
                </span>
              </div>

              <h2 className="text-lg font-bold text-slate-900">
                {isFullBlackout
                  ? 'Hệ thống đang ngắt kết nối công khai để bảo trì'
                  : isUnderDrain
                  ? `Hệ thống sẽ ngắt kết nối sau: ${Math.floor(remainingDrainSec / 60)} phút ${
                      remainingDrainSec % 60
                    } giây`
                  : 'Tất cả các dịch vụ (Store, Khách hàng, Bưu tá, Shop) đang sẵn sàng'}
              </h2>

              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                {isFullBlackout
                  ? 'Mọi người dùng truy cập web đều được tự động chuyển hướng đến /maintenance và khóa phím điều hướng lùi/lên. Chỉ Admin có khóa Master hoặc IP Whitelist mới có thể truy cập.'
                  : isUnderDrain
                  ? 'Cảnh báo bảo trì đang được phát toàn diện tới mọi màn hình. Sau khi đồng hồ đếm ngược kết thúc, hệ thống sẽ tự động chuyển sang chế độ Blackout hoàn toàn.'
                  : 'Hệ thống đang phục vụ bình thường. Các bộ đệm webhook thanh toán và quy trình bảo vệ sẵn sàng hoạt động khi có lệnh ngắt khẩn cấp.'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {config.isActive ? (
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 flex items-center gap-2 transition-transform active:scale-95"
              >
                <span className="material-symbols-outlined text-base">restore</span>
                <span>Khôi Phục Toàn Hệ Thống</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsDrainModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">hourglass_empty</span>
                  <span>Xả Êm Dịu (3-5 Phút)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBlackoutModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">emergency</span>
                  <span>Tắt Khẩn Cấp (Blackout Tức Thì)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Risk Mitigation Status & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 5 Vulnerabilities Protection Cards */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              <span className="material-symbols-outlined text-base text-emerald-600">security</span>
              <span>Trạng Thái 5 Điểm Yếu An Toàn</span>
            </div>

            <div className="space-y-3">
              {/* Point 1 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-emerald-600 text-lg mt-0.5">account_balance</span>
                <div>
                  <p className="text-xs font-bold text-slate-900">1. Buffer Webhook Thanh Toán</p>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Endpoint <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">/api/payments/webhook/*</code> không bao giờ bị chặn để đảm bảo tiền thanh toán không bị thất lạc.
                  </p>
                </div>
              </div>

              {/* Point 2 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-teal-600 text-lg mt-0.5">local_shipping</span>
                <div>
                  <p className="text-xs font-bold text-slate-900">2. Bưu Tá Giao Offline COD</p>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Shipper đang ngoài đường tiếp tục giao hàng và lưu biên nhận COD cục bộ trên app, đồng bộ tự động khi mở lại sàn.
                  </p>
                </div>
              </div>

              {/* Point 3 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-blue-600 text-lg mt-0.5">menu_book</span>
                <div>
                  <p className="text-xs font-bold text-slate-900">3. Bộ Đệm DRM Đọc Sách</p>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Người đọc đang mở sách Ebook không bị văng phiên đọc đột ngột, tiếp tục đọc được các trang đã tải offline.
                  </p>
                </div>
              </div>

              {/* Point 4 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-600 text-lg mt-0.5">vpn_key</span>
                <div>
                  <p className="text-xs font-bold text-slate-900">4. Master Escape Hatch (Admin)</p>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Tránh kịch bản Admin tự nhốt chính mình. Luôn cho phép truy cập qua Master Bypass Key và IP Whitelist.
                  </p>
                </div>
              </div>

              {/* Point 5 */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-purple-600 text-lg mt-0.5">travel_explore</span>
                <div>
                  <p className="text-xs font-bold text-slate-900">5. Bảo Toàn SEO (HTTP 503)</p>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Middleware gắn cờ 503 Service Unavailable kèm Retry-After, bảo vệ thứ hạng từ khóa Google không bị rớt.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-700">tune</span>
                <span>Cấu Hình Thông Số & Cổng Thoát Hiểm</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Lần cập nhật cuối: {new Date(config.updatedAt).toLocaleTimeString('vi-VN')} ({config.updatedBy})
              </span>
            </div>

            {/* Maintenance Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Thông Điệp / Lý Do Bảo Trì (Hiển thị cho Khách hàng & Đối tác)
              </label>
              <textarea
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white transition-all leading-relaxed"
                placeholder="Nhập lý do bảo trì hệ thống..."
                required
              />
            </div>

            {/* Scheduled End Time & Drain Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Thời Gian Dự Kiến Hoàn Tất
                </label>
                <input
                  type="datetime-local"
                  value={endTimeInput}
                  onChange={(e) => setEndTimeInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Thời Gian Đếm Ngược Xả Êm Dịu (Phút)
                </label>
                <select
                  value={drainMinutes}
                  onChange={(e) => setDrainMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value={3}>3 Phút (Cấp tốc)</option>
                  <option value={5}>5 Phút (Khuyến nghị chuẩn sàn)</option>
                  <option value={10}>10 Phút (Bảo trì quy mô lớn)</option>
                </select>
              </div>
            </div>

            {/* Support Hotline & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Hotline Hỗ Trợ Khẩn
                </label>
                <input
                  type="text"
                  value={hotlineInput}
                  onChange={(e) => setHotlineInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                  placeholder="1900 6868"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email CSKH Tiếp Nhận Khẩn
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                  placeholder="hotro@huki.vn"
                />
              </div>
            </div>

            {/* Master Bypass Key & IP Whitelist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Master Bypass Key (Khóa Thoát Hiểm Admin)
                </label>
                <input
                  type="text"
                  value={bypassKeyInput}
                  onChange={(e) => setBypassKeyInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 font-mono text-xs focus:outline-none focus:border-amber-500 focus:bg-white font-bold"
                  placeholder="HUKI_MASTER_ADMIN_2026"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Dùng để vượt qua màn hình bảo trì khi Admin bị ngắt phiên làm việc.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Danh Sách IP Whitelist (Cách nhau dấu phẩy)
                </label>
                <input
                  type="text"
                  value={whitelistInput}
                  onChange={(e) => setWhitelistInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-600 focus:bg-white"
                  placeholder="127.0.0.1, 192.168.1.1"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Các địa chỉ IP này sẽ không bị chuyển hướng sang trang bảo trì.
                </p>
              </div>
            </div>

            {/* Offline Toggles */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={allowOfflineDrm}
                  onChange={(e) => setAllowOfflineDrm(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Cho phép đọc Offline Ebook DRM</p>
                  <p className="text-[10px] text-slate-500">Độc giả tiếp tục đọc sách đã lưu trong bộ nhớ máy</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={allowShipperCod}
                  onChange={(e) => setAllowShipperCod(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900">Cho phép Bưu tá ghi nhận COD Offline</p>
                  <p className="text-[10px] text-slate-500">Bưu tá lưu cuốc giao trên app và đồng bộ khi mở sàn</p>
                </div>
              </label>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-3">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                <span>Lưu Thay Đổi Cấu Hình</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal 1: Instant Blackout */}
      <CustomModal
        isOpen={isBlackoutModalOpen}
        onClose={() => setIsBlackoutModalOpen(false)}
        title="🚨 XÁC NHẬN BẬT BẢO TRÌ KHẨN CẤP (BLACKOUT)"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-xl text-rose-600 mt-0.5">warning</span>
            <div>
              <p className="font-bold">Hành động này sẽ ngắt toàn bộ truy cập ngay lập tức!</p>
              <p className="mt-1 leading-relaxed">
                Tất cả khách hàng, người bán và bưu tá sẽ bị ngắt kết nối và điều hướng ngay về trang <strong>/maintenance</strong>. Mọi thao tác quay lại URL hoặc bấm mũi tên Back/Up đều bị vô hiệu hóa.
              </p>
            </div>
          </div>

          <p className="leading-relaxed">
            Hệ thống đảm bảo: Cổng lắng nghe Webhook thanh toán (<code className="bg-slate-100 px-1 py-0.5 rounded">/api/payments/webhook/*</code>) và phiên làm việc Quản trị viên Admin với Master Key vẫn hoạt động bình thường.
          </p>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsBlackoutModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Hủy Bỏ
            </button>
            <button
              type="button"
              onClick={handleTriggerInstantBlackout}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">power_settings_new</span>
              <span>Kích Hoạt Blackout Ngay</span>
            </button>
          </div>
        </div>
      </CustomModal>

      {/* Confirmation Modal 2: Graceful Drain */}
      <CustomModal
        isOpen={isDrainModalOpen}
        onClose={() => setIsDrainModalOpen(false)}
        title="⚠️ XÁC NHẬN KÍCH HOẠT XẢ LƯU LƯỢNG ÊM DỊU"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-xl text-amber-600 mt-0.5">timer</span>
            <div>
              <p className="font-bold">Đếm ngược {drainMinutes} phút trước khi khóa toàn sàn</p>
              <p className="mt-1 leading-relaxed">
                Hệ thống sẽ gửi cảnh báo khẩn cấp đến toàn bộ màn hình người dùng, người bán và bưu tá để hoàn tất các giao dịch đang dở dang. Sau khi hết {drainMinutes} phút, sàn sẽ tự động ngắt kết nối.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsDrainModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Hủy Bỏ
            </button>
            <button
              type="button"
              onClick={handleTriggerGracefulDrain}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">play_arrow</span>
              <span>Bắt Đầu Đếm Ngược Xả {drainMinutes} Phút</span>
            </button>
          </div>
        </div>
      </CustomModal>

      {/* Confirmation Modal 3: Restore */}
      <CustomModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        title="✅ XÁC NHẬN KHÔI PHỤC TOÀN HỆ THỐNG"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-xl text-emerald-600 mt-0.5">check_circle</span>
            <div>
              <p className="font-bold">Mở khóa toàn sàn và đưa người dùng trở lại hoạt động bình thường</p>
              <p className="mt-1 leading-relaxed">
                Người dùng tại trang /maintenance sẽ được thông báo và tự động trở về trang chủ. Thông báo hoàn tất bảo trì sẽ được gửi đồng loạt qua In-App notification.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsRestoreModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Hủy Bỏ
            </button>
            <button
              type="button"
              onClick={handleRestoreSystem}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">restore</span>
              <span>Xác Nhận Khôi Phục</span>
            </button>
          </div>
        </div>
      </CustomModal>
    </div>
  );
}
