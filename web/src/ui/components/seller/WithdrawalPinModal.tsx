import React, { useState, useRef, useEffect } from 'react';
import { walletApi, payoutApi, type WalletSecurityStatus } from '../../api/walletApi';

export interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  businessName: string;
}

export interface WithdrawalPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
  availableBalance?: number;
  bankInfo?: BankInfo;
  onSuccess?: () => Promise<void> | void;
  onSubmitPayout?: (data: { amount: number; pin: string }) => Promise<void> | void;
}

type ModalStep = 'LOADING' | 'SETUP_PIN' | 'ENTER_PIN' | 'ENTER_2FA' | 'SUCCESS_VERIFIED' | 'LOCKED';

export default function WithdrawalPinModal({
  isOpen,
  onClose,
  storeId = 'store-default',
  availableBalance = 0,
  bankInfo = {
    bankName: 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)',
    accountNumber: '1029384756',
    accountHolder: 'NXB KIM DONG OFFICIAL',
    businessName: 'Công Ty TNHH MTV Nhà Xuất Bản Kim Đồng',
  },
  onSuccess,
  onSubmitPayout,
}: WithdrawalPinModalProps) {
  const [step, setStep] = useState<ModalStep>('LOADING');
  const [amount, setAmount] = useState('');
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', '']);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [challengeId, setChallengeId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<WalletSecurityStatus | null>(null);

  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setAmount(availableBalance > 0 ? String(availableBalance) : '');
      setPinDigits(['', '', '', '', '', '']);
      setOtpDigits(['', '', '', '', '', '']);
      setErrorMsg('');
      setInfoMsg('');
      setIsSubmitting(false);
      loadSecurityStatus();
    }
  }, [isOpen, availableBalance, storeId]);

  const loadSecurityStatus = async () => {
    setStep('LOADING');
    try {
      const res = await walletApi.getSecurityStatus(storeId);
      if (res?.data) {
        const sec = res.data;
        setSecurityStatus(sec);
        if (sec.isLocked) {
          setStep('LOCKED');
        } else if (!sec.hasPin) {
          setStep('SETUP_PIN');
        } else {
          setStep('ENTER_PIN');
        }
      } else {
        setStep('ENTER_PIN');
      }
    } catch {
      setStep('ENTER_PIN');
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

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    setErrorMsg('');

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Step 1A: Setup Initial PIN
  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = pinDigits.join('');
    if (pin.length !== 6) {
      setErrorMsg('Vui lòng nhập đầy đủ 6 chữ số mã PIN.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await walletApi.setupPin(storeId, pin);
      setInfoMsg('Thiết lập mã PIN thành công! Vui lòng xác thực PIN để tiếp tục.');
      setPinDigits(['', '', '', '', '', '']);
      setStep('ENTER_PIN');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể thiết lập mã PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1B: Verify PIN & Request Step-Up 2FA
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = pinDigits.join('');
    if (pin.length !== 6) {
      setErrorMsg('Vui lòng nhập đầy đủ mã PIN giao dịch 6 chữ số.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const pinRes = await walletApi.verifyPin(storeId, pin, 'WALLET_WITHDRAWAL');
      if (pinRes?.data?.verified && pinRes.data.step1Token) {
        // Request 2FA challenge OTP bound to PIN Step-1 proof
        const chalRes = await walletApi.issueTwoFactorChallenge(storeId, 'WALLET_WITHDRAWAL', pinRes.data.step1Token);
        if (chalRes?.data?.challengeId) {
          setChallengeId(chalRes.data.challengeId);
          setInfoMsg('Mã OTP 6 số đã được gửi đến email đăng ký của bạn.');
          setStep('ENTER_2FA');
        }
      }
    } catch (err: any) {
      if (err?.code === 'WALLET_SECURITY_LOCKED') {
        setStep('LOCKED');
      }
      setErrorMsg(err?.message || 'Mã PIN không chính xác.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify 2FA OTP Code & Submit Payout Request
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      setErrorMsg('Vui lòng nhập đầy đủ mã OTP 6 chữ số.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const verifyRes = await walletApi.verifyTwoFactorChallenge(storeId, challengeId, otp);
      if (verifyRes?.data?.verified && verifyRes.data.financeAuthToken) {
        // Step 3: Automatically submit payout request with the single-use financeAuthToken
        const idempotencyKey = `IDEMP-PO-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await payoutApi.createPayoutRequest(storeId, {
          amount: Number(amount),
          financeAuthToken: verifyRes.data.financeAuthToken,
          idempotencyKey,
        });

        setStep('SUCCESS_VERIFIED');
        if (onSuccess) {
          await onSuccess();
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">shield_lock</span>
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Xác Thực Bảo Mật Rút Tiền (SEC-002)
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* LOADING STATE */}
        {step === 'LOADING' && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
            <p className="text-xs text-slate-500">Đang tải trạng thái bảo mật ví...</p>
          </div>
        )}

        {/* LOCKED STATE */}
        {step === 'LOCKED' && (
          <div className="py-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">lock_clock</span>
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-rose-600 text-sm">Chức Năng Rút Tiền Đang Tạm Khóa</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Bạn đã nhập sai mã PIN 5 lần liên tiếp. Vì lý do an toàn, chức năng rút tiền tạm khóa trong 24 giờ.
              </p>
              {securityStatus?.lockedUntil && (
                <p className="text-[11px] text-slate-500 font-mono pt-1">
                  Mở khóa lúc: {new Date(securityStatus.lockedUntil).toLocaleString('vi-VN')}
                </p>
              )}
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* STEP: SETUP INITIAL PIN */}
        {step === 'SETUP_PIN' && (
          <form onSubmit={handleSetupPin} className="space-y-4 pt-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold">Lưu ý:</span> Gian hàng chưa thiết lập mã PIN rút tiền. Vui lòng tạo mã PIN 6 chữ số bí mật để bảo vệ tài khoản.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Tạo Mã PIN Giao Dịch Mới (6 Chữ Số)
              </label>
              <div className="flex justify-between gap-2">
                {pinDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { pinInputRefs.current[idx] = el; }}
                    type="password"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(idx, e.target.value)}
                    className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                ))}
              </div>
            </div>

            {errorMsg && <p className="text-xs text-rose-500 font-medium">{errorMsg}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu Mã PIN'}
              </button>
            </div>
          </form>
        )}

        {/* STEP: ENTER PIN (STEP 1) */}
        {step === 'ENTER_PIN' && (
          <form onSubmit={handleVerifyPin} className="space-y-4 pt-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tài Khoản Thụ Hưởng (Đã KYC)
              </label>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">{bankInfo.bankName}</div>
                <div className="text-slate-500 dark:text-slate-400 font-mono">STK: {bankInfo.accountNumber}</div>
                <div className="text-slate-500 dark:text-slate-400 uppercase">Chủ TK: {bankInfo.accountHolder}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Số Tiền Rút (₫)
                </label>
                <span className="text-[11px] text-slate-500">
                  Khả dụng: <strong className="text-emerald-600">{availableBalance.toLocaleString('vi-VN')} ₫</strong>
                </span>
              </div>
              <input 
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Nhập số tiền cần rút..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nhập Mã PIN Giao Dịch (6 Chữ Số)
              </label>
              <div className="flex justify-between gap-2">
                {pinDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { pinInputRefs.current[idx] = el; }}
                    type="password"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(idx, e.target.value)}
                    className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                ))}
              </div>
            </div>

            {infoMsg && <p className="text-xs text-emerald-600 font-medium">{infoMsg}</p>}
            {errorMsg && <p className="text-xs text-rose-500 font-medium">{errorMsg}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? 'Đang xác thực...' : 'Xác Thực PIN'}
              </button>
            </div>
          </form>
        )}

        {/* STEP: ENTER 2FA OTP (STEP 2) */}
        {step === 'ENTER_2FA' && (
          <form onSubmit={handleVerify2FA} className="space-y-4 pt-4">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
              <span className="font-bold">Xác thực bước 2:</span> Mã OTP xác thực 6 số đã được gửi tới email của bạn. Mã có hiệu lực trong 5 phút.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Nhập Mã Xác Thực OTP (6 Số)
              </label>
              <div className="flex justify-between gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { otpInputRefs.current[idx] = el; }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    className="w-11 h-12 text-center text-lg font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                ))}
              </div>
            </div>

            {errorMsg && <p className="text-xs text-rose-500 font-medium">{errorMsg}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('ENTER_PIN')}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                Quay Lại
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? 'Đang kiểm tra...' : 'Xác Thực 2FA'}
              </button>
            </div>
          </form>
        )}

        {/* STEP: SUCCESS VERIFIED (PAYOUT REQUEST SUBMITTED) */}
        {step === 'SUCCESS_VERIFIED' && (
          <div className="py-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-emerald-600 text-sm">Đã Gửi Yêu Cầu Rút Tiền Thành Công!</h4>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                Trạng thái: Đang chờ duyệt (PENDING)
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Số tiền rút đã được phong tỏa an toàn trong ví. Ban quản trị sẽ thẩm định và giải ngân về tài khoản ngân hàng của bạn.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md cursor-pointer"
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
