"use client";

import React, { useState } from 'react';
import { useToast } from '@/ui/context/ToastContext';

export function AdminDrmVaultView() {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'secure' | 'upgrade_needed'>('all');

  const drmLicenses = [
    {
      id: 'DRM-LIC-8821',
      bookTitle: 'Nhà Giả Kim (Ấn bản Kỷ niệm 25 năm)',
      publisher: 'Nhà Xuất Bản Phụ Nữ',
      isbn: '978-604-56-1234-5',
      algorithm: 'AES-GCM-256 (Chuẩn Quân Đội)',
      issuedLicenses: 12450,
      activeReaders: 4890,
      encryptionCluster: 'Singapore SG1 (AWS KMS)',
      keyFingerprint: 'SHA256:7f:88:9a:11:02:bc:dd:44:91:0a:77:88:99:aa:bb:cc',
      watermarkEngine: 'Dynamic Reader Email Canvas',
      securityStatus: 'secure',
      statusLabel: 'An Toàn Tuyệt Đối',
      revokedDevices: 0,
    },
    {
      id: 'DRM-LIC-7740',
      bookTitle: 'Đắc Nhân Tâm (Bản Quyền Độc Quyền)',
      publisher: 'First News - Trí Việt',
      isbn: '978-604-56-7810-0',
      algorithm: 'AES-CBC-256 (Chuẩn Cũ)',
      issuedLicenses: 3200,
      activeReaders: 890,
      encryptionCluster: 'Viettel IDC Hà Nội (Node 02)',
      keyFingerprint: 'SHA256:12:44:89:aa:fe:09:12:33:bc:00:81:62:3f:99',
      watermarkEngine: 'Standard Text Watermark',
      securityStatus: 'upgrade_needed',
      statusLabel: 'Cần Nâng Cấp Khóa GCM',
      revokedDevices: 15,
    },
    {
      id: 'DRM-LIC-9919',
      bookTitle: 'Chiến Tranh Tiền Tệ - Tập 5',
      publisher: 'Nhã Nam Books',
      isbn: '978-604-2-18490-3',
      algorithm: 'AES-GCM-256 + DRM Widevine L1',
      issuedLicenses: 5610,
      activeReaders: 1940,
      encryptionCluster: 'Singapore SG1 (AWS KMS)',
      keyFingerprint: 'SHA256:99:81:23:44:aa:cd:ee:12:44:56:77:88:99:00',
      watermarkEngine: 'Dynamic Reader Email Canvas',
      securityStatus: 'secure',
      statusLabel: 'An Toàn Tuyệt Đối',
      revokedDevices: 2,
    },
  ];

  const handleRotateKey = (licId: string) => {
    showToast?.(`Đã luân chuyển (Rotate) khóa bảo mật cho giấy phép ${licId} thành công!`, 'success');
  };

  const handleScanIntegrity = () => {
    showToast?.('Đang quét toàn bộ 43.200 chứng chỉ DRM... 0 tệp tin bị rò rỉ!', 'success');
  };

  const filtered = drmLicenses.filter((item) => {
    if (activeTab === 'secure' && item.securityStatus !== 'secure') return false;
    if (activeTab === 'upgrade_needed' && item.securityStatus !== 'upgrade_needed') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.bookTitle.toLowerCase().includes(q) ||
        item.publisher.toLowerCase().includes(q) ||
        item.isbn.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-500">Hạ Tầng Bảo Mật Kỹ Thuật Số</span>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold">
              KHO KHÓA BẢN QUYỀN DRM • SHA-256 AES-GCM
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight font-editorial mt-1">
            Trung Tâm Quản Trị Khóa Bản Quyền DRM Vault
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-3xl">
            Giám sát thuật toán mã hóa động nội dung số (EPUB/PDF), kiểm soát phiên đọc trên thiết bị và cơ chế luân chuyển khóa định kỳ chống sao chép trái phép.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleScanIntegrity}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            <span>Quét Toàn Vẹn Bản Quyền (Integrity Scan)</span>
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 font-semibold uppercase">Tổng Khóa Mã Hóa Đang Cấp</div>
            <div className="text-2xl font-black text-gray-900 font-editorial mt-1">43.200</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Tất cả đều hoạt động</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">key</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 font-semibold uppercase">Độc Giả Đang Đọc Trực Tuyến</div>
            <div className="text-2xl font-black text-emerald-700 font-editorial mt-1">7.720</div>
            <div className="text-[11px] text-gray-500 font-medium mt-0.5">Được gắn Dynamic Canvas Watermark</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">devices</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 font-semibold uppercase">Thiết Bị Bị Thu Hồi (Revoked)</div>
            <div className="text-2xl font-black text-rose-600 font-editorial mt-1">17</div>
            <div className="text-[11px] text-rose-700 font-medium mt-0.5">Do chụp màn hình / Đăng nhập bất thường</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">block</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 font-semibold uppercase">KMS Hardware Cluster</div>
            <div className="text-2xl font-black text-purple-700 font-editorial mt-1">SG1 &amp; HN02</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Hardware Latency 4ms</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">dns</span>
          </div>
        </div>
      </div>

      {/* 3. LICENSES LIST TABLE */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'all' as const, label: 'Tất Cả Khóa (3)' },
              { id: 'secure' as const, label: 'An Toàn Tuyệt Đối (2)' },
              { id: 'upgrade_needed' as const, label: 'Cần Nâng Cấp Khóa (1)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-purple-700 text-white font-bold shadow-xs'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo ID giấy phép, Tên sách, NXB hoặc ISBN..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-purple-600 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700 border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Giấy Phép DRM</th>
                <th className="py-3 px-4">Tác Phẩm &amp; NXB</th>
                <th className="py-3 px-4">Thuật Toán &amp; Cụm KMS</th>
                <th className="py-3 px-4">Khóa Vân Tay SHA-256</th>
                <th className="py-3 px-4 text-center">Đang Đọc / Đã Cấp</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-normal">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-purple-900">
                    {item.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-gray-900 text-xs">{item.bookTitle}</div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <span>{item.publisher}</span>
                      <span>•</span>
                      <span className="font-mono">{item.isbn}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-gray-800">{item.algorithm}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{item.encryptionCluster}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-mono text-[10px] text-gray-600 bg-gray-100 p-1 rounded max-w-xs truncate" title={item.keyFingerprint}>
                      {item.keyFingerprint}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-medium mt-0.5">{item.watermarkEngine}</div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="font-bold text-gray-900">{item.activeReaders.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-400">trên {item.issuedLicenses.toLocaleString()} lượt cấp</div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.securityStatus === 'secure' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.statusLabel}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleRotateKey(item.id)}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Luân Chuyển Khóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDrmVaultView;
