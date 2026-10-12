'use client';

import React, { useState, useEffect } from 'react';
import { orderApi, ReturnRequestData } from '../../api/orderApi';
import { useToast } from '../../context/ToastContext';
import { playChatChimeSound } from '@/ui/utils/chatSound';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

export interface ReturnRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderCode: string;
  orderItem: {
    id: string;
    title: string;
    price: number;
    quantity: number;
    coverUrl?: string;
    coverImage?: string;
  };
  storeName?: string;
  onSuccess?: (returnReq: ReturnRequestData) => void;
}

export type ReturnReasonType = 'NOT_AS_DESCRIBED' | 'DAMAGED_TORN' | 'OTHER';
export type ReturnMethodType = 'REFUND' | 'REPLACEMENT';

export const POPULAR_BANKS = [
  { code: 'MB', name: 'MBBank (Ngân hàng Quân Đội)' },
  { code: 'VCB', name: 'Vietcombank (Ngoại Thương Việt Nam)' },
  { code: 'TCB', name: 'Techcombank (Kỹ Thương Việt Nam)' },
  { code: 'VPB', name: 'VPBank (Việt Nam Thịnh Vượng)' },
  { code: 'ACB', name: 'ACB (Á Châu)' },
  { code: 'CTG', name: 'VietinBank (Công Thương Việt Nam)' },
  { code: 'BIDV', name: 'BIDV (Đầu Tư và Phát Triển)' },
  { code: 'TPB', name: 'TPBank (Tiên Phong)' },
  { code: 'VBA', name: 'Agribank (Nông Nghiệp & PTNT)' },
  { code: 'HDB', name: 'HDBank (Phát Triển TP.HCM)' },
  { code: 'SHB', name: 'SHB (Sài Gòn - Hà Nội)' },
  { code: 'MSB', name: 'MSB (Hàng Hải Việt Nam)' },
  { code: 'STB', name: 'Sacombank (Sài Gòn Thương Tín)' },
  { code: 'VIB', name: 'VIB (Quốc Tế Việt Nam)' },
  { code: 'OCB', name: 'OCB (Phương Đông)' },
];

export default function ReturnRequestModal({
  isOpen,
  onClose,
  orderId,
  orderCode,
  orderItem,
  storeName,
  onSuccess,
}: ReturnRequestModalProps) {
  const { showToast } = useToast();

  const [reason, setReason] = useState<ReturnReasonType>('NOT_AS_DESCRIBED');
  const [reasonDetail, setReasonDetail] = useState('');
  const [returnType, setReturnType] = useState<ReturnMethodType>('REFUND');

  // Shipping return method (Sticky Shipper Pickup vs Drop-off)
  const [shippingMethod, setShippingMethod] = useState<'PICKUP_BY_SHIPPER' | 'DROP_OFF_AT_POST_OFFICE'>('PICKUP_BY_SHIPPER');

  // Bank refund account information
  const [bankName, setBankName] = useState('MBBank (Ngân hàng Quân Đội)');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');

  // Load saved bank account from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('huki_buyer_bank_info');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.bankName) setBankName(parsed.bankName);
          if (parsed.accountNumber) setAccountNumber(parsed.accountNumber);
          if (parsed.accountHolderName) setAccountHolderName(parsed.accountHolderName);
        } catch {}
      }
    }
  }, []);

  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [documents, setDocuments] = useState<{ name: string; url: string; size: number }[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isOtherValid = reason !== 'OTHER' || reasonDetail.trim().length > 5;
  const isFormValid = isOtherValid && (images.length > 0 || videos.length > 0 || documents.length > 0 || reasonDetail.trim().length > 0);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 3) {
      setErrorMessage('Chỉ được tải lên tối đa 3 ảnh minh chứng.');
      return;
    }

    setErrorMessage(null);
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage(`Ảnh "${file.name}" vượt quá dung lượng tối đa 5MB.`);
        continue;
      }
      if (!file.type.startsWith('image/')) {
        setErrorMessage(`Tập tin "${file.name}" không phải định dạng ảnh hợp lệ.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setImages((prev) => (prev.length < 3 ? [...prev, result] : prev));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (videos.length + files.length > 2) {
      setErrorMessage('Chỉ được tải lên tối đa 2 video minh chứng.');
      return;
    }

    setErrorMessage(null);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('video/')) {
        setErrorMessage(`Tập tin "${file.name}" không phải định dạng video.`);
        continue;
      }

      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoElement.src);
        if (videoElement.duration > 30) {
          setErrorMessage(`Video "${file.name}" có thời lượng vượt quá 30 giây (${Math.round(videoElement.duration)}s).`);
        } else {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const result = uploadEvent.target?.result as string;
            if (result) {
              setVideos((prev) => (prev.length < 2 ? [...prev, result] : prev));
            }
          };
          reader.readAsDataURL(file);
        }
      };
      videoElement.src = URL.createObjectURL(file);
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (documents.length + files.length > 2) {
      setErrorMessage('Chỉ được tải lên tối đa 2 tệp sách/tài liệu đối chiếu.');
      return;
    }

    setErrorMessage(null);
    for (const file of Array.from(files)) {
      if (file.size > 15 * 1024 * 1024) {
        setErrorMessage(`Tệp "${file.name}" vượt quá dung lượng tối đa 15MB.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setDocuments((prev) =>
            prev.length < 2
              ? [...prev, { name: file.name, url: result, size: file.size }]
              : prev
          );
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleRemoveVideo = (index: number) => {
    setVideos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason === 'OTHER' && reasonDetail.trim().length <= 5) {
      setErrorMessage('Vui lòng nhập lý do cụ thể nhiều hơn 5 ký tự.');
      return;
    }

    if (returnType === 'REFUND') {
      if (!bankName.trim() || !accountNumber.trim() || !accountHolderName.trim()) {
        setErrorMessage('Vui lòng điền đầy đủ Tên Ngân Hàng, Số Tài Khoản và Tên Chủ Thẻ để nhận tiền hoàn.');
        return;
      }
      if (accountNumber.trim().length < 6) {
        setErrorMessage('Số tài khoản ngân hàng không hợp lệ (tối thiểu 6 chữ số).');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const res = await orderApi.createReturnRequest(orderId, orderItem.id, {
        type: returnType,
        reason,
        reasonDetail: reason === 'OTHER' ? reasonDetail.trim() : reasonDetail.trim() || undefined,
        evidenceImages: images,
        evidenceVideos: videos,
        evidenceDocuments: documents.map((d) => d.url),
        evidencePdfs: documents.map((d) => d.url),
        bookTitle: orderItem.title,
        bookCoverUrl: orderItem.coverUrl || orderItem.coverImage,
        amount: Number(orderItem.price || 0) * Number(orderItem.quantity || 1),
        quantity: Number(orderItem.quantity || 1),
        shippingMethod,
        bankAccount:
          returnType === 'REFUND'
            ? {
                bankName: bankName.trim(),
                accountNumber: accountNumber.trim(),
                accountHolderName: accountHolderName.trim().toUpperCase(),
              }
            : undefined,
      });

      if (res.success && res.data) {
        // Save bank info to localStorage for next returns
        if (returnType === 'REFUND' && typeof window !== 'undefined') {
          localStorage.setItem(
            'huki_buyer_bank_info',
            JSON.stringify({
              bankName: bankName.trim(),
              accountNumber: accountNumber.trim(),
              accountHolderName: accountHolderName.trim().toUpperCase(),
            })
          );
        }

        // Realtime notification broadcast across user, seller, admin and sticky shipper
        const returnTrackingCode = `HUKI-RET-${res.data.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
        realtimeSyncBus.publish('RETURN_REQUESTED', {
          orderId,
          orderCode,
          returnRequestId: res.data.id,
          returnTrackingCode,
          bookTitle: orderItem.title,
          reason,
          shippingMethod,
        });
        realtimeSyncBus.publish('ESCROW_FROZEN', {
          orderId,
          orderCode,
          amount: Number(orderItem.price || 0) * Number(orderItem.quantity || 1),
        });

        playChatChimeSound();
        showToast(
          {
            title: 'Gửi yêu cầu đổi trả thành công!',
            message: `Yêu cầu cho "${orderItem.title}" đã được ghi nhận. Dòng tiền ký quỹ đã được ĐÓNG BĂNG an toàn để bảo vệ bạn.`,
          },
          'success'
        );
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        setErrorMessage(res.error?.message || 'Có lỗi xảy ra khi gửi yêu cầu đổi trả.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối máy chủ.');
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
            <span className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center justify-center text-lg font-bold">
              <span className="material-symbols-outlined text-[22px]">assignment_return</span>
            </span>
            <div>
              <h3 className="font-editorial text-base font-bold text-on-surface">
                Yêu Cầu Đổi Trả / Hoàn Tiền
              </h3>
              <p className="text-xs text-on-surface-variant">
                Đơn hàng #{orderCode} {storeName ? `• Gian hàng: ${storeName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">
          {/* Target Product Summary */}
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--theme-surface-subtle,#f8f7f4)] border border-[var(--theme-border,#e8e5df)]">
            <div className="w-12 h-16 rounded-lg bg-amber-100 dark:bg-amber-950/60 overflow-hidden shrink-0 flex items-center justify-center border border-amber-200">
              {orderItem.coverUrl || orderItem.coverImage ? (
                <img
                  src={orderItem.coverUrl || orderItem.coverImage}
                  alt={orderItem.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-amber-600 text-[20px]">menu_book</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-sm text-on-surface truncate" title={orderItem.title}>
                {orderItem.title}
              </h4>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Số lượng: <b className="text-on-surface">{orderItem.quantity}</b> • Đơn giá:{' '}
                <b className="text-theme-primary">{orderItem.price.toLocaleString('vi-VN')}đ</b>
              </p>
            </div>
          </div>

          {/* 1. Lý do đổi trả */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-on-surface mb-2.5">
              1. Lý do đổi trả <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'NOT_AS_DESCRIBED', label: 'Hàng không đúng mô tả', icon: 'visibility_off' },
                { id: 'DAMAGED_TORN', label: 'Hàng bị hỏng rách', icon: 'broken_image' },
                { id: 'OTHER', label: 'Lý do khác', icon: 'edit_note' },
              ].map((item) => (
                <label
                  key={item.id}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all text-xs font-semibold ${
                    reason === item.id
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 shadow-2xs'
                      : 'border-theme-border hover:bg-theme-surface-subtle text-on-surface'
                  }`}
                >
                  <input
                    type="radio"
                    name="return_reason"
                    value={item.id}
                    checked={reason === item.id}
                    onChange={() => setReason(item.id as ReturnReasonType)}
                    className="accent-amber-600"
                  />
                  <span className="material-symbols-outlined text-[18px] text-amber-600">{item.icon}</span>
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            {/* If Reason is OTHER -> Textarea strictly > 5 chars */}
            {reason === 'OTHER' && (
              <div className="mt-3 animate-in fade-in duration-150">
                <textarea
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  placeholder="Vui lòng nhập chi tiết lý do đổi trả (bắt buộc nhiều hơn 5 ký tự)..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-2xl border border-theme-border bg-theme-surface text-on-surface focus:outline-none focus:border-amber-500 transition-all"
                />
                <div className="flex justify-between items-center text-[11px] text-on-surface-variant mt-1">
                  <span className={reasonDetail.trim().length > 5 ? 'text-emerald-600 font-medium' : 'text-amber-600'}>
                    {reasonDetail.trim().length <= 5
                      ? `Cần nhập thêm ${Math.max(0, 6 - reasonDetail.trim().length)} ký tự`
                      : 'Đã hợp lệ'}
                  </span>
                  <span>{reasonDetail.trim().length} ký tự</span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Minh chứng (Hình ảnh, Video & Tệp Sách / PDF) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-black uppercase tracking-wider text-on-surface">
                2. Minh chứng (Ảnh, Video hoặc Tệp PDF)
              </label>
              <span className="text-[11px] text-on-surface-variant">
                Tối đa 3 ảnh • 2 video • 2 tệp PDF/sách mẫu
              </span>
            </div>

            <div className="space-y-3">
              {/* Upload buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <label className="px-3.5 py-2 rounded-xl border border-dashed border-theme-border hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 text-xs font-semibold text-on-surface flex items-center gap-2 cursor-pointer transition-all">
                  <span className="material-symbols-outlined text-[18px] text-amber-600">add_photo_alternate</span>
                  <span>Thêm Ảnh ({images.length}/3)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={images.length >= 3}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                <label className="px-3.5 py-2 rounded-xl border border-dashed border-theme-border hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 text-xs font-semibold text-on-surface flex items-center gap-2 cursor-pointer transition-all">
                  <span className="material-symbols-outlined text-[18px] text-amber-600">videocam</span>
                  <span>Thêm Video ({videos.length}/2)</span>
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    disabled={videos.length >= 2}
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>

                <label className="px-3.5 py-2 rounded-xl border border-dashed border-theme-border hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 text-xs font-semibold text-on-surface flex items-center gap-2 cursor-pointer transition-all">
                  <span className="material-symbols-outlined text-[18px] text-indigo-600">picture_as_pdf</span>
                  <span>Tệp Sách / PDF ({documents.length}/2)</span>
                  <input
                    type="file"
                    accept=".pdf,.epub,.doc,.docx"
                    multiple
                    disabled={documents.length >= 2}
                    onChange={handleDocumentUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Document Previews */}
              {documents.length > 0 && (
                <div className="space-y-2 pt-1">
                  {documents.map((doc, idx) => (
                    <div
                      key={`doc-${idx}`}
                      className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-indigo-600 text-[20px] shrink-0">
                          picture_as_pdf
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-on-surface truncate">{doc.name}</div>
                          <div className="text-[10px] text-on-surface-variant">
                            {(doc.size / 1024).toFixed(1)} KB • Minh chứng đối chiếu
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(idx)}
                        className="w-6 h-6 rounded-full bg-red-100 text-red-700 hover:bg-red-200 flex items-center justify-center shrink-0 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Image & Video Previews */}
              {(images.length > 0 || videos.length > 0) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  {images.map((img, idx) => (
                    <div key={`img-${idx}`} className="relative group rounded-xl overflow-hidden border border-theme-border aspect-square bg-black/5">
                      <img src={img} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white font-medium">
                        Ảnh {idx + 1}
                      </span>
                    </div>
                  ))}

                  {videos.map((vid, idx) => (
                    <div key={`vid-${idx}`} className="relative group rounded-xl overflow-hidden border border-theme-border aspect-square bg-black">
                      <video src={vid} className="w-full h-full object-cover" controls />
                      <button
                        type="button"
                        onClick={() => handleRemoveVideo(idx)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity z-10"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white font-medium">
                        Video {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Hình thức đổi trả */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-on-surface mb-2.5">
              3. Hình thức giải quyết mong muốn <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                  returnType === 'REFUND'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                    : 'border-theme-border hover:bg-theme-surface-subtle text-on-surface'
                }`}
              >
                <input
                  type="radio"
                  name="return_type"
                  value="REFUND"
                  checked={returnType === 'REFUND'}
                  onChange={() => setReturnType('REFUND')}
                  className="accent-emerald-600"
                />
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                </div>
                <div>
                  <div className="text-xs font-bold">Hoàn tiền 100%</div>
                  <div className="text-[11px] text-on-surface-variant">
                    Hoàn lại {(orderItem.price * orderItem.quantity).toLocaleString('vi-VN')}đ sau khi duyệt
                  </div>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                  returnType === 'REPLACEMENT'
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200'
                    : 'border-theme-border hover:bg-theme-surface-subtle text-on-surface'
                }`}
              >
                <input
                  type="radio"
                  name="return_type"
                  value="REPLACEMENT"
                  checked={returnType === 'REPLACEMENT'}
                  onChange={() => setReturnType('REPLACEMENT')}
                  className="accent-blue-600"
                />
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">sync_alt</span>
                </div>
                <div>
                  <div className="text-xs font-bold">Đổi hàng mới (0đ)</div>
                  <div className="text-[11px] text-on-surface-variant">
                    Shop sẽ gửi lại 1 ấn phẩm mới nguyên vẹn
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 4. Phương thức gửi hàng hoàn lại (Mô hình Shopee Reverse Logistics) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-black uppercase tracking-wider text-on-surface">
                4. Phương thức gửi hàng hoàn lại <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Miễn phí vận chuyển chiều về
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Bưu tá lấy tận nơi (Active) */}
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  shippingMethod === 'PICKUP_BY_SHIPPER'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-2xs'
                    : 'border-theme-border hover:bg-theme-surface-subtle text-on-surface'
                }`}
              >
                <input
                  type="radio"
                  name="shipping_method"
                  value="PICKUP_BY_SHIPPER"
                  checked={shippingMethod === 'PICKUP_BY_SHIPPER'}
                  onChange={() => setShippingMethod('PICKUP_BY_SHIPPER')}
                  className="accent-emerald-600 mt-1"
                />
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">electric_moped</span>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>Bưu tá lấy tận nơi</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-200 text-emerald-900">
                      Khuyên dùng
                    </span>
                  </div>
                  <div className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                    Bưu tá HuKi Express đã giao đơn sẽ trực tiếp đến địa chỉ của bạn để nhận lại kiện hàng.
                  </div>
                </div>
              </label>

              {/* Option 2: Gửi tại bưu cục gần nhất (Mờ, disabled theo yêu cầu) */}
              <div
                className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100/70 dark:bg-gray-900/40 text-gray-400 dark:text-gray-500 flex items-start gap-3 opacity-55 cursor-not-allowed select-none"
                title="Tính năng gửi bưu cục đang được hoàn thiện, vui lòng chọn bưu tá lấy tận nơi"
              >
                <input
                  type="radio"
                  name="shipping_method"
                  disabled
                  checked={false}
                  className="mt-1 opacity-50 cursor-not-allowed"
                />
                <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">local_post_office</span>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <span>Gửi tại bưu cục gần nhất</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-gray-200 text-gray-500">
                      Chưa hỗ trợ
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">
                    Tự mang kiện sách ra điểm bưu cục gần nhất. (Chưa khả dụng tại khu vực của bạn).
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Thông tin tài khoản ngân hàng nhận tiền hoàn (Bắt buộc khi chọn Hoàn tiền) */}
          {returnType === 'REFUND' && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-emerald-50/20 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/80 space-y-3.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-800/50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-emerald-700 dark:text-emerald-300">
                    account_balance
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-950 dark:text-emerald-200">
                    5. Tài khoản ngân hàng nhận tiền hoàn <span className="text-red-500">*</span>
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  Chuyển khoản 24/7
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Ngân hàng */}
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-emerald-950 dark:text-emerald-200 mb-1">
                    Ngân hàng thụ hưởng:
                  </label>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full text-xs py-2 px-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-900 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    {POPULAR_BANKS.map((b) => (
                      <option key={b.code} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Số tài khoản */}
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-emerald-950 dark:text-emerald-200 mb-1">
                    Số tài khoản:
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="VD: 0987654321"
                    className="w-full text-xs py-2 px-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-900 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>

                {/* Tên chủ thẻ */}
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-emerald-950 dark:text-emerald-200 mb-1">
                    Tên chủ tài khoản (in hoa):
                  </label>
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value.toUpperCase())}
                    placeholder="VD: NGUYEN VAN A"
                    className="w-full text-xs py-2 px-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-900 text-on-surface focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800/80 dark:text-emerald-300/80 pt-1">
                <span className="material-symbols-outlined text-[15px] text-emerald-600">verified</span>
                <span>
                  Tiền hoàn <b>{(orderItem.price * orderItem.quantity).toLocaleString('vi-VN')}₫</b> sẽ được Sàn chuyển thẳng vào STK này sau khi lệnh hoàn được duyệt.
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-theme-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-theme-border hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-bold text-on-surface transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                (reason === 'OTHER' && reasonDetail.trim().length <= 5) ||
                (returnType === 'REFUND' &&
                  (!accountNumber.trim() || !accountHolderName.trim() || accountNumber.trim().length < 6))
              }
              className="px-5 py-2.5 rounded-xl bg-theme-primary hover:bg-theme-primary/90 text-on-primary text-xs font-bold shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Xác Nhận &amp; Khóa Ký Quỹ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
