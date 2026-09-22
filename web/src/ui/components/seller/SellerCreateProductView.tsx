"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';
import { catalogApi, CategoryData, BookFormat, CatalogEntity } from '@/ui/api/catalogApi';
import { businessApi } from '@/ui/api/businessApi';
import { can, PERMISSIONS, PermissionKey } from '@/ui/utils/permissions';

// Slug Generator Utility
function generateSlug(text: string) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export interface SellerCreateProductProps {
  initialFormat?: BookFormat;
}

interface SeoCheck {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  tip: string;
}

function SellerCreateProductContent({ initialFormat = 'BOTH' }: SellerCreateProductProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { user, activeBusinessId } = useAuth();

  const currentBizId = user?.business?.id || activeBusinessId || undefined;
  const currentBizName = user?.business?.name || 'Doanh nghiệp của bạn';
  const canCreateProduct = can(PERMISSIONS.PRODUCT_CREATE as PermissionKey, currentBizId, user);

  // Determine current format from URL pathname or initialFormat prop
  const getFormatFromUrl = (): BookFormat => {
    const path = pathname?.toLowerCase() || '';
    if (path.includes('physical')) return 'PHYSICAL';
    if (path.includes('ebook')) return 'DIGITAL';
    if (path.includes('hybrid')) return 'BOTH';
    const formatQuery = searchParams.get('format')?.toUpperCase();
    if (formatQuery === 'PHYSICAL' || formatQuery === 'DIGITAL' || formatQuery === 'BOTH') {
      return formatQuery as BookFormat;
    }
    return initialFormat;
  };

  const [selectedFormat, setSelectedFormat] = useState<BookFormat>(getFormatFromUrl());
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [authors, setAuthors] = useState<CatalogEntity[]>([]);
  const [publishers, setPublishers] = useState<CatalogEntity[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('sec-basic');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Category Logic: 'EXISTING' | 'CUSTOM'
  const [categoryMode, setCategoryMode] = useState<'EXISTING' | 'CUSTOM'>('EXISTING');
  // Publisher Logic: 'SELF' | 'PARTNER'
  const [publisherMode, setPublisherMode] = useState<'SELF' | 'PARTNER'>('SELF');
  // Author Logic: 'EXISTING' | 'CUSTOM'
  const [authorMode, setAuthorMode] = useState<'EXISTING' | 'CUSTOM'>('EXISTING');
  // SERP Preview Device: 'mobile' | 'desktop'
  const [serpDevice, setSerpDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Form State
  const [form, setForm] = useState({
    title: '',
    teaser: '',
    description: '',
    language: 'Tiếng Việt',
    publishDate: new Date().toISOString().split('T')[0],
    isbn: '',
    edition: 'Tái bản lần 1',
    pages: 250,
    sku: '',
    categoryId: '',
    customCategoryName: '',
    authorId: '',
    customAuthorName: '',
    authorName: '',
    publisherId: '',
    customPublisherName: '',
    publisherName: currentBizName,
    coverUrl: '',
    physicalPrice: '',
    originalPrice: '',
    ebookPrice: '',
    comboPrice: '',
    stock: 100,
    weight: 350,
    length: 20.5,
    width: 14.5,
    height: 2.0,
    allowOnlineRead: true,
    allowDownload: false,
    drmEnabled: true,
    ebookFile: null as File | null,
    publishMode: 'instant' as 'instant' | 'draft',
  });

  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Sync format if URL changes externally
  useEffect(() => {
    const urlFormat = getFormatFromUrl();
    if (urlFormat !== selectedFormat) {
      setSelectedFormat(urlFormat);
    }
  }, [pathname, searchParams]);

  // Load categories, authors, publishers from Backend
  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoryRes, authorRes, publisherRes] = await Promise.all([
          catalogApi.getCategories(),
          catalogApi.getAuthors(),
          catalogApi.getPublishers(),
        ]);
        const categoryData = categoryRes.success && Array.isArray(categoryRes.data) ? categoryRes.data : [];
        const authorData = authorRes.success && Array.isArray(authorRes.data) ? authorRes.data : [];
        const publisherData = publisherRes.success && Array.isArray(publisherRes.data) ? publisherRes.data : [];
        
        setCategories(categoryData);
        setAuthors(authorData);
        setPublishers(publisherData);
        
        setForm(prev => ({
          ...prev,
          categoryId: prev.categoryId || categoryData[0]?.id || '',
          authorId: prev.authorId || (authorData.length > 0 ? authorData[0].id : ''),
          authorName: prev.authorName || (authorData.length > 0 ? authorData[0].name : ''),
          publisherName: currentBizName,
        }));
      } catch (err) {
        console.warn('Could not load catalog master data', err);
      }
    };
    loadData();
  }, [currentBizName]);

  // Nạp dữ liệu mẫu
  const handleFillDemoData = () => {
    setCategoryMode('EXISTING');
    setAuthorMode('EXISTING');
    setPublisherMode('SELF');
    setForm(prev => ({
      ...prev,
      title: 'Đắc Nhân Tâm – Nghệ Thuật Thu Phục Lòng Người',
      teaser: 'Tác phẩm kinh điển vượt thời gian về nghệ thuật giao tiếp và xây dựng các mối quan hệ bền vững.',
      description: 'Đắc Nhân Tâm là cuốn sách đầu tiên và hay nhất của mọi thời đại về nghệ thuật đối nhân xử thế, đem lại thành công và hạnh phúc cho hàng triệu độc giả trên toàn thế giới.',
      isbn: '978-604-58-1234-5',
      pages: 320,
      coverUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBldhgYiC5r8pQXi4qeHSTCtWbbqbNG3on0MvhA1aDlNqhPWUc0vxDN66WP08gQOhujNyn9ioDRAdk0WMZ2kusBW1UaNz_drE-pr1z6kDX__xWCUYXEou-HgS4oTKLU_PdZUYQU71wmsMrkWVQ2QQQ9TpzYAwBodRXxIwHfqU3BdZALmt5R3bfLCpA0TV9C5YDY7LX8yfeFuJj3ZWernvxTjnpvNMG56GL6j2j-E-XC_WY454GWEaLicw',
      physicalPrice: '128000',
      originalPrice: '160000',
      ebookPrice: '59000',
      comboPrice: '159000',
      stock: 50,
      weight: 400,
    }));
    setTags(['Kỹ năng sống', 'Giao tiếp', 'Phát triển bản thân']);
    setErrors({});
    showToast?.('Đã nạp dữ liệu mẫu chuẩn SEO thành công!', 'info');
  };

  // Format switch handler
  const handleFormatChange = (format: BookFormat) => {
    setSelectedFormat(format);
    setErrors({});
    let targetUrl = '/seller/product/create-hybrid';
    if (format === 'PHYSICAL') targetUrl = '/seller/product/create-physical';
    if (format === 'DIGITAL') targetUrl = '/seller/product/create-ebook';
    router.replace(targetUrl);
  };

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // SEO Health & Score Analyzer
  const seoAudit = useMemo(() => {
    let score = 0;
    const checks: SeoCheck[] = [];

    const titleLen = form.title.trim().length;
    if (titleLen >= 30 && titleLen <= 65) {
      score += 25;
      checks.push({ id: 'title', label: `Độ dài tiêu đề tối ưu (${titleLen}/65 ký tự)`, status: 'pass', tip: 'Tiêu đề hiển thị trọn vẹn, không bị cắt bớt trên Google.' });
    } else if (titleLen > 65) {
      score += 15;
      checks.push({ id: 'title', label: `Tiêu đề hơi dài (${titleLen} ký tự)`, status: 'warn', tip: 'Google có thể cắt ngắn tiêu đề trên kết quả tìm kiếm (nên dưới 65 ký tự).' });
    } else if (titleLen > 0) {
      score += 10;
      checks.push({ id: 'title', label: `Tiêu đề ngắn (${titleLen} ký tự)`, status: 'warn', tip: 'Nên thêm từ khóa bổ trợ hoặc tên tác giả vào tiêu đề (tối ưu: 30 - 65 ký tự).' });
    } else {
      checks.push({ id: 'title', label: 'Chưa có tiêu đề sách', status: 'fail', tip: 'Vui lòng nhập tên sách để hệ thống tạo tiêu đề SEO.' });
    }

    const metaText = form.teaser.trim() || form.description.trim();
    const metaLen = metaText.length;
    if (metaLen >= 100 && metaLen <= 160) {
      score += 25;
      checks.push({ id: 'desc', label: `Thẻ mô tả Meta chuẩn Snippet (${metaLen}/160 ký tự)`, status: 'pass', tip: 'Độ dài hoàn hảo để kích thích tỷ lệ nhấp (CTR) từ Google.' });
    } else if (metaLen > 160) {
      score += 15;
      checks.push({ id: 'desc', label: `Mô tả tóm tắt hơi dài (${metaLen} ký tự)`, status: 'warn', tip: 'Google sẽ hiển thị dấu 3 chấm sau 160 ký tự.' });
    } else if (metaLen > 0) {
      score += 10;
      checks.push({ id: 'desc', label: `Mô tả tóm tắt ngắn (${metaLen} ký tự)`, status: 'warn', tip: 'Nên viết đoạn giới thiệu từ 100 - 160 ký tự.' });
    } else {
      checks.push({ id: 'desc', label: 'Chưa có mô tả tóm tắt (Teaser)', status: 'fail', tip: 'Cần có đoạn giới thiệu ngắn để tạo Meta Description cho bộ máy tìm kiếm.' });
    }

    if (form.isbn && form.isbn.trim().length >= 10) {
      score += 15;
      checks.push({ id: 'isbn', label: `Mã ISBN hợp lệ (${form.isbn})`, status: 'pass', tip: 'Tự động kích hoạt dữ liệu cấu trúc Schema.org/Book cho Google Books.' });
    } else {
      checks.push({ id: 'isbn', label: 'Chưa có mã ISBN chuẩn quốc tế', status: 'warn', tip: 'Bổ sung ISBN giúp sách hiển thị nổi bật trong mục Google Knowledge Panel.' });
    }

    if (form.coverUrl && form.coverUrl.startsWith('http')) {
      score += 15;
      checks.push({ id: 'img', label: 'Ảnh bìa hợp lệ sẵn sàng cho Social OpenGraph', status: 'pass', tip: 'Hình ảnh sắc nét sẽ hiển thị thumbnail đẹp trên Facebook, Zalo và Google.' });
    } else {
      checks.push({ id: 'img', label: 'Chưa có ảnh bìa URL', status: 'fail', tip: 'Cần URL ảnh bìa để tạo thẻ og:image và thumbnail.' });
    }

    const slug = generateSlug(form.title) || 'ten-sach';
    if (slug && slug.length >= 5) {
      score += 10;
      checks.push({ id: 'slug', label: `URL Slug chuẩn SEO: /sach/${slug}`, status: 'pass', tip: 'Đường dẫn ngắn gọn, không dấu, tối ưu lập chỉ mục.' });
    } else {
      checks.push({ id: 'slug', label: 'URL Slug chưa hoàn thiện', status: 'fail', tip: 'Cần tiêu đề sách để tự động sinh URL thân thiện.' });
    }

    if (tags.length >= 2) {
      score += 10;
      checks.push({ id: 'tags', label: `Đã gắn ${tags.length} từ khóa tìm kiếm (Tags)`, status: 'pass', tip: 'Giúp gia tăng khả năng hiển thị khi người dùng tìm kiếm theo chủ đề.' });
    } else {
      checks.push({ id: 'tags', label: 'Nên gắn ít nhất 2 từ khóa tìm kiếm', status: 'warn', tip: 'Thêm các từ khóa như tên tác giả, thể loại, chủ đề vào mục Tags.' });
    }

    const badge = score >= 80 
      ? { text: 'CHUẨN SEO XUẤT SẮC', color: 'text-emerald-700 bg-emerald-100 border-emerald-300' }
      : score >= 55 
      ? { text: 'SEO KHÁ (CẦN TỐI ƯU)', color: 'text-amber-700 bg-amber-100 border-amber-300' }
      : { text: 'CHƯA TỐI ƯU SEO', color: 'text-rose-700 bg-rose-100 border-rose-300' };

    return { score, slug, checks, badge };
  }, [form.title, form.teaser, form.description, form.isbn, form.coverUrl, tags]);

  // Combo Savings Helper
  const comboSavings = useMemo(() => {
    const phys = Number(form.physicalPrice) || 0;
    const eb = Number(form.ebookPrice) || 0;
    const combo = Number(form.comboPrice) || 0;
    if (selectedFormat === 'BOTH' && phys > 0 && eb > 0 && combo > 0) {
      const sum = phys + eb;
      const saved = sum - combo;
      const percent = Math.round((saved / sum) * 100);
      return { sum, saved, percent, isDiscounted: saved > 0, isOverpriced: saved < 0 };
    }
    return null;
  }, [selectedFormat, form.physicalPrice, form.ebookPrice, form.comboPrice]);

  // Form Validation
  const validateForm = (isDraft = false) => {
    const newErrors: Record<string, string> = {};
    const hasPhysical = selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH';
    const hasDigital = selectedFormat === 'DIGITAL' || selectedFormat === 'BOTH';

    if (!form.title || !form.title.trim()) {
      newErrors.title = 'Vui lòng nhập tên sản phẩm sách.';
    } else if (form.title.trim().length < 3) {
      newErrors.title = 'Tên sản phẩm phải có ít nhất 3 ký tự.';
    }

    if (!form.description || !form.description.trim()) {
      newErrors.description = 'Vui lòng nhập mô tả chi tiết cho tác phẩm.';
    }

    if (categoryMode === 'EXISTING' && !form.categoryId) {
      newErrors.categoryId = 'Vui lòng chọn danh mục chính cho sách.';
    } else if (categoryMode === 'CUSTOM' && !form.customCategoryName?.trim()) {
      newErrors.customCategoryName = 'Vui lòng nhập tên danh mục mới.';
    }

    if (authorMode === 'EXISTING' && !form.authorId && !form.authorName?.trim()) {
      newErrors.authorId = 'Vui lòng chọn tác giả từ danh sách hệ thống.';
    } else if (authorMode === 'CUSTOM' && !form.customAuthorName?.trim()) {
      newErrors.customAuthorName = 'Vui lòng nhập tên tác giả.';
    }

    if (publisherMode === 'PARTNER' && !form.publisherId && !form.customPublisherName?.trim()) {
      newErrors.publisherId = 'Vui lòng chọn hoặc nhập tên Nhà xuất bản cấp phép liên kết.';
    }

    if (!form.coverUrl || !form.coverUrl.trim()) {
      newErrors.coverUrl = 'Vui lòng cung cấp URL ảnh bìa sách.';
    } else if (!form.coverUrl.startsWith('http://') && !form.coverUrl.startsWith('https://') && !form.coverUrl.startsWith('/')) {
      newErrors.coverUrl = 'Đường dẫn ảnh bìa không hợp lệ (cần bắt đầu bằng http:// hoặc https://).';
    }

    if (selectedFormat === 'PHYSICAL') {
      if (!form.physicalPrice || Number(form.physicalPrice) <= 0) {
        newErrors.physicalPrice = 'Vui lòng nhập giá sách in lớn hơn 0 ₫.';
      }
    } else if (selectedFormat === 'DIGITAL') {
      if (!form.ebookPrice || Number(form.ebookPrice) <= 0) {
        newErrors.ebookPrice = 'Vui lòng nhập giá Ebook DRM lớn hơn 0 ₫.';
      }
    } else if (selectedFormat === 'BOTH') {
      const phys = Number(form.physicalPrice) || 0;
      const eb = Number(form.ebookPrice) || 0;
      const combo = Number(form.comboPrice) || 0;

      if (!form.comboPrice || combo <= 0) {
        newErrors.comboPrice = 'Vui lòng nhập giá bán Combo Hybrid lớn hơn 0 ₫.';
      } else if (phys > 0 && eb > 0 && combo > (phys + eb)) {
        newErrors.comboPrice = `Giá Combo Hybrid (${combo.toLocaleString('vi-VN')} ₫) không được vượt quá tổng giá gốc của sách giấy và ebook (${(phys + eb).toLocaleString('vi-VN')} ₫).`;
      }
      if (!form.physicalPrice || phys <= 0) {
        newErrors.physicalPrice = 'Vui lòng nhập giá sách in riêng lẻ.';
      }
      if (!form.ebookPrice || eb <= 0) {
        newErrors.ebookPrice = 'Vui lòng nhập giá Ebook DRM riêng lẻ.';
      }
    }

    if (hasPhysical) {
      if (form.stock === undefined || form.stock === null || String(form.stock) === '' || Number(form.stock) < 0) {
        newErrors.stock = 'Số lượng tồn kho phải là số nguyên không âm (≥ 0).';
      }
      if (!form.weight || Number(form.weight) <= 0) {
        newErrors.weight = 'Khối lượng đóng gói phải lớn hơn 0 gram.';
      }
    }

    if (hasDigital && !isDraft && form.publishMode === 'instant') {
      if (form.drmEnabled && !form.ebookFile) {
        newErrors.ebookFile = 'Vui lòng đính kèm tệp PDF Ebook để kích hoạt kho DRM trước khi phát hành.';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.title || newErrors.description) {
        scrollToSection('sec-basic');
      } else if (newErrors.categoryId || newErrors.customCategoryName || newErrors.authorId || newErrors.customAuthorName || newErrors.publisherId) {
        scrollToSection('sec-taxonomy');
      } else if (newErrors.coverUrl) {
        scrollToSection('sec-media');
      } else if (newErrors.physicalPrice || newErrors.ebookPrice || newErrors.comboPrice) {
        scrollToSection('sec-pricing');
      } else if (newErrors.stock || newErrors.weight) {
        scrollToSection('sec-inventory');
      } else if (newErrors.ebookFile) {
        scrollToSection('sec-drm');
      }
      return false;
    }

    return true;
  };

  // Submit Handler
  const handleSubmit = async (isDraft = false) => {
    if (!validateForm(isDraft)) {
      showToast?.('Vui lòng kiểm tra lại các thông tin bắt buộc còn thiếu hoặc chưa hợp lệ.', 'error');
      return;
    }

    const hasPhysical = selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH';
    const hasDigital = selectedFormat === 'DIGITAL' || selectedFormat === 'BOTH';
    const sellingPrice = selectedFormat === 'BOTH' ? form.comboPrice : hasPhysical ? form.physicalPrice : form.ebookPrice;

    setIsSubmitting(true);
    try {
      let businessId = user?.business?.id;
      if (!businessId) {
        try {
          const myBiz = await businessApi.getMyBusiness();
          if (myBiz.success && myBiz.data?.id) {
            businessId = myBiz.data.id;
          }
        } catch {
          // fallback
        }
      }

      if (!businessId) {
        showToast?.('Bạn cần có gian hàng doanh nghiệp đã được phê duyệt trước khi đăng sách.', 'error');
        return;
      }

      let resolvedCategoryId = form.categoryId;
      if (categoryMode === 'CUSTOM' && form.customCategoryName?.trim()) {
        const catName = form.customCategoryName.trim();
        const existingCat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
        if (existingCat) {
          resolvedCategoryId = existingCat.id;
        } else {
          try {
            const catRes = await catalogApi.createCategory({ name: catName });
            if (catRes.success && catRes.data?.id) {
              resolvedCategoryId = catRes.data.id;
              setCategories(prev => [...prev, catRes.data!]);
            }
          } catch (e) {
            console.warn('Could not create category on the fly', e);
          }
        }
      }

      let resolvedAuthorId: string | undefined = form.authorId;
      if (authorMode === 'CUSTOM' && form.customAuthorName?.trim()) {
        const authName = form.customAuthorName.trim();
        const existingAuth = authors.find(a => a.name.toLowerCase() === authName.toLowerCase());
        if (existingAuth) {
          resolvedAuthorId = existingAuth.id;
        } else {
          try {
            const authRes = await catalogApi.createAuthor({ name: authName });
            if (authRes.success && authRes.data?.id) {
              resolvedAuthorId = authRes.data.id;
              setAuthors(prev => [...prev, authRes.data!]);
            }
          } catch (e) {
            console.warn('Could not create author on the fly', e);
          }
        }
      } else if (authorMode === 'EXISTING' && form.authorId) {
        resolvedAuthorId = form.authorId;
      }

      let resolvedPublisherId: string | undefined = undefined;
      if (publisherMode === 'PARTNER' && form.publisherId) {
        resolvedPublisherId = form.publisherId;
      }

      const payload = {
        title: form.title.trim(),
        isbn: form.isbn?.trim() || undefined,
        description: form.description?.trim() || form.teaser?.trim(),
        price: Number(sellingPrice),
        format: selectedFormat,
        categoryId: resolvedCategoryId || undefined,
        authorId: resolvedAuthorId || undefined,
        publisherId: resolvedPublisherId,
        coverUrl: form.coverUrl?.trim() || undefined,
        businessId,
        ...(hasPhysical && {
          physicalDetails: {
            stock: Number(form.stock || 0),
            weight: Number(form.weight || 400),
            length: Number(form.length || 20.5),
            width: Number(form.width || 14.5),
            height: Number(form.height || 2.0),
            physicalEnabled: true,
          }
        }),
        ...(hasDigital && {
          digitalDetails: {
            digitalEnabled: true,
            allowOnlineRead: form.allowOnlineRead,
            allowDownload: form.allowDownload,
            drmEnabled: form.drmEnabled,
          }
        }),
      };

      const res = await catalogApi.createBook(payload);

      if (res.success && res.data?.id) {
        const bookId = res.data.id;

        if (hasDigital && form.ebookFile) {
          const uploadRes = await catalogApi.uploadBookFile(bookId, form.ebookFile);
          if (!uploadRes.success) {
            showToast?.(uploadRes.error?.message || 'Đã tạo sách nhưng không thể tải tệp Ebook lên kho DRM.', 'error');
            return;
          }
        }

        if (hasPhysical && Number(form.stock) > 0) {
          try {
            await catalogApi.updateInventory(bookId, Number(form.stock));
          } catch (e) {
            console.warn('Inventory update failed', e);
          }
        }

        if (!isDraft && form.publishMode === 'instant') {
          const publishRes = await catalogApi.publishBook(bookId);
          if (!publishRes.success) {
            showToast?.(publishRes.error?.message || 'Đã lưu sản phẩm nhưng chưa thể kích hoạt phát hành ngay.', 'error');
            return;
          }
        }

        const formatLabel = selectedFormat === 'BOTH' ? 'Hybrid Combo' : selectedFormat === 'PHYSICAL' ? 'Sách Giấy' : 'Ebook DRM';
        showToast?.(
          isDraft 
            ? `Đã lưu bản nháp "${form.title}" thành công!` 
            : `Đã xuất bản thành công ${formatLabel}: "${form.title}"!`, 
          'success'
        );

        router.push('/seller/products');
      } else {
        showToast?.(res.error?.message || 'Có lỗi khi tạo sản phẩm sách.', 'error');
      }
    } catch (err) {
      showToast?.('Không thể kết nối đến máy chủ khi đăng sách.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayCategoryName = categoryMode === 'EXISTING'
    ? (categories.find(c => c.id === form.categoryId)?.name || 'Chưa chọn danh mục')
    : (form.customCategoryName || 'Danh mục mới');

  const navItems = [
    { id: 'sec-basic', label: '01 Cơ Bản', completed: !!form.title && !!form.description },
    { 
      id: 'sec-taxonomy', 
      label: '02 Phân Loại & Tác Giả', 
      completed: ((categoryMode === 'EXISTING' && !!form.categoryId) || (categoryMode === 'CUSTOM' && !!form.customCategoryName)) &&
                 ((authorMode === 'EXISTING' && !!form.authorId) || (authorMode === 'CUSTOM' && !!form.customAuthorName))
    },
    { id: 'sec-media', label: '03 Media & Bìa Sách', completed: !!form.coverUrl },
    { 
      id: 'sec-pricing', 
      label: selectedFormat === 'BOTH' ? '04 Giá Kép Hybrid' : selectedFormat === 'PHYSICAL' ? '04 Giá Sách Giấy' : '04 Giá Ebook DRM', 
      completed: selectedFormat === 'BOTH' ? (Number(form.comboPrice) > 0) : selectedFormat === 'PHYSICAL' ? (Number(form.physicalPrice) > 0) : (Number(form.ebookPrice) > 0)
    },
    ...(selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH' ? [
      { id: 'sec-inventory', label: '05 Kho Sách Giấy', completed: form.stock >= 0 && Number(form.weight) > 0 },
      { id: 'sec-shipping', label: '06 Vận Chuyển', completed: Number(form.weight) > 0 }
    ] : []),
    ...(selectedFormat === 'DIGITAL' || selectedFormat === 'BOTH' ? [
      { id: 'sec-drm', label: '07 Tệp Ebook DRM', completed: !!form.ebookFile || form.publishMode === 'draft', drm: true }
    ] : []),
    { id: 'sec-seo', label: '08 Tối Ưu SEO', completed: seoAudit.score >= 70, seo: true },
    { id: 'sec-publish', label: '09 Chế Độ Mở Bán', completed: true }
  ];

  const getPageTitle = () => {
    switch (selectedFormat) {
      case 'PHYSICAL':
        return 'Thêm Sản Phẩm Mới (Sách Giấy & Kho Hàng)';
      case 'DIGITAL':
        return 'Thêm Sản Phẩm Mới (Ebook DRM Kỹ Thuật Số)';
      default:
        return 'Thêm Sản Phẩm Mới (Combo Sách Giấy & Ebook DRM)';
    }
  };

  const getPageSubtitle = () => {
    switch (selectedFormat) {
      case 'PHYSICAL':
        return `Tạo thông tin sách in và thiết lập tồn kho giao hàng cho gian hàng ${currentBizName}.`;
      case 'DIGITAL':
        return `Tạo ấn bản điện tử đọc số với bản quyền mã hóa HUKI DRM V3.4 cho gian hàng ${currentBizName}.`;
      default:
        return `Tạo gói phát hành kép (Sách in + Ebook DRM) đồng bộ cho gian hàng ${currentBizName}.`;
    }
  };

  const getSubmitButtonLabel = () => {
    switch (selectedFormat) {
      case 'PHYSICAL':
        return 'XUẤT BẢN SÁCH IN';
      case 'DIGITAL':
        return 'XUẤT BẢN EBOOK DRM';
      default:
        return 'XUẤT BẢN SÁCH HYBRID';
    }
  };

  const displayAuthorName = authorMode === 'EXISTING' ? (form.authorName || 'Chưa chọn tác giả') : (form.customAuthorName || 'Tác giả mới');
  const displayPublisherName = publisherMode === 'SELF' ? currentBizName : (form.customPublisherName || form.publisherName || currentBizName);

  if (!canCreateProduct) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4 border border-amber-500/20 shadow-xs">
          <span className="material-symbols-outlined text-3xl">lock</span>
        </div>
        <h2 className="text-xl font-bold font-editorial text-theme-on-surface mb-2">
          Không Có Quyền Truy Cập (403 Forbidden)
        </h2>
        <p className="text-xs sm:text-sm text-theme-on-surface-variant max-w-md mb-6">
          Tài khoản nhân viên của bạn chưa được cấp quyền đăng bán sản phẩm mới (`PRODUCT_CREATE`).
        </p>
        <Link
          href="/seller/products"
          className="px-4 py-2.5 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/90 transition-all shadow-sm"
        >
          Quay lại Danh Sách Sản Phẩm
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-background text-on-surface font-body-md text-body-md antialiased min-h-screen pt-4 pb-0 flex flex-col justify-between">
      <main className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-6 space-y-4 flex-1 pb-8">

        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-theme-border/60 pb-3.5">
          <div>
            <Link 
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:bg-theme-secondary-subtle px-2 py-0.5 rounded-lg transition-colors mb-1" 
              href="/seller/products"
            >
              <span className="material-symbols-outlined text-xs">arrow_back</span>
              <span>Danh Sách Sản Phẩm</span>
            </Link>
            <div className="flex items-center gap-2.5">
              <h1 className="font-headline-lg text-lg sm:text-xl font-bold text-on-surface tracking-tight">
                {getPageTitle()}
              </h1>
              <span className="px-2 py-0.2 rounded-full border border-theme-border bg-theme-secondary-subtle text-theme-primary font-label-sm text-[10px] tracking-wider uppercase font-bold">
                {form.publishMode === 'instant' ? 'SẴN SÀNG' : 'BẢN NHÁP'}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {getPageSubtitle()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={handleFillDemoData}
              className="px-2.5 py-1.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-xs font-semibold text-primary hover:bg-primary/10 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">auto_fix_high</span>
              <span>Nạp Dữ Liệu Mẫu</span>
            </button>
            <button 
              type="button"
              onClick={() => scrollToSection('sec-seo')}
              className="px-2.5 py-1.5 rounded-xl border border-theme-border bg-surface-container-lowest text-xs font-semibold text-primary hover:bg-primary/5 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">troubleshoot</span>
              <span>SEO ({seoAudit.score}/100)</span>
            </button>
          </div>
        </div>

        {/* Format Selector Cards */}
        <div className="bg-surface-container-lowest rounded-xl p-4 border border-theme-border/70 shadow-xs">
          <div className="mb-3">
            <h3 className="font-title-md text-sm font-bold text-on-surface">Định Dạng Sản Phẩm</h3>
            <p className="text-[11px] text-on-surface-variant">Chọn hình thức mà khách hàng có thể mua sản phẩm này trên HUKI.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            {/* 1. Physical */}
            <button
              type="button"
              onClick={() => handleFormatChange('PHYSICAL')}
              className={`text-left relative rounded-xl border p-3.5 cursor-pointer transition-all hover:shadow-xs flex flex-col justify-between group ${
                selectedFormat === 'PHYSICAL' 
                  ? 'border-primary bg-primary/[0.04] ring-2 ring-primary/15 shadow-2xs' 
                  : 'border-theme-border/80 bg-surface-container-lowest hover:border-primary/50 hover:bg-primary/[0.02]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    selectedFormat === 'PHYSICAL' ? 'bg-primary text-white shadow-xs' : 'bg-surface-container text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary'
                  }`}>
                    <span className="material-symbols-outlined text-lg">menu_book</span>
                  </div>
                  <div>
                    <h4 className={`font-title-md text-xs font-semibold transition-colors ${selectedFormat === 'PHYSICAL' ? 'text-primary font-bold' : 'text-on-surface group-hover:text-primary'}`}>
                      SÁCH GIẤY
                    </h4>
                    <span className="text-[9px] text-on-surface-variant font-medium tracking-wide uppercase">Vận chuyển vật lý</span>
                  </div>
                </div>
                {selectedFormat === 'PHYSICAL' ? (
                  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-xs">check</span>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-theme-border group-hover:border-primary/50 transition-colors"></div>
                )}
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2.5 leading-relaxed">
                Có tồn kho vật lý và đóng gói giao đến khách hàng qua đối tác vận chuyển.
              </p>
            </button>

            {/* 2. Ebook */}
            <button
              type="button"
              onClick={() => handleFormatChange('DIGITAL')}
              className={`text-left relative rounded-xl border p-3.5 cursor-pointer transition-all hover:shadow-xs flex flex-col justify-between group ${
                selectedFormat === 'DIGITAL' 
                  ? 'border-primary bg-primary/[0.04] ring-2 ring-primary/15 shadow-2xs' 
                  : 'border-theme-border/80 bg-surface-container-lowest hover:border-primary/50 hover:bg-primary/[0.02]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    selectedFormat === 'DIGITAL' ? 'bg-primary text-white shadow-xs' : 'bg-surface-container text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary'
                  }`}>
                    <span className="material-symbols-outlined text-lg">devices</span>
                  </div>
                  <div>
                    <h4 className={`font-title-md text-xs font-semibold transition-colors ${selectedFormat === 'DIGITAL' ? 'text-primary font-bold' : 'text-on-surface group-hover:text-primary'}`}>
                      EBOOK SỐ
                    </h4>
                    <span className="text-[9px] text-on-surface-variant font-medium tracking-wide uppercase">Bảo vệ bản quyền DRM</span>
                  </div>
                </div>
                {selectedFormat === 'DIGITAL' ? (
                  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-xs">check</span>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-theme-border group-hover:border-primary/50 transition-colors"></div>
                )}
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2.5 leading-relaxed">
                Đọc số ngay sau khi thanh toán qua trình đọc HUKI Reader bảo vệ bản quyền DRM.
              </p>
            </button>

            {/* 3. Hybrid Combo */}
            <button
              type="button"
              onClick={() => handleFormatChange('BOTH')}
              className={`text-left relative rounded-xl border p-3.5 cursor-pointer transition-all hover:shadow-xs flex flex-col justify-between group ${
                selectedFormat === 'BOTH' 
                  ? 'border-primary bg-primary/[0.04] ring-2 ring-primary/15 shadow-2xs' 
                  : 'border-theme-border/80 bg-surface-container-lowest hover:border-primary/50 hover:bg-primary/[0.02]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    selectedFormat === 'BOTH' ? 'bg-primary text-white shadow-xs' : 'bg-surface-container text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary'
                  }`}>
                    <span className="material-symbols-outlined text-lg">auto_stories</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className={`font-title-md text-xs font-semibold transition-colors ${selectedFormat === 'BOTH' ? 'text-primary font-bold' : 'text-on-surface group-hover:text-primary'}`}>
                        COMBO HYBRID
                      </h4>
                      <span className="px-1.5 py-0.2 bg-amber-500/10 text-amber-700 text-[9px] font-bold rounded">KHUYÊN DÙNG</span>
                    </div>
                    <span className="text-[9px] text-on-surface-variant font-medium tracking-wide uppercase">Sách in + Ebook đọc ngay</span>
                  </div>
                </div>
                {selectedFormat === 'BOTH' ? (
                  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-xs">check</span>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-theme-border group-hover:border-primary/50 transition-colors"></div>
                )}
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2.5 leading-relaxed">
                Khách nhận cả sách in vận chuyển và mở khóa Ebook đọc liền trong khi chờ giao hàng.
              </p>
            </button>
          </div>
        </div>

        {/* Main Grid: Form Sections + Sticky Quick Nav & Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Form Sections */}
          <div className="lg:col-span-8 space-y-4">

            {/* 01. Basic Info */}
            <section id="sec-basic" className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-theme-border/70 shadow-xs space-y-4 scroll-mt-20">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    01
                  </div>
                  <div>
                    <h3 className="font-title-md text-sm font-bold text-on-surface">Thông Tin Cơ Bản</h3>
                    <p className="text-[11px] text-on-surface-variant">Tên tác phẩm, tiêu đề phụ và giới thiệu sách.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Tên Sách / Tác Phẩm <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Ví dụ: Đắc Nhân Tâm – Nghệ Thuật Thu Phục Lòng Người"
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border ${errors.title ? 'border-red-500 ring-1 ring-red-500' : 'border-theme-border'} text-on-surface focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all`}
                />
                {errors.title && <p className="text-[10px] text-red-500 mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Mô Tả Tóm Tắt (Teaser)
                </label>
                <textarea 
                  rows={2}
                  value={form.teaser}
                  onChange={(e) => handleChange('teaser', e.target.value)}
                  placeholder="Đoạn văn ngắn (1-2 câu) nêu bật giá trị cuốn sách..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Mô Tả Chi Tiết / Giới Thiệu Nội Dung <span className="text-red-500">*</span>
                </label>
                <textarea 
                  rows={5}
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Nêu chi tiết nội dung, mục lục, đối tượng độc giả và lý do nên đọc cuốn sách này..."
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border ${errors.description ? 'border-red-500 ring-1 ring-red-500' : 'border-theme-border'} text-on-surface focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all`}
                />
                {errors.description && <p className="text-[10px] text-red-500 mt-1">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Ngôn Ngữ</label>
                  <input 
                    type="text"
                    value={form.language}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Mã ISBN Quốc Tế</label>
                  <input 
                    type="text"
                    value={form.isbn}
                    onChange={(e) => handleChange('isbn', e.target.value)}
                    placeholder="978-604-..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Số Trang</label>
                  <input 
                    type="number"
                    value={form.pages}
                    onChange={(e) => handleChange('pages', Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary"
                  />
                </div>
              </div>
            </section>

            {/* 02. Taxonomy & Authors */}
            <section id="sec-taxonomy" className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-theme-border/70 shadow-xs space-y-4 scroll-mt-20">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    02
                  </div>
                  <div>
                    <h3 className="font-title-md text-sm font-bold text-on-surface">Phân Loại, Tác Giả & Xuất Bản</h3>
                    <p className="text-[11px] text-on-surface-variant">Danh mục sách, tác giả và đối tác cấp phép.</p>
                  </div>
                </div>
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-on-surface">
                    Danh Mục Sách <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button 
                      type="button" 
                      onClick={() => setCategoryMode('EXISTING')}
                      className={`font-semibold cursor-pointer ${categoryMode === 'EXISTING' ? 'text-primary underline' : 'text-on-surface-variant'}`}
                    >
                      Chọn có sẵn
                    </button>
                    <span>|</span>
                    <button 
                      type="button" 
                      onClick={() => setCategoryMode('CUSTOM')}
                      className={`font-semibold cursor-pointer ${categoryMode === 'CUSTOM' ? 'text-primary underline' : 'text-on-surface-variant'}`}
                    >
                      Nhập danh mục mới
                    </button>
                  </div>
                </div>
                {categoryMode === 'EXISTING' ? (
                  <select 
                    value={form.categoryId}
                    onChange={(e) => handleChange('categoryId', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary"
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary"
                  />
                )}
                {errors.categoryId && <p className="text-[10px] text-red-500 mt-1">{errors.categoryId}</p>}
              </div>

              {/* Author */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-on-surface">
                    Tác Giả <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button 
                      type="button" 
                      onClick={() => setAuthorMode('EXISTING')}
                      className={`font-semibold cursor-pointer ${authorMode === 'EXISTING' ? 'text-primary underline' : 'text-on-surface-variant'}`}
                    >
                      Chọn tác giả
                    </button>
                    <span>|</span>
                    <button 
                      type="button" 
                      onClick={() => setAuthorMode('CUSTOM')}
                      className={`font-semibold cursor-pointer ${authorMode === 'CUSTOM' ? 'text-primary underline' : 'text-on-surface-variant'}`}
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
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary"
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary"
                  />
                )}
                {errors.authorId && <p className="text-[10px] text-red-500 mt-1">{errors.authorId}</p>}
              </div>

              {/* Publisher Mode */}
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Đơn Vị Phát Hành / Nhà Xuất Bản Liên Kết
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setPublisherMode('SELF')}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border text-left flex items-center gap-2 cursor-pointer transition-all ${
                      publisherMode === 'SELF' ? 'border-primary bg-primary/5 text-primary' : 'border-theme-border bg-surface-container-lowest text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">storefront</span>
                    <span>Chính gian hàng ({currentBizName})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublisherMode('PARTNER')}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border text-left flex items-center gap-2 cursor-pointer transition-all ${
                      publisherMode === 'PARTNER' ? 'border-primary bg-primary/5 text-primary' : 'border-theme-border bg-surface-container-lowest text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">handshake</span>
                    <span>Liên kết NXB cấp quyền</span>
                  </button>
                </div>

                {publisherMode === 'PARTNER' && (
                  <select 
                    value={form.publisherId}
                    onChange={(e) => handleChange('publisherId', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary"
                  >
                    <option value="">-- Chọn Nhà xuất bản đối tác --</option>
                    {publishers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </section>

            {/* 03. Media & Cover */}
            <section id="sec-media" className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-theme-border/70 shadow-xs space-y-4 scroll-mt-20">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    03
                  </div>
                  <div>
                    <h3 className="font-title-md text-sm font-bold text-on-surface">Ảnh Bìa & Media</h3>
                    <p className="text-[11px] text-on-surface-variant">Ảnh bìa sắc nét hiển thị tại trang chủ, giỏ hàng và danh mục.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Đường Dẫn URL Ảnh Bìa (Cover Image) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  value={form.coverUrl}
                  onChange={(e) => handleChange('coverUrl', e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border ${errors.coverUrl ? 'border-red-500 ring-1 ring-red-500' : 'border-theme-border'} text-on-surface focus:outline-hidden focus:border-primary`}
                />
                {errors.coverUrl && <p className="text-[10px] text-red-500 mt-1">{errors.coverUrl}</p>}
              </div>

              {form.coverUrl && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-theme-border">
                  <img 
                    src={form.coverUrl} 
                    alt="Cover preview" 
                    className="w-14 h-20 object-cover rounded-lg border border-theme-border shadow-xs"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="text-xs text-on-surface-variant">
                    <p className="font-semibold text-on-surface">Xem trước ảnh bìa sách</p>
                    <p className="text-[11px]">Tỉ lệ tối ưu: 3:4 hoặc 2:3, tối thiểu 600x800 px.</p>
                  </div>
                </div>
              )}
            </section>

            {/* 04. Pricing */}
            <section id="sec-pricing" className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-theme-border/70 shadow-xs space-y-4 scroll-mt-20">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    04
                  </div>
                  <div>
                    <h3 className="font-title-md text-sm font-bold text-on-surface">Giá Bán & Khuyến Mãi</h3>
                    <p className="text-[11px] text-on-surface-variant">Thiết lập giá bìa niêm yết và giá bán thực tế theo từng định dạng.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH') && (
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      Giá Sách In (₫) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number"
                      value={form.physicalPrice}
                      onChange={(e) => handleChange('physicalPrice', e.target.value)}
                      placeholder="120000"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary font-mono"
                    />
                    {errors.physicalPrice && <p className="text-[10px] text-red-500 mt-1">{errors.physicalPrice}</p>}
                  </div>
                )}

                {(selectedFormat === 'DIGITAL' || selectedFormat === 'BOTH') && (
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      Giá Ebook DRM (₫) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number"
                      value={form.ebookPrice}
                      onChange={(e) => handleChange('ebookPrice', e.target.value)}
                      placeholder="59000"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary font-mono"
                    />
                    {errors.ebookPrice && <p className="text-[10px] text-red-500 mt-1">{errors.ebookPrice}</p>}
                  </div>
                )}

                {selectedFormat === 'BOTH' && (
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      Giá Combo Hybrid (₫) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number"
                      value={form.comboPrice}
                      onChange={(e) => handleChange('comboPrice', e.target.value)}
                      placeholder="149000"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary font-mono"
                    />
                    {errors.comboPrice && <p className="text-[10px] text-red-500 mt-1">{errors.comboPrice}</p>}
                  </div>
                )}
              </div>

              {comboSavings && (
                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${comboSavings.isDiscounted ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  <span>Tổng mua lẻ: <strong>{comboSavings.sum.toLocaleString('vi-VN')} ₫</strong></span>
                  <span>{comboSavings.isDiscounted ? `Tiết kiệm: ${comboSavings.saved.toLocaleString('vi-VN')} ₫ (${comboSavings.percent}%)` : 'Combo chưa có ưu đãi'}</span>
                </div>
              )}
            </section>

            {/* 05. Inventory & Shipping (Physical only) */}
            {(selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH') && (
              <section id="sec-inventory" className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-theme-border/70 shadow-xs space-y-4 scroll-mt-20">
                <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      05
                    </div>
                    <div>
                      <h3 className="font-title-md text-sm font-bold text-on-surface">Tồn Kho & Kích Thước Đóng Gói</h3>
                      <p className="text-[11px] text-on-surface-variant">Thông số để tính cước vận chuyển tự động.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      Số Lượng Tồn Kho <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number"
                      value={form.stock}
                      onChange={(e) => handleChange('stock', Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      Khối Lượng (gram) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number"
                      value={form.weight}
                      onChange={(e) => handleChange('weight', Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">Dài (cm)</label>
                    <input 
                      type="number"
                      value={form.length}
                      onChange={(e) => handleChange('length', Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">Rộng (cm)</label>
                    <input 
                      type="number"
                      value={form.width}
                      onChange={(e) => handleChange('width', Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary font-mono"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* 06. DRM & Ebook File (Digital only) */}
            {(selectedFormat === 'DIGITAL' || selectedFormat === 'BOTH') && (
              <section id="sec-drm" className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-theme-border/70 shadow-xs space-y-4 scroll-mt-20">
                <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      06
                    </div>
                    <div>
                      <h3 className="font-title-md text-sm font-bold text-on-surface">Bảo Mật DRM & Tệp Ebook</h3>
                      <p className="text-[11px] text-on-surface-variant">Tải lên tệp PDF hoặc EPUB đã được mã hóa an toàn.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Đính Kèm Tệp Sách Điện Tử (PDF / EPUB)
                  </label>
                  <input 
                    type="file"
                    accept=".pdf,.epub"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setForm(prev => ({ ...prev, ebookFile: e.target.files![0] }));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary"
                  />
                  {form.ebookFile && (
                    <p className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      Đã chọn: {form.ebookFile.name} ({(form.ebookFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                  {errors.ebookFile && <p className="text-[10px] text-red-500 mt-1">{errors.ebookFile}</p>}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={form.drmEnabled}
                      onChange={(e) => handleChange('drmEnabled', e.target.checked)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span>Kích hoạt mã hóa chống sao chép DRM</span>
                  </label>
                </div>
              </section>
            )}

            {/* 07. SEO Optimizer */}
            <section id="sec-seo" className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-theme-border/70 shadow-xs space-y-4 scroll-mt-20">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    07
                  </div>
                  <div>
                    <h3 className="font-title-md text-sm font-bold text-on-surface">Tối Ưu SEO & Thẻ Tìm Kiếm</h3>
                    <p className="text-[11px] text-on-surface-variant">Xem trước cách sách hiển thị trên Google và các mạng xã hội.</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${seoAudit.badge.color}`}>
                  {seoAudit.badge.text} ({seoAudit.score}/100)
                </span>
              </div>

              {/* Tag / Keyword Input */}
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Từ Khóa Tìm Kiếm (Tags)
                </label>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {tags.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-lg bg-surface-container text-[11px] font-medium text-on-surface flex items-center gap-1">
                      {t}
                      <button type="button" onClick={() => handleRemoveTag(t)} className="text-on-surface-variant hover:text-red-500 cursor-pointer">×</button>
                    </span>
                  ))}
                  {isAddingTag ? (
                    <div className="flex items-center gap-1">
                      <input 
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                        placeholder="Thêm tag..."
                        className="px-2 py-0.5 text-xs rounded-lg border border-theme-border text-on-surface"
                      />
                      <button type="button" onClick={handleAddTag} className="px-2 py-0.5 rounded-lg bg-primary text-white text-xs">Lưu</button>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => setIsAddingTag(true)}
                      className="px-2.5 py-1 rounded-lg border border-dashed border-theme-border text-[11px] font-semibold text-primary hover:bg-primary/5 cursor-pointer"
                    >
                      + Thêm từ khóa
                    </button>
                  )}
                </div>
              </div>

              {/* SEO Checklist */}
              <div className="space-y-1.5 pt-2">
                {seoAudit.checks.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 text-xs">
                    <span className={`material-symbols-outlined text-sm ${c.status === 'pass' ? 'text-emerald-600' : c.status === 'warn' ? 'text-amber-500' : 'text-red-500'}`}>
                      {c.status === 'pass' ? 'check_circle' : c.status === 'warn' ? 'warning' : 'cancel'}
                    </span>
                    <div>
                      <p className="font-semibold text-on-surface">{c.label}</p>
                      <p className="text-[10px] text-on-surface-variant">{c.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Quick Navigation & Live Preview */}
          <aside className="lg:col-span-4 space-y-4">
            
            {/* Quick Navigation Menu */}
            <div className="bg-surface-container-lowest rounded-xl p-4 border border-theme-border/70 shadow-xs sticky top-20">
              <h4 className="font-title-md text-xs font-bold text-on-surface mb-2.5 uppercase tracking-wider">
                Mục Lục Thiết Lập
              </h4>
              <nav className="space-y-1">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                      activeSection === item.id ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.completed && (
                      <span className="material-symbols-outlined text-xs text-emerald-600">check</span>
                    )}
                  </button>
                ))}
              </nav>

              <hr className="my-3 border-theme-border/60" />

              {/* Summary card */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Gian hàng:</span>
                  <span className="font-semibold text-on-surface truncate max-w-[150px]">{currentBizName}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Danh mục:</span>
                  <span className="font-semibold text-on-surface truncate max-w-[150px]">{displayCategoryName}</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Tác giả:</span>
                  <span className="font-semibold text-on-surface truncate max-w-[150px]">{displayAuthorName}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Sticky Bottom Action Footer */}
      <footer className="sticky bottom-0 z-30 bg-surface-container-lowest/95 backdrop-blur-md border-t border-theme-border/70 px-6 sm:px-8 py-3.5 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
          <span className="material-symbols-outlined text-primary text-base">cloud_done</span>
          <span>Dữ liệu lưu trực tiếp vào CSDL Sàn HUKI</span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/seller/products" className="px-3.5 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">
            Hủy / Thoát
          </Link>
          <button 
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(true)}
            className="px-4 py-2 rounded-xl border border-theme-border bg-surface-container-lowest text-xs font-semibold text-on-surface hover:bg-surface-container transition-all shadow-xs cursor-pointer disabled:opacity-60"
          >
            Lưu Bản Nháp
          </button>

          <button 
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(false)}
            className="px-6 py-2.5 rounded-xl bg-primary hover:opacity-90 text-white font-title-md text-xs font-bold tracking-wide transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>{getSubmitButtonLabel()}</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}

export function SellerCreateProductView(props: SellerCreateProductProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-primary animate-pulse">add_circle</span>
          <p className="mt-4 text-on-surface-variant font-medium text-sm">Đang tải biểu mẫu tạo sản phẩm...</p>
        </div>
      </div>
    }>
      <SellerCreateProductContent {...props} />
    </Suspense>
  );
}

export default SellerCreateProductView;
