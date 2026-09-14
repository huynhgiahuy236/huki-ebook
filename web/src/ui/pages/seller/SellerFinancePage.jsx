import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import WithdrawalPinModal from '../../components/seller/WithdrawalPinModal';

/**
 * HUKI EBOOK - Seller Wallet & Finance Management Page
 * Available Balance, 2-Minute Escrow Holding, 6-Digit PIN Payout Requests, and Ledger
 */
export default function SellerFinancePage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'payouts' | 'ledger'
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Wallet State
  const [availableBalance, setAvailableBalance] = useState(14850000);
  const [holdingBalance, setHoldingBalance] = useState(1250000);
  const [totalWithdrawn, setTotalWithdrawn] = useState(85600000);

  // Bank Info from KYC
  const [bankInfo] = useState({
    bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
    accountNumber: '1029384756',
    accountHolder: user?.business?.name || 'NXB KIM DONG OFFICIAL',
    businessName: user?.business?.name || 'Công Ty TNHH MTV Nhà Xuất Bản Kim Đồng',
  });

  // Payout Requests
  const [payouts, setPayouts] = useState([
    {
      id: 'PO-2026-8801',
      amount: 15000000,
      bankName: 'Vietcombank - CN Ba Đình (1029384756)',
      status: 'PAID',
      statusLabel: 'Đã Giải Ngân Thành Công',
      requestedAt: '12/09/2026 14:30',
      processedAt: '12/09/2026 15:10',
    },
    {
      id: 'PO-2026-8802',
      amount: 25000000,
      bankName: 'Vietcombank - CN Ba Đình (1029384756)',
      status: 'PAID',
      statusLabel: 'Đã Giải Ngân Thành Công',
      requestedAt: '05/09/2026 09:15',
      processedAt: '05/09/2026 10:00',
    },
  ]);

  // Wallet Ledger
  const [ledger, setLedger] = useState([
    {
      id: 'LED-991',
      subOrderCode: 'SUB-2026-9901',
      title: 'Nhận tiền thanh toán COD đơn sách #SUB-2026-9901',
      type: 'INCOME',
      amount: 285000,
      platformFee: 15000,
      netAmount: 270000,
      status: 'RELEASED',
      createdAt: 'Hôm nay, 16:45',
    },
    {
      id: 'LED-990',
      subOrderCode: 'SUB-2026-9889',
      title: 'Ký quỹ Escrow (Chờ hết 2 phút đổi trả) #SUB-2026-9889',
      type: 'ESCROW_HOLD',
      amount: 350000,
      platformFee: 17500,
      netAmount: 332500,
      status: 'HOLDING',
      createdAt: 'Hôm nay, 17:15',
    },
    {
      id: 'LED-989',
      subOrderCode: 'PO-2026-8801',
      title: 'Rút tiền ví về tài khoản Vietcombank (***4756)',
      type: 'WITHDRAW',
      amount: 15000000,
      platformFee: 0,
      netAmount: -15000000,
      status: 'COMPLETED',
      createdAt: '12/09/2026',
    },
  ]);

  const handleOpenWithdrawal = () => {
    if (availableBalance <= 0) {
      showToast(
        {
          title: 'Số dư không đủ',
          message: 'Số dư khả dụng hiện tại là 0đ. Không thể tạo lệnh rút tiền.',
        },
        'warning'
      );
      return;
    }
    setIsPinModalOpen(true);
  };

  const handleSubmitPayout = async ({ amount }) => {
    // Deduct available balance
    setAvailableBalance((prev) => Math.max(0, prev - amount));
    setTotalWithdrawn((prev) => prev + amount);

    const newPayout = {
      id: `PO-${Date.now().toString().slice(-4)}`,
      amount,
      bankName: `${bankInfo.bankName} (${bankInfo.accountNumber})`,
      status: 'PENDING_APPROVAL',
      statusLabel: 'Đang Chờ Admin Sàn Duyệt',
      requestedAt: 'Vừa xong',
      processedAt: 'Đang xử lý',
    };

    setPayouts([newPayout, ...payouts]);

    const newLedgerItem = {
      id: `LED-${Date.now().toString().slice(-4)}`,
      subOrderCode: newPayout.id,
      title: `Lệnh rút tiền về ${bankInfo.bankName.split('-')[0]} (***${bankInfo.accountNumber.slice(-4)})`,
      type: 'WITHDRAW',
      amount,
      platformFee: 0,
      netAmount: -amount,
      status: 'PENDING_PAYOUT',
      createdAt: 'Vừa xong',
    };

    setLedger([newLedgerItem, ...ledger]);

    showToast(
      {
        title: 'Yêu cầu rút tiền thành công!',
        message: `Đã khởi tạo lệnh rút ${amount.toLocaleString('vi-VN')}₫. Admin Sàn sẽ giải ngân trong ít phút.`,
      },
      'success'
    );
  };

  return (
    <div className="w-full flex flex-col gap-6 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--theme-surface,#ffffff)] p-6 rounded-3xl border border-[var(--theme-border,#e8e5df)] shadow-xs">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-black text-[var(--theme-text,#1c1b1f)]">
            Ví Doanh Nghiệp & Doanh Thu
          </h1>
          <p className="text-xs sm:text-sm text-[var(--theme-text-muted,#49454f)] mt-1">
            Quản lý số dư bán sách, theo dõi tiền ký quỹ Escrow 2 phút và thực hiện rút tiền bằng mã PIN 6 số an toàn.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenWithdrawal}
          className="px-5 py-2.5 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white text-xs sm:text-sm font-bold hover:opacity-95 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
          <span>Rút Tiền Về Ngân Hàng</span>
        </button>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Available Balance */}
        <div className="p-6 rounded-3xl bg-[var(--theme-surface,#ffffff)] border-2 border-emerald-500/30 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Số Dư Khả Dụng (Rút Ngay)
            </span>
            <span className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">account_balance</span>
            </span>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {availableBalance.toLocaleString('vi-VN')}₫
            </div>
            <p className="text-[11px] text-[var(--theme-text-muted,#49454f)] mt-1">
              Tiền từ các đơn đã qua thời hạn Escrow 2 phút hoặc người mua đã xác nhận nhận hàng.
            </p>
          </div>
        </div>

        {/* Card 2: Escrow Holding */}
        <div className="p-6 rounded-3xl bg-[var(--theme-surface,#ffffff)] border border-[var(--theme-border,#e8e5df)] shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Ký Quỹ Tạm Giữ (2 Phút)
            </span>
            <span className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
            </span>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {holdingBalance.toLocaleString('vi-VN')}₫
            </div>
            <p className="text-[11px] text-[var(--theme-text-muted,#49454f)] mt-1">
              Đơn hàng vừa giao COD thành công, tiền được bảo lưu trong thời gian khiếu nại.
            </p>
          </div>
        </div>

        {/* Card 3: Total Withdrawn */}
        <div className="p-6 rounded-3xl bg-[var(--theme-surface,#ffffff)] border border-[var(--theme-border,#e8e5df)] shadow-xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-muted,#49454f)]">
              Tổng Tiền Đã Rút
            </span>
            <span className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">paid</span>
            </span>
          </div>
          <div>
            <div className="font-mono text-2xl sm:text-3xl font-black text-[var(--theme-text,#1c1b1f)]">
              {totalWithdrawn.toLocaleString('vi-VN')}₫
            </div>
            <p className="text-[11px] text-[var(--theme-text-muted,#49454f)] mt-1">
              Tổng tiền thực nhận đã chuyển khoản về tài khoản ngân hàng của gian hàng.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-[var(--theme-border,#e8e5df)] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[var(--theme-primary,#003B2B)] text-white shadow-xs'
              : 'text-[var(--theme-text-muted,#49454f)] hover:text-[var(--theme-text,#1c1b1f)] hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          <span>Biến Động Số Dư (Ledger)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payouts')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'payouts'
              ? 'bg-[var(--theme-primary,#003B2B)] text-white shadow-xs'
              : 'text-[var(--theme-text-muted,#49454f)] hover:text-[var(--theme-text,#1c1b1f)] hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">outbox</span>
          <span>Lịch Sử Rút Tiền ({payouts.length})</span>
        </button>
      </div>

      {/* TAB 1: LEDGER */}
      {activeTab === 'overview' && (
        <div className="bg-[var(--theme-surface,#ffffff)] rounded-3xl border border-[var(--theme-border,#e8e5df)] p-6 shadow-xs overflow-hidden">
          <h3 className="text-base font-bold text-[var(--theme-text,#1c1b1f)] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[var(--theme-primary,#003B2B)]">history</span>
            <span>Chi Tiết Biến Động Số Dư Gần Đây</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="text-[11px] uppercase font-bold text-[var(--theme-text-muted,#49454f)] border-b border-[var(--theme-border,#e8e5df)]">
                <tr>
                  <th className="py-3 px-3">Mã Giao Dịch</th>
                  <th className="py-3 px-3">Nội Dung</th>
                  <th className="py-3 px-3">Thời Gian</th>
                  <th className="py-3 px-3 text-right">Doanh Thu</th>
                  <th className="py-3 px-3 text-right">Phí Sàn (5%)</th>
                  <th className="py-3 px-3 text-right">Thực Nhận</th>
                  <th className="py-3 px-3 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-border,#e8e5df)]/60">
                {ledger.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--theme-background,#F2FBF9)]/50 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-[var(--theme-primary,#003B2B)]">
                      {item.subOrderCode}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-[var(--theme-text,#1c1b1f)] max-w-xs truncate">
                      {item.title}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-[var(--theme-text-muted,#49454f)]">
                      {item.createdAt}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-medium text-right">
                      {item.amount.toLocaleString('vi-VN')}₫
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs text-rose-600 text-right">
                      {item.platformFee > 0 ? `-${item.platformFee.toLocaleString('vi-VN')}₫` : '0₫'}
                    </td>
                    <td className={`py-3.5 px-3 font-mono font-bold text-right ${
                      item.netAmount > 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {item.netAmount > 0 ? `+${item.netAmount.toLocaleString('vi-VN')}₫` : `${item.netAmount.toLocaleString('vi-VN')}₫`}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'RELEASED' || item.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}>
                        {item.status === 'RELEASED' ? 'Khả Dụng' : item.status === 'HOLDING' ? 'Tạm Giữ (2p)' : 'Đã Trừ Ví'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PAYOUT REQUESTS */}
      {activeTab === 'payouts' && (
        <div className="bg-[var(--theme-surface,#ffffff)] rounded-3xl border border-[var(--theme-border,#e8e5df)] p-6 shadow-xs overflow-hidden">
          <h3 className="text-base font-bold text-[var(--theme-text,#1c1b1f)] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[var(--theme-primary,#003B2B)]">account_balance</span>
            <span>Danh Sách Lệnh Rút Tiền Về Tài Khoản</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="text-[11px] uppercase font-bold text-[var(--theme-text-muted,#49454f)] border-b border-[var(--theme-border,#e8e5df)]">
                <tr>
                  <th className="py-3 px-3">Mã Lệnh</th>
                  <th className="py-3 px-3">Tài Khoản Thụ Hưởng</th>
                  <th className="py-3 px-3 font-mono text-right">Số Tiền Rút</th>
                  <th className="py-3 px-3">Thời Gian Yêu Cầu</th>
                  <th className="py-3 px-3">Thời Gian Giải Ngân</th>
                  <th className="py-3 px-3 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-border,#e8e5df)]/60">
                {payouts.map((po) => (
                  <tr key={po.id} className="hover:bg-[var(--theme-background,#F2FBF9)]/50 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-[var(--theme-primary,#003B2B)]">
                      #{po.id}
                    </td>
                    <td className="py-3.5 px-3 text-xs font-medium">
                      {po.bankName}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-emerald-600 text-right">
                      {po.amount.toLocaleString('vi-VN')}₫
                    </td>
                    <td className="py-3.5 px-3 text-xs text-[var(--theme-text-muted,#49454f)]">
                      {po.requestedAt}
                    </td>
                    <td className="py-3.5 px-3 text-xs text-[var(--theme-text-muted,#49454f)]">
                      {po.processedAt}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                        po.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}>
                        {po.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6-Digit PIN Withdrawal Modal */}
      <WithdrawalPinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        availableBalance={availableBalance}
        bankInfo={bankInfo}
        onSubmitPayout={handleSubmitPayout}
      />
    </div>
  );
}
