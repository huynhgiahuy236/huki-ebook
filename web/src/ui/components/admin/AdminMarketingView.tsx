"use client";

import React, { useState, useEffect, useRef } from "react";
import { useToast } from "../../context/ToastContext";
import { AdminStatusBadge } from './AdminUI';
import { bannerApi, BannerData } from '@/ui/api/bannerApi';
import { compressImageToDataUrl, sanitizeImageUrl } from '@/ui/utils/imageUtils';
import CountdownConfirmModal from '../common/CountdownConfirmModal';

export type BannerSlot = 'HERO_SLIDER' | 'SUB_TOP' | 'SUB_BOTTOM';

const SLOT_SPECS: Record<BannerSlot, { label: string; sizeHint: string; aspectNote: string }> = {
  HERO_SLIDER: {
    label: 'Banner Chính (Slider Giữa)',
    sizeHint: '1200 × 600 px (Tỉ lệ 2:1)',
    aspectNote: 'Hiển thị full khung ở Slider trung tâm Trang Chủ',
  },
  SUB_TOP: {
    label: 'Banner Phụ Trên (Cột Phải)',
    sizeHint: '600 × 280 px (Tỉ lệ ~2.1:1)',
    aspectNote: 'Khối banner trên ở cột phải Trang Chủ (tối đa 1 banner active)',
  },
  SUB_BOTTOM: {
    label: 'Banner Phụ Dưới (Cột Phải)',
    sizeHint: '600 × 280 px (Tỉ lệ ~2.1:1)',
    aspectNote: 'Khối banner dưới ở cột phải Trang Chủ (tối đa 1 banner active)',
  },
};

function toLocalDateTimeInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoDateOrNull(localStr?: string): string | null {
  if (!localStr || !localStr.trim()) return null;
  const d = new Date(localStr);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

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
  slot?: BannerSlot;
  startDate?: string | null;
  endDate?: string | null;
}

const DEFAULT_BANNERS: MarketingBanner[] = [
  {
    id: "e0000001-0000-4000-8000-000000000001",
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
    id: "e0000002-0000-4000-8000-000000000002",
    title: "Hội Sách Bản Quyền Alpha Books x HUKI",
    subtitle: "Tặng ngay Ebook DRM độc quyền khi đặt trước sách in",
    link: "/shop/alpha-books",
    badge: "ƯU ĐÃI ĐỘC QUYỀN",
    bgImage: "/banners/hero-podium.jpg",
    status: "active",
    clicks: 0,
    order: 2,
  },
  {
    id: "e0000003-0000-4000-8000-000000000003",
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
      { label: "Gian Hàng Alpha Books", value: "/shop/alpha-books" },
      { label: "Gian Hàng NXB Trẻ", value: "/shop/nxb-tre" },
      { label: "Gian Hàng NXB Kim Đồng", value: "/shop/nxb-kim-dong" },
      { label: "Gian Hàng Nhã Nam", value: "/shop/nha-nam" },
      { label: "Gian Hàng First News Trí Việt", value: "/shop/first-news" },
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

// Helper ghi nhận click thật tế vào banner lên Backend PostgreSQL và phát sự kiện realtime
export function recordBannerClick(bannerId: string) {
  if (typeof window === "undefined" || !bannerId) return;
  void bannerApi.trackClick(bannerId).catch(() => {});
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
  } catch { }
  window.dispatchEvent(new CustomEvent("huki_banner_clicked", { detail: { bannerId } }));
}

// Helper phát sự kiện đồng bộ banner realtime ra cùng tab và toàn bộ các tab khác (Trang chủ)
export function broadcastMarketingUpdate(updatedBanners?: MarketingBanner[]) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("huki_admin_marketing_updated", { detail: { banners: updatedBanners } }));
  } catch {}
  try {
    const channel = new BroadcastChannel("huki_marketing_channel");
    channel.postMessage({ type: "BANNER_UPDATED", banners: updatedBanners });
    channel.close();
  } catch {}
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
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
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

  // Tự động lưu bền vững vào LocalStorage với cơ chế chống tràn QuotaExceededError
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const lightweight = banners.map((b) => ({
          ...b,
          bgImage: b.bgImage.startsWith("data:") && b.bgImage.length > 200_000
            ? "/banners/hero-library.jpg"
            : b.bgImage,
        }));
        localStorage.setItem("huki_admin_marketing_banners", JSON.stringify(lightweight));
      } catch (err) {
        console.warn("[AdminMarketing] LocalStorage quota exceeded, skipping offline cache:", err);
      }
    }
  }, [banners]);

  // BUG-03-015 & BUG-026: Đồng bộ dữ liệu Banner thật từ promotion-service backend
  useEffect(() => {
    bannerApi.getBanners().then((res: any) => {
      const items = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      if (res.success && Array.isArray(items)) {
        if (items.length > 0) {
          const backendBanners: MarketingBanner[] = items.map((b: BannerData, idx: number) => {
            const pos = b.position || idx + 1;
            const slot: BannerSlot = pos === 101 ? 'SUB_TOP' : pos === 102 ? 'SUB_BOTTOM' : 'HERO_SLIDER';
            return {
              id: b.id,
              title: b.title,
              subtitle: '',
              badge: slot === 'HERO_SLIDER' ? `SLIDER #${pos}` : slot === 'SUB_TOP' ? 'PHỤ TRÊN' : 'PHỤ DƯỚI',
              link: b.link || '/books',
              bgImage: sanitizeImageUrl(b.image) || '/banners/hero-library.jpg',
              status: b.isActive ? 'active' : 'hidden',
              clicks: b.clicks || 0,
              order: pos,
              slot,
              startDate: b.startDate || null,
              endDate: b.endDate || null,
            };
          });
          setBanners(backendBanners);
        } else {
          // Khi backend trả về mảng rỗng (đã xóa hết banner), không hồi sinh DEFAULT_BANNERS
          setBanners([]);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem("huki_admin_marketing_banners", JSON.stringify([]));
            } catch {}
          }
        }
      }
    }).catch(() => {});
  }, []);

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
        } catch { }
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
  const [isSubmittingBanner, setIsSubmittingBanner] = useState(false);

  const [bannerForm, setBannerForm] = useState({
    title: "",
    subtitle: "",
    badge: "",
    link: "/books",
    bgImage: "/banners/hero-library.jpg",
    order: 1,
    slot: "HERO_SLIDER" as BannerSlot,
    startDate: "",
    endDate: "",
    isActive: true,
  });

  // Mở Form ở chế độ Tạo mới
  const handleOpenCreateForm = () => {
    setEditingBannerId(null);
    const heroCount = banners.filter((b) => (b.slot || (b.order < 100 ? 'HERO_SLIDER' : 'SUB_TOP')) === 'HERO_SLIDER').length;
    setBannerForm({
      title: "",
      subtitle: "",
      badge: "",
      link: "/books",
      bgImage: "/banners/hero-library.jpg",
      order: heroCount + 1,
      slot: "HERO_SLIDER",
      startDate: "",
      endDate: "",
      isActive: true,
    });
    setIsAddFormOpen(true);
    setTimeout(() => {
      studioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Mở Form ở chế độ Chỉnh Sửa một banner có sẵn
  const handleEditBanner = (banner: MarketingBanner) => {
    setEditingBannerId(banner.id);
    const pos = banner.order || 1;
    const resolvedSlot: BannerSlot = banner.slot || (pos === 101 ? 'SUB_TOP' : pos === 102 ? 'SUB_BOTTOM' : 'HERO_SLIDER');
    setBannerForm({
      title: banner.title,
      subtitle: banner.subtitle || "",
      badge: banner.badge || "",
      link: banner.link || "/books",
      bgImage: sanitizeImageUrl(banner.bgImage) || "/banners/hero-library.jpg",
      order: pos,
      slot: resolvedSlot,
      startDate: toLocalDateTimeInput(banner.startDate),
      endDate: toLocalDateTimeInput(banner.endDate),
      isActive: banner.status === "active",
    });
    setIsAddFormOpen(true);
    setTimeout(() => {
      studioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    showToast?.(`Đang mở chỉnh sửa banner #${banner.order}: ${banner.title}`, "info");
  };

  // Xử lý tải & nén ảnh từ máy tính (tránh vượt dung lượng & không tạo blob: chết)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    try {
      const targetW = bannerForm.slot === 'HERO_SLIDER' ? 1400 : 900;
      const targetH = bannerForm.slot === 'HERO_SLIDER' ? 700 : 450;
      const compressed = await compressImageToDataUrl(file, targetW, targetH, 0.88);
      setBannerForm((prev) => ({ ...prev, bgImage: compressed }));
      showToast?.("Đã tải & tối ưu ảnh banner thành công!", "success");
    } catch {
      showToast?.("Không thể xử lý file ảnh, vui lòng thử ảnh khác!", "error");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Ẩn / Hiện Banner
  const handleToggleBanner = (id: string) => {
    const target = banners.find((b) => b.id === id);
    if (target) {
      bannerApi.updateBanner(id, { isActive: target.status !== "active" }).catch(() => {});
    }
    const updated: MarketingBanner[] = banners.map((b) =>
      b.id === id ? { ...b, status: b.status === "active" ? "hidden" : "active" } : b
    );
    setBanners(updated);
    broadcastMarketingUpdate(updated);
    showToast?.("Đã cập nhật trạng thái hiển thị banner.", "info");
  };

  // Submit Form: Tạo mới hoặc Lưu Cập nhật (đồng bộ nghiêm ngặt Backend Banner DTO)
  const handleSubmitBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = bannerForm.title.trim();
    const cleanImage = sanitizeImageUrl(bannerForm.bgImage) || "/banners/hero-library.jpg";
    const cleanLink = bannerForm.link.trim() || "/books";

    if (!cleanTitle) {
      showToast?.("Vui lòng nhập tên chiến dịch / Alt banner!", "warning");
      return;
    }

    const startIso = toIsoDateOrNull(bannerForm.startDate);
    const endIso = toIsoDateOrNull(bannerForm.endDate);
    if (startIso && endIso && new Date(endIso) <= new Date(startIso)) {
      showToast?.("Thời gian kết thúc phải sau thời gian bắt đầu!", "warning");
      return;
    }

    const isSub = bannerForm.slot === 'SUB_TOP' || bannerForm.slot === 'SUB_BOTTOM';
    const finalPosition = bannerForm.slot === 'SUB_TOP' ? 101 : bannerForm.slot === 'SUB_BOTTOM' ? 102 : Math.max(1, Number(bannerForm.order) || 1);
    const slotLabel = SLOT_SPECS[bannerForm.slot].label;

    let updatedList = [...banners];
    if (isSub && bannerForm.isActive) {
      const existingConflict = banners.find(
        (b) => b.order === finalPosition && b.id !== editingBannerId && b.status === 'active'
      );
      if (existingConflict && !skipConflictConfirmRef.current) {
        setMarketingConfirm({
          type: 'REPLACE',
          title: 'Xác nhận thay thế banner đang kích hoạt',
          description: `Vị trí "${slotLabel}" hiện đã có banner "${existingConflict.title}". Thay thế sẽ tự động chuyển banner cũ sang trạng thái Ẩn.`,
          confirmLabel: 'Thay thế banner',
          onConfirm: () => {
            skipConflictConfirmRef.current = true;
            setMarketingConfirm(null);
            const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
            handleSubmitBanner(fakeEvent);
          },
        });
        return;
      }
      if (existingConflict) {
        skipConflictConfirmRef.current = false;
        updatedList = updatedList.map((b) =>
          b.id === existingConflict.id ? { ...b, status: 'hidden' as const } : b
        );
        bannerApi.updateBanner(existingConflict.id, { isActive: false }).catch(() => {});
      }
    }
    skipConflictConfirmRef.current = false;

    setIsSubmittingBanner(true);
    try {
      if (editingBannerId) {
        const res = await bannerApi.updateBanner(editingBannerId, {
          title: cleanTitle,
          image: cleanImage,
          link: cleanLink,
          position: finalPosition,
          startDate: startIso,
          endDate: endIso,
          isActive: bannerForm.isActive,
        });
        if (!res.success) {
          showToast?.(res.error?.message || "Không thể lưu cập nhật banner lên máy chủ!", "error");
          return;
        }

        const updated: MarketingBanner[] = updatedList.map((b) =>
          b.id === editingBannerId
            ? {
              ...b,
              title: cleanTitle,
              subtitle: "",
              badge: bannerForm.slot === 'HERO_SLIDER' ? `SLIDER #${finalPosition}` : bannerForm.slot === 'SUB_TOP' ? 'PHỤ TRÊN' : 'PHỤ DƯỚI',
              link: cleanLink,
              bgImage: cleanImage,
              status: bannerForm.isActive ? "active" : "hidden",
              order: finalPosition,
              slot: bannerForm.slot,
              startDate: startIso,
              endDate: endIso,
            }
            : b,
        );
        setBanners(updated);
        broadcastMarketingUpdate(updated);
        showToast?.("Cập nhật thông tin banner thành công!", "success");
        setIsAddFormOpen(false);
        setEditingBannerId(null);
      } else {
        const createRes = await bannerApi.createBanner({
          title: cleanTitle,
          image: cleanImage,
          link: cleanLink,
          position: finalPosition,
          scope: 'HOMEPAGE',
          ...(startIso ? { startDate: startIso } : {}),
          ...(endIso ? { endDate: endIso } : {}),
        });
        if (!createRes.success) {
          showToast?.(createRes.error?.message || "Không thể tạo banner mới trên máy chủ!", "error");
          return;
        }

        const createdId = createRes.data?.id || (
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `e0000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`
        );

        if (!bannerForm.isActive && createRes.data?.id) {
          await bannerApi.updateBanner(createRes.data.id, { isActive: false }).catch(() => {});
        }

        const newBanner: MarketingBanner = {
          id: createdId,
          title: cleanTitle,
          subtitle: "",
          badge: bannerForm.slot === 'HERO_SLIDER' ? `SLIDER #${finalPosition}` : bannerForm.slot === 'SUB_TOP' ? 'PHỤ TRÊN' : 'PHỤ DƯỚI',
          link: cleanLink,
          bgImage: cleanImage,
          status: bannerForm.isActive ? "active" : "hidden",
          clicks: 0,
          order: finalPosition,
          slot: bannerForm.slot,
          startDate: startIso,
          endDate: endIso,
        };

        const updated = [newBanner, ...updatedList];
        setBanners(updated);
        broadcastMarketingUpdate(updated);
        setIsAddFormOpen(false);
        showToast?.("Đã xuất bản banner mới chuẩn Shopee lên trang chủ!", "success");
      }
    } catch (err: any) {
      showToast?.(err?.message || "Lỗi kết nối khi lưu banner!", "error");
    } finally {
      setIsSubmittingBanner(false);
    }
  };

  const skipConflictConfirmRef = useRef(false);
  const [marketingConfirm, setMarketingConfirm] = useState<{
    type: 'REPLACE' | 'DELETE';
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  // Xóa banner (Persist Database & Realtime Broadcast)
  const handleDeleteBanner = (id: string) => {
    setMarketingConfirm({
      type: 'DELETE',
      title: 'Xác nhận xóa vĩnh viễn banner',
      description: 'Bạn có chắc chắn muốn xóa vĩnh viễn banner này khỏi hệ thống?',
      confirmLabel: 'Xóa vĩnh viễn',
      onConfirm: () => {
        setMarketingConfirm(null);
        bannerApi.deleteBanner(id).catch((err) => {
          console.warn("[AdminMarketing] Delete API warning:", err);
        });
        const updated = banners.filter((b) => b.id !== id);
        setBanners(updated);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("huki_admin_marketing_banners", JSON.stringify(updated));
          } catch {}
        }
        broadcastMarketingUpdate(updated);
        if (editingBannerId === id) {
          setIsAddFormOpen(false);
          setEditingBannerId(null);
        }
        showToast?.("Đã xóa banner khỏi hệ thống.", "success");
      },
    });
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
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0 ${isAddFormOpen
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
          className={`bg-white rounded-3xl p-6 border-2 shadow-xl animate-in slide-in-from-top-4 duration-200 ${editingBannerId ? "border-amber-500/60 ring-2 ring-amber-400/20" : "border-emerald-500/40"
            }`}
        >
          {/* Studio Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold border ${editingBannerId
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Vị Trí Hiển Thị (Slot) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bannerForm.slot}
                    onChange={(e) => {
                      const newSlot = e.target.value as BannerSlot;
                      const newOrder = newSlot === 'SUB_TOP' ? 101 : newSlot === 'SUB_BOTTOM' ? 102 : (bannerForm.order >= 100 ? 1 : bannerForm.order);
                      setBannerForm({ ...bannerForm, slot: newSlot, order: newOrder });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-semibold text-gray-800 focus:border-[#00875A] focus:outline-none text-xs cursor-pointer shadow-2xs"
                  >
                    <option value="HERO_SLIDER">Banner Chính (Slider Giữa · 1200×600)</option>
                    <option value="SUB_TOP">Banner Phụ Trên (Cột Phải · 600×280)</option>
                    <option value="SUB_BOTTOM">Banner Phụ Dưới (Cột Phải · 600×280)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Thứ Tự Ưu Tiên {bannerForm.slot === 'HERO_SLIDER' ? '(Slider #)' : '(Cố định)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={bannerForm.slot === 'HERO_SLIDER' ? "99" : "102"}
                    disabled={bannerForm.slot !== 'HERO_SLIDER'}
                    value={bannerForm.order}
                    onChange={(e) => setBannerForm({ ...bannerForm, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-mono font-bold focus:border-[#00875A] focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Trạng Thái Kích Hoạt</label>
                  <button
                    type="button"
                    onClick={() => setBannerForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                    className={`w-full px-3 py-2 rounded-xl border font-bold text-xs flex items-center justify-between cursor-pointer transition-colors ${
                      bannerForm.isActive
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : "bg-gray-100 border-gray-300 text-gray-600"
                    }`}
                  >
                    <span>{bannerForm.isActive ? "Đang Kích Hoạt" : "Tạm Ẩn"}</span>
                    <span className="material-symbols-outlined text-base">
                      {bannerForm.isActive ? "toggle_on" : "toggle_off"}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Tên Chiến Dịch / Alt SEO Ảnh <span className="text-red-500">*</span>
                  <span className="ml-1.5 font-normal text-[10.5px] text-gray-400">(Không đè lên ảnh)</span>
                </label>
                <input
                  type="text"
                  maxLength={255}
                  placeholder="VD: Ngày Hội Đọc Sách - Sale Tháng Mới"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-semibold focus:border-[#00875A] focus:outline-none text-[13px]"
                />
              </div>

              {/* Lịch chạy hiển thị (startDate / endDate đồng bộ Backend Banner DTO) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-gray-700 font-bold">Bắt Đầu Hiển Thị</label>
                    {bannerForm.startDate && (
                      <button
                        type="button"
                        onClick={() => setBannerForm({ ...bannerForm, startDate: "" })}
                        className="text-[10.5px] text-gray-500 hover:text-rose-600 cursor-pointer"
                      >
                        Xóa mốc
                      </button>
                    )}
                  </div>
                  <input
                    type="datetime-local"
                    value={bannerForm.startDate}
                    onChange={(e) => setBannerForm({ ...bannerForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-mono text-xs focus:border-[#00875A] focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-gray-700 font-bold">Kết Thúc Hiển Thị</label>
                    {bannerForm.endDate && (
                      <button
                        type="button"
                        onClick={() => setBannerForm({ ...bannerForm, endDate: "" })}
                        className="text-[10.5px] text-gray-500 hover:text-rose-600 cursor-pointer"
                      >
                        Xóa mốc
                      </button>
                    )}
                  </div>
                  <input
                    type="datetime-local"
                    value={bannerForm.endDate}
                    onChange={(e) => setBannerForm({ ...bannerForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-mono text-xs focus:border-[#00875A] focus:outline-none"
                  />
                </div>
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
                      Tùy chỉnh URL khác (Nhập đường dẫn tự do)...
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
                        className={`relative rounded-xl overflow-hidden h-14 border-2 transition-all cursor-pointer group text-left ${bannerForm.bgImage === bg.url
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
                  disabled={isSubmittingBanner}
                  className={`px-6 py-2 rounded-xl text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-60 ${editingBannerId
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-[#00875A] hover:bg-[#00734c]"
                    }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {isSubmittingBanner ? "progress_activity" : editingBannerId ? "save" : "publish"}
                  </span>
                  <span>
                    {isSubmittingBanner
                      ? "Đang lưu..."
                      : editingBannerId
                      ? "Lưu Cập Nhật Banner"
                      : "Xuất Bản Banner"}
                  </span>
                </button>
              </div>
            </form>

            {/* Live Preview Mockup (5 cols - Chuẩn hiển thị Shopee sạch, không đè chữ HTML) */}
            <div className="lg:col-span-5 flex flex-col justify-between p-4 bg-gray-900 rounded-2xl border border-gray-800 text-white">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-3">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-emerald-400">visibility</span>
                    <span>Live Preview Chuẩn Shopee</span>
                  </span>

                  {/* Device Switcher (Desktop vs Mobile) */}
                  <div className="flex items-center gap-1 bg-gray-800 p-0.5 rounded-lg border border-gray-700">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("desktop")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${previewDevice === "desktop"
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
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${previewDevice === "mobile"
                          ? "bg-[#00875A] text-white"
                          : "text-gray-400 hover:text-white"
                        }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">smartphone</span>
                      <span>Mobile</span>
                    </button>
                  </div>
                </div>

                {/* Mockup Canvas: Bố cục đúng chuẩn Shopee (Hero + 2 Sub, ảnh sạch toàn khung) */}
                {previewDevice === "desktop" ? (
                  <div className="grid grid-cols-12 gap-2 h-44 bg-gray-950 p-2 rounded-xl border border-gray-800">
                    <div
                      className={`col-span-8 rounded-lg overflow-hidden relative bg-gray-800 ${
                        bannerForm.slot === 'HERO_SLIDER' ? 'ring-2 ring-emerald-400' : 'opacity-45'
                      }`}
                    >
                      <img
                        src={
                          bannerForm.slot === 'HERO_SLIDER'
                            ? (bannerForm.bgImage || "/banners/hero-library.jpg")
                            : "/banners/hero-library.jpg"
                        }
                        alt={bannerForm.title || "Hero Preview"}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/banners/hero-library.jpg";
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="col-span-4 grid grid-rows-2 gap-2">
                      <div
                        className={`rounded-lg overflow-hidden relative bg-gray-800 ${
                          bannerForm.slot === 'SUB_TOP' ? 'ring-2 ring-emerald-400' : 'opacity-45'
                        }`}
                      >
                        <img
                          src={
                            bannerForm.slot === 'SUB_TOP'
                              ? (bannerForm.bgImage || "/banners/hero-podium.jpg")
                              : "/banners/hero-podium.jpg"
                          }
                          alt="Sub Top Preview"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/banners/hero-podium.jpg";
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div
                        className={`rounded-lg overflow-hidden relative bg-gray-800 ${
                          bannerForm.slot === 'SUB_BOTTOM' ? 'ring-2 ring-emerald-400' : 'opacity-45'
                        }`}
                      >
                        <img
                          src={
                            bannerForm.slot === 'SUB_BOTTOM'
                              ? (bannerForm.bgImage || "/banners/sub-hybrid.jpg")
                              : "/banners/sub-hybrid.jpg"
                          }
                          alt="Sub Bottom Preview"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/banners/sub-hybrid.jpg";
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Mobile Smartphone Clean Banner Frame */
                  <div className="max-w-[230px] mx-auto rounded-2xl overflow-hidden bg-black border-4 border-gray-700 shadow-2xl relative p-1.5">
                    <div className="h-3 bg-black flex items-center justify-center mb-1">
                      <div className="w-12 h-1 bg-gray-700 rounded-full" />
                    </div>
                    <div className="relative h-32 rounded-lg overflow-hidden bg-gray-800">
                      <img
                        src={bannerForm.bgImage || "/banners/hero-library.jpg"}
                        alt={bannerForm.title || "Mobile Preview"}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/banners/hero-library.jpg";
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-gray-400 pt-3 mt-3 border-t border-gray-800 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    Đích: <strong className="text-emerald-400 font-semibold">{getFriendlyLinkName(bannerForm.link)}</strong>
                  </span>
                  <span className="shrink-0">Vị trí: <strong className="text-white">#{bannerForm.order}</strong></span>
                </div>
                <div className="text-[10.5px] text-gray-400">
                  Lịch chạy:{" "}
                  <strong className="text-gray-200">
                    {bannerForm.startDate || bannerForm.endDate
                      ? `${bannerForm.startDate ? new Date(bannerForm.startDate).toLocaleString("vi-VN") : "Ngay lập tức"} → ${bannerForm.endDate ? new Date(bannerForm.endDate).toLocaleString("vi-VN") : "Không giới hạn"}`
                      : "Hiển thị liên tục 24/7"}
                  </strong>
                </div>
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
            className={`bg-white rounded-3xl border overflow-hidden shadow-2xs flex flex-col justify-between group transition-all ${editingBannerId === b.id
                ? "border-amber-500 ring-2 ring-amber-400/20"
                : "border-[#E2E8F0] hover:border-[#00875A]/60"
              }`}
          >
            <div>
              {/* Clean Banner Artwork Card Preview */}
              <div className="h-44 relative bg-gray-900 overflow-hidden">
                <img
                  src={b.bgImage}
                  alt={b.title}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/banners/hero-podium.jpg";
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
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
                <p className="text-[11px] text-gray-500 font-mono">
                  {b.startDate || b.endDate
                    ? `Lịch: ${b.startDate ? new Date(b.startDate).toLocaleDateString('vi-VN') : '...'} → ${b.endDate ? new Date(b.endDate).toLocaleDateString('vi-VN') : '...'}`
                    : 'Hiển thị liên tục 24/7'}
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
              <span className="text-xs font-mono font-bold text-gray-500">
                {b.order === 101 ? (
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                    Phụ Trên (Cột Phải)
                  </span>
                ) : b.order === 102 ? (
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                    Phụ Dưới (Cột Phải)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                    Slider #{b.order}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleEditBanner(b)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  title="Chỉnh sửa thông tin banner này"
                >
                  <span className="material-symbols-outlined text-[14px] text-slate-500">edit</span>
                  <span>Sửa</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleBanner(b.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  title={b.status === "active" ? "Ẩn banner khỏi trang chủ" : "Hiển thị lại banner"}
                >
                  <span className="material-symbols-outlined text-[14px] text-slate-500">
                    {b.status === "active" ? "visibility_off" : "visibility"}
                  </span>
                  <span>{b.status === "active" ? "Ẩn" : "Hiện"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteBanner(b.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition-colors cursor-pointer"
                  title="Xóa banner vĩnh viễn"
                >
                  <span className="material-symbols-outlined text-[14px]">delete</span>
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <CountdownConfirmModal
        isOpen={Boolean(marketingConfirm)}
        title={marketingConfirm?.title || ''}
        description={marketingConfirm?.description || ''}
        countdownSeconds={5}
        confirmLabel={marketingConfirm?.confirmLabel || 'Xác nhận'}
        onCancel={() => {
          skipConflictConfirmRef.current = false;
          setMarketingConfirm(null);
        }}
        onConfirm={() => marketingConfirm?.onConfirm()}
      />
    </div>
  );
}
