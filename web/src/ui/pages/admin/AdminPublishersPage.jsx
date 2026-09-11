import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function AdminPublishersPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPublisher, setSelectedPublisher] = useState(null);

  const publishers = [
    {
      id: 'pub-1',
      name: 'Nhà Xuất Bản Trẻ',
      code: 'TRE',
      badge: 'Chính Hãng Mall',
      license: 'GP-0318926410-BTTTT',
      rep: 'Nguyễn Minh Trí',
      email: 'contact@nxbtre.com.vn',
      phone: '028.3931.6289',
      revenue: '485.600.000₫',
      bookCount: '3.420 đầu sách',
      ebookDrmCount: '1.250 Ebook',
      split: '85% NXB - 15% HUKI',
      status: 'active',
      statusLabel: 'Đang hoạt động',
      rating: 4.9,
      joinedDate: '15/01/2024'
    },
    {
      id: 'pub-2',
      name: 'Công Ty CP Văn Hóa & Truyền Thông Nhã Nam',
      code: 'NHANAM',
      badge: 'Chính Hãng Mall',
      license: 'GP-0102938475-BTTTT',
      rep: 'Vũ Hoàng Nam',
      email: 'banquyen@nhanam.vn',
      phone: '024.3514.6869',
      revenue: '620.400.000₫',
      bookCount: '4.850 đầu sách',
      ebookDrmCount: '2.100 Ebook',
      split: '85% NXB - 15% HUKI',
      status: 'active',
      statusLabel: 'Đang hoạt động',
      rating: 5.0,
      joinedDate: '10/02/2024'
    },
    {
      id: 'pub-3',
      name: 'Nhà Xuất Bản Kim Đồng',
      code: 'KIMDONG',
      badge: 'Chính Hãng Mall',
      license: 'GP-0100109283-BTTTT',
      rep: 'Trần Thu Hà',
      email: 'phathanh@nxbkimdong.com.vn',
      phone: '024.3943.4730',
      revenue: '512.300.000₫',
      bookCount: '5.200 đầu sách',
      ebookDrmCount: '980 Ebook',
      split: '85% NXB - 15% HUKI',
      status: 'active',
      statusLabel: 'Đang hoạt động',
      rating: 4.9,
      joinedDate: '05/03/2024'
    },
    {
      id: 'pub-4',
      name: 'Alpha Books Official',
      code: 'ALPHABOOKS',
      badge: 'Chính Hãng Mall',
      license: 'GP-0101928374-BTTTT',
      rep: 'Nguyễn Cảnh Bình',
      email: 'support@alphabooks.vn',
      phone: '024.3722.6234',
      revenue: '390.800.000₫',
      bookCount: '2.150 đầu sách',
      ebookDrmCount: '1.450 Ebook',
      split: '85% NXB - 15% HUKI',
      status: 'active',
      statusLabel: 'Đang hoạt động',
      rating: 4.85,
      joinedDate: '20/04/2024'
    },
    {
      id: 'pub-5',
      name: 'First News - Trí Việt',
      code: 'FIRSTNEWS',
      badge: 'Đối Tác Cấp 1',
      license: 'GP-0301928384-BTTTT',
      rep: 'Nguyễn Văn Phước',
      email: 'triviet@firstnews.com.vn',
      phone: '028.3822.7979',
      revenue: '340.200.000₫',
      bookCount: '1.890 đầu sách',
      ebookDrmCount: '820 Ebook',
      split: '85% NXB - 15% HUKI',
      status: 'active',
      statusLabel: 'Đang hoạt động',
      rating: 4.95,
      joinedDate: '12/05/2024'
    },
    {
      id: 'pub-6',
      name: 'Công Ty Sách & Nội Dung Số Tinh Hoa (Hồ Sơ Mới)',
      code: 'TINHHOA',
      badge: 'Chờ Thẩm Định',
      license: 'GP-0319882210-BTTTT',
      rep: 'Lê Minh Tuấn',
      email: 'admin@tinhhoabook.com',
      phone: '0908.123.456',
      revenue: '0₫',
      bookCount: '45 tựa đăng ký',
      ebookDrmCount: '30 Ebook',
      split: '85% NXB - 15% HUKI',
      status: 'pending',
      statusLabel: 'Chờ thẩm định hồ sơ',
      rating: 0,
      joinedDate: 'Hôm nay'
    }
  ];

  const filteredPublishers = publishers.filter(p => {
    if (activeTab === 'mall' && !p.badge.includes('Mall')) return false;
    if (activeTab === 'pending' && p.status !== 'pending') return false;
    if (searchQuery.trim() && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-[1480px] mx-auto">
      
      {/* 1. HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Quản Lý Đối Tác B2B</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">1.024 NXB</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Nhà Xuất Bản &amp; Đối Tác Sách
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Thẩm định hồ sơ pháp lý, cấp chứng nhận Official Mall, phân bổ hạn mức băng thông Ebook DRM &amp; cấu hình tỷ lệ hoa hồng.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button 
            onClick={() => showToast('Đang trích xuất file Excel danh sách NXB...', 'info')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>Xuất Excel</span>
          </button>

          <button 
            onClick={() => showToast('Mở form cấp phép gian hàng đối tác đặc cách', 'info')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_business</span>
            <span>+ Cấp Quyền NXB Mới</span>
          </button>
        </div>
      </div>

      {/* 2. STATS PILL ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-gray-500 font-semibold">Tổng NXB Hoạt Động</span>
          <div className="text-xl font-bold text-gray-900 mt-1">1.024 đối tác</div>
          <span className="text-[11px] text-[#00875A] font-medium block mt-0.5">100% có giấy phép ĐKKD</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-gray-500 font-semibold">Gian Hàng Official Mall</span>
          <div className="text-xl font-bold text-emerald-800 mt-1">52 thương hiệu</div>
          <span className="text-[11px] text-gray-400 font-medium block mt-0.5">Doanh số &gt; 200tr/tháng</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-gray-500 font-semibold">Hồ Sơ Chờ Thẩm Định</span>
          <div className="text-xl font-bold text-amber-600 mt-1">18 hồ sơ mới</div>
          <span className="text-[11px] text-amber-600 font-medium block mt-0.5">Cần duyệt trong 24h</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs text-gray-500 font-semibold">Tổng Doanh Thu Chia Sẻ</span>
          <div className="text-xl font-bold text-[#16A34A] mt-1">₫2.108.000.000</div>
          <span className="text-[11px] text-gray-400 font-medium block mt-0.5">85% thanh toán cho NXB</span>
        </div>
      </div>

      {/* 3. TABLE FILTER & SEARCH */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFBFD]">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'all', label: 'Tất cả NXB (1.024)' },
              { id: 'mall', label: 'Official Mall (52)' },
              { id: 'pending', label: 'Chờ thẩm định (18)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#00875A] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Tìm tên NXB, mã số ĐKKD..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-[#E2E8F0] text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A]"
            />
          </div>
        </div>

        {/* 4. PUBLISHER LIST TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#F8FAFC] text-[11px] uppercase font-bold text-gray-400 border-b border-[#F1F5F9]">
              <tr>
                <th className="py-3 px-4">Nhà Xuất Bản / Đơn Vị</th>
                <th className="py-3 px-4">Giấy Phép ĐKKD</th>
                <th className="py-3 px-4">Quy Mô Phát Hành</th>
                <th className="py-3 px-4">Doanh Thu Tháng</th>
                <th className="py-3 px-4">Tỷ Lệ Chia Sẻ</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredPublishers.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#EBF7F2] text-[#00875A] font-bold text-xs flex items-center justify-center shrink-0 border border-[#BDE6D7]">
                        {p.code.substring(0, 3)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 hover:text-[#00875A] transition-colors">{p.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                          <span>{p.rep}</span>
                          <span>•</span>
                          <span>{p.phone}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600">
                    <div>{p.license}</div>
                    <span className="text-[10px] text-gray-400">Gia nhập: {p.joinedDate}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-gray-800">{p.bookCount}</div>
                    <span className="text-[10px] text-[#00875A] font-medium">{p.ebookDrmCount} DRM</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-900 text-[13px]">
                    {p.revenue}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-gray-600">
                    {p.split}
                  </td>
                  <td className="py-3.5 px-4">
                    {p.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        {p.badge}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10.5px] font-bold animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                        {p.badge}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {p.status === 'pending' ? (
                        <button
                          onClick={() => showToast(`Đã duyệt thành công hồ sơ ${p.name}!`, 'success')}
                          className="px-3 py-1.5 rounded-lg bg-[#00875A] text-white text-xs font-bold hover:bg-[#00734c] transition-all cursor-pointer"
                        >
                          Duyệt Ngay
                        </button>
                      ) : (
                        <button
                          onClick={() => showToast(`Xem chi tiết gian hàng ${p.name}`, 'info')}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Xem hồ sơ
                        </button>
                      )}
                    </div>
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
