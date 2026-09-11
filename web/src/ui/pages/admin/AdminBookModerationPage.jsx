import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function AdminBookModerationPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [inspectingBook, setInspectingBook] = useState(null);
  const [isDrmPreviewOpen, setIsDrmPreviewOpen] = useState(false);
  const [rejectReasonModal, setRejectReasonModal] = useState(null);
  const [customReason, setCustomReason] = useState('');

  const [queueItems, setQueueItems] = useState([
    {
      id: 'MOD-8821',
      title: 'Kinh Tế Học Hành Vi - Ứng Dụng Trong Kỷ Nguyên Số',
      publisher: 'Nhà Xuất Bản Trẻ',
      publisherCode: 'TRE',
      publisherLogo: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100&auto=format&fit=crop&q=80',
      cover: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=300&auto=format&fit=crop&q=80',
      author: 'PGS. TS. Trần Minh Tuấn',
      format: 'hybrid',
      formatLabel: 'Combo Sách Giấy + Ebook DRM',
      isbn: '978-604-1-23845-6',
      licenseNo: 'QĐXB-892/QĐ-NXBTRE-2026',
      price: 245000,
      ebookPrice: 99000,
      submittedAt: '11/06/2026 - 14:30',
      status: 'pending',
      statusLabel: 'Chờ kiểm duyệt',
      drmStatus: 'Đã mã hóa AES-256 (Hợp lệ)',
      samplePages: 18,
      totalPages: 384,
      fileSize: '24.6 MB (EPUB + PDF Fixed)',
      urgency: 'high',
      notes: 'Hồ sơ bản quyền đầy đủ, tem chống giả điện tử sẵn sàng.'
    },
    {
      id: 'MOD-8822',
      title: 'Tâm Lý Học Về Tiền (Tái Bản Có Bổ Sung 2026)',
      publisher: 'Alpha Books Official',
      publisherCode: 'ALPHABOOKS',
      publisherLogo: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=100&auto=format&fit=crop&q=80',
      cover: 'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=300&auto=format&fit=crop&q=80',
      author: 'Morgan Housel (Dịch: Lê Đình Triều)',
      format: 'ebook',
      formatLabel: 'Ebook Độc Quyền DRM',
      isbn: '978-604-77-9912-1',
      licenseNo: 'QĐXB-104/QĐ-NXBTT-2026',
      price: 120000,
      ebookPrice: 79000,
      submittedAt: '11/06/2026 - 11:15',
      status: 'pending',
      statusLabel: 'Chờ kiểm duyệt',
      drmStatus: 'Đã nhúng Watermark động',
      samplePages: 25,
      totalPages: 312,
      fileSize: '14.2 MB (EPUB Reflowable)',
      urgency: 'normal',
      notes: 'Đã đính kèm Hợp đồng nhượng quyền tác giả gốc Harriman House.'
    },
    {
      id: 'MOD-8823',
      title: 'Chiến Tranh Tiền Tệ - Tập 5: Kỷ Nguyên Tiền Mã Hóa',
      publisher: 'Nhã Nam Books',
      publisherCode: 'NHANAM',
      publisherLogo: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=100&auto=format&fit=crop&q=80',
      cover: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=300&auto=format&fit=crop&q=80',
      author: 'Song Hongbing',
      format: 'physical',
      formatLabel: 'Sách Giấy Bìa Cứng',
      isbn: '978-604-2-18490-3',
      licenseNo: 'QĐXB-441/QĐ-NXBHNV-2026',
      price: 280000,
      ebookPrice: null,
      submittedAt: '10/06/2026 - 16:45',
      status: 'pending',
      statusLabel: 'Chờ kiểm duyệt',
      drmStatus: 'Không áp dụng (Sách in)',
      samplePages: 0,
      totalPages: 520,
      fileSize: 'N/A (Sách vật lý)',
      urgency: 'normal',
      notes: 'Kho sách tại Hà Nội & TP.HCM cam kết giao 2h chuẩn HUKI Fast.'
    },
    {
      id: 'MOD-8820',
      title: 'Trí Tuệ Nhân Tạo & Tương Lai Nhân Loại 2030',
      publisher: 'First News - Trí Việt',
      publisherCode: 'FIRSTNEWS',
      publisherLogo: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=100&auto=format&fit=crop&q=80',
      cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&auto=format&fit=crop&q=80',
      author: 'Dr. Max Tegmark (Dịch: Hoàng Uyên)',
      format: 'hybrid',
      formatLabel: 'Combo Sách Giấy + Ebook DRM',
      isbn: '978-604-56-7810-0',
      licenseNo: 'QĐXB-312/QĐ-NXBTG-2026',
      price: 320000,
      ebookPrice: 145000,
      submittedAt: '10/06/2026 - 09:20',
      status: 'need_update',
      statusLabel: 'Cần bổ sung thông tin',
      drmStatus: 'Chờ cập nhật chứng chỉ ký số',
      samplePages: 12,
      totalPages: 440,
      fileSize: '32.1 MB',
      urgency: 'high',
      notes: 'Thiếu trang bản quyền tiếng Việt ghi nhận đơn vị phát hành HUKI.'
    },
    {
      id: 'MOD-8819',
      title: 'Tư Duy Ngược Để Thành Công Vượt Trội',
      publisher: 'Nhà Sách Minh Long',
      publisherCode: 'MINHLONG',
      publisherLogo: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100&auto=format&fit=crop&q=80',
      cover: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=300&auto=format&fit=crop&q=80',
      author: 'Nguyễn Anh Dũng',
      format: 'ebook',
      formatLabel: 'Ebook DRM',
      isbn: '978-604-89-1120-4',
      licenseNo: 'QĐXB-190/QĐ-NXBLD-2026',
      price: 95000,
      ebookPrice: 59000,
      submittedAt: '09/06/2026 - 15:10',
      status: 'approved',
      statusLabel: 'Đã phê duyệt',
      drmStatus: 'Đã cấp khóa bảo vệ & lên sàn',
      samplePages: 15,
      totalPages: 260,
      fileSize: '8.4 MB',
      urgency: 'low',
      notes: 'Đã lên kệ phân phối chính thức từ 10/06/2026.'
    },
    {
      id: 'MOD-8818',
      title: 'Cổ Phiếu Thường Lợi Nhuận Phi Thường',
      publisher: 'Alpha Books Official',
      publisherCode: 'ALPHABOOKS',
      publisherLogo: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=100&auto=format&fit=crop&q=80',
      cover: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300&auto=format&fit=crop&q=80',
      author: 'Philip A. Fisher',
      format: 'hybrid',
      formatLabel: 'Combo Sách Giấy + Ebook DRM',
      isbn: '978-604-77-8890-2',
      licenseNo: 'QĐXB-554/QĐ-NXBTT-2026',
      price: 199000,
      ebookPrice: 85000,
      submittedAt: '09/06/2026 - 10:00',
      status: 'approved',
      statusLabel: 'Đã phê duyệt',
      drmStatus: 'Đã cấp khóa bảo vệ & lên sàn',
      samplePages: 20,
      totalPages: 340,
      fileSize: '19.8 MB',
      urgency: 'low',
      notes: 'Đã tích hợp Fast 2H Delivery toàn quốc.'
    }
  ]);

  const handleApprove = (bookId) => {
    setQueueItems(prev => prev.map(item => {
      if (item.id === bookId) {
        return { ...item, status: 'approved', statusLabel: 'Đã phê duyệt' };
      }
      return item;
    }));
    showToast('Đã phê duyệt và kích hoạt phân phối toàn sàn HUKI!', 'success');
    setInspectingBook(null);
  };

  const handleRequestEdit = (bookId) => {
    setQueueItems(prev => prev.map(item => {
      if (item.id === bookId) {
        return { ...item, status: 'need_update', statusLabel: 'Cần bổ sung thông tin' };
      }
      return item;
    }));
    showToast('Đã gửi thông báo yêu cầu NXB chỉnh sửa giấy phép!', 'info');
    setInspectingBook(null);
  };

  const handleReject = (bookId, reason) => {
    setQueueItems(prev => prev.map(item => {
      if (item.id === bookId) {
        return { ...item, status: 'rejected', statusLabel: 'Từ chối phát hành', rejectReason: reason };
      }
      return item;
    }));
    showToast(`Đã từ chối phát hành tựa sách: ${reason}`, 'warning');
    setRejectReasonModal(null);
    setInspectingBook(null);
  };

  const filteredItems = queueItems.filter(item => {
    if (activeTab !== 'all' && item.status !== activeTab) return false;
    if (selectedFormat !== 'all' && item.format !== selectedFormat) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.publisher.toLowerCase().includes(q) ||
        item.isbn.toLowerCase().includes(q) ||
        item.licenseNo.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = queueItems.filter(i => i.status === 'pending').length;
  const needUpdateCount = queueItems.filter(i => i.status === 'need_update').length;
  const approvedCount = queueItems.filter(i => i.status === 'approved').length;

  return (
    <div className="flex flex-col gap-6 max-w-[1480px] mx-auto">
      
      {/* 1. TOP HEADER & METRICS SUMMARY */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-500">Ban Kiểm Duyệt &amp; Pháp Lý</span>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
              HÀNG CHỜ KIỂM DUYỆT • DRM VAULT
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Kiểm Duyệt Sách Mới &amp; Bản Quyền Số
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Xác minh giấy phép xuất bản (QĐXB), mã ISBN quốc gia, chuẩn hóa file Ebook DRM và cấp phép phát hành toàn sàn.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-xs font-semibold text-gray-700 shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Mã hóa DRM: Chuẩn AES-GCM-256</span>
          </div>

          <button 
            onClick={() => showToast('Đang quét tự động kiểm tra ISBN trùng lặp...', 'info')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
            <span>Quét ISBN Tự Động</span>
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Chờ Kiểm Duyệt Ngay</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
              {pendingCount}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">{pendingCount} Tựa Sách</div>
          <div className="mt-2 text-xs text-amber-700 font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            <span>Thời gian phản hồi cam kết &lt; 4h</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Cần Bổ Sung Giấy Phép</span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
              {needUpdateCount}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">{needUpdateCount} Tựa Sách</div>
          <div className="mt-2 text-xs text-rose-700 font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">error</span>
            <span>Chờ NXB tải lên QĐXB chỉnh sửa</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Đã Lên Kệ Tuần Này</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              {approvedCount}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">142 Đầu Sách</div>
          <div className="mt-2 text-xs text-emerald-700 font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            <span>100% bảo vệ DRM thành công</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Tỷ Lệ Duyệt Thành Công</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              96.8%
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">96.8%</div>
          <div className="mt-2 text-xs text-blue-700 font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">verified_user</span>
            <span>Chuẩn hóa nội dung nghiêm ngặt</span>
          </div>
        </div>

      </div>

      {/* 3. FILTERS, SEARCH & FORMAT TABS */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3.5">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl w-full md:w-auto overflow-x-auto">
          {[
            { key: 'pending', label: 'Chờ duyệt', count: pendingCount },
            { key: 'need_update', label: 'Cần bổ sung', count: needUpdateCount },
            { key: 'approved', label: 'Đã duyệt', count: approvedCount },
            { key: 'all', label: 'Tất cả hồ sơ', count: queueItems.length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-xs border border-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === tab.key ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Format Filter */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Format Select */}
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#00875A]"
          >
            <option value="all">Mọi Định Dạng</option>
            <option value="hybrid">Combo Sách Giấy + Ebook DRM</option>
            <option value="ebook">Ebook DRM Độc Quyền</option>
            <option value="physical">Sách Giấy In Truyền Thống</option>
          </select>

          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Tìm tên sách, ISBN, NXB..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
            />
          </div>
        </div>

      </div>

      {/* 4. MODERATION QUEUE TABLE */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3.5 px-4">Tác Phẩm &amp; Nhà Xuất Bản</th>
                <th className="py-3.5 px-3">Định Dạng &amp; DRM</th>
                <th className="py-3.5 px-3">Mã ISBN &amp; Quyết Định XB</th>
                <th className="py-3.5 px-3">Giá Niêm Yết</th>
                <th className="py-3.5 px-3">Thời Gian Gửi</th>
                <th className="py-3.5 px-3">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-400">
                    <span className="material-symbols-outlined text-4xl mb-2 text-gray-300">find_in_page</span>
                    <p className="font-semibold text-sm">Không tìm thấy hồ sơ sách nào phù hợp điều kiện lọc.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F9FAFB] transition-colors group">
                    {/* Title & Publisher */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={item.cover} 
                          alt={item.title} 
                          className="w-11 h-15 object-cover rounded-lg shadow-2xs border border-gray-200 shrink-0"
                        />
                        <div className="flex flex-col max-w-[280px]">
                          <span className="font-bold text-gray-900 line-clamp-1 group-hover:text-[#00875A] transition-colors text-[13px]">
                            {item.title}
                          </span>
                          <span className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                            Tác giả: <strong className="text-gray-700">{item.author}</strong>
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-bold text-[10px]">
                              {item.publisher}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">#{item.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Format & DRM */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                          item.format === 'hybrid' ? 'text-emerald-700' :
                          item.format === 'ebook' ? 'text-purple-700' : 'text-blue-700'
                        }`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {item.format === 'hybrid' ? 'auto_stories' : item.format === 'ebook' ? 'devices' : 'menu_book'}
                          </span>
                          {item.formatLabel}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {item.drmStatus}
                        </span>
                      </div>
                    </td>

                    {/* ISBN & License */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-0.5 font-mono">
                        <div className="flex items-center gap-1 text-[11px] text-gray-800 font-semibold">
                          <span className="material-symbols-outlined text-[13px] text-gray-400">barcode</span>
                          <span>{item.isbn}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 truncate max-w-[180px]">
                          {item.licenseNo}
                        </span>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-gray-900 text-xs">
                          {item.price.toLocaleString()}₫
                        </span>
                        {item.ebookPrice && (
                          <span className="text-[10px] text-[#00875A] font-semibold">
                            Ebook: {item.ebookPrice.toLocaleString()}₫
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-3 text-gray-500 text-[11px]">
                      {item.submittedAt}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        item.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        item.status === 'need_update' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        item.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'pending' ? 'bg-amber-500 animate-pulse' :
                          item.status === 'need_update' ? 'bg-rose-500' :
                          item.status === 'approved' ? 'bg-emerald-500' : 'bg-gray-400'
                        }`}></span>
                        {item.statusLabel}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectingBook(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">visibility</span>
                          <span>Thẩm Định</span>
                        </button>

                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleApprove(item.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Phê duyệt nhanh"
                          >
                            <span className="material-symbols-outlined text-[15px]">check</span>
                            <span>Duyệt</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        <div className="p-4 border-t border-gray-100 bg-[#F8FAFC] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            Hiển thị <strong className="text-gray-800">{filteredItems.length}</strong> / {queueItems.length} tựa sách trong hàng chờ kiểm duyệt
          </div>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-semibold cursor-pointer disabled:opacity-50">
              Trang trước
            </button>
            <span className="px-3 py-1.5 bg-[#00875A] text-white rounded-lg font-bold">1</span>
            <button className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-semibold cursor-pointer">
              Trang sau
            </button>
          </div>
        </div>
      </div>

      {/* 5. QUICK INSPECTION SLIDE-OVER DRAWER */}
      {inspectingBook && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setInspectingBook(null)}
          ></div>

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-300">
              
              {/* Drawer Header */}
              <div className="px-6 py-5 bg-[#F8FAFC] border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#00875A] flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[20px]">verified</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Thẩm Định Bản Quyền &amp; Xuất Bản</h2>
                    <span className="text-xs font-mono text-gray-500">Mã hồ sơ: {inspectingBook.id}</span>
                  </div>
                </div>
                <button
                  onClick={() => setInspectingBook(null)}
                  className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Drawer Body Scroll */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-gray-700">
                
                {/* Book Card Highlight */}
                <div className="flex gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
                  <img
                    src={inspectingBook.cover}
                    alt={inspectingBook.title}
                    className="w-20 h-28 object-cover rounded-xl shadow-sm border border-gray-200 shrink-0"
                  />
                  <div className="flex flex-col justify-between">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded bg-[#00875A]/10 text-[#00875A] font-extrabold text-[10px] uppercase">
                        {inspectingBook.formatLabel}
                      </span>
                      <h3 className="text-sm font-extrabold text-gray-900 mt-1 leading-snug">
                        {inspectingBook.title}
                      </h3>
                      <p className="text-gray-500 text-xs mt-0.5">Tác giả: <strong>{inspectingBook.author}</strong></p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-base font-extrabold text-[#00875A]">{inspectingBook.price.toLocaleString()}₫</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500">{inspectingBook.totalPages} trang</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500">{inspectingBook.fileSize}</span>
                    </div>
                  </div>
                </div>

                {/* Legal & Publishing Verification Box */}
                <div>
                  <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[#00875A]">gavel</span>
                    1. Xác Minh Pháp Lý &amp; Cục Xuất Bản
                  </h4>
                  <div className="grid grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-gray-200">
                    <div>
                      <span className="text-gray-400 text-[11px] block">Mã ISBN Quốc Tế</span>
                      <span className="font-mono font-bold text-gray-900 text-xs">{inspectingBook.isbn}</span>
                      <span className="text-emerald-600 text-[10px] font-semibold block mt-0.5">✓ Đã đối chiếu Cục Xuất Bản</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[11px] block">Số Quyết Định Xuất Bản</span>
                      <span className="font-mono font-bold text-gray-900 text-xs">{inspectingBook.licenseNo}</span>
                      <span className="text-emerald-600 text-[10px] font-semibold block mt-0.5">✓ Tem hợp chuẩn Bộ TTTT</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[11px] block">Đơn Vị Xuất Bản</span>
                      <span className="font-bold text-gray-900 text-xs">{inspectingBook.publisher}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[11px] block">Mã Nhà Xuất Bản Sàn</span>
                      <span className="font-mono font-bold text-gray-900 text-xs">{inspectingBook.publisherCode}</span>
                    </div>
                  </div>
                </div>

                {/* DRM Protection & Watermark Engine Box */}
                <div>
                  <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-purple-600">lock</span>
                    2. Kiểm Tra Mã Hóa DRM &amp; Thử Nghiệm Đọc Thử
                  </h4>
                  <div className="bg-purple-50/50 border border-purple-200 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-purple-950 text-xs">Mã hóa bản quyền DRM SHA-256 AES-GCM</div>
                        <p className="text-purple-700 text-[11px] mt-0.5">Watermark động nhúng Email độc giả khi mở sách trên Web/App</p>
                      </div>
                      <span className="px-2 py-1 rounded bg-purple-600 text-white font-mono font-bold text-[10px]">
                        DRM PASSED
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-purple-200/60">
                      <span className="text-purple-900 font-medium">Bản đọc thử cấp phép: <strong>{inspectingBook.samplePages} trang</strong></span>
                      <button
                        onClick={() => setIsDrmPreviewOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[15px]">auto_stories</span>
                        <span>Mở Trình Đọc DRM Thử Nghiệm</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes from Publisher */}
                <div>
                  <h4 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-gray-500">notes</span>
                    3. Ghi Chú Của Nhà Xuất Bản
                  </h4>
                  <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-xs italic">
                    "{inspectingBook.notes}"
                  </div>
                </div>

              </div>

              {/* Drawer Footer Actions */}
              <div className="p-5 bg-white border-t border-gray-200 flex items-center justify-between gap-3">
                <button
                  onClick={() => setRejectReasonModal(inspectingBook)}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  Từ Chối Phát Hành
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRequestEdit(inspectingBook.id)}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Yêu Cầu Bổ Sung Giấy Phép
                  </button>

                  <button
                    onClick={() => handleApprove(inspectingBook.id)}
                    className="px-5 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Phê Duyệt &amp; Phát Hành Toàn Sàn</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* 6. DRM PREVIEW MODAL */}
      {isDrmPreviewOpen && inspectingBook && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsDrmPreviewOpen(false)}
          ></div>
          <div className="relative w-full max-w-4xl bg-[#1E293B] text-white rounded-3xl overflow-hidden shadow-2xl border border-gray-700 flex flex-col h-[85vh]">
            
            {/* DRM Header Bar */}
            <div className="px-6 py-4 bg-[#0F172A] border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-400 text-[24px]">lock</span>
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    {inspectingBook.title}
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded">
                      DRM ENCRYPTED SAMPLE
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    Mã khóa phiên đọc: #DRM-KEY-99281-AUTH-SUPERADMIN
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsDrmPreviewOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* DRM Simulated Reader Viewport */}
            <div className="flex-1 bg-[#F8FAFC] text-gray-900 p-8 overflow-y-auto relative select-none">
              {/* Security Watermark Background */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 rotate-[-25deg]">
                <div className="text-4xl font-extrabold text-gray-900 tracking-widest text-center">
                  HUKI EBOOK DRM PROTECTED<br />
                  SUPER ADMIN AUDIT 2026<br />
                  {inspectingBook.isbn}
                </div>
              </div>

              {/* Sample Content Simulation */}
              <div className="max-w-2xl mx-auto space-y-6 font-serif text-sm leading-relaxed text-gray-800">
                <div className="text-center py-6 border-b border-gray-200">
                  <span className="text-xs uppercase font-sans text-gray-400 tracking-widest">Trang Bản Quyền Số</span>
                  <h1 className="text-2xl font-bold font-editorial text-gray-900 mt-2">{inspectingBook.title}</h1>
                  <p className="text-sm font-sans text-gray-600 mt-1">Tác giả: {inspectingBook.author}</p>
                  <p className="text-xs font-sans text-[#00875A] font-bold mt-1">Bản quyền phát hành thuộc về {inspectingBook.publisher}</p>
                </div>

                <h2 className="text-lg font-bold text-gray-900 font-editorial">CHƯƠNG 1: BƯỚC KHỞI ĐẦU</h2>
                <p>
                  Trong thế giới kinh tế học hiện đại, việc thấu hiểu hành vi con người không chỉ dừng lại ở các phương trình toán học khô khan hay những biểu đồ cung cầu truyền thống. Thực tế chứng minh rằng mọi quyết định tài chính lớn lao đều bị chi phối sâu sắc bởi cảm xúc, định kiến nhận thức và bối cảnh tâm lý của từng cá nhân...
                </p>
                <p>
                  Khi chúng ta phân tích các chu kỳ thị trường trong suốt một thế kỷ qua, điểm chung lớn nhất không nằm ở công nghệ hay các công cụ tài chính tối tân, mà nằm ở bản chất tâm lý con người vốn ít khi thay đổi. Lòng tham, nỗi sợ hãi, niềm hy vọng và sự hoài nghi luôn lặp lại dưới những hình thức mới...
                </p>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 font-sans text-xs text-amber-900">
                  <strong>Thông tin DRM:</strong> File mã hóa hiển thị chuẩn xác phông chữ tiếng Việt, không phát hiện lỗi vỡ layout hoặc thiếu dấu phụ âm.
                </div>
              </div>
            </div>

            {/* DRM Footer Bar */}
            <div className="px-6 py-3 bg-[#0F172A] border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
              <span>Trang 1 / {inspectingBook.samplePages} (Bản đọc thử kiểm duyệt)</span>
              <button
                onClick={() => {
                  setIsDrmPreviewOpen(false);
                  handleApprove(inspectingBook.id);
                }}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Xác Nhận Đạt Chuẩn DRM &amp; Phê Duyệt
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. REJECT REASON MODAL */}
      {rejectReasonModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setRejectReasonModal(null)}
          ></div>
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-2">Lý Do Từ Chối Phát Hành</h3>
            <p className="text-xs text-gray-500 mb-4">
              Chọn lý do cụ thể để hệ thống gửi thông báo phản hồi chính thức cho <strong>{rejectReasonModal.publisher}</strong>.
            </p>

            <div className="space-y-2 mb-4">
              {[
                'Mã ISBN không khớp với dữ liệu đăng ký tại Cục Xuất Bản',
                'Thiếu hợp đồng nhượng quyền tác phẩm từ tác giả / NXB quốc tế',
                'File Ebook mã hóa lỗi font hoặc chất lượng hình ảnh không đạt chuẩn',
                'Nội dung có dấu hiệu vi phạm chính sách kiểm duyệt bản quyền'
              ].map((reason, idx) => (
                <label key={idx} className="flex items-start gap-2 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer text-xs text-gray-700">
                  <input
                    type="radio"
                    name="rejectReason"
                    value={reason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="mt-0.5 text-[#00875A] focus:ring-[#00875A]"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <textarea
              placeholder="Ghi chú chi tiết thêm cho NXB (không bắt buộc)..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-rose-500 mb-4 h-20"
            ></textarea>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectReasonModal(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-xs cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={() => handleReject(rejectReasonModal.id, customReason || 'Không đạt chuẩn quy định')}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Xác Nhận Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
