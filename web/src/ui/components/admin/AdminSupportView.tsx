"use client";
import React, { useState, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import { useSmartFormCollapse } from '../../utils/formHooks';
import {
  AdminStatusBadge,
  AdminFilterTabs,
  AdminPagination,
  AdminTableContainer,
} from './AdminUI';

export function AdminSupportView() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const ticketPanelRef = useSmartFormCollapse({
    isOpen: Boolean(selectedTicket),
    onClose: () => setSelectedTicket(null),
    isDirty: false,
  });

  const [tickets, setTickets] = useState([
    {
      id: 'TCK-8812',
      sender: 'Nguyễn Văn Hùng',
      email: 'hung.nguyen@gmail.com',
      category: 'Yêu Cầu Reset Thiết Bị DRM',
      priority: 'high',
      title: 'Mất điện thoại iPhone 15 Pro, cần hủy liên kết để đọc trên máy mới',
      content: 'Chào ban quản trị HUKI, tôi bị mất máy cũ tuần trước, hiện tại tài khoản báo đã đạt giới hạn 5 thiết bị. Kính nhờ admin gỡ thiết bị cũ giúp tôi.',
      status: 'pending',
      statusLabel: 'Chờ Xử Lý',
      createdAt: '11/06/2026 - 15:10'
    },
    {
      id: 'TCK-8811',
      sender: 'Nhà Xuất Bản Trẻ (Pháp chế)',
      email: 'legal@nxbtre.com.vn',
      category: 'Khiếu Nại Bản Quyền',
      priority: 'urgent',
      title: 'Yêu cầu kiểm tra tác phẩm có dấu hiệu trùng nội dung dịch thuật',
      content: 'Kính gửi Super Admin HUKI, chúng tôi phát hiện 1 tựa sách của gian hàng tự do có 80% câu chữ trùng với bản dịch độc quyền của NXB Trẻ.',
      status: 'investigating',
      statusLabel: 'Đang Xác Minh Pháp Lý',
      createdAt: '10/06/2026 - 17:30'
    },
    {
      id: 'TCK-8810',
      sender: 'Trần Thị Mai Anh',
      email: 'maianh.tran@outlook.com',
      category: 'Đổi Trả Sách Giấy Hỏng Hóc',
      priority: 'normal',
      title: 'Sách in bị rách bìa trong quá trình vận chuyển đơn #ORD-8821',
      content: 'Tôi nhận được sách giấy giao 2h nhưng góc bìa bị dập nát do mưa. Đã đính kèm ảnh chụp kiện hàng.',
      status: 'resolved',
      statusLabel: 'Đã Bồi Hoàn 100%',
      createdAt: '09/06/2026 - 11:20'
    }
  ]);

  const handleResolve = (id: any, resolution: any) => {
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status: 'resolved', statusLabel: 'Đã Giải Quyết' };
      }
      return t;
    }));
    showToast?.(`Đã xử lý thành công ticket ${id}: ${resolution}`, 'success');
    setSelectedTicket(null);
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (activeTab === 'pending' && t.status !== 'pending') return false;
      if (activeTab === 'investigating' && t.status !== 'investigating') return false;
      if (activeTab === 'resolved' && t.status !== 'resolved') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.id.toLowerCase().includes(q) ||
          t.sender.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tickets, activeTab, searchQuery]);

  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1;
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  const tabs = [
    { key: 'all', label: 'Tất Cả Phiếu', count: tickets.length },
    { key: 'pending', label: 'Chờ Xử Lý', count: tickets.filter(t => t.status === 'pending').length },
    { key: 'investigating', label: 'Đang Xác Minh', count: tickets.filter(t => t.status === 'investigating').length },
    { key: 'resolved', label: 'Đã Giải Quyết', count: tickets.filter(t => t.status === 'resolved').length },
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto font-sans animate-in fade-in duration-200">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial">
            Hỗ Trợ &amp; Xử Lý Khiếu Nại
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Tiếp nhận và giải quyết yêu cầu kỹ thuật DRM, khiếu nại bản quyền và hỗ trợ đơn hàng</p>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Yêu Cầu Chờ Xử Lý</span>
          <div className="text-2xl font-extrabold text-amber-600 font-editorial mt-1">
            {tickets.filter(t => t.status === 'pending').length} Phiếu
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">Thời gian phản hồi TB: 14 phút</span>
        </div>
        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Đang Xác Minh Pháp Lý</span>
          <div className="text-2xl font-extrabold text-blue-600 font-editorial mt-1">
            {tickets.filter(t => t.status === 'investigating').length} Vụ Việc
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">Khiếu nại bản quyền NXB</span>
        </div>
        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Đã Xử Lý Thành Công</span>
          <div className="text-2xl font-extrabold text-emerald-600 font-editorial mt-1">156 Phiếu</div>
          <span className="text-[11px] text-emerald-600 font-bold mt-1 block">Tỷ lệ hài lòng 98.6%</span>
        </div>
      </div>

      {/* 3. TICKETS LIST TABLE */}
      <AdminTableContainer>
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
          <AdminFilterTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(key) => {
              setActiveTab(key);
              setCurrentPage(1);
            }}
          />

          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, người gửi, tiêu đề..."
              value={searchQuery}
              onChange={(e: any) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
            <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-3.5 whitespace-nowrap w-12 text-center">STT</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Mã Phiếu</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Người Gửi &amp; Email</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Phân Loại Khiếu Nại</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Tiêu Đề Yêu Cầu</th>
                <th className="py-3 px-3.5 whitespace-nowrap">Thời Gian Gửi</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-center">Trạng Thái</th>
                <th className="py-3 px-3.5 whitespace-nowrap text-right pr-4">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-normal">
              {paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <span className="material-symbols-outlined text-4xl text-gray-300 block mb-1">inbox</span>
                    Không tìm thấy phiếu hỗ trợ nào phù hợp
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((t, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={t.id}
                      className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}
                    >
                      <td className="py-3 px-3.5 whitespace-nowrap text-center text-[11px] font-mono text-gray-400">
                        {itemIndex}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold text-gray-900">
                        #{t.id}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-bold text-gray-900 text-xs">{t.sender}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{t.email}</div>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-800 font-bold text-[10.5px]">
                          {t.category}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap max-w-xs truncate">
                        <span className="font-bold text-gray-900">{t.title}</span>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-500 text-[11px]">
                        {t.createdAt}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        <AdminStatusBadge
                          status={t.status === 'resolved' ? 'RESOLVED' : t.status === 'pending' ? 'PENDING' : 'INVESTIGATING'}
                          label={t.statusLabel}
                        />
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap text-right pr-4">
                        <button
                          onClick={() => setSelectedTicket(t)}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-[#00875A] hover:text-white text-gray-800 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Xử Lý
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
          totalItems={filteredTickets.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="phiếu hỗ trợ"
        />
      </AdminTableContainer>

      {/* 4. DETAIL IN-PAGE COLLAPSIBLE PANEL */}
      {selectedTicket && (
        <div ref={ticketPanelRef} className="mt-6 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-indigo-500/20 space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
              #{selectedTicket.id} · {selectedTicket.category}
            </span>
            <button
              onClick={() => setSelectedTicket(null)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              ✕ Đóng bảng
            </button>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
              {selectedTicket.title}
            </h3>
            <div className="text-xs text-gray-500 mt-1">Người gửi: <strong className="text-gray-800">{selectedTicket.sender}</strong></div>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-700 leading-relaxed italic">
            "{selectedTicket.content}"
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Đóng lại
            </button>
            {selectedTicket.category.includes('DRM') ? (
              <button
                onClick={() => handleResolve(selectedTicket.id, 'Đã thu hồi 1 thiết bị cũ và cấp quyền kích hoạt máy mới')}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
              >
                Gỡ Thiết Bị DRM Cũ &amp; Cấp Lại
              </button>
            ) : selectedTicket.category.includes('Bản Quyền') ? (
              <button
                onClick={() => handleResolve(selectedTicket.id, 'Đã chuyển hồ sơ cho Cục Bản Quyền Tác Giả đối soát')}
                className="px-5 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
              >
                Khóa Tạm Tác Phẩm Để Xác Minh
              </button>
            ) : (
              <button
                onClick={() => handleResolve(selectedTicket.id, 'Đã hoàn tiền 100% về ví HukiXu cho bạn đọc')}
                className="px-5 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
              >
                Xác Nhận Bồi Hoàn 100%
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminSupportView;
