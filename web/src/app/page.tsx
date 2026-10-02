'use client';

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/ui/context/CartContext";
import { useToast } from "@/ui/context/ToastContext";
import { catalogApi, type BookData } from "@/ui/api/catalogApi";
import { flashSaleApi, type FlashSaleSlot, type FlashSaleItem } from "@/ui/api/flashSaleApi";
import { voucherApi } from "@/ui/api/voucherApi";
import BookCard from "@/ui/components/common/BookCard";
import { PersonalizedForYouSection } from "@/ui/components/recommendations/PersonalizedForYouSection";

export default function HomePage() {
  const router = useRouter();
  const { addToCart } = useCart();
  const { showToast } = useToast();

  // Real Books from Backend Commerce Database
  const [realBooks, setRealBooks] = useState<BookData[]>([]);
  const [realVouchers, setRealVouchers] = useState<any[]>([]);
  const [activeFlashSale, setActiveFlashSale] = useState<FlashSaleSlot | null>(null);
  const [platformSalePhase, setPlatformSalePhase] = useState<'LIVE' | 'TEASER' | 'NONE'>('NONE');
  const [flashSeconds, setFlashSeconds] = useState(0);

  useEffect(() => {
    catalogApi
      .getPublicBooks({ limit: 100 })
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setRealBooks(res.data);
        }
      })
      .catch((err) => console.warn("Could not fetch real books:", err));

    voucherApi
      .getAvailableVouchers()
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setRealVouchers(res.data);
        } else {
          voucherApi.getPlatformVouchers().then((pRes) => {
            if (pRes.success && Array.isArray(pRes.data)) {
              setRealVouchers(pRes.data);
            }
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadFlashSale = async () => {
      try {
        const res = await flashSaleApi.getAll({ scope: "PLATFORM" });
        if (!mounted) return;
        if (res.success && Array.isArray(res.data)) {
          const now = Date.now();
          const platformSales = res.data.filter(
            (s) => (s.scope === "PLATFORM" || !s.storeId) && s.status !== "CANCELLED" && s.status !== "ENDED"
          );

          // 1. Check for LIVE Platform Flash Sale
          const liveSale = platformSales.find((s) => {
            const sTime = new Date(s.startsAt).getTime();
            const eTime = new Date(s.endsAt).getTime();
            return s.status === "ACTIVE" && now >= sTime && now < eTime;
          });

          if (liveSale) {
            setActiveFlashSale(liveSale);
            setPlatformSalePhase("LIVE");
            const rem = Math.max(0, Math.floor((new Date(liveSale.endsAt).getTime() - now) / 1000));
            setFlashSeconds(rem);
            return;
          }

          // 2. Check for TEASER / Announcement Platform Flash Sale
          const teaserSale = platformSales.find((s) => {
            const sTime = new Date(s.startsAt).getTime();
            const eTime = new Date(s.endsAt).getTime();
            return s.status !== "ENDED" && now < sTime && eTime > now;
          });

          if (teaserSale) {
            setActiveFlashSale(teaserSale);
            setPlatformSalePhase("TEASER");
            const rem = Math.max(0, Math.floor((new Date(teaserSale.startsAt).getTime() - now) / 1000));
            setFlashSeconds(rem);
            return;
          }

          setActiveFlashSale(null);
          setPlatformSalePhase("NONE");
          setFlashSeconds(0);
        } else {
          setActiveFlashSale(null);
          setPlatformSalePhase("NONE");
          setFlashSeconds(0);
        }
      } catch {
        if (mounted) {
          setActiveFlashSale(null);
          setPlatformSalePhase("NONE");
          setFlashSeconds(0);
        }
      }
    };
    loadFlashSale();
    const poller = setInterval(loadFlashSale, 5_000);
    return () => {
      mounted = false;
      clearInterval(poller);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(
      () => setFlashSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

  // Hero Slider State & Autoplay
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  const isPlatformLive = platformSalePhase === "LIVE";
  const isPlatformTeaser = platformSalePhase === "TEASER";

  // Hero Slides with Real Photography Backgrounds
  const heroSlides = useMemo(() => {
    const defaultSlide1 = {
      id: "slide-1",
      badge: "Hội Sách Tri Thức Mùa Xuất Bản 2026",
      icon: "auto_awesome",
      title: "Chăm sóc tâm hồn –\nTỏa sáng cùng tri thức",
      desc: "Hơn 50.000 đầu sách tuyển chọn & Ebook bản quyền từ các NXB uy tín. Giao nhanh 2H nội thành.",
      bgImage: "/banners/hero-library.jpg",
      overlay:
        "linear-gradient(to right, rgba(0, 42, 32, 0.94) 0%, rgba(0, 42, 32, 0.82) 48%, rgba(0, 42, 32, 0.2) 100%)",
      primaryBtn: { text: "Khám phá ngay", to: "/books" },
      secondaryBtn: { text: "Đọc thử Ebook", to: "/books?format=ebook" },
      accent: "#C58F5E",
    };

    let firstSlide = defaultSlide1;
    if ((isPlatformLive || isPlatformTeaser) && activeFlashSale) {
      firstSlide = {
        id: "slide-flash-sale",
        badge: isPlatformLive
          ? "🔥 FLASH SALE GIỜ VÀNG TOÀN SÀN ĐANG DIỄN RA"
          : "⏰ SẮP DIỄN RA FLASH SALE TOÀN SÀN HUKI",
        icon: "bolt",
        title: activeFlashSale.name,
        desc:
          activeFlashSale.description ||
          (isPlatformLive
            ? `Giảm sốc tới ${activeFlashSale.discountPercent || 30}% toàn bộ sách được trợ giá bởi HUKI Sàn. Số lượng có hạn!`
            : `Đợt Flash Sale trợ giá tới ${activeFlashSale.discountPercent || 30}% toàn sàn chuẩn bị diễn ra. Sẵn sàng săn deal ngay!`),
        bgImage: activeFlashSale.bannerUrl || "/banners/hero-library.jpg",
        overlay: isPlatformLive
          ? "linear-gradient(to right, rgba(140, 20, 20, 0.94) 0%, rgba(140, 20, 20, 0.82) 50%, rgba(140, 20, 20, 0.25) 100%)"
          : "linear-gradient(to right, rgba(15, 35, 70, 0.94) 0%, rgba(15, 35, 70, 0.82) 50%, rgba(15, 35, 70, 0.25) 100%)",
        primaryBtn: {
          text: isPlatformLive ? "Săn Flash Sale Ngay" : "Xem Chi Tiết Khung Giờ",
          to: "/flash-sale",
        },
        secondaryBtn: { text: "Khám Phá Sách", to: "/books" },
        accent: isPlatformLive ? "#EF4444" : "#3B82F6",
      };
    }

    return [
      firstSlide,
      {
        id: "slide-2",
        badge: "Không Gian Đọc Ebook DRM & Audio",
        icon: "tablet_mac",
        title: "Đọc mọi lúc mọi nơi –\nĐồng bộ đa thiết bị",
        desc: "Kho Ebook bản quyền chuẩn DRM, highlight và ghi chú thông minh, đọc mượt mà trên App & Web.",
        bgImage: "/banners/sub-hybrid.jpg",
        overlay:
          "linear-gradient(to right, rgba(14, 38, 50, 0.94) 0%, rgba(14, 38, 50, 0.82) 50%, rgba(14, 38, 0.2) 100%)",
        primaryBtn: { text: "Trải nghiệm Ebook", to: "/books?format=ebook" },
        secondaryBtn: {
          text: "Mua Combo Tiết Kiệm",
          to: "/books?format=hybrid",
        },
        accent: "#38BDF8",
      },
      {
        id: "slide-3",
        badge: "Ấn Bản Sách Đẹp & Sưu Tầm Cao Cấp",
        icon: "workspace_premium",
        title: "Bìa cứng mạ vàng –\nQuà tặng tri thức sang trọng",
        desc: "Tuyển tập kiệt tác văn học, sách giới hạn kèm chữ ký tác giả và bookmark cao cấp.",
        bgImage: "/banners/hero-podium.jpg",
        overlay:
          "linear-gradient(to right, rgba(38, 26, 12, 0.94) 0%, rgba(38, 26, 12, 0.82) 48%, rgba(38, 26, 12, 0.2) 100%)",
        primaryBtn: { text: "Xem bộ sưu tập", to: "/books?filter=special" },
        secondaryBtn: {
          text: "Săn Deal Bán Chạy",
          to: "/books?filter=flash-sale",
        },
        accent: "#F59E0B",
      },
    ];
  }, [isPlatformLive, isPlatformTeaser, activeFlashSale]);

  // Autoplay Hero Slider
  useEffect(() => {
    if (isHeroHovered) return;
    const timer = setInterval(() => {
      setActiveHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isHeroHovered, heroSlides.length]);

  // Voucher Saved State
  const [savedVouchers, setSavedVouchers] = useState(["HUKIFREESHIP"]);

  // Bestseller Filter Tab
  const [bestsellerTab, setBestsellerTab] = useState("all");

  // Followed Shops & Authors State
  const [followedShops, setFollowedShops] = useState([
    "Nhã Nam",
    "Alpha Books",
  ]);
  const [followedAuthors, setFollowedAuthors] = useState(["James Clear"]);

  // Author Slider State & Autoplay
  const [authorIndex, setAuthorIndex] = useState(0);
  const [isAuthorHovered, setIsAuthorHovered] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // AI Prompt State
  const [aiInput, setAiInput] = useState(
    "Tôi muốn tìm sách giúp cải thiện sự tập trung và làm việc sâu mà không bị kiệt sức...",
  );
  const [newsletterEmail, setNewsletterEmail] = useState("");

  // 1. VOUCHER LIST (Real from Backend Promotion Service + Demo items)
  const voucherList = useMemo(() => {
    const list: Array<{
      code: string;
      badge: string;
      title: string;
      condition: string;
      exp: string;
      icon: string;
      isMock: boolean;
    }> = [];

    // Real active vouchers
    if (realVouchers && realVouchers.length > 0) {
      realVouchers.slice(0, 4).forEach((v) => {
        let badge = v.type === 'PERCENTAGE' ? `GIẢM ${v.value}%` : v.type === 'FREE_SHIPPING' ? 'FREESHIP' : `GIẢM ${Number(v.value).toLocaleString('vi-VN')}Đ`;
        let icon = v.type === 'FREE_SHIPPING' ? 'local_shipping' : v.type === 'PERCENTAGE' ? 'percent' : 'redeem';
        let condition = v.minOrderAmount ? `Đơn từ ${Number(v.minOrderAmount).toLocaleString('vi-VN')}₫` : 'Mọi đơn hàng';
        if (v.targetAudience === 'FOLLOWERS_ONLY') {
          condition += ' • Dành cho Người theo dõi';
          icon = 'favorite';
        } else if (v.targetAudience === 'NEW_CUSTOMERS_ONLY') {
          condition += ' • Khách mới';
        }

        list.push({
          code: v.code,
          badge,
          title: v.name || `Voucher ${v.code}`,
          condition,
          exp: v.expiresAt ? `HSD: ${new Date(v.expiresAt).toLocaleDateString('vi-VN')}` : 'HSD: Dài hạn',
          icon,
          isMock: false,
        });
      });
    }

    // Fallback demo/mock items to ensure rich banner layout
    const fallbackMocks = [
      {
        code: "HUKIFREESHIP",
        badge: "FREESHIP",
        title: "Miễn phí vận chuyển 100%",
        condition: "Đơn từ 150.000₫ • Toàn quốc",
        exp: "Sắp mở lượt mới",
        icon: "local_shipping",
        isMock: true,
      },
      {
        code: "HUKINEW25",
        badge: "GIẢM 25K",
        title: "Giảm 25.000₫ đơn đầu tiên",
        condition: "Đơn từ 120.000₫ • Khách mới",
        exp: "Demo",
        icon: "redeem",
        isMock: true,
      },
      {
        code: "HUKICOMBO60",
        badge: "GIẢM 60K",
        title: "Giảm 60.000₫ khi mua Combo",
        condition: "Áp dụng cho Combo từ 300k",
        exp: "Demo",
        icon: "auto_awesome",
        isMock: true,
      },
      {
        code: "EBOOK50",
        badge: "EBOOK 50%",
        title: "Giảm 50% mọi Ebook bản quyền",
        condition: "Tối đa 40.000₫ • Mọi đơn Ebook",
        exp: "Demo",
        icon: "menu_book",
        isMock: true,
      },
    ];

    for (const mock of fallbackMocks) {
      if (list.length < 4 && !list.some((it) => it.code === mock.code)) {
        list.push(mock);
      }
    }

    return list;
  }, [realVouchers]);

  // 2. FLASH SALE (With real items or mock fallback with isMock: true)
  const allFlashSale = useMemo(() => {
    if (activeFlashSale?.items && activeFlashSale.items.length > 0) {
      return activeFlashSale.items.map((item: FlashSaleItem) => {
        const book = realBooks.find((entry) => entry.id === item.bookId);
        return {
          id: item.bookId,
          bookId: item.bookId,
          storeId: book?.storeId || (book as any)?.store_id || book?.businessId || (book as any)?.business_id,
          businessId: book?.businessId || (book as any)?.business_id || book?.storeId || (book as any)?.store_id,
          book: book,
          title: book?.title || `Tác phẩm Flash Sale #${item.bookId.slice(0, 6)}`,
          author: book?.author?.name || "Tác giả HUKI",
          publisher: book?.publisher?.name || "Gian hàng HUKI",
          cover: book?.coverUrl || book?.coverImage || "/banners/hero-library.jpg",
          price: item.salePrice,
          originalPrice: item.originalPrice,
          discount: `-${item.discountPercent}%`,
          discountPercent: item.discountPercent,
          rating: 5,
          sales: item.sold,
          soldText: item.isSoldOut ? "Đã bán hết 100%" : `Đã bán ${item.sold} cuốn`,
          format: "Sách giấy",
          formatType: "physical",
          isMock: false,
        };
      });
    }
    // Mock items when no active flash sale campaign
    return [
      {
        id: "mock-flash-1",
        title: "Atomic Habits – Thay Đổi Tí Hon",
        author: "James Clear",
        publisher: "Alpha Books Official",
        cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80",
        price: 119000,
        originalPrice: 189000,
        discount: "-37%",
        discountPercent: 37,
        rating: 5.0,
        sales: "1.4k",
        soldText: "Đã bán 89 cuốn",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-flash-2",
        title: "Tâm Lý Học Về Tiền",
        author: "Morgan Housel",
        publisher: "NXB Trẻ",
        cover: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=400&q=80",
        price: 99000,
        originalPrice: 189000,
        discount: "-48%",
        discountPercent: 48,
        rating: 4.9,
        sales: "2.1k",
        soldText: "Đã bán 142 cuốn",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-flash-3",
        title: "Nhà Giả Kim (The Alchemist)",
        author: "Paulo Coelho",
        publisher: "Nhã Nam",
        cover: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80",
        price: 52000,
        originalPrice: 80000,
        discount: "-35%",
        discountPercent: 35,
        rating: 5.0,
        sales: "5.8k",
        soldText: "Đã bán 210 cuốn",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-flash-4",
        title: "Cây Cam Ngọt Của Tôi",
        author: "José Mauro de Vasconcelos",
        publisher: "Nhã Nam",
        cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80",
        price: 68000,
        originalPrice: 108000,
        discount: "-37%",
        discountPercent: 37,
        rating: 5.0,
        sales: "3.2k",
        soldText: "Đã bán 95 cuốn",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-flash-5",
        title: "Hiểu Về Trái Tim",
        author: "Thích Minh Niệm",
        publisher: "First News",
        cover: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80",
        price: 85000,
        originalPrice: 145000,
        discount: "-41%",
        discountPercent: 41,
        rating: 5.0,
        sales: "1.9k",
        soldText: "Đã bán 60 cuốn",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-flash-6",
        title: "Sapiens: Lược Sử Loài Người",
        author: "Yuval Noah Harari",
        publisher: "Nhã Nam",
        cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80",
        price: 135000,
        originalPrice: 220000,
        discount: "-38%",
        discountPercent: 38,
        rating: 4.9,
        sales: "2.4k",
        soldText: "Đã bán 110 cuốn",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
    ];
  }, [activeFlashSale, realBooks]);

  const flashCountdown = {
    hours: String(Math.floor(flashSeconds / 3600)).padStart(2, "0"),
    minutes: String(Math.floor((flashSeconds % 3600) / 60)).padStart(2, "0"),
    seconds: String(flashSeconds % 60).padStart(2, "0"),
  };

  // 3. BESTSELLERS (Real mapped items or curated mock items with isMock)
  const allBestsellers = useMemo(() => {
    if (realBooks.length >= 6) {
      return realBooks.slice(0, 12).map((b, idx) => {
        const salePrice = b.price || 125000;
        const origPrice = b.originalPrice && b.originalPrice > salePrice ? b.originalPrice : Math.round(salePrice * 1.3);
        const discountPct = Math.round(((origPrice - salePrice) / origPrice) * 100);

        return {
          id: b.id,
          bookId: b.id,
          storeId: b.storeId || (b as any)?.store_id || b.businessId || (b as any)?.business_id,
          businessId: b.businessId || (b as any)?.business_id || b.storeId || (b as any)?.store_id,
          book: b,
          rank: idx + 1,
          title: b.title,
          author: b.author?.name || "Tác giả HUKI",
          publisher: b.publisher?.name || "HUKI Publisher",
          cover: b.coverUrl || b.coverImage || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80",
          price: salePrice,
          originalPrice: origPrice,
          discount: `-${discountPct}%`,
          discountPercent: discountPct,
          rating: 5.0,
          sales: `${350 - idx * 20}`,
          category: b.format === "DIGITAL" ? "ebook" : "paper",
          format: b.format === "DIGITAL" ? "Ebook DRM" : "Sách giấy",
          formatType: b.format === "DIGITAL" ? "ebook" : "physical",
          isMock: false,
        };
      });
    }

    // Mock bestseller items
    return [
      {
        id: "mock-bs-1",
        rank: 1,
        title: "Nhà Giả Kim (The Alchemist)",
        author: "Paulo Coelho",
        publisher: "Nhã Nam",
        cover: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80",
        price: 64000,
        originalPrice: 80000,
        discount: "-20%",
        discountPercent: 20,
        rating: 5.0,
        sales: "38.2k",
        category: "paper",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-bs-2",
        rank: 2,
        title: "Atomic Habits – Thay Đổi Tí Hon",
        author: "James Clear",
        publisher: "Alpha Books Official",
        cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80",
        price: 149000,
        originalPrice: 189000,
        discount: "-21%",
        discountPercent: 21,
        rating: 4.9,
        sales: "15.4k",
        category: "paper",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-bs-3",
        rank: 3,
        title: "Tâm Lý Học Về Tiền",
        author: "Morgan Housel",
        publisher: "NXB Trẻ",
        cover: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=400&q=80",
        price: 149000,
        originalPrice: 189000,
        discount: "-21%",
        discountPercent: 21,
        rating: 4.9,
        sales: "19.8k",
        category: "paper",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-bs-4",
        rank: 4,
        title: "Tôi Thấy Hoa Vàng Trên Cỏ Xanh",
        author: "Nguyễn Nhật Ánh",
        publisher: "NXB Trẻ",
        cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80",
        price: 84000,
        originalPrice: 105000,
        discount: "-20%",
        discountPercent: 20,
        rating: 4.9,
        sales: "12.6k",
        category: "paper",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-bs-5",
        rank: 5,
        title: "Dám Bị Ghét (Bản Quyền Số)",
        author: "Kishimi Ichiro",
        publisher: "Nhã Nam",
        cover: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80",
        price: 59000,
        originalPrice: 89000,
        discount: "-33%",
        discountPercent: 33,
        rating: 4.8,
        sales: "17.5k",
        category: "ebook",
        format: "Ebook DRM",
        formatType: "ebook",
        isMock: true,
      },
      {
        id: "mock-bs-6",
        rank: 6,
        title: "1984 – George Orwell",
        author: "George Orwell",
        publisher: "Nhã Nam",
        cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80",
        price: 79000,
        originalPrice: 99000,
        discount: "-20%",
        discountPercent: 20,
        rating: 4.8,
        sales: "9.8k",
        category: "paper",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
    ];
  }, [realBooks]);

  const filteredBestsellers = useMemo(() => {
    if (bestsellerTab === "paper") return allBestsellers.filter((b) => b.category === "paper");
    if (bestsellerTab === "ebook") return allBestsellers.filter((b) => b.category === "ebook");
    return allBestsellers;
  }, [bestsellerTab, allBestsellers]);

  // 4. OFFICIAL STORES
  const officialStores = useMemo(
    () => [
      {
        id: "store-tre",
        name: "NXB Trẻ",
        code: "TRẺ",
        color: "bg-emerald-600 text-white",
        followers: "42.5k người theo dõi",
        verified: true,
      },
      {
        id: "store-nhanam",
        name: "Nhã Nam",
        code: "NN",
        color: "bg-amber-600 text-white",
        followers: "68.2k người theo dõi",
        verified: true,
      },
      {
        id: "store-kimdong",
        name: "NXB Kim Đồng",
        code: "KĐ",
        color: "bg-rose-600 text-white",
        followers: "51.9k người theo dõi",
        verified: true,
      },
      {
        id: "store-alphabooks",
        name: "Alpha Books Official",
        code: "αB",
        color: "bg-blue-600 text-white",
        followers: "39.1k người theo dõi",
        verified: true,
      },
      {
        id: "store-firstnews",
        name: "First News Trí Việt",
        code: "FN",
        color: "bg-teal-700 text-white",
        followers: "45.8k người theo dõi",
        verified: true,
      },
    ],
    [],
  );

  // 5. GENRE CATEGORIES SLICES (6 books each with fallback isMock)
  const literatureBooks = useMemo(() => {
    const list = realBooks.filter((b) => {
      const slug = b.category?.slug?.toLowerCase() || '';
      const name = b.category?.name?.toLowerCase() || '';
      return slug.includes('van-hoc') || name.includes('văn học') || name.includes('tiểu thuyết');
    });
    if (list.length >= 6) return list.slice(0, 6).map((b) => ({ ...b, isMock: false }));
    return [
      ...list.map((b) => ({ ...b, isMock: false })),
      {
        id: "mock-lit-1",
        title: "Cây Cam Ngọt Của Tôi",
        author: "José Mauro",
        publisher: "Nhã Nam",
        cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80",
        price: 86000,
        originalPrice: 108000,
        discount: "-20%",
        rating: 5.0,
        sales: "12.4k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-lit-2",
        title: "Chiến Binh Cầu Vồng",
        author: "Andrea Hirata",
        publisher: "Nhã Nam",
        cover: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80",
        price: 94000,
        originalPrice: 119000,
        discount: "-21%",
        rating: 4.9,
        sales: "8.1k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-lit-3",
        title: "Rừng Na Uy (Norwegian Wood)",
        author: "Haruki Murakami",
        publisher: "Nhã Nam",
        cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80",
        price: 112000,
        originalPrice: 140000,
        discount: "-20%",
        rating: 4.8,
        sales: "15.3k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-lit-4",
        title: "Hoàng Tử Bé (Le Petit Prince)",
        author: "Antoine de Saint-Exupéry",
        publisher: "Kim Đồng",
        cover: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80",
        price: 45000,
        originalPrice: 60000,
        discount: "-25%",
        rating: 5.0,
        sales: "24.9k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-lit-5",
        title: "Những Người Khốn Khổ",
        author: "Victor Hugo",
        publisher: "NXB Văn Học",
        cover: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=400&q=80",
        price: 175000,
        originalPrice: 230000,
        discount: "-24%",
        rating: 4.9,
        sales: "6.7k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-lit-6",
        title: "Trăm Năm Cô Đơn",
        author: "Gabriel García Márquez",
        publisher: "Nhã Nam",
        cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80",
        price: 139000,
        originalPrice: 175000,
        discount: "-20%",
        rating: 4.8,
        sales: "9.2k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
    ].slice(0, 6);
  }, [realBooks]);

  const businessBooks = useMemo(() => {
    const list = realBooks.filter((b) => {
      const slug = b.category?.slug?.toLowerCase() || '';
      const name = b.category?.name?.toLowerCase() || '';
      return slug.includes('kinh-te') || name.includes('kinh tế') || name.includes('đầu tư') || name.includes('kinh doanh');
    });
    if (list.length >= 6) return list.slice(0, 6).map((b) => ({ ...b, isMock: false }));
    return [
      ...list.map((b) => ({ ...b, isMock: false })),
      {
        id: "mock-biz-1",
        title: "Từ Tốt Đến Vĩ Đại (Good to Great)",
        author: "Jim Collins",
        publisher: "NXB Trẻ",
        cover: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=400&q=80",
        price: 148000,
        originalPrice: 185000,
        discount: "-20%",
        rating: 4.9,
        sales: "11.2k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-biz-2",
        title: "Khởi Nghiệp Tinh Gọn (Lean Startup)",
        author: "Eric Ries",
        publisher: "Alpha Books Official",
        cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80",
        price: 136000,
        originalPrice: 170000,
        discount: "-20%",
        rating: 4.8,
        sales: "8.7k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-biz-3",
        title: "Principles: Nguyên Tắc Trong Cuộc Sống",
        author: "Ray Dalio",
        publisher: "Alpha Books Official",
        cover: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80",
        price: 225000,
        originalPrice: 290000,
        discount: "-22%",
        rating: 4.9,
        sales: "14.1k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-biz-4",
        title: "Nhà Đầu Tư Thông Minh",
        author: "Benjamin Graham",
        publisher: "NXB Trẻ",
        cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80",
        price: 189000,
        originalPrice: 245000,
        discount: "-23%",
        rating: 5.0,
        sales: "20.5k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-biz-5",
        title: "Tư Duy Nhanh Và Chậm",
        author: "Daniel Kahneman",
        publisher: "Alpha Books Official",
        cover: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80",
        price: 195000,
        originalPrice: 260000,
        discount: "-25%",
        rating: 4.8,
        sales: "16.8k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-biz-6",
        title: "Bước Đi Ngẫu Nhiên Trên Phố Wall",
        author: "Burton G. Malkiel",
        publisher: "NXB Trẻ",
        cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80",
        price: 165000,
        originalPrice: 215000,
        discount: "-23%",
        rating: 4.8,
        sales: "7.4k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
    ].slice(0, 6);
  }, [realBooks]);

  const techBooks = useMemo(() => {
    const list = realBooks.filter((b) => {
      const slug = b.category?.slug?.toLowerCase() || '';
      const name = b.category?.name?.toLowerCase() || '';
      return slug.includes('cong-nghe') || name.includes('công nghệ') || name.includes('ai');
    });
    if (list.length >= 6) return list.slice(0, 6).map((b) => ({ ...b, isMock: false }));
    return [
      ...list.map((b) => ({ ...b, isMock: false })),
      {
        id: "mock-tech-1",
        title: "AI 2041: 10 Viễn Cảnh Tương Lai",
        author: "Kai-Fu Lee",
        publisher: "NXB Trẻ",
        cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80",
        price: 172000,
        originalPrice: 215000,
        discount: "-20%",
        rating: 4.9,
        sales: "5.3k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-tech-2",
        title: "Chip War: Cuộc Chiến Vi Mạch Toàn Cầu",
        author: "Chris Miller",
        publisher: "Alpha Books Official",
        cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80",
        price: 195000,
        originalPrice: 245000,
        discount: "-20%",
        rating: 5.0,
        sales: "7.8k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-tech-3",
        title: "Kỷ Nguyên AI & Tương Lai Nhân Loại",
        author: "Henry Kissinger",
        publisher: "NXB Trẻ",
        cover: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80",
        price: 145000,
        originalPrice: 180000,
        discount: "-19%",
        rating: 4.8,
        sales: "4.6k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-tech-4",
        title: "Clean Code: Mã Sạch Thực Chiến",
        author: "Robert C. Martin",
        publisher: "NXB Thông Tin",
        cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80",
        price: 210000,
        originalPrice: 260000,
        discount: "-19%",
        rating: 5.0,
        sales: "12.3k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-tech-5",
        title: "Lập Trình Hướng Đối Tượng & Design Patterns",
        author: "Erich Gamma",
        publisher: "NXB Bách Khoa",
        cover: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80",
        price: 185000,
        originalPrice: 230000,
        discount: "-20%",
        rating: 4.9,
        sales: "6.9k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
      {
        id: "mock-tech-6",
        title: "Học Máy Thực Hành (Hands-On Machine Learning)",
        author: "Aurélien Géron",
        publisher: "NXB Đại Học Quốc Gia",
        cover: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=400&q=80",
        price: 260000,
        originalPrice: 320000,
        discount: "-19%",
        rating: 5.0,
        sales: "8.4k",
        format: "Sách giấy",
        formatType: "physical",
        isMock: true,
      },
    ].slice(0, 6);
  }, [realBooks]);

  const ebookShelfBooks = useMemo(() => {
    const list = realBooks.filter((b) => b.format === 'DIGITAL' || b.digitalDetails?.digitalEnabled);
    if (list.length >= 6) return list.slice(0, 6).map((b) => ({ ...b, isMock: false }));
    return [
      ...list.map((b) => ({ ...b, isMock: false })),
      {
        id: "mock-eb-1",
        title: "Dế Mèn Phiêu Lưu Ký (Ebook DRM)",
        author: "Tô Hoài",
        publisher: "Kim Đồng",
        cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80",
        price: 0,
        originalPrice: 35000,
        discount: "Miễn phí",
        rating: 5.0,
        sales: "45.1k",
        format: "Ebook DRM",
        formatType: "ebook",
        isMock: true,
      },
      {
        id: "mock-eb-2",
        title: "Tư Duy Tích Cực Tạo Thành Công",
        author: "Norman Vincent Peale",
        publisher: "First News",
        cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80",
        price: 35000,
        originalPrice: 59000,
        discount: "-41%",
        rating: 4.8,
        sales: "8.3k",
        format: "Ebook DRM",
        formatType: "ebook",
        isMock: true,
      },
      {
        id: "mock-eb-3",
        title: "Nhà Giả Kim (Ebook DRM Bản Quyền)",
        author: "Paulo Coelho",
        publisher: "Nhã Nam",
        cover: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=400&q=80",
        price: 39000,
        originalPrice: 65000,
        discount: "-40%",
        rating: 5.0,
        sales: "28.4k",
        format: "Ebook DRM",
        formatType: "ebook",
        isMock: true,
      },
      {
        id: "mock-eb-4",
        title: "Sapiens: Lược Sử Loài Người (Ebook)",
        author: "Yuval Noah Harari",
        publisher: "Nhã Nam",
        cover: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80",
        price: 75000,
        originalPrice: 120000,
        discount: "-38%",
        rating: 4.9,
        sales: "14.2k",
        format: "Ebook DRM",
        formatType: "ebook",
        isMock: true,
      },
      {
        id: "mock-eb-5",
        title: "Hiểu Về Trái Tim (Ebook DRM)",
        author: "Thích Minh Niệm",
        publisher: "First News",
        cover: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80",
        price: 49000,
        originalPrice: 80000,
        discount: "-39%",
        rating: 5.0,
        sales: "19.5k",
        format: "Ebook DRM",
        formatType: "ebook",
        isMock: true,
      },
      {
        id: "mock-eb-6",
        title: "Con Đường Phía Trước (The Road Ahead)",
        author: "Bill Gates",
        publisher: "Alpha Books Official",
        cover: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=400&q=80",
        price: 89000,
        originalPrice: 159000,
        discount: "-44%",
        rating: 5.0,
        sales: "11.8k",
        format: "Ebook DRM",
        formatType: "ebook",
        isMock: true,
      },
    ].slice(0, 6);
  }, [realBooks]);

  // 6. GỢI Ý HÔM NAY (24 SÁCH - Real books have isMock=false, padded mock items have isMock=true)
  const suggestedBooks = useMemo(() => {
    const realItems = realBooks.map((b) => ({ ...b, isMock: false }));
    if (realItems.length >= 24) {
      return realItems.slice(0, 24);
    }

    const mockTitles = [
      { title: "Nhà Giả Kim", author: "Paulo Coelho", price: 64000, orig: 80000, cat: "van-hoc" },
      { title: "Atomic Habits – Thay Đổi Tí Hon", author: "James Clear", price: 149000, orig: 189000, cat: "ky-nang" },
      { title: "Tâm Lý Học Về Tiền", author: "Morgan Housel", price: 149000, orig: 189000, cat: "kinh-te" },
      { title: "Tôi Thấy Hoa Vàng Trên Cỏ Xanh", author: "Nguyễn Nhật Ánh", price: 84000, orig: 105000, cat: "van-hoc" },
      { title: "Dám Bị Ghét", author: "Kishimi Ichiro", price: 59000, orig: 89000, cat: "tam-ly" },
      { title: "1984 – Kỷ Nguyên Giám Sát", author: "George Orwell", price: 79000, orig: 99000, cat: "van-hoc" },
      { title: "Cây Cam Ngọt Của Tôi", author: "José Mauro", price: 86000, orig: 108000, cat: "van-hoc" },
      { title: "Chiến Binh Cầu Vồng", author: "Andrea Hirata", price: 94000, orig: 119000, cat: "van-hoc" },
      { title: "Rừng Na Uy", author: "Haruki Murakami", price: 112000, orig: 140000, cat: "van-hoc" },
      { title: "Hoàng Tử Bé", author: "Antoine de Saint-Exupéry", price: 45000, orig: 60000, cat: "thieu-nhi" },
      { title: "Từ Tốt Đến Vĩ Đại", author: "Jim Collins", price: 148000, orig: 185000, cat: "kinh-te" },
      { title: "Khởi Nghiệp Tinh Gọn", author: "Eric Ries", price: 136000, orig: 170000, cat: "kinh-te" },
      { title: "Principles – Nguyên Tắc", author: "Ray Dalio", price: 225000, orig: 290000, cat: "kinh-te" },
      { title: "Nhà Đầu Tư Thông Minh", author: "Benjamin Graham", price: 189000, orig: 245000, cat: "kinh-te" },
      { title: "Tư Duy Nhanh Và Chậm", author: "Daniel Kahneman", price: 195000, orig: 260000, cat: "tam-ly" },
      { title: "AI 2041: 10 Viễn Cảnh Tương Lai", author: "Kai-Fu Lee", price: 172000, orig: 215000, cat: "cong-nghe" },
      { title: "Chip War: Cuộc Chiến Vi Mạch", author: "Chris Miller", price: 195000, orig: 245000, cat: "cong-nghe" },
      { title: "Kỷ Nguyên AI", author: "Henry Kissinger", price: 145000, orig: 180000, cat: "cong-nghe" },
      { title: "Clean Code", author: "Robert C. Martin", price: 210000, orig: 260000, cat: "cong-nghe" },
      { title: "Sapiens: Lược Sử Loài Người", author: "Yuval Noah Harari", price: 135000, orig: 220000, cat: "lich-su" },
      { title: "Homo Deus: Lược Sử Tương Lai", author: "Yuval Noah Harari", price: 145000, orig: 230000, cat: "lich-su" },
      { title: "Hiểu Về Trái Tim", author: "Thích Minh Niệm", price: 85000, orig: 145000, cat: "tam-ly" },
      { title: "Không Diệt Không Sinh Đừng Sợ Hãi", author: "Thích Nhất Hạnh", price: 72000, orig: 98000, cat: "tam-ly" },
      { title: "Muôn Kiếp Nhân Sinh", author: "Nguyên Phong", price: 128000, orig: 168000, cat: "tam-linh" },
    ];

    const mockItems = mockTitles.map((item, idx) => ({
      id: `mock-sug-${idx + 1}`,
      title: item.title,
      author: item.author,
      publisher: "HUKI Publisher",
      cover: `https://images.unsplash.com/photo-${1544716278 + (idx % 10) * 1000}-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80`,
      price: item.price,
      originalPrice: item.orig,
      discount: `-${Math.round(((item.orig - item.price) / item.orig) * 100)}%`,
      rating: 5.0,
      sales: `${100 + idx * 45}`,
      format: "Sách giấy",
      formatType: "physical",
      isMock: true,
    }));

    return [...realItems, ...mockItems].slice(0, 24);
  }, [realBooks]);

  // 7. AUTHORS LIST
  const authorsList = useMemo(
    () => [
      {
        name: "Haruki Murakami",
        books: "18 đầu sách",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuCR-OPOd7e4KsfO0t-0xMw2DyZP6jFtwwwqK09pUgJkDjYa5toolI1E43E6nK-pjKQ6oIWrou0_f2agMmZEgZ5RS2CAqewxN9TTMHgCwG3kskJbOd9X7kp7O9OAoalbSgCbAKmG8cO9bWGgyhXmV7IYpaXvZo22hV3-AQrsi84-ZhwNMBtpp6uHr5U4YKB0kas_ERbqkslBd2P7hY2oeGjp4StJDzkov6Y8h3uarnyuNI2MzhOB6sP7Vw",
      },
      {
        name: "James Clear",
        books: "4 ấn phẩm",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAnw9yJWOrKGesjDyl1-X_0R2W4HNILmzCsBYgbF0XKynDiK7fNvri-xM3jY3V_3z15MmE0g3IJX0qsypYqufMmBW5544ziG8nhUbsSR9WJhuCOKCBJisehB_5esWgbY7RkVY2LHadzTRsRvBp8TVGnTCHFoDrWjwhXvNwjNCCisa-LJUAhhMYg7n_eLSRD2IdW0XHKQl2V1i3tKp6YJXGPZUt1ZTo4IpAKkERRMoCTmqrThvqL1YOmFA",
      },
      {
        name: "Morgan Housel",
        books: "3 tác phẩm",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAtrE0r2gXqHTig1zo3glXgfCTbKIG1iJv0jftMG7jgJJAy4XBzXb_a0OQpbRa8X1mTIRnjs54Zb5EsOBo9IE1RxUfVgYt5ysUjQ46kpM6ikrx4t_t56RpqAQbYuqKfhaO1h18LuSzCUNduXsNOWS2wX0xolsVziTAj70AnD6YrUKPB5Oyg0jtxgqFbF0yN0X6x3vCXuSCMXzIhQxcEBAP86uH8f2lmCgbn6JCxhlEqNeYzY_-Zpiv-tQ",
      },
      {
        name: "Yuval Noah Harari",
        books: "5 bộ lược sử",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuBTraLVsMiNUVda0rejvWN-zCy-uTUY55qgl17upiljc0TV6u1kOJnsntndANnLcPEmEgEEdIwvKaT_yEjZTbUveJXG5yZUXE77KuhWBL4eSEm_dlUCQuFaEisFn6uqlFfcY-RTB2cMXk3FuQCIdIfRpqkHpiSqE3hsDJW1RFT1dQTBClR3wqcCD6Y-Jt6X1SsOlJCvS-pcnFeB47QmLs4X8uc9_tU14Sv2hqeEB1ry4JzHN-_w8ji9Fw",
      },
      {
        name: "Nguyễn Nhật Ánh",
        books: "32 truyện dài",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuBmk40IHL8nN8QgKmmU5Htwlb2gfZo134PTe-LmHn1e02Dy8D3eLCGlU_U27hCuP3t0jn7R4F3zjTTBBAowvf6PDX6-RbVei2RSTp33PDhYHzIFrWCpK9wHIInJJ5w0ByCX87r2K5VshsFg3ne7rf6i-N_G-_nzhcvWnfSkv7aJHW-9Bx3QzTpbw_67wwMZsthqpn3yoWWuD8LZQ9LpRP-5UTOg8eIetCyfz3Txa9jlqbr0mHuqw_4EHQ",
      },
      {
        name: "Thích Nhất Hạnh",
        books: "14 tác phẩm",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAIVd9e_xnuEa_DW6YY3L3loH6GzqT5fbdDVDUXUGPYTiwNwtsNRPsq0IDnExW68G2riBcucukM_GYSYHVIumaHSrkG6PaiousV-H7pu3UnxOPIuJWrGBo7V9SPhF9SSq4DcP2sCNM2f5IquMZ9GAjqxLJg1dxRIjLO863oh6Z8IkjciAsYS6H2z39GOVXtRqI6lEmbMpcauoOMktSp2zLuGCZFwKvcUV_nka0vi9jIw5VpguiyBRdUVg",
      },
    ],
    [],
  );

  // Responsive itemsPerPage calculation for authors slider
  useEffect(() => {
    const updateCols = () => {
      if (window.innerWidth < 640) setItemsPerPage(2);
      else if (window.innerWidth < 1024) setItemsPerPage(3);
      else setItemsPerPage(5);
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  const maxAuthorIndex = Math.max(0, authorsList.length - itemsPerPage);

  const handleNextAuthor = () => {
    setAuthorIndex((prev) => (prev >= maxAuthorIndex ? 0 : prev + 1));
  };

  const handlePrevAuthor = () => {
    setAuthorIndex((prev) => (prev <= 0 ? maxAuthorIndex : prev - 1));
  };

  useEffect(() => {
    if (isAuthorHovered) return;
    const timer = setInterval(() => {
      setAuthorIndex((prev) => (prev >= maxAuthorIndex ? 0 : prev + 1));
    }, 3500);
    return () => clearInterval(timer);
  }, [isAuthorHovered, maxAuthorIndex]);

  // Handle Save Voucher
  const handleSaveVoucher = (code: string) => {
    if (savedVouchers.includes(code)) {
      showToast(`Mã ${code} đã có trong ví voucher của bạn.`, "info");
    } else {
      setSavedVouchers((prev) => [...prev, code]);
      showToast(
        `Đã lưu mã ${code} thành công! Áp dụng ngay khi thanh toán.`,
        "success",
      );
    }
  };

  // Toggle Shop Follow
  const handleToggleShopFollow = (shopName: string) => {
    if (followedShops.includes(shopName)) {
      setFollowedShops((prev) => prev.filter((s) => s !== shopName));
      showToast(`Đã bỏ theo dõi ${shopName}`, "info");
    } else {
      setFollowedShops((prev) => [...prev, shopName]);
      showToast(
        `Đang theo dõi ${shopName}. Bạn sẽ nhận thông báo sách mới sớm nhất!`,
        "success",
      );
    }
  };

  // Toggle Author Follow
  const handleToggleAuthorFollow = (authorName: string) => {
    if (followedAuthors.includes(authorName)) {
      setFollowedAuthors((prev) => prev.filter((a) => a !== authorName));
      showToast(`Đã bỏ theo dõi tác giả ${authorName}`, "info");
    } else {
      setFollowedAuthors((prev) => [...prev, authorName]);
      showToast(`Đang theo dõi tác giả ${authorName}`, "success");
    }
  };

  return (
    <div className="w-full max-w-[1560px] mx-auto px-3 sm:px-5 lg:px-8 py-5 flex flex-col gap-7 sm:gap-9">
      
      {/* =========================================================================
          SECTION 1: HERO 3 KHỐI CHUẨN TMĐT (MENU DỌC + HERO SLIDER + 2 BANNER PHỤ)
      ========================================================================= */}
      <section className="flex flex-col gap-3.5">
        <div className="grid grid-cols-12 gap-3.5 items-stretch">
          
          {/* 1.1 CỘT TRÁI: MENU DANH MỤC DỌC (Hiện trên Desktop lg+) */}
          <div className="hidden lg:flex lg:col-span-3 flex-col bg-white rounded-2xl border border-[#E8E5DF] p-3 shadow-2xs justify-between">
            <div className="space-y-0.5">
              <div className="px-3 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 mb-1">
                <span className="material-symbols-outlined text-[16px] text-[#003B2B]">
                  menu_book
                </span>
                <span>Danh Mục Sách</span>
              </div>
              {[
                {
                  name: "Văn học & Tiểu thuyết",
                  to: "/books?category=van-hoc",
                  icon: "auto_stories",
                },
                {
                  name: "Kinh tế & Đầu tư",
                  to: "/books?category=kinh-te",
                  icon: "trending_up",
                },
                {
                  name: "Kỹ năng sống & Tư duy",
                  to: "/books?category=ky-nang",
                  icon: "psychology",
                },
                {
                  name: "Công nghệ & AI 2026",
                  to: "/books?category=cong-nghe",
                  icon: "smart_toy",
                },
                {
                  name: "Thiếu nhi & Tuổi trẻ",
                  to: "/books?category=thieu-nhi",
                  icon: "child_care",
                },
                {
                  name: "Manga & Sách tranh",
                  to: "/books?category=manga",
                  icon: "menu_book",
                },
                {
                  name: "Ngoại ngữ & Du học",
                  to: "/books?category=ngoai-ngu",
                  icon: "translate",
                },
                {
                  name: "Ebook DRM Bản quyền",
                  to: "/books?format=ebook",
                  icon: "tablet_mac",
                  badge: "Hot",
                },
              ].map((cat, idx) => (
                <Link
                  key={idx}
                  href={cat.to}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#003B2B] hover:bg-[#003B2B]/5 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-gray-400 group-hover:text-[#003B2B] transition-colors">
                      {cat.icon}
                    </span>
                    <span>{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {cat.badge && (
                      <span className="bg-[#ac2c19] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                        {cat.badge}
                      </span>
                    )}
                    <span className="material-symbols-outlined text-[14px] text-gray-300 group-hover:text-[#003B2B] group-hover:translate-x-0.5 transition-all">
                      chevron_right
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-100 px-1">
              <Link
                href="/books"
                className="text-[11px] font-bold text-[#003B2B] hover:underline flex items-center justify-between"
              >
                <span>Xem tất cả danh mục</span>
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>

          {/* 1.2 CỘT GIỮA: BANNER HERO LỚN VỚI HÌNH ẢNH NỀN SỐNG ĐỘNG */}
          <div
            onMouseEnter={() => setIsHeroHovered(true)}
            onMouseLeave={() => setIsHeroHovered(false)}
            style={{
              backgroundImage: `${heroSlides[activeHeroSlide].overlay}, url('${heroSlides[activeHeroSlide].bgImage}')`,
              backgroundSize: "cover",
              backgroundPosition: "center right",
            }}
            className="col-span-12 lg:col-span-6 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-md border border-white/10 min-h-[340px] transition-all duration-700"
          >
            <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none"></div>
            <div className="absolute -left-10 bottom-0 w-64 h-64 rounded-full bg-amber-400/10 blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="max-w-md">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-emerald-100 text-[11px] font-semibold mb-3 shadow-xs">
                  <span className="material-symbols-outlined text-[14px] text-amber-300">
                    {heroSlides[activeHeroSlide].icon}
                  </span>
                  <span>{heroSlides[activeHeroSlide].badge}</span>
                </div>
                <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-white leading-tight font-editorial whitespace-pre-line drop-shadow-md">
                  {heroSlides[activeHeroSlide].title}
                </h1>
                <p className="text-xs sm:text-[13px] text-white/90 mt-2.5 leading-relaxed max-w-sm drop-shadow-sm font-medium">
                  {heroSlides[activeHeroSlide].desc}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 mt-6">
                <Link
                  href={heroSlides[activeHeroSlide].primaryBtn.to}
                  className="px-4 py-2 rounded-xl bg-[#c58f5e] hover:bg-[#b07d4f] text-white text-xs font-bold shadow-md transition-all inline-flex items-center gap-1.5 transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <span>{heroSlides[activeHeroSlide].primaryBtn.text}</span>
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  href={heroSlides[activeHeroSlide].secondaryBtn.to}
                  className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md border border-white/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                >
                  {heroSlides[activeHeroSlide].secondaryBtn.text}
                </Link>
              </div>
            </div>

            {/* Slider Controls & Pagination Dots */}
            <div className="relative z-10 pt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {heroSlides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    onClick={() => setActiveHeroSlide(idx)}
                    className={`transition-all rounded-full cursor-pointer ${
                      activeHeroSlide === idx
                        ? "w-6 h-1.5 bg-white shadow-xs"
                        : "w-1.5 h-1.5 bg-white/40 hover:bg-white/80"
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setActiveHeroSlide(
                      (prev) =>
                        (prev - 1 + heroSlides.length) % heroSlides.length,
                    )
                  }
                  className="w-6 h-6 rounded-full bg-black/25 hover:bg-black/40 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                  aria-label="Previous slide"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    chevron_left
                  </span>
                </button>
                <button
                  onClick={() =>
                    setActiveHeroSlide((prev) => (prev + 1) % heroSlides.length)
                  }
                  className="w-6 h-6 rounded-full bg-black/25 hover:bg-black/40 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                  aria-label="Next slide"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* 1.3 CỘT PHẢI: 2 BANNER PHỤ */}
          <div className="col-span-12 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
            <Link
              href="/books?filter=best-sellers"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(255, 248, 240, 0.96) 0%, rgba(255, 248, 240, 0.88) 55%, rgba(255, 248, 240, 0.25) 100%), url('/banners/sub-atomic.jpg')`,
                backgroundSize: "cover",
                backgroundPosition: "center right",
              }}
              className="flex-1 rounded-2xl p-4.5 border border-[#E8E0D7] text-[#17201F] relative overflow-hidden flex flex-col justify-between shadow-2xs group cursor-pointer hover:shadow-md transition-all min-h-[160px]"
            >
              <div className="relative z-10 max-w-[210px]">
                <span className="bg-[#ac2c19] text-white text-[9.5px] uppercase font-bold px-2 py-0.5 rounded-md shadow-xs">
                  TOP 1 BÁN CHẠY
                </span>
                <h3 className="text-[15px] font-bold mt-1.5 leading-snug group-hover:text-[#003B2B] transition-colors font-editorial">
                  Đọc Sách Mỗi Ngày
                </h3>
                <p className="text-[11px] text-[#5A6065] mt-0.5 line-clamp-2 font-medium">
                  Tuyển chọn sách kỹ năng &amp; tư duy ưu đãi 25%.
                </p>
              </div>

              <div className="relative z-10 mt-2 flex items-center gap-1 text-[12px] font-bold text-[#003B2B] group-hover:translate-x-1 transition-transform">
                <span>Xem ngay</span>
                <span className="material-symbols-outlined text-[15px]">
                  arrow_forward
                </span>
              </div>
            </Link>

            <Link
              href="/books?format=hybrid"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(235, 248, 244, 0.96) 0%, rgba(235, 248, 244, 0.88) 55%, rgba(235, 248, 244, 0.25) 100%), url('/banners/sub-hybrid.jpg')`,
                backgroundSize: "cover",
                backgroundPosition: "center right",
              }}
              className="flex-1 rounded-2xl p-4.5 border border-[#C5E4DB] text-[#17201F] relative overflow-hidden flex flex-col justify-between shadow-2xs group cursor-pointer hover:shadow-md transition-all min-h-[160px]"
            >
              <div className="relative z-10 max-w-[210px]">
                <span className="bg-[#003B2B] text-white text-[9.5px] uppercase font-bold px-2 py-0.5 rounded-md shadow-xs">
                  COMBO HYBRID
                </span>
                <h3 className="text-[15px] font-bold mt-1.5 leading-snug group-hover:text-[#003B2B] transition-colors font-editorial">
                  Sách In Tặng Ebook
                </h3>
                <p className="text-[11px] text-[#5A6065] mt-0.5 line-clamp-2 font-medium">
                  Tiết kiệm đến 35% khi mua trọn bộ ấn phẩm độc quyền.
                </p>
              </div>

              <div className="relative z-10 mt-2 flex items-center gap-1 text-[12px] font-bold text-[#003B2B] group-hover:translate-x-1 transition-transform">
                <span>Xem ngay</span>
                <span className="material-symbols-outlined text-[15px]">
                  arrow_forward
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* 4 CAM KẾT VÀNG */}
        <div className="w-full bg-white rounded-2xl p-4 border border-[#E8E5DF] grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100">
              <span className="material-symbols-outlined text-[20px]">
                verified_user
              </span>
            </div>
            <div>
              <div className="font-bold text-[#17201F]">Sản phẩm chính hãng</div>
              <div className="text-[11px] text-[#6B7280]">Cam kết chất lượng 100%</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center shrink-0 border border-blue-100">
              <span className="material-symbols-outlined text-[20px]">
                local_shipping
              </span>
            </div>
            <div>
              <div className="font-bold text-[#17201F]">Giao nhanh 2 giờ</div>
              <div className="text-[11px] text-[#6B7280]">Nội thành HN &amp; TP.HCM</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 border border-amber-100">
              <span className="material-symbols-outlined text-[20px]">cached</span>
            </div>
            <div>
              <div className="font-bold text-[#17201F]">Đổi trả dễ dàng</div>
              <div className="text-[11px] text-[#6B7280]">Trong vòng 7 ngày</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-800 flex items-center justify-center shrink-0 border border-rose-100">
              <span className="material-symbols-outlined text-[20px]">favorite</span>
            </div>
            <div>
              <div className="font-bold text-[#17201F]">Tư vấn tận tâm</div>
              <div className="text-[11px] text-[#6B7280]">Hỗ trợ độc giả 24/7</div>
            </div>
          </div>
        </div>

        {/* 8 BUBBLE DANH MỤC TRÒN */}
        <div className="w-full bg-white rounded-2xl p-4 sm:p-5 border border-[#E8E5DF] shadow-2xs">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
            {[
              {
                name: "Văn học",
                image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=300&q=80",
                link: "/books?category=van-hoc",
              },
              {
                name: "Kinh tế",
                image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=300&q=80",
                link: "/books?category=kinh-te",
              },
              {
                name: "Kỹ năng sống",
                image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80",
                link: "/books?category=ky-nang",
              },
              {
                name: "Ebook DRM",
                image: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80",
                link: "/books?format=ebook",
              },
              {
                name: "Combo Hybrid",
                image: "/banners/sub-hybrid.jpg",
                link: "/books?format=hybrid",
              },
              {
                name: "Thiếu nhi",
                image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=300&q=80",
                link: "/books?category=thieu-nhi",
              },
              {
                name: "Công nghệ & AI",
                image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80",
                link: "/books?category=cong-nghe",
              },
              {
                name: "Manga - Comic",
                image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=300&q=80",
                link: "/books?category=manga",
              },
            ].map((bubble, i) => (
              <Link
                key={i}
                href={bubble.link}
                className="flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-emerald-100/80 p-0.5 shadow-xs group-hover:scale-110 group-hover:border-emerald-600 group-hover:shadow-md transition-all mb-2 bg-[#FAF8F5]">
                  <img
                    src={bubble.image}
                    alt={bubble.name}
                    className="w-full h-full object-cover rounded-full"
                    loading="lazy"
                  />
                </div>
                <span className="text-[11.5px] sm:text-xs font-semibold text-gray-800 group-hover:text-[#003B2B] transition-colors leading-tight">
                  {bubble.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: DẢI GOM MÃ GIẢM GIÁ 1-CHẠM (VOUCHER STRIP)
      ========================================================================= */}
      <section className="bg-emerald-900/5 rounded-2xl p-3.5 sm:p-4 border border-emerald-900/10">
        {/* Flash Sale Banner Card inside Voucher Section when LIVE */}
        {isPlatformLive && activeFlashSale && (
          <Link
            href="/flash-sale"
            className="mb-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 rounded-2xl p-3.5 sm:p-4 text-white shadow-md hover:shadow-xl hover:scale-[1.006] transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5 border border-rose-300/40 relative overflow-hidden group cursor-pointer"
          >
            <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-yellow-400/20 blur-2xl pointer-events-none group-hover:scale-125 transition-transform"></div>
            
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 text-white shadow-inner">
                <span className="material-symbols-outlined text-2xl sm:text-3xl animate-bounce">bolt</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-white text-rose-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs tracking-wider">
                    ⚡ FLASH SALE SÀN HUKI
                  </span>
                  <span className="text-amber-200 text-xs font-bold font-mono">
                    Trợ giá độc quyền tới {activeFlashSale.discountPercent || 30}%
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black mt-1 font-editorial tracking-tight text-white line-clamp-1">
                  {activeFlashSale.name}
                </h3>
                <p className="text-[11.5px] text-rose-100 line-clamp-1 mt-0.5 font-medium">
                  {activeFlashSale.description || "Hàng trăm đầu sách tuyển chọn đang được trợ giá trực tiếp từ Sàn HUKI. Số lượng có hạn!"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 shrink-0 relative z-10 self-start md:self-auto">
              <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20">
                <span className="text-[11px] text-rose-100 font-semibold mr-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-amber-300">timer</span>
                  <span>Kết thúc sau:</span>
                </span>
                <div className="flex items-center gap-1 font-mono font-black text-xs sm:text-sm">
                  <span className="bg-white text-rose-700 px-1.5 py-0.5 rounded shadow-xs">
                    {flashCountdown.hours}
                  </span>
                  <span className="text-white">:</span>
                  <span className="bg-white text-rose-700 px-1.5 py-0.5 rounded shadow-xs">
                    {flashCountdown.minutes}
                  </span>
                  <span className="text-white">:</span>
                  <span className="bg-white text-rose-700 px-1.5 py-0.5 rounded shadow-xs">
                    {flashCountdown.seconds}
                  </span>
                </div>
              </div>

              <div className="bg-white text-rose-700 group-hover:bg-amber-300 group-hover:text-rose-950 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1 shadow-md transition-all">
                <span>Săn Deal Ngay</span>
                <span className="material-symbols-outlined text-sm font-bold group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
              </div>
            </div>
          </Link>
        )}

        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ac2c19] text-[20px]">
              confirmation_number
            </span>
            <h2 className="text-[14px] sm:text-[15px] font-bold text-gray-900">
              Mã Giảm Giá &amp; Ưu Đãi Hôm Nay
            </h2>
            <span className="text-[11px] text-gray-500 hidden sm:inline">
              • Thu thập mã trước khi mua sắm
            </span>
          </div>
          <span className="text-[12px] text-[#003B2B] font-semibold">
            Tự động áp dụng khi thanh toán
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {voucherList.map((v) => {
            const isSaved = savedVouchers.includes(v.code);
            const isMock = v.isMock;

            return (
              <div
                key={v.code}
                className={`rounded-xl p-2.5 border flex items-center justify-between gap-2 shadow-2xs transition-all ${
                  isMock
                    ? "bg-gray-100/60 border-dashed border-gray-300 opacity-65"
                    : "bg-white border-dashed border-emerald-700/20 hover:border-[#ac2c19]/60 shadow-2xs"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isMock ? 'bg-gray-200 text-gray-500' : 'bg-rose-50 text-[#ac2c19]'}`}>
                    <span className="material-symbols-outlined text-[18px]">
                      {v.icon}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[12px] font-bold ${isMock ? 'text-gray-600' : 'text-[#ac2c19]'}`}>
                        {v.badge}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1 py-0.2 rounded border border-gray-200/60">
                        {v.code}
                      </span>
                      {isMock && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-gray-200 text-gray-500 font-bold uppercase">
                          Sắp mở
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-800 font-medium truncate mt-0.5">
                      {v.title}
                    </p>
                    <span className="text-[9.5px] text-gray-400 block truncate">
                      {v.condition}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isMock}
                  onClick={() => !isMock && handleSaveVoucher(v.code)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all ${
                    isMock
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed select-none"
                      : isSaved
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                        : "bg-[#ac2c19] text-white hover:bg-[#8e2414] shadow-2xs cursor-pointer"
                  }`}
                >
                  {isMock ? "Chưa mở" : isSaved ? "Đã lưu" : "Lưu mã"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: HUKI DEAL HÔM NAY (FLASH SALE)
      ========================================================================= */}
      <section className="bg-[#FAF3EE] rounded-3xl p-4 sm:p-6 border border-[#EADBCE] shadow-2xs flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8D6C4]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#ac2c19] text-white px-3.5 py-1.5 rounded-xl font-editorial font-bold text-sm sm:text-base tracking-wide flex items-center gap-1.5 shadow-xs">
              <span className="material-symbols-outlined text-[18px]">
                local_fire_department
              </span>
              <span>HUKI DEAL HÔM NAY</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[#59413C] font-semibold">
              <span>Kết thúc sau:</span>
              <span className="bg-[#17201F] text-white px-2 py-1 rounded-lg text-xs font-mono font-bold">
                {flashCountdown.hours}
              </span>
              <span>:</span>
              <span className="bg-[#17201F] text-white px-2 py-1 rounded-lg text-xs font-mono font-bold">
                {flashCountdown.minutes}
              </span>
              <span>:</span>
              <span className="bg-[#17201F] text-white px-2 py-1 rounded-lg text-xs font-mono font-bold">
                {flashCountdown.seconds}
              </span>
            </div>
          </div>

          <Link
            href="/books?filter=flash-sale"
            className="text-xs text-[#ac2c19] hover:underline font-bold flex items-center gap-0.5"
          >
            <span>Xem tất cả ưu đãi</span>
            <span className="material-symbols-outlined text-[16px]">
              arrow_forward
            </span>
          </Link>
        </div>

        {/* 6 Compact Flash Sale Items */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {allFlashSale.slice(0, 6).map((book) => (
            <BookCard
              key={book.id}
              book={{
                ...book,
                format: "Sách Giấy",
                formatType: "physical",
              }}
              variant="compact"
            />
          ))}
        </div>
      </section>

      {/* =========================================================================
          PERSONALIZED RECOMMENDATIONS (For You)
      ========================================================================= */}
      <PersonalizedForYouSection limit={10} />

      {/* =========================================================================
          SECTION 4: SẢN PHẨM BÁN CHẠY (BESTSELLERS)
      ========================================================================= */}
      <section className="flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-[24px]">
              emoji_events
            </span>
            <div>
              <h2 className="font-editorial text-lg sm:text-xl font-bold text-[#17201F]">
                Bảng Xếp Hạng Sách Bán Chạy
              </h2>
            </div>
          </div>

          {/* Pill Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "all", label: "Tất cả" },
              { id: "paper", label: "Sách Giấy" },
              { id: "ebook", label: "Ebook Bản Quyền" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setBestsellerTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  bestsellerTab === tab.id
                    ? "bg-[#003B2B] text-white shadow-xs"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 6 Compact Bestseller Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {filteredBestsellers.slice(0, 6).map((book) => (
            <BookCard
              key={book.id}
              book={{
                ...book,
                format: book.format,
                formatType: book.formatType,
              }}
              variant="compact"
            />
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: GIAN HÀNG NXB & ĐỐI TÁC CHÍNH HÃNG
      ========================================================================= */}
      <section className="bg-gray-50/70 rounded-2xl p-4 sm:p-5 border border-gray-200/80 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#003B2B] text-[22px]">
              storefront
            </span>
            <div>
              <h2 className="text-[15px] sm:text-[16px] font-bold text-gray-900">
                Gian Hàng NXB &amp; Đối Tác Chính Hãng
              </h2>
              <p className="text-[11px] text-gray-500">
                100% sách thật bản quyền, phân phối trực tiếp từ nhà xuất bản
              </p>
            </div>
          </div>

          <Link
            href="/stores?tab=publishers"
            className="text-[12.5px] text-[#003B2B] hover:underline font-semibold flex items-center gap-0.5"
          >
            <span>Xem tất cả cửa hàng</span>
            <span className="material-symbols-outlined text-[16px]">
              chevron_right
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {officialStores.map((store) => {
            const isFollowed = followedShops.includes(store.name);
            const storeSlug = store.name.toLowerCase().includes("trẻ")
              ? "nxb-tre"
              : store.name.toLowerCase().includes("nam")
                ? "nha-nam"
                : store.name.toLowerCase().includes("đồng")
                  ? "nxb-kim-dong"
                  : store.name.toLowerCase().includes("alpha")
                    ? "alpha-books"
                    : "first-news";
            return (
              <div
                key={store.id}
                className="bg-white rounded-xl p-3 border border-gray-200/80 flex flex-col justify-between hover:border-[#003B2B]/50 hover:shadow-sm transition-all group"
              >
                <Link
                  href={`/shop/${storeSlug}`}
                  className="flex items-center gap-2.5"
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${store.color} flex items-center justify-center font-bold text-[13px] shadow-xs shrink-0 group-hover:scale-105 transition-transform`}
                  >
                    {store.code}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <h4 className="text-[12.5px] font-bold text-gray-900 truncate group-hover:text-[#003B2B] transition-colors">
                        {store.name}
                      </h4>
                      <span className="material-symbols-outlined text-[14px] text-[#003B2B] shrink-0">
                        verified
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 block">
                      {store.followers}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={() => handleToggleShopFollow(store.name)}
                  className={`mt-3 w-full py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    isFollowed
                      ? "bg-[#003B2B] text-white"
                      : "bg-gray-100 text-[#003B2B] hover:bg-[#003B2B] hover:text-white"
                  }`}
                >
                  {isFollowed ? "✓ Đang theo dõi" : "+ Theo dõi"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: VĂN HỌC & TIỂU THUYẾT NỔI BẬT (6 SÁCH)
      ========================================================================= */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-1 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600 text-[22px]">
              auto_stories
            </span>
            <div>
              <h2 className="text-[15px] sm:text-[16px] font-bold text-gray-900">
                Văn Học &amp; Tiểu Thuyết Hay
              </h2>
              <p className="text-[11px] text-gray-500">
                Những áng văn kinh điển và tác phẩm văn học đương đại sâu sắc
              </p>
            </div>
          </div>

          <Link
            href="/books?category=van-hoc"
            className="text-[12.5px] text-[#003B2B] hover:underline font-semibold flex items-center gap-0.5"
          >
            <span>Xem thêm</span>
            <span className="material-symbols-outlined text-[16px]">
              chevron_right
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {literatureBooks.map((book) => (
            <BookCard key={book.id} book={book} variant="compact" />
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: KINH DOANH, ĐẦU TƯ & TÀI CHÍNH (6 SÁCH)
      ========================================================================= */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-1 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-[22px]">
              trending_up
            </span>
            <div>
              <h2 className="text-[15px] sm:text-[16px] font-bold text-gray-900">
                Kinh Tế &amp; Đầu Tư Tài Chính
              </h2>
              <p className="text-[11px] text-gray-500">
                Kiến thức quản trị, đầu tư bền vững và tư duy làm giàu thực chiến
              </p>
            </div>
          </div>

          <Link
            href="/books?category=kinh-te"
            className="text-[12.5px] text-[#003B2B] hover:underline font-semibold flex items-center gap-0.5"
          >
            <span>Xem thêm</span>
            <span className="material-symbols-outlined text-[16px]">
              chevron_right
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {businessBooks.map((book) => (
            <BookCard key={book.id} book={book} variant="compact" />
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 8: CÔNG NGHỆ & TRÍ TUỆ NHÂN TẠO AI 2026 (6 SÁCH)
      ========================================================================= */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-1 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-600 text-[22px]">
              smart_toy
            </span>
            <div>
              <h2 className="text-[15px] sm:text-[16px] font-bold text-gray-900">
                Công Nghệ &amp; Trí Tuệ Nhân Tạo AI 2026
              </h2>
              <p className="text-[11px] text-gray-500">
                Đón đầu xu hướng chuyển đổi số, dữ liệu và công nghệ tương lai
              </p>
            </div>
          </div>

          <Link
            href="/books?category=cong-nghe"
            className="text-[12.5px] text-[#003B2B] hover:underline font-semibold flex items-center gap-0.5"
          >
            <span>Xem thêm</span>
            <span className="material-symbols-outlined text-[16px]">
              chevron_right
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {techBooks.map((book) => (
            <BookCard key={book.id} book={book} variant="compact" />
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 9: EBOOK & ĐỌC ONLINE BẢN QUYỀN (6 SÁCH)
      ========================================================================= */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-1 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-600 text-[22px]">
              devices
            </span>
            <div>
              <h2 className="text-[15px] sm:text-[16px] font-bold text-gray-900">
                Tủ Sách Ebook DRM Độc Quyền
              </h2>
              <p className="text-[11px] text-gray-500">
                Đọc tức thì trong 10 giây trên trình đọc WebReader độc quyền
              </p>
            </div>
          </div>

          <Link
            href="/books?format=ebook"
            className="text-[12.5px] text-[#003B2B] hover:underline font-semibold flex items-center gap-0.5"
          >
            <span>Xem tất cả Ebook</span>
            <span className="material-symbols-outlined text-[16px]">
              chevron_right
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {ebookShelfBooks.map((ebook) => (
            <BookCard
              key={ebook.id}
              book={{
                ...ebook,
                format: "Ebook DRM",
                formatType: "ebook",
              }}
              variant="compact"
            />
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 10: COMBO SÁCH HYBRID & HỘP QUÀ TRI THỨC (TIẾT KIỆM 30%)
      ========================================================================= */}
      <section className="bg-gray-50/60 rounded-2xl p-4 sm:p-5 border border-gray-200/80 flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#003B2B] text-[22px]">
              collections_bookmark
            </span>
            <div>
              <h3 className="text-[15px] sm:text-[16px] font-bold text-gray-900">
                Combo Sách Hybrid – Tiết Kiệm Đến 35%
              </h3>
              <p className="text-[11px] text-gray-500">
                Mua theo bộ ấn phẩm tinh hoa, đóng gói hộp quà sang trọng kèm mã đọc Ebook tức thì
              </p>
            </div>
          </div>
          <span className="bg-[#003B2B] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase hidden sm:inline">
            HỘP QUÀ TRI THỨC
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {/* Combo 1 */}
          <div className="bg-white rounded-xl p-4 border border-gray-200/80 flex flex-col sm:flex-row gap-4 items-center hover:border-[#003B2B]/40 transition-all">
            <div className="w-[160px] h-[130px] relative shrink-0 flex items-center justify-center">
              <div className="w-[75px] h-[110px] rounded shadow absolute left-2 transform -rotate-12 border border-gray-200 overflow-hidden">
                <img
                  className="w-full h-full object-cover"
                  alt="Tư Duy Đột Phá"
                  src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80"
                />
              </div>
              <div className="w-[80px] h-[115px] rounded shadow-md relative z-10 border border-gray-200 overflow-hidden">
                <img
                  className="w-full h-full object-cover"
                  alt="Tư Duy Phản Biện"
                  src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80"
                />
              </div>
              <div className="w-[75px] h-[110px] rounded shadow absolute right-2 transform rotate-12 border border-gray-200 overflow-hidden">
                <img
                  className="w-full h-full object-cover"
                  alt="Trực Giác"
                  src="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=300&q=80"
                />
              </div>
            </div>

            <div className="flex flex-col justify-between flex-1 min-w-0 w-full gap-2">
              <div>
                <span className="bg-emerald-50 text-[#003B2B] text-[10px] font-bold px-2 py-0.5 rounded inline-block border border-emerald-200">
                  Combo 3 cuốn - Tiết kiệm 135.000₫
                </span>
                <h4 className="text-[13.5px] font-bold text-gray-900 mt-1 line-clamp-2 leading-snug">
                  Bộ Sách Rèn Luyện Tư Duy Sắc Bén &amp; Quyết Định Đúng Đắn
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                  Gồm: Tư Duy Nhanh &amp; Chậm + Nghệ Thuật Rành Mạch + Rèn Luyện Trí Não
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[15px] font-bold text-[#ac2c19]">
                    315.000₫
                  </span>
                  <span className="text-[11px] text-gray-400 line-through ml-1.5">
                    450.000₫
                  </span>
                </div>
                <button
                  onClick={() => {
                    addToCart(
                      {
                        id: "combo-tu-duy",
                        title: "Bộ Sách Rèn Luyện Tư Duy Sắc Bén (Combo 3 cuốn)",
                        price: 315000,
                        originalPricePaper: 450000,
                      },
                      "paper",
                      1,
                    );
                    showToast("Đã thêm Combo Tư Duy vào giỏ hàng!", "success");
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#003B2B] text-white text-[11.5px] font-bold hover:bg-[#00241A] transition-colors cursor-pointer shadow-2xs"
                >
                  Mua Combo Ngay
                </button>
              </div>
            </div>
          </div>

          {/* Combo 2 */}
          <div className="bg-white rounded-xl p-4 border border-gray-200/80 flex flex-col sm:flex-row gap-4 items-center hover:border-[#003B2B]/40 transition-all">
            <div className="w-[160px] h-[130px] relative shrink-0 flex items-center justify-center">
              <div className="w-[75px] h-[110px] rounded shadow absolute left-2 transform -rotate-12 border border-gray-200 overflow-hidden">
                <img
                  className="w-full h-full object-cover"
                  alt="Nhà Đầu Tư"
                  src="https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=300&q=80"
                />
              </div>
              <div className="w-[80px] h-[115px] rounded shadow-md relative z-10 border border-gray-200 overflow-hidden">
                <img
                  className="w-full h-full object-cover"
                  alt="Tâm Lý Học Về Tiền"
                  src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=300&q=80"
                />
              </div>
              <div className="w-[75px] h-[110px] rounded shadow absolute right-2 transform rotate-12 border border-gray-200 overflow-hidden">
                <img
                  className="w-full h-full object-cover"
                  alt="Bước Đi Ngẫu Nhiên"
                  src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80"
                />
              </div>
            </div>

            <div className="flex flex-col justify-between flex-1 min-w-0 w-full gap-2">
              <div>
                <span className="bg-emerald-50 text-[#003B2B] text-[10px] font-bold px-2 py-0.5 rounded inline-block border border-emerald-200">
                  Combo 3 cuốn - Tiết kiệm 168.000₫
                </span>
                <h4 className="text-[13.5px] font-bold text-gray-900 mt-1 line-clamp-2 leading-snug">
                  Bộ Cẩm Nang Tự Do Tài Chính &amp; Đầu Tư Bền Vững
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                  Gồm: Tâm Lý Học Về Tiền + Nhà Đầu Tư Thông Minh + Bước Đi Ngẫu Nhiên
                </p>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[15px] font-bold text-[#ac2c19]">
                    392.000₫
                  </span>
                  <span className="text-[11px] text-gray-400 line-through ml-1.5">
                    560.000₫
                  </span>
                </div>
                <button
                  onClick={() => {
                    addToCart(
                      {
                        id: "combo-tai-chinh",
                        title: "Bộ Cẩm Nang Tự Do Tài Chính (Combo 3 cuốn)",
                        price: 392000,
                        originalPricePaper: 560000,
                      },
                      "paper",
                      1,
                    );
                    showToast("Đã thêm Combo Tài Chính vào giỏ hàng!", "success");
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#003B2B] text-white text-[11.5px] font-bold hover:bg-[#00241A] transition-colors cursor-pointer shadow-2xs"
                >
                  Mua Combo Ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 11: GỢI Ý HÔM NAY (CHUẨN SHOPEE - 24 CUỐN SÁCH COMPACT + XEM THÊM)
      ========================================================================= */}
      <section className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200/90 shadow-xs flex flex-col gap-4">
        {/* Shopee-style Header Tab */}
        <div className="border-b-2 border-red-500 pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ac2c19] text-xl">
              recommend
            </span>
            <h2 className="text-sm sm:text-base font-bold text-[#ac2c19] uppercase tracking-wider">
              GỢI Ý HÔM NAY
            </h2>
          </div>
          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            Khám phá tuyển tập sách hay dành riêng cho bạn
          </span>
        </div>

        {/* 24 Items Grid (4 rows x 6 cols) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {suggestedBooks.map((book) => (
            <BookCard
              key={book.id}
              book={{
                ...book,
                format: book.format === "DIGITAL" ? "Ebook DRM" : "Sách giấy",
                formatType: book.format === "DIGITAL" ? "ebook" : "physical",
              }}
              variant="compact"
            />
          ))}
        </div>

        {/* Xem Thêm Button (Redirect to /books) */}
        <div className="pt-4 flex justify-center">
          <button
            type="button"
            onClick={() => router.push('/books')}
            className="px-12 py-2.5 rounded-xl border-2 border-[#003B2B] text-[#003B2B] hover:bg-[#003B2B] hover:text-white transition-all text-xs sm:text-sm font-bold shadow-2xs flex items-center gap-2 cursor-pointer group"
          >
            <span>Xem Thêm Tất Cả Sách</span>
            <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </button>
        </div>
      </section>

      {/* =========================================================================
          SECTION 12: TÁC GIẢ ĐƯỢC YÊU THÍCH (AUTHORS SLIDER)
      ========================================================================= */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <div>
            <h3 className="text-[15px] sm:text-[16px] font-bold text-gray-900">
              Tác Giả Được Yêu Thích
            </h3>
            <p className="text-[11px] text-gray-500">
              Theo dõi tác giả để nhận thông báo tác phẩm mới và giao lưu trực tuyến
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/stores?tab=authors"
              className="text-[12.5px] text-[#003B2B] hover:underline font-semibold flex items-center gap-0.5"
            >
              <span>Xem tất cả tác giả</span>
              <span className="material-symbols-outlined text-[16px]">
                chevron_right
              </span>
            </Link>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevAuthor}
                className="w-7 h-7 rounded-full border border-gray-300 hover:bg-[#003B2B] hover:text-white flex items-center justify-center transition-colors cursor-pointer text-gray-700"
                title="Tác giả trước"
                aria-label="Tác giả trước"
              >
                <span className="material-symbols-outlined text-[16px]">
                  chevron_left
                </span>
              </button>
              <button
                onClick={handleNextAuthor}
                className="w-7 h-7 rounded-full border border-gray-300 hover:bg-[#003B2B] hover:text-white flex items-center justify-center transition-colors cursor-pointer text-gray-700"
                title="Tác giả tiếp theo"
                aria-label="Tác giả tiếp theo"
              >
                <span className="material-symbols-outlined text-[16px]">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </div>

        <div
          className="overflow-hidden w-full py-1"
          onMouseEnter={() => setIsAuthorHovered(true)}
          onMouseLeave={() => setIsAuthorHovered(false)}
        >
          <div
            className="flex transition-transform duration-500 ease-in-out gap-3"
            style={{
              transform: `translateX(calc(-${authorIndex} * (100% + 0.75rem) / ${itemsPerPage}))`,
            }}
          >
            {authorsList.map((author, idx) => {
              const isFollowing = followedAuthors.includes(author.name);
              return (
                <div
                  key={`${author.name}-${idx}`}
                  className="shrink-0 w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-2*0.75rem)/3)] lg:w-[calc((100%-4*0.75rem)/5)] bg-white rounded-xl p-3 border border-gray-200 flex flex-col items-center text-center hover:border-[#003B2B]/40 transition-all justify-between"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-full overflow-hidden mb-2 ring-2 ring-[#003B2B]/20 shrink-0">
                      <img
                        className="w-full h-full object-cover"
                        alt={author.name}
                        src={author.avatar}
                        loading="lazy"
                      />
                    </div>
                    <h4
                      className="text-[12.5px] font-semibold text-gray-900 line-clamp-1 truncate"
                      title={author.name}
                    >
                      {author.name}
                    </h4>
                    <span className="text-[10.5px] text-gray-500 mt-0.5">
                      {author.books}
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleAuthorFollow(author.name)}
                    className={`mt-2.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer w-full ${
                      isFollowing
                        ? "bg-[#003B2B] text-white"
                        : "bg-gray-100 hover:bg-[#003B2B] hover:text-white text-[#003B2B]"
                    }`}
                  >
                    {isFollowing ? "✓ Đang theo dõi" : "+ Theo dõi"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 13: ĐÁNH GIÁ THỰC TẾ TỪ NGƯỜI MUA
      ========================================================================= */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-1.5 text-[#003B2B] text-[11px] uppercase font-bold">
              <span className="material-symbols-outlined text-[16px]">
                verified
              </span>{" "}
              Đánh Giá Thực Tế Từ Người Mua
            </div>
            <h3 className="text-[15px] sm:text-[16px] font-bold text-gray-900 mt-0.5">
              Cảm Nhận Từ Độc Giả Đã Mua Sách
            </h3>
          </div>
          <Link
            href="/books"
            className="text-[12.5px] text-[#003B2B] hover:underline font-semibold flex items-center gap-0.5"
          >
            <span>Xem sách đánh giá cao</span>
            <span className="material-symbols-outlined text-[16px]">
              chevron_right
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {[
            {
              name: "Lê Phương Thảo",
              activity: "Vừa đọc xong cuốn 'Atomic Habits'",
              avatar:
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
              quote:
                "Cuốn sách đã thay đổi hoàn toàn cách mình nhìn nhận về mục tiêu. Đừng tập trung vào đích đến, hãy kiến tạo một hệ thống hành vi tí hon mỗi ngày...",
              likes: 142,
              comments: 28,
            },
            {
              name: "Trần Hoàng Long",
              activity: "Review cuốn 'Tâm Lý Học Về Tiền'",
              avatar:
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
              quote:
                "Cách tác giả phân tích về lòng tham và sự đủ đầy thực sự là một cú tát thức tỉnh. Đọc chậm từng chương trên HUKI Reader ban đêm rất thấm!",
              likes: 98,
              comments: 16,
            },
            {
              name: "Nguyễn Minh Anh",
              activity: "Khởi động Thử Thách Đọc 2026",
              avatar:
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
              quote:
                "Mục tiêu 35 cuốn năm nay đã hoàn thành cuốn số 4 rồi cả nhà ơi! Đọc sách trên HUKI DRM rất sắc nét và highlight cực tiện.",
              likes: 210,
              comments: 42,
            },
          ].map((rev, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl p-3.5 border border-gray-200/90 flex flex-col justify-between hover:border-[#003B2B]/40 transition-all shadow-2xs"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 shrink-0">
                    <img
                      className="w-full h-full object-cover"
                      alt={rev.name}
                      src={rev.avatar}
                      loading="lazy"
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[12.5px] font-bold text-gray-900 truncate">
                      {rev.name}
                    </h4>
                    <span className="text-[10px] text-gray-500 block truncate">
                      {rev.activity}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 text-amber-400 mb-1.5">
                  <span className="material-symbols-outlined text-[13px]">star</span>
                  <span className="material-symbols-outlined text-[13px]">star</span>
                  <span className="material-symbols-outlined text-[13px]">star</span>
                  <span className="material-symbols-outlined text-[13px]">star</span>
                  <span className="material-symbols-outlined text-[13px]">star</span>
                </div>

                <p className="text-[12px] text-gray-700 leading-relaxed italic">
                  &ldquo;{rev.quote}&rdquo;
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-gray-500 text-[11px]">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1 hover:text-rose-600 cursor-pointer">
                    <span className="material-symbols-outlined text-[14px]">
                      favorite
                    </span>{" "}
                    {rev.likes}
                  </span>
                  <span className="flex items-center gap-1 hover:text-[#003B2B] cursor-pointer">
                    <span className="material-symbols-outlined text-[14px]">
                      chat_bubble
                    </span>{" "}
                    {rev.comments}
                  </span>
                </div>
                <Link
                  href="/books"
                  className="text-[#003B2B] hover:underline font-semibold flex items-center gap-0.5"
                >
                  <span>Khám phá sách</span>
                  <span className="material-symbols-outlined text-[12px]">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 14: BANNER TUYỂN DỤNG SELLER / NXB
      ========================================================================= */}
      <section className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-2xl p-5 sm:p-7 text-white border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px]">
              storefront
            </span>
          </div>
          <div>
            <span className="bg-emerald-400/20 text-emerald-300 text-[10.5px] uppercase font-bold px-2 py-0.5 rounded">
              DÀNH CHO TÁC GIẢ &amp; NHÀ SÁCH
            </span>
            <h3 className="text-[17px] sm:text-[19px] font-bold text-white mt-1">
              Trở Thành Người Bán Trên HUKI EBOOK
            </h3>
            <p className="text-[12px] text-white/80 mt-0.5 max-w-xl">
              Dễ dàng mở gian hàng phân phối Sách Giấy &amp; Ebook có bảo vệ bản
              quyền DRM. Tiếp cận hơn 250.000 độc giả trung thành.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-emerald-200">
              <span>✔ Miễn phí mở shop</span>
              <span>•</span>
              <span>✔ Bảo vệ DRM chống sao chép</span>
              <span>•</span>
              <span>✔ Rút tiền linh hoạt 24/7</span>
            </div>
          </div>
        </div>

        <Link
          href="/seller/register"
          className="px-5 py-2.5 rounded-xl bg-[#c58f5e] hover:bg-[#b07d4f] text-white text-[13px] font-bold transition-all shrink-0 shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <span>Đăng ký bán hàng ngay</span>
          <span className="material-symbols-outlined text-[16px]">
            arrow_forward
          </span>
        </Link>
      </section>

      {/* =========================================================================
          SECTION 15: TRỢ LÝ AI GỢI Ý SÁCH & BẢN TIN ƯU ĐÃI
      ========================================================================= */}
      <section className="bg-white rounded-2xl p-6 sm:p-7 border border-emerald-900/10 shadow-2xs flex flex-col items-center gap-3 text-center">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#003B2B] flex items-center justify-center">
          <span className="material-symbols-outlined text-[24px]">
            smart_toy
          </span>
        </div>
        <h3 className="text-[17px] sm:text-[19px] font-bold text-gray-900">
          Chưa Biết Nên Đọc Gì Hôm Nay? Hãy Để HUKI AI Lắng Nghe Bạn
        </h3>
        <p className="text-[12.5px] text-gray-500 max-w-lg">
          Nhập tâm trạng, khó khăn hiện tại hay chủ đề bạn tò mò, AI sẽ phân
          tích và gợi ý chính xác cuốn sách dành riêng cho bạn.
        </p>

        <div className="w-full max-w-xl mt-1 bg-gray-50 border border-gray-200 rounded-xl p-1.5 flex flex-col sm:flex-row items-center gap-1.5 focus-within:border-[#003B2B] transition-all">
          <div className="flex-1 flex items-center px-2.5 w-full">
            <span className="material-symbols-outlined text-[#003B2B] text-[18px] mr-2">
              auto_awesome
            </span>
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              className="w-full bg-transparent border-none text-gray-900 text-[12.5px] focus:outline-none"
            />
          </div>
          <button
            onClick={() => {
              showToast(
                "HUKI AI đang phân tích dữ liệu độc giả và gợi ý sách...",
                "info",
              );
              router.push(`/books?q=${encodeURIComponent(aiInput)}`);
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#003B2B] text-white text-[12px] font-semibold hover:bg-[#00241A] flex items-center justify-center gap-1 transition-colors shrink-0 cursor-pointer"
          >
            <span>Gợi ý thông minh</span>
            <span className="material-symbols-outlined text-[16px]">
              magic_button
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-gray-500 mt-1">
          <span>Ví dụ câu hỏi hay:</span>
          <span
            onClick={() => setAiInput("Sách về tâm lý vượt qua trì hoãn")}
            className="bg-gray-100 px-2 py-0.5 rounded-full cursor-pointer hover:text-[#003B2B]"
          >
            &ldquo;Sách vượt qua trì hoãn&rdquo;
          </span>
          <span
            onClick={() => setAiInput("Tiểu thuyết trinh thám ly kỳ cuối tuần")}
            className="bg-gray-100 px-2 py-0.5 rounded-full cursor-pointer hover:text-[#003B2B]"
          >
            &ldquo;Trinh thám ly kỳ&rdquo;
          </span>
          <span
            onClick={() =>
              setAiInput("Sách nhập môn đầu tư chứng khoán cho người mới")
            }
            className="bg-gray-100 px-2 py-0.5 rounded-full cursor-pointer hover:text-[#003B2B]"
          >
            &ldquo;Nhập môn đầu tư&rdquo;
          </span>
        </div>
      </section>

      {/* Newsletter Strip */}
      <section
        style={{
          background:
            "linear-gradient(135deg, var(--theme-hero-from, #00382B) 0%, var(--theme-hero-via, #004D38) 100%)",
        }}
        className="rounded-2xl text-white p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-5 border border-white/15 shadow-sm"
      >
        <div className="max-w-md">
          <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[16px]">mail</span>{" "}
            BẢN TIN SALON VĂN HỌC
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white">
            Nhận Ngay Mã Ưu Đãi 20% Cho Đơn Hàng Đầu Tiên
          </h3>
          <p className="text-[12px] text-white/85 mt-1 leading-relaxed">
            Cập nhật review sách từ các dịch giả uy tín, danh mục sách tặng miễn
            phí và vé tham dự giao lưu tác giả.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newsletterEmail.trim()) {
              showToast(
                `Đã gửi mã giảm 20% tới ${newsletterEmail}! Vui lòng kiểm tra hộp thư.`,
                "success",
              );
              setNewsletterEmail("");
            }
          }}
          className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-2"
        >
          <input
            type="email"
            required
            value={newsletterEmail}
            onChange={(e) => setNewsletterEmail(e.target.value)}
            placeholder="Nhập địa chỉ email của bạn..."
            className="w-full sm:w-[280px] px-3.5 py-2.5 rounded-xl bg-white text-gray-900 text-[13px] focus:outline-none border-none shadow-sm placeholder:text-gray-500"
          />
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#c58f5e] hover:bg-[#b07d4f] text-white text-[13px] font-bold transition-all shrink-0 shadow-sm cursor-pointer"
          >
            Đăng ký ngay
          </button>
        </form>
      </section>
    </div>
  );
}
