import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';

export default function AdminMarketingPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('banners');

  const [banners, setBanners] = useState([
    {
      id: 'BAN-01',
      title: 'Tuần Lễ Văn Học Kinh Điển & Tinh Hoa Tri Thức 2026',
      subtitle: 'Giảm đến 40% cho tất cả tuyệt tác văn chương thế giới',
      link: '/books?category=van-hoc',
      badge: 'ĐẠI HỘI SÁCH',
      bgImage: '/banners/hero-classic.jpg',
      status: 'active',
      clicks: 14280,
      order: 1
    },
    {
      id: 'BAN-02',
      title: 'Hội Sách Bản Quyền Alpha Books x HUKI',
      subtitle: 'Tặng ngay Ebook DRM độc quyền khi đặt trước sách in',
      link: '/shop/pub-4',
      badge: 'ƯU ĐÃI ĐỘC QUYỀN',
      bgImage: '/banners/hero-alpha.jpg',
      status: 'active',
      clicks: 9840,
      order: 2
    },
    {
      id: 'BAN-03',
      title: 'Kỷ Nguyên Sách Hybrid: Đọc Ngay Khi Chờ Giao',
      subtitle: 'Trải nghiệm sách giấy liền tay, đọc số tức thì',
      link: '/books?format=hybrid',
      badge: 'TÍNH NĂNG MỚI',
      bgImage: '/banners/hero-hybrid.jpg',
      status: 'active',
      clicks: 18450,
      order: 3
    }
  ]);

  const [vouchers, setVouchers] = useState([
    {
      code: 'HUKIFREESHIP',
      discount: 'Miễn phí giao hàng 2H (tối đa 30.000₫)',
      minOrder: '150.000₫',
      used: 3420,
      total: 5000,
      expiry: '30/06/2026',
      status: 'active'
    },
    {
      code: 'HUKIDRM20',
      discount: 'Giảm 20% Ebook DRM toàn sàn',
      minOrder: '0₫',
      used: 1290,
      total: 2000,
      expiry: '30/06/2026',
      status: 'active'
    },
    {
      code: 'WELCOME50K',
      discount: 'Giảm 50.000₫ cho đơn đầu tiên',
      minOrder: '200.000₫',
      used: 890,
      total: 1000,
      expiry: '15/07/2026',
      status: 'active'
    }
  ]);

  const handleToggleBanner = (id) => {
    setBanners(prev => prev.map(b => {
      if (b.id === id) {
        const newStatus = b.status === 'active' ? 'inactive' : 'active';
        return { ...b, status: newStatus };
      }
      return b;
    }));
    showToast('Đã cập nhật trạng thái hiển thị banner trên trang chủ!', 'success');
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
      
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-500">Tiếp Thị &amp; Tăng Trưởng</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
              MARKETING &amp; CHIẾN DỊCH TOÀN SÀN
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Quản Lý Banner Hero, Flash Deal &amp; Mã Giảm Giá
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Điều phối các vị trí banner nổi bật nhất trên Trang Chủ, kích hoạt chiến dịch khuyến mãi toàn sàn và ví voucher bạn đọc.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => showToast('Mở cửa sổ thêm banner mới...', 'info')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
            <span>Thêm Banner Mới</span>
          </button>
        </div>
      </div>

      {/* 2. TABS */}
      <div className="flex items-center gap-2 p-1 bg-white border border-[#E2E8F0] rounded-2xl w-fit shadow-2xs">
        <button
          onClick={() => setActiveTab('banners')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'banners' ? 'bg-[#00875A] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Banner Hero Slider Trang Chủ ({banners.length})
        </button>
        <button
          onClick={() => setActiveTab('vouchers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'vouchers' ? 'bg-[#00875A] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Mã Giảm Giá Sàn ({vouchers.length})
        </button>
      </div>

      {/* 3. CONTENT AREA */}
      {activeTab === 'banners' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {banners.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-2xs flex flex-col justify-between">
              <div>
                <div className="h-44 relative bg-gray-900 overflow-hidden">
                  <img src={b.bgImage} alt={b.title} className="w-full h-full object-cover opacity-80" />
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-0.5 rounded-full bg-white/90 text-gray-900 font-extrabold text-[10px] shadow-sm">
                      {b.badge}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      b.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-gray-500 text-white'
                    }`}>
                      {b.status === 'active' ? 'Đang Chạy' : 'Tạm Ẩn'}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{b.title}</h3>
                  <p className="text-gray-500 text-xs line-clamp-2">{b.subtitle}</p>
                  <div className="pt-2 flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-100">
                    <span>Đường dẫn: <strong className="text-[#00875A]">{b.link}</strong></span>
                    <span><strong>{b.clicks.toLocaleString()}</strong> lượt click</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400">Thứ tự: #{b.order}</span>
                <button
                  onClick={() => handleToggleBanner(b.id)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  {b.status === 'active' ? 'Ẩn Banner' : 'Hiển Thị'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3.5 px-4">Mã Voucher</th>
                <th className="py-3.5 px-3">Mức Giảm Giá</th>
                <th className="py-3.5 px-3">Đơn Tối Thiểu</th>
                <th className="py-3.5 px-3">Tiến Độ Sử Dụng</th>
                <th className="py-3.5 px-3">Hạn Dùng</th>
                <th className="py-3.5 px-3">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vouchers.map(v => (
                <tr key={v.code} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-extrabold text-[#00875A] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      {v.code}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-bold text-gray-900">{v.discount}</td>
                  <td className="py-3.5 px-3 text-gray-600">{v.minOrder}</td>
                  <td className="py-3.5 px-3">
                    <div className="flex flex-col gap-1 max-w-[140px]">
                      <span className="text-[11px] font-bold text-gray-800">{v.used} / {v.total} lượt</span>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-[#00875A] h-full rounded-full" style={{ width: `${(v.used / v.total) * 100}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-gray-500">{v.expiry}</td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                      Đang Hoạt Động
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => showToast(`Đã sao chép liên kết chia sẻ voucher ${v.code}`, 'success')}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs cursor-pointer"
                    >
                      Chia Sẻ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
