import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';

export default function AdminDrmVaultPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState(null);

  const drmLicenses = [
    {
      id: 'DRM-LIC-9921',
      bookTitle: 'Tâm Lý Học Về Tiền (2026 Edition)',
      publisher: 'Alpha Books Official',
      isbn: '978-604-77-9912-1',
      algorithm: 'AES-GCM-256 + RSA-4096 Keypair',
      issuedLicenses: 14250,
      activeReaders: 3820,
      encryptionCluster: 'Singapore SG1 (AWS KMS)',
      keyFingerprint: 'SHA256:7f:8a:3c:91:e2:11:4a:d9:88:b2:01:44:fa:10',
      watermarkEngine: 'Dynamic Reader Email + OrderID Canvas Overlay',
      securityStatus: 'secure',
      statusLabel: 'An Toàn Tuyệt Đối',
      revokedDevices: 12
    },
    {
      id: 'DRM-LIC-9922',
      bookTitle: 'Kinh Tế Học Hành Vi - Ứng Dụng Kỷ Nguyên Số',
      publisher: 'Nhà Xuất Bản Trẻ',
      isbn: '978-604-1-23845-6',
      algorithm: 'AES-GCM-256',
      issuedLicenses: 8940,
      activeReaders: 2150,
      encryptionCluster: 'Viettel IDC Hà Nội (Node 01)',
      keyFingerprint: 'SHA256:3a:99:c2:d1:8e:77:22:90:bc:ef:31:9a:c4:12',
      watermarkEngine: 'Dynamic Reader Email + Timestamp',
      securityStatus: 'secure',
      statusLabel: 'An Toàn Tuyệt Đối',
      revokedDevices: 4
    },
    {
      id: 'DRM-LIC-9923',
      bookTitle: 'Cổ Phiếu Thường Lợi Nhuận Phi Thường',
      publisher: 'Alpha Books Official',
      isbn: '978-604-77-8890-2',
      algorithm: 'AES-GCM-256 + FairPlay DRM',
      issuedLicenses: 11200,
      activeReaders: 4100,
      encryptionCluster: 'Singapore SG1 (AWS KMS)',
      keyFingerprint: 'SHA256:bb:14:09:ef:22:31:88:41:9a:cc:72:01:8e:67',
      watermarkEngine: 'Dynamic Invisible Steganography',
      securityStatus: 'secure',
      statusLabel: 'An Toàn Tuyệt Đối',
      revokedDevices: 8
    },
    {
      id: 'DRM-LIC-9920',
      bookTitle: 'Trí Tuệ Nhân Tạo & Tương Lai Nhân Loại 2030',
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
      revokedDevices: 15
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
      revokedDevices: 2
    }
  ];

  const handleRotateKey = (licId) => {
    showToast(`Đã luân chuyển (Rotate) khóa bảo mật cho giấy phép ${licId} thành công!`, 'success');
  };

  const handleScanIntegrity = () => {
    showToast('Đang quét toàn bộ 43.200 chứng chỉ DRM... 0 tệp tin bị rò rỉ!', 'success');
  };

  const filtered = drmLicenses.filter(item => {
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Kho Bản Quyền Số &amp; Quản Trị Khóa Mã Hóa DRM
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Quản lý 43.200 chứng chỉ bản quyền số, giám sát cụm máy chủ mã hóa KMS Singapore/Viettel và chống sao chép trái phép.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleScanIntegrity}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span>Quét Toàn Vẹn Bản Quyền</span>
          </button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Tổng Giấy Phép Đã Cấp</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">vpn_key</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">43.200 Quyền</div>
          <div className="mt-2 text-xs text-emerald-600 font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            <span>100% Ebook được bảo vệ</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Phiên Đọc Đang Giải Mã Live</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">stream</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">12.900 Phiên</div>
          <div className="mt-2 text-xs text-blue-600 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span>Độ trễ giải mã &lt; 18ms</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Cụm Máy Chủ Mã Hóa</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">dns</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">2 / 2 Cụm Online</div>
          <div className="mt-2 text-xs text-emerald-700 font-bold flex items-center gap-1">
            <span>SG AWS KMS + VN Viettel IDC</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Thiết Bị Bị Thu Hồi Khóa</span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">block</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">41 Thiết Bị</div>
          <div className="mt-2 text-xs text-gray-400 font-medium">
            Do đổi máy hoặc nghi vấn rò rỉ
          </div>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3.5">
        <div className="flex items-center gap-1.5 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl w-full md:w-auto">
          {[
            { key: 'all', label: 'Tất cả giấy phép' },
            { key: 'secure', label: 'Chuẩn AES-GCM (Cao nhất)' },
            { key: 'upgrade_needed', label: 'Cần nâng cấp khóa' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.key ? 'bg-white text-gray-900 shadow-xs border border-gray-200' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
          <input
            type="text"
            placeholder="Tìm tên tác phẩm, NXB, ISBN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 4. DRM LICENSES TABLE */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3.5 px-4">Tác Phẩm &amp; Mã Bản Quyền</th>
                <th className="py-3.5 px-3">Thuật Toán &amp; Cụm KMS</th>
                <th className="py-3.5 px-3">Vân Tay Khóa Mã Hóa</th>
                <th className="py-3.5 px-3">Quyền Đã Cấp</th>
                <th className="py-3.5 px-3">Cơ Chế Watermark</th>
                <th className="py-3.5 px-3">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(item => (
                <tr key={item.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 text-[13px]">{item.bookTitle}</span>
                      <span className="text-[11px] text-gray-500 mt-0.5">{item.publisher} · ISBN: {item.isbn}</span>
                      <span className="text-[10px] text-purple-700 font-mono mt-0.5">#{item.id}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800 font-mono">{item.algorithm}</span>
                      <span className="text-[10px] text-gray-500">{item.encryptionCluster}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded block truncate max-w-[190px]">
                      {item.keyFingerprint}
                    </span>
                  </td>

                  <td className="py-3.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-gray-900">{item.issuedLicenses.toLocaleString()} quyền</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">{item.activeReaders.toLocaleString()} độc giả đang đọc</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-gray-700">{item.watermarkEngine}</span>
                  </td>

                  <td className="py-3.5 px-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      item.securityStatus === 'secure' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {item.statusLabel}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleRotateKey(item.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Đổi Khóa (Rotate)
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
