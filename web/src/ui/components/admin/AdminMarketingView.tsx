"use client";

import React, { useState } from "react";
import { useToast } from "../../context/ToastContext";
import { AdminStatusBadge } from './AdminUI';

export function AdminMarketingView() {
  const { showToast } = useToast();

  const [banners, setBanners] = useState([
    {
      id: "BAN-01",
      title: "Tuần Lễ Văn Học Kinh Điển & Tinh Hoa Tri Thức 2026",
      subtitle: "Giảm đến 40% cho tất cả tuyệt tác văn chương thế giới",
      link: "/books?category=van-hoc",
      badge: "ĐẠI HỘI SÁCH",
      bgImage: "/banners/hero-library.jpg",
      status: "active",
      clicks: 14280,
      order: 1,
    },
    {
      id: "BAN-02",
      title: "Hội Sách Bản Quyền Alpha Books x HUKI",
      subtitle: "Tặng ngay Ebook DRM độc quyền khi đặt trước sách in",
      link: "/shop/pub-4",
      badge: "ƯU ĐÃI ĐỘC QUYỀN",
      bgImage: "/banners/hero-alpha.jpg",
      status: "active",
      clicks: 9840,
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
      clicks: 18450,
      order: 3,
    },
  ]);

  // In-Page Expandable Studio Form (100% In-Page, Zero Modal)
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    title: "",
    subtitle: "",
    badge: "ƯU ĐÃI NỔI BẬT",
    link: "/books",
    bgImage: "/banners/hero-library.jpg",
    order: 1,
  });

  const handleToggleBanner = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: b.status === "active" ? "hidden" : "active" } : b)),
    );
    showToast?.("Đã cập nhật trạng thái hiển thị banner.", "info");
  };

  const handleAddBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.title.trim()) {
      showToast?.("Vui lòng nhập tiêu đề banner!", "warning");
      return;
    }

    const newBanner = {
      id: `BAN-${String(banners.length + 1).padStart(2, '0')}`,
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
    setBannerForm({
      title: "",
      subtitle: "",
      badge: "ƯU ĐÃI NỔI BẬT",
      link: "/books",
      bgImage: "/banners/hero-library.jpg",
      order: 1,
    });
    showToast?.("⚡ Đã thêm banner mới thành công!", "success");
  };

  const handleDeleteBanner = (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa banner này?")) return;
    setBanners(banners.filter((b) => b.id !== id));
    showToast?.("Đã xóa banner.", "success");
  };

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full pb-16 animate-in fade-in duration-200">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00875A] text-2xl">campaign</span>
            <span>Tiếp Thị &amp; Banner Trang Chủ (Marketing Media Hub)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Quản trị các slide Banner Hero trang chủ, banner phụ điều hướng chiến dịch và phân tích hiệu quả click
          </p>
        </div>

        <button
          onClick={() => setIsAddFormOpen(!isAddFormOpen)}
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
        <div className="bg-white rounded-3xl p-6 border-2 border-emerald-500/40 shadow-xl animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00875A] flex items-center justify-center font-bold border border-emerald-200">
                <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">
                  Studio Thiết Kế &amp; Xuất Bản Banner Trang Chủ
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Nhập thông tin bên trái và xem trước Mockup hiển thị thời gian thực ở bên phải
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAddFormOpen(false)}
              className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
            {/* Form Inputs (7 cols) */}
            <form onSubmit={handleAddBanner} className="lg:col-span-7 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-gray-700 font-bold mb-1">Thứ Tự Ưu Tiên</label>
                  <input
                    type="number"
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
                  placeholder="VD: Tuần Lễ Sách Văn Học Kinh Điển"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-medium focus:border-[#00875A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Mô Tả Phụ (Subtitle)</label>
                <input
                  type="text"
                  placeholder="VD: Giảm sâu tới 40% cho hơn 1.000 đầu sách tuyển chọn"
                  value={bannerForm.subtitle}
                  onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-medium focus:border-[#00875A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Đường Dẫn Điều Hướng (CTA Link)
                </label>
                <input
                  type="text"
                  placeholder="/books?category=van-hoc"
                  value={bannerForm.link}
                  onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-mono focus:border-[#00875A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Ảnh Nền Banner (URL)</label>
                <input
                  type="text"
                  placeholder="/banners/hero-library.jpg"
                  value={bannerForm.bgImage}
                  onChange={(e) => setBannerForm({ ...bannerForm, bgImage: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-mono focus:border-[#00875A] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">publish</span>
                  <span>Xuất Bản Banner</span>
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
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    Trang Chủ
                  </span>
                </div>

                <div className="relative h-44 rounded-xl overflow-hidden bg-gray-800 border border-gray-700">
                  <img
                    src={bannerForm.bgImage || "/banners/hero-library.jpg"}
                    alt="preview"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-white text-gray-900 font-black text-[9.5px] uppercase tracking-wider shadow-sm">
                        {bannerForm.badge || "ƯU ĐÃI"}
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
              </div>

              <div className="text-[11px] text-gray-400 pt-3 border-t border-gray-800 flex items-center justify-between">
                <span>Điều hướng: <strong className="text-emerald-400 font-mono">{bannerForm.link}</strong></span>
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
            className="bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden shadow-2xs flex flex-col justify-between group hover:border-[#00875A]/60 transition-all"
          >
            <div>
              {/* Image Preview with overlay */}
              <div className="h-44 relative bg-gray-900 overflow-hidden">
                <img
                  src={b.bgImage}
                  alt={b.title}
                  className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-0.5 rounded-md bg-white/95 text-gray-900 font-black text-[10px] shadow-sm uppercase tracking-wider">
                    {b.badge}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
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
                <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100">
                  <span className="truncate max-w-[170px]">
                    Link: <strong className="text-[#00875A]">{b.link}</strong>
                  </span>
                  <span className="font-mono font-bold text-gray-700 shrink-0">
                    {b.clicks.toLocaleString()} click
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-gray-400">
                Thứ tự: #{b.order}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleBanner(b.id)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  {b.status === "active" ? "Ẩn Banner" : "Hiển Thị"}
                </button>
                <button
                  onClick={() => handleDeleteBanner(b.id)}
                  className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                  title="Xóa banner"
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
