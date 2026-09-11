import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';

export default function AdminSupportPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [tickets, setTickets] = useState([
    {
      id: 'TCK-8812',
      sender: 'Nguyễn Văn Hùng (hung.nguyen@gmail.com)',
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
      category: 'Đổi Trả Sách Giấy Hỏng Hóc',
      priority: 'normal',
      title: 'Sách in bị rách bìa trong quá trình vận chuyển đơn #ORD-8821',
      content: 'Tôi nhận được sách giấy giao 2h nhưng góc bìa bị dập nát do mưa. Đã đính kèm ảnh chụp kiện hàng.',
      status: 'resolved',
      statusLabel: 'Đã Bồi Hoàn 100%',
      createdAt: '09/06/2026 - 11:20'
    }
  ]);

  const handleResolve = (id, resolution) => {
    setTickets(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status: 'resolved', statusLabel: 'Đã Giải Quyết' };
      }
      return t;
    }));
    showToast(`Đã xử lý thành công ticket ${id}: ${resolution}`, 'success');
    setSelectedTicket(null);
  };

  const filteredTickets = tickets.filter(t => {
    if (activeTab === 'pending' && t.status !== 'pending') return false;
    if (activeTab === 'resolved' && t.status !== 'resolved') return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
      
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-500">Tiếp Nhận &amp; Xử Lý Tranh Chấp</span>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
              TRUNG TÂM KHIẾU NẠI TOÀN SÀN
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Hỗ Trợ Bạn Đọc &amp; Giải Quyết Tranh Chấp Bản Quyền
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Tiếp nhận khiếu nại bản quyền từ NXB, hỗ trợ bạn đọc gỡ thiết bị DRM cũ và điều phối đổi trả bồi hoàn đơn hàng.
          </p>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs font-semibold text-gray-500">Yêu Cầu Chờ Xử Lý</span>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">1 Phiếu</div>
          <span className="text-xs text-gray-400 mt-1 block">Thời gian phản hồi TB: 14 phút</span>
        </div>
        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs font-semibold text-gray-500">Đang Xác Minh Pháp Lý</span>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">1 Vụ Việc</div>
          <span className="text-xs text-gray-400 mt-1 block">Khiếu nại bản quyền NXB</span>
        </div>
        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <span className="text-xs font-semibold text-gray-500">Đã Xử Lý Thành Công</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">156 Phiếu</div>
          <span className="text-xs text-emerald-600 font-bold mt-1 block">Tỷ lệ hài lòng 98.6%</span>
        </div>
      </div>

      {/* 3. TICKETS LIST */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs text-gray-600">
          <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
            <tr>
              <th className="py-3.5 px-4">Mã Phiếu &amp; Người Gửi</th>
              <th className="py-3.5 px-3">Phân Loại Khiếu Nại</th>
              <th className="py-3.5 px-3">Tiêu Đề Yêu Cầu</th>
              <th className="py-3.5 px-3">Thời Gian Gửi</th>
              <th className="py-3.5 px-3">Trạng Thái</th>
              <th className="py-3.5 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTickets.map(t => (
              <tr key={t.id} className="hover:bg-[#F9FAFB] transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex flex-col">
                    <span className="font-mono font-bold text-gray-900">#{t.id}</span>
                    <span className="text-[11px] text-gray-500">{t.sender}</span>
                  </div>
                </td>

                <td className="py-3.5 px-3">
                  <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-800 font-bold text-[10px]">
                    {t.category}
                  </span>
                </td>

                <td className="py-3.5 px-3">
                  <span className="font-bold text-gray-900 line-clamp-1">{t.title}</span>
                </td>

                <td className="py-3.5 px-3 text-gray-500">{t.createdAt}</td>

                <td className="py-3.5 px-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    t.status === 'resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    t.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {t.statusLabel}
                  </span>
                </td>

                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => setSelectedTicket(t)}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-[#00875A] hover:text-white text-gray-800 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Xử Lý
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. DETAIL MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setSelectedTicket(null)}
          ></div>
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-xs">
                #{selectedTicket.id} · {selectedTicket.category}
              </span>
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <h3 className="text-base font-bold text-gray-900 mb-2">{selectedTicket.title}</h3>
            <div className="text-xs text-gray-500 mb-3">Người gửi: <strong>{selectedTicket.sender}</strong></div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-700 leading-relaxed mb-5">
              "{selectedTicket.content}"
            </div>

            <div className="flex items-center justify-end gap-2">
              {selectedTicket.category.includes('DRM') ? (
                <button
                  onClick={() => handleResolve(selectedTicket.id, 'Đã thu hồi 1 thiết bị cũ và cấp quyền kích hoạt máy mới')}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Gỡ Thiết Bị DRM Cũ &amp; Cấp Lại
                </button>
              ) : selectedTicket.category.includes('Bản Quyền') ? (
                <button
                  onClick={() => handleResolve(selectedTicket.id, 'Đã chuyển hồ sơ cho Cục Bản Quyền Tác Giả đối soát')}
                  className="px-4 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Khóa Tạm Tác Phẩm Để Xác Minh
                </button>
              ) : (
                <button
                  onClick={() => handleResolve(selectedTicket.id, 'Đã hoàn tiền 100% về ví HukiXu cho bạn đọc')}
                  className="px-4 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Xác Nhận Bồi Hoàn 100%
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
