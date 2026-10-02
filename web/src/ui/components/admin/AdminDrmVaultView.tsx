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

  const [expandedDrmIds, setExpandedDrmIds] = useState<Set<string>>(new Set());

  const toggleExpandDrm = (id: string) => {
    setExpandedDrmIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tabs = [
    { key: 'all', label: 'Tất Cả Khóa', count: drmLicenses.length },
    { key: 'secure', label: 'An Toàn Tuyệt Đối', count: drmLicenses.filter(d => d.securityStatus === 'secure').length },
    { key: 'upgrade_needed', label: 'Cần Nâng Cấp Khóa', count: drmLicenses.filter(d => d.securityStatus === 'upgrade_needed').length },
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto font-sans animate-in fade-in duration-200">
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
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
            <tr>
              <th className="py-3 px-2 w-8 text-center"></th>
              <th className="py-3 px-2 w-10 text-center">STT</th>
              <th className="py-3 px-3.5">Tác Phẩm &amp; Mã Giấy Phép</th>
              <th className="py-3 px-3.5">Thuật Toán &amp; Cụm KMS</th>
              <th className="py-3 px-3.5">Độc Giả (Đang Đọc / Tổng Cấp)</th>
              <th className="py-3 px-4 text-right">Trạng Thái &amp; Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-normal">
            {paginatedList.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  <span className="material-symbols-outlined text-4xl text-gray-300 block mb-1">key_off</span>
                  Không tìm thấy giấy phép DRM nào phù hợp
                </td>
              </tr>
            ) : (
              paginatedList.map((item, idx) => {
                const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                const isExpanded = expandedDrmIds.has(item.id);

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`transition-colors group ${
                        isExpanded ? 'bg-purple-50/30' : idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'
                      } hover:bg-purple-50/40`}
                    >
                      {/* Chevron toggle */}
                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleExpandDrm(item.id)}
                          className="w-6 h-6 rounded-md hover:bg-purple-100 text-gray-500 hover:text-purple-800 flex items-center justify-center transition-all cursor-pointer"
                          title={isExpanded ? 'Thu gọn chi tiết' : 'Mở rộng chi tiết'}
                        >
                          <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${isExpanded ? 'rotate-90 text-purple-700' : ''}`}>
                            chevron_right
                          </span>
                        </button>
                      </td>

                      {/* STT */}
                      <td className="py-3 px-2 text-center text-[11px] font-mono text-gray-400">
                        {itemIndex}
                      </td>

                      {/* Tác Phẩm & Mã Giấy Phép */}
                      <td className="py-3 px-3.5">
                        <div
                          onClick={() => toggleExpandDrm(item.id)}
                          className="font-bold text-gray-900 text-xs hover:text-purple-800 transition-colors cursor-pointer truncate max-w-[280px]"
                        >
                          {item.bookTitle}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10.5px] font-bold text-purple-900">{item.id}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-[10.5px] text-gray-500 truncate max-w-[160px]">{item.publisher}</span>
                        </div>
                      </td>

                      {/* Thuật Toán & Cụm KMS */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-gray-800 text-xs">
                          {item.algorithm}
                        </div>
                        <div className="text-[10.5px] text-gray-500 mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px] text-purple-600">cloud</span>
                          <span>{item.encryptionCluster}</span>
                        </div>
                      </td>

                      {/* Độc Giả */}
                      <td className="py-3 px-3.5">
                        <div className="text-xs font-bold text-gray-900">
                          {item.activeReaders.toLocaleString()} <span className="font-normal text-[11px] text-gray-500">đang đọc</span>
                        </div>
                        <div className="text-[10.5px] text-gray-500 mt-0.5">
                          Tổng cấp: {item.issuedLicenses.toLocaleString()}
                        </div>
                      </td>

                      {/* Trạng Thái & Thao Tác */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <AdminStatusBadge
                            status={item.securityStatus === 'secure' ? 'ACTIVE' : 'WARNING'}
                            label={item.statusLabel}
                          />

                          <button
                            onClick={() => handleRotateKey(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-bold transition-colors cursor-pointer"
                            title="Luân chuyển khóa mã hóa"
                          >
                            Đổi Khóa
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Master-Detail Expandable Subcard (3 cards) */}
                    {isExpanded && (
                      <tr className="bg-purple-50/20 border-b border-purple-100">
                        <td colSpan={6} className="p-4 sm:p-5">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-xl p-4 border border-purple-200/70 shadow-xs">
                            {/* Cột 1: Cấu hình khóa */}
                            <div className="space-y-2 text-xs border-r border-gray-100 pr-3">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">key</span>
                                <span>Cấu Hình Khóa &amp; Fingerprint</span>
                              </div>
                              <div className="space-y-1.5 pt-1 text-[11px]">
                                <div><span className="text-gray-400">ISBN: </span><span className="font-mono font-semibold">{item.isbn}</span></div>
                                <div><span className="text-gray-400">Vân tay SHA-256: </span><span className="font-mono text-[10px] text-gray-700 block break-all bg-gray-50 p-1 rounded border border-gray-100">{item.keyFingerprint}</span></div>
                                <div><span className="text-gray-400">Cụm KMS: </span><span className="font-semibold">{item.encryptionCluster}</span></div>
                              </div>
                            </div>

                            {/* Cột 2: Watermark & Thu hồi */}
                            <div className="space-y-2 text-xs border-r border-gray-100 pr-3">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">water_drop</span>
                                <span>Chống Sao Chép &amp; Watermark</span>
                              </div>
                              <div className="space-y-1.5 pt-1 text-[11px]">
                                <div><span className="text-gray-400">Watermark Engine: </span><span className="font-semibold text-emerald-800">{item.watermarkEngine}</span></div>
                                <div><span className="text-gray-400">Thiết bị thu hồi: </span><span className="font-semibold text-rose-700">{item.revokedDevices} thiết bị</span></div>
                                <div><span className="text-gray-400">Trạng thái an ninh: </span><span className="font-semibold">{item.statusLabel}</span></div>
                              </div>
                            </div>

                            {/* Cột 3: Hành động quản trị */}
                            <div className="space-y-2 text-xs flex flex-col justify-between">
                              <div>
                                <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[14px]">build</span>
                                  <span>Thao Tác Bảo Mật DRM</span>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-1">
                                  Luân chuyển khóa mới không làm gián đoạn trải nghiệm độc giả đang trực tuyến.
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-2">
                                <button
                                  onClick={() => handleRotateKey(item.id)}
                                  className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[14px]">sync</span>
                                  <span>Luân Chuyển Khóa (Rotate)</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>

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
