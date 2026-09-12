import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { catalogApi, toCatalogBook } from '../../api/catalogApi';
import { businessApi } from '../../api/businessApi';

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { slug: categorySlug } = useParams();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const selectedCat = searchParams.get('cat') || searchParams.get('category') || categorySlug || 'all';
  const selectedFormat = searchParams.get('format') || 'all';
  const selectedSort = searchParams.get('sort') || 'popular';
  const searchQuery = searchParams.get('q') || '';

  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [booksList, setBooksList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [publicStores, setPublicStores] = useState([]);
  const [catalogMeta, setCatalogMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all' || !value) {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    if (key === 'cat' && (value === 'all' || !value) && categorySlug) {
      newParams.delete('category');
      navigate(`/books${newParams.toString() ? `?${newParams.toString()}` : ''}`);
      return;
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    if (categorySlug) navigate('/books');
    else setSearchParams({});
  };

  useEffect(() => {
    if (selectedCat !== 'all' && categories.length === 0) return undefined;

    let active = true;

    Promise.all([catalogApi.getCategories(), businessApi.getPublicStores({ page: 1, limit: 8 })]).then(([categoryResponse, storeResponse]) => {
      if (!active) return;
      if (categoryResponse.success) {
        setCategories(flattenCategories(categoryResponse.data || []));
      }
      if (storeResponse.success) setPublicStores(storeResponse.data || []);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setCatalogLoading(true);
      setCatalogError('');

      const category = categories.find((item) => item.slug === selectedCat || item.id === selectedCat);
      const formatMap = { ebook: 'DIGITAL', physical: 'PHYSICAL', hybrid: 'BOTH' };
      const sortMap = {
        'price-low': { sortBy: 'price', order: 'ASC' },
        'price-high': { sortBy: 'price', order: 'DESC' },
        new: { sortBy: 'publishedAt', order: 'DESC' },
        bestseller: { sortBy: 'publishedAt', order: 'DESC' },
        popular: { sortBy: 'publishedAt', order: 'DESC' }
      };
      const sort = sortMap[selectedSort] || sortMap.popular;
      const page = Number(searchParams.get('page')) || 1;
      const normalizedSearch = searchTerm.trim();

      const response = await catalogApi.getPublicBooks({
        page,
        limit: 20,
        search: normalizedSearch.length >= 2 ? normalizedSearch : undefined,
        category: selectedCat === 'all' ? undefined : (category?.id || selectedCat),
        format: formatMap[selectedFormat],
        ...sort
      });

      if (!active) return;

      if (!response.success) {
        setBooksList([]);
        setCatalogError(response.error?.message || 'Không thể tải danh mục sách.');
      } else {
        setBooksList((response.data || []).map((book) => ({
          ...toCatalogBook(book),
          discount: '',
          rating: 0,
          sales: '0'
        })));
        setCatalogMeta({
          total: response.meta?.total || 0,
          page: response.meta?.page || page,
          totalPages: response.meta?.totalPages || 1
        });
      }
      setCatalogLoading(false);
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [categories, searchParams, searchTerm, selectedCat, selectedFormat, selectedSort]);
  const filteredBooks = useMemo(() => {
    const matches = booksList.filter(book => {
      if (selectedCat !== 'all' && book.category !== selectedCat) return false;
      if (selectedFormat === 'ebook' && book.formatType !== 'ebook') return false;
      if (selectedFormat === 'physical' && book.formatType !== 'physical') return false;
      if (selectedFormat === 'hybrid' && book.formatType !== 'hybrid') return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q);
      }
      return true;
    });

    return [...matches].sort((a, b) => {
      if (selectedSort === 'price-low') return a.price - b.price;
      if (selectedSort === 'price-high') return b.price - a.price;
      if (selectedSort === 'bestseller') return parseSales(b.sales) - parseSales(a.sales);
      if (selectedSort === 'new') return b.id.localeCompare(a.id);
      return b.rating - a.rating;
    });
  }, [booksList, selectedCat, selectedFormat, selectedSort, searchTerm]);

  const handleQuickAdd = (book) => {
    addItem({
      id: `cat-${book.id}`,
      bookId: book.id,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      price: book.price,
      originalPrice: book.originalPrice,
      format: book.format === 'Ebook' ? 'Ebook Số' : book.format === 'Sách giấy' ? 'Sách giấy' : 'Combo Hybrid',
      type: book.formatType,
      cover: book.cover,
      quantity: 1
    });
    showToast(`Đã thêm "${book.title}" vào giỏ hàng!`, 'success');
  };

  return (
    <div className="max-w-[1680px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-on-surface-variant mb-4">
        <Link className="hover:text-primary transition-colors flex items-center gap-1" to="/">
          <span className="material-symbols-outlined text-[15px]">home</span>
          Trang chủ
        </Link>
        <span className="material-symbols-outlined text-[13px]">chevron_right</span>
        <span className="text-on-surface font-semibold">Tất cả sách &amp; Ebook</span>
      </nav>

      {/* Header & Search Banner */}
      <section className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-outline-variant/30">
        <div>
          <span className="text-primary font-bold text-xs tracking-widest uppercase mb-1 block">
            Khám phá kho tàng tri thức
          </span>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface tracking-tight flex items-baseline gap-3">
            Tất Cả Sách &amp; Ấn Phẩm Số
            <span className="font-sans text-xs font-normal text-on-surface-variant">
              ({catalogMeta.total || filteredBooks.length} sản phẩm phù hợp)
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1 max-w-2xl leading-relaxed">
            Khám phá những đầu sách nổi bật từ các nhà xuất bản hàng đầu. Trải nghiệm kết hợp hoàn hảo giữa ấn bản Ebook DRM và Sách in cao cấp.
          </p>
        </div>

        <div className="w-full md:w-[360px] shrink-0">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[18px]">search</span>
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                updateParam('q', e.target.value);
              }}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary shadow-2xs transition-all"
              placeholder="Tìm theo tựa sách, tác giả..."
              type="text"
            />
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setIsFilterOpen(value => !value)}
        className="mb-4 flex min-h-11 w-full items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface lg:hidden"
        aria-expanded={isFilterOpen}
        aria-controls="catalog-filters"
      >
        <span className="flex items-center gap-2"><span className="material-symbols-outlined" aria-hidden="true">tune</span>Bộ lọc sách</span>
        <span className="material-symbols-outlined" aria-hidden="true">{isFilterOpen ? 'expand_less' : 'expand_more'}</span>
      </button>

      <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Aside Filter Panel */}
        <aside id="catalog-filters" className={`${isFilterOpen ? 'block' : 'hidden'} col-span-12 lg:col-span-4 xl:col-span-3 lg:block bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 sm:p-5 shadow-xs lg:sticky lg:top-28`}>
          <div className="flex items-center justify-between pb-3.5 border-b border-outline-variant/20">
            <div className="flex items-center gap-2 font-bold text-sm text-on-surface">
              <span className="material-symbols-outlined text-primary text-[19px]">tune</span>
              <span>Bộ Lọc Sách</span>
            </div>
            {(selectedCat !== 'all' || selectedFormat !== 'all' || searchTerm) && (
              <button
                onClick={clearFilters}
                className="text-[11px] font-semibold text-primary hover:underline px-2 py-0.5 rounded-md hover:bg-primary/10 transition-colors"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Filter 1: Format */}
          <div className="py-3.5 border-b border-outline-variant/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant">Định dạng</h3>
              {selectedFormat !== 'all' && (
                <button onClick={() => updateParam('format', 'all')} className="text-[10px] text-primary hover:underline">
                  Mặc định
                </button>
              )}
            </div>
            <div className="space-y-1 text-xs">
              {[
                { id: 'all', name: 'Tất cả định dạng', icon: 'apps' },
                { id: 'ebook', name: 'Ebook DRM Bản Quyền', icon: 'bolt' },
                { id: 'physical', name: 'Sách Giấy Bìa Mềm', icon: 'menu_book' },
                { id: 'hybrid', name: 'Combo Hybrid (Giấy + Ebook)', icon: 'auto_stories' }
              ].map((fmt) => {
                const isSelected = selectedFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => updateParam('format', fmt.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold border border-primary/25 shadow-2xs'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[17px] ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {fmt.icon}
                      </span>
                      <span>{fmt.name}</span>
                    </span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-primary text-[15px]">check</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter 2: Category */}
          <div className="py-3.5 border-b border-outline-variant/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant">Chủ đề</h3>
              {selectedCat !== 'all' && (
                <button onClick={() => updateParam('cat', 'all')} className="text-[10px] text-primary hover:underline">
                  Mặc định
                </button>
              )}
            </div>
            <div className="space-y-1 text-xs">
              {[
                { id: 'all', name: 'Tất cả chủ đề', count: catalogMeta.total || booksList.length },
                ...categories.map((category) => ({
                  id: category.slug || category.id,
                  name: category.name,
                  count: ''
                }))
              ].map((cat) => {
                const isSelected = selectedCat === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => updateParam('cat', cat.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-bold border border-primary/25 shadow-2xs'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary scale-125' : 'bg-outline-variant'}`}></span>
                      <span>{cat.name}</span>
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${isSelected ? 'bg-primary/15 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                      {cat.count || '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter 3: Publishers */}
          <div className="pt-3.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2">Nhà xuất bản</h3>
            <div className="space-y-1 text-xs text-on-surface-variant">
              {publicStores.map((store) => (
                <Link
                  key={store.id}
                  to={`/stores/${store.slug}`}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-surface-container-low hover:text-primary transition-all group"
                >
                  <span className="group-hover:translate-x-0.5 transition-transform">{store.name}</span>
                  <span className="text-[10px] font-semibold bg-surface-container group-hover:bg-primary/10 group-hover:text-primary px-1.5 py-0.2 rounded-full text-on-surface-variant transition-colors">
                    Official
                  </span>
                </Link>
              ))}
              {publicStores.length === 0 && <p className="px-2.5 py-2 text-[11px] text-on-surface-variant">Chưa có gian hàng công khai.</p>}
            </div>
          </div>
        </aside>

        {/* Right Content Area */}
        <section className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col">
          {/* Top Sort & Filter Pills Bar */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 mb-5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-semibold text-on-surface pr-2 border-r border-outline-variant/30">
                {filteredBooks.length} kết quả
              </span>

              {selectedCat !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-[11px]">
                  Chủ đề: {selectedCat}
                  <button onClick={() => updateParam('cat', 'all')} aria-label="Xóa bộ lọc chủ đề">
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                </span>
              )}

              {selectedFormat !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-[11px]">
                  Định dạng: {selectedFormat}
                  <button onClick={() => updateParam('format', 'all')} aria-label="Xóa bộ lọc định dạng">
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                </span>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-on-surface-variant">Sắp xếp:</span>
                <select
                  value={selectedSort}
                  onChange={(e) => updateParam('sort', e.target.value)}
                  className="bg-surface-container-low border border-outline-variant/40 rounded-lg py-1 px-2 text-xs font-semibold text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="popular">Phổ biến nhất</option>
                  <option value="bestseller">Bán chạy nhất</option>
                  <option value="new">Mới phát hành</option>
                  <option value="price-low">Giá: Thấp đến Cao</option>
                  <option value="price-high">Giá: Cao đến Thấp</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/30">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white text-primary shadow-2xs font-bold' : 'text-on-surface-variant'}`}
                  title="Hiển thị lưới"
                  aria-label="Hiển thị lưới"
                >
                  <span className="material-symbols-outlined text-[16px]">grid_view</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded ${viewMode === 'list' ? 'bg-white text-primary shadow-2xs font-bold' : 'text-on-surface-variant'}`}
                  title="Hiển thị danh sách"
                  aria-label="Hiển thị danh sách"
                >
                  <span className="material-symbols-outlined text-[16px]">view_list</span>
                </button>
              </div>
            </div>
          </div>

          {/* Book Cards Grid */}
          {catalogLoading && <CatalogNotice icon="progress_activity" title="Đang tải danh mục sách" description="Dữ liệu sách đang được đồng bộ từ HUKI Platform." spinning />}
          {!catalogLoading && catalogError && <CatalogNotice icon="cloud_off" title="Chưa tải được danh mục" description={catalogError} tone="error" />}
          {!catalogLoading && !catalogError && filteredBooks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-14 text-center">
              <span className="material-symbols-outlined text-5xl text-outline" aria-hidden="true">search_off</span>
              <h2 className="mt-3 text-lg font-bold text-on-surface">Không tìm thấy sách phù hợp</h2>
              <p className="mt-1 text-sm text-on-surface-variant">Hãy thử từ khóa khác hoặc xóa bớt bộ lọc đang chọn.</p>
              <button type="button" onClick={clearFilters} className="mt-5 min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white">
                Xóa tất cả bộ lọc
              </button>
            </div>
          )}

          <div className={viewMode === 'grid' ? "grid grid-cols-2 min-[540px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-5" : "flex flex-col gap-3"}>
            {filteredBooks.map((book) => (
              <article
                key={book.id}
                className={`bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-4 flex ${
                  viewMode === 'grid' ? 'flex-col justify-between' : 'flex-row items-center justify-between gap-4'
                } hover:shadow-md hover:-translate-y-0.5 transition-all group`}
              >
                <div className={viewMode === 'list' ? 'flex items-center gap-4 flex-1' : ''}>
                  <Link
                    to={`/books/${book.slug || book.id}`}
                    className={`block relative aspect-[2/3] ${viewMode === 'list' ? 'w-24' : 'w-full'} rounded-xl overflow-hidden bg-surface-container mb-3 shadow-xs`}
                  >
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={book.title} src={book.cover} />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white shadow-xs">
                      {book.format}
                    </span>
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FEA619] text-white shadow-xs">
                      {book.discount}
                    </span>
                  </Link>

                  <div>
                    <span className="text-[11px] text-primary block font-medium mb-0.5">{book.publisher}</span>
                    <Link to={`/books/${book.slug || book.id}`} title={book.title}>
                      <h3 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors line-clamp-1 truncate leading-snug">
                        {book.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-on-surface-variant mt-1">{book.author}</p>

                    <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                      <span className="material-symbols-outlined text-[#FEA619] text-[15px] fill-icon">star</span>
                      <span className="font-bold text-on-surface">{book.rating}</span>
                      <span className="text-on-surface-variant">({book.sales})</span>
                    </div>
                  </div>
                </div>

                <div className={`${viewMode === 'grid' ? 'pt-3 mt-3 border-t border-outline-variant/20' : ''} flex items-center justify-between gap-2`}>
                  <div>
                    <span className="text-sm sm:text-base font-bold text-primary block">
                      {book.price.toLocaleString('vi-VN')}đ
                    </span>
                    <span className="text-[11px] text-outline line-through">
                      {book.originalPrice.toLocaleString('vi-VN')}đ
                    </span>
                  </div>

                  <button
                    onClick={() => handleQuickAdd(book)}
                    className="w-10 h-10 rounded-xl bg-surface-container hover:bg-primary hover:text-white text-on-surface-variant flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                    title="Thêm vào giỏ hàng"
                    aria-label={`Thêm "${book.title}" vào giỏ hàng`}
                  >
                    <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                  </button>
                </div>
              </article>
            ))}
          </div>

          {!catalogLoading && !catalogError && catalogMeta.totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Phân trang danh mục">
              <button
                type="button"
                disabled={catalogMeta.page <= 1}
                onClick={() => updateParam('page', String(catalogMeta.page - 1))}
                className="min-h-11 rounded-xl border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang trước
              </button>
              <span className="text-sm text-on-surface-variant">Trang {catalogMeta.page}/{catalogMeta.totalPages}</span>
              <button
                type="button"
                disabled={catalogMeta.page >= catalogMeta.totalPages}
                onClick={() => updateParam('page', String(catalogMeta.page + 1))}
                className="min-h-11 rounded-xl border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trang sau
              </button>
            </nav>
          )}

          {/* Editors Choice Promo Banner */}
          <div 
            style={{ background: 'linear-gradient(to right, var(--theme-hero-from, #003B2B), var(--theme-hero-via, #006B4F), var(--theme-hero-to, #124E3F))' }}
            className="my-8 rounded-2xl p-6 text-white relative overflow-hidden shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="relative z-10 max-w-xl">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white border border-white/20 mb-2 uppercase">
                <span className="material-symbols-outlined text-[12px]">auto_awesome</span> Tuyển Chọn Tháng 2026
              </span>
              <h3 className="font-editorial text-xl font-bold">
                Combo Tủ Sách Phát Triển Bản Thân &amp; Kỷ Luật Thói Quen
              </h3>
              <p className="text-xs opacity-85 mt-1 leading-relaxed">
                Nhận ngay Ebook bản quyền trọn đời + Sách in giấy ivory tặng kèm hộp quà HUKI Gift Box.
              </p>
            </div>
            <Link
              to={filteredBooks[0] ? `/books/${filteredBooks[0].slug || filteredBooks[0].id}` : '/books'}
              className="px-5 py-2.5 rounded-xl bg-white text-[var(--theme-primary,#003B2B)] font-bold text-xs shadow-xs hover:bg-surface-container transition-colors flex-shrink-0 z-10"
            >
              Xem Chi Tiết Combo
            </Link>
            <span className="material-symbols-outlined absolute -right-6 -bottom-6 text-[110px] text-white/10 pointer-events-none">auto_stories</span>
          </div>
        </section>
      </div>
    </div>
  );
}

function parseSales(value) {
  const normalized = String(value).toLowerCase().replace(',', '.');
  const amount = Number.parseFloat(normalized) || 0;
  return normalized.includes('k') ? amount * 1000 : amount;
}

function flattenCategories(categories) {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children || [])]);
}

function CatalogNotice({ icon, title, description, tone = 'neutral', spinning = false }) {
  const toneClass = tone === 'error'
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-outline-variant bg-surface-container-lowest text-on-surface';

  return (
    <div className={`mb-5 rounded-2xl border px-6 py-10 text-center ${toneClass}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className={`material-symbols-outlined text-4xl ${spinning ? 'animate-spin' : ''}`} aria-hidden="true">{icon}</span>
      <h2 className="mt-2 text-base font-bold">{title}</h2>
      <p className="mt-1 text-sm opacity-75">{description}</p>
    </div>
  );
}
