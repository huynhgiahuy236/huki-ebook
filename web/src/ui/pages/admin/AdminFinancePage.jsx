import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';

export default function AdminFinancePage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [payoutModal, setPayoutModal] = useState(null);

  const [payoutBatches, setPayoutBatches] = useState([
    {
      id: 'PAY-202606-01',
      publisher: 'Công Ty CP Văn Hóa & Truyền Thông Nhã Nam',
      code: 'NHANAM',
      ordersCount: 2840,
      grossSales: 620400000,
      shareRatio: '85% NXB / 15% Sàn',
      platformFee: 93060000,
      taxWithheld: 6204000,
      netPayout: 521136000,
      bankAccount: 'Ngân hàng Vietcombank - CN Ba Đình (001100489281)',
      period: 'Kỳ 1: 01/06 - 15/06/2026',
      status: 'pending_approval',
      statusLabel: 'Chờ Ký Duyệt Giải Ngân'
    },
    {
      id: 'PAY-202606-02',
      publisher: 'Nhà Xuất Bản Trẻ',
      code: 'TRE',
      ordersCount: 2150,
      grossSales: 485600000,
      shareRatio: '85% NXB / 15% Sàn',
      platformFee: 72840000,
      taxWithheld: 4856000,
      netPayout: 407904000,
      bankAccount: 'Ngân hàng VietinBank - CN TP.HCM (102893847291)',
      period: 'Kỳ 1: 01/06 - 15/06/2026',
      status: 'pending_approval',
      statusLabel: 'Chờ Ký Duyệt Giải Ngân'
    },
    {
      id: 'PAY-202606-03',
      publisher: 'Nhà Xuất Bản Kim Đồng',
      code: 'KIMDONG',
      ordersCount: 2420,
      grossSales: 512300000,
      shareRatio: '85% NXB / 15% Sàn',
      platformFee: 76845000,
      taxWithheld: 5123000,
      netPayout: 430332000,
      bankAccount: 'Ngân hàng BIDV - CN Hà Nội (12010009827361)',
      period: 'Kỳ 1: 01/06 - 15/06/2026',
      status: 'paid',
      statusLabel: 'Đã Chuyển Khoản Thành Công'
    },
    {
      id: 'PAY-202606-04',
      publisher: 'Alpha Books Official',
      code: 'ALPHABOOKS',
      ordersCount: 1890,
      grossSales: 390800000,
      shareRatio: '85% NXB / 15% Sàn',
      platformFee: 58620000,
      taxWithheld: 3908000,
      netPayout: 328272000,
      bankAccount: 'Ngân hàng Techcombank - CN Thăng Long (19038291048291)',
      period: 'Kỳ 1: 01/06 - 15/06/2026',
      status: 'paid',
      statusLabel: 'Đã Chuyển Khoản Thành Công'
    },
    {
      id: 'PAY-202606-05',
      publisher: 'First News - Trí Việt',
      code: 'FIRSTNEWS',
      ordersCount: 1610,
      grossSales: 340200000,
      shareRatio: '85% NXB / 15% Sàn',
      platformFee: 51030000,
      taxWithheld: 3402000,
      netPayout: 285768000,
      bankAccount: 'Ngân hàng ACB - CN Sài Gòn (829103847)',
      period: 'Kỳ 1: 01/06 - 15/06/2026',
      status: 'processing',
      statusLabel: 'Napas 247 Đang Xử Lý'
    }
  ]);

  const handleApprovePayout = (batchId) => {
    setPayoutBatches(prev => prev.map(item => {
      if (item.id === batchId) {
        return { ...item, status: 'paid', statusLabel: 'Đã Chuyển Khoản Thành Công' };
      }
      return item;
    }));
    showToast(`Đã ký duyệt giải ngân VietQR Napas cho lệnh ${batchId}!`, 'success');
    setPayoutModal(null);
  };

  const filteredBatches = payoutBatches.filter(item => {
    if (activeTab === 'pending' && item.status !== 'pending_approval') return false;
    if (activeTab === 'paid' && item.status !== 'paid') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.publisher.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
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
            <span className="text-xs sm:text-sm font-semibold text-gray-500">Tài Chính &amp; Kế Toán Trung Ương</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              ĐỐI SOÁT &amp; GIẢI NGÂN NXB • 85/15 REVENUE SHARE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Đối Soát Doanh Thu &amp; Chi Trả Nhà Xuất Bản
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Quản lý tổng GMV toàn sàn ₫2.48 tỷ, đối soát hoa hồng 15%, khấu trừ thuế TNCN và giải ngân tự động VietQR Napas 247.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button 
            onClick={() => showToast('Đang xuất báo cáo tài chính kiểm toán Q2/2026...', 'info')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>Báo Cáo Kiểm Toán VAT</span>
          </button>
          
          <button 
            onClick={() => showToast('Đã tạo kỳ đối soát mới tự động theo chu kỳ ngày 15!', 'success')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Tạo Kỳ Đối Soát Mới</span>
          </button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Tổng GMV Tháng Này</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00875A] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">₫2.480.000.000</div>
          <div className="mt-2 text-xs text-emerald-600 font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            <span>+22.4% so với kỳ trước</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Thực Nhận NXB (85%)</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">₫2.108.000.000</div>
          <div className="mt-2 text-xs text-gray-500 font-medium">
            Đã giải ngân ₫1.350B · Chờ duyệt ₫758M
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Doanh Thu Phí Sàn HUKI (15%)</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">pie_chart</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">₫372.000.000</div>
          <div className="mt-2 text-xs text-amber-700 font-bold">
            Biên lợi nhuận gộp vững chắc
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Cổng Thanh Toán Napas / MoMo</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">hub</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">99.98%</div>
          <div className="mt-2 text-xs text-purple-700 font-bold">
            0% nghẽn cổng giải ngân
          </div>
        </div>

      </div>

      {/* 3. FILTERS & SEARCH */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3.5">
        <div className="flex items-center gap-1.5 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl w-full md:w-auto">
          {[
            { key: 'all', label: 'Tất cả lệnh chi' },
            { key: 'pending', label: 'Chờ ký duyệt' },
            { key: 'paid', label: 'Đã giải ngân' }
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
            placeholder="Tìm mã lệnh, tên NXB..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 4. PAYOUT BATCHES TABLE */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3.5 px-4">Nhà Xuất Bản &amp; Kỳ Đối Soát</th>
                <th className="py-3.5 px-3">Tổng Đơn &amp; GMV Bán</th>
                <th className="py-3.5 px-3">Phí Sàn 15%</th>
                <th className="py-3.5 px-3">Thực Nhận NXB</th>
                <th className="py-3.5 px-3">Tài Khoản Thụ Hưởng</th>
                <th className="py-3.5 px-3">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBatches.map(item => (
                <tr key={item.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 text-[13px]">{item.publisher}</span>
                      <span className="text-[11px] text-gray-500 mt-0.5">{item.period}</span>
                      <span className="text-[10px] text-emerald-700 font-mono mt-0.5">#{item.id}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-gray-900">{item.grossSales.toLocaleString()}₫</span>
                      <span className="text-[10px] text-gray-500">{item.ordersCount.toLocaleString()} đơn hàng</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="font-bold text-amber-700">
                      -{item.platformFee.toLocaleString()}₫
                    </span>
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="font-extrabold text-base text-[#00875A]">
                      {item.netPayout.toLocaleString()}₫
                    </span>
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="text-[11px] text-gray-700 truncate max-w-[200px] block" title={item.bankAccount}>
                      {item.bankAccount}
                    </span>
                  </td>

                  <td className="py-3.5 px-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      item.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      item.status === 'pending_approval' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                      'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {item.statusLabel}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {item.status === 'pending_approval' ? (
                      <button
                        onClick={() => setPayoutModal(item)}
                        className="px-3 py-1.5 rounded-lg bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                      >
                        Ký Duyệt Chi
                      </button>
                    ) : (
                      <button
                        onClick={() => showToast(`Đã tải xuống chứng từ chuyển khoản ${item.id}`, 'info')}
                        className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Xem Ủy Nhiệm Chi
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. PAYOUT MODAL */}
      {payoutModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setPayoutModal(null)}
          ></div>
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Ký Duyệt Lệnh Chi Napas 247</h3>
            <p className="text-xs text-gray-500 mb-4">
              Xác thực chuyển khoản tự động cho đối tác <strong>{payoutModal.publisher}</strong>.
            </p>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2.5 text-xs text-gray-700 mb-5">
              <div className="flex justify-between">
                <span className="text-gray-500">Mã Lệnh:</span>
                <span className="font-mono font-bold">{payoutModal.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tổng GMV bán ra:</span>
                <span className="font-bold">{payoutModal.grossSales.toLocaleString()}₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phí dịch vụ sàn HUKI (15%):</span>
                <span className="font-bold text-amber-700">-{payoutModal.platformFee.toLocaleString()}₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tài khoản nhận:</span>
                <span className="font-bold text-right max-w-[240px]">{payoutModal.bankAccount}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                <span className="font-bold text-gray-900">Số Tiền Thực Giải Ngân:</span>
                <span className="font-extrabold text-lg text-[#00875A]">{payoutModal.netPayout.toLocaleString()}₫</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setPayoutModal(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-xs cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={() => handleApprovePayout(payoutModal.id)}
                className="px-5 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Xác Nhận Giải Ngân VietQR</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
