"use client";

import React, { useState, useEffect, useRef } from "react";
import { useToast } from "../../context/ToastContext";
import { AdminStatusBadge } from './AdminUI';

export interface MarketingBanner {
  id: string;
  title: string;
  subtitle: string;
  link: string;
  badge: string;
  bgImage: string;
  status: "active" | "hidden";
  clicks: number;
  order: number;
}

const DEFAULT_BANNERS: MarketingBanner[] = [
  {
    id: "BAN-01",
    title: "Tuần Lễ Văn Học Kinh Điển & Tinh Hoa Tri Thức 2026",
    subtitle: "Giảm đến 40% cho tất cả tuyệt tác văn chương thế giới",
    link: "/books?category=van-hoc",
    badge: "ĐẠI HỘI SÁCH",
    bgImage: "/banners/hero-library.jpg",
    status: "active",
    clicks: 0,
    order: 1,
  },
  {
    id: "BAN-02",
    title: "Hội Sách Bản Quyền Alpha Books x HUKI",
    subtitle: "Tặng ngay Ebook DRM độc quyền khi đặt trước sách in",
    link: "/shop/pub-4",
    badge: "ƯU ĐÃI ĐỘC QUYỀN",
    bgImage: "/banners/hero-podium.jpg",
    status: "active",
    clicks: 0,
    order: 2,
  },
  {
    id: "BAN-03",
    title: "Kỷ Nguyên Sách Hybrid: Đọc Ngay Khi Chờ Giao",
    subtitle: "Trải nghiệm sách giấy liền tay, đọc số tức thì",
    link: "/books?format=hybrid",
    badge: "TÍNH NĂNG MỚI",
    bgImage: "/banners/sub-hybrid.jpg",
    status: "active",
    clicks: 0,
    order: 3,
  },
];

const PRESET_BACKGROUNDS = [
  { label: "Thư Viện Cổ Điển", url: "/banners/hero-library.jpg" },
  { label: "Bục Sách Sang Trọng", url: "/banners/hero-podium.jpg" },
  { label: "Kỷ Nguyên Sách Hybrid", url: "/banners/sub-hybrid.jpg" },
  { label: "Năng Lượng Tri Thức", url: "/banners/sub-atomic.jpg" },
];

export const LINK_OPTION_GROUPS = [
  {
    group: "Trang Chính & Chiến Dịch Toàn Sàn",
    options: [
      { label: "Trang Chủ HUKI EBOOK", value: "/" },
      { label: "Tất Cả Sách", value: "/books" },
      { label: "Flash Sale Giờ Vàng", value: "/flash-sale" },
      { label: "Sách Bán Chạy Nhất", value: "/books?sort=bestseller" },
      { label: "Sách Mới Phát Hành", value: "/books?sort=newest" },
      { label: "Sách Đang Giảm Giá Sâu", value: "/books?filter=discount" },
    ],
  },
  {
    group: "Thể Loại Sách Tuyển Chọn",
    options: [
      { label: "Văn Học & Tiểu Thuyết", value: "/books?category=van-hoc" },
      { label: "Kinh Tế & Khởi Nghiệp", value: "/books?category=kinh-te" },
      { label: "Tâm Lý & Kỹ Năng Sống", value: "/books?category=tam-ly-ky-nang" },
      { label: "Thiếu Nhi & Tuổi Mới Lớn", value: "/books?category=thieu-nhi" },
      { label: "Khoa Học & Công Nghệ", value: "/books?category=khoa-hoc-cong-nghe" },
      { label: "Lịch Sử & Triết Học", value: "/books?category=lich-su" },
      { label: "Ngoại Ngữ & Từ Điển", value: "/books?category=ngoai-ngu" },
      { label: "Nghệ Thuật & Đời Sống", value: "/books?category=nghe-thuat-doi-song" },
    ],
  },
  {
    group: "Định Dạng & Trải Nghiệm Đọc",
    options: [
      { label: "Sách Điện Tử Ebook DRM", value: "/books?format=ebook" },
      { label: "Kỷ Nguyên Sách Hybrid (Giấy + Ebook)", value: "/books?format=hybrid" },
      { label: "Sách Giấy Truyền Thống", value: "/books?format=physical" },
      { label: "Sách Nói AI Audio Book", value: "/books?format=audio" },
    ],
  },
  {
    group: "Gian Hàng NXB & Nhà Bán Hàng",
    options: [
      { label: "Gian Hàng Alpha Books", value: "/shop/pub-4" },
      { label: "Gian Hàng NXB Trẻ", value: "/shop/pub-1" },
      { label: "Gian Hàng NXB Kim Đồng", value: "/shop/pub-2" },
      { label: "Gian Hàng Nhã Nam", value: "/shop/pub-3" },
      { label: "Gian Hàng NXB Phụ Nữ", value: "/shop/pub-5" },
      { label: "Gian Hàng Thái Hà Books", value: "/shop/pub-6" },
    ],
  },
  {
    group: "Cộng Đồng & Tiện Ích Độc Giả",
    options: [
      { label: "Cộng Đồng Độc Giả HUKI", value: "/community" },
      { label: "Bảng Xếp Hạng Độc Giả", value: "/community/leaderboard" },
      { label: "Đăng Ký Đối Tác Bán Hàng", value: "/seller/register" },
      { label: "Trung Tâm Trợ Giúp & FAQ", value: "/help" },
    ],
  },
];

// Helper lấy tên điều hướng thân thiện, loại bỏ hoàn toàn các endpoint kỹ thuật
export function getFriendlyLinkName(url: string): string {
  if (!url) return "Trang Chủ HUKI";
  for (const group of LINK_OPTION_GROUPS) {
    const match = group.options.find((opt) => opt.value === url);
    if (match) return match.label;
  }
  return url;
}

// Helper ghi nhận click thật tế vào banner và phát sự kiện realtime
export function recordBannerClick(bannerId: string) {
  if (typeof window === "undefined" || !bannerId) return;
  try {
    const saved = localStorage.getItem("huki_admin_marketing_banners");
    if (saved) {
      const list = JSON.parse(saved);
      if (Array.isArray(list)) {
        const updated = list.map((b: any) =>
          b.id === bannerId ? { ...b, clicks: (Number(b.clicks) || 0) + 1 } : b
        );
        localStorage.setItem("huki_admin_marketing_banners", JSON.stringify(updated));
      }
    }
  } catch {}
  window.dispatchEvent(new CustomEvent("huki_banner_clicked", { detail: { bannerId } }));
}

export function AdminMarketingView() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const studioRef = useRef<HTMLDivElement>(null);

  // Khởi tạo state từ LocalStorage (loại bỏ hoàn toàn số mock cũ)
  const [banners, setBanners] = useState<MarketingBanner[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("huki_admin_marketing_banners");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Xóa triệt để các số mock ảo cũ (14280, 9840, 18450) về số lượt click thực tế
            return parsed.map((b: MarketingBanner) => ({
              ...b,
              clicks:
                b.clicks === 14280 || b.clicks === 9840 || b.clicks === 18450
                  ? 0
                  : Math.max(0, Number(b.clicks) || 0),
            }));
          }
        }
      } catch {
        // Fallback
      }
    }
    return DEFAULT_BANNERS;
  });

  // Tự động lưu bền vững vào LocalStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("huki_admin_marketing_banners", JSON.stringify(banners));
    }
  }, [banners]);

  // Lắng nghe sự kiện click banner realtime từ trang chủ & các cửa sổ khác
  useEffect(() => {
    const handleBannerClicked = (event: any) => {
      const bannerId = event?.detail?.bannerId;
      if (!bannerId) return;
      setBanners((prev) =>
        prev.map((b) => (b.id === bannerId ? { ...b, clicks: (b.clicks || 0) + 1 } : b))
      );
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "huki_admin_marketing_banners" && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          if (Array.isArray(updated)) {
            setBanners(updated);
          }
        } catch {}
      }
    };

    window.addEventListener("huki_banner_clicked", handleBannerClicked);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("huki_banner_clicked", handleBannerClicked);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);


  // Quản lý trạng thái Studio Form
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [bannerForm, setBannerForm] = useState({
    title: "",
    subtitle: "",
    badge: "ƯU ĐÃI NỔI BẬT",
    link: "/books",
    bgImage: "/banners/hero-library.jpg",
    order: 1,
  });

  // Mở Form ở chế độ Tạo mới
  const handleOpenCreateForm = () => {
    setEditingBannerId(null);
    setBannerForm({
      title: "",
      subtitle: "",
      badge: "ƯU ĐÃI NỔI BẬT",
      link: "/books",
      bgImage: "/banners/hero-library.jpg",
      order: banners.length + 1,
    });
    setIsAddFormOpen(true);
    setTimeout(() => {
      studioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Mở Form ở chế độ Chỉnh Sửa một banner có sẵn
  const handleEditBanner = (banner: MarketingBanner) => {
    setEditingBannerId(banner.id);
    setBannerForm({
      title: banner.title,
      subtitle: banner.subtitle,
      badge: banner.badge,
      link: banner.link,
      bgImage: banner.bgImage,
      order: banner.order,
    });
    setIsAddFormOpen(true);
    setTimeout(() => {
      studioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    showToast?.(`Đang mở chỉnh sửa banner #${banner.order}: ${banner.title}`, "info");
  };

  // Xử lý tải ảnh từ máy tính (File Picker)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast?.("Vui lòng chọn file hình ảnh hợp lệ (.JPG, .PNG, .WEBP)!", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast?.("Dung lượng ảnh không được vượt quá 5 MB!", "warning");
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setBannerForm((prev) => ({ ...prev, bgImage: result }));
      setIsUploadingImage(false);
      showToast?.("Đã tải ảnh lên thành công!", "success");
    };
    reader.onerror = () => {
      setIsUploadingImage(false);
      showToast?.("Không thể đọc file ảnh, vui lòng thử lại!", "error");
    };
    reader.readAsDataURL(file);
  };

  // Ẩn / Hiện Banner
  const handleToggleBanner = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: b.status === "active" ? "hidden" : "active" } : b)),
    );
    showToast?.("Đã cập nhật trạng thái hiển thị banner.", "info");
  };

  // Submit Form: Tạo mới hoặc Lưu Cập nhật
  const handleSubmitBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.title.trim()) {
      showToast?.("Vui lòng nhập tiêu đề banner!", "warning");
      return;
    }

    if (editingBannerId) {
      // CẬP NHẬT BANNER HIỆN TẠI
      setBanners((prev) =>
        prev.map((b) =>
          b.id === editingBannerId
            ? {
                ...b,
                title: bannerForm.title.trim(),
                subtitle: bannerForm.subtitle.trim(),
                badge: bannerForm.badge.trim(),
                link: bannerForm.link.trim(),
                bgImage: bannerForm.bgImage.trim() || "/banners/hero-library.jpg",
                order: Number(bannerForm.order) || b.order,
              }
            : b,
        ),
      );
      showToast?.("🎉 Cập nhật thông tin banner thành công!", "success");
      setIsAddFormOpen(false);
      setEditingBannerId(null);
    } else {
      // TẠO BANNER MỚI
      const newBanner: MarketingBanner = {
        id: `BAN-${String(banners.length + 1).padStart(2, "0")}`,
        title: bannerForm.title.trim(),
        subtitle: bannerForm.subtitle.trim(),
        badge: bannerForm.badge.trim(),
        link: bannerForm.link.trim(),
        bgImage: bannerForm.bgImage.trim() || "/banners/hero-library.jpg",
        status: "active",
        clicks: 0,
        order: Number(bannerForm.order) || banners.length + 1,
      };

      setBanners([newBanner, ...banners]);
      setIsAddFormOpen(false);
      showToast?.("⚡ Đã xuất bản banner mới lên trang chủ thành công!", "success");
    }
  };

  // Xóa banner
  const handleDeleteBanner = (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn banner này?")) return;
    setBanners(banners.filter((b) => b.id !== id));
    if (editingBannerId === id) {
      setIsAddFormOpen(false);
      setEditingBannerId(null);
    }
    showToast?.("Đã xóa banner khỏi hệ thống.", "success");
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-16 animate-in fade-in duration-200">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00875A] text-2xl">campaign</span>
            <span>Tiếp Thị &amp; Banner Trang Chủ (Marketing Media Hub)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Quản trị slide Banner Hero trang chủ, banner phụ điều hướng chiến dịch và phân tích hiệu quả click
          </p>
        </div>

        <button
          onClick={() => {
            if (isAddFormOpen) {
              setIsAddFormOpen(false);
              setEditingBannerId(null);
            } else {
              handleOpenCreateForm();
            }
          }}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0 ${
            isAddFormOpen
              ? "bg-gray-800 text-white hover:bg-gray-700"
              : "bg-[#00875A] hover:bg-[#00734c] text-white"
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">
            {isAddFormOpen ? "expand_less" : "add_photo_alternate"}
          </span>
          <span>{isAddFormOpen ? "Đóng Studio Banner" : "Thêm Banner Mới"}</span>
        </button>
      </div>

      {/* 2. IN-PAGE BANNER STUDIO FORM WITH LIVE PREVIEW (100% IN-PAGE, ZERO MODAL) */}
      {isAddFormOpen && (
        <div
          ref={studioRef}
          className={`bg-white rounded-3xl p-6 border-2 shadow-xl animate-in slide-in-from-top-4 duration-200 ${
            editingBannerId ? "border-amber-500/60 ring-2 ring-amber-400/20" : "border-emerald-500/40"
          }`}
        >
          {/* Studio Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold border ${
                  editingBannerId
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-[#00875A] border-emerald-200"
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {editingBannerId ? "edit_document" : "add_photo_alternate"}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-gray-900 text-base">
                    {editingBannerId
                      ? "Chỉnh Sửa & Cập Nhật Banner Chiến Dịch"
                      : "Studio Thiết Kế & Xuất Bản Banner Trang Chủ"}
                  </h3>
                  {editingBannerId && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                      Đang chỉnh sửa: {editingBannerId}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tùy chỉnh thông số bên trái và xem trước Mockup hiển thị thời gian thực ở bên phải
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setIsAddFormOpen(false);
                setEditingBannerId(null);
              }}
              className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
            {/* Form Inputs (7 cols) */}
            <form onSubmit={handleSubmitBanner} className="lg:col-span-7 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Huy Hiệu (Badge) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: ĐẠI HỘI SÁCH 2026"
                    value={bannerForm.badge}
                    onChange={(e) => setBannerForm({ ...bannerForm, badge: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-bold focus:border-[#00875A] focus:outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Thứ Tự Ưu Tiên (Order)</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={bannerForm.order}
                    onChange={(e) => setBannerForm({ ...bannerForm, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-mono font-bold focus:border-[#00875A] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Tiêu Đề Banner <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Tuần Lễ Sách Văn Học Kinh Điển & Tinh Hoa Tri Thức"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-semibold focus:border-[#00875A] focus:outline-none text-[13px]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Mô Tả Phụ (Subtitle / Call To Action)</label>
                <input
                  type="text"
                  placeholder="VD: Giảm sâu tới 40% cho hơn 1.000 đầu sách tuyển chọn"
                  value={bannerForm.subtitle}
                  onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-medium focus:border-[#00875A] focus:outline-none"
                />
              </div>

              {/* Comprehensive Select Option for CTA Link */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-gray-700 font-bold">
                    Mục Tiêu Điều Hướng (Chọn Trang Muốn Khách Đến) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-[#00875A] font-bold truncate max-w-[220px]">
                    {getFriendlyLinkName(bannerForm.link)}
                  </span>
                </div>

                <div className="relative">
                  <select
                    value={
                      LINK_OPTION_GROUPS.some((g) => g.options.some((o) => o.value === bannerForm.link))
                        ? bannerForm.link
                        : "CUSTOM"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== "CUSTOM") {
                        setBannerForm({ ...bannerForm, link: val });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 font-semibold text-gray-800 focus:border-[#00875A] focus:ring-2 focus:ring-emerald-500/20 focus:outline-none text-xs cursor-pointer appearance-none pr-9 shadow-2xs"
                  >
                    <option value="" disabled>-- Vui lòng chọn trang bạn muốn khách đến --</option>
                    {LINK_OPTION_GROUPS.map((group) => (
                      <optgroup key={group.group} label={group.group} className="font-bold text-gray-900 bg-gray-100">
                        {group.options.map((opt) => (
                          <option key={opt.value} value={opt.value} className="font-normal text-gray-700 py-1.5">
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="CUSTOM" className="font-bold text-emerald-800 bg-emerald-50">
                      🔗 Tùy chỉnh URL khác (Nhập đường dẫn tự do)...
                    </option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 flex items-center">
                    <span className="material-symbols-outlined text-lg">unfold_more</span>
                  </div>
                </div>

                {/* Nếu chọn Tùy chỉnh hoặc đường dẫn không nằm trong Preset: Hiện ô nhập tay */}
                {(!LINK_OPTION_GROUPS.some((g) => g.options.some((o) => o.value === bannerForm.link)) ||
                  bannerForm.link === "CUSTOM") && (
                  <div className="mt-2.5 p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-900 font-bold">
                      <span className="material-symbols-outlined text-[15px] text-[#00875A]">edit_link</span>
                      <span>Nhập đường dẫn URL tùy chỉnh (Custom Path / Query Parameters):</span>
                    </div>
                    <input
                      type="text"
                      placeholder="VD: /books?filter=special hoặc link chiến dịch https://"
                      value={bannerForm.link === "CUSTOM" ? "" : bannerForm.link}
                      onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 font-mono text-xs focus:border-[#00875A] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Image Picker & Uploader */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-gray-700 font-bold">Ảnh Nền Banner</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00875A] hover:underline cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">upload_file</span>
                    <span>{isUploadingImage ? "Đang xử lý ảnh..." : "Tải ảnh từ máy tính"}</span>
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                <input
                  type="text"
                  placeholder="/banners/hero-library.jpg hoặc dán URL ảnh https://"
                  value={bannerForm.bgImage}
                  onChange={(e) => setBannerForm({ ...bannerForm, bgImage: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-mono focus:border-[#00875A] focus:outline-none"
                />

                {/* Preset Background Thumbnails */}
                <div className="mt-2.5">
                  <span className="text-[11px] text-gray-400 font-semibold block mb-1.5">
                    Hoặc chọn nhanh từ thư viện ảnh bìa có sẵn:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESET_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.url}
                        type="button"
                        onClick={() => setBannerForm({ ...bannerForm, bgImage: bg.url })}
                        className={`relative rounded-xl overflow-hidden h-14 border-2 transition-all cursor-pointer group text-left ${
                          bannerForm.bgImage === bg.url
                            ? "border-[#00875A] ring-2 ring-emerald-500/20 scale-[1.02]"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <img src={bg.url} alt={bg.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors p-1.5 flex items-end">
                          <span className="text-[10px] text-white font-bold truncate drop-shadow-xs">
                            {bg.label}
                          </span>
                        </div>
                        {bannerForm.bgImage === bg.url && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#00875A] text-white flex items-center justify-center">
                            <span className="material-symbols-outlined text-[11px]">check</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddFormOpen(false);
                    setEditingBannerId(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2 rounded-xl text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5 ${
                    editingBannerId
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-[#00875A] hover:bg-[#00734c]"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {editingBannerId ? "save" : "publish"}
                  </span>
                  <span>{editingBannerId ? "Lưu Cập Nhật Banner" : "Xuất Bản Banner"}</span>
                </button>
              </div>
            </form>

            {/* Live Preview Mockup (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between p-4 bg-gray-900 rounded-2xl border border-gray-800 text-white">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-3">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-emerald-400">visibility</span>
                    <span>Live Preview Mockup</span>
                  </span>

                  {/* Device Switcher (Desktop vs Mobile) */}
                  <div className="flex items-center gap-1 bg-gray-800 p-0.5 rounded-lg border border-gray-700">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("desktop")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        previewDevice === "desktop"
                          ? "bg-[#00875A] text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">desktop_windows</span>
                      <span>Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("mobile")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        previewDevice === "mobile"
                          ? "bg-[#00875A] text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">smartphone</span>
                      <span>Mobile</span>
                    </button>
                  </div>
                </div>

                {/* Mockup Canvas */}
                {previewDevice === "desktop" ? (
                  /* Desktop 16:9 Aspect Frame */
                  <div className="relative h-44 rounded-xl overflow-hidden bg-gray-800 border border-gray-700">
                    <img
                      src={bannerForm.bgImage || "/banners/hero-library.jpg"}
                      alt="preview"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/banners/hero-library.jpg";
                      }}
                      className="w-full h-full object-cover opacity-85"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-4 flex flex-col justify-between">
                      <div>
                        <span className="px-2.5 py-0.5 rounded bg-white text-gray-900 font-black text-[9.5px] uppercase tracking-wider shadow-sm">
                          {bannerForm.badge || "ƯU ĐÃI NỔI BẬT"}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-white text-sm line-clamp-2 leading-snug">
                          {bannerForm.title || "Tiêu đề Banner sẽ hiển thị ở đây"}
                        </h4>
                        <p className="text-gray-300 text-[11px] line-clamp-1 mt-0.5">
                          {bannerForm.subtitle || "Mô tả phụ cho chiến dịch khuyến mãi..."}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Mobile Smartphone Aspect Frame */
                  <div className="max-w-[220px] mx-auto rounded-2xl overflow-hidden bg-black border-4 border-gray-700 shadow-2xl relative">
                    <div className="h-4 bg-black flex items-center justify-center">
                      <div className="w-12 h-1 bg-gray-700 rounded-full" />
                    </div>
                    <div className="relative h-44 bg-gray-800">
                      <img
                        src={bannerForm.bgImage || "/banners/hero-library.jpg"}
                        alt="preview"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/banners/hero-library.jpg";
                        }}
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 flex flex-col justify-between">
                        <div>
                          <span className="px-2 py-0.5 rounded bg-white text-gray-900 font-black text-[8px] uppercase tracking-wider">
                            {bannerForm.badge || "ƯU ĐÃI"}
                          </span>
                        </div>
                        <div>
                          <h5 className="font-extrabold text-white text-[11.5px] line-clamp-2 leading-tight">
                            {bannerForm.title || "Tiêu đề Banner"}
                          </h5>
                          <p className="text-gray-300 text-[9.5px] line-clamp-1 mt-0.5">
                            {bannerForm.subtitle || "Mô tả phụ..."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-gray-400 pt-3 border-t border-gray-800 flex items-center justify-between">
                <span className="truncate max-w-[240px]">
                  Điều hướng đến: <strong className="text-emerald-400 font-semibold">{getFriendlyLinkName(bannerForm.link)}</strong>
                </span>
                <span>Thứ tự: <strong className="text-white">#{bannerForm.order}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. BANNER GRID / GROUPED DATA CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {banners.map((b) => (
          <div
            key={b.id}
            className={`bg-white rounded-3xl border overflow-hidden shadow-2xs flex flex-col justify-between group transition-all ${
              editingBannerId === b.id
                ? "border-amber-500 ring-2 ring-amber-400/20"
                : "border-[#E2E8F0] hover:border-[#00875A]/60"
            }`}
          >
            <div>
              {/* Image Preview with overlay */}
              <div className="h-44 relative bg-gray-900 overflow-hidden">
                <img
                  src={b.bgImage}
                  alt={b.title}
                  onError={(e) => {
                    // Fallback tránh lỗi ảnh đen 404
                    (e.target as HTMLImageElement).src = "/banners/hero-podium.jpg";
                  }}
                  className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-0.5 rounded-md bg-white/95 text-gray-900 font-black text-[10px] shadow-sm uppercase tracking-wider">
                    {b.badge}
                  </span>
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  {editingBannerId === b.id && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider">
                      Đang Sửa
                    </span>
                  )}
                  {b.status === "active" ? (
                    <AdminStatusBadge status="success" label="Đang Hiển Thị" />
                  ) : (
                    <AdminStatusBadge status="neutral" label="Tạm Ẩn" />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-2">
                <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">
                  {b.title}
                </h3>
                <p className="text-gray-500 text-xs line-clamp-2">
                  {b.subtitle}
                </p>
                <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 gap-2">
                  <span className="truncate flex-1 text-gray-600 font-medium" title={getFriendlyLinkName(b.link)}>
                    Mục tiêu: <strong className="text-[#00875A] font-semibold">{getFriendlyLinkName(b.link)}</strong>
                  </span>
                  <div
                    className="flex items-center gap-1 shrink-0 font-mono text-[11px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200/70"
                    title="Lượt click thực tế từ khách hàng ngoài sàn (Realtime)"
                  >
                    <span className="material-symbols-outlined text-[13px] text-emerald-600 animate-pulse">ads_click</span>
                    <span>{(b.clicks || 0).toLocaleString('vi-VN')} click</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions: Sửa, Ẩn/Hiện, Xóa */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-gray-400">
                Thứ tự: #{b.order}
              </span>
              <div className="flex items-center gap-1.5">
                {/* NÚT TEST CLICK REALTIME */}
                <button
                  type="button"
                  onClick={() => {
                    recordBannerClick(b.id);
                    showToast(`+1 Click realtime cho banner "${b.title.slice(0, 18)}..."`, "info");
                  }}
                  className="p-1.5 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700 hover:text-emerald-900 transition-colors cursor-pointer flex items-center gap-1"
                  title="Thử nghiệm Click thật (Tăng số ngay tức thì realtime)"
                >
                  <span className="material-symbols-outlined text-[14px]">touch_app</span>
                </button>

                {/* NÚT CHỈNH SỬA BANNER */}
                <button

                  onClick={() => handleEditBanner(b)}
                  className="px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                  title="Chỉnh sửa thông tin banner này"
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                  <span>Sửa</span>
                </button>

                {/* NÚT ẨN / HIỂN THỊ */}
                <button
                  onClick={() => handleToggleBanner(b.id)}
                  className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  {b.status === "active" ? "Ẩn" : "Hiển Thị"}
                </button>

                {/* NÚT XÓA */}
                <button
                  onClick={() => handleDeleteBanner(b.id)}
                  className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                  title="Xóa banner vĩnh viễn"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
