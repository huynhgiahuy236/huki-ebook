'use client';

import React, { useState } from 'react';
import { useToast } from '@/ui/context/ToastContext';
import { affiliateApi } from '@/lib/affiliate/affiliateApi';
import { VIETNAM_BANKS } from '@/data/vietnam-banks';

export interface AffiliateKycModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultHolderName?: string;
  currentBankSnapshot?: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountHolderName: string;
  } | null;
  onSuccess: () => void;
}

export default function AffiliateKycModal({
  isOpen,
  onClose,
  defaultHolderName = '',
  currentBankSnapshot,
  onSuccess,
}: AffiliateKycModalProps) {
  const { showToast } = useToast();

  const [selectedBankCode, setSelectedBankCode] = useState<string>(
    currentBankSnapshot?.bankCode || 'MB'
  );
  const [accountNumber, setAccountNumber] = useState<string>(
    currentBankSnapshot?.accountNumber || ''
  );
  const [accountHolderName, setAccountHolderName] = useState<string>(
    currentBankSnapshot?.accountHolderName || defaultHolderName.toUpperCase()
  );
  const [idCardNumber, setIdCardNumber] = useState<string>('079090123456');
  const [idCardIssueDate, setIdCardIssueDate] = useState<string>('2023-01-15');
  const [idCardIssuePlace, setIdCardIssuePlace] = useState<string>('Cục Cảnh sát QLHC về TTXH');
  const [frontImageUrl, setFrontImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80'
  );
  const [backImageUrl, setBackImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Dung lượng ảnh tối đa 5MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (side === 'front') {
        setFrontImageUrl(result);
      } else {
        setBackImageUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanAccount = accountNumber.trim();
    const cleanHolder = accountHolderName.trim().toUpperCase();
    const cleanId = idCardNumber.trim();
    const cleanDate = idCardIssueDate.trim();
    const cleanPlace = idCardIssuePlace.trim();

    if (!cleanAccount || cleanAccount.length < 6) {
      setErrorMsg('Vui lòng nhập số tài khoản ngân hàng hợp lệ (tối thiểu 6 ký tự số).');
      return;
    }

    if (!cleanHolder || cleanHolder.length < 3) {
      setErrorMsg('Vui lòng nhập họ và tên chủ tài khoản (in hoa không dấu).');
      return;
    }

    if (!/^[0-9]{9,12}$/.test(cleanId)) {
      setErrorMsg('Số CCCD / CMND phải gồm 9 hoặc 12 chữ số.');
      return;
    }

    if (!cleanDate) {
      setErrorMsg('Vui lòng chọn ngày cấp CCCD.');
      return;
    }

    if (!cleanPlace) {
      setErrorMsg('Vui lòng nhập nơi cấp CCCD.');
      return;
    }

    if (!frontImageUrl) {
      setErrorMsg('Vui lòng tải lên ảnh mặt trước CCCD.');
      return;
    }

    if (!backImageUrl) {
      setErrorMsg('Vui lòng tải lên ảnh mặt sau CCCD.');
      return;
    }

    const selectedBank = VIETNAM_BANKS.find((b) => b.code === selectedBankCode) || {
      name: 'Ngân hàng TMCP Quân đội (MB Bank)',
      shortName: 'MB Bank',
      code: 'MB',
    };

    setIsSubmitting(true);
    try {
      const res = await affiliateApi.submitKyc({
        legalName: cleanHolder,
        idCardNumber: cleanId,
        idCardIssueDate: cleanDate,
        idCardIssuePlace: cleanPlace,
        frontImageUrl,
        backImageUrl,
        bankName: selectedBank.name,
        bankCode: selectedBank.code,
        accountNumber: cleanAccount,
        accountHolderName: cleanHolder,
      });

      if (res.success) {
        showToast('Thiết lập tài khoản ngân hàng & KYC thành công!', 'success');
        onSuccess();
        onClose();
      } else {
        const msg = res.error?.message || 'Có lỗi xảy ra khi lưu thông tin tài khoản.';
        setErrorMsg(msg);
        showToast(msg, 'error');
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ. Vui lòng thử lại sau.');
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-50/70 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[20px]">account_balance</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Tài Khoản Ngân Hàng &amp; KYC Rút Hoa Hồng
              </h3>
              <p className="text-[11px] text-gray-500">
                Thiết lập thông tin nhận thanh toán tự động khi hoa hồng đạt từ 100.000đ.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/60 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Bank Select */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Ngân hàng thụ hưởng <span className="text-red-500">*</span>:
            </label>
            <select
              value={selectedBankCode}
              onChange={(e) => setSelectedBankCode(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 text-xs font-medium cursor-pointer"
            >
              {VIETNAM_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.shortName} - {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Account Number */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Số tài khoản ngân hàng <span className="text-red-500">*</span>:
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="VD: 19038291829012"
              className="w-full h-10 px-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 text-xs font-mono"
              required
            />
          </div>

          {/* Account Holder Name */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Họ và tên chủ tài khoản (In hoa không dấu) <span className="text-red-500">*</span>:
            </label>
            <input
              type="text"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value.toUpperCase())}
              placeholder="VD: NGUYEN VAN A"
              className="w-full h-10 px-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 text-xs font-bold uppercase tracking-wider"
              required
            />
            <p className="text-[10.5px] text-gray-400 mt-1">
              Tên chủ tài khoản ngân hàng bắt buộc phải trùng khớp với tên định danh CCCD.
            </p>
          </div>

          {/* ID Card / CCCD */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Số Căn Cước Công Dân (CCCD / CMND) <span className="text-red-500">*</span>:
            </label>
            <input
              type="text"
              value={idCardNumber}
              onChange={(e) => setIdCardNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="12 chữ số trên thẻ CCCD gắn chip"
              className="w-full h-10 px-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 text-xs font-mono"
              required
            />
            <p className="text-[10.5px] text-gray-400 mt-1">
              Dùng để quyết toán Thuế Thu nhập Cá nhân (TNCN) theo quy định của Tổng cục Thuế.
            </p>
          </div>

          {/* Issue Date & Issue Place */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Ngày cấp CCCD <span className="text-red-500">*</span>:
              </label>
              <input
                type="date"
                value={idCardIssueDate}
                onChange={(e) => setIdCardIssueDate(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 text-xs font-medium cursor-pointer"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Nơi cấp CCCD <span className="text-red-500">*</span>:
              </label>
              <input
                type="text"
                value={idCardIssuePlace}
                onChange={(e) => setIdCardIssuePlace(e.target.value)}
                placeholder="VD: Cục Cảnh sát QLHC về TTXH"
                className="w-full h-10 px-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 text-xs font-medium"
                required
              />
            </div>
          </div>

          {/* 2-Sided CCCD Photos Upload */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Ảnh chụp CCCD 2 mặt (Xác minh danh tính minh bạch) <span className="text-red-500">*</span>:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Front Side */}
              <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50/50 flex flex-col items-center justify-center text-center space-y-2 hover:border-emerald-600 transition-colors">
                {frontImageUrl ? (
                  <div className="relative w-full h-24 rounded-lg overflow-hidden border border-gray-200">
                    <img src={frontImageUrl} alt="Mặt trước CCCD" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">Mặt trước</span>
                  </div>
                ) : (
                  <div className="w-full h-24 rounded-lg bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                    <span className="material-symbols-outlined text-[28px]">badge</span>
                    <span className="text-[10px]">Chưa tải ảnh mặt trước</span>
                  </div>
                )}
                <label className="px-3 py-1.5 bg-white border border-gray-300 hover:border-emerald-600 rounded-lg text-[11px] font-bold text-gray-700 cursor-pointer shadow-2xs flex items-center gap-1 transition-all">
                  <span className="material-symbols-outlined text-[14px]">upload_file</span>
                  <span>Chọn ảnh mặt trước</span>
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'front')} className="hidden" />
                </label>
              </div>

              {/* Back Side */}
              <div className="border border-dashed border-gray-300 rounded-xl p-3 bg-gray-50/50 flex flex-col items-center justify-center text-center space-y-2 hover:border-emerald-600 transition-colors">
                {backImageUrl ? (
                  <div className="relative w-full h-24 rounded-lg overflow-hidden border border-gray-200">
                    <img src={backImageUrl} alt="Mặt sau CCCD" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">Mặt sau</span>
                  </div>
                ) : (
                  <div className="w-full h-24 rounded-lg bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                    <span className="material-symbols-outlined text-[28px]">badge</span>
                    <span className="text-[10px]">Chưa tải ảnh mặt sau</span>
                  </div>
                )}
                <label className="px-3 py-1.5 bg-white border border-gray-300 hover:border-emerald-600 rounded-lg text-[11px] font-bold text-gray-700 cursor-pointer shadow-2xs flex items-center gap-1 transition-all">
                  <span className="material-symbols-outlined text-[14px]">upload_file</span>
                  <span>Chọn ảnh mặt sau</span>
                  <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'back')} className="hidden" />
                </label>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Định dạng JPG, PNG hoặc WebP, dung lượng dưới 5MB. Ảnh rõ nét, không bị lóa hoặc che khuất thông tin.
            </p>
          </div>

          {/* Regulatory Note */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-[11px] flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-emerald-700 shrink-0 mt-0.5">
              shield
            </span>
            <span>
              Thông tin số tài khoản và định danh được mã hóa bảo mật theo tiêu chuẩn ngân hàng và Nghị định 13/2023/NĐ-CP.
            </span>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">
                    progress_activity
                  </span>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>Xác Nhận &amp; Lưu Tài Khoản</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
