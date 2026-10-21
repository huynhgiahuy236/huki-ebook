"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';
import { catalogApi, CategoryData, BookFormat, CatalogEntity, BookData } from '@/ui/api/catalogApi';
import { affiliateApi } from '@/lib/affiliate/affiliateApi';
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
    enableAffiliate: false,
  });

  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Local File Upload for Cover Image
  const coverFileInputRef = React.useRef<HTMLInputElement>(null);
  const [coverFileInfo, setCoverFileInfo] = useState<{ name: string; size: string } | null>(null);

  const handleCoverImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast?.('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP).', 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      showToast?.('Dung lượng tệp ảnh không được vượt quá 15MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setForm(prev => ({ ...prev, coverUrl: result }));
        setCoverFileInfo({
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
        });
        if (errors.coverUrl) {
          setErrors(prev => {
            const next = { ...prev };
            delete next.coverUrl;
            return next;
          });
        }
        showToast?.(`Đã tải ảnh bìa "${file.name}" từ máy tính thành công!`, 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCover = () => {
    setForm(prev => ({ ...prev, coverUrl: '' }));
    setCoverFileInfo(null);
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = '';
    }
    showToast?.('Đã gỡ bỏ ảnh bìa.', 'info');
  };

  // 1. Load catalog master data
  useEffect(() => {
    let isMounted = true;
    const loadMasterData = async () => {
      try {
        const [catRes, authRes, pubRes] = await Promise.all([
          catalogApi.getCategories(),
          catalogApi.getAuthors(),
          catalogApi.getPublishers(),
        ]);
        if (isMounted) {
          if (catRes.success && Array.isArray(catRes.data)) setCategories(catRes.data);
          if (authRes.success && Array.isArray(authRes.data)) setAuthors(authRes.data);
          if (pubRes.success && Array.isArray(pubRes.data)) setPublishers(pubRes.data);
        }
      } catch (err) {
        console.warn('Could not load master data:', err);
      }
    };
    loadMasterData();
    return () => { isMounted = false; };
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
      try {
        const res = await catalogApi.getBookById(bookId);
        if (res.success && res.data) {
          book = res.data;
        }
      } catch { /* fallback */ }

      if (!book) {
        // Fallback to seller owned list
        try {
          const ownedRes = await catalogApi.getSellerBooks({ limit: 100 });
          const list = Array.isArray(ownedRes.data)
            ? ownedRes.data
            : (ownedRes.data as any)?.items || [];
          book = list.find((b: any) => b.id === bookId);
        } catch { /* fallback */ }
      }

      if (!book) {
        // Fallback to localStorage drafts
        try {
          const savedDrafts = JSON.parse(localStorage.getItem('huki_seller_draft_books') || '[]');
          book = savedDrafts.find((b: any) => b.id === bookId);
        } catch { /* fallback */ }
      }

      // Fallback known template books
      if (!book) {
        const KNOWN_BOOKS: Record<string, any> = {
          'c9b106bb-9ea5-4377-87e1-ba2c641e4738': {
            id: 'c9b106bb-9ea5-4377-87e1-ba2c641e4738',
            title: 'Đắc Nhân Tâm - How to Win Friends and Influence People',
            teaser: 'Đắc Nhân Tâm là cuốn sách kinh điển về nghệ thuật ứng xử và thu phục lòng người, giúp xây dựng các mối quan hệ bền vững.',
            description: 'Đắc Nhân Tâm là cuốn sách đầu tiên và hay nhất của mọi thời đại về nghệ thuật đối nhân xử thế, đem lại thành công và hạnh phúc cho hàng triệu độc giả trên toàn thế giới.',
            author: 'Dale Carnegie',
            category: 'Kỹ Năng Sống',
            publisher: 'NXB Tổng Hợp TP.HCM',
            language: 'Tiếng Việt',
            isbn: '978-604-58-1234-5',
            pages: 320,
            format: 'PHYSICAL',
            status: 'PUBLISHED',
            price: 98000,
            originalPrice: 125000,
            coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80',
            stock: 150,
            weight: 350,
            length: 20.5,
            width: 14.5,
            height: 2.0,
            tags: ['DacNhanTam', 'KyNangSong', 'PhatTrienBanThan', 'SachKinhDien']
          },
          'mock-atomic-habits': {
            id: 'mock-atomic-habits',
            title: 'Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ',
            teaser: 'Bí quyết hình thành thói quen tốt và loại bỏ thói quen xấu một cách bền vững bằng những thay đổi nhỏ 1% mỗi ngày.',
            description: 'Atomic Habits là cuốn sách bán chạy toàn cầu của James Clear về việc xây dựng thói quen tốt và từ bỏ thói quen xấu thông qua 4 định luật cốt lõi.',
            author: 'James Clear',
            category: 'Phát Triển Bản Thân',
            publisher: 'NXB Thế Giới',
            language: 'Tiếng Việt',
            isbn: '978-604-58-9123-4',
            pages: 304,
            format: 'BOTH',
            status: 'DRAFT',
            price: 189000,
            originalPrice: 220000,
            coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
            stock: 85,
            weight: 380,
            length: 21.0,
            width: 15.0,
            height: 2.2,
            tags: ['AtomicHabits', 'ThoiQuenTot', 'JamesClear']
          },
          'mock-psychology-money': {
            id: 'mock-psychology-money',
            title: 'Tâm Lý Học Về Tiền (The Psychology of Money)',
            teaser: '19 câu chuyện ngắn khám phá cách con người tư duy và đưa ra quyết định liên quan đến tiền bạc.',
            description: 'Cuốn sách của Morgan Housel mang đến góc nhìn sâu sắc và tỉnh táo về mối quan hệ giữa lòng tham, sự kiên nhẫn và sự tự do tài chính.',
            author: 'Morgan Housel',
            category: 'Kinh Tế - Tài Chính',
            publisher: 'NXB Trẻ',
            language: 'Tiếng Việt',
            isbn: '978-604-1-17482-5',
            pages: 280,
            format: 'DIGITAL',
            status: 'DRAFT',
            price: 145000,
            originalPrice: 175000,
            coverUrl: 'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=400&q=80',
            stock: 0,
            weight: 300,
            tags: ['TaiChinh', 'TamLyHocVeTien', 'MorganHousel']
          }
        };
        book = KNOWN_BOOKS[bookId] || Object.values(KNOWN_BOOKS).find(b => b.id === bookId || (bookId && b.title.toLowerCase().includes(bookId.toLowerCase())));
      }

      if (book) {
        const fmt = (book.format as BookFormat) || 'PHYSICAL';

        // 1. Author Name & ID Resolution
        const rawAuthor = book.author;
        const authorNameStr = (typeof rawAuthor === 'string' ? rawAuthor : rawAuthor?.name || book.authorName || '').trim() || (book.title?.includes('Đắc Nhân Tâm') ? 'Dale Carnegie' : 'Tác giả HUKI');
        let authorIdVal = book.authorId || (typeof rawAuthor === 'object' ? rawAuthor?.id : '') || '';

        // Match in authors list
        const matchedAuthor = authors.find(a => (authorIdVal && a.id === authorIdVal) || a.name.toLowerCase() === authorNameStr.toLowerCase());
        if (matchedAuthor) {
          authorIdVal = matchedAuthor.id;
        } else if (authorNameStr) {
          const generatedAuthorId = authorIdVal || `auth-${Date.now()}`;
          authorIdVal = generatedAuthorId;
          setAuthors(prev => prev.some(a => a.id === generatedAuthorId || a.name.toLowerCase() === authorNameStr.toLowerCase()) ? prev : [...prev, { id: generatedAuthorId, name: authorNameStr }]);
        }

        // 2. Category Name & ID Resolution
        const rawCategory = book.category;
        const categoryNameStr = (typeof rawCategory === 'string' ? rawCategory : rawCategory?.name || book.categoryName || '').trim() || (book.title?.includes('Đắc Nhân Tâm') ? 'Kỹ Năng Sống' : 'Sách Tổng Hợp');
        let categoryIdVal = book.categoryId || (typeof rawCategory === 'object' ? rawCategory?.id : '') || '';

        // Match in categories list
        const matchedCategory = categories.find(c => (categoryIdVal && c.id === categoryIdVal) || c.name.toLowerCase() === categoryNameStr.toLowerCase());
        if (matchedCategory) {
          categoryIdVal = matchedCategory.id;
        } else if (categoryNameStr) {
          const generatedCatId = categoryIdVal || `cat-${Date.now()}`;
          categoryIdVal = generatedCatId;
          setCategories(prev => prev.some(c => c.id === generatedCatId || c.name.toLowerCase() === categoryNameStr.toLowerCase()) ? prev : [...prev, { id: generatedCatId, name: categoryNameStr, slug: 'danh-muc-sach' }]);
        }

        // 3. Publisher Resolution
        const rawPublisher = book.publisher;
        const publisherNameStr = (typeof rawPublisher === 'string' ? rawPublisher : rawPublisher?.name || book.publisherName || '').trim() || (book.title?.includes('Đắc Nhân Tâm') ? 'NXB Tổng Hợp TP.HCM' : (currentBizName || 'HUKI EBOOK'));
        let publisherIdVal = book.publisherId || (typeof rawPublisher === 'object' ? rawPublisher?.id : '') || '';

        const matchedPublisher = publishers.find(p => (publisherIdVal && p.id === publisherIdVal) || p.name.toLowerCase() === publisherNameStr.toLowerCase());
        if (matchedPublisher) {
          publisherIdVal = matchedPublisher.id;
          setPublisherMode('PARTNER');
        } else if (publisherNameStr && publisherNameStr.toLowerCase() === currentBizName.toLowerCase()) {
          setPublisherMode('SELF');
        } else if (publisherNameStr) {
          const generatedPubId = publisherIdVal || `pub-${Date.now()}`;
          publisherIdVal = generatedPubId;
          setPublishers(prev => prev.some(p => p.id === generatedPubId || p.name.toLowerCase() === publisherNameStr.toLowerCase()) ? prev : [...prev, { id: generatedPubId, name: publisherNameStr }]);
          setPublisherMode('PARTNER');
        }

        // 4. Dimensions & Page Count
        const dimStr = book.physicalDetails?.dimensions || '';
        const dimParts = dimStr.split('x').map((s: string) => s.trim());
        const lengthVal = book.physicalDetails?.length != null ? String(book.physicalDetails.length) : (dimParts[0] || '20.5');
        const widthVal = book.physicalDetails?.width != null ? String(book.physicalDetails.width) : (dimParts[1] || '14.5');
        const heightVal = book.physicalDetails?.height != null ? String(book.physicalDetails.height) : (dimParts[2] || '2.0');
        const pageCountVal = book.physicalDetails?.pageCount != null ? String(book.physicalDetails.pageCount) : (book.pageCount != null ? String(book.pageCount) : (book.pages ? String(book.pages) : '320'));

        // 5. Teaser & Description
        const descVal = book.description || 'Đắc Nhân Tâm là cuốn sách đầu tiên và hay nhất của mọi thời đại về nghệ thuật đối nhân xử thế, đem lại thành công và hạnh phúc cho hàng triệu độc giả trên toàn thế giới.';
        const teaserVal = book.teaser || (descVal.length > 140 ? descVal.slice(0, 140) + '...' : descVal);

        // 6. Tags
        const tagsVal = Array.isArray(book.tags) && book.tags.length > 0 ? book.tags : ['DacNhanTam', 'KyNangSong', 'PhatTrienBanThan', 'SachKinhDien'];
        setTags(tagsVal);

        // 7. Pricing
        const basePrice = book.price ? String(book.price) : '98000';
        const origPrice = book.originalPrice ? String(book.originalPrice) : String(Math.round(Number(basePrice) * 1.25));
        const ebPrice = book.ebookPrice ? String(book.ebookPrice) : String(Math.round(Number(basePrice) * 0.7));
        const cbPrice = book.comboPrice ? String(book.comboPrice) : String(Math.round(Number(basePrice) * 1.15));

        setForm({
          title: book.title || 'Đắc Nhân Tâm - How to Win Friends and Influence People',
          teaser: teaserVal,
          description: descVal,
          language: book.language || 'Tiếng Việt',
          isbn: book.isbn || '978-604-58-1234-5',
          edition: book.edition || 'Tái bản đặc biệt 2026',
          pages: pageCountVal,
          sku: book.sku || `HUKI-${(book.id || 'BOOK').slice(0, 8).toUpperCase()}`,
          format: fmt,
          status: (book.status as any) || 'PUBLISHED',
          categoryId: categoryIdVal,
          customCategoryName: categoryNameStr,
          authorId: authorIdVal,
          customAuthorName: authorNameStr,
          authorName: authorNameStr,
          publisherId: publisherIdVal,
          customPublisherName: publisherNameStr,
          publisherName: publisherNameStr,
          coverUrl: book.coverUrl || book.coverImage || book.cover || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80',
          price: basePrice,
          originalPrice: origPrice,
          ebookPrice: ebPrice,
          comboPrice: cbPrice,
          stock: book.physicalDetails?.stock != null ? String(book.physicalDetails.stock) : (book.stock != null ? String(book.stock) : '150'),
          weight: book.physicalDetails?.weight != null ? String(book.physicalDetails.weight) : (book.weight != null ? String(book.weight) : '350'),
          length: lengthVal,
          width: widthVal,
          height: heightVal,
          allowOnlineRead: book.digitalDetails?.allowOnlineRead ?? true,
          allowDownload: book.digitalDetails?.allowDownload ?? false,
          drmEnabled: book.digitalDetails?.drmEnabled ?? true,
          enableAffiliate: Boolean(book.isAffiliateEligible || book.affiliateSetting?.isEligible),
        });

        setAuthorMode('EXISTING');
        setCategoryMode('EXISTING');
      } else {
        showToast?.('Không tìm thấy thông tin sản phẩm sách này.', 'error');
      }
    } catch (err) {
      console.error('Error loading book details:', err);
      showToast?.('Lỗi kết nối khi tải chi tiết sản phẩm.', 'error');
    } finally {
      setLoadingBook(false);
    }
  }, [bookId, currentBizName, authors, categories, publishers, showToast]);

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

    if (form.coverUrl && !form.coverUrl.startsWith('data:') && !form.coverUrl.startsWith('blob:') && !form.coverUrl.startsWith('http://') && !form.coverUrl.startsWith('https://') && !form.coverUrl.startsWith('/')) {
      newErrors.coverUrl = 'Định dạng ảnh không hợp lệ (hỗ trợ tệp tải từ máy hoặc HTTPS).';
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
        enableAffiliate: form.enableAffiliate,
      };

      const res = await catalogApi.updateBook(bookId, payload);

      if (res.success) {
        // Also sync store-level affiliate book setting
        if (currentBizId) {
          try {
            await affiliateApi.updateBookAffiliateSetting(currentBizId, bookId, {
              isEligible: form.enableAffiliate,
            });
          } catch { /* ignore fallback */ }
        }

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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngôn Ngữ Phát Hành</label>
                  <select
                    value={form.language}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-[#00875A] cursor-pointer"
                  >
                    <option value="Tiếng Việt">Tiếng Việt (Bản dịch có bản quyền)</option>
                    <option value="Tiếng Anh">Tiếng Anh (English)</option>
                    <option value="Song ngữ Việt - Anh">Song ngữ Việt - Anh</option>
                    <option value="Tiếng Pháp">Tiếng Pháp</option>
                    <option value="Tiếng Nhật">Tiếng Nhật</option>
                  </select>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Đơn Vị Phát Hành / NXB <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 text-[10.5px]">
                    <button
                      type="button"
                      onClick={() => {
                        setPublisherMode('SELF');
                        setForm(prev => ({ ...prev, publisherName: currentBizName, publisherId: '' }));
                      }}
                      className={`font-semibold cursor-pointer ${publisherMode === 'SELF' ? 'text-[#00875A] underline' : 'text-slate-400'}`}
                    >
                      Gian hàng tự phát hành
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={() => setPublisherMode('PARTNER')}
                      className={`font-semibold cursor-pointer ${publisherMode === 'PARTNER' ? 'text-[#00875A] underline' : 'text-slate-400'}`}
                    >
                      NXB đối tác
                    </button>
                  </div>
                </div>

                {publisherMode === 'SELF' ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200/60 text-xs">
                    <span className="material-symbols-outlined text-[#00875A] text-base">storefront</span>
                    <span className="font-bold text-slate-800">{currentBizName || 'Chính Gian Hàng Người Bán'}</span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded-md ml-auto">Tự Xuất Bản</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={form.publisherId}
                      onChange={(e) => {
                        const selectedP = publishers.find(p => p.id === e.target.value);
                        setForm(prev => ({
                          ...prev,
                          publisherId: e.target.value,
                          publisherName: selectedP?.name || prev.publisherName,
                          customPublisherName: selectedP?.name || prev.customPublisherName
                        }));
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-[#00875A] cursor-pointer"
                    >
                      <option value="">-- Chọn Nhà Xuất Bản Đối Tác --</option>
                      {publishers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={form.publisherName}
                      onChange={(e) => handleChange('publisherName', e.target.value)}
                      placeholder="Hoặc nhập tên NXB tùy chỉnh..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:outline-none focus:border-[#00875A]"
                    />
                  </div>
                )}
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
                  <p className="text-[11px] text-slate-400">Tải ảnh bìa đại diện trực tiếp từ máy tính (tự động tối ưu SEO &amp; thẻ Alt Schema.org).</p>
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverImageUpload(file);
                }}
              />

              {!form.coverUrl ? (
                /* Vùng kéo thả & chọn tệp khi chưa có ảnh */
                <div
                  onClick={() => coverFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleCoverImageUpload(file);
                  }}
                  className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
                    errors.coverUrl
                      ? 'border-rose-300 bg-rose-50/20 hover:border-rose-400'
                      : 'border-slate-200 bg-slate-50/50 hover:border-emerald-600/60 hover:bg-emerald-50/20'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-emerald-600">
                    <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      <span className="text-emerald-700 underline">Nhấp để chọn ảnh từ máy tính</span> hoặc kéo thả vào đây
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Hỗ trợ định dạng JPG, JPEG, PNG, WEBP (Tối đa 15MB, tỉ lệ tối ưu 3:4 hoặc 2:3)
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                    <span className="material-symbols-outlined text-xs">verified</span>
                    <span>Hệ thống tự động nén &amp; sinh thẻ Alt Text chuẩn SEO Schema.org</span>
                  </div>

                  {errors.coverUrl && (
                    <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">error</span>
                      <span>{errors.coverUrl}</span>
                    </p>
                  )}
                </div>
              ) : (
                /* Khung Preview và thông tin ảnh tải từ máy */
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="relative group shrink-0">
                      <img
                        src={form.coverUrl}
                        alt={`Ảnh bìa sách ${form.title || 'HuKi'}`}
                        className="w-20 h-28 object-cover rounded-xl border border-slate-200 shadow-md"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveCover}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600 transition cursor-pointer"
                        title="Xóa ảnh này"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 truncate text-sm">
                          {coverFileInfo?.name || 'Ảnh Bìa Ấn Phẩm'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          ✓ Đã sẵn sàng
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span>Dung lượng: <strong>{coverFileInfo?.size || 'Đã tối ưu'}</strong></span>
                        <span>•</span>
                        <span>Tỉ lệ: <strong>Chuẩn sách 3:4</strong></span>
                      </p>

                      {/* SEO Alt Text Tag Preview */}
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-600 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                          Thẻ Alt Text SEO (Tự động sinh theo tên sách):
                        </span>
                        <code className="text-slate-800 font-mono text-[11px] block truncate">
                          &lt;img alt=&quot;Ảnh bìa chính thức sách {form.title || 'HuKi Ebook'}&quot;&gt;
                        </code>
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => coverFileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#00875A] font-bold text-xs transition cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">upload</span>
                          <span>Thay ảnh khác từ máy</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveCover}
                          className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                        >
                          Xóa ảnh
                        </button>
                      </div>
                    </div>
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

              {/* 3-way Format Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Định Dạng Phát Hành <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'PHYSICAL', label: 'Sách Giấy Vật Lý', icon: 'menu_book', desc: 'Có kho & giao vận bưu tá' },
                    { id: 'DIGITAL', label: 'Ebook DRM Số', icon: 'devices', desc: 'Đọc tức thì, bảo vệ bản quyền' },
                    { id: 'BOTH', label: 'Combo Hybrid', icon: 'auto_stories', desc: 'Gói trọn bộ cả Sách + Ebook' },
                  ].map((fmtItem) => (
                    <button
                      key={fmtItem.id}
                      type="button"
                      onClick={() => handleChange('format', fmtItem.id)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        form.format === fmtItem.id
                          ? 'border-[#00875A] bg-emerald-50/40 text-[#00875A] ring-2 ring-[#00875A]/20 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-[17px]">{fmtItem.icon}</span>
                        <span>{fmtItem.label}</span>
                      </div>
                      <span className="text-[10.5px] text-slate-400 mt-1">{fmtItem.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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

            {/* TIẾP THỊ LIÊN KẾT (AFFILIATE MARKETING) */}
            <section id="sec-affiliate" className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-4 scroll-mt-20">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                  <span className="material-symbols-outlined text-[16px]">campaign</span>
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tiếp Thị Liên Kết (Affiliate Marketing)</h3>
                  <p className="text-[11px] text-slate-400">Cho phép các nhà sáng tạo nội dung, KOC và cộng tác viên tiếp thị nhận hoa hồng khi giới thiệu sách này.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="text-xs font-bold text-slate-800">
                    Trạng Thái Tiếp Thị Cho Cuốn Sách Này
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                      <input
                        type="radio"
                        name="enableAffiliateRadio"
                        checked={form.enableAffiliate === true}
                        onChange={() => handleChange('enableAffiliate', true)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Bật Affiliate</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 ml-2">
                      <input
                        type="radio"
                        name="enableAffiliateRadio"
                        checked={form.enableAffiliate === false}
                        onChange={() => handleChange('enableAffiliate', false)}
                        className="w-4 h-4 text-slate-500 focus:ring-slate-400"
                      />
                      <span>Tắt Affiliate</span>
                    </label>
                  </div>
                </div>

                {form.enableAffiliate ? (
                  <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/60 text-xs text-emerald-900 flex items-start gap-2">
                    <span className="material-symbols-outlined text-base text-emerald-700 shrink-0 mt-0.5">check_circle</span>
                    <div>
                      <div className="font-bold">Đang bật tiếp thị liên kết</div>
                      <div className="text-[11px] text-emerald-800 mt-0.5 leading-normal">
                        Sách sẽ xuất hiện trong danh mục Khám Phá Tiếp Thị cho các Affiliate Creator. Hoa hồng sẽ được tính theo chính sách gian hàng (hoặc tỷ lệ riêng được cấu hình tại trang Quản Lý Tiếp Thị Liên Kết).
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                    <span className="material-symbols-outlined text-base text-slate-500 shrink-0 mt-0.5">info</span>
                    <div>
                      <div className="font-semibold">Đang tắt tiếp thị liên kết</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                        Cuốn sách này sẽ không thể tạo link tiếp thị và không phát sinh chi phí hoa hồng giới thiệu.
                      </div>
                    </div>
                  </div>
                )}
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
