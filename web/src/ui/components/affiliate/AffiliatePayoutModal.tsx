'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/ui/context/ToastContext';
import { affiliateApi } from '@/lib/affiliate/affiliateApi';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

export interface AffiliatePayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableAmount: number;
  bankSnapshot?: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountHolderName: string;
  } | null;
  onSuccess: () => void;
  onOpenKyc?: () => void;
}

export default function AffiliatePayoutModal({
  isOpen,
  onClose,
  availableAmount,
  bankSnapshot,
  onSuccess,
  onOpenKyc,
}: AffiliatePayoutModalProps) {
  const { showToast } = useToast();

  const [amount, setAmount] = useState<number>(availableAmount);
  const [amountStr, setAmountStr] = useState<string>(availableAmount.toLocaleString('vi-VN'));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const defaultAmt = Math.max(0, availableAmount);
      setAmount(defaultAmt);
      setAmountStr(defaultAmt > 0 ? defaultAmt.toLocaleString('vi-VN') : '');
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen, availableAmount]);

  if (!isOpen) return null;

  const minPayout = 100000;
  const maxPayout = 50000000;

  const handleAmountChange = (val: string) => {
    setErrorMsg(null);
    const numeric = parseInt(val.replace(/\D/g, ''), 10) || 0;
    setAmount(numeric);
    setAmountStr(numeric > 0 ? numeric.toLocaleString('vi-VN') : '');
  };

  const handleSelectQuickAmount = (val: number) => {
    setErrorMsg(null);
    const clamped = Math.min(val, availableAmount);
    setAmount(clamped);
    setAmountStr(clamped.toLocaleString('vi-VN'));
  };

  // Tax calculation: 10% PIT if transaction amount >= 2,000,000 VND
  const taxRate = amount >= 2000000 ? 0.1 : 0;
  const taxAmount = Math.round(amount * taxRate);
  const netReceived = Math.max(0, amount - taxAmount);

  const isValidAmount =
    amount >= minPayout &&
    amount <= Math.min(maxPayout, availableAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return; // AF-006: Concurrency guard against duplicate submits

    if (!bankSnapshot || !bankSnapshot.accountNumber) {
      setErrorMsg('Vui lòng thiết lập tài khoản ngân hàng thụ hưởng trước khi tạo lệnh rút tiền.');
      return;
    }

    if (amount < minPayout) {
      setErrorMsg(`Hạn mức rút tối thiểu là ${minPayout.toLocaleString('vi-VN')} đ.`);
      return;
    }

    if (amount > availableAmount) {
      setErrorMsg('Số tiền yêu cầu vượt quá hoa hồng khả dụng hiện tại.');
      return;
    }

    if (amount > maxPayout) {
      setErrorMsg(`Hạn mức rút tối đa là ${maxPayout.toLocaleString('vi-VN')} đ / lần.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const idempotencyKey =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `payout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const res = await affiliateApi.requestPayout({
        amount,
        idempotencyKey,
      });

      if (res.success) {
        showToast('Yêu cầu rút hoa hồng đã được tiếp nhận thành công!', 'success');
        try {
          realtimeSyncBus.publish('WALLET_BALANCE_UPDATED', {
            type: 'AFFILIATE_PAYOUT_REQUESTED',
            amount,
          });
        } catch {}
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error?.message || 'Không thể tạo lệnh rút tiền vào lúc này.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight">Rút Hoa Hồng Về Tài Khoản</h2>
              <p className="text-[11px] text-white/80">Giải ngân hoa hồng đối tác tiếp thị</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Bank Info Snapshot Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-emerald-700">account_balance</span>
                Ngân Hàng Thụ Hưởng
              </span>
              {onOpenKyc && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenKyc();
                  }}
                  className="text-emerald-700 hover:text-emerald-800 text-[11px] font-semibold cursor-pointer"
                >
                  Thay đổi →
                </button>
              )}
            </div>

            {bankSnapshot && bankSnapshot.accountNumber ? (
              <div className="space-y-0.5 text-xs">
                <p className="font-bold text-slate-900">
                  {bankSnapshot.bankName} ({bankSnapshot.bankCode})
                </p>
                <p className="font-mono text-slate-700">
                  STK: <strong>{bankSnapshot.accountNumber}</strong>
                </p>
                <p className="text-slate-500 uppercase text-[11px]">
                  Chủ TK: {bankSnapshot.accountHolderName}
                </p>
              </div>
            ) : (
              <div className="py-2 text-center text-xs text-amber-800">
                <p className="font-semibold">Chưa có thông tin tài khoản ngân hàng!</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Vui lòng cập nhật ngân hàng trước khi gửi yêu cầu.
                </p>
              </div>
            )}
          </div>

          {/* Balance Overview */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs">
            <span className="text-emerald-900 font-medium">Hoa hồng khả dụng hiện tại:</span>
            <span className="font-mono font-bold text-emerald-800 text-sm">
              {availableAmount.toLocaleString('vi-VN')} ₫
            </span>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Số Tiền Cần Rút (VND) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="Tối thiểu 100.000"
                disabled={isSubmitting}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900 focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₫
              </span>
            </div>

            {/* Quick Amount Selector */}
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              {[100000, 500000, 1000000, 2000000].map((quickVal) => (
                <button
                  key={quickVal}
                  type="button"
                  disabled={quickVal > availableAmount || isSubmitting}
                  onClick={() => handleSelectQuickAmount(quickVal)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    amount === quickVal
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {(quickVal / 1000).toLocaleString('vi-VN')}k
                </button>
              ))}
              <button
                type="button"
                disabled={availableAmount < minPayout || isSubmitting}
                onClick={() => handleSelectQuickAmount(availableAmount)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  amount === availableAmount
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Tất cả ({availableAmount.toLocaleString('vi-VN')}đ)
              </button>
            </div>
          </div>

          {/* Tax & Breakdown */}
          {amount >= 100000 && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Số tiền yêu cầu rút:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {amount.toLocaleString('vi-VN')} ₫
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>
                  Khấu trừ thuế TNCN (10% khi &ge; 2tr):
                </span>
                <span className="font-mono text-slate-700">
                  {taxAmount > 0 ? `-${taxAmount.toLocaleString('vi-VN')} ₫` : '0 ₫'}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                <span>Thực nhận về STK:</span>
                <span className="font-mono text-emerald-700">
                  {netReceived.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5 font-medium">
              <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !isValidAmount ||
                !bankSnapshot?.accountNumber ||
                availableAmount < minPayout
              }
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý giao dịch...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
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
