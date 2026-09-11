import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function WalletPage() {
  const { showToast } = useToast();

  const [walletBalance, setWalletBalance] = useState(350000);
  const [rewardPoints, setRewardPoints] = useState(1420);
  const [activeHistoryTab, setActiveHistoryTab] = useState('all');
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [selectedTopupAmount, setSelectedTopupAmount] = useState(300000);

  const topupPackages = [
    {
      id: 'pkg-100',
      title: 'Gói Đọc Thử',
      price: 100000,
      coins: 100000,
      bonusPoints: 50,
      desc: 'Phù hợp trải nghiệm vài chương sách mới.',
      popular: false,
      tag: 'Cơ bản'
    },
    {
      id: 'pkg-300',
      title: 'Gói Tinh Hoa',
      price: 300000,
      coins: 350000,
      bonusPoints: 150,
      desc: 'Tặng thêm 50.000 Xu đọc sách + 150 Điểm thưởng.',
      popular: true,
      tag: 'Bán chạy nhất'
    },
    {
      id: 'pkg-500',
      title: 'Gói Học Giả',
      price: 500000,
      coins: 600000,
      bonusPoints: 300,
      desc: 'Tặng 100.000 Xu + 1 Voucher đọc sách độc quyền.',
      popular: false,
      tag: 'Tiết kiệm 20%'
    },
    {
      id: 'pkg-1000',
      title: 'Gói VIP Thư Viện',
      price: 1000000,
      coins: 1300000,
      bonusPoints: 800,
      desc: 'Tặng 300.000 Xu + Nâng hạng VIP Kim Cương ngay.',
      popular: false,
      tag: 'Đặc quyền VIP'
    }
  ];

  const rewardItems = [
    {
      id: 'voucher-20k',
      title: 'Voucher Giảm 20.000đ Toàn Sàn',
      pointsRequired: 200,
      type: 'Voucher',
      expiry: '30 ngày'
    },
    {
      id: 'voucher-50k',
      title: 'Voucher Giảm 50.000đ Đơn Từ 300k',
      pointsRequired: 450,
      type: 'Voucher VIP',
      expiry: '45 ngày'
    },
    {
      id: 'free-ebook-drm',
      title: 'Tặng 01 Ebook DRM Tự Chọn (Dưới 100k)',
      pointsRequired: 800,
      type: 'Ebook Miễn Phí',
      expiry: 'Vĩnh viễn'
    },
    {
      id: 'vip-salon-pass',
      title: 'Vé Mời Tham Dự Salon Văn Học Offline',
      pointsRequired: 1200,
      type: 'Sự Kiện Đặc Biệt',
      expiry: 'Sự kiện tháng 09'
    }
  ];

  const transactions = [
    {
      id: 'TX-98210',
      title: 'Nạp Xu Ví Huki (Gói Tinh Hoa)',
      type: 'topup',
      date: '08/09/2026 09:15',
      amount: '+350.000 Xu',
      amountColor: 'text-emerald-600 dark:text-emerald-400',
      status: 'Thành công',
      statusColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
    },
    {
      id: 'TX-98211',
      title: 'Thanh toán đơn hàng #HUKI-8892401',
      type: 'purchase',
      date: '08/09/2026 09:30',
      amount: '-100.000 Xu',
      amountColor: 'text-theme-accent',
      status: 'Đã trừ ví',
      statusColor: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
    },
    {
      id: 'TX-97500',
      title: 'Tích điểm đọc sách hoàn thành 3 chương',
      type: 'points',
      date: '07/09/2026 21:40',
      amount: '+30 Points',
      amountColor: 'text-amber-600 dark:text-amber-400',
      status: 'Thành công',
      statusColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
    },
    {
      id: 'TX-96400',
      title: 'Đổi điểm lấy Voucher Giảm 20.000đ',
      type: 'reward',
      date: '05/09/2026 14:10',
      amount: '-200 Points',
      amountColor: 'text-theme-accent',
      status: 'Đã nhận mã',
      statusColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
    }
  ];

  const handleExecuteTopup = () => {
    setWalletBalance(prev => prev + selectedTopupAmount);
    setRewardPoints(prev => prev + 150);
    setShowTopupModal(false);
    showToast(`Nạp thành công ${selectedTopupAmount.toLocaleString('vi-VN')} Xu vào ví!`, 'success');
  };

  const handleRedeemReward = (item) => {
    if (rewardPoints < item.pointsRequired) {
      showToast('Bạn chưa đủ điểm thưởng để đổi phần quà này!', 'error');
      return;
    }
    setRewardPoints(prev => prev - item.pointsRequired);
    showToast(`Đổi thành công: ${item.title}!`, 'success');
  };

  const filteredTransactions = transactions.filter(t => {
    if (activeHistoryTab === 'all') return true;
    return t.type === activeHistoryTab;
  });

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 font-body-md">
      {/* Breadcrumbs & Title Bar */}
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-body-sm text-on-surface-variant mb-2">
          <Link to="/" className="hover:text-primary transition-colors">Trang chủ</Link>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <Link to="/profile" className="hover:text-primary transition-colors">Tài khoản</Link>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-theme-primary font-semibold">Ví & Điểm Thưởng</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface">
              Ví Điện Tử Huki & Trung Tâm Điểm Thưởng
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              Quản lý số dư xu, điểm thưởng tích lũy, các gói nạp ưu đãi và lịch sử giao dịch minh bạch.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => showToast('Đang xuất sao kê giao dịch PDF...', 'info')}
              className="px-4 py-2.5 bg-theme-surface border border-theme-border hover:border-theme-primary text-on-surface rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Xuất Sao Kê
            </button>
            <button
              onClick={() => setShowTopupModal(true)}
              className="px-5 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-base">add_card</span>
              Nạp Xu Nhanh
            </button>
          </div>
        </div>
      </div>

      {/* Luxury Hero Wallet Balance & VIP Tier Card */}
      <div 
        style={{ background: 'linear-gradient(to bottom right, var(--theme-hero-from, #003B2B), var(--theme-hero-via, #002B20), var(--theme-hero-to, #001A12))' }}
        className="relative overflow-hidden rounded-3xl text-white p-6 sm:p-10 mb-10 shadow-xl border border-white/20">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="px-3.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-200 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                VIP Hạng Kim Cương
              </span>
              <div className="flex items-center gap-1 text-emerald-300 font-bold bg-white/10 px-3 py-1 rounded-full text-xs">
                <span className="material-symbols-outlined text-sm">local_fire_department</span>
                Streak 14 ngày đọc sách
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div>
                <p className="text-white/70 text-xs mb-1 uppercase tracking-wider font-semibold">Số Dư Ví Xu Huki</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-editorial text-3xl sm:text-4xl font-bold text-white">
                    {walletBalance.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-amber-400 font-bold text-base">Xu</span>
                </div>
                <p className="text-xs text-white/60 mt-1">≈ {walletBalance.toLocaleString('vi-VN')} VNĐ quy đổi mua sách</p>
              </div>

              <div>
                <p className="text-white/70 text-xs mb-1 uppercase tracking-wider font-semibold">Điểm Thưởng Tích Lũy</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-editorial text-3xl sm:text-4xl font-bold text-emerald-300">
                    {rewardPoints.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-emerald-300 text-xs font-bold">Huki Points</span>
                </div>
                <p className="text-xs text-white/60 mt-1">Đủ điều kiện đổi 3 voucher đọc miễn phí</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col justify-center gap-3 lg:border-l lg:border-white/10 lg:pl-8">
            <button
              onClick={() => setShowTopupModal(true)}
              className="w-full py-3.5 px-6 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-md text-xs sm:text-sm"
            >
              <span className="material-symbols-outlined text-lg">bolt</span>
              Nạp Thêm Xu
            </button>
            <button
              onClick={() => showToast('Yêu cầu rút tiền về tài khoản ngân hàng liên kết thành công!', 'info')}
              className="w-full py-3.5 px-6 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10 text-xs sm:text-sm"
            >
              <span className="material-symbols-outlined text-lg">payments</span>
              Rút Tiền / Hoàn Ví
            </button>
          </div>
        </div>
      </div>

      {/* 4-Column Top-up Promotion Packages */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-theme-accent text-xs font-bold uppercase tracking-wider">Gói Ưu Đãi Đặc Biệt</span>
            <h2 className="font-editorial text-2xl font-bold text-theme-text mt-1">Các Gói Nạp Xu Đọc Sách</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {topupPackages.map(pkg => (
            <div
              key={pkg.id}
              className={`bg-theme-surface rounded-3xl p-6 flex flex-col justify-between transition-all relative group ${
                pkg.popular
                  ? 'border-2 border-theme-primary shadow-md ring-4 ring-theme-primary/10'
                  : 'border border-theme-border hover:shadow-lg'
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 right-6 px-3 py-0.5 bg-theme-primary text-white rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Bán chạy nhất
                </div>
              )}

              <div>
                <span className="inline-block px-3 py-1 bg-theme-secondary-subtle rounded-full text-xs font-bold text-theme-primary mb-3">
                  {pkg.tag}
                </span>
                <h3 className="font-editorial text-xl font-bold text-on-surface mb-1">{pkg.title}</h3>
                <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">{pkg.desc}</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="font-editorial text-2xl sm:text-3xl font-bold text-theme-accent">
                    {pkg.price.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-xs text-on-surface-variant">VNĐ</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedTopupAmount(pkg.coins);
                  setShowTopupModal(true);
                }}
                className={`w-full py-3 rounded-xl font-bold text-xs transition-all ${
                  pkg.popular
                    ? 'bg-theme-primary hover:bg-theme-primary-hover text-white shadow-sm'
                    : 'bg-theme-surface-subtle hover:bg-theme-primary hover:text-white text-on-surface'
                }`}
              >
                Chọn Gói Này
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Rewards Center (Trung tâm đổi quà) */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-theme-secondary text-xs font-bold uppercase tracking-wider">Huki Rewards Hub</span>
            <h2 className="font-editorial text-2xl font-bold text-on-surface mt-1">Đổi Điểm Thưởng Lấy Quà Tặng</h2>
          </div>
          <span className="text-xs text-on-surface-variant">
            Điểm khả dụng: <strong className="text-theme-secondary">{rewardPoints} Points</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {rewardItems.map(item => (
            <div key={item.id} className="bg-theme-surface border border-theme-border rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-theme-secondary-subtle text-theme-secondary px-2.5 py-0.5 rounded-full inline-block mb-2">
                  {item.type}
                </span>
                <h4 className="font-semibold text-sm text-on-surface mb-1">{item.title}</h4>
                <p className="text-xs text-on-surface-variant">Hạn dùng: {item.expiry}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-theme-border">
                <div>
                  <span className="font-bold text-sm text-amber-600">{item.pointsRequired}</span>
                  <span className="text-xs text-theme-text-muted ml-1">Points</span>
                </div>
                <button
                  onClick={() => handleRedeemReward(item)}
                  className="px-3 py-1.5 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Đổi Ngay
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Transaction History Ledger */}
      <section className="bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-theme-border">
          <h3 className="font-editorial text-xl font-bold text-on-surface">Lịch Sử Giao Dịch & Biến Động Số Dư</h3>
          <div className="flex items-center gap-1.5 bg-theme-surface-subtle p-1 rounded-2xl overflow-x-auto text-xs">
            {[
              { id: 'all', label: 'Tất Cả' },
              { id: 'topup', label: 'Nạp Xu' },
              { id: 'purchase', label: 'Mua Sách' },
              { id: 'points', label: 'Điểm Thưởng' },
              { id: 'reward', label: 'Đổi Quà' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveHistoryTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                  activeHistoryTab === tab.id
                    ? 'bg-theme-surface text-theme-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-theme-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-theme-border">
          {filteredTransactions.map(t => (
            <div key={t.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-theme-bg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-theme-primary text-lg">
                    {t.type === 'topup' ? 'account_balance_wallet' : t.type === 'purchase' ? 'shopping_bag' : 'redeem'}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-xs sm:text-sm text-on-surface">{t.title}</h4>
                  <p className="text-xs text-on-surface-variant font-mono">{t.id} • {t.date}</p>
                </div>
              </div>

              <div className="text-right shrink-0 space-y-1">
                <span className={`font-bold text-sm sm:text-base ${t.amountColor}`}>{t.amount}</span>
                <span className={`block text-[10px] font-bold px-2 py-0.5 rounded-full ${t.statusColor}`}>
                  {t.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Topup Modal Simulation */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-theme-surface rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-theme-border">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <h3 className="font-editorial text-xl font-bold text-on-surface">Nạp Xu Vào Ví Huki</h3>
              <button onClick={() => setShowTopupModal(false)} className="p-1 hover:bg-theme-surface-subtle rounded-lg">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Chọn số tiền nạp:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[100000, 300000, 500000, 1000000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setSelectedTopupAmount(amt)}
                      className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all ${
                        selectedTopupAmount === amt
                          ? 'border-theme-primary bg-theme-secondary-subtle text-theme-primary'
                          : 'border-theme-border text-on-surface'
                      }`}
                    >
                      {amt.toLocaleString('vi-VN')}đ
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-theme-bg rounded-2xl space-y-1.5 text-xs">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Xu thực nhận:</span>
                  <span className="font-bold text-theme-primary">+{selectedTopupAmount.toLocaleString('vi-VN')} Xu</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Điểm thưởng tích lũy:</span>
                  <span className="font-bold text-amber-600">+150 Points</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Phương thức:</span>
                  <span className="font-semibold text-on-surface">QR Code MoMo / Chuyển Khoản 24/7</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTopupModal(false)}
                className="flex-1 py-3 border border-theme-border rounded-xl text-xs font-semibold text-on-surface"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={handleExecuteTopup}
                className="flex-1 py-3 bg-theme-primary hover:bg-theme-primary-hover text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Xác Nhận Nạp Xu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
