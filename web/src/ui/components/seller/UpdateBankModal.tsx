"use client";

import React, { useState, useRef, useEffect } from 'react';
import { businessApi } from '@/ui/api/businessApi';
import { walletApi } from '@/ui/api/walletApi';
import { useToast } from '@/ui/context/ToastContext';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

export interface UpdateBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId?: string;
  storeId?: string;
  currentBankInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    bankBranch?: string;
  };
  onSuccess?: () => Promise<void> | void;
}

const POPULAR_VIETNAM_BANKS = [
  'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)',
  'Ngân hàng TMCP Quân Đội (MB Bank)',
  'Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)',
  'Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam (BIDV)',
  'Ngân hàng TMCP Công Thương Việt Nam (VietinBank)',
  'Ngân hàng TMCP Á Châu (ACB)',
  'Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)',
  'Ngân hàng TMCP Tiên Phong (TPBank)',
  'Ngân hàng TMCP Sài Gòn Thương Tín (Sacombank)',
  'Ngân hàng Nông nghiệp & PTNT Việt Nam (Agribank)',
  'Ngân hàng TMCP Phát Triển TP.HCM (HDBank)',
  'Ngân hàng TMCP Hàng Hải Việt Nam (MSB)',
];

export default function UpdateBankModal({
  isOpen,
  onClose,
  businessId,
  storeId,
  currentBankInfo,
  onSuccess,
}: UpdateBankModalProps) {
  const { showToast } = useToast();

  const [bankName, setBankName] = useState(currentBankInfo.bankName || POPULAR_VIETNAM_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState(currentBankInfo.accountNumber || '');
  const [accountHolder, setAccountHolder] = useState(currentBankInfo.accountHolder || '');
  const [bankBranch, setBankBranch] = useState(currentBankInfo.bankBranch || '');
  
  // PIN verification step
  const [step, setStep] = useState<'FORM' | 'VERIFY_PIN'>('FORM');
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setBankName(currentBankInfo.bankName || POPULAR_VIETNAM_BANKS[0]);
      setAccountNumber(currentBankInfo.accountNumber && currentBankInfo.accountNumber !== 'Chưa thiết lập STK' ? currentBankInfo.accountNumber : '');
      setAccountHolder(currentBankInfo.accountHolder || '');
      setBankBranch(currentBankInfo.bankBranch || '');
      setStep('FORM');
      setPinDigits(['', '', '', '', '', '']);
      setErrorMsg('');
      setIsSubmitting(false);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentBankInfo]);

  if (!isOpen) return null;

  const handleNextToPin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!bankName.trim()) {
      setErrorMsg('Vui lòng chọn hoặc nhập tên ngân hàng.');
      return;
    }
    if (!accountNumber.trim() || accountNumber.trim().length < 6) {
      setErrorMsg('Vui lòng nhập số tài khoản ngân hàng hợp lệ (tối thiểu 6 chữ số).');
      return;
    }
    if (!accountHolder.trim()) {
      setErrorMsg('Vui lòng nhập họ tên chủ tài khoản thụ hưởng.');
      return;
    }

    setStep('VERIFY_PIN');
    setTimeout(() => {
      pinInputRefs.current[0]?.focus();
    }, 100);
  };

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...pinDigits];
    newDigits[index] = value.slice(-1);
    setPinDigits(newDigits);
    setErrorMsg('');

    if (value && index < 5) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handleConfirmUpdate = async () => {
    const pin = pinDigits.join('');
    if (pin.length !== 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số mã PIN bảo mật cấp 2.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Xác thực mã PIN trước khi cập nhật
      if (storeId) {
        const verifyRes = await walletApi.verifyPin(storeId, pin, 'UPDATE_BANK_ACCOUNT');
        if (!verifyRes.success && !(verifyRes.data as any)?.verified) {
          setErrorMsg(verifyRes.error?.message || 'Mã PIN bảo mật cấp 2 không chính xác.');
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Cập nhật thông tin ngân hàng thụ hưởng vào CSDL
      const payload = {
        bankName: bankName.trim(),
        bankAccountNumber: accountNumber.trim(),
        bankAccountHolderName: accountHolder.trim().toUpperCase(),
        bankBranch: bankBranch.trim(),
      };

      if (businessId) {
        const res = await businessApi.updateBusiness(businessId, payload);
        if (!res.success) {
          // Fallback thử gửi qua update request nếu PATCH bị chặn
          await businessApi.submitUpdateRequest(payload);
        }
      }

      // 3. Đồng bộ Realtime
      realtimeSyncBus.publish('BUSINESS_STATUS_UPDATED', {
        businessId,
        storeId,
        ...payload,
      });

      showToast?.('🎉 Đã cập nhật tài khoản ngân hàng thụ hưởng thành công!', 'success');

      if (onSuccess) {
        await onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Update bank account failed:', err);
      setErrorMsg(err?.message || 'Không thể cập nhật tài khoản ngân hàng. Vui lòng kiểm tra lại mã PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">account_balance</span>
            </div>
            <div>
              <h3 className="font-editorial text-lg font-bold text-slate-900 dark:text-white">
                {step === 'FORM' ? 'Cập Nhật Tài Khoản Ngân Hàng' : 'Xác Thực Mã PIN Cấp 2'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {step === 'FORM' ? 'Tài khoản thụ hưởng nhận tiền quyết toán ví người bán' : 'Bảo mật tài chính: Nhập mã PIN để lưu thay đổi'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'FORM' ? (
            <form onSubmit={handleNextToPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Ngân hàng thụ hưởng <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    {POPULAR_VIETNAM_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Số tài khoản (STK) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\s/g, ''))}
                  placeholder="Nhập số tài khoản ngân hàng..."
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Họ và tên chủ tài khoản <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                  placeholder="NGUYEN VAN A (Trùng tên CCCD / Công ty)"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold uppercase text-slate-900 dark:text-white outline-none focus:border-emerald-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Vui lòng nhập in hoa không dấu hoặc có dấu trùng khớp với tài khoản ngân hàng.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Chi nhánh ngân hàng
                </label>
                <input
                  type="text"
                  value={bankBranch}
                  onChange={(e) => setBankBranch(e.target.value)}
                  placeholder="VD: Chi nhánh TP. Hồ Chí Minh"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>Tiếp tục (Xác thực PIN)</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5 text-center">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30 text-amber-900 dark:text-amber-200 text-xs text-left space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-amber-600">lock</span>
                  <span>Xác nhận đổi tài khoản ngân hàng thụ hưởng</span>
                </p>
                <p className="text-[11.5px] leading-relaxed">
                  Ngân hàng mới: <strong>{bankName}</strong> &bull; STK: <strong>{accountNumber}</strong> ({accountHolder})
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Nhập mã PIN bảo mật cấp 2 (6 số)
                </label>
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  {pinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        pinInputRefs.current[idx] = el;
                      }}
                      type="password"
                      maxLength={1}
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(idx, e)}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-mono font-black rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 outline-none shadow-2xs"
                    />
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  Mã PIN mặc định ban đầu là <strong className="font-mono text-emerald-600">123456</strong> nếu chưa đổi.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep('FORM')}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Quay lại sửa thông tin
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUpdate}
                  disabled={isSubmitting || pinDigits.some((d) => !d)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">
                    {isSubmitting ? 'sync' : 'verified'}
                  </span>
                  <span>{isSubmitting ? 'Đang lưu...' : 'Xác nhận & Lưu STK'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
