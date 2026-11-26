'use client';

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/ui/context/CartContext";
import { useToast } from "@/ui/context/ToastContext";
import { useAuth } from "@/ui/context/AuthContext";
import { catalogApi, type BookData, type CatalogEntity, type CategoryData } from "@/ui/api/catalogApi";
import { flashSaleApi, type FlashSaleSlot, type FlashSaleItem } from "@/ui/api/flashSaleApi";
import { voucherApi } from "@/ui/api/voucherApi";
import { bannerApi } from "@/ui/api/bannerApi";
import { tokenStorage } from "@/ui/api/tokenStorage";
import { reviewApi } from "@/ui/api/reviewApi";
import BookCard from "@/ui/components/common/BookCard";
import UserAvatar from "@/ui/components/common/UserAvatar";
import { selectFeaturedReviews } from "@/ui/utils/featuredReviews";
import { personalizationService } from "@/ui/services/personalizationService";
import { recordBannerClick } from "@/ui/components/admin/AdminMarketingView";

const ADMIN_DEFAULT_BANNERS = [
  {
    id: "BAN-01",
    title: "Tuần Lễ Văn Học Kinh Điển & Tinh Hoa Tri Thức 2026",
    subtitle: "Giảm đến 40% cho tất cả tuyệt tác văn chương thế giới",
    link: "/books?category=van-hoc",
    badge: "ĐẠI HỘI SÁCH",
    bgImage: "/banners/hero-library.jpg",
    status: "active",
  },
  {
    id: "BAN-02",
    title: "Hội Sách Bản Quyền Alpha Books x HUKI",
    subtitle: "Tặng ngay Ebook DRM độc quyền khi đặt trước sách in",
    link: "/shop/alpha-books",
    badge: "ƯU ĐÃI ĐỘC QUYỀN",
    bgImage: "/banners/hero-podium.jpg",
    status: "active",
  },
  {
    id: "BAN-03",
    title: "Kỷ Nguyên Sách Hybrid: Đọc Ngay Khi Chờ Giao",
    subtitle: "Trải nghiệm sách giấy liền tay, đọc số tức thì",
    link: "/books?format=hybrid",
    badge: "TÍNH NĂNG MỚI",
    bgImage: "/banners/sub-hybrid.jpg",
    status: "active",
  },
];

/**
 * Kiểm tra tiêu đề sách hợp lệ cho trang chủ (loại trừ các đầu sách test/rác)
 */
function isValidDisplayBook(book?: any): boolean {
  if (!book || !book.title) return false;
  const t = String(book.title).trim().toLowerCase();
  if (t.startsWith('http://') || t.startsWith('https://')) return false;
  if (t.startsWith('test') || t.startsWith('sadasd') || t.startsWith('ádasdasd') || t.startsWith('ádasd')) return false;
  return true;
}

/**
 * Đảm bảo cân bằng hiển thị giữa các nhà xuất bản trên từng dải sản phẩm
 * Tránh tình trạng 1 NXB độc chiếm toàn bộ các ô hiển thị
 */
function balanceBooksByPublisher<T extends { publisher?: any; storeId?: string; title?: string }>(
  books: T[],
  maxPerPublisher: number = 2,
  limit: number = 6
): T[] {
  if (!books || books.length === 0) return [];

  const validBooks = books.filter(isValidDisplayBook);
  const results: T[] = [];
  const pubCounts: Record<string, number> = {};
  const seenIds = new Set<string>();

  // Pass 1: Lấy các sách tốt nhất nhưng không vượt quá maxPerPublisher trên mỗi NXB
  for (const b of validBooks) {
    if (results.length >= limit) break;
    const rawPub = typeof b.publisher === 'string' ? b.publisher : b.publisher?.name;
    const pubName = (rawPub || 'Gian Hàng HUKI').trim();
    const count = pubCounts[pubName] || 0;
    const bId = (b as any).id || (b as any).bookId;

    if (bId && seenIds.has(bId)) continue;
    if (count >= maxPerPublisher) continue;

    results.push(b);
    if (bId) seenIds.add(bId);
    pubCounts[pubName] = count + 1;
  }

  // Pass 2: Nếu chưa đủ limit (do các NXB khác hết sách), lấy tiếp các sách điểm cao nhất còn lại
  if (results.length < limit) {
    for (const b of validBooks) {
      if (results.length >= limit) break;
      const bId = (b as any).id || (b as any).bookId;
      if (bId && seenIds.has(bId)) continue;

      results.push(b);
      if (bId) seenIds.add(bId);
    }
  }

  return results;
}

export default function HomePage() {
  const router = useRouter();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { user, isLoggedIn } = useAuth();

  // 1. REAL COMMERCE DATA FROM BACKEND DATABASE (SSR/CSR identical initial state to prevent Hydration Mismatch)
  const [realBooks, setRealBooks] = useState<BookData[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState<boolean>(true);
  const [realCategories, setRealCategories] = useState<CategoryData[]>([]);
  const [realPublishers, setRealPublishers] = useState<CatalogEntity[]>([]);
  const [realAuthors, setRealAuthors] = useState<CatalogEntity[]>([]);
  const [realVouchers, setRealVouchers] = useState<any[]>([]);
  const [realReviews, setRealReviews] = useState<any[]>([]);
  const [activeFlashSale, setActiveFlashSale] = useState<FlashSaleSlot | null>(null);
  const [platformSalePhase, setPlatformSalePhase] = useState<'LIVE' | 'TEASER' | 'NONE'>('NONE');
  const [flashSeconds, setFlashSeconds] = useState(0);

  // Hero Slider State
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const [customBanners, setCustomBanners] = useState<any[]>([]);

  // Local Interactivity States (SSR/CSR identical initial state to prevent Hydration Mismatch)
  const [savedVouchers, setSavedVouchers] = useState<string[]>([]);
  const [bestsellerTab, setBestsellerTab] = useState("all");
  const [selectedCategoryTab, setSelectedCategoryTab] = useState("all");
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);

  const handleScrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = direction === 'left' ? -240 : 240;
      tabsContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  const [followedShops, setFollowedShops] = useState<string[]>([]);
  const [followedAuthors, setFollowedAuthors] = useState<string[]>([]);
  const [authorIndex, setAuthorIndex] = useState(0);
  const [isAuthorHovered, setIsAuthorHovered] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [personalizationTick, setPersonalizationTick] = useState(0);

  // Warm fallback from localStorage after initial client mount to avoid SSR Hydration Mismatch
  useEffect(() => {
    try {
      const cached = localStorage.getItem("huki_cached_public_books");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRealBooks((prev) => (prev.length === 0 ? parsed : prev));
          setIsLoadingBooks(false);
        }
      }
    } catch {}

    try {
      const cachedVouchers = localStorage.getItem("huki_saved_voucher_codes");
      if (cachedVouchers) {
        const parsed = JSON.parse(cachedVouchers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedVouchers((prev) => (prev.length === 0 ? parsed : prev));
        }
      }
    } catch {}
  }, []);

  // Fetch Real Books (with exponential backoff retry to guard against cold-start DB latency)
  useEffect(() => {
    let isSubscribed = true;
    const fetchBooksWithRetry = async (attempt = 1) => {
      try {
        const res = await catalogApi.getPublicBooks({ limit: 300 });
        if (!isSubscribed) return;
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setRealBooks(res.data);
          setIsLoadingBooks(false);
          try {
            localStorage.setItem("huki_cached_public_books", JSON.stringify(res.data.slice(0, 150)));
          } catch {}
          return;
        }
        if (attempt < 3 && isSubscribed) {
          setTimeout(() => fetchBooksWithRetry(attempt + 1), attempt * 1200);
        } else if (isSubscribed) {
          setIsLoadingBooks(false);
        }
      } catch (err) {
        if (attempt < 3 && isSubscribed) {
          setTimeout(() => fetchBooksWithRetry(attempt + 1), attempt * 1200);
        } else if (isSubscribed) {
          setIsLoadingBooks(false);
        }
      }
    };
    fetchBooksWithRetry();
    return () => { isSubscribed = false; };
  }, []);

  // Fetch Real Categories, Publishers, Authors
  useEffect(() => {
    // Fetch Real Categories
    catalogApi
      .getCategories()
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setRealCategories(res.data);
        }
      })
      .catch(() => {});

    // Fetch Real Publishers
    catalogApi
      .getPublishers()
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setRealPublishers(res.data);
        }
      })
      .catch(() => {});

    // Fetch Real Authors
    catalogApi
      .getAuthors()
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setRealAuthors(res.data);
        }
      })
      .catch(() => {});

  }, []);

  // Fetch Real Vouchers & User Wallet Vouchers (auto-sync when auth state changes)
  useEffect(() => {
    const hasToken = typeof window !== "undefined" && Boolean(tokenStorage.getAccessToken());

    if (hasToken) {
      voucherApi.getEligibleFeed().then((res) => {
        if (res.success && res.data?.platformVouchers && res.data.platformVouchers.length > 0) {
          setRealVouchers(res.data.platformVouchers);
        } else {
          voucherApi.getPlatformVouchers().then((pRes) => {
            if (pRes.success && Array.isArray(pRes.data)) {
              setRealVouchers(pRes.data);
            }
          }).catch(() => {});
        }
      }).catch(() => {
        voucherApi.getPlatformVouchers().then((pRes) => {
          if (pRes.success && Array.isArray(pRes.data)) {
            setRealVouchers(pRes.data);
          }
        }).catch(() => {});
      });

      voucherApi.getWalletVouchers().then((wRes) => {
        if (wRes.success && wRes.data) {
          const savedIdentifiers: string[] = [];
          const platformVouchersList = [
            ...(wRes.data.platform?.all || []),
            ...(wRes.data.platform?.discount || []),
            ...(wRes.data.platform?.freeship || []),
          ];
          platformVouchersList.forEach((x: any) => {
            if (x.code) savedIdentifiers.push(x.code);
            if (x.id) savedIdentifiers.push(x.id);
          });
          (wRes.data.stores || []).forEach((st: any) => {
            (st.vouchers || []).forEach((x: any) => {
              if (x.code) savedIdentifiers.push(x.code);
              if (x.id) savedIdentifiers.push(x.id);
            });
          });
          if (Array.isArray(wRes.data)) {
            (wRes.data as any[]).forEach((x: any) => {
              if (x.code) savedIdentifiers.push(x.code);
              if (x.id) savedIdentifiers.push(x.id);
            });
          }
          const uniqueSaved = Array.from(new Set(savedIdentifiers));
          setSavedVouchers(uniqueSaved);
          try {
            localStorage.setItem("huki_saved_voucher_codes", JSON.stringify(uniqueSaved));
          } catch {}
          setRealVouchers((prev) =>
            prev.map((rv) => (uniqueSaved.includes(rv.code) || (rv.id && uniqueSaved.includes(rv.id)) ? { ...rv, isSaved: true } : rv))
          );
        }
      }).catch(() => {});
    } else {
      voucherApi.getPlatformVouchers().then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setRealVouchers(res.data);
        }
      }).catch(() => {});
      setSavedVouchers([]);
      try {
        localStorage.removeItem("huki_saved_voucher_codes");
      } catch {}
    }
  }, [user?.id, isLoggedIn]);

  // Fetch Real Flash Sale
  useEffect(() => {
    let mounted = true;
    const loadFlashSale = async () => {
      try {
        const res = await flashSaleApi.getAll();
        if (!mounted) return;
        if (res.success && Array.isArray(res.data)) {
          const now = Date.now();
          const validSales = res.data.filter(
            (s) => s.status !== "CANCELLED" && s.status !== "ENDED" && Array.isArray(s.items) && s.items.length > 0
          );

          // Ưu tiên 1: Đợt Flash Sale toàn sàn (Platform) đang LIVE
          let liveSale = validSales.find((s) => {
            const start = new Date(s.startsAt).getTime();
            const end = new Date(s.endsAt).getTime();
            return (s.scope === "PLATFORM" || !s.storeId) && (s.status === "ACTIVE" || (now >= start && now <= end));
          });

          // Ưu tiên 2: Nếu Sàn không có, tự động lấy đợt Flash Sale đang LIVE của Shop có nhiều sách nhất
          if (!liveSale) {
            const activeShopSales = validSales.filter((s) => {
              const start = new Date(s.startsAt).getTime();
              const end = new Date(s.endsAt).getTime();
              return s.status === "ACTIVE" || (now >= start && now <= end);
            });
            if (activeShopSales.length > 0) {
              liveSale = [...activeShopSales].sort((a, b) => (b.items?.length || 0) - (a.items?.length || 0))[0];
            }
          }

          if (liveSale) {
            setActiveFlashSale(liveSale);
            setPlatformSalePhase('LIVE');
            const end = new Date(liveSale.endsAt).getTime();
            const remaining = Math.max(0, Math.floor((end - now) / 1000));
            setFlashSeconds(remaining > 0 ? remaining : 7200);
            return;
          }

          // Sắp diễn ra (Teaser) - Ưu tiên Sàn rồi tới Shop
          let teaserSale = validSales
            .filter((s) => (s.scope === "PLATFORM" || !s.storeId) && new Date(s.startsAt).getTime() > now)
            .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];

          if (!teaserSale) {
            teaserSale = validSales
              .filter((s) => new Date(s.startsAt).getTime() > now)
              .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
          }

          if (teaserSale) {
            setActiveFlashSale(teaserSale);
            setPlatformSalePhase('TEASER');
            const start = new Date(teaserSale.startsAt).getTime();
            const remaining = Math.max(0, Math.floor((start - now) / 1000));
            setFlashSeconds(remaining > 0 ? remaining : 3600);
            return;
          }
        }
        setActiveFlashSale(null);
        setPlatformSalePhase('NONE');
      } catch (err) {
        console.warn("Could not load flash sale campaigns:", err);
      }
    };

    loadFlashSale();
    const interval = setInterval(loadFlashSale, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Flash Sale Timer countdown
  useEffect(() => {
    const timer = setInterval(
      () => setFlashSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

  // Load Custom Banners from Admin Marketing Hub (API Backend with LocalStorage & Realtime BroadcastChannel)
  useEffect(() => {
    const loadAdminBanners = async () => {
      try {
        const res = await bannerApi.getActiveBanners('HOMEPAGE');
        const items = Array.isArray(res.data) ? res.data : (res.data as any)?.items;
        if (res.success && Array.isArray(items)) {
          const mapped = items.map((b: any, idx: number) => {
            const pos = b.position || idx + 1;
            const slot = pos === 101 ? 'SUB_TOP' : pos === 102 ? 'SUB_BOTTOM' : 'HERO_SLIDER';
            return {
              id: b.id,
              title: b.title,
              subtitle: b.subtitle || '',
              bgImage: b.image || '/banners/hero-library.jpg',
              badge: b.badge || (pos === 101 ? 'SÁCH BÁN CHẠY' : pos === 102 ? 'EBOOK BẢN QUYỀN' : 'CHIẾN DỊCH HUKI'),
              link: b.link || '/books',
              status: b.isActive ? 'active' : 'hidden',
              order: pos,
              slot,
            };
          });
          setCustomBanners(mapped);
          return;
        }
      } catch (err) {
        // Fallback to local storage or defaults
      }

      try {
        const saved = typeof window !== 'undefined' ? localStorage.getItem("huki_admin_marketing_banners") : null;
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const nowMs = Date.now();
            const activeOnly = parsed.filter((b: any) => {
              if (b.status !== "active") return false;
              const sMs = b.startDate ? new Date(b.startDate).getTime() : null;
              const eMs = b.endDate ? new Date(b.endDate).getTime() : null;
              if (sMs && !isNaN(sMs) && nowMs < sMs) return false;
              if (eMs && !isNaN(eMs) && nowMs > eMs) return false;
              return true;
            });
            setCustomBanners(activeOnly);
            return;
          }
        }
      } catch {}
      // Khi đã xóa hết banner, không phục hồi ADMIN_DEFAULT_BANNERS làm banner ma
      setCustomBanners([]);
    };

    loadAdminBanners();
    window.addEventListener("storage", loadAdminBanners);
    window.addEventListener("huki_admin_marketing_updated", loadAdminBanners);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("huki_marketing_channel");
      bc.onmessage = () => {
        loadAdminBanners();
      };
    } catch {}

    return () => {
      window.removeEventListener("storage", loadAdminBanners);
      window.removeEventListener("huki_admin_marketing_updated", loadAdminBanners);
      if (bc) {
        try { bc.close(); } catch {}
      }
    };
  }, []);

  // Fetch Clean Featured Real Reviews (70% 5-star priority, ranked by likes + comments)
  useEffect(() => {
    if (!realBooks || realBooks.length === 0) return;
    let active = true;
    const validBooks = realBooks.filter(isValidDisplayBook);
    const booksById = new Map<string, BookData>();
    validBooks.forEach((b) => booksById.set(String(b.id), b));

    const enrichWithBook = (item: any, fallbackBook?: BookData) => {
      const matched =
        booksById.get(String(item.bookId || item.targetId || '')) || fallbackBook;
      return {
        ...item,
        bookId: matched?.id || item.bookId || item.targetId,
        bookSlug: matched?.slug || item.bookSlug || matched?.id || item.bookId || item.targetId,
        bookTitle: matched?.title || item.bookTitle,
        bookCover: matched?.coverUrl || item.bookCover,
      };
    };

    const loadFeatured = async () => {
      try {
        const featuredRes = await reviewApi.getFeaturedBookReviews(6);
        const featuredList = Array.isArray(featuredRes.data) ? featuredRes.data : [];
        if (featuredRes.success && featuredList.length > 0) {
          const enriched = featuredList
            .map((item) => enrichWithBook(item))
            .filter((item) => !item.bookTitle || isValidDisplayBook({ title: item.bookTitle }));
          const curated = selectFeaturedReviews(enriched, 6);
          if (active && curated.length > 0) {
            setRealReviews(curated);
            return;
          }
        }
      } catch {
        // Fallback to scanning valid catalog books below
      }

      const candidateBooks = validBooks.slice(0, 30);
      const results = await Promise.allSettled(
        candidateBooks.map((b) => reviewApi.getBookReviews(b.id, { limit: 5 })),
      );
      const collected: any[] = [];
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value.success && r.value.data) {
          const list = Array.isArray(r.value.data)
            ? r.value.data
            : (r.value.data as any).data || [];
          const curBook = candidateBooks[idx];
          list.forEach((item: any) => {
            collected.push(enrichWithBook(item, curBook));
          });
        }
      });

      const curated = selectFeaturedReviews(collected, 6);
      if (active) {
        setRealReviews(curated);
      }
    };

    void loadFeatured();
    return () => {
      active = false;
    };
  }, [realBooks]);

  // Personalization events listener
  useEffect(() => {
    const handleUpdate = () => {
      setPersonalizationTick((prev) => prev + 1);
    };
    window.addEventListener('huki:personalization_updated', handleUpdate);
    window.addEventListener('huki:search_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('huki:personalization_updated', handleUpdate);
      window.removeEventListener('huki:search_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Authors carousel resize listener
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

  // =========================================================================
  // DERIVED DATA STRUCTURES (100% REAL - ZERO MOCKS)
  // =========================================================================

  // 1. Categories Menu for Hero Left Sidebar
  const categoriesMenu = useMemo(() => {
    if (realCategories.length > 0) {
      const iconMap: Record<string, string> = {
        'kinh-doanh': 'trending_up',
        'van-hoc': 'auto_stories',
        'tam-ly': 'psychology',
        'cong-nghe': 'smart_toy',
        'khoa-hoc': 'biotech',
        'manga': 'menu_book',
        'thieu-nhi': 'child_care',
        'tri-thuc': 'school',
        'lich-su': 'history_edu',
        'phat-trien': 'self_improvement',
      };
      return realCategories.slice(0, 9).map((c) => {
        let icon = 'menu_book';
        const s = (c.slug || '').toLowerCase();
        for (const [key, val] of Object.entries(iconMap)) {
          if (s.includes(key)) {
            icon = val;
            break;
          }
        }
        return {
          name: c.name,
          to: `/books?category=${encodeURIComponent(c.slug || '')}`,
          icon,
        };
      });
    }

    const catMap = new Map<string, string>();
    realBooks.forEach((b) => {
      if (b.category?.name && b.category?.slug) {
        catMap.set(b.category.name, b.category.slug);
      }
    });

    return Array.from(catMap.entries()).slice(0, 9).map(([name, slug]) => ({
      name,
      to: `/books?category=${encodeURIComponent(slug)}`,
      icon: 'menu_book',
    }));
  }, [realCategories, realBooks]);

  // 2. Banner Hero & 2 Banner Phụ (Đồng bộ trực tiếp từ Admin Marketing theo Slot)
  const heroBanners = useMemo(() => {
    return customBanners.filter((b: any) => (b.slot === 'HERO_SLIDER' || (!b.slot && b.order < 100)) && b.status === 'active');
  }, [customBanners]);

  const subTopBanner = useMemo(() => {
    return customBanners.find((b: any) => (b.slot === 'SUB_TOP' || b.order === 101) && b.status === 'active');
  }, [customBanners]);

  const subBottomBanner = useMemo(() => {
    return customBanners.find((b: any) => (b.slot === 'SUB_BOTTOM' || b.order === 102) && b.status === 'active');
  }, [customBanners]);

  const heroSlides = useMemo(() => {
    const bannerSource = heroBanners.length > 0 ? heroBanners : [];
    if (bannerSource.length === 0) {
      return [{
        id: "hero-welcome",
        badge: "HỆ SINH THÁI HUKI",
        title: "Tuần Lễ Sách Tri Thức Bản Quyền 2026",
        desc: "Khám phá hàng chục ngàn tựa sách chọn lọc từ các Nhà xuất bản hàng đầu.",
        bgImage: "/banners/hero-library.jpg",
        overlay: "linear-gradient(to right, rgba(0, 36, 26, 0.88) 0%, rgba(0, 36, 26, 0.55) 55%, rgba(0, 36, 26, 0.12) 100%)",
        primaryBtn: { text: "Khám Phá Ngay", to: "/books" },
        secondaryBtn: { text: "Sách Bán Chạy", to: "/books?sort=bestseller" },
      }];
    }

    return bannerSource.map((cb: any, idx: number) => ({
      id: cb.id || `hero-${idx}`,
      badge: cb.badge || "CHIẾN DỊCH HUKI",
      title: cb.title || "Tuần Lễ Sách Tri Thức Bản Quyền",
      desc: cb.subtitle || cb.desc || "Khám phá hàng chục ngàn tựa sách chọn lọc từ các Nhà xuất bản hàng đầu.",
      bgImage: cb.bgImage || cb.imageUrl || "/banners/hero-library.jpg",
      // Gradient điện ảnh trong trẻo, không có lớp mờ đục xám xịt
      overlay: "linear-gradient(to right, rgba(0, 36, 26, 0.88) 0%, rgba(0, 36, 26, 0.55) 55%, rgba(0, 36, 26, 0.12) 100%)",
      primaryBtn: { text: "Khám Phá Ngay", to: cb.link || cb.targetUrl || "/books" },
      secondaryBtn: { text: "Sách Bán Chạy", to: "/books?sort=bestseller" },
    }));
  }, [heroBanners]);

  // Auto rotate Hero Slider
  useEffect(() => {
    if (isHeroHovered || heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isHeroHovered, heroSlides.length]);

  // 3. Real Vouchers List (Zero mock!)
  const voucherList = useMemo(() => {
    if (!realVouchers || realVouchers.length === 0) return [];

    return realVouchers.map((v) => {
      const isSaved = Boolean(v.isSaved || savedVouchers.includes(v.code) || (v.id && savedVouchers.includes(v.id)));
      const badge =
        v.type === 'PERCENTAGE'
          ? `GIẢM ${v.value}%`
          : v.type === 'FREE_SHIPPING'
          ? 'FREESHIP'
          : `GIẢM ${Number(v.value).toLocaleString('vi-VN')}Đ`;
      let icon =
        v.type === 'FREE_SHIPPING'
          ? 'local_shipping'
          : v.type === 'PERCENTAGE'
          ? 'percent'
          : 'redeem';
      let condition = v.minOrderAmount
        ? `Đơn từ ${Number(v.minOrderAmount).toLocaleString('vi-VN')}₫`
        : 'Mọi đơn hàng';
      if (v.targetAudience === 'FOLLOWERS_ONLY') {
        condition += ' • Dành cho Người theo dõi';
        icon = 'favorite';
      } else if (v.targetAudience === 'NEW_CUSTOMERS_ONLY') {
        condition += ' • Khách mới';
      }

      return {
        id: v.id,
        code: v.code,
        targetAudience: v.targetAudience,
        badge,
        title: v.name || `Voucher ${v.code}`,
        condition,
        exp: v.expiresAt
          ? `HSD: ${new Date(v.expiresAt).toLocaleDateString('vi-VN')}`
          : 'HSD: Dài hạn',
        icon,
        isSaved,
      };
    });
  }, [realVouchers, savedVouchers]);

  // 4. Flash Sale Items (Real campaign items OR real discounted books from DB)
  const allFlashSale = useMemo(() => {
    // Helper tính điểm kết hợp chuẩn Shopee: 50% Điểm Đánh Giá Sao + 50% Điểm Mức Giá/Chiết Khấu
    const calculateCompositeScore = (rating: number, discountPct: number, salePrice: number) => {
      const starScore = (Math.max(1, Math.min(5, Number(rating) || 5)) / 5) * 50;
      const priceScore = Math.min(50, (Math.max(0, Number(discountPct) || 0) / 100) * 50);
      return starScore + priceScore;
    };

    if (activeFlashSale?.items && activeFlashSale.items.length > 0) {
      const isLivePhase = platformSalePhase === 'LIVE';
      const mappedItems = activeFlashSale.items.map((item: FlashSaleItem) => {
        const book = realBooks.find((entry) => entry.id === item.bookId);
        const resolvedTitle = book?.title || item.bookTitle || "Tác phẩm Flash Sale";
        const rawAuthor = book?.author?.name || (typeof item.author === 'string' ? item.author : (item.author as any)?.name);
        const resolvedAuthor = rawAuthor || "Nhiều tác giả";
        const resolvedPublisher = book?.publisher?.name || "Nhà xuất bản";
        const resolvedCover = book?.coverUrl || item.coverUrl || "/banners/hero-library.jpg";
        const resolvedRating = Number(book?.rating || (book as any)?.averageRating || 5);
        const rawOriginalPrice = Number(item.originalPrice || book?.price || item.salePrice || 0);
        const salePrice = Number(item.salePrice || 0);
        const discountPct = isLivePhase ? Number(item.discountPercent || 0) : 0;
        const displayPrice = isLivePhase ? salePrice : rawOriginalPrice;

        return {
          id: item.bookId,
          bookId: item.bookId,
          storeId: book?.storeId || (book as any)?.store_id || book?.businessId || item.storeId,
          businessId: book?.businessId || book?.storeId || item.storeId,
          book: book,
          title: resolvedTitle,
          author: resolvedAuthor,
          publisher: resolvedPublisher,
          cover: resolvedCover,
          price: displayPrice,
          originalPrice: isLivePhase ? item.originalPrice : undefined,
          discount: isLivePhase && discountPct > 0 ? `-${discountPct}%` : null,
          discountPercent: discountPct,
          rating: resolvedRating,
          sales: item.sold,
          soldText: isLivePhase
            ? item.isSoldOut
              ? "Đã bán hết 100%"
              : `Đã bán ${item.sold} cuốn`
            : "Sắp mở bán",
          format: item.format === 'DIGITAL' ? "Sách số (Ebook)" : "Sách giấy",
          formatType: item.format === 'DIGITAL' ? "ebook" : "physical",
          compositeScore: calculateCompositeScore(resolvedRating, Number(item.discountPercent || 0), salePrice),
        };
      });

      // Sắp xếp kết hợp Giá và Sao: Đưa các deal có điểm tổng hợp cao nhất lên đầu
      mappedItems.sort((a, b) => {
        if (b.compositeScore !== a.compositeScore) {
          return b.compositeScore - a.compositeScore;
        }
        if (a.price !== b.price) return a.price - b.price;
        return (b.sales || 0) - (a.sales || 0);
      });

      return mappedItems;
    }

    // FALLBACK: Khi không có Flash Sale nào đang LIVE, hiển thị Sách Ưu Đãi Đặc Biệt từ Catalog
    const validBooks = realBooks.filter(isValidDisplayBook);
    if (validBooks.length === 0) return [];

    const discounted = validBooks.filter((b) => {
      const p = Number(b.price || 0);
      const op = Number(b.originalPrice || 0);
      return (b.discountPercent && b.discountPercent > 0) || (op > p);
    });

    // Phòng thủ: nếu số sách có giảm giá trong catalog < 6, tự động bổ sung sách hot/sao cao để luôn đủ 6 ô (không bị trống)
    const candidateBooks = [...discounted];
    if (candidateBooks.length < 6) {
      const existingIds = new Set(candidateBooks.map((b) => b.id));
      const additionalBooks = validBooks.filter((b) => !existingIds.has(b.id));
      candidateBooks.push(...additionalBooks);
    }

    // Xếp hạng các sách ứng viên theo công thức kết hợp Giá (chiết khấu) và Sao
    const scoredBooks = candidateBooks.map((b) => {
      const p = Number(b.price || 0);
      const op = Number(b.originalPrice || 0);
      const orig = op > p ? op : Math.round(p * 1.25);
      const pct = b.discountPercent || Math.round(((orig - p) / orig) * 100);
      const r = Number(b.rating || (b as any)?.averageRating || 5);
      return {
        ...b,
        calculatedOrig: orig,
        calculatedPct: pct,
        calculatedRating: r,
        compositeScore: calculateCompositeScore(r, pct, p),
      };
    });

    scoredBooks.sort((a, b) => {
      if (b.compositeScore !== a.compositeScore) {
        return b.compositeScore - a.compositeScore;
      }
      if (Number(a.price || 0) !== Number(b.price || 0)) {
        return Number(a.price || 0) - Number(b.price || 0);
      }
      return Number(b.soldCount || 0) - Number(a.soldCount || 0);
    });

    const balancedDiscounted = balanceBooksByPublisher(scoredBooks, 2, 6);
    return balancedDiscounted.map((b: any) => {
      const p = Number(b.price || 0);
      const orig = b.calculatedOrig || Math.round(p * 1.25);
      const pct = b.calculatedPct || 20;
      return {
        id: b.id,
        bookId: b.id,
        storeId: b.storeId,
        businessId: b.businessId,
        book: b,
        title: b.title,
        author: b.author?.name || (typeof b.author === 'string' ? b.author : ((b as any).authorName || 'Nhiều tác giả')),
        publisher: b.publisher?.name || "Gian hàng HUKI",
        cover: b.coverUrl || "/banners/hero-library.jpg",
        price: p,
        originalPrice: orig,
        discount: `-${pct}%`,
        discountPercent: pct,
        rating: b.calculatedRating || 5,
        sales: Number(b.soldCount || 0),
        soldText: b.soldCount ? `Đã bán ${b.soldCount} cuốn` : "Ưu đãi hot",
        format: b.format === "DIGITAL" ? "Ebook DRM" : "Sách giấy",
        formatType: b.format === "DIGITAL" ? "ebook" : "physical",
      };
    });
  }, [activeFlashSale, platformSalePhase, realBooks]);

  const flashCountdown = useMemo(() => {
    const hours = Math.floor(flashSeconds / 3600);
    const minutes = Math.floor((flashSeconds % 3600) / 60);
    const seconds = flashSeconds % 60;
    return {
      h: String(hours).padStart(2, "0"),
      m: String(minutes).padStart(2, "0"),
      s: String(seconds).padStart(2, "0"),
    };
  }, [flashSeconds]);

  // 5. Bestsellers (100% Real from realBooks sorted by sales count)
  const allBestsellers = useMemo(() => {
    if (!realBooks || realBooks.length === 0) return [];

    const validBooks = realBooks.filter(isValidDisplayBook);

    const sortedBySales = [...validBooks].sort((a, b) => {
      const salesA = Number(a.soldCount ?? (a as any).sales ?? 0);
      const salesB = Number(b.soldCount ?? (b as any).sales ?? 0);
      if (salesB !== salesA) return salesB - salesA;

      const ratingA = Number(a.rating ?? (a as any).averageRating ?? 0);
      const ratingB = Number(b.rating ?? (b as any).averageRating ?? 0);
      if (ratingB !== ratingA) return ratingB - ratingA;

      const viewsA = Number(a.viewCount ?? (a as any).views ?? 0);
      const viewsB = Number(b.viewCount ?? (b as any).views ?? 0);
      return viewsB - viewsA;
    });

    return sortedBySales.map((b) => {
      const salePrice = b.price || 0;
      const origPrice =
        b.originalPrice && b.originalPrice > salePrice
          ? b.originalPrice
          : undefined;
      const discountPct = origPrice
        ? Math.round(((origPrice - salePrice) / origPrice) * 100)
        : b.discountPercent || undefined;
      const realSales = Number(b.soldCount ?? (b as any).sales ?? 0);
      const realRating = Number(b.rating ?? (b as any).averageRating ?? 5);

      return {
        id: b.id,
        bookId: b.id,
        storeId: b.storeId,
        businessId: b.businessId,
        book: b,
        title: b.title,
        author: b.author?.name || (typeof b.author === 'string' ? b.author : ((b as any).authorName || 'Nhiều tác giả')),
        publisher: b.publisher?.name || "Gian hàng HUKI",
        cover: b.coverUrl || "/banners/hero-library.jpg",
        price: salePrice,
        originalPrice: origPrice,
        discount: discountPct ? `-${discountPct}%` : undefined,
        discountPercent: discountPct,
        rating: realRating,
        sales: realSales,
        soldCount: realSales,
        category: b.format === "DIGITAL" ? "ebook" : "paper",
        format: b.format === "DIGITAL" ? "Ebook DRM" : "Sách giấy",
        formatType: b.format === "DIGITAL" ? "ebook" : "physical",
      };
    });
  }, [realBooks]);

  const filteredBestsellers = useMemo(() => {
    let list = allBestsellers;
    if (bestsellerTab === "paper") list = allBestsellers.filter((b) => b.category === "paper");
    else if (bestsellerTab === "ebook") list = allBestsellers.filter((b) => b.category === "ebook");
    return balanceBooksByPublisher(list, 2, 6);
  }, [bestsellerTab, allBestsellers]);

  // 6. Official Stores & Publishers (From Real Publishers API)
  const officialStores = useMemo(() => {
    if (!realPublishers || realPublishers.length === 0) return [];
    const colors = [
      "bg-[#003b2b] text-white",
      "bg-[#006953] text-white",
      "bg-[#004d38] text-white",
      "bg-[#0f4c3a] text-white",
      "bg-[#1c3f35] text-white",
    ];
    return realPublishers.map((pub, idx) => {
      const bookCount = realBooks.filter(
        (b) => b.publisher?.name === pub.name || b.publisher?.id === pub.id
      ).length;
      return {
        id: pub.id,
        name: pub.name,
        code: pub.name.split(' ').map((w: string) => w[0]).join('').slice(0, 3).toUpperCase(),
        color: colors[idx % colors.length],
        followers: bookCount > 0 ? `${bookCount} đầu sách chính hãng` : 'Đối tác chính hãng',
        verified: true,
        slug: pub.slug,
        logo: pub.logo || null,
      };
    });
  }, [realPublishers, realBooks]);

  // 7. Interactive Category Tabs & Filtered Books (Zero Mocks - Clean Typography)
  const categoryTabOptions = useMemo(() => [
    {
      id: "all",
      label: "Tất Cả",
      url: "/books",
      description: "Tuyển tập sách hay chọn lọc từ mọi thể loại trên sàn HUKI",
    },
    {
      id: "van-hoc",
      label: "Văn Học & Tiểu Thuyết",
      url: "/books?category=van-hoc",
      description: "Tác phẩm văn học kinh điển, tiểu thuyết đương đại & tản văn",
    },
    {
      id: "kinh-doanh",
      label: "Kinh Doanh & Đầu Tư",
      url: "/books?category=kinh-doanh-tech",
      description: "Quản trị doanh nghiệp, tài chính, đầu tư & khởi nghiệp",
    },
    {
      id: "cong-nghe",
      label: "Công Nghệ & AI",
      url: "/books?category=cong-nghe-khoa-hoc",
      description: "Lập trình, trí tuệ nhân tạo AI, dữ liệu & khoa học tương lai",
    },
    {
      id: "ebook",
      label: "Ebook Bản Quyền",
      url: "/books?format=ebook",
      description: "Sách điện tử số hóa DRM chính chủ, đọc ngay trên mọi thiết bị",
    },
    {
      id: "tam-ly",
      label: "Tâm Lý & Kỹ Năng",
      url: "/books?category=tam-ly-ky-nang",
      description: "Phát triển bản thân, kỹ năng tư duy & thấu hiểu cảm xúc",
    },
    {
      id: "manga",
      label: "Manga & Thiếu Nhi",
      url: "/books?category=manga-comic-khac",
      description: "Manga, comic, light novel giải trí và truyện thiếu nhi",
    },
  ], []);

  const currentCategoryBooks = useMemo(() => {
    if (!realBooks || realBooks.length === 0) return [];

    let books: BookData[] = [];

    switch (selectedCategoryTab) {
      case "van-hoc":
        books = realBooks.filter((b) => {
          const slug = b.category?.slug?.toLowerCase() || '';
          const name = b.category?.name?.toLowerCase() || '';
          return (
            slug.includes('van-hoc') ||
            name.includes('văn học') ||
            name.includes('tiểu thuyết')
          );
        });
        break;

      case "kinh-doanh":
        books = realBooks.filter((b) => {
          const slug = b.category?.slug?.toLowerCase() || '';
          const name = b.category?.name?.toLowerCase() || '';
          return (
            slug.includes('kinh-doanh') ||
            slug.includes('kinh-te') ||
            name.includes('kinh tế') ||
            name.includes('kinh doanh') ||
            name.includes('đầu tư')
          );
        });
        break;

      case "cong-nghe":
        books = realBooks.filter((b) => {
          const slug = b.category?.slug?.toLowerCase() || '';
          const name = b.category?.name?.toLowerCase() || '';
          return (
            slug.includes('cong-nghe') ||
            slug.includes('tri-thuc') ||
            name.includes('công nghệ') ||
            name.includes('khoa học') ||
            name.includes('ai') ||
            name.includes('tri thức')
          );
        });
        break;

      case "ebook":
        books = realBooks.filter(
          (b) =>
            b.format === 'DIGITAL' ||
            b.format === 'BOTH' ||
            b.digitalDetails?.digitalEnabled
        );
        break;

      case "tam-ly":
        books = realBooks.filter((b) => {
          const slug = b.category?.slug?.toLowerCase() || '';
          const name = b.category?.name?.toLowerCase() || '';
          return (
            slug.includes('tam-ly') ||
            slug.includes('phat-trien') ||
            name.includes('tâm lý') ||
            name.includes('kỹ năng') ||
            name.includes('bản thân')
          );
        });
        break;

      case "manga":
        books = realBooks.filter((b) => {
          const slug = b.category?.slug?.toLowerCase() || '';
          const name = b.category?.name?.toLowerCase() || '';
          return (
            slug.includes('manga') ||
            slug.includes('thieu-nhi') ||
            name.includes('manga') ||
            name.includes('thiếu nhi') ||
            name.includes('comic')
          );
        });
        break;

      case "all":
      default:
        books = realBooks;
        break;
    }

    const validBooks = books.filter(isValidDisplayBook);

    // Sắp xếp ưu tiên: Lượt bán thực tế, điểm đánh giá và lượt xem
    const sorted = [...validBooks].sort((a, b) => {
      const salesA = Number(a.soldCount ?? (a as any).sales ?? 0);
      const salesB = Number(b.soldCount ?? (b as any).sales ?? 0);
      if (salesB !== salesA) return salesB - salesA;
      const ratingA = Number(a.rating ?? (a as any).averageRating ?? 0);
      const ratingB = Number(b.rating ?? (b as any).averageRating ?? 0);
      if (ratingB !== ratingA) return ratingB - ratingA;
      const viewsA = Number(a.viewCount ?? (a as any).views ?? 0);
      const viewsB = Number(b.viewCount ?? (b as any).views ?? 0);
      return viewsB - viewsA;
    });

    return balanceBooksByPublisher(sorted, 3, 12);
  }, [realBooks, selectedCategoryTab]);

  const currentCategoryTabInfo = useMemo(() => {
    return (
      categoryTabOptions.find((t) => t.id === selectedCategoryTab) ||
      categoryTabOptions[0]
    );
  }, [categoryTabOptions, selectedCategoryTab]);

  // 8. Combos (Removed: Sellers do not have combo creation feature)

  // 9. Real AI Personalized Recommendations (24 Books)
  const suggestedBooks = useMemo(() => {
    if (!realBooks || realBooks.length === 0) return [];

    const personalized = personalizationService.getPersonalizedRecommendations(
      realBooks as any,
      { limit: 24 }
    );

    return personalized.map((b) => ({
      ...b,
      format: b.format === "DIGITAL" ? "Ebook DRM" : "Sách giấy",
      formatType: b.format === "DIGITAL" ? "ebook" : "physical",
      rating: Number(b.rating ?? (b as any).averageRating ?? 5),
      sales: Number(b.soldCount ?? (b as any).sales ?? 0),
      soldCount: Number(b.soldCount ?? (b as any).sales ?? 0),
    }));
  }, [realBooks, personalizationTick]);

  // 10. Real Authors List from Database (Strictly Deduplicated by Author Name)
  const authorsList = useMemo(() => {
    if (!realAuthors || realAuthors.length === 0) return [];

    // Deduplicate authors by trimmed normalized name
    const uniqueAuthorMap = new Map<string, any>();
    for (const a of realAuthors) {
      const cleanName = (a.name || '').trim();
      if (!cleanName) continue;
      const key = cleanName.toLowerCase();
      if (!uniqueAuthorMap.has(key)) {
        uniqueAuthorMap.set(key, a);
      }
    }

    const authorsWithCount = Array.from(uniqueAuthorMap.values()).map((a: any) => {
      const cleanName = a.name.trim();
      const count = realBooks.filter(
        (b) => b.author?.name?.trim().toLowerCase() === cleanName.toLowerCase() || b.author?.id === a.id
      ).length;
      return {
        id: a.id,
        name: cleanName,
        slug: a.slug,
        books: count > 0 ? `${count} đầu sách` : 'Tác giả nổi bật',
        count,
        avatar:
          a.avatar ||
          a.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=003B2B&color=fff&size=128`,
      };
    });

    authorsWithCount.sort((a, b) => b.count - a.count);
    return authorsWithCount.slice(0, 10);
  }, [realAuthors, realBooks]);

  // Carousel calculations for authors
  const maxAuthorIndex = Math.max(0, authorsList.length - itemsPerPage);

  useEffect(() => {
    if (isAuthorHovered || authorsList.length <= itemsPerPage) return;
    const timer = setInterval(() => {
      setAuthorIndex((prev) => (prev >= maxAuthorIndex ? 0 : prev + 1));
    }, 3500);
    return () => clearInterval(timer);
  }, [isAuthorHovered, maxAuthorIndex, authorsList.length, itemsPerPage]);

  // Interactivity Handlers
  const [savingVoucherCode, setSavingVoucherCode] = useState<string | null>(null);

  const handleSaveVoucher = async (v: { id?: string; code: string; targetAudience?: string }) => {
    if (savedVouchers.includes(v.code) || savingVoucherCode === v.code) return;
    const hasToken = typeof window !== "undefined" && Boolean(tokenStorage.getAccessToken());
    if (!hasToken) {
      showToast({ title: "Thông báo", message: "Vui lòng đăng nhập để lưu voucher vào ví!" }, "warning");
      return;
    }
    if (!v.id) {
      showToast({ title: "Lỗi", message: "Không tìm thấy mã định danh của voucher." }, "error");
      return;
    }

    setSavingVoucherCode(v.code);
    try {
      const res = await voucherApi.saveVoucher(v.id);
      if (res.success) {
        setSavedVouchers((prev) => {
          const updated = Array.from(new Set([...prev, v.code, ...(v.id ? [v.id] : [])]));
          try {
            localStorage.setItem("huki_saved_voucher_codes", JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setRealVouchers((prev) => prev.map((rv) => (rv.id === v.id || rv.code === v.code ? { ...rv, isSaved: true } : rv)));
        showToast({ title: "Thành công!", message: `Đã lưu voucher ${v.code} vào ví của bạn` }, "success");
      } else {
        const errorMsg = res.error?.message || (res as any)?.message || "Không thể lưu mã vào ví.";
        showToast({ title: "Chưa thể lưu mã", message: errorMsg }, "error");
      }
    } catch (err: any) {
      showToast({ title: "Lỗi", message: err?.message || "Không thể lưu voucher vào ví." }, "error");
    } finally {
      setSavingVoucherCode(null);
    }
  };

  const handleToggleShopFollow = (shopName: string) => {
    if (followedShops.includes(shopName)) {
      setFollowedShops((prev) => prev.filter((s) => s !== shopName));
      showToast(`Đã hủy theo dõi ${shopName}`, "info");
    } else {
      setFollowedShops((prev) => [...prev, shopName]);
      showToast(
        `Đang theo dõi ${shopName}. Bạn sẽ nhận thông báo sách mới sớm nhất!`,
        "success",
      );
    }
  };

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
    <div className="w-full max-w-[1240px] mx-auto px-2.5 sm:px-4 py-3 sm:py-4 flex flex-col gap-4 sm:gap-5">
      
      {/* =========================================================================
          SECTION 1: HERO 3 KHỐI CHUẨN TMĐT (MENU DỌC + HERO SLIDER + 2 BANNER PHỤ)
      ========================================================================= */}
      <section className="flex flex-col gap-3.5">
        <div className="grid grid-cols-12 gap-3.5 items-stretch">
          
          {/* 1.1 CỘT TRÁI: MENU DANH MỤC DỌC (Hiện trên Desktop lg+) */}
          <div className="hidden lg:flex lg:col-span-3 flex-col bg-white rounded-2xl border border-[#E8E5DF] p-3 shadow-2xs justify-between">
            <div className="space-y-0.5">
              <div className="px-3 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 mb-1">
                Danh Mục Sách
              </div>
              {categoriesMenu.length === 0 ? (
                <div className="space-y-1.5 py-1 px-1">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-7 bg-gray-100/80 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                categoriesMenu.map((cat, idx) => (
                  <Link
                    key={idx}
                    href={cat.to}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:text-[#003B2B] hover:bg-[#003B2B]/5 transition-all group"
                  >
                    <span className="line-clamp-1">{cat.name}</span>
                    <span className="material-symbols-outlined text-[14px] text-gray-300 group-hover:text-[#003B2B] group-hover:translate-x-0.5 transition-all">
                      chevron_right
                    </span>
                  </Link>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 mt-2">
              <Link
                href="/books"
                className="flex items-center justify-center py-2 px-3 rounded-xl bg-gray-50 hover:bg-[#003B2B]/10 text-[#003B2B] text-xs font-bold transition-all text-center"
              >
                <span>Xem Tất Cả Sách →</span>
              </Link>
            </div>
          </div>

          {/* 1.2 CỘT GIỮA: BANNER HERO LỚN CHUẨN SHOPEE (ẢNH THIẾT KẾ SẠCH, CLICK TRỰC TIẾP, KHÔNG CHỮ ĐÈ) */}
          <div
            className="col-span-12 lg:col-span-6 rounded-2xl overflow-hidden relative shadow-xs min-h-[260px] sm:min-h-[320px] transition-all group bg-emerald-950/5 border border-gray-200/80"
            onMouseEnter={() => setIsHeroHovered(true)}
            onMouseLeave={() => setIsHeroHovered(false)}
          >
            {/* Cross-fade Full-Bleed Clickable Banner Images */}
            {heroSlides.map((slide, idx) => (
              <Link
                key={slide.id || idx}
                href={slide.primaryBtn?.to || "/books"}
                aria-label={slide.title || `Banner chiến dịch ${idx + 1}`}
                title={slide.title || undefined}
                onClick={() => {
                  if (slide.id) recordBannerClick(slide.id);
                }}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer block ${
                  activeHeroSlide === idx ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
                }`}
              >
                <img
                  src={slide.bgImage || "/banners/hero-library.jpg"}
                  alt={slide.title || "Banner HuKi"}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = '1';
                      img.src = "/banners/hero-library.jpg";
                    }
                  }}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.01]"
                />
              </Link>
            ))}

            {/* Prev / Next Navigation Arrows (Shopee style, hover reveal) */}
            {heroSlides.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Banner trước"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveHeroSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
                  }}
                  className="hidden sm:flex items-center justify-center w-8 h-12 rounded-r-lg bg-black/25 hover:bg-black/50 text-white absolute left-0 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">chevron_left</span>
                </button>
                <button
                  type="button"
                  aria-label="Banner tiếp theo"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveHeroSlide((prev) => (prev + 1) % heroSlides.length);
                  }}
                  className="hidden sm:flex items-center justify-center w-8 h-12 rounded-l-lg bg-black/25 hover:bg-black/50 text-white absolute right-0 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                </button>
              </>
            )}

            {/* Minimal Bottom Pagination Dots */}
            {heroSlides.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-xs">
                {heroSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveHeroSlide(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      activeHeroSlide === idx
                        ? "w-5 bg-white shadow-xs"
                        : "w-1.5 bg-white/55 hover:bg-white/85"
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 1.3 CỘT PHẢI: 2 BANNER PHỤ CHUẨN SHOPEE (FULL-BLEED ẢNH THIẾT KẾ SẴN, KHÔNG CHỮ ĐÈ) */}
          <div className="col-span-12 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
            <Link
              href={subTopBanner?.link || "/books?sort=bestseller"}
              aria-label={subTopBanner?.title || "Banner sách bán chạy"}
              title={subTopBanner?.title || "Tuyển tập bán chạy"}
              onClick={() => {
                if (subTopBanner?.id) recordBannerClick(subTopBanner.id);
              }}
              className="flex-1 rounded-xl overflow-hidden relative shadow-2xs group cursor-pointer hover:shadow-md transition-all min-h-[135px] border border-gray-200/80 block bg-emerald-950/5"
            >
              <img
                src={subTopBanner?.bgImage || '/banners/hero-podium.jpg'}
                alt={subTopBanner?.title || "Tuyển Tập Được Đọc Nhiều Nhất"}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = '1';
                    img.src = '/banners/hero-podium.jpg';
                  }
                }}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </Link>

            <Link
              href={subBottomBanner?.link || "/books?format=ebook"}
              aria-label={subBottomBanner?.title || "Banner Ebook bản quyền"}
              title={subBottomBanner?.title || "Ebook DRM Bản Quyền"}
              onClick={() => {
                if (subBottomBanner?.id) recordBannerClick(subBottomBanner.id);
              }}
              className="flex-1 rounded-xl overflow-hidden relative shadow-2xs group cursor-pointer hover:shadow-md transition-all min-h-[135px] border border-gray-200/80 block bg-slate-900/5"
            >
              <img
                src={subBottomBanner?.bgImage || '/banners/sub-hybrid.jpg'}
                alt={subBottomBanner?.title || "Sách Điện Tử DRM Bản Quyền"}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = '1';
                    img.src = '/banners/sub-hybrid.jpg';
                  }
                }}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </Link>
          </div>
        </div>

        {/* 4 CAM KẾT VÀNG */}
        <div className="w-full bg-white rounded-xl p-2.5 sm:p-3 border border-[#E8E5DF] grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-50 text-[#003B2B] flex items-center justify-center shrink-0 border border-emerald-100">
              <span className="material-symbols-outlined text-[15px]">
                verified
              </span>
            </div>
            <div>
              <div className="font-bold text-[11px] text-[#17201F]">
                Sản phẩm chính hãng
              </div>
              <div className="text-[9.5px] text-[#6B7280]">
                Cam kết chất lượng 100%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-50 text-[#003B2B] flex items-center justify-center shrink-0 border border-emerald-100">
              <span className="material-symbols-outlined text-[15px]">
                local_shipping
              </span>
            </div>
            <div>
              <div className="font-bold text-[11px] text-[#17201F]">
                Giao nhanh 2 giờ
              </div>
              <div className="text-[9.5px] text-[#6B7280]">
                Nội thành HN &amp; TP.HCM
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-50 text-[#003B2B] flex items-center justify-center shrink-0 border border-emerald-100">
              <span className="material-symbols-outlined text-[15px]">
                cached
              </span>
            </div>
            <div>
              <div className="font-bold text-[11px] text-[#17201F]">
                Đổi trả dễ dàng
              </div>
              <div className="text-[9.5px] text-[#6B7280]">
                Trong vòng 7 ngày
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-50 text-[#003B2B] flex items-center justify-center shrink-0 border border-emerald-100">
              <span className="material-symbols-outlined text-[15px]">
                headset_mic
              </span>
            </div>
            <div>
              <div className="font-bold text-[11px] text-[#17201F]">
                Tư vấn tận tâm
              </div>
              <div className="text-[9.5px] text-[#6B7280]">
                Hỗ trợ độc giả 24/7
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: DẢI GOM MÃ GIẢM GIÁ (CHỈ HIỂN THỊ VOUCHER THẬT - ZERO MOCK)
      ========================================================================= */}
      {(voucherList.length > 0 || platformSalePhase === 'LIVE') && (
        <section className="bg-emerald-900/5 rounded-xl p-2.5 sm:p-3 border border-emerald-900/10">
          {/* Flash Sale Banner Card inside Voucher Section when LIVE */}
          {platformSalePhase === 'LIVE' && activeFlashSale && (
            <Link
              href="/flash-sale"
              className="mb-2.5 bg-gradient-to-r from-[#003b2b] via-[#004d38] to-[#006953] rounded-xl p-2.5 sm:p-3 text-white shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-2 border border-emerald-400/30 relative overflow-hidden group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-400 text-[#003b2b] text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                      ĐANG DIỄN RA
                    </span>
                    <span className="text-emerald-200 text-[11px] font-bold font-mono">
                      KẾT THÚC TRONG: {flashCountdown.h}:{flashCountdown.m}:{flashCountdown.s}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold mt-1 tracking-tight text-white line-clamp-1">
                    {activeFlashSale.name || "Đợt Flash Sale Sách Toàn Sàn HUKI"}
                  </h3>
                </div>
              </div>

              <div className="text-xs font-bold text-amber-300 self-end md:self-center z-10 group-hover:translate-x-1 transition-transform">
                <span>Xem Ngay →</span>
              </div>
            </Link>
          )}

          {/* Real Vouchers List */}
          {voucherList.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {voucherList.map((v, idx) => {
                const isSaved = Boolean(v.isSaved || savedVouchers.includes(v.code) || (v.id && savedVouchers.includes(v.id)));
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-lg p-2.5 border border-emerald-900/15 flex items-center justify-between gap-2 shadow-2xs hover:border-[#003b2b]/40 transition-all"
                  >
                    <div className="min-w-0">
                      <span className="text-[11.5px] font-bold text-[#003b2b] block truncate">
                        {v.badge}
                      </span>
                      <span className="text-[10px] text-gray-500 block truncate mt-0.5">
                        {v.condition}
                      </span>
                    </div>

                    <button
                      onClick={() => handleSaveVoucher(v)}
                      disabled={isSaved || savingVoucherCode === v.code}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold shrink-0 transition-colors cursor-pointer ${
                        isSaved
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : savingVoucherCode === v.code
                          ? "bg-emerald-700 text-white opacity-80 cursor-wait"
                          : "bg-[#003b2b] text-white hover:bg-[#00241a]"
                      }`}
                    >
                      {isSaved ? "Đã lưu" : savingVoucherCode === v.code ? "Đang lưu..." : "Lưu mã"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          SECTION 3: HUKI DEAL HÔM NAY (FLASH SALE THẬT HOẶC SÁCH GIẢM GIÁ THẬT)
      ========================================================================= */}
      {allFlashSale.length > 0 && (
        <section className="bg-[#FAF3EE] rounded-2xl p-2.5 sm:p-3.5 border border-[#EADBCE] shadow-2xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-1.5 border-b border-[#EADBCE]/80">
            <div className="flex items-center gap-2">
              <div
                className={`px-2.5 py-1 rounded-lg font-bold text-xs sm:text-sm tracking-wide shadow-xs uppercase text-white ${
                  platformSalePhase === 'TEASER' ? 'bg-amber-600' : 'bg-[#003b2b]'
                }`}
              >
                <span>
                  {platformSalePhase === 'LIVE'
                    ? "FLASH SALE ĐANG LIVE"
                    : platformSalePhase === 'TEASER'
                    ? "FLASH SALE SẮP MỞ BÁN"
                    : "ƯU ĐÃI ĐẶC BIỆT"}
                </span>
              </div>

              {activeFlashSale && (
                <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#17201F]">
                  {platformSalePhase === 'TEASER' && (
                    <span className="text-[11px] font-sans font-semibold text-amber-800 mr-1">
                      Mở bán sau:
                    </span>
                  )}
                  <span className="bg-[#17201F] text-white px-1.5 py-0.5 rounded text-[11px] font-mono font-bold">
                    {flashCountdown.h}
                  </span>
                  <span>:</span>
                  <span className="bg-[#17201F] text-white px-1.5 py-0.5 rounded text-[11px] font-mono font-bold">
                    {flashCountdown.m}
                  </span>
                  <span>:</span>
                  <span className="bg-[#17201F] text-white px-1.5 py-0.5 rounded text-[11px] font-mono font-bold">
                    {flashCountdown.s}
                  </span>
                </div>
              )}
            </div>

            <Link
              href="/flash-sale"
              className="group text-[#003B2B] font-bold text-xs flex items-center gap-0.5"
            >
              <span className="group-hover:underline">Xem Tất Cả</span>
              <span className="material-symbols-outlined text-sm">
                chevron_right
              </span>
            </Link>
          </div>

          {/* Compact Flash Sale Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
            {allFlashSale.slice(0, 6).map((book) => (
              <BookCard
                key={book.id}
                book={book as any}
                variant="compact"
              />
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 4: SẢN PHẨM BÁN CHẠY (BESTSELLERS - 100% REAL)
      ========================================================================= */}
      {(allBestsellers.length > 0 || (isLoadingBooks && realBooks.length === 0)) && (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/90">
            <h2 className="text-xs sm:text-[14px] font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <span>Sản Phẩm Bán Chạy</span>
              {isLoadingBooks && realBooks.length === 0 && (
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full lowercase font-normal">
                  đang tải...
                </span>
              )}
            </h2>

            {/* Pill Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[11px] font-semibold">
              {[
                { id: "all", label: "Tất cả" },
                { id: "paper", label: "Sách giấy" },
                { id: "ebook", label: "Ebook DRM" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBestsellerTab(tab.id)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    bestsellerTab === tab.id
                      ? "bg-white text-[#003B2B] font-bold shadow-2xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
            {isLoadingBooks && realBooks.length === 0
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-2.5 border border-gray-100 flex flex-col gap-2 animate-pulse">
                    <div className="bg-gray-200 rounded-lg aspect-[3/4] w-full" />
                    <div className="h-3.5 bg-gray-200 rounded w-4/5 mt-1" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-4 bg-emerald-100 rounded w-2/3 mt-2" />
                  </div>
                ))
              : filteredBestsellers.slice(0, 6).map((book) => (
                  <BookCard
                    key={book.id}
                    book={book as any}
                    variant="compact"
                  />
                ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 5: GIAN HÀNG NXB & ĐỐI TÁC CHÍNH HÃNG (REAL PUBLISHERS)
      ========================================================================= */}
      {officialStores.length > 0 && (
        <section className="bg-gray-50/70 rounded-2xl p-3 sm:p-3.5 border border-gray-200/80 flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/60">
            <h2 className="text-xs sm:text-[14px] font-bold text-gray-900 uppercase tracking-wide">
              Gian Hàng NXB &amp; Đối Tác Chính Hãng
            </h2>
            <Link
              href="/stores"
              className="group text-[#003B2B] font-bold text-xs flex items-center gap-0.5"
            >
              <span className="group-hover:underline">Xem Tất Cả</span>
              <span className="material-symbols-outlined text-sm">
                chevron_right
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {officialStores.slice(0, 6).map((store) => {
              const isFollowed = followedShops.includes(store.name);
              return (
                <div
                  key={store.id}
                  className="bg-white rounded-xl p-2.5 border border-gray-200/80 hover:border-[#003B2B]/40 transition-all flex flex-col items-center text-center shadow-2xs group"
                >
                  <Link
                    href={`/books?publisher=${encodeURIComponent(store.slug || store.name || '')}`}
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs mb-1.5 group-hover:scale-105 transition-transform overflow-hidden bg-white border border-gray-100 text-[#003B2B]"
                  >
                    {store.logo ? (
                      <img
                        src={store.logo}
                        alt={store.name}
                        className="w-full h-full object-cover rounded-xl"
                        loading="lazy"
                      />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center bg-[#003B2B] text-white rounded-xl">
                        {store.code}
                      </span>
                    )}
                  </Link>

                  <Link
                    href={`/books?publisher=${encodeURIComponent(store.slug || store.name || '')}`}
                    className="font-bold text-[11.5px] text-gray-900 group-hover:text-[#003B2B] transition-colors truncate w-full"
                  >
                    {store.name}
                  </Link>
                  <span className="text-[9.5px] text-gray-500 mb-2 truncate w-full">
                    {store.followers}
                  </span>

                  <button
                    onClick={() => handleToggleShopFollow(store.name)}
                    className={`w-full py-1.5 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer ${
                      isFollowed
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        : "bg-emerald-50 text-[#003B2B] hover:bg-[#003B2B] hover:text-white"
                    }`}
                  >
                    {isFollowed ? "Đang theo dõi" : "Theo dõi"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 6: SÁCH NỔI BẬT THEO THỂ LOẠI (TAB BUTTON OPTIONS NGANG TƯƠNG TÁC)
      ========================================================================= */}
      {currentCategoryBooks.length > 0 && (
        <section className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-200/90 shadow-2xs flex flex-col gap-3">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-200/80">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-[14px] font-bold text-gray-900 uppercase tracking-wide">
                  {currentCategoryTabInfo.label}
                </h2>
                <span className="bg-emerald-50 text-[#003B2B] text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200/60">
                  {currentCategoryBooks.length} Tựa Sách
                </span>
              </div>
              <p className="text-[11px] text-gray-500 hidden sm:block mt-0.5">
                {currentCategoryTabInfo.description}
              </p>
            </div>

            <Link
              href={currentCategoryTabInfo.url}
              className="group text-[#003B2B] font-bold text-xs flex items-center gap-0.5 self-end sm:self-auto"
            >
              <span className="group-hover:underline">Xem Tất Cả</span>
              <span className="material-symbols-outlined text-sm">
                chevron_right
              </span>
            </Link>
          </div>

          {/* Dải Nút Option Ngang (Interactive Category Pills with Scroll Controls) */}
          <div className="relative flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleScrollTabs('left')}
              aria-label="Cuộn sang trái"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 text-gray-600 hover:text-[#003B2B] hover:border-emerald-200 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>

            <div
              ref={tabsContainerRef}
              className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 no-scrollbar scroll-smooth flex-1 select-none"
            >
              {categoryTabOptions.map((tab) => {
                const isActive = selectedCategoryTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedCategoryTab(tab.id)}
                    className={`px-3 py-1.5 sm:py-2 rounded-xl text-[11.5px] sm:text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                      isActive
                        ? "bg-[#003B2B] text-white border-[#003B2B] shadow-xs"
                        : "bg-gray-50/80 text-gray-700 border-gray-200 hover:bg-emerald-50/70 hover:text-[#003B2B] hover:border-emerald-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => handleScrollTabs('right')}
              aria-label="Cuộn sang phải"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-gray-200 bg-white hover:bg-emerald-50 text-gray-600 hover:text-[#003B2B] hover:border-emerald-200 flex items-center justify-center shrink-0 cursor-pointer shadow-2xs transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          {/* Grid Sách */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 pt-1">
            {currentCategoryBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book as any}
                variant="compact"
              />
            ))}
          </div>
        </section>
      )}

      

      {/* =========================================================================
          SECTION 11: GỢI Ý HÔM NAY (100% REAL & CÁ NHÂN HÓA BÉ CÁO AI)
      ========================================================================= */}
      {suggestedBooks.length > 0 && (
        <section className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-200/90 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between border-b-2 border-[#003b2b] pb-2">
            <h2 className="text-xs sm:text-[14px] font-bold text-[#003b2b] uppercase tracking-wide">
              Gợi Ý Hôm Nay Cho Bạn
            </h2>
            <span className="text-[11px] text-gray-500 font-medium">
              Cá nhân hóa bởi Bé Cáo AI
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
            {suggestedBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book as any}
                variant="compact"
              />
            ))}
          </div>

          <div className="pt-2 flex justify-center">
            <Link
              href="/books"
              className="px-12 py-2.5 rounded-xl border-2 border-[#003B2B] text-[#003B2B] hover:bg-[#003B2B] hover:text-white transition-all text-xs sm:text-sm font-bold shadow-2xs cursor-pointer"
            >
              Xem Thêm Sách Khác →
            </Link>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 12: TÁC GIẢ ĐƯỢC YÊU THÍCH (REAL AUTHORS TỪ CATALOG DATABASE)
      ========================================================================= */}
      {authorsList.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <div>
              <div className="text-[#003B2B] text-[11px] uppercase font-bold">
                Tác Giả &amp; Cây Bút Tri Thức
              </div>
              <h3 className="text-[15px] sm:text-[16px] font-bold text-gray-900 mt-0.5">
                Tác Giả Nổi Bật Trong Thư Viện
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setAuthorIndex((prev) => Math.max(0, prev - 1))}
                disabled={authorIndex === 0}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Tác giả trước"
              >
                <span className="material-symbols-outlined text-[18px]">
                  chevron_left
                </span>
              </button>
              <button
                onClick={() =>
                  setAuthorIndex((prev) => Math.min(maxAuthorIndex, prev + 1))
                }
                disabled={authorIndex >= maxAuthorIndex}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Tác giả tiếp theo"
              >
                <span className="material-symbols-outlined text-[18px]">
                  chevron_right
                </span>
              </button>
            </div>
          </div>

          <div
            className="overflow-hidden"
            onMouseEnter={() => setIsAuthorHovered(true)}
            onMouseLeave={() => setIsAuthorHovered(false)}
          >
            <div
              className="flex transition-transform duration-500 ease-out gap-3"
              style={{
                transform: `translateX(-calc(${authorIndex} * (100% / ${itemsPerPage}) + ${authorIndex * 12}px))`,
              }}
            >
              {authorsList.map((author) => {
                const isFollowed = followedAuthors.includes(author.name);
                return (
                  <div
                    key={author.id}
                    className="w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(20%-9.6px)] shrink-0 bg-white rounded-xl p-3 border border-gray-200/90 flex flex-col items-center text-center shadow-2xs hover:shadow-sm hover:border-[#003B2B]/40 transition-all group"
                  >
                    <Link
                      href={`/books?search=${encodeURIComponent(author.name)}`}
                      className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-100 mb-2 p-0.5 group-hover:border-[#003B2B] transition-colors"
                    >
                      <img
                        src={author.avatar}
                        alt={author.name}
                        className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform"
                      />
                    </Link>

                    <Link
                      href={`/books?search=${encodeURIComponent(author.name)}`}
                      className="font-bold text-[12.5px] text-gray-900 group-hover:text-[#003B2B] transition-colors line-clamp-1"
                    >
                      {author.name}
                    </Link>
                    <span className="text-[10px] text-gray-500 mb-2">
                      {author.books}
                    </span>

                    <button
                      onClick={() => handleToggleAuthorFollow(author.name)}
                      className={`w-full py-1.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                        isFollowed
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          : "bg-emerald-50 text-[#003B2B] hover:bg-[#003B2B] hover:text-white"
                      }`}
                    >
                      {isFollowed ? "Đang theo dõi" : "Theo dõi"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 13: ĐÁNH GIÁ THỰC TẾ TỪ NGƯỜI MUA (CHỈ HIỆN KHI CÓ REVIEW THẬT)
      ========================================================================= */}
      {realReviews.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <div>
              <div className="text-[#003B2B] text-[11px] uppercase font-bold">
                Đánh Giá Thực Tế Từ Người Mua
              </div>
              <h3 className="text-[15px] sm:text-[16px] font-bold text-gray-900 mt-0.5">
                Cảm Nhận Từ Độc Giả Đã Mua Sách
              </h3>
            </div>
            <Link
              href="/books"
              className="group text-[12.5px] text-[#003B2B] font-semibold flex items-center gap-0.5"
            >
              <span className="group-hover:underline">Xem sách đánh giá cao</span>
              <span className="material-symbols-outlined text-[16px]">
                chevron_right
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {realReviews.slice(0, 6).map((rev, idx) => {
              const bookHref = rev.bookSlug
                ? `/book/${rev.bookSlug}`
                : rev.bookId
                ? `/book/${rev.bookId}`
                : "/books";
              const likesCount = Number(rev.likesCount ?? rev.helpfulCount ?? 0);
              const commentsCount = Number(
                rev.commentsCount ?? (Array.isArray(rev.replies) ? rev.replies.length : 0),
              );
              const avatarSrc = rev.author?.avatar || rev.authorAvatar || null;
              const authorName = rev.author?.fullName || rev.author?.name || 'Độc giả HUKI';

              return (
                <Link
                  key={rev.id || idx}
                  href={bookHref}
                  className="group bg-white rounded-2xl p-4 border border-gray-200/90 shadow-2xs hover:shadow-md hover:border-[#003B2B]/40 transition-all grid grid-cols-[1fr_88px] sm:grid-cols-[1fr_100px] gap-3.5 items-stretch"
                >
                  {/* Cột Trái: Thông tin độc giả, đánh giá, lượt thích & bình luận */}
                  <div className="flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <UserAvatar
                          src={avatarSrc}
                          name={authorName}
                          size="md"
                          className="ring-1 ring-[#003B2B]/15"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-[12.5px] text-gray-900 truncate">
                            {authorName}
                          </h4>
                          <span className="text-[10.5px] text-gray-500 block truncate">
                            {rev.bookTitle ? `Đã mua: ${rev.bookTitle}` : "Đã mua sách trên HUKI"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: Math.min(5, Math.max(1, Math.round(rev.rating || 5))) }).map((_, sIdx) => (
                            <span
                              key={sIdx}
                              className="material-symbols-outlined text-[13px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              star
                            </span>
                          ))}
                        </div>
                        {rev.verifiedPurchase && (
                          <span className="text-[10px] font-semibold text-[#006953] bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">
                            Đã xác thực
                          </span>
                        )}
                      </div>

                      <p className="text-[12px] text-gray-700 leading-relaxed italic line-clamp-3">
                        &ldquo;{rev.content || rev.title}&rdquo;
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2 text-gray-500 text-[11px]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-gray-600" title="Lượt thích / Hữu ích">
                          <span className="material-symbols-outlined text-[13px] text-[#006953]">thumb_up</span>
                          {likesCount}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-gray-600" title="Bình luận / Phản hồi">
                          <span className="material-symbols-outlined text-[13px] text-amber-600">chat_bubble_outline</span>
                          {commentsCount}
                        </span>
                        <span className="text-[10px] text-gray-400 hidden sm:inline truncate" suppressHydrationWarning>
                          {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('vi-VN') : ''}
                        </span>
                      </div>
                      <span className="text-[#003B2B] font-semibold flex items-center gap-0.5 shrink-0">
                        <span className="group-hover:underline">Xem sách</span>
                        <span className="material-symbols-outlined text-[12px] transition-transform group-hover:translate-x-0.5">
                          arrow_forward
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Cột Phải: 1 cột riêng hiển thị ảnh bìa cuốn sách */}
                  <div className="w-[88px] sm:w-[100px] rounded-xl overflow-hidden border border-gray-200/80 bg-[#f6f4ef] flex items-center justify-center shrink-0 relative">
                    {rev.bookCover ? (
                      <img
                        src={rev.bookCover}
                        alt={rev.bookTitle || 'Bìa sách HUKI'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 p-2 text-center text-[#006953]/60">
                        <span className="material-symbols-outlined text-2xl">auto_stories</span>
                        <span className="text-[9.5px] font-semibold line-clamp-2">{rev.bookTitle || 'HuKi Book'}</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
