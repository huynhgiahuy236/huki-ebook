"use client";

import React, { useState, useRef, useEffect } from 'react';
import { walletApi } from '@/ui/api/walletApi';
import { useToast } from '@/ui/context/ToastContext';

export interface UpdatePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
  onSuccess?: () => Promise<void> | void;
}

const WEAK_PINS = ['123456', '654321', '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999', '123123'];

export default function UpdatePinModal({
  isOpen,
  onClose,
  storeId = 'default',
  onSuccess,
}: UpdatePinModalProps) {
  const { showToast } = useToast();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const currentPinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setErrorMsg('');
      setIsSubmitting(false);
      setIsSuccess(false);
      setTimeout(() => currentPinRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!/^\d{6}$/.test(currentPin)) {
      setErrorMsg('Vui lòng nhập đầy đủ 6 chữ số mã PIN hiện tại.');
      return;
    }
    if (!/^\d{6}$/.test(newPin)) {
      setErrorMsg('Vui lòng nhập đầy đủ 6 chữ số mã PIN mới.');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMsg('Mã PIN mới và xác nhận mã PIN không trùng khớp.');
      return;
    }

    // 1. Kiểm tra không được trùng với mã PIN hiện tại
    if (newPin === currentPin) {
      setErrorMsg('Mã PIN mới không được trùng với mã PIN hiện tại. Vui lòng chọn 6 chữ số khác.');
      return;
    }

    // 2. Kiểm tra dãy số yếu
    if (WEAK_PINS.includes(newPin)) {
      setErrorMsg('Mã PIN mới quá đơn giản hoặc dễ đoán (123456, 000000,...). Vui lòng chọn dãy số bảo mật hơn.');
      return;
    }

    // 3. Kiểm tra không được trùng với các mã PIN cũ trong lịch sử (Quy định không dùng lại PIN cũ)
    const historyKey = `huki_pin_history_${storeId}`;
    let pinHistory: string[] = [];
    try {
      pinHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
    } catch {
      pinHistory = [];
    }

    if (pinHistory.includes(newPin)) {
      setErrorMsg('Mã PIN này đã từng được sử dụng trước đây. Theo quy chuẩn bảo mật định kỳ, bạn không được sử dụng lại mã PIN cũ.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await walletApi.changePin(storeId, {
        currentPin,
        newPin,
      });

      if (res.success || (res as any)?.data?.message) {
        // Lưu lịch sử các mã PIN đã dùng (tối đa 5 mã gần nhất)
        const updatedHistory = [currentPin, ...pinHistory.filter((p) => p !== currentPin && p !== newPin)].slice(0, 5);
        localStorage.setItem(historyKey, JSON.stringify(updatedHistory));

        // Lưu thời điểm cập nhật PIN để tính chu kỳ 3 tháng (90 ngày)
        const updateTimeKey = `huki_pin_updated_at_${storeId}`;
        localStorage.setItem(updateTimeKey, new Date().toISOString());

        setIsSuccess(true);
        showToast?.('🎉 Đổi mã PIN bảo mật thành công! Mã PIN mới có hiệu lực trong 3 tháng (90 ngày).', 'success');

        if (onSuccess) {
          await onSuccess();
        }
      } else {
        setErrorMsg(res.error?.message || 'Không thể đổi mã PIN. Vui lòng kiểm tra lại mã PIN hiện tại.');
      }
    } catch (err: any) {
      console.error('Change PIN failed:', err);
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi đổi mã PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">lock_reset</span>
            </div>
            <div>
              <h3 className="font-editorial text-lg font-bold text-slate-900 dark:text-white">
                Cập Nhật Mã PIN Rút Tiền
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chính sách an toàn: Định kỳ 3 tháng (90 ngày) / lần
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
        <div className="p-6 space-y-5">
          {/* Policy Information Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-900 dark:text-emerald-200 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
              <span className="material-symbols-outlined text-base">verified_user</span>
              <span>Quy Chuẩn Bảo Mật Ví Tiền Định Kỳ</span>
            </p>
            <ul className="space-y-1 text-[11.5px] list-disc list-inside text-slate-600 dark:text-slate-300 leading-relaxed">
              <li>Mã PIN có chu kỳ hiệu lực <strong>3 tháng (90 ngày)</strong>.</li>
              <li>Mã PIN mới <strong>không được trùng với mã PIN hiện tại</strong>.</li>
              <li>Không được sử dụng lại các <strong>mã PIN cũ trong lịch sử</strong>.</li>
              <li>Không đặt các dãy số dễ đoán (<code className="font-mono">123456</code>, <code className="font-mono">000000</code>).</li>
            </ul>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-3xl">check</span>
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                Đổi Mã PIN Thành Công!
              </h4>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Mã PIN bảo mật mới của bạn đã được kích hoạt. Bạn có thể sử dụng mã PIN này để xác thực rút tiền trong <strong>90 ngày tới</strong>.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Hoàn tất
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Mã PIN hiện tại <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={currentPinRef}
                  type="password"
                  maxLength={6}
                  required
                  inputMode="numeric"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập 6 số PIN hiện tại (mặc định 123456)..."
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono tracking-widest text-slate-900 dark:text-white outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Mã PIN mới (6 chữ số) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  inputMode="numeric"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập 6 chữ số mới (không trùng PIN cũ)..."
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono tracking-widest text-slate-900 dark:text-white outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Xác nhận lại mã PIN mới <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập lại chính xác 6 số PIN mới..."
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono tracking-widest text-slate-900 dark:text-white outline-none focus:border-emerald-600"
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
                  disabled={isSubmitting || currentPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">
                    {isSubmitting ? 'sync' : 'security'}
                  </span>
                  <span>{isSubmitting ? 'Đang cập nhật...' : 'Lưu Mã PIN Mới'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
