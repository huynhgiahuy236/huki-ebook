import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { businessApi } from '../../api/businessApi';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

// Số lượng phần tử mỗi trang
const PUBLISHERS_PER_PAGE = 6;
const AUTHORS_PER_PAGE = 8;

// Danh mục tác giả mẫu
const INITIAL_AUTHORS = [
  {
    id: 'james-clear',
    name: 'James Clear',
    title: 'Tác giả & Chuyên gia Hành vi học',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    coverBg: 'from-amber-600/20 to-amber-900/10',
    followersCount: '58.4k',
    worksCount: 4,
    rating: 4.98,
    category: 'Phát triển bản thân & Năng suất',
    description: 'Tác giả cuốn sách bán chạy số 1 toàn cầu "Atomic Habits" với hơn 15 triệu bản in trên toàn thế giới.',
    notableWorks: ['Atomic Habits', 'The Clear Habit Journal', 'Transform Habits'],
    isVerified: true,
    isMock: true
  },
  {
    id: 'morgan-housel',
    name: 'Morgan Housel',
    title: 'Cựu chuyên gia tài chính The Wall Street Journal',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    coverBg: 'from-emerald-600/20 to-emerald-900/10',
    followersCount: '42.1k',
    worksCount: 3,
    rating: 4.95,
    category: 'Tài chính & Đầu tư',
    description: 'Tác giả cuốn sách kinh điển "Tâm Lý Học Về Tiền", chuyên gia về hành vi tài chính và quyết định đầu tư.',
    notableWorks: ['Tâm Lý Học Về Tiền', 'Same as Ever', 'The Psychology of Money'],
    isVerified: true,
    isMock: true
  },
  {
    id: 'yuval-noah-harari',
    name: 'Yuval Noah Harari',
    title: 'Giáo sư Lịch sử Đại học Hebrew',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    coverBg: 'from-blue-600/20 to-blue-900/10',
    followersCount: '65.8k',
    worksCount: 5,
    rating: 4.92,
    category: 'Lịch sử & Triết học tương lai',
    description: 'Tác giả bộ ba sách lịch sử nhân loại đình đám: Sapiens, Homo Deus và 21 Bài học cho thế kỷ 21.',
    notableWorks: ['Sapiens: Lược Sử Loài Người', 'Homo Deus', '21 Bài Học Cho Thế Kỷ 21'],
    isVerified: true,
    isMock: true
  },
  {
    id: 'nguyen-nhat-anh',
    name: 'Nguyễn Nhật Ánh',
    title: 'Nhà văn Tuổi trẻ & Ký ức',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    coverBg: 'from-teal-600/20 to-teal-900/10',
    followersCount: '92.3k',
    worksCount: 32,
    rating: 4.97,
    category: 'Văn học thanh thiếu niên',
    description: 'Nhà văn được yêu thích bậc nhất Việt Nam với những câu chuyện trong trẻo, hoài niệm về tuổi học trò.',
    notableWorks: ['Mắt Biếc', 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh', 'Cho Tôi Xin Một Vé Đi Tuổi Thơ'],
    isVerified: true,
    isMock: true
  },
  {
    id: 'thich-nhat-hanh',
    name: 'Thiền sư Thích Nhất Hạnh',
    title: 'Thiền sư & Tác giả Chánh niệm',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    coverBg: 'from-orange-600/20 to-orange-900/10',
    followersCount: '88.5k',
    worksCount: 24,
    rating: 4.99,
    category: 'Tâm thức & Tỉnh thức',
    description: 'Bậc thầy về chánh niệm, tác giả của hàng chục cuốn sách nuôi dưỡng tâm hồn và chữa lành thế giới.',
    notableWorks: ['Phép Lạ Của Sự Tỉnh Thức', 'Giận', 'An Lạc Từng Bước Chân'],
    isVerified: true,
    isMock: true
  },
  {
    id: 'paulo-coelho',
    name: 'Paulo Coelho',
    title: 'Nhà văn biểu tượng văn học',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    coverBg: 'from-purple-600/20 to-purple-900/10',
    followersCount: '71.2k',
    worksCount: 12,
    rating: 4.94,
    category: 'Văn học & Hiện sinh',
    description: 'Tác giả kiệt tác "Nhà Giả Kim" - một trong những cuốn sách bán chạy nhất mọi thời đại được dịch ra 80+ thứ tiếng.',
    notableWorks: ['Nhà Giả Kim', 'Phù Thủy Phố Portobello', 'Cơn Lốc Cuộc Đời'],
    isVerified: true,
    isMock: true
  },
  {
    id: 'bill-gates',
    name: 'Bill Gates',
    title: 'Nhà sáng lập Microsoft & Tác giả',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
    coverBg: 'from-cyan-600/20 to-cyan-900/10',
    followersCount: '49.0k',
    worksCount: 4,
    rating: 4.88,
    category: 'Công nghệ & Tương lai',
    description: 'Đồng sáng lập Microsoft, chia sẻ những tầm nhìn chiến lược về chuyển dịch công nghệ và khí hậu.',
    notableWorks: ['Con Đường Phía Trước', 'Cách Tránh Thảm Họa Khí Hậu', 'Kinh Doanh Thời Đại Số'],
    isVerified: true,
    isMock: true
  },
  {
    id: 'cal-newport',
    name: 'Cal Newport',
    title: 'Giáo sư Khoa học Máy tính',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
    coverBg: 'from-rose-600/20 to-rose-900/10',
    followersCount: '36.8k',
    worksCount: 6,
    rating: 4.89,
    category: 'Năng suất & Tư duy làm việc',
    description: 'Nhà tư tưởng hàng đầu về hiệu suất làm việc sâu và tác hại của sự phân tâm công nghệ trong kỷ nguyên số.',
    notableWorks: ['Deep Work: Làm Ra Làm, Chơi Ra Chơi', 'So Good They Can\'t Ignore You', 'Digital Minimalism'],
    isVerified: true,
    isMock: true
  }
];

// Danh sách nhà xuất bản đối tác mẫu
const DEFAULT_PARTNER_PUBLISHERS = [
  {
    id: 'alpha-books',
    name: 'Alpha Books Official',
    slug: 'alpha-books',
    category: 'Kinh tế & Quản trị',
    logo: null,
    banner: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80',
    rating: 4.95,
    reviewsCount: '18.4k',
    followersCount: '39.1k',
    totalBooks: 48,
    description: 'Nhà xuất bản hàng đầu Việt Nam về sách Kinh tế, Quản trị kinh doanh, Khởi nghiệp và Kỹ năng lãnh đạo.',
    address: 'Hà Nội & TP. Hồ Chí Minh',
    responseRate: '99%',
    isVerified: true,
    isMock: true
  },
  {
    id: 'nxb-tre',
    name: 'NXB Trẻ',
    slug: 'nxb-tre',
    category: 'Văn học & Tri thức',
    logo: null,
    banner: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80',
    rating: 4.98,
    reviewsCount: '24.2k',
    followersCount: '42.5k',
    totalBooks: 120,
    description: 'Thương hiệu xuất bản uy tín lâu đời với hàng ngàn đầu sách văn học, khoa học xã hội và tư duy trẻ.',
    address: '161B Lý Chính Thắng, Q.3, TP. Hồ Chí Minh',
    responseRate: '98%',
    isVerified: true,
    isMock: true
  },
  {
    id: 'nha-nam',
    name: 'Nhã Nam',
    slug: 'nha-nam',
    category: 'Văn học & Nghệ thuật',
    logo: null,
    banner: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
    rating: 4.99,
    reviewsCount: '38.0k',
    followersCount: '68.2k',
    totalBooks: 95,
    description: 'Không gian của những tác phẩm văn học kinh điển, triết học hiện đại và sách tranh nghệ thuật tinh tuyển.',
    address: 'Tô Ngọc Vân, Tây Hồ, Hà Nội',
    responseRate: '99%',
    isVerified: true,
    isMock: true
  },
  {
    id: 'nxb-kim-dong',
    name: 'NXB Kim Đồng',
    slug: 'nxb-kim-dong',
    category: 'Thiếu nhi & Truyện tranh',
    logo: null,
    banner: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
    rating: 4.96,
    reviewsCount: '31.5k',
    followersCount: '51.9k',
    totalBooks: 140,
    description: 'Nhà xuất bản thiếu nhi lớn nhất Việt Nam, sở hữu bản quyền các bộ truyện tranh và sách giáo dục nổi tiếng.',
    address: '55 Quang Trung, Hai Bà Trưng, Hà Nội',
    responseRate: '99%',
    isVerified: true,
    isMock: true
  },
  {
    id: 'first-news',
    name: 'First News Trí Việt',
    slug: 'first-news',
    category: 'Hạt giống tâm hồn',
    logo: null,
    banner: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80',
    rating: 4.94,
    reviewsCount: '21.0k',
    followersCount: '45.8k',
    totalBooks: 64,
    description: 'Đơn vị tiên phong bảo vệ bản quyền sách và truyền cảm hứng sống tích cực với tủ sách Hạt Giống Tâm Hồn.',
    address: '11H Nguyễn Thị Minh Khai, Q.1, TP. Hồ Chí Minh',
    responseRate: '97%',
    isVerified: true,
    isMock: true
  },
  {
    id: 'thai-ha-books',
    name: 'Thái Hà Books',
    slug: 'thai-ha-books',
    category: 'Phật pháp & Khởi nghiệp',
    logo: null,
    banner: 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd3?auto=format&fit=crop&w=800&q=80',
    rating: 4.92,
    reviewsCount: '15.6k',
    followersCount: '29.3k',
    totalBooks: 52,
    description: 'Chuyên sâu các dòng sách văn hóa đọc, Phật pháp ứng dụng, kinh tế tri thức và giáo dục gia đình.',
    address: 'Phạm Văn Đồng, Cầu Giấy, Hà Nội',
    responseRate: '98%',
    isVerified: true,
    isMock: true
  }
];

export default function StoresPage() {
  const [params, setParams] = useSearchParams();
  const { showToast } = useToast();
  const { isLoggedIn } = useAuth();

  const activeTab = params.get('tab') === 'authors' ? 'authors' : 'publishers';
  const searchQuery = params.get('q') || '';
  const selectedCategory = params.get('category') || 'all';
  const filterFollowing = params.get('filter') === 'following';
  const currentPage = Math.max(1, parseInt(params.get('page') || '1', 10));

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [realBusinesses, setRealBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followedIds, setFollowedIds] = useState(() => {
    try {
      const raw = localStorage.getItem('huki_followed_stores');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Đồng bộ searchInput khi URL q thay đổi từ bên ngoài
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // 1. Tải danh sách Doanh nghiệp/NXB thực tế từ backend
  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await businessApi.getPublicBusinesses({ limit: 50 });
      if (res && res.success && Array.isArray(res.data)) {
        setRealBusinesses(res.data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Tải danh sách ID đã theo dõi từ backend nếu đã đăng nhập
  const loadFollowed = useCallback(async () => {
    let localMap = {};
    try {
      const raw = localStorage.getItem('huki_followed_stores');
      if (raw) localMap = JSON.parse(raw);
    } catch {
      localMap = {};
    }

    if (isLoggedIn) {
      try {
        const res = await businessApi.getMyFollowedBusinessIds();
        if (res && res.success && Array.isArray(res.data)) {
          const merged = { ...localMap };
          res.data.forEach(id => {
            merged[id] = true;
          });
          setFollowedIds(merged);
          try {
            localStorage.setItem('huki_followed_stores', JSON.stringify(merged));
          } catch { }
          return;
        }
      } catch {
        // Fallback to local
      }
    }
    setFollowedIds(localMap);
  }, [isLoggedIn]);

  useEffect(() => {
    loadBusinesses();
    loadFollowed();
  }, [loadBusinesses, loadFollowed]);

  // Hợp nhất danh sách NXB (Real Doanh nghiệp từ DB lên đầu, sau đó đến đối tác mẫu)
  const combinedAllPublishers = useMemo(() => {
    const combined = [];

    // 1.1 Thêm các Doanh nghiệp thực tế từ DB (isMock: false)
    realBusinesses.forEach(biz => {
      combined.push({
        id: biz.id,
        name: biz.name,
        slug: biz.slug || biz.id,
        category: 'Doanh nghiệp Xuất bản',
        logo: biz.logo || null,
        banner: biz.banner || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80',
        rating: 5.0,
        reviewsCount: 'Mới',
        followersCount: '1.2k',
        totalBooks: 12,
        description: biz.description || 'Gian hàng chính hãng đã được xác thực giấy phép xuất bản bởi HUKI.',
        address: biz.address || 'Việt Nam',
        responseRate: '100%',
        isVerified: true,
        isMock: false
      });
    });

    // 1.2 Thêm các NXB đối tác mẫu (isMock: true)
    DEFAULT_PARTNER_PUBLISHERS.forEach(partner => {
      const alreadyAdded = combined.some(p => p.id === partner.id || p.slug === partner.slug || p.name.toLowerCase() === partner.name.toLowerCase());
      if (!alreadyAdded) {
        combined.push(partner);
      }
    });

    return combined;
  }, [realBusinesses]);

  // Danh sách NXB sau khi lọc theo search, category và trạng thái follow
  const publishersList = useMemo(() => {
    let list = combinedAllPublishers;

    if (filterFollowing) {
      list = list.filter(pub => Boolean(followedIds[pub.id] || (pub.slug && followedIds[pub.slug])));
    }

    return list.filter(pub => {
      const matchSearch = !searchQuery ||
        pub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pub.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || pub.category.toLowerCase().includes(selectedCategory.toLowerCase());
      return matchSearch && matchCat;
    });
  }, [combinedAllPublishers, filterFollowing, followedIds, searchQuery, selectedCategory]);

  // Đếm tổng số NXB đang theo dõi
  const followedPublishersCount = useMemo(() => {
    return combinedAllPublishers.filter(p => Boolean(followedIds[p.id] || (p.slug && followedIds[p.slug]))).length;
  }, [combinedAllPublishers, followedIds]);

  // Danh sách tác giả lọc
  const authorsList = useMemo(() => {
    let list = INITIAL_AUTHORS;
    if (filterFollowing) {
      list = list.filter(author => Boolean(followedIds[author.id]));
    }

    return list.filter(author => {
      const matchSearch = !searchQuery ||
        author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        author.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        author.notableWorks.some(w => w.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = selectedCategory === 'all' || author.category.toLowerCase().includes(selectedCategory.toLowerCase());
      return matchSearch && matchCat;
    });
  }, [filterFollowing, followedIds, searchQuery, selectedCategory]);

  // Đếm tổng số tác giả đang theo dõi
  const followedAuthorsCount = useMemo(() => {
    return INITIAL_AUTHORS.filter(a => Boolean(followedIds[a.id])).length;
  }, [followedIds]);

  // Phân trang dữ liệu
  const currentItems = activeTab === 'publishers' ? publishersList : authorsList;
  const itemsPerPage = activeTab === 'publishers' ? PUBLISHERS_PER_PAGE : AUTHORS_PER_PAGE;
  const totalPages = Math.ceil(currentItems.length / itemsPerPage) || 1;
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (validPage - 1) * itemsPerPage;
    return currentItems.slice(startIndex, startIndex + itemsPerPage);
  }, [currentItems, validPage, itemsPerPage]);

  // Điều hướng chuyển trang
  const handlePageChange = (newPage) => {
    const next = new URLSearchParams(params);
    next.set('page', String(newPage));
    setParams(next);
    window.scrollTo({ top: 320, behavior: 'smooth' });
  };

  // Điều hướng chuyển tab
  const handleTabChange = (tabName) => {
    const next = new URLSearchParams(params);
    next.set('tab', tabName);
    next.delete('page'); // Reset về trang 1 khi đổi tab
    next.delete('category'); // Reset bộ lọc chuyên mục khi đổi tab
    setParams(next);
  };

  // Điều hướng bật/tắt bộ lọc Đang theo dõi
  const updateFilterFollowing = (isFollowing) => {
    const next = new URLSearchParams(params);
    if (isFollowing) {
      next.set('filter', 'following');
    } else {
      next.delete('filter');
    }
    next.delete('page');
    setParams(next);
  };

  // Tìm kiếm form submit
  const handleSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (searchInput.trim()) {
      next.set('q', searchInput.trim());
    } else {
      next.delete('q');
    }
    next.delete('page');
    setParams(next);
  };

  // Cập nhật category
  const updateCategory = (cat) => {
    const next = new URLSearchParams(params);
    if (cat === 'all') {
      next.delete('category');
    } else {
      next.set('category', cat);
    }
    next.delete('page');
    setParams(next);
  };

  // Toggle theo dõi
  const toggleFollow = async (id, name, isMock = false, slug = null) => {
    const isCurrentlyFollowed = Boolean(followedIds[id] || (slug && followedIds[slug]));
    const nextState = !isCurrentlyFollowed;

    // 1. Optimistic Update (UI & LocalStorage)
    setFollowedIds(prev => {
      const updated = { ...prev };
      if (nextState) {
        updated[id] = true;
        if (slug) updated[slug] = true;
      } else {
        delete updated[id];
        if (slug) delete updated[slug];
      }
      try {
        localStorage.setItem('huki_followed_stores', JSON.stringify(updated));
      } catch { }
      return updated;
    });

    if (nextState) {
      showToast(`Đã theo dõi ${name}! Bạn sẽ nhận được thông báo sách mới phát hành.`, 'success');
    } else {
      showToast(`Đã bỏ theo dõi ${name}.`, 'info');
    }

    // 2. Sync to Backend if logged in and not mock
    if (isLoggedIn && !isMock) {
      try {
        if (nextState) {
          await businessApi.followBusiness(id);
        } else {
          await businessApi.unfollowBusiness(id);
        }
      } catch (err) {
        console.warn('Sync follow to backend failed:', err);
      }
    }
  };

  return (
    <main className="min-h-screen bg-surface-container-lowest pb-16">
      {/* =========================================================================
            HERO BANNER CHUẨN HUB QUỐC TẾ
        ========================================================================= */}
      <section className="relative bg-gradient-to-r from-primary to-primary-container text-white py-12 px-4 sm:px-6 lg:px-8 overflow-hidden shadow-sm">
        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-96 h-96 rounded-full bg-tertiary/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-tertiary-fixed text-xs font-bold uppercase tracking-wider backdrop-blur-md mb-3">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                Không Gian Tinh Hoa Bản Quyền
              </span>
              <h1 className="font-editorial text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                Nhà Xuất Bản & Tác Giả Đồng Hành
              </h1>
              <p className="text-white/80 text-sm sm:text-base leading-relaxed">
                Khám phá hệ sinh thái hơn 50+ Nhà xuất bản chính hãng, Doanh nghiệp phát hành cùng đội ngũ tác giả danh tiếng trong nước và quốc tế trên nền tảng HuKi Ebook.
              </p>
            </div>

            {/* Hub Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 text-center">
                <span className="block font-editorial text-2xl font-bold text-tertiary-fixed">
                  {realBusinesses.length + DEFAULT_PARTNER_PUBLISHERS.length}+
                </span>
                <span className="text-[11px] text-white/75 font-medium">NXB & Doanh Nghiệp</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 text-center">
                <span className="block font-editorial text-2xl font-bold text-tertiary-fixed">150+</span>
                <span className="text-[11px] text-white/75 font-medium">Tác Giả & Dịch Giả</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 text-center col-span-2 sm:col-span-1">
                <span className="block font-editorial text-2xl font-bold text-tertiary-fixed">100%</span>
                <span className="text-[11px] text-white/75 font-medium">Sách Bản Quyền DRM</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
            HUB NAVIGATION TABS & SEARCH CONTROLS
        ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Main Segment Tabs */}
          <div className="flex items-center gap-2 border-b md:border-b-0 border-outline-variant/30 pb-3 md:pb-0 overflow-x-auto">
            <button
              onClick={() => handleTabChange('publishers')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'publishers'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">apartment</span>
              <span>Nhà Xuất Bản & Doanh Nghiệp</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${activeTab === 'publishers' ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'
                }`}>
                {publishersList.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('authors')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'authors'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">person_star</span>
              <span>Tác Giả & Dịch Giả</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${activeTab === 'authors' ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'
                }`}>
                {authorsList.length}
              </span>
            </button>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 min-w-[260px] sm:min-w-[320px]">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (!e.target.value) {
                    const next = new URLSearchParams(params);
                    next.delete('q');
                    next.delete('page');
                    setParams(next);
                  }
                }}
                placeholder={activeTab === 'publishers' ? "Tìm theo tên NXB, giấy phép..." : "Tìm tác giả, tác phẩm tiêu biểu..."}
                className="w-full pl-9 pr-8 py-2 text-xs bg-surface-container-low border border-outline-variant/40 rounded-xl focus:outline-hidden focus:border-primary text-on-surface placeholder:text-on-surface-variant/60"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant">
                search
              </span>
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    const next = new URLSearchParams(params);
                    next.delete('q');
                    next.delete('page');
                    setParams(next);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer shrink-0"
            >
              Tìm
            </button>
          </form>
        </div>
      </section>

      {/* =========================================================================
            CONTENT SECTION: PUBLISHERS OR AUTHORS GRID WITH PAGINATION
        ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* TAB 1: PUBLISHERS DIRECTORY */}
        {activeTab === 'publishers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-editorial text-2xl font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">storefront</span>
                  Gian Hàng NXB & Đối Tác Phát Hành
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Tất cả các gian hàng đều sở hữu giấy phép kinh doanh xuất bản và phát hành sách số hợp pháp.
                </p>
              </div>

              {/* Filter Controls: Follow Filter Toggle & Category Pills */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* 1. Toggle Tất cả vs Đang theo dõi */}
                <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs">
                  <button
                    type="button"
                    onClick={() => updateFilterFollowing(false)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${!filterFollowing
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    Tất cả NXB
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFilterFollowing(true)}
                    className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${filterFollowing
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-amber-700'
                      }`}
                  >
                    <span className="material-symbols-outlined text-sm">star</span>
                    <span>Đang theo dõi</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${filterFollowing ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                      {followedPublishersCount}
                    </span>
                  </button>
                </div>

                {/* 2. Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {['all', 'Kinh tế', 'Văn học', 'Thiếu nhi', 'Tâm hồn', 'Phật pháp'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => updateCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${(cat === 'all' && selectedCategory === 'all') || selectedCategory === cat
                        ? 'bg-primary text-on-primary font-bold shadow-xs'
                        : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant hover:border-primary'
                        }`}
                    >
                      {cat === 'all' ? 'Tất cả lĩnh vực' : cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Publishers Grid */}
            {loading ? (
              <div className="py-20 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-2">
                  progress_activity
                </span>
                <p className="text-xs font-semibold">Đang tải danh bạ Nhà xuất bản…</p>
              </div>
            ) : publishersList.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-outline-variant mb-2">apartment</span>
                <h3 className="font-bold text-base text-on-surface">Không tìm thấy Nhà xuất bản phù hợp</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  {filterFollowing
                    ? 'Bạn chưa theo dõi Nhà xuất bản nào trong danh mục này.'
                    : 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.'}
                </p>
                <button
                  onClick={() => {
                    const next = new URLSearchParams();
                    next.set('tab', 'publishers');
                    setParams(next);
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Xem tất cả Nhà xuất bản
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedItems.map((pub) => {
                    const isFollowed = Boolean(followedIds[pub.id] || (pub.slug && followedIds[pub.slug]));
                    const isMock = Boolean(pub.isMock);
                    const mockClasses = isMock
                      ? 'opacity-40 select-none relative cursor-not-allowed pointer-events-none'
                      : 'shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer';

                    return (
                      <article
                        key={pub.id}
                        className={`bg-surface-container-lowest rounded-2xl border border-outline-variant/40 overflow-hidden transition-all duration-300 flex flex-col justify-between group relative ${mockClasses}`}
                      >
                        {/* Banner Header */}
                        <div className="relative h-28 bg-surface-container-low overflow-hidden">
                          <img
                            src={pub.banner}
                            alt={pub.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                          {isMock ? (
                            <span className="absolute top-2.5 right-2.5 z-20 bg-blue-100 text-blue-800 border border-blue-200 text-[9px] font-bold px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
                              MẪU (MOCK)
                            </span>
                          ) : (
                            <span className="absolute top-2.5 left-2.5 z-20 bg-primary/90 backdrop-blur-xs text-white text-[9.5px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">verified</span>
                              DOANH NGHIỆP THẬT
                            </span>
                          )}

                          {!isMock && (
                            <span className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[10.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                              <span className="material-symbols-outlined text-xs text-amber-400 fill">star</span>
                              {pub.rating} ({pub.reviewsCount})
                            </span>
                          )}
                        </div>

                        {/* Content Body */}
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                          <div>
                            {/* Logo & Follow Button Row */}
                            <div className="flex items-start justify-between gap-3 -mt-10 mb-3">
                              <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest p-1 border-2 border-surface-container-lowest shadow-md shrink-0 flex items-center justify-center overflow-hidden ring-1 ring-outline-variant/30 z-10">
                                {pub.logo ? (
                                  <img src={pub.logo} alt={pub.name} className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                  <div className="w-full h-full rounded-xl bg-primary text-on-primary font-bold text-xl flex items-center justify-center">
                                    {pub.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleFollow(pub.id, pub.name, isMock, pub.slug)}
                                className={`mt-6 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${isFollowed
                                  ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                                  : 'border border-primary text-primary hover:bg-primary/10'
                                  }`}
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {isFollowed ? 'check' : 'add'}
                                </span>
                                <span>{isFollowed ? 'Đang theo dõi' : 'Theo dõi'}</span>
                              </button>
                            </div>

                            {/* Store Name & Category */}
                            <div className="mb-2">
                              <Link to={`/shop/${pub.slug || pub.id}`} className="hover:text-primary transition-colors block">
                                <h3 className="font-editorial text-lg font-bold text-on-surface leading-tight line-clamp-1 group-hover:text-primary">
                                  {pub.name}
                                </h3>
                              </Link>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-primary">
                                  <span className="material-symbols-outlined text-[13px]">verified</span>
                                  NXB Chính Hãng
                                </span>
                                <span className="text-[10.5px] text-on-surface-variant/80 bg-surface-container px-2 py-0.5 rounded-md">
                                  {pub.category}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed mb-4 min-h-[32px]">
                              {pub.description}
                            </p>

                            {/* Quick Stats Grid */}
                            <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-2.5 rounded-xl text-[11px] text-on-surface-variant mb-4">
                              <div>
                                <span className="block text-outline text-[10px]">Quy mô:</span>
                                <strong className="text-on-surface">{pub.totalBooks} đầu sách</strong>
                              </div>
                              <div>
                                <span className="block text-outline text-[10px]">Người theo dõi:</span>
                                <strong className="text-on-surface">{pub.followersCount}</strong>
                              </div>
                            </div>
                          </div>

                          {/* Action CTA Button */}
                          <div className="pt-2 border-t border-outline-variant/30">
                            <Link
                              to={`/shop/${pub.slug || pub.id}`}
                              className="w-full py-2.5 px-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">storefront</span>
                              <span>Xem Gian Hàng</span>
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Phân Trang (Pagination Controls) */}
                {totalPages > 1 && (
                  <div className="mt-8 pt-5 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-on-surface-variant">
                      Hiển thị <span className="font-semibold text-on-surface">{(validPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-on-surface">{Math.min(validPage * itemsPerPage, currentItems.length)}</span> trong tổng số <span className="font-semibold text-on-surface">{currentItems.length}</span> doanh nghiệp
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={validPage <= 1}
                        onClick={() => handlePageChange(validPage - 1)}
                        className="w-8 h-8 rounded-xl border border-outline-variant/40 flex items-center justify-center text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        aria-label="Trang trước"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        const isActive = p === validPage;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handlePageChange(p)}
                            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${isActive
                              ? 'bg-primary text-on-primary shadow-xs scale-105'
                              : 'border border-outline-variant/40 text-on-surface hover:bg-surface-container-low'
                              }`}
                          >
                            {p}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        disabled={validPage >= totalPages}
                        onClick={() => handlePageChange(validPage + 1)}
                        className="w-8 h-8 rounded-xl border border-outline-variant/40 flex items-center justify-center text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        aria-label="Trang sau"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: AUTHORS DIRECTORY */}
        {activeTab === 'authors' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-editorial text-2xl font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">person_star</span>
                  Tác Giả Được Yêu Thích Nhất
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Theo dõi tác giả để nhận thông báo tác phẩm mới phát hành, trích dẫn tinh hoa và giao lưu trực tuyến.
                </p>
              </div>

              {/* Filter Controls: Follow Toggle & Tags */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Toggle Tất cả vs Đang theo dõi */}
                <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs">
                  <button
                    type="button"
                    onClick={() => updateFilterFollowing(false)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${!filterFollowing
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    Tất cả Tác giả
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFilterFollowing(true)}
                    className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${filterFollowing
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-amber-700'
                      }`}
                  >
                    <span className="material-symbols-outlined text-sm">star</span>
                    <span>Đang theo dõi</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${filterFollowing ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                      {followedAuthorsCount}
                    </span>
                  </button>
                </div>

                {/* Filter tags */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {['all', 'Phát triển bản thân', 'Tài chính', 'Lịch sử', 'Văn học', 'Tâm thức'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => updateCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${(cat === 'all' && selectedCategory === 'all') || selectedCategory === cat
                        ? 'bg-primary text-on-primary font-bold shadow-xs'
                        : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant hover:border-primary'
                        }`}
                    >
                      {cat === 'all' ? 'Tất cả thể loại' : cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Authors Grid */}
            {authorsList.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-outline-variant mb-2">person_search</span>
                <h3 className="font-bold text-base text-on-surface">Không tìm thấy Tác giả phù hợp</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  {filterFollowing
                    ? 'Bạn chưa theo dõi Tác giả nào trong danh mục này.'
                    : 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.'}
                </p>
                <button
                  onClick={() => {
                    const next = new URLSearchParams();
                    next.set('tab', 'authors');
                    setParams(next);
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Xem tất cả Tác giả
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {paginatedItems.map((author) => {
                    const isFollowed = Boolean(followedIds[author.id]);
                    const isMock = Boolean(author.isMock);
                    const mockClasses = isMock
                      ? 'opacity-40 select-none relative cursor-not-allowed pointer-events-none'
                      : 'shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer';

                    return (
                      <article
                        key={author.id}
                        className={`bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-5 transition-all duration-300 flex flex-col justify-between text-center group relative ${mockClasses}`}
                      >
                        {/* MOCK BADGE */}
                        {isMock && (
                          <span className="absolute top-3 right-3 z-20 bg-blue-100 text-blue-800 border border-blue-200 text-[8.5px] font-bold px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
                            MẪU (MOCK)
                          </span>
                        )}

                        <div>
                          {/* Avatar with gradient halo */}
                          <div className="relative w-20 h-20 mx-auto mb-3">
                            <div className={`w-full h-full rounded-full p-1 bg-gradient-to-tr ${author.coverBg} border-2 border-primary/40 shadow-xs`}>
                              <img
                                src={author.avatar}
                                alt={author.name}
                                className="w-full h-full object-cover rounded-full"
                              />
                            </div>
                            {author.isVerified && (
                              <span className="absolute bottom-0 right-0 bg-primary text-on-primary rounded-full p-0.5 shadow-xs" title="Tác giả xác thực">
                                <span className="material-symbols-outlined text-xs block">verified</span>
                              </span>
                            )}
                          </div>

                          <h3 className="font-editorial text-lg font-bold text-on-surface group-hover:text-primary transition-colors leading-tight">
                            {author.name}
                          </h3>
                          <span className="text-[11px] text-primary font-semibold block mt-0.5 line-clamp-1">
                            {author.title}
                          </span>

                          <p className="text-xs text-on-surface-variant line-clamp-2 mt-2 leading-relaxed">
                            {author.description}
                          </p>

                          {/* Top notable works */}
                          <div className="mt-3 pt-3 border-t border-outline-variant/20 text-left">
                            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1.5">
                              Tác phẩm tiêu biểu:
                            </span>
                            <div className="space-y-1">
                              {author.notableWorks.map((work, idx) => (
                                <Link
                                  key={idx}
                                  to={`/books?q=${encodeURIComponent(work)}`}
                                  className="text-xs text-on-surface hover:text-primary flex items-center gap-1 truncate"
                                >
                                  <span className="material-symbols-outlined text-[13px] text-on-surface-variant">auto_stories</span>
                                  <span className="truncate">{work}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-4 pt-3 border-t border-outline-variant/20 space-y-2">
                          <button
                            type="button"
                            onClick={() => toggleFollow(author.id, author.name, isMock)}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${isFollowed
                              ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                              : 'bg-primary/10 text-primary hover:bg-primary hover:text-on-primary'
                              }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {isFollowed ? 'check' : 'add'}
                            </span>
                            {isFollowed ? 'Đang theo dõi' : 'Theo dõi tác giả'}
                          </button>

                          <Link
                            to={`/author/${author.id}`}
                            className="block text-center text-xs font-semibold text-on-surface-variant hover:text-primary py-1 transition-colors"
                          >
                            Xem trang tác giả →
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Phân Trang Cho Tác Giả */}
                {totalPages > 1 && (
                  <div className="mt-8 pt-5 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-on-surface-variant">
                      Hiển thị <span className="font-semibold text-on-surface">{(validPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-on-surface">{Math.min(validPage * itemsPerPage, currentItems.length)}</span> trong tổng số <span className="font-semibold text-on-surface">{currentItems.length}</span> tác giả
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={validPage <= 1}
                        onClick={() => handlePageChange(validPage - 1)}
                        className="w-8 h-8 rounded-xl border border-outline-variant/40 flex items-center justify-center text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        aria-label="Trang trước"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        const isActive = p === validPage;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handlePageChange(p)}
                            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${isActive
                              ? 'bg-primary text-on-primary shadow-xs scale-105'
                              : 'border border-outline-variant/40 text-on-surface hover:bg-surface-container-low'
                              }`}
                          >
                            {p}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        disabled={validPage >= totalPages}
                        onClick={() => handlePageChange(validPage + 1)}
                        className="w-8 h-8 rounded-xl border border-outline-variant/40 flex items-center justify-center text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        aria-label="Trang sau"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

