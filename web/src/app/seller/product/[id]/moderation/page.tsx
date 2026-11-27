"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { catalogApi, BookData } from "@/ui/api/catalogApi";
import { useAuth } from "@/ui/context/AuthContext";
import { useToast } from "@/ui/context/ToastContext";
import {
  bookModerationService,
  BOOK_REPORT_REASON_LABELS,
  BookReportReason,
  SellerBookAppeal,
} from "@/ui/services/bookModerationService";
import { realtimeSyncBus } from "@/ui/services/realtimeSyncBus";
import { SellerActionButton, SellerStatusBadge } from "@/ui/components/seller/SellerUI";

interface ModerationReportForSeller {
  id: string;
  reason: BookReportReason;
  description: string;
  evidenceUrl?: string;
  evidenceImages?: string[];
  createdAt: string;
}

export default function SellerBookModerationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = (params?.id as string) || "";
  const { user } = useAuth();
  const { showToast } = useToast();

  const [book, setBook] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modStatus, setModStatus] = useState<string>("NONE");
  const [lockReason, setLockReason] = useState<string | undefined>(undefined);
  const [resolutionNote, setResolutionNote] = useState<string | null>(null);
  const [moderatedAt, setModeratedAt] = useState<string | null>(null);
  const [reports, setReports] = useState<ModerationReportForSeller[]>([]);
  const [sellerAppeal, setSellerAppeal] = useState<SellerBookAppeal | null>(null);

  const [appealMessage, setAppealMessage] = useState("");
  const [appealImages, setAppealImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const loadAll = useCallback(
    async (silent = false) => {
      if (!bookId) return;
      if (!silent) setLoading(true);
      try {
        const [bookRes, modDetail] = await Promise.all([
          catalogApi.getBookById(bookId).catch(() => null),
          bookModerationService.getSellerBookModerationDetail(bookId).catch(() => null),
        ]);

        const bookData = (bookRes?.data as any)?.data || bookRes?.data;
        if (bookData && bookData.id) {
          setBook(bookData);
        }

        if (modDetail) {
          setModStatus(modDetail.status);
          setLockReason(modDetail.reason);
          setResolutionNote(modDetail.resolutionNote || null);
          setModeratedAt(modDetail.moderatedAt || null);
          setReports(modDetail.reports || []);
          setSellerAppeal(modDetail.sellerAppeal || null);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [bookId]
  );

  useEffect(() => {
    void loadAll(false);

    const unsub = realtimeSyncBus.subscribe((event: any) => {
      const targetId = String((event?.payload as any)?.bookId || "");
      if (
        event?.type === "BOOK_MODERATED" ||
        event?.type === "BOOK_APPEALED" ||
        event?.type === "BOOK_REPORTED"
      ) {
        if (!targetId || targetId === bookId) {
          void loadAll(true);
          if (event?.type === "BOOK_MODERATED") {
            const action = (event.payload as any)?.action;
            if (action === "UNBLOCK") {
              showToast?.("Ban Quản Trị đã duyệt mở khóa tác phẩm của bạn!", "success");
            } else if (action === "BLOCK") {
              showToast?.("Tác phẩm vừa bị Ban Quản Trị tạm khóa lưu hành.", "warning");
            }
          }
        }
      }
    });

    return () => unsub();
  }, [bookId, loadAll, showToast]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (appealImages.length + files.length > 5) {
      showToast?.("Chỉ được đính kèm tối đa 5 hình ảnh chứng từ.", "warning");
      return;
    }

    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        showToast?.(`Ảnh "${file.name}" vượt quá 5MB.`, "warning");
        continue;
      }
      if (!file.type.startsWith("image/")) continue;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (result) {
          setAppealImages((prev) => (prev.length < 5 ? [...prev, result] : prev));
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealMessage.trim() || appealMessage.trim().length < 10) {
      showToast?.("Vui lòng nhập nội dung phản biện ít nhất 10 ký tự.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await bookModerationService.appealBookUnlock({
        bookId,
        message: appealMessage.trim(),
        evidenceImages: appealImages,
        bookTitle: book?.title,
        sellerName: user?.business?.name || user?.fullName || "Gian hàng HuKi",
      });
      setSellerAppeal(res.sellerAppeal);
      setAppealMessage("");
      setAppealImages([]);
      showToast?.("Đã gửi phản biện & yêu cầu mở khóa tới Ban Quản Trị!", "success");
    } catch (err: any) {
      showToast?.(err?.message || "Không thể gửi yêu cầu mở khóa lúc này.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSuspended = book?.status === "SUSPENDED" || modStatus === "BLOCKED";
  const reasonMeta = lockReason ? BOOK_REPORT_REASON_LABELS[lockReason as BookReportReason] : undefined;
  const coverUrl = book?.coverUrl || book?.coverImage || book?.cover;

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1200px] mx-auto pb-12 animate-in fade-in duration-200">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Link href="/seller/products?tab=SUSPENDED" className="hover:text-[#00875A] font-medium">
              Quản Lý Sản Phẩm
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Chi Tiết Kiểm Duyệt &amp; Phản Biện</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-editorial flex items-center gap-2.5">
            <span className="material-symbols-outlined text-rose-600 text-[26px]">gavel</span>
            <span>Chi Tiết Tạm Khóa &amp; Phản Biện Mở Khóa</span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <SellerActionButton
            variant="neutral"
            size="sm"
            icon="arrow_back"
            label="Quay lại danh sách"
            onClick={() => router.push("/seller/products?tab=SUSPENDED")}
          />
          <SellerActionButton
            variant="primary"
            size="sm"
            icon="edit"
            label="Chỉnh sửa thông tin sách"
            onClick={() => router.push(`/seller/product/${bookId}/edit`)}
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center gap-2 text-slate-400">
          <span className="material-symbols-outlined text-3xl animate-spin text-[#00875A]">
            progress_activity
          </span>
          <span className="text-xs font-medium">Đang tải hồ sơ kiểm duyệt từ hệ thống...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* CỘT TRÁI: Thông tin sách + Lý do khóa + Phản ánh độc giả */}
          <div className="lg:col-span-7 space-y-5">
            {/* Thông tin tác phẩm */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex items-center gap-4">
              <div className="w-16 h-22 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                {coverUrl ? (
                  <img src={coverUrl} alt={book?.title || "Sách"} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-slate-400 text-2xl">menu_book</span>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <SellerStatusBadge status={book?.status || (isSuspended ? "SUSPENDED" : "PUBLISHED")} />
                  {book?.isbn && (
                    <span className="text-[11px] font-mono text-slate-500">ISBN: {book.isbn}</span>
                  )}
                </div>
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  {book?.title || "Tác phẩm đang cập nhật"}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>
                    Tác giả:{" "}
                    <strong className="text-slate-700">
                      {typeof book?.author === "string"
                        ? book.author
                        : (book?.author as any)?.name || "Đang cập nhật"}
                    </strong>
                  </span>
                  <span>•</span>
                  <span className="font-bold text-[#00875A]">
                    {Number(book?.price ?? 0).toLocaleString("vi-VN")} ₫
                  </span>
                </div>
              </div>
            </div>

            {/* Lý do tạm khóa từ Ban Quản Trị */}
            <div
              className={`rounded-2xl border p-5 space-y-3 ${
                isSuspended
                  ? "bg-rose-50/70 border-rose-200 text-rose-950"
                  : "bg-emerald-50/70 border-emerald-200 text-emerald-950"
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">
                    {isSuspended ? "report_problem" : "verified"}
                  </span>
                  <span>
                    {isSuspended
                      ? "Lý Do Tạm Khóa & Ghi Chú Kỷ Luật Từ Ban Quản Trị"
                      : "Trạng Thái Lưu Hành Hiện Tại"}
                  </span>
                </h3>
                {moderatedAt && (
                  <span className="text-[11px] opacity-75">
                    Cập nhật: {new Date(moderatedAt).toLocaleString("vi-VN")}
                  </span>
                )}
              </div>

              {reasonMeta && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">Nhóm vi phạm:</span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${reasonMeta.color}`}>
                    {reasonMeta.label}
                  </span>
                </div>
              )}

              <div className="bg-white/90 rounded-xl border border-black/10 p-3.5 text-xs leading-relaxed text-slate-800">
                {resolutionNote
                  ? resolutionNote
                  : isSuspended
                  ? "Tác phẩm tạm ngưng lưu hành để rà soát theo phản ánh vi phạm tiêu chuẩn sàn."
                  : "Tác phẩm đang hoạt động bình thường trên sàn HuKi."}
              </div>
            </div>

            {/* Danh sách phản ánh & ảnh minh chứng từ độc giả (ẩn danh) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-rose-600 text-[18px]">feedback</span>
                  <span>Chi Tiết Phản Ánh &amp; Bằng Chứng Để Đối Chiếu ({reports.length})</span>
                </h3>
                <span className="text-[11px] text-slate-400">Danh tính người báo cáo được bảo mật</span>
              </div>

              {reports.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
                  Không có phản ánh chi tiết nào từ độc giả.
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((rep, idx) => {
                    const meta =
                      BOOK_REPORT_REASON_LABELS[rep.reason] || BOOK_REPORT_REASON_LABELS.OTHER;
                    return (
                      <div
                        key={rep.id || idx}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className={`text-[10.5px] px-2 py-0.5 rounded-md font-bold border ${meta.color}`}>
                              {meta.label}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(rep.createdAt).toLocaleString("vi-VN")}
                          </span>
                        </div>

                        <p className="text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                          {rep.description}
                        </p>

                        {Array.isArray(rep.evidenceImages) && rep.evidenceImages.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-slate-600">
                              Hình ảnh minh chứng đính kèm ({rep.evidenceImages.length} ảnh — bấm để xem rõ):
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {rep.evidenceImages.map((imgUrl, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setPreviewImageUrl(imgUrl)}
                                  className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 hover:border-[#00875A] cursor-zoom-in transition-transform hover:scale-105"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Bằng chứng ${i + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {rep.evidenceUrl && (
                          <a
                            href={rep.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                          >
                            <span className="material-symbols-outlined text-[13px]">link</span>
                            <span>Link đối chiếu: {rep.evidenceUrl}</span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI: Trạng thái phản biện & Form Phản biện trực tiếp trên trang (Không Popup) */}
          <div className="lg:col-span-5 space-y-5">
            {sellerAppeal && (
              <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-indigo-600 text-[18px]">
                      mark_email_read
                    </span>
                    <span>Phản Biện Đã Gửi</span>
                  </h3>
                  <span
                    className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${
                      sellerAppeal.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : "bg-indigo-100 text-indigo-800 border-indigo-300"
                    }`}
                  >
                    {sellerAppeal.status === "APPROVED"
                      ? "Đã được duyệt mở khóa"
                      : "Đang chờ BQT duyệt"}
                  </span>
                </div>

                <p className="text-xs text-slate-800 bg-white p-3 rounded-xl border border-indigo-100 leading-relaxed">
                  {sellerAppeal.message}
                </p>

                {Array.isArray(sellerAppeal.evidenceImages) && sellerAppeal.evidenceImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {sellerAppeal.evidenceImages.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewImageUrl(imgUrl)}
                        className="w-16 h-16 rounded-xl overflow-hidden border border-indigo-200 cursor-zoom-in"
                      >
                        <img src={imgUrl} alt={`Chứng từ đã gửi ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="text-[11px] text-indigo-700">
                  Gửi lúc: {new Date(sellerAppeal.submittedAt).toLocaleString("vi-VN")}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="space-y-1 pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00875A] text-[20px]">lock_open</span>
                  <span>
                    {sellerAppeal?.status === "PENDING_UNLOCK"
                      ? "Cập Nhật Bổ Sung Phản Biện"
                      : "Gửi Phản Biện & Yêu Cầu Mở Khóa"}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Hãy chỉnh sửa lại thông tin sách (nếu có sai sót) rồi trình bày rõ nội dung giải trình kèm ảnh chứng từ bản quyền để Admin xem xét mở khóa ngay.
                </p>
              </div>

              {!isSuspended ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-emerald-600 shrink-0">
                    check_circle
                  </span>
                  <span>
                    Tác phẩm hiện đang ở trạng thái <strong>Đang Bán</strong>, không cần gửi yêu cầu mở khóa.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleSubmitAppeal} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-800">
                      Nội Dung Phản Biện / Các Điểm Đã Khắc Phục <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={appealMessage}
                      onChange={(e) => setAppealMessage(e.target.value)}
                      rows={5}
                      placeholder="Trình bày rõ lý do hoặc các mục Shop đã chỉnh sửa (VD: Đã cập nhật ISBN chuẩn NXB, đính kèm hợp đồng chuyển nhượng bản quyền số...)..."
                      className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#00875A] focus:ring-1 focus:ring-[#00875A] text-xs leading-relaxed resize-none"
                      required
                    />
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Tối thiểu 10 ký tự</span>
                      <span className={appealMessage.trim().length >= 10 ? "text-[#00875A] font-semibold" : ""}>
                        {appealMessage.trim().length} ký tự
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-slate-800">
                        Ảnh Chứng Từ / Giấy Phép / Ảnh Đã Chỉnh Sửa
                      </label>
                      <span className="text-[11px] text-slate-500">{appealImages.length}/5 ảnh</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {appealImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative w-18 h-18 rounded-xl overflow-hidden border border-slate-200"
                        >
                          <img src={img} alt={`Chứng từ ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setAppealImages((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[12px]">close</span>
                          </button>
                        </div>
                      ))}

                      {appealImages.length < 5 && (
                        <label className="w-18 h-18 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#00875A] bg-slate-50 hover:bg-emerald-50/40 flex flex-col items-center justify-center gap-1 cursor-pointer text-slate-500 hover:text-[#00875A] transition-colors">
                          <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                          <span className="text-[10px] font-semibold">Thêm ảnh</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2.5">
                    <button
                      type="submit"
                      disabled={isSubmitting || appealMessage.trim().length < 10}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#00875A] hover:bg-[#00704A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      <span>
                        {isSubmitting ? "Đang gửi phản biện..." : "Gửi Phản Biện & Yêu Cầu Mở Khóa"}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox xem ảnh phóng to */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
          <img
            src={previewImageUrl}
            alt="Ảnh đối chiếu chi tiết"
            className="max-w-full max-h-[88vh] rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
