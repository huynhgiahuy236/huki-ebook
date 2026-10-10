"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';
import { catalogApi, CategoryData, BookFormat, CatalogEntity, BookData } from '@/ui/api/catalogApi';
import { can, PERMISSIONS, PermissionKey } from '@/ui/utils/permissions';

export interface SellerEditProductViewProps {
  productId?: string;
}

export default function SellerEditProductView({ productId: propProductId }: SellerEditProductViewProps) {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const { user, activeBusinessId } = useAuth();

  const bookId = (propProductId || params?.id) as string;

  const currentBizId = user?.business?.id || activeBusinessId || undefined;
  const currentBizName = user?.business?.name || 'Doanh nghiệp của bạn';
  const canUpdateProduct = can(PERMISSIONS.PRODUCT_UPDATE as PermissionKey, currentBizId, user);

  const [loadingBook, setLoadingBook] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('sec-basic');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [authors, setAuthors] = useState<CatalogEntity[]>([]);
  const [publishers, setPublishers] = useState<CatalogEntity[]>([]);

  // Modes
  const [categoryMode, setCategoryMode] = useState<'EXISTING' | 'CUSTOM'>('EXISTING');
  const [authorMode, setAuthorMode] = useState<'EXISTING' | 'CUSTOM'>('EXISTING');
  const [publisherMode, setPublisherMode] = useState<'SELF' | 'PARTNER'>('SELF');
  const [serpDevice, setSerpDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Form State
  const [form, setForm] = useState({
    title: '',
    teaser: '',
    description: '',
    language: 'Tiếng Việt',
    isbn: '',
    edition: '',
    pages: '',
    sku: '',
    format: 'PHYSICAL' as BookFormat,
    status: 'PUBLISHED' as 'PUBLISHED' | 'DRAFT' | 'HIDDEN' | 'ARCHIVED',
    categoryId: '',
    customCategoryName: '',
    authorId: '',
    customAuthorName: '',
    authorName: '',
    publisherId: '',
    customPublisherName: '',
    publisherName: currentBizName,
    coverUrl: '',
    price: '',
    originalPrice: '',
    ebookPrice: '',
    comboPrice: '',
    stock: '',
    weight: '',
    length: '',
    width: '',
    height: '',
    allowOnlineRead: true,
    allowDownload: false,
    drmEnabled: true,
  });

  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // 1. Load catalog master data
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [catRes, authRes, pubRes] = await Promise.all([
          catalogApi.getCategories(),
          catalogApi.getAuthors(),
          catalogApi.getPublishers(),
        ]);
        if (catRes.success && Array.isArray(catRes.data)) setCategories(catRes.data);
        if (authRes.success && Array.isArray(authRes.data)) setAuthors(authRes.data);
        if (pubRes.success && Array.isArray(pubRes.data)) setPublishers(pubRes.data);
      } catch (err) {
        console.warn('Could not load master data:', err);
      }
    };
    loadMasterData();
  }, []);

  // 2. Load book details
  const loadBookData = useCallback(async () => {
    if (!bookId) {
      setLoadingBook(false);
      return;
    }
    setLoadingBook(true);
    try {
      let book: any = null;
      
      // Try direct ID lookup
      const res = await catalogApi.getBookById(bookId);
      if (res.success && res.data) {
        book = res.data;
      } else {
        // Fallback to seller owned list
        const ownedRes = await catalogApi.getSellerBooks({ limit: 100 });
        const list = Array.isArray(ownedRes.data)
          ? ownedRes.data
          : (ownedRes.data as any)?.items || [];
        book = list.find((b: any) => b.id === bookId);
      }

      if (book) {
        const fmt = (book.format as BookFormat) || 'PHYSICAL';
        setForm({
          title: book.title || '',
          teaser: book.teaser || '',
          description: book.description || '',
          language: book.language || 'Tiếng Việt',
          isbn: book.isbn || '',
          edition: book.edition || '',
          pages: book.pages ? String(book.pages) : '',
          sku: book.sku || '',
          format: fmt,
          status: (book.status as any) || 'PUBLISHED',
          categoryId: book.categoryId || book.category?.id || '',
          customCategoryName: '',
          authorId: book.authorId || book.author?.id || '',
          customAuthorName: '',
          authorName: typeof book.author === 'string' ? book.author : book.author?.name || '',
          publisherId: book.publisherId || book.publisher?.id || '',
          customPublisherName: '',
          publisherName: typeof book.publisher === 'string' ? book.publisher : book.publisher?.name || currentBizName,
          coverUrl: book.coverUrl || book.coverImage || book.cover || '',
          price: book.price ? String(book.price) : '',
          originalPrice: book.originalPrice ? String(book.originalPrice) : '',
          ebookPrice: book.ebookPrice ? String(book.ebookPrice) : book.price ? String(book.price) : '',
          comboPrice: book.comboPrice ? String(book.comboPrice) : book.price ? String(book.price) : '',
          stock: book.physicalDetails?.stock != null ? String(book.physicalDetails.stock) : (book.stock != null ? String(book.stock) : ''),
          weight: book.physicalDetails?.weight != null ? String(book.physicalDetails.weight) : '',
          length: book.physicalDetails?.length != null ? String(book.physicalDetails.length) : '',
          width: book.physicalDetails?.width != null ? String(book.physicalDetails.width) : '',
          height: book.physicalDetails?.height != null ? String(book.physicalDetails.height) : '',
          allowOnlineRead: book.digitalDetails?.allowOnlineRead ?? true,
          allowDownload: book.digitalDetails?.allowDownload ?? false,
          drmEnabled: book.digitalDetails?.drmEnabled ?? true,
        });

        if (book.authorId || book.author) setAuthorMode('EXISTING');
        if (book.publisherId) setPublisherMode('PARTNER');
        if (Array.isArray(book.tags)) setTags(book.tags);
      } else {
        showToast?.('Không tìm thấy thông tin sản phẩm sách này.', 'error');
      }
    } catch (err) {
      console.error('Error loading book details:', err);
      showToast?.('Lỗi kết nối khi tải chi tiết sản phẩm.', 'error');
    } finally {
      setLoadingBook(false);
    }
  }, [bookId, currentBizName, showToast]);

  useEffect(() => {
    loadBookData();
  }, [loadBookData]);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleAddTag = () => {
    const trimmed = newTag.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag('');
    }
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // SEO Score calculation
  const seoAudit = useMemo(() => {
    let score = 0;
    if (form.title.trim().length >= 10 && form.title.trim().length <= 70) score += 25;
    else if (form.title.trim().length > 0) score += 10;

    if (form.description.trim().length >= 50) score += 25;
    else if (form.description.trim().length > 0) score += 10;

    if (form.coverUrl.trim().length > 0) score += 20;
    if (tags.length >= 2) score += 15;
    if (form.isbn.trim().length >= 10) score += 15;

    return {
      score,
      isGood: score >= 70,
    };
  }, [form.title, form.description, form.coverUrl, form.isbn, tags]);

  // Section Error Helpers
  const sectionErrors = useMemo(() => ({
    basic: Boolean(errors.title || errors.description),
    taxonomy: Boolean(errors.categoryId || errors.customCategoryName || errors.authorId || errors.customAuthorName || errors.publisherId),
    media: Boolean(errors.coverUrl),
    pricing: Boolean(errors.price),
    inventory: Boolean(errors.stock || errors.weight),
  }), [errors]);

  // Form validation & submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!form.title || !form.title.trim()) {
      newErrors.title = 'Vui lòng nhập tên tựa sách / tác phẩm.';
    } else if (form.title.trim().length < 3) {
      newErrors.title = 'Tên tác phẩm phải có ít nhất 3 ký tự.';
    }

    if (!form.description || !form.description.trim()) {
      newErrors.description = 'Vui lòng nhập mô tả chi tiết cho tác phẩm.';
    }

    if (categoryMode === 'EXISTING' && !form.categoryId) {
      newErrors.categoryId = 'Vui lòng chọn danh mục thể loại chính.';
    } else if (categoryMode === 'CUSTOM' && !form.customCategoryName.trim()) {
      newErrors.customCategoryName = 'Vui lòng nhập tên thể loại mới.';
    }

    if (authorMode === 'EXISTING' && !form.authorId && !form.authorName?.trim()) {
      newErrors.authorId = 'Vui lòng chọn tác giả từ danh mục hệ thống.';
    } else if (authorMode === 'CUSTOM' && !form.customAuthorName.trim()) {
      newErrors.customAuthorName = 'Vui lòng nhập tên tác giả mới.';
    }

    if (form.coverUrl && !form.coverUrl.startsWith('http://') && !form.coverUrl.startsWith('https://') && !form.coverUrl.startsWith('/')) {
      newErrors.coverUrl = 'Đường dẫn ảnh bìa không hợp lệ (cần bắt đầu bằng http:// hoặc https://).';
    }

    const priceNum = Number(form.price || form.comboPrice || form.ebookPrice);
    if (!priceNum || priceNum <= 0) {
      newErrors.price = 'Giá bán niêm yết phải lớn hơn 0 ₫.';
    }

    if (form.format === 'PHYSICAL' || form.format === 'BOTH') {
      if (form.stock === '' || Number(form.stock) < 0) {
        newErrors.stock = 'Số lượng tồn kho phải là số không âm (≥ 0).';
      }
      if (form.weight === '' || Number(form.weight) <= 0) {
        newErrors.weight = 'Khối lượng đóng gói phải lớn hơn 0 gram.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast?.('Vui lòng kiểm tra lại các thông tin bắt buộc còn thiếu hoặc chưa hợp lệ.', 'error');
      
      if (newErrors.title || newErrors.description) {
        scrollToSection('sec-basic');
      } else if (newErrors.categoryId || newErrors.customCategoryName || newErrors.authorId || newErrors.customAuthorName) {
        scrollToSection('sec-taxonomy');
      } else if (newErrors.coverUrl) {
        scrollToSection('sec-media');
      } else if (newErrors.price) {
        scrollToSection('sec-pricing');
      } else if (newErrors.stock || newErrors.weight) {
        scrollToSection('sec-inventory');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const isPhysical = form.format === 'PHYSICAL' || form.format === 'BOTH';
      const isDigital = form.format === 'DIGITAL' || form.format === 'BOTH';

      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim() || form.teaser.trim(),
        price: priceNum,
        format: form.format,
        isbn: form.isbn.trim() || undefined,
        coverUrl: form.coverUrl.trim() || undefined,
        status: form.status,
        ...(form.categoryId ? { categoryId: form.categoryId } : {}),
        ...(form.authorId ? { authorId: form.authorId } : {}),
        ...(form.publisherId ? { publisherId: form.publisherId } : {}),
        ...(isPhysical && {
          physicalDetails: {
            stock: Number(form.stock || 0),
            weight: Number(form.weight || 350),
            length: Number(form.length || 20.5),
            width: Number(form.width || 14.5),
            height: Number(form.height || 2.0),
            physicalEnabled: true,
          }
        }),
        ...(isDigital && {
          digitalDetails: {
            digitalEnabled: true,
            allowOnlineRead: form.allowOnlineRead,
            allowDownload: form.allowDownload,
            drmEnabled: form.drmEnabled,
          }
        }),
      };

      const res = await catalogApi.updateBook(bookId, payload);

      if (res.success) {
        // Also sync inventory if stock changed
        if (isPhysical && form.stock !== '') {
          try {
            await catalogApi.updateInventory(bookId, Number(form.stock));
          } catch { /* ignore inventory log error */ }
        }

        showToast?.(`Cập nhật sách "${form.title}" thành công!`, 'success');
        router.push('/seller/products');
      } else {
        showToast?.(res.error?.message || 'Có lỗi khi cập nhật thông tin sách.', 'error');
      }
    } catch (err: any) {
      showToast?.(err?.message || 'Không thể kết nối đến máy chủ.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingBook) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-3">
        <span className="material-symbols-outlined text-4xl text-[#00875A] animate-spin">progress_activity</span>
        <p className="text-xs font-semibold text-slate-500">Đang tải dữ liệu chi tiết sách #{bookId}...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#F8FAFC] text-[#1E293B] antialiased min-h-screen p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-[1560px] mx-auto space-y-6">

        {/* 1. TOP HEADER & BREADCRUMB */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/seller/products"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#00875A] transition-colors"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Quản Lý Sản Phẩm</span>
              </Link>
              <span className="text-slate-300 text-xs">·</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                form.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {form.status === 'PUBLISHED' ? 'ĐANG BÁN' : 'BẢN NHÁP'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                {form.format === 'BOTH' ? 'HYBRID COMBO' : form.format === 'PHYSICAL' ? 'SÁCH GIẤY' : 'EBOOK DRM'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-editorial">
              Chỉnh Sửa Chi Tiết Sản Phẩm
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Cập nhật thông tin toàn diện, xác thực danh mục, giá niêm yết và thông số kiểm duyệt DRM.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href={`/book/${bookId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#00875A] hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors"
            >
              <span className="material-symbols-outlined text-base text-slate-400">open_in_new</span>
              <span>Xem Trên Sàn</span>
            </Link>
            <button
              type="button"
              onClick={() => router.push('/seller/products')}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Quay Lại
            </button>
          </div>
        </div>

        {/* 2. STEPPER NAVIGATION */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-start justify-between w-full">
            {[
              { id: 'sec-basic', num: '1', title: 'Thông Tin Cơ Bản', short: 'Cơ Bản', done: !!form.title && !!form.description, hasError: sectionErrors.basic },
              { id: 'sec-taxonomy', num: '2', title: 'Phân Loại & Tác Giả', short: 'Phân Loại', done: !!form.categoryId && (!!form.authorId || !!form.authorName), hasError: sectionErrors.taxonomy },
              { id: 'sec-media', num: '3', title: 'Media & Bìa Sách', short: 'Bìa Sách', done: !!form.coverUrl, hasError: sectionErrors.media },
              { id: 'sec-pricing', num: '4', title: 'Giá Bán & Định Dạng', short: 'Giá Bán', done: Number(form.price || form.comboPrice || form.ebookPrice) > 0, hasError: sectionErrors.pricing },
              ...(form.format !== 'DIGITAL' ? [{ id: 'sec-inventory', num: '5', title: 'Kho & Vận Chuyển', short: 'Kho Hàng', done: form.stock !== '' && Number(form.stock) >= 0 && Number(form.weight) > 0, hasError: sectionErrors.inventory }] : []),
              ...(form.format !== 'PHYSICAL' ? [{ id: 'sec-drm', num: form.format === 'DIGITAL' ? '5' : '6', title: 'Bảo Mật DRM', short: 'DRM Ebook', done: true, hasError: false }] : []),
              { id: 'sec-seo', num: form.format === 'BOTH' ? '7' : '6', title: 'Tối Ưu SEO', short: 'Tối Ưu SEO', done: seoAudit.isGood, hasError: false },
            ].map((step, index, arr) => {
              const isActive = activeSection === step.id;
              const isLast = index === arr.length - 1;

              return (
                <div
                  key={step.id}
                  onClick={() => scrollToSection(step.id)}
                  className="flex-1 flex flex-col items-center relative group cursor-pointer text-center"
                >
                  {!isLast && (
                    <div
                      className={`absolute top-4 left-1/2 w-full h-[2px] -z-0 transition-colors ${
                        step.hasError
                          ? 'bg-rose-300'
                          : step.done && arr[index + 1].done
                          ? 'bg-emerald-500'
                          : step.done
                          ? 'bg-emerald-400'
                          : 'bg-slate-200 border-t border-dashed border-slate-300'
                      }`}
                    />
                  )}

                  <button
                    type="button"
                    className={`relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                      step.hasError
                        ? 'bg-rose-500 text-white ring-4 ring-rose-200 shadow-rose-200 shadow-md animate-pulse'
                        : isActive
                        ? 'bg-[#00875A] text-white ring-4 ring-[#00875A]/20 shadow-md scale-110'
                        : step.done
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border-2 border-slate-300 text-slate-400 group-hover:border-[#00875A] group-hover:text-[#00875A]'
                    }`}
                  >
                    {step.hasError ? (
                      <span className="material-symbols-outlined text-base font-bold">priority_high</span>
                    ) : step.done && !isActive ? (
                      <span className="material-symbols-outlined text-base font-bold">check</span>
                    ) : (
                      <span>{step.num}</span>
                    )}
                  </button>

                  <div className="mt-2.5 px-0.5 flex flex-col items-center">
                    <span className={`text-xs font-bold leading-tight transition-colors ${
                      step.hasError ? 'text-rose-600 font-extrabold' : isActive ? 'text-[#00875A]' : step.done ? 'text-emerald-700' : 'text-slate-700'
                    }`}>
                      {step.short}
                    </span>
                    <span className="hidden lg:block text-[10px] text-slate-400 mt-0.5 leading-tight truncate max-w-[100px]">
                      {step.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. MAIN FORM */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Form Fields */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* 01. BASIC INFO */}
            <section id="sec-basic" className={`bg-white rounded-2xl p-5 border shadow-2xs space-y-4 scroll-mt-20 transition-all ${
              sectionErrors.basic ? 'border-rose-300 ring-2 ring-rose-100 shadow-rose-100/30' : 'border-slate-200/80'
            }`}>
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  sectionErrors.basic ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-[#00875A]'
                }`}>01</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Thông Tin Tựa Sách</h3>
                  <p className="text-[11px] text-slate-400">Tên sách, trích dẫn nổi bật và mô tả tác phẩm.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên Sách / Tựa Tác Phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Nhập tên sách đầy đủ..."
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    errors.title 
                      ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-400' 
                      : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-[#00875A]'
                  } focus:outline-none transition-all`}
                />
                {errors.title && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    <span>{errors.title}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Đoạn Giới Thiệu Ngắn (Teaser)</label>
                <input
                  type="text"
                  value={form.teaser}
                  onChange={(e) => handleChange('teaser', e.target.value)}
                  placeholder="Câu tóm tắt nổi bật hiển thị ở danh mục tìm kiếm..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-[#00875A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô Tả Chi Tiết Tác Phẩm <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Tóm tắt nội dung, thông điệp cốt lõi và các chương mục đặc sắc..."
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border ${
                    errors.description 
                      ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-400' 
                      : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-[#00875A]'
                  } focus:outline-none transition-all`}
                />
                {errors.description && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    <span>{errors.description}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngôn Ngữ</label>
                  <input
                    type="text"
                    value={form.language}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-[#00875A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mã ISBN</label>
                  <input
                    type="text"
                    value={form.isbn}
                    onChange={(e) => handleChange('isbn', e.target.value)}
                    placeholder="VD: 978-604-58-1234-5"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-[#00875A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số Trang</label>
                  <input
                    type="number"
                    value={form.pages}
                    onChange={(e) => handleChange('pages', e.target.value)}
                    placeholder="VD: 320"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-[#00875A]"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Từ Khóa &amp; Thẻ SEO (Tags)</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Thêm từ khóa rồi bấm Enter..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-[#00875A]"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    + Thêm
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-[#00875A] border border-emerald-200 text-xs font-semibold">
                        #{t}
                        <button type="button" onClick={() => setTags(tags.filter((_, i) => i !== idx))} className="hover:text-rose-600 ml-1">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* 02. TAXONOMY & AUTHORS */}
            <section id="sec-taxonomy" className={`bg-white rounded-2xl p-5 border shadow-2xs space-y-4 scroll-mt-20 transition-all ${
              sectionErrors.taxonomy ? 'border-rose-300 ring-2 ring-rose-100 shadow-rose-100/30' : 'border-slate-200/80'
            }`}>
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  sectionErrors.taxonomy ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-[#00875A]'
                }`}>02</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Phân Loại, Tác Giả &amp; Xuất Bản</h3>
                  <p className="text-[11px] text-slate-400">Thể loại sách, tác giả đại diện và đối tác cấp phép.</p>
                </div>
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Danh Mục Sách <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 text-[10.5px]">
                    <button
                      type="button"
                      onClick={() => setCategoryMode('EXISTING')}
                      className={`font-semibold cursor-pointer ${categoryMode === 'EXISTING' ? 'text-[#00875A] underline' : 'text-slate-400'}`}
                    >
                      Chọn có sẵn
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={() => setCategoryMode('CUSTOM')}
                      className={`font-semibold cursor-pointer ${categoryMode === 'CUSTOM' ? 'text-[#00875A] underline' : 'text-slate-400'}`}
                    >
                      Nhập danh mục mới
                    </button>
                  </div>
                </div>
                {categoryMode === 'EXISTING' ? (
                  <select
                    value={form.categoryId}
                    onChange={(e) => handleChange('categoryId', e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border ${
                      errors.categoryId ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-[#00875A]'
                    } focus:outline-none cursor-pointer`}
                  >
                    <option value="">-- Chọn thể loại --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.customCategoryName}
                    onChange={(e) => handleChange('customCategoryName', e.target.value)}
                    placeholder="Nhập tên thể loại mới..."
                    className={`w-full px-3 py-2 text-xs rounded-xl border ${
                      errors.customCategoryName ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-[#00875A]'
                    } focus:outline-none`}
                  />
                )}
                {(errors.categoryId || errors.customCategoryName) && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    <span>{errors.categoryId || errors.customCategoryName}</span>
                  </p>
                )}
              </div>

              {/* Author */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Tác Giả <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 text-[10.5px]">
                    <button
                      type="button"
                      onClick={() => setAuthorMode('EXISTING')}
                      className={`font-semibold cursor-pointer ${authorMode === 'EXISTING' ? 'text-[#00875A] underline' : 'text-slate-400'}`}
                    >
                      Chọn tác giả
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={() => setAuthorMode('CUSTOM')}
                      className={`font-semibold cursor-pointer ${authorMode === 'CUSTOM' ? 'text-[#00875A] underline' : 'text-slate-400'}`}
                    >
                      Nhập tác giả mới
                    </button>
                  </div>
                </div>
                {authorMode === 'EXISTING' ? (
                  <select
                    value={form.authorId}
                    onChange={(e) => {
                      const auth = authors.find(a => a.id === e.target.value);
                      setForm(prev => ({ ...prev, authorId: e.target.value, authorName: auth?.name || '' }));
                      if (errors.authorId) {
                        setErrors(prev => {
                          const next = { ...prev };
                          delete next.authorId;
                          return next;
                        });
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl border ${
                      errors.authorId ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-[#00875A]'
                    } focus:outline-none cursor-pointer`}
                  >
                    <option value="">-- Chọn tác giả có sẵn --</option>
                    {authors.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.customAuthorName}
                    onChange={(e) => handleChange('customAuthorName', e.target.value)}
                    placeholder="Nhập tên tác giả..."
                    className={`w-full px-3 py-2 text-xs rounded-xl border ${
                      errors.customAuthorName ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-[#00875A]'
                    } focus:outline-none`}
                  />
                )}
                {(errors.authorId || errors.customAuthorName) && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    <span>{errors.authorId || errors.customAuthorName}</span>
                  </p>
                )}
              </div>

              {/* Publisher */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn Vị Phát Hành / NXB</label>
                <input
                  type="text"
                  value={form.publisherName}
                  onChange={(e) => handleChange('publisherName', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-[#00875A]"
                />
              </div>
            </section>

            {/* 03. MEDIA & COVER */}
            <section id="sec-media" className={`bg-white rounded-2xl p-5 border shadow-2xs space-y-4 scroll-mt-20 transition-all ${
              sectionErrors.media ? 'border-rose-300 ring-2 ring-rose-100 shadow-rose-100/30' : 'border-slate-200/80'
            }`}>
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  sectionErrors.media ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-[#00875A]'
                }`}>03</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ảnh Bìa &amp; Media</h3>
                  <p className="text-[11px] text-slate-400">Hình ảnh bìa sách đại diện sắc nét hiển thị cho độc giả.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL Ảnh Bìa Sách (HTTPS)</label>
                <input
                  type="url"
                  value={form.coverUrl}
                  onChange={(e) => handleChange('coverUrl', e.target.value)}
                  placeholder="https://..."
                  className={`w-full px-3 py-2 text-xs rounded-xl border ${
                    errors.coverUrl ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-[#00875A]'
                  } focus:outline-none`}
                />
                {errors.coverUrl && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    <span>{errors.coverUrl}</span>
                  </p>
                )}
              </div>

              {form.coverUrl && (
                <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <img
                    src={form.coverUrl}
                    alt="Preview"
                    className="w-16 h-22 object-cover rounded-lg shadow-sm border border-slate-200"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="text-xs">
                    <span className="font-bold text-emerald-700 block">Xem trước ảnh bìa</span>
                    <span className="text-[10.5px] text-slate-500">Hình ảnh sẽ xuất hiện tại danh mục và giỏ hàng.</span>
                  </div>
                </div>
              )}
            </section>

            {/* 04. PRICING */}
            <section id="sec-pricing" className={`bg-white rounded-2xl p-5 border shadow-2xs space-y-4 scroll-mt-20 transition-all ${
              sectionErrors.pricing ? 'border-rose-300 ring-2 ring-rose-100 shadow-rose-100/30' : 'border-slate-200/80'
            }`}>
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  sectionErrors.pricing ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-[#00875A]'
                }`}>04</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Giá Bán &amp; Định Dạng</h3>
                  <p className="text-[11px] text-slate-400">Giá bán niêm yết trên sàn HUKI Ebook.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giá Bán Niêm Yết (₫) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    placeholder="VD: 120000"
                    className={`w-full px-3 py-2 text-xs rounded-xl border font-mono font-bold ${
                      errors.price ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-[#00875A]'
                    } focus:outline-none`}
                  />
                  {errors.price && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      <span>{errors.price}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giá Bìa Gốc (₫)</label>
                  <input
                    type="number"
                    value={form.originalPrice}
                    onChange={(e) => handleChange('originalPrice', e.target.value)}
                    placeholder="VD: 150000"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 font-mono text-slate-900 focus:outline-none focus:border-[#00875A]"
                  />
                </div>
              </div>
            </section>

            {/* 05. INVENTORY (For Physical / Combo) */}
            {(form.format === 'PHYSICAL' || form.format === 'BOTH') && (
              <section id="sec-inventory" className={`bg-white rounded-2xl p-5 border shadow-2xs space-y-4 scroll-mt-20 transition-all ${
                sectionErrors.inventory ? 'border-rose-300 ring-2 ring-rose-100 shadow-rose-100/30' : 'border-slate-200/80'
              }`}>
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    sectionErrors.inventory ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-[#00875A]'
                  }`}>05</span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Tồn Kho &amp; Kích Thước Đóng Gói</h3>
                    <p className="text-[11px] text-slate-400">Số lượng tồn kho thực tế và kích thước để tính cước vận chuyển tự động.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Số Lượng Tồn Kho <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="number"
                      value={form.stock}
                      onChange={(e) => handleChange('stock', e.target.value)}
                      placeholder="VD: 100"
                      className={`w-full px-3 py-2 text-xs rounded-xl border font-mono ${
                        errors.stock ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-[#00875A]'
                      } focus:outline-none`}
                    />
                    {errors.stock && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        <span>{errors.stock}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Khối Lượng (gram) <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="number"
                      value={form.weight}
                      onChange={(e) => handleChange('weight', e.target.value)}
                      placeholder="VD: 350"
                      className={`w-full px-3 py-2 text-xs rounded-xl border font-mono ${
                        errors.weight ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:border-[#00875A]'
                      } focus:outline-none`}
                    />
                    {errors.weight && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        <span>{errors.weight}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Dài (cm)</label>
                    <input
                      type="number"
                      value={form.length}
                      onChange={(e) => handleChange('length', e.target.value)}
                      placeholder="VD: 20.5"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 font-mono text-slate-900 focus:outline-none focus:border-[#00875A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Rộng (cm)</label>
                    <input
                      type="number"
                      value={form.width}
                      onChange={(e) => handleChange('width', e.target.value)}
                      placeholder="VD: 14.5"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 font-mono text-slate-900 focus:outline-none focus:border-[#00875A]"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* 06. DRM (For Digital / Combo) */}
            {(form.format === 'DIGITAL' || form.format === 'BOTH') && (
              <section id="sec-drm" className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4 scroll-mt-20">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#00875A] flex items-center justify-center font-bold text-xs">06</span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Bảo Mật DRM &amp; Quyền Đọc Số</h3>
                    <p className="text-[11px] text-slate-400">Cấu hình mã hóa bảo vệ bản quyền Ebook DRM.</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.drmEnabled}
                      onChange={(e) => handleChange('drmEnabled', e.target.checked)}
                      className="w-4 h-4 text-[#00875A] rounded"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900">Bảo vệ bản quyền DRM độc quyền HUKI</div>
                      <div className="text-[10.5px] text-slate-500">Mã hóa chống sao chép và chống trích xuất file lậu.</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.allowOnlineRead}
                      onChange={(e) => handleChange('allowOnlineRead', e.target.checked)}
                      className="w-4 h-4 text-[#00875A] rounded"
                    />
                    <div>
                      <div className="font-bold text-xs text-slate-900">Cho phép đọc trực tuyến trên Web/App</div>
                      <div className="text-[10.5px] text-slate-500">Độc giả đọc ngay trên trình đọc chuyên dụng của HUKI.</div>
                    </div>
                  </label>
                </div>
              </section>
            )}

            {/* 07. STATUS & PUBLISH MODE */}
            <section id="sec-status" className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4 scroll-mt-20">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#00875A] flex items-center justify-center font-bold text-xs">07</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Trạng Thái Hiển Thị</h3>
                  <p className="text-[11px] text-slate-400">Thiết lập hiển thị công khai trên sàn hoặc lưu bản nháp.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('status', 'PUBLISHED')}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    form.status === 'PUBLISHED'
                      ? 'border-[#00875A] bg-emerald-50/60 text-[#00875A] font-bold shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl text-emerald-600">visibility</span>
                  <div>
                    <div className="text-xs">Đang Bán Công Khai</div>
                    <div className="text-[10.5px] text-slate-400 font-normal">Hiển thị cho độc giả mua ngay</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('status', 'DRAFT')}
                  className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    form.status === 'DRAFT'
                      ? 'border-amber-500 bg-amber-50/60 text-amber-800 font-bold shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl text-amber-600">edit_note</span>
                  <div>
                    <div className="text-xs">Bản Nháp (Ẩn)</div>
                    <div className="text-[10.5px] text-slate-400 font-normal">Chưa mở bán trên sàn</div>
                  </div>
                </button>
              </div>
            </section>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Link
                href="/seller/products"
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Hủy Bỏ
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                <span>Lưu Thay Đổi &amp; Xác Thực</span>
              </button>
            </div>
          </div>

          {/* Right Column: SEO Audit & Preview */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* SEO AUDIT CARD */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-3 sticky top-20">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#00875A] text-base">analytics</span>
                  <span>Điểm Tối Ưu SEO</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold font-mono ${
                  seoAudit.score >= 70 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {seoAudit.score}/100
                </span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    seoAudit.score >= 70 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${seoAudit.score}%` }}
                />
              </div>

              <div className="space-y-2 text-xs pt-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Tiêu đề sách chuẩn SEO</span>
                  <span className={form.title.length >= 10 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {form.title.length >= 10 ? '✓ Đạt' : 'Chưa đạt'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Mô tả tác phẩm chi tiết</span>
                  <span className={form.description.length >= 50 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {form.description.length >= 50 ? '✓ Đạt' : 'Chưa đạt'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Ảnh bìa chất lượng cao</span>
                  <span className={form.coverUrl ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {form.coverUrl ? '✓ Đạt' : 'Chưa có'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">Thẻ tìm kiếm (Từ khóa)</span>
                  <span className={tags.length >= 2 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                    {tags.length >= 2 ? '✓ Đạt' : 'Cần >= 2 thẻ'}
                  </span>
                </div>
              </div>

              {/* SERP PREVIEW */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-700">Xem Trước Google SERP</span>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSerpDevice('mobile')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${serpDevice === 'mobile' ? 'bg-[#00875A] text-white font-bold' : 'bg-slate-100 text-slate-600'}`}
                    >
                      Mobile
                    </button>
                    <button
                      type="button"
                      onClick={() => setSerpDevice('desktop')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${serpDevice === 'desktop' ? 'bg-[#00875A] text-white font-bold' : 'bg-slate-100 text-slate-600'}`}
                    >
                      Desktop
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left font-sans text-xs">
                  <div className="text-[10px] text-slate-400 truncate">https://huki.vn › book › {bookId}</div>
                  <div className="font-bold text-blue-700 text-xs truncate mt-0.5">
                    {form.title || 'Tên sách mẫu chuẩn SEO'} | HUKI Ebook
                  </div>
                  <div className="text-[10.5px] text-slate-600 line-clamp-2 mt-1">
                    {form.description || form.teaser || 'Đọc thử và mua sách trực tuyến bản quyền tại HUKI Ebook.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
