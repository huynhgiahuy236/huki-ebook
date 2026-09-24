"use client";

import React, { useState, useMemo } from 'react';
import { useToast } from '@/ui/context/ToastContext';
import {
  AdminStatusBadge,
  AdminFilterTabs,
  AdminPagination,
  AdminTableContainer,
} from './AdminUI';

export function AdminDrmVaultView() {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'secure' | 'upgrade_needed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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

  const filtered = useMemo(() => {
    return drmLicenses.filter((item) => {
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
  }, [drmLicenses, activeTab, searchQuery]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const tabs = [
    { key: 'all', label: 'Tất Cả Khóa', count: drmLicenses.length },
    { key: 'secure', label: 'An Toàn Tuyệt Đối', count: drmLicenses.filter(d => d.securityStatus === 'secure').length },
    { key: 'upgrade_needed', label: 'Cần Nâng Cấp Khóa', count: drmLicenses.filter(d => d.securityStatus === 'upgrade_needed').length },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full font-sans">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial">
            Quản Trị Khóa Bản Quyền DRM Vault
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Giám sát mã hóa AES-GCM-256, cụm KMS và chứng chỉ bản quyền tác phẩm số</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleScanIntegrity}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span>Quét Toàn Vẹn Bản Quyền (Integrity Scan)</span>
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Tổng Khóa Mã Hóa</div>
            <div className="text-2xl font-extrabold text-gray-900 font-editorial mt-1">43.200</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Tất cả đều hoạt động</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">key</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Độc Giả Đang Đọc</div>
            <div className="text-2xl font-extrabold text-emerald-700 font-editorial mt-1">7.720</div>
            <div className="text-[11px] text-gray-500 font-medium mt-0.5">Gắn Dynamic Canvas Watermark</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">devices</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Thiết Bị Bị Thu Hồi</div>
            <div className="text-2xl font-extrabold text-rose-600 font-editorial mt-1">17</div>
            <div className="text-[11px] text-rose-700 font-medium mt-0.5">Phát hiện hành vi bất thường</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">block</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">KMS Hardware Cluster</div>
            <div className="text-2xl font-extrabold text-purple-700 font-editorial mt-1">SG1 &amp; HN02</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Hardware Latency 4ms</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">dns</span>
          </div>
        </div>
      </div>

      {/* 3. LICENSES LIST TABLE */}
      <AdminTableContainer>
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <AdminFilterTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(key) => {
              setActiveTab(key as any);
              setCurrentPage(1);
            }}
          />

          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo ID giấy phép, tên sách, NXB..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-purple-600 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1350px]">
            <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-3.5 whitespace-nowrap w-12 text-center">STT</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Mã Giấy Phép DRM</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Tác Phẩm &amp; NXB</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Mã ISBN</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Thuật Toán Mã Hóa</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Cụm Máy Chủ KMS</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Khóa Vân Tay SHA-256</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Engine Watermark</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-center">Đang Đọc</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-center">Tổng Cấp</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-center">Trạng Thái</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-right pr-4">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-normal">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-400">
                    <span className="material-symbols-outlined text-4xl text-gray-300 block mb-1">key_off</span>
                    Không tìm thấy giấy phép DRM nào phù hợp
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}
                    >
                      <td className="py-3 px-3.5 whitespace-nowrap text-center text-[11px] font-mono text-gray-400">
                        {itemIndex}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold text-purple-900">
                        {item.id}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-xs">{item.bookTitle}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{item.publisher}</div>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-gray-600">
                        {item.isbn}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-semibold text-gray-800">
                        {item.algorithm}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-600 text-[11px]">
                        {item.encryptionCluster}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-mono text-[10px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded" title={item.keyFingerprint}>
                          {item.keyFingerprint.slice(0, 24)}...
                        </span>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-[11px] text-emerald-700 font-medium">
                        {item.watermarkEngine}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-center font-bold text-gray-900">
                        {item.activeReaders.toLocaleString()}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-center text-gray-600 font-medium">
                        {item.issuedLicenses.toLocaleString()}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        <AdminStatusBadge
                          status={item.securityStatus === 'secure' ? 'ACTIVE' : 'WARNING'}
                          label={item.statusLabel}
                        />
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-right pr-4">
                        <button
                          onClick={() => handleRotateKey(item.id)}
                          className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          Luân Chuyển Khóa
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="giấy phép DRM"
        />
      </AdminTableContainer>
    </div>
  );
}

export default AdminDrmVaultView;
