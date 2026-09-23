'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { orderApi, ReturnRequestData } from '@/ui/api/orderApi';
import { useToast } from '@/ui/context/ToastContext';

export default function SellerReturnDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const router = useRouter();
  const { showToast } = useToast();

  const [returnReq, setReturnReq] = useState<ReturnRequestData | null>(null);
  const [loading, setLoading] = useState(true);

  // Dispute Modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeImages, setDisputeImages] = useState<string[]>([]);
  const [disputeVideos, setDisputeVideos] = useState<string[]>([]);
  const [disputeDocuments, setDisputeDocuments] = useState<string[]>([]);
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  // Accept loading state
  const [isAccepting, setIsAccepting] = useState(false);

  // Replacement Shipping state
  const [carrier, setCarrier] = useState('Viettel Post');
  const [trackingCode, setTrackingCode] = useState('');
  const [isShippingReplacement, setIsShippingReplacement] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await orderApi.getSellerReturnRequestDetail(id);
      if (res.success && res.data) {
        setReturnReq(res.data);
      } else {
        setReturnReq(null);
      }
    } catch {
      setReturnReq(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleAccept = async () => {
    if (!returnReq) return;
    try {
      setIsAccepting(true);
      const res = await orderApi.sellerAcceptReturnRequest(returnReq.id);
      if (res.success && res.data) {
        showToast(
          {
            title: 'Đã xác nhận yêu cầu',
            message:
              returnReq.type === 'REFUND'
                ? 'Bạn đã đồng ý yêu cầu hoàn tiền. Sàn sẽ hoàn trả số tiền cho khách hàng.'
                : 'Bạn đã đồng ý yêu cầu đổi hàng. Vui lòng gửi ấn phẩm mới cho khách và nhập mã vận đơn.',
          },
          'success'
        );
        setReturnReq(res.data);
      } else {
        showToast({ title: 'Lỗi', message: res.error?.message || 'Không thể xác nhận yêu cầu' }, 'error');
      }
    } catch (err: any) {
      showToast({ title: 'Lỗi', message: err.message || 'Lỗi kết nối máy chủ' }, 'error');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDisputeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (disputeImages.length + files.length > 3) {
      setDisputeError('Chỉ được tải lên tối đa 3 ảnh minh chứng.');
      return;
    }

    setDisputeError(null);
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        setDisputeError(`Ảnh "${file.name}" vượt quá dung lượng tối đa 5MB.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setDisputeImages((prev) => (prev.length < 3 ? [...prev, result] : prev));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDisputeVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (disputeVideos.length + files.length > 2) {
      setDisputeError('Chỉ được tải lên tối đa 2 video minh chứng.');
      return;
    }

    setDisputeError(null);
    for (const file of Array.from(files)) {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoElement.src);
        if (videoElement.duration > 30) {
          setDisputeError(`Video "${file.name}" có thời lượng vượt quá 30 giây (${Math.round(videoElement.duration)}s).`);
        } else {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const result = uploadEvent.target?.result as string;
            if (result) {
              setDisputeVideos((prev) => (prev.length < 2 ? [...prev, result] : prev));
            }
          };
          reader.readAsDataURL(file);
        }
      };
      videoElement.src = URL.createObjectURL(file);
    }
  };

  const handleDisputeDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (disputeDocuments.length + files.length > 2) {
      setDisputeError('Chỉ được tải lên tối đa 2 tài liệu/PDF minh chứng.');
      return;
    }

    setDisputeError(null);
    for (const file of Array.from(files)) {
      if (file.size > 15 * 1024 * 1024) {
        setDisputeError(`Tài liệu "${file.name}" vượt quá dung lượng tối đa 15MB.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          setDisputeDocuments((prev) => (prev.length < 2 ? [...prev, result] : prev));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnReq) return;
    if (disputeReason.trim().length <= 5) {
      setDisputeError('Vui lòng nhập lý do phản biện cụ thể (nhiều hơn 5 ký tự).');
      return;
    }

    try {
      setIsSubmittingDispute(true);
      setDisputeError(null);

      const res = await orderApi.sellerDisputeReturnRequest(returnReq.id, {
        reason: disputeReason.trim(),
        evidenceImages: disputeImages,
        evidenceVideos: disputeVideos,
        evidenceDocuments: disputeDocuments,
      });

      if (res.success && res.data) {
        showToast(
          {
            title: 'Gửi yêu cầu phản biện thành công',
            message: 'Hồ sơ đã được chuyển đến Ban trọng tài Sàn Huki để giải quyết công bằng.',
          },
          'success'
        );
        setReturnReq(res.data);
        setShowDisputeModal(false);
      } else {
        setDisputeError(res.error?.message || 'Có lỗi xảy ra khi gửi phản biện.');
      }
    } catch (err: any) {
      setDisputeError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const handleShipReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnReq || !trackingCode.trim()) return;

    try {
      setIsShippingReplacement(true);
      const res = await orderApi.sellerShipReplacement(returnReq.id, {
        carrier,
        trackingCode: trackingCode.trim(),
      });

      if (res.success && res.data) {
        showToast(
          {
            title: 'Cập nhật mã vận đơn thành công',
            message: `Đã gửi mã vận đơn ${trackingCode} của kiện hàng đổi mới đến khách hàng.`,
          },
          'success'
        );
        setReturnReq(res.data);
      } else {
        showToast({ title: 'Lỗi', message: res.error?.message || 'Không thể cập nhật mã vận đơn' }, 'error');
      }
    } catch (err: any) {
      showToast({ title: 'Lỗi', message: err.message || 'Lỗi kết nối máy chủ' }, 'error');
    } finally {
      setIsShippingReplacement(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-500">
          <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
          <span>Đang tải thông tin yêu cầu đổi trả...</span>
        </div>
      </div>
    );
  }

  if (!returnReq) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center space-y-4">
        <span className="material-symbols-outlined text-6xl text-slate-300">error</span>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Không tìm thấy yêu cầu đổi trả</h2>
        <Link
          href="/seller/returns"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-xs"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Quay Lại Danh Sách</span>
        </Link>
      </div>
    );
  }

  const isForwarded = returnReq.status === 'FORWARDED_TO_SELLER';
  const isAccepted = returnReq.status === 'SELLER_ACCEPTED';
  const isDisputed = returnReq.status === 'SELLER_DISPUTED';

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/seller/returns"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-amber-600 transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Quay lại danh sách yêu cầu</span>
        </Link>
        <span className="text-xs text-slate-400 font-mono">ID: #{returnReq.id}</span>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/40">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Yêu Cầu Đổi Trả · Đơn #{returnReq.order?.code || returnReq.orderId}
              </h2>
              {returnReq.type === 'REFUND' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Hoàn tiền 100%
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                  Đổi hàng mới (0đ)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Người mua: <b>{returnReq.user?.fullName || returnReq.user?.name || 'Khách hàng'}</b> • Ngày tạo:{' '}
              {new Date(returnReq.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>

          {/* Status Badge */}
          <div>
            {isForwarded && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Chờ Shop phản hồi (24h)</span>
              </span>
            )}
            {isAccepted && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Shop đã đồng ý</span>
              </span>
            )}
            {isDisputed && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Đang chờ Trọng tài phân xử</span>
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Product Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center gap-4">
            <div className="w-16 h-22 rounded-xl bg-amber-100 dark:bg-amber-950/60 overflow-hidden shrink-0 flex items-center justify-center border border-amber-200">
              {returnReq.orderItem?.coverUrl ? (
                <img
                  src={returnReq.orderItem.coverUrl}
                  alt={returnReq.orderItem.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-amber-600 text-3xl">menu_book</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {returnReq.orderItem?.title || 'Sách'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Số lượng: <b>{returnReq.orderItem?.quantity || 1}</b> • Đơn giá:{' '}
                <b className="text-amber-600">
                  {Number(returnReq.orderItem?.price || 0).toLocaleString('vi-VN')}đ
                </b>
              </p>
              <p className="text-xs text-slate-500">
                Mã sản phẩm: <span className="font-mono">{returnReq.orderItemId}</span>
              </p>
            </div>
          </div>

          {/* Buyer Reason & Evidence */}
          <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-xs">
              <span className="material-symbols-outlined text-[18px] text-amber-600">info</span>
              <span>Lý do khách hàng đưa ra:</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100">
                {returnReq.reason === 'NOT_AS_DESCRIBED'
                  ? 'Hàng không đúng mô tả'
                  : returnReq.reason === 'DAMAGED_TORN'
                  ? 'Hàng bị hỏng rách'
                  : 'Lý do khác'}
              </span>
            </div>

            {returnReq.reasonDetail && (
              <p className="text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                {returnReq.reasonDetail}
              </p>
            )}

            {/* Evidence media */}
            {(returnReq.evidenceImages?.length > 0 || returnReq.evidenceVideos?.length > 0) && (
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase block mb-2">
                  Minh chứng từ người mua ({returnReq.evidenceImages?.length || 0} ảnh, {returnReq.evidenceVideos?.length || 0} video)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {returnReq.evidenceImages?.map((img, i) => (
                    <a
                      key={`img-${i}`}
                      href={img}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square rounded-xl overflow-hidden border border-amber-200 bg-black/5 block group"
                    >
                      <img src={img} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white">
                        Ảnh {i + 1}
                      </span>
                    </a>
                  ))}
                  {returnReq.evidenceVideos?.map((vid, i) => (
                    <div
                      key={`vid-${i}`}
                      className="relative aspect-square rounded-xl overflow-hidden border border-amber-200 bg-black"
                    >
                      <video src={vid} className="w-full h-full object-cover" controls />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Seller Dispute Box (If Disputed) */}
          {isDisputed && (
            <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 space-y-3">
              <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-bold text-xs">
                <span className="material-symbols-outlined text-[18px] text-rose-600">gavel</span>
                <span>Nội dung phản biện của bạn đã gửi đến Sàn:</span>
              </div>
              {returnReq.sellerDisputeReason && (
                <p className="text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/30">
                  {returnReq.sellerDisputeReason}
                </p>
              )}
              {(returnReq.sellerEvidenceImages?.length || 0) > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {returnReq.sellerEvidenceImages?.map((img, i) => (
                    <a
                      key={`s-img-${i}`}
                      href={img}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square rounded-xl overflow-hidden border border-rose-200 bg-black/5"
                    >
                      <img src={img} alt={`Seller Evidence ${i + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Replacement Shipping Section (If REPLACEMENT & Accepted) */}
          {returnReq.type === 'REPLACEMENT' && isAccepted && (
            <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
                <span className="material-symbols-outlined text-lg text-blue-600">sync_alt</span>
                <span>Vận Chuyển Kiện Hàng Đổi Mới (0đ)</span>
              </div>

              {returnReq.replacementTrackingCode ? (
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-xs space-y-1">
                  <p className="text-slate-500">Đơn vị vận chuyển: <b>{returnReq.replacementCarrier}</b></p>
                  <p className="text-slate-500">Mã vận đơn gửi khách: <b className="font-mono text-blue-600 text-sm">{returnReq.replacementTrackingCode}</b></p>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">✓ Đã thông báo mã vận đơn đến khách hàng</p>
                </div>
              ) : (
                <form onSubmit={handleShipReplacement} className="space-y-3">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    Vui lòng đóng gói ấn phẩm mới và nhập mã vận đơn để khách hàng theo dõi:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      placeholder="Đơn vị vận chuyển (VD: Viettel Post)"
                      className="text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      required
                    />
                    <input
                      type="text"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      placeholder="Mã vận đơn giao lại..."
                      className="text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white sm:col-span-2 font-mono"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isShippingReplacement || !trackingCode.trim()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isShippingReplacement ? (
                      <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                    )}
                    <span>Gửi Hàng Đổi & Cập Nhật Mã Vận Đơn</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Action Buttons (Only when FORWARDED_TO_SELLER) */}
          {isForwarded && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDisputeModal(true)}
                className="px-5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">gavel</span>
                <span>Yêu Cầu Phản Biện</span>
              </button>

              <button
                type="button"
                disabled={isAccepting}
                onClick={handleAccept}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isAccepting ? (
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                )}
                <span>Xác Nhận Yêu Cầu (Đồng Ý)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
              <div className="flex items-center gap-2.5 text-rose-600">
                <span className="material-symbols-outlined text-xl">gavel</span>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Gửi Phản Biện Đến Ban Trọng Tài
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleDisputeSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do phản biện <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Nêu rõ lý do từ chối yêu cầu đổi trả của khách (video đóng gói, tình trạng hàng chuẩn khi gửi đi)..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
                  required
                />
                <div className="text-[11px] text-slate-400 mt-1">
                  Yêu cầu tối thiểu 6 ký tự ({disputeReason.trim().length} ký tự)
                </div>
              </div>

              {/* Evidence Uploads */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Minh chứng từ Cửa hàng (Tối đa 3 ảnh, 2 video dưới 30s, 2 tài liệu/PDF)
                </label>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <label className="px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-rose-500 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                    <span className="material-symbols-outlined text-[16px] text-rose-500">add_photo_alternate</span>
                    <span>Thêm Ảnh ({disputeImages.length}/3)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={disputeImages.length >= 3}
                      onChange={handleDisputeImageUpload}
                      className="hidden"
                    />
                  </label>

                  <label className="px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-rose-500 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                    <span className="material-symbols-outlined text-[16px] text-rose-500">videocam</span>
                    <span>Thêm Video ({disputeVideos.length}/2)</span>
                    <input
                      type="file"
                      accept="video/*"
                      multiple
                      disabled={disputeVideos.length >= 2}
                      onChange={handleDisputeVideoUpload}
                      className="hidden"
                    />
                  </label>

                  <label className="px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-rose-500 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                    <span className="material-symbols-outlined text-[16px] text-rose-500">description</span>
                    <span>Thêm Tài Liệu/PDF ({disputeDocuments.length}/2)</span>
                    <input
                      type="file"
                      accept=".pdf,.epub,.docx,.txt"
                      multiple
                      disabled={disputeDocuments.length >= 2}
                      onChange={handleDisputeDocumentUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Previews */}
                {(disputeImages.length > 0 || disputeVideos.length > 0 || disputeDocuments.length > 0) && (
                  <div className="grid grid-cols-3 gap-2 pt-3">
                    {disputeImages.map((img, idx) => (
                      <div key={`d-img-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                        <img src={img} alt="Dispute preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setDisputeImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {disputeVideos.map((vid, idx) => (
                      <div key={`d-vid-${idx}`} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-black">
                        <video src={vid} className="w-full h-full object-cover" controls />
                        <button
                          type="button"
                          onClick={() => setDisputeVideos((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs z-10"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {disputeDocuments.map((doc, idx) => (
                      <div key={`d-doc-${idx}`} className="relative p-2.5 rounded-lg border border-slate-200 bg-rose-50/50 dark:bg-rose-950/30 flex flex-col justify-between">
                        <div className="flex items-center gap-1 text-rose-700 dark:text-rose-300">
                          <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                          <span className="text-[11px] font-bold truncate">Tài liệu #{idx + 1}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDisputeDocuments((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {disputeError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <span>{disputeError}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispute || disputeReason.trim().length <= 5}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingDispute ? (
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">send</span>
                  )}
                  <span>Gửi Ban Trọng Tài</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
