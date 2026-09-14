import React, { useState, useRef, useEffect } from 'react';

/**
 * HUKI EBOOK - Seller Wallet 6-Digit PIN Withdrawal Modal
 * Verifies 6-digit transaction PIN and submits payout request to Admin for approval.
 */
export default function WithdrawalPinModal({
  isOpen,
  onClose,
  availableBalance = 0,
  bankInfo = {
    bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
    accountNumber: '1029384756',
    accountHolder: 'NXB KIM DONG OFFICIAL',
    businessName: 'Công Ty TNHH MTV Nhà Xuất Bản Kim Đồng',
  },
  onSubmitPayout,
}) {
  const [amount, setAmount] = useState('');
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setAmount(availableBalance > 0 ? String(availableBalance) : '');
      setPinDigits(['', '', '', '', '', '']);
      setErrorMsg('');
      setIsSubmitting(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen, availableBalance]);

  if (!isOpen) return null;

  const handlePinChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...pinDigits];
    newDigits[index] = value.slice(-1);
    setPinDigits(newDigits);
    setErrorMsg('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền rút hợp lệ (lớn hơn 0đ).');
      return;
    }

    if (numAmount > availableBalance) {
      setErrorMsg(`Số tiền rút vượt quá số dư khả dụng (${availableBalance.toLocaleString('vi-VN')}₫).`);
      return;
    }

    const pinCode = pinDigits.join('');
    if (pinCode.length !== 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số mã PIN ví.');
      return;
    }

    // Default demo PIN verification: Accept any 6-digit PIN (default 123456 or seller set)
    setIsSubmitting(true);
    try {
      if (onSubmitPayout) {
        await onSubmitPayout({
          amount: numAmount,
          pin: pinCode,
          bankInfo,
        });
      }
      onClose();
    } catch (err) {
      setErrorMsg(err?.message || 'Giao dịch rút tiền thất bại. Vui lòng kiểm tra lại mã PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--theme-surface,#ffffff)] w-full max-w-lg rounded-3xl border border-[var(--theme-border,#e8e5df)] shadow-2xl p-6 sm:p-7 flex flex-col gap-5 text-[var(--theme-text,#1c1b1f)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-border,#e8e5df)]">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-[var(--theme-primary,#003B2B)]/10 text-[var(--theme-primary,#003B2B)] flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">account_balance_wallet</span>
            </span>
            <div>
              <h3 className="font-editorial text-lg sm:text-xl font-bold">Rút Tiền Về Ngân Hàng</h3>
              <p className="text-[11px] text-[var(--theme-text-muted,#49454f)]">
                Số dư khả dụng: <strong className="text-emerald-600 font-mono">{availableBalance.toLocaleString('vi-VN')}₫</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--theme-text-muted,#49454f)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Bank Details Card (Auto-filled from KYC) */}
        <div className="p-4 rounded-2xl bg-[var(--theme-background,#F2FBF9)] border border-[var(--theme-border,#e8e5df)] flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--theme-text-muted,#49454f)]">Doanh nghiệp:</span>
            <strong className="truncate font-bold">{bankInfo.businessName}</strong>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--theme-text-muted,#49454f)]">Ngân hàng thụ hưởng:</span>
            <strong className="truncate font-medium">{bankInfo.bankName}</strong>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--theme-text-muted,#49454f)]">Số tài khoản:</span>
            <span className="font-mono font-bold text-sm tracking-wider text-[var(--theme-primary,#003B2B)]">
              {bankInfo.accountNumber}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--theme-text-muted,#49454f)]">Chủ tài khoản:</span>
            <strong className="uppercase font-bold">{bankInfo.accountHolder}</strong>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1.5">
              Số tiền muốn rút (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                required
                min={50000}
                max={availableBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Tối thiểu 50.000₫"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] font-mono text-base font-bold focus:outline-none focus:border-[var(--theme-primary,#003B2B)] focus:ring-2 focus:ring-[var(--theme-primary,#003B2B)]/15"
              />
              <button
                type="button"
                onClick={() => setAmount(String(availableBalance))}
                className="absolute right-3 px-2 py-1 rounded-lg bg-[var(--theme-primary,#003B2B)]/10 text-[var(--theme-primary,#003B2B)] text-[11px] font-bold hover:bg-[var(--theme-primary,#003B2B)]/20 transition-all cursor-pointer"
              >
                RÚT HẾT
              </button>
            </div>
          </div>

          {/* 6-Digit PIN Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[var(--theme-text-muted,#49454f)]">
                Nhập mã PIN Ví (6 chữ số) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-[var(--theme-text-muted,#49454f)]/70 italic">
                Mặc định: 123456
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              {pinDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-11 h-12 sm:w-12 sm:h-13 rounded-2xl border-2 border-[var(--theme-border,#e8e5df)] text-center font-mono text-xl font-black bg-[var(--theme-surface,#ffffff)] focus:border-[var(--theme-primary,#003B2B)] focus:ring-4 focus:ring-[var(--theme-primary,#003B2B)]/15 focus:outline-none transition-all shadow-xs"
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] text-xs sm:text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableBalance <= 0}
              className="px-6 py-2.5 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white text-xs sm:text-sm font-bold hover:opacity-95 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Xác Nhận Rút Tiền</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
