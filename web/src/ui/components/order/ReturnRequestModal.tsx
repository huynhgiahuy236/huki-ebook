'use client';

import React, { useState } from 'react';
import { orderApi, ReturnRequestData } from '../../api/orderApi';
import { useToast } from '../../context/ToastContext';

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
      });

      if (res.success && res.data) {
        showToast(
          {
            title: 'Gửi yêu cầu đổi trả thành công',
            message: `Yêu cầu đổi trả cho "${orderItem.title}" đã được gửi tới Ban quản trị sàn để đối soát.`,
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
              disabled={isSubmitting || (reason === 'OTHER' && reasonDetail.trim().length <= 5)}
              className="px-5 py-2.5 rounded-xl bg-theme-primary hover:bg-theme-primary/90 text-on-primary text-xs font-bold shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Gửi Yêu Cầu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
