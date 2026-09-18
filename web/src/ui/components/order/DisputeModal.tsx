'use client';

import React, { useState } from 'react';
import { orderApi } from '../../api/orderApi';

export interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderCode: string;
  subOrderId?: string | null;
  storeName?: string;
  onSuccess?: (dispute: any) => void;
}

export type DisputeType =
  | 'NOT_AS_DESCRIBED'
  | 'DAMAGED'
  | 'WRONG_PRODUCT'
  | 'NOT_RECEIVED'
  | 'COUNTERFEIT'
  | 'OTHER';

export type DisputeResolution = 'REFUND' | 'REPLACE' | 'PARTIAL_REFUND';

const DISPUTE_TYPE_OPTIONS: Array<{ value: DisputeType; label: string; description: string }> = [
  {
    value: 'DAMAGED',
    label: 'Sách bị rách, gãy gáy hoặc hư hỏng',
    description: 'Sách nhận được bị lỗi vật lý do in ấn hoặc đóng gói, vận chuyển.',
  },
  {
    value: 'NOT_AS_DESCRIBED',
    label: 'Sản phẩm không đúng mô tả',
    description: 'Nội dung, phiên bản hoặc chất lượng thực tế khác xa với trang sản phẩm.',
  },
  {
    value: 'WRONG_PRODUCT',
    label: 'Giao sai sản phẩm / thiếu cuốn',
    description: 'Kiện hàng giao nhầm tựa sách khác hoặc thiếu số lượng đã đặt.',
  },
  {
    value: 'NOT_RECEIVED',
    label: 'Chưa nhận được hàng',
    description: 'Trạng thái báo đã giao nhưng thực tế khách hàng chưa nhận kiện hàng.',
  },
  {
    value: 'COUNTERFEIT',
    label: 'Nghi vấn sách giả / in lậu',
    description: 'Chất lượng giấy kém, mực in nhòe, không có tem bản quyền chuẩn.',
  },
  {
    value: 'OTHER',
    label: 'Lý do khác',
    description: 'Các sự cố khác cần Ban quản trị sàn Huki can thiệp.',
  },
];

const RESOLUTION_OPTIONS: Array<{ value: DisputeResolution; label: string; icon: string }> = [
  {
    value: 'REFUND',
    label: 'Hoàn tiền 100%',
    icon: 'payments',
  },
  {
    value: 'REPLACE',
    label: 'Đổi sản phẩm mới',
    icon: 'sync_alt',
  },
  {
    value: 'PARTIAL_REFUND',
    label: 'Hoàn tiền một phần',
    icon: 'price_change',
  },
];

export default function DisputeModal({
  isOpen,
  onClose,
  orderId,
  orderCode,
  subOrderId,
  storeName,
  onSuccess,
}: DisputeModalProps) {
  const [disputeType, setDisputeType] = useState<DisputeType>('DAMAGED');
  const [description, setDescription] = useState('');
  const [resolution, setResolution] = useState<DisputeResolution>('REFUND');
  const [evidenceList, setEvidenceList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);

  if (!isOpen) return null;

  const minChars = 50;
  const charsRemaining = Math.max(0, minChars - description.trim().length);
  const isDescriptionValid = description.trim().length >= minChars;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (evidenceList.length + files.length > 5) {
      setErrorMessage('Chỉ được tải lên tối đa 5 hình ảnh/tài liệu bằng chứng.');
      return;
    }

    setErrorMessage(null);
    setIsUploadingEvidence(true);

    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          setErrorMessage(`Tập tin "${file.name}" vượt quá dung lượng tối đa 5MB.`);
          continue;
        }

        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        if (!isImage && !isPdf) {
          setErrorMessage(`Tập tin "${file.name}" không phải định dạng được hỗ trợ (JPG, PNG, WEBP, PDF).`);
          continue;
        }

        const uploadRes = await orderApi.uploadDisputeEvidence(orderId, file);
        if (uploadRes.success && uploadRes.data?.url) {
          setEvidenceList((prev) => (prev.length < 5 ? [...prev, uploadRes.data!.url] : prev));
        } else {
          // Fallback: use local data URL for client preview if mock / offline
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const result = uploadEvent.target?.result as string;
            if (result) {
              setEvidenceList((prev) => (prev.length < 5 ? [...prev, result] : prev));
            }
          };
          reader.readAsDataURL(file);
        }
      }
    } catch {
      setErrorMessage('Không thể tải lên tập tin bằng chứng.');
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDescriptionValid) {
      setErrorMessage(`Vui lòng nhập mô tả chi tiết tối thiểu ${minChars} ký tự để Ban quản trị sàn đối soát.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await orderApi.createDispute(orderId, {
        type: disputeType,
        description: description.trim(),
        resolution,
        evidence: evidenceList,
        sellerOrderId: subOrderId || undefined,
      });

      if (res.success && res.data) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        setErrorMessage(res.error?.message || 'Có lỗi xảy ra khi gửi yêu cầu khiếu nại.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Có lỗi kết nối đến máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[var(--theme-surface,#ffffff)] rounded-3xl border border-[var(--theme-border,#e8e5df)] max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--theme-border,#e8e5df)] flex items-center justify-between bg-[var(--theme-surface-subtle,#f8f7f4)] shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center text-base font-bold">
              <span className="material-symbols-outlined text-[20px]">gavel</span>
            </span>
            <div>
              <h3 className="font-editorial text-base font-bold text-on-surface">
                Gửi Khiếu Nại & Trọng Tài Sàn (Dispute Submission)
              </h3>
              <p className="text-xs text-on-surface-variant">
                Đơn hàng #{orderCode} {storeName ? `• Gian hàng: ${storeName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-800 text-on-surface-variant transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-on-surface">
          {/* POL-12 Escrow Freeze Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <span className="material-symbols-outlined text-lg text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              shield_lock
            </span>
            <div className="space-y-1">
              <div className="font-bold text-xs">
                Chính Sách Bảo Vệ Người Mua (POL-12 & POL-14)
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                Ngay khi quý khách gửi khiếu nại, đồng hồ đếm ngược giải ngân tiền cho Shop sẽ được <strong>TẠM KHÓA (FROZEN)</strong> ngay lập tức. Cả hai bên có 72 giờ để cung cấp chứng cứ đối chất cho Trọng tài viên Huki.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
              <span className="material-symbols-outlined text-lg shrink-0">error</span>
              <span className="text-xs font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* Dispute Type Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-on-surface">
              1. Chọn Lý Do Khiếu Nại <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DISPUTE_TYPE_OPTIONS.map((opt) => {
                const isSelected = disputeType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDisputeType(opt.value)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                      isSelected
                        ? 'border-theme-primary bg-theme-primary/5 ring-2 ring-theme-primary/20'
                        : 'border-theme-border bg-theme-surface hover:bg-theme-surface-subtle'
                    }`}
                  >
                    <div className="font-bold text-xs text-on-surface flex items-center justify-between">
                      <span>{opt.label}</span>
                      {isSelected && (
                        <span className="material-symbols-outlined text-sm text-theme-primary">
                          check_circle
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-on-surface-variant line-clamp-2">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desired Resolution */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-on-surface">
              2. Phương Án Xử Lý Mong Muốn <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {RESOLUTION_OPTIONS.map((resOpt) => {
                const isSelected = resolution === resOpt.value;
                return (
                  <button
                    key={resOpt.value}
                    type="button"
                    onClick={() => setResolution(resOpt.value)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      isSelected
                        ? 'border-theme-primary bg-theme-primary/5 ring-2 ring-theme-primary/20 font-bold text-theme-primary'
                        : 'border-theme-border bg-theme-surface hover:bg-theme-surface-subtle text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">{resOpt.icon}</span>
                    <span className="text-xs">{resOpt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-on-surface">
                3. Mô Tả Chi Tiết Sự Cố <span className="text-rose-600">*</span>
              </label>
              <span
                className={`text-[11px] font-mono ${
                  isDescriptionValid ? 'text-emerald-600' : 'text-rose-600 font-semibold'
                }`}
              >
                {description.trim().length}/2000 {charsRemaining > 0 ? `(còn thiếu ${charsRemaining} ký tự)` : '✓'}
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Mô tả cụ thể tình trạng sách khi nhận (ví dụ: gáy sách bị rách ở trang 12, bìa trước bị ướt, vệt ố vàng...)"
              className="w-full p-3.5 rounded-2xl border border-theme-border bg-theme-bg text-xs text-on-surface focus:outline-none focus:border-theme-primary resize-none placeholder:text-on-surface-variant/60"
            />
            <p className="text-[11px] text-on-surface-variant">
              Tối thiểu 50 ký tự. Mô tả càng chi tiết sẽ giúp Trọng tài viên thụ lý nhanh chóng.
            </p>
          </div>

          {/* Evidence Upload Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-on-surface">
                4. Hình Ảnh / Video Bằng Chứng (Tối đa 5 tệp, tối đa 5MB/tệp)
              </label>
              <span className="text-[11px] text-on-surface-variant font-mono">
                {evidenceList.length}/5 tệp
              </span>
            </div>

            {/* Evidence Preview Grid */}
            {evidenceList.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 pt-1">
                {evidenceList.map((src, index) => (
                  <div
                    key={index}
                    className="relative group aspect-square rounded-2xl border border-theme-border overflow-hidden bg-neutral-100 dark:bg-neutral-800"
                  >
                    <img
                      src={src}
                      alt={`Bằng chứng ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveEvidence(index)}
                      className="absolute top-1 right-1 p-1 rounded-lg bg-black/60 hover:bg-red-600 text-white transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Box */}
            {evidenceList.length < 5 && (
              <label
                className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 transition-all ${
                  isUploadingEvidence
                    ? 'border-theme-primary bg-theme-primary/5 cursor-wait'
                    : 'border-theme-border hover:border-theme-primary bg-theme-surface hover:bg-theme-surface-subtle cursor-pointer'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-2xl text-theme-primary ${
                    isUploadingEvidence ? 'animate-spin' : ''
                  }`}
                >
                  {isUploadingEvidence ? 'progress_activity' : 'add_photo_alternate'}
                </span>
                <span className="text-xs font-semibold text-on-surface">
                  {isUploadingEvidence
                    ? 'Đang tải lên bằng chứng bảo mật...'
                    : 'Nhấn để chọn ảnh hoặc kéo thả vào đây'}
                </span>
                <span className="text-[10px] text-on-surface-variant">
                  Hỗ trợ JPG, PNG, WEBP, PDF (Ảnh cận cảnh vết rách/lỗi, mã bưu tá, nhãn kiện hàng)
                </span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp, application/pdf"
                  multiple
                  disabled={isUploadingEvidence}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-theme-border flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-theme-border text-on-surface font-semibold text-xs hover:bg-theme-surface-subtle transition-all cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isDescriptionValid}
              className="px-6 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-sm cursor-pointer inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  <span>Đang gửi khiếu nại...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>Gửi Yêu Cầu Trọng Tài</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
