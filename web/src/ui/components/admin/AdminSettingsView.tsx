"use client";
import React, { useState, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  AdminPagination,
  AdminTableContainer,
} from './AdminUI';

export function AdminSettingsView() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [platformSettings, setPlatformSettings] = useState({
    platformName: 'HUKI Ebook & Sách Giấy Chính Hãng',
    supportHotline: '1900 6868',
    defaultCommission: 15,
    maxDevicesPerUser: 5,
    watermarkEnabled: true,
    blockScreenshots: true,
    autoAuditLogs: true
  });

  const auditLogs = [
    {
      id: 'AUD-891',
      admin: 'Admin Trưởng Sàn',
      action: 'Phê duyệt xuất bản sách: Tâm Lý Học Về Tiền',
      time: '11/06/2026 - 15:42',
      ip: '113.190.234.12'
    },
    {
      id: 'AUD-890',
      admin: 'Kế Toán Trưởng Sàn',
      action: 'Giải ngân đối soát NXB Nhã Nam: ₫521.136.000',
      time: '11/06/2026 - 14:15',
      ip: '113.190.234.15'
    },
    {
      id: 'AUD-889',
      admin: 'Hệ Thống DRM Bot',
      action: 'Tự động luân chuyển khóa mã hóa cụm SG1 AWS KMS',
      time: '11/06/2026 - 02:00',
      ip: '10.0.12.84 (Internal)'
    }
  ];

  const totalPages = Math.ceil(auditLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return auditLogs.slice(start, start + pageSize);
  }, [auditLogs, currentPage, pageSize]);

  const handleSave = (e: any) => {
    e.preventDefault();
    showToast('Đã lưu toàn bộ cấu hình hệ thống Super Admin thành công!', 'success');
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto font-sans animate-in fade-in duration-200">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial">
            Cài Đặt Hệ Thống &amp; Chính Sách DRM
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Thiết lập tham số bản quyền, phí hoa hồng sàn và theo dõi nhật ký kiểm toán</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>Lưu Cấu Hình</span>
          </button>
        </div>
      </div>

      {/* 2. TABS */}
      <div className="flex items-center gap-2 p-1 bg-white border border-[#E2E8F0] rounded-2xl w-fit shadow-2xs">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'general' ? 'bg-[#00875A] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Chính Sách DRM &amp; Vận Hành
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'audit' ? 'bg-[#00875A] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Nhật Ký Kiểm Toán (Audit Logs)
        </button>
      </div>

      {/* 3. SETTINGS CONTENT */}
      {activeTab === 'general' ? (
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* DRM Security Box */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs space-y-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-600 text-[18px]">lock</span>
              Chính Sách Bản Quyền DRM Số
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Số thiết bị đọc tối đa cho mỗi tài khoản bạn đọc</label>
                <input
                  type="number"
                  value={platformSettings.maxDevicesPerUser}
                  onChange={(e: any) => setPlatformSettings({ ...platformSettings, maxDevicesPerUser: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 font-bold"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-900">Nhúng Watermark Động Khi Đọc Ebook</div>
                  <p className="text-gray-400 text-[11px]">Tự động gắn Email và Mã đơn hàng vào các trang sách</p>
                </div>
                <input
                  type="checkbox"
                  checked={platformSettings.watermarkEnabled}
                  onChange={(e: any) => setPlatformSettings({ ...platformSettings, watermarkEnabled: e.target.checked })}
                  className="w-4 h-4 text-[#00875A] rounded focus:ring-[#00875A]"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-900">Chặn Chụp &amp; Ghi Màn Hình (Screen Protection)</div>
                  <p className="text-gray-400 text-[11px]">Bảo vệ trang sách trên ứng dụng di động iOS/Android</p>
                </div>
                <input
                  type="checkbox"
                  checked={platformSettings.blockScreenshots}
                  onChange={(e: any) => setPlatformSettings({ ...platformSettings, blockScreenshots: e.target.checked })}
                  className="w-4 h-4 text-[#00875A] rounded focus:ring-[#00875A]"
                />
              </div>
            </div>
          </div>

          {/* Business & Platform Governance */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs space-y-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00875A] text-[18px]">tune</span>
              Quy Chuẩn Thương Mại Sàn
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Tỷ Lệ Phí Dịch Vụ Sàn Mặc Định (%)</label>
                <input
                  type="number"
                  value={platformSettings.defaultCommission}
                  onChange={(e: any) => setPlatformSettings({ ...platformSettings, defaultCommission: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 font-bold"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">NXB nhận 85% - Sàn nhận 15%</span>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Hotline Tổng Đài Ban Quản Trị</label>
                <input
                  type="text"
                  value={platformSettings.supportHotline}
                  onChange={(e: any) => setPlatformSettings({ ...platformSettings, supportHotline: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 font-bold"
                />
              </div>
            </div>
          </div>

        </form>
      ) : (
        <AdminTableContainer>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
              <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap w-12 text-center">STT</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Mã Log</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Quản Trị Viên Thực Hiện</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Hành Động Hệ Thống</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Thời Gian Ghi Nhận</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-right pr-4">Địa Chỉ IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-normal">
                {paginatedLogs.map((log, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={log.id}
                      className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}
                    >
                      <td className="py-3 px-3.5 whitespace-nowrap text-center text-[11px] font-mono text-gray-400">
                        {itemIndex}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold text-gray-800">
                        #{log.id}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-bold text-gray-900">
                        {log.admin}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-gray-700">
                        {log.action}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-500 text-[11px]">
                        {log.time}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-right pr-4 font-mono text-gray-500 text-[11px]">
                        {log.ip}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={auditLogs.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemLabel="bản ghi nhật ký"
          />
        </AdminTableContainer>
      )}

    </div>
  );
}

export default AdminSettingsView;
