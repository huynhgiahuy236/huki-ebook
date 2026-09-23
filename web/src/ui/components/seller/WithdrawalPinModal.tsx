"use client";

import React, { useState, useRef, useEffect } from 'react';
import { walletApi } from '../../api/walletApi';

export interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  businessName?: string;
}

export interface WithdrawalPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
  availableBalance?: number;
  bankInfo?: BankInfo;
  onSuccess?: () => Promise<void> | void;
}

type ModalStep = 'CONFIRM' | 'ENTER_PIN' | 'SUCCESS' | 'LOCKED';

function formatVND(amount?: number | null): string {
  if (!amount || isNaN(amount)) return '0 ₫';
  return `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
}

export default function WithdrawalPinModal({
  isOpen,
  onClose,
  storeId = 'store-default',
  availableBalance = 0,
  bankInfo = {
    bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
    accountNumber: '1029384756',
    accountHolder: 'DOANH NGHIỆP SELLER',
  },
  onSuccess,
}: WithdrawalPinModalProps) {
  const [step, setStep] = useState<ModalStep>('CONFIRM');
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockSecondsRemaining, setLockSecondsRemaining] = useState<number | null>(null);
  const [withdrawnAmount, setWithdrawnAmount] = useState<number>(0);

  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStep('CONFIRM');
      setPinDigits(['', '', '', '', '', '']);
      setErrorMsg('');
      setIsSubmitting(false);
      setLockSecondsRemaining(null);
      setWithdrawnAmount(0);
      checkInitialLock();
    }
  }, [isOpen, storeId]);

  // Lock countdown timer
  useEffect(() => {
    if (lockSecondsRemaining && lockSecondsRemaining > 0) {
      const timer = setInterval(() => {
        setLockSecondsRemaining((prev) => {
          if (!prev || prev <= 1) {
            clearInterval(timer);
            setStep('ENTER_PIN');
            setErrorMsg('');
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockSecondsRemaining]);

  const checkInitialLock = async () => {
    try {
      const res = await walletApi.getSecurityStatus(storeId);
      if (res?.data?.isLocked && res.data.lockedUntil) {
        const lockedUntilDate = new Date(res.data.lockedUntil);
        const diffSeconds = Math.max(0, Math.ceil((lockedUntilDate.getTime() - Date.now()) / 1000));
        if (diffSeconds > 0) {
          setLockSecondsRemaining(diffSeconds);
          setStep('LOCKED');
        }
      }
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

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

  const handleConfirmToPin = () => {
    if (availableBalance <= 0) {
      setErrorMsg('Số dư ví hiện tại là 0 ₫, không thể rút tiền.');
      return;
    }
    setStep('ENTER_PIN');
    setTimeout(() => {
      pinInputRefs.current[0]?.focus();
    }, 100);
  };

  const handleExecuteWithdrawal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const pin = pinDigits.join('');
    if (pin.length !== 6) {
      setErrorMsg('Vui lòng nhập đầy đủ 6 chữ số mã PIN giao dịch.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await walletApi.withdrawAllBalance(storeId, pin);
      if (res?.success || res?.data?.success) {
        const amountDrawn = res.data?.withdrawnAmount || availableBalance;
        setWithdrawnAmount(amountDrawn);
        setStep('SUCCESS');
        if (onSuccess) {
          await onSuccess();
        }
      } else {
        const errorData = res?.error as any;
        const remaining = res?.data?.remainingAttempts || errorData?.remainingAttempts;
        const lockedUntil = errorData?.lockedUntil;
        const remainingSeconds = errorData?.remainingSeconds || 180;

        if (errorData?.code === 'WALLET_SECURITY_LOCKED' || lockedUntil) {
          setLockSecondsRemaining(remainingSeconds);
          setStep('LOCKED');
        } else {
          setPinDigits(['', '', '', '', '', '']);
          pinInputRefs.current[0]?.focus();
          setErrorMsg(
            res?.error?.message ||
              (remaining !== undefined
                ? `Mã PIN không chính xác. Bạn còn ${remaining} lần thử lại (tối đa 5 lần).`
                : 'Mã PIN không chính xác.')
          );
        }
      }
    } catch (err: any) {
      if (err?.code === 'WALLET_SECURITY_LOCKED') {
        setLockSecondsRemaining(err?.remainingSeconds || 180);
        setStep('LOCKED');
      } else {
        setPinDigits(['', '', '', '', '', '']);
        pinInputRefs.current[0]?.focus();
        setErrorMsg(err?.message || 'Có lỗi kết nối hệ thống. Số dư ví vẫn được giữ nguyên 100%.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 sm:p-7 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
              <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Rút Tiền Về Tài Khoản Ngân Hàng
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Xác thực bảo mật mã PIN 6 số gian hàng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* POPUP BƯỚC 1: XÁC NHẬN RÚT TOÀN BỘ SỐ DƯ VÍ */}
        {/* ========================================================================= */}
        {step === 'CONFIRM' && (
          <div className="space-y-5 pt-5">
            {/* Card Số Tiền Sẽ Rút */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Tổng Số Tiền Rút (Toàn Bộ Số Dư Khả Dụng)
              </span>
              <div className="font-mono text-3xl font-black text-emerald-700 dark:text-emerald-400">
                {formatVND(availableBalance)}
              </div>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                Hệ thống sẽ chuyển toàn bộ số dư khả dụng về tài khoản ngân hàng thụ hưởng.
              </p>
            </div>

            {/* Card Thông Tin Tài Khoản Thụ Hưởng (Đã KYC) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="material-symbols-outlined text-emerald-600 text-sm">verified_user</span>
                <span>Tài Khoản Thụ Hưởng Doanh Nghiệp (Đã KYC)</span>
              </div>
              <div className="text-xs space-y-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Ngân hàng:</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-right">{bankInfo.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Số tài khoản:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{bankInfo.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Chủ tài khoản:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase">{bankInfo.accountHolder}</span>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* Nút hành động Bước 1 */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmToPin}
                disabled={availableBalance <= 0}
                className="w-1/2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm font-bold text-white shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>Xác Nhận Rút Tiền</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* POPUP BƯỚC 2: NHẬP MÃ PIN 6 SỐ CỦA GIAN HÀNG */}
        {/* ========================================================================= */}
        {step === 'ENTER_PIN' && (
          <form onSubmit={handleExecuteWithdrawal} className="space-y-5 pt-5">
            <div className="text-center space-y-1">
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                Nhập Mã PIN Giao Dịch Gian Hàng
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhập mã PIN 6 số của gian hàng để hoàn tất lệnh rút {formatVND(availableBalance)}.
              </p>
            </div>

            {/* 6 Ô Nhập PIN Numeric */}
            <div>
              <div className="flex justify-between gap-2 max-w-xs mx-auto">
                {pinDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      pinInputRefs.current[idx] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(idx, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(idx, e)}
                    className="w-11 h-13 text-center text-2xl font-bold rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-2xs"
                  />
                ))}
              </div>
              <p className="text-[11px] text-center text-slate-400 mt-2">
                (Mã PIN mặc định của tài khoản hiện tại: <strong className="text-slate-600 dark:text-slate-300">123456</strong>)
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium text-center">
                {errorMsg}
              </div>
            )}

            {/* Nút hành động Bước 2 */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('CONFIRM')}
                disabled={isSubmitting}
                className="w-1/2 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Quay Lại
              </button>
              <button
                type="submit"
                disabled={isSubmitting || pinDigits.join('').length !== 6}
                className="w-1/2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm font-bold text-white shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>Xác Nhận Rút Tiền</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* MÀN HÌNH TẠM KHÓA: NHẬP SAI QUÁ 5 LẦN (KHÓA 3 PHÚT) */}
        {/* ========================================================================= */}
        {step === 'LOCKED' && (
          <div className="py-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-3xl">lock_clock</span>
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-rose-600 dark:text-rose-400 text-base">
                Tạm Khóa Tính Năng Rút Tiền (3 Phút)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                Bạn đã nhập sai mã PIN 5 lần liên tiếp. Để bảo vệ an toàn tài sản, tính năng rút tiền tạm thời bị khóa trong đúng 3 phút.
              </p>
              <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 inline-block font-mono text-lg font-bold text-rose-700 dark:text-rose-300 mt-2">
                Thời gian mở khóa: {lockSecondsRemaining !== null ? `${lockSecondsRemaining}s` : '3 phút'}
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold pt-1">
                ✓ Toàn bộ 100% số dư trong ví được giữ nguyên vẹn, không bị khấu trừ.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MÀN HÌNH THÀNH CÔNG: RÚT TIỀN HOÀN TẤT */}
        {/* ========================================================================= */}
        {step === 'SUCCESS' && (
          <div className="py-6 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-3xl">verified</span>
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                Rút Tiền Thành Công!
              </h4>
              <p className="font-mono text-2xl font-black text-slate-900 dark:text-white">
                {formatVND(withdrawnAmount)}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
                Lệnh rút tiền đã được thực hiện thành công về tài khoản <strong className="text-slate-900 dark:text-white">{bankInfo.bankName}</strong> (STK: {bankInfo.accountNumber}).
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                Số dư ví đã chuyển về 0 ₫ và đã ghi nhận vào tab <strong>Nhật Ký Biến Động Ví</strong>.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs sm:text-sm font-bold text-white shadow-md transition-all cursor-pointer"
              >
                Hoàn Tất
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
