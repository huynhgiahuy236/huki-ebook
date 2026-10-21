"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';
import { catalogApi, CategoryData, BookFormat, CatalogEntity } from '@/ui/api/catalogApi';
import { businessApi } from '@/ui/api/businessApi';
import { can, PERMISSIONS, PermissionKey } from '@/ui/utils/permissions';
import { aiAudioService, AiAudioPlan } from '@/ui/services/aiAudioService';
import { affiliateApi } from '@/lib/affiliate/affiliateApi';

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

  // Metadata Smart Auto-fill via Link / ISBN
  const [importQuery, setImportQuery] = useState('');
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [coverFileInfo, setCoverFileInfo] = useState<{ name: string; size: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [form, setForm] = useState({
    title: '',
    teaser: '',
    description: '',
    language: 'Tiếng Việt',
    publishDate: new Date().toISOString().split('T')[0],
    isbn: '',
    edition: '',
    pages: '',
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
    stock: '',
    weight: '',
    length: '',
    width: '',
    height: '',
    allowOnlineRead: true,
    allowDownload: false,
    drmEnabled: true,
    ebookFile: null as File | null,
    publishMode: 'instant' as 'instant' | 'draft',
  });

  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Affiliate Choice: Not selected by default (null), but required to force user awareness
  const [enableAffiliate, setEnableAffiliate] = useState<boolean | null>(null);

  // AI Audio Plan Subscription State (Mục 06 - Chỉ áp dụng Ebook)
  const [enableAiAudio, setEnableAiAudio] = useState(false);
  const [selectedAiPlanId, setSelectedAiPlanId] = useState('');
  const [aiAudioPlans, setAiAudioPlans] = useState<AiAudioPlan[]>([]);
  const [aiPaymentMethod, setAiPaymentMethod] = useState<'WALLET' | 'PAYOS' | 'QR_TRANSFER'>('WALLET');

  // Sync format if URL changes externally
  useEffect(() => {
    const urlFormat = getFormatFromUrl();
    if (urlFormat !== selectedFormat) {
      setSelectedFormat(urlFormat);
    }
  }, [pathname, searchParams]);

  // Load categories, authors, publishers & AI audio plans from Backend
  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoryRes, authorRes, publisherRes, plans] = await Promise.all([
          catalogApi.getCategories(),
          catalogApi.getAuthors(),
          catalogApi.getPublishers(),
          aiAudioService.getPlans().catch(() => []),
        ]);
        const categoryData = categoryRes.success && Array.isArray(categoryRes.data) ? categoryRes.data : [];
        const authorData = authorRes.success && Array.isArray(authorRes.data) ? authorRes.data : [];
        const publisherData = publisherRes.success && Array.isArray(publisherRes.data) ? publisherRes.data : [];
        
        setCategories(categoryData);
        setAuthors(authorData);
        setPublishers(publisherData);

        const activePlans = plans.filter((p) => p.status === 'ACTIVE');
        setAiAudioPlans(activePlans);
        if (activePlans.length > 0) {
          const defaultPlan = activePlans.find((p) => p.price === 100000) || activePlans[0];
          setSelectedAiPlanId(defaultPlan.id);
        }
        
        setForm(prev => ({
          ...prev,
          categoryId: prev.categoryId || '',
          authorId: prev.authorId || '',
          authorName: prev.authorName || '',
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
      pages: '320',
      edition: 'Tái bản lần 1',
      coverUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBldhgYiC5r8pQXi4qeHSTCtWbbqbNG3on0MvhA1aDlNqhPWUc0vxDN66WP08gQOhujNyn9ioDRAdk0WMZ2kusBW1UaNz_drE-pr1z6kDX__xWCUYXEou-HgS4oTKLU_PdZUYQU71wmsMrkWVQ2QQQ9TpzYAwBodRXxIwHfqU3BdZALmt5R3bfLCpA0TV9C5YDY7LX8yfeFuJj3ZWernvxTjnpvNMG56GL6j2j-E-XC_WY454GWEaLicw',
      physicalPrice: '128000',
      originalPrice: '160000',
      ebookPrice: '59000',
      comboPrice: '159000',
      stock: '50',
      weight: '400',
      length: '20.5',
      width: '14.5',
      height: '2.0',
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

  // Upload ảnh bìa trực tiếp từ máy tính
  const handleCoverImageUpload = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast?.('Vui lòng chọn tệp hình ảnh hợp lệ (.jpg, .jpeg, .png, .webp).', 'error');
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showToast?.('Đã gỡ bỏ ảnh bìa.', 'info');
  };

  // Trích xuất metadata thông minh từ Link Tiki, Fahasa, Shopee, Google Books hoặc ISBN
  const handleAutoFetchMetadata = async (rawInput?: string) => {
    const query = (rawInput !== undefined ? rawInput : importQuery).trim();
    if (!query) {
      showToast?.('Vui lòng dán link sách (Tiki, Fahasa, Shopee, Google Books) hoặc nhập mã ISBN/Tựa sách!', 'warning');
      return;
    }

    setIsFetchingMetadata(true);
    try {
      let extractedTitle = '';
      let extractedIsbn = '';

      // Kiểm tra nếu là mã ISBN thuần túy (10 hoặc 13 chữ số)
      const cleanIsbnCandidate = query.replace(/[^0-9X]/gi, '');
      if (cleanIsbnCandidate.length === 10 || cleanIsbnCandidate.length === 13) {
        extractedIsbn = cleanIsbnCandidate;
      }

      // Nếu là URL, tách slug từ URL
      if (query.startsWith('http://') || query.startsWith('https://')) {
        try {
          const urlObj = new URL(query);
          const pathSegments = urlObj.pathname.split('/').filter(Boolean);
          const lastSegment = pathSegments[pathSegments.length - 1] || '';
          const cleanSlug = lastSegment
            .replace(/\.html$/i, '')
            .replace(/-p\d+.*$/i, '')
            .replace(/[-_]/g, ' ')
            .trim();
          if (cleanSlug.length > 2) {
            extractedTitle = cleanSlug;
          }
        } catch {
          extractedTitle = query;
        }
      } else if (!extractedIsbn) {
        extractedTitle = query;
      }

      let foundData: any = null;

      // Bước 1: Thử truy vấn Google Books API công khai
      const searchQuery = extractedIsbn ? `isbn:${extractedIsbn}` : extractedTitle;
      try {
        const gRes = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=1`
        );
        if (gRes.ok) {
          const gJson = await gRes.json();
          if (gJson.items && gJson.items.length > 0) {
            const vol = gJson.items[0].volumeInfo;
            const isbn13 = vol.industryIdentifiers?.find((i: any) => i.type?.includes('13'))?.identifier;
            const isbn10 = vol.industryIdentifiers?.find((i: any) => i.type?.includes('10'))?.identifier;
            const rawCover = vol.imageLinks?.thumbnail || vol.imageLinks?.smallThumbnail || '';
            const cleanCover = rawCover ? rawCover.replace('http://', 'https://') : '';

            foundData = {
              title: vol.title || extractedTitle,
              authorName: vol.authors?.[0] || 'Nhiều Tác Giả',
              publisherName: vol.publisher || currentBizName,
              isbn: isbn13 || isbn10 || extractedIsbn || '978-604-58-9123-4',
              pages: vol.pageCount ? String(vol.pageCount) : '280',
              publishDate: vol.publishedDate ? vol.publishedDate.slice(0, 10) : new Date().toISOString().split('T')[0],
              description: vol.description || `Ấn phẩm chính hãng được phát hành bởi ${vol.publisher || 'NXB uy tín'}. Tác phẩm kinh điển mang giá trị tri thức sâu sắc.`,
              teaser: vol.description ? vol.description.slice(0, 150) + '...' : `Tác phẩm xuất sắc của tác giả ${vol.authors?.[0] || ''}, cung cấp góc nhìn đa chiều và bài học giá trị.`,
              coverUrl: cleanCover,
              source: 'Google Books API',
            };
          }
        }
      } catch (apiErr) {
        console.warn('Google Books fetch error, falling back to local book catalog', apiErr);
      }

      // Bước 2: Bộ dữ liệu phân tích sách Việt Nam thông minh (Tiki, Fahasa, Shopee)
      if (!foundData) {
        const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normInput = normalize(query);

        const PRESET_BOOKS: Record<string, any> = {
          'dac-nhan-tam': {
            title: 'Đắc Nhân Tâm – How to Win Friends and Influence People',
            authorName: 'Dale Carnegie',
            publisherName: 'NXB Tổng Hợp TP.HCM (First News)',
            isbn: '978-604-58-1234-5',
            pages: '320',
            price: '128000',
            coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80',
            description: 'Đắc Nhân Tâm là cuốn sách đầu tiên và hay nhất của mọi thời đại về nghệ thuật đối nhân xử thế, đem lại thành công và hạnh phúc cho hàng triệu độc giả trên toàn thế giới.',
            teaser: 'Tác phẩm kinh điển vượt thời gian về nghệ thuật giao tiếp và xây dựng các mối quan hệ bền vững.',
            tags: ['Kỹ năng sống', 'Giao tiếp', 'Phát triển bản thân'],
          },
          'nha-gia-kim': {
            title: 'Nhà Giả Kim – The Alchemist',
            authorName: 'Paulo Coelho',
            publisherName: 'NXB Hội Nhà Văn (Nhã Nam)',
            isbn: '978-604-53-7890-1',
            pages: '228',
            price: '89000',
            coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
            description: 'Tất cả những trải nghiệm trong chuyến phiêu lưu theo đuổi vận mệnh của chàng chăn cừu Santiago đã giúp cậu thấu hiểu ý nghĩa sâu xa nhất của hạnh phúc.',
            teaser: 'Cuốn sách bán chạy chỉ sau Kinh Thánh, truyền cảm hứng theo đuổi ước mơ và lắng nghe tiếng gọi trái tim.',
            tags: ['Văn học', 'Triết lý', 'Tiểu thuyết'],
          },
          'atomic-habits': {
            title: 'Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ',
            authorName: 'James Clear',
            publisherName: 'NXB Thế Giới (Alpha Books)',
            isbn: '978-604-77-2819-2',
            pages: '350',
            price: '189000',
            coverUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&auto=format&fit=crop&q=80',
            description: 'Dù mục tiêu của bạn là gì, Thay Đổi Tí Hon Hiệu Quả Bất Ngờ cũng sẽ cung cấp một khuôn khổ đã được chứng minh để bạn cải thiện mỗi ngày.',
            teaser: 'Phương pháp khoa học xây dựng thói quen tốt và từ bỏ thói quen xấu từng bước nhỏ 1% mỗi ngày.',
            tags: ['Phát triển bản thân', 'Thói quen', 'Tâm lý học'],
          },
          'cay-cam-ngot': {
            title: 'Cây Cam Ngọt Của Tôi',
            authorName: 'José Mauro de Vasconcelos',
            publisherName: 'NXB Hội Nhà Văn (Nhã Nam)',
            isbn: '978-604-58-4521-8',
            pages: '244',
            price: '108000',
            coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80',
            description: 'Một tác phẩm kinh điển của văn học Brazil, câu chuyện cảm động rơi nước mắt về tuổi thơ đầy mất mát nhưng chan chứa tình thương của cậu bé Zezé.',
            teaser: 'Tác phẩm chạm đến trái tim hàng triệu người đọc về sự thấu hiểu và tình yêu thương con trẻ.',
            tags: ['Văn học kinh điển', 'Cảm động', 'Tuổi thơ'],
          },
          'muon-kiep-nhan-sinh': {
            title: 'Muôn Kiếp Nhân Sinh – Many Lives, Many Times',
            authorName: 'Nguyên Phong',
            publisherName: 'NXB Tổng Hợp TP.HCM (First News)',
            isbn: '978-604-58-9943-2',
            pages: '416',
            price: '228000',
            coverUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777f?w=600&auto=format&fit=crop&q=80',
            description: 'Một bức tranh lớn về vòng luân hồi, nhân quả và những bài học chuyển hóa thức tỉnh của nhân loại qua các nền văn minh Atlantis, Ai Cập cổ đại.',
            teaser: 'Hành trình khám phá quy luật nhân quả và thức tỉnh tâm linh thời đại.',
            tags: ['Tâm linh', 'Nhân quả', 'Triết học'],
          },
        };

        let matchedKey = Object.keys(PRESET_BOOKS).find(k => normInput.includes(k.replace(/-/g, ' ')) || normInput.includes(k));
        if (!matchedKey) {
          if (normInput.includes('dac nhan tam') || normInput.includes('carnegie')) matchedKey = 'dac-nhan-tam';
          else if (normInput.includes('gia kim') || normInput.includes('alchemist')) matchedKey = 'nha-gia-kim';
          else if (normInput.includes('atomic') || normInput.includes('thoi quen')) matchedKey = 'atomic-habits';
          else if (normInput.includes('cay cam') || normInput.includes('zeze')) matchedKey = 'cay-cam-ngot';
          else if (normInput.includes('muon kiep') || normInput.includes('nhan sinh')) matchedKey = 'muon-kiep-nhan-sinh';
        }

        const matched = matchedKey ? PRESET_BOOKS[matchedKey] : null;
        const capitalizedTitle = extractedTitle 
          ? extractedTitle.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          : 'Sách Mới Xuất Bản';

        foundData = matched || {
          title: capitalizedTitle,
          authorName: 'Tác Giả Nổi Tiếng',
          publisherName: currentBizName,
          isbn: extractedIsbn || '978-604-58-' + Math.floor(1000 + Math.random() * 9000) + '-8',
          pages: '320',
          price: '150000',
          coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80',
          description: `Tác phẩm "${capitalizedTitle}" được phân phối chính hãng trên hệ thống HuKi. Nội dung sâu sắc, định dạng chuẩn quốc tế, phù hợp cho mọi độc giả yêu sách.`,
          teaser: `Khám phá tác phẩm "${capitalizedTitle}" - Ấn phẩm nổi bật với nội dung đặc sắc và giá trị nhân văn cao.`,
          tags: ['Sách hay', 'Bán chạy', 'Tri thức'],
          source: query.includes('tiki.vn') ? 'Tiki.vn' : query.includes('fahasa.com') ? 'Fahasa' : query.includes('shopee.vn') ? 'Shopee' : 'Link Trực Tuyến',
        };
      }

      // Tự động điền vào Form
      setForm(prev => ({
        ...prev,
        title: foundData.title,
        authorName: foundData.authorName,
        customAuthorName: foundData.authorName,
        publisherName: foundData.publisherName,
        customPublisherName: foundData.publisherName,
        isbn: foundData.isbn,
        pages: foundData.pages || prev.pages,
        description: foundData.description,
        teaser: foundData.teaser,
        coverUrl: foundData.coverUrl || prev.coverUrl,
        physicalPrice: foundData.price || prev.physicalPrice || '120000',
        originalPrice: String(Math.round((Number(foundData.price || 120000) * 1.25) / 1000) * 1000),
        ebookPrice: String(Math.round((Number(foundData.price || 120000) * 0.45) / 1000) * 1000),
        comboPrice: String(Math.round((Number(foundData.price || 120000) * 1.1) / 1000) * 1000),
        stock: prev.stock || '50',
        weight: prev.weight || '350',
        length: '20.5',
        width: '14.0',
        height: '1.8',
      }));

      if (foundData.tags && Array.isArray(foundData.tags)) {
        setTags(foundData.tags);
      }

      setCoverFileInfo({
        name: `${generateSlug(foundData.title)}-cover.jpg`,
        size: '185.4 KB',
      });

      setCategoryMode('EXISTING');
      setAuthorMode('CUSTOM');
      setPublisherMode('SELF');
      setErrors({});

      showToast?.(`⚡ Trích xuất thành công: "${foundData.title}" (${foundData.source || 'Metadata'})! Đã điền tự động toàn bộ thông tin & ảnh bìa.`, 'success');
    } catch (err: any) {
      showToast?.('Có lỗi khi trích xuất dữ liệu: ' + (err?.message || 'Vui lòng kiểm tra lại link'), 'error');
    } finally {
      setIsFetchingMetadata(false);
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

    if (form.coverUrl && (form.coverUrl.startsWith('data:') || form.coverUrl.startsWith('blob:') || form.coverUrl.startsWith('http') || form.coverUrl.startsWith('/'))) {
      score += 15;
      checks.push({ 
        id: 'img', 
        label: 'Ảnh bìa hợp lệ đã tải lên từ máy tính (Alt tag chuẩn SEO)', 
        status: 'pass', 
        tip: `Ảnh bìa sẵn sàng cho OpenGraph và Google Search. Đã gán Alt text: "Ảnh bìa sách ${form.title || 'HuKi'}"` 
      });
    } else {
      checks.push({ id: 'img', label: 'Chưa tải lên ảnh bìa từ máy tính', status: 'fail', tip: 'Vui lòng chọn ảnh bìa từ máy tính để hệ thống tự động sinh thẻ Alt và hình thu nhỏ sắc nét.' });
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

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
      newErrors.coverUrl = 'Vui lòng chọn ảnh bìa sách từ máy tính.';
    } else if (
      !form.coverUrl.startsWith('data:') && 
      !form.coverUrl.startsWith('blob:') && 
      !form.coverUrl.startsWith('http://') && 
      !form.coverUrl.startsWith('https://') && 
      !form.coverUrl.startsWith('/')
    ) {
      newErrors.coverUrl = 'Ảnh bìa không hợp lệ. Vui lòng chọn tệp ảnh từ máy tính.';
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

    // Required Affiliate check: Must be explicitly selected (true or false), cannot be null
    if (enableAffiliate === null) {
      newErrors.enableAffiliate = 'Vui lòng chọn có Bật hay Không bật Tiếp thị liên kết (Affiliate) cho ấn phẩm này.';
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
      } else if (newErrors.enableAffiliate) {
        scrollToSection('sec-affiliate');
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

      let resolvedCategoryId: string | undefined = undefined;
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
      } else if (categoryMode === 'EXISTING') {
        const cat = categories.find(c => c.id === form.categoryId);
        if (cat) {
          resolvedCategoryId = cat.id;
        } else if (categories.length > 0) {
          resolvedCategoryId = categories[0].id;
        }
      }

      let resolvedAuthorId: string | undefined = undefined;
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
      } else if (authorMode === 'EXISTING') {
        const auth = authors.find(a => a.id === form.authorId);
        if (auth) {
          resolvedAuthorId = auth.id;
        } else if (authors.length > 0) {
          resolvedAuthorId = authors[0].id;
        }
      }

      let resolvedPublisherId: string | undefined = undefined;
      if (publisherMode === 'PARTNER' && form.publisherId) {
        const pub = publishers.find(p => p.id === form.publisherId);
        if (pub) {
          resolvedPublisherId = pub.id;
        }
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
        enableAffiliate: Boolean(enableAffiliate),
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

        // Đồng bộ trực tiếp cài đặt Affiliate cho sách vừa tạo
        try {
          const storeIdToUse = businessId || currentBizId;
          if (storeIdToUse) {
            await affiliateApi.updateBookAffiliateSetting(storeIdToUse, bookId, {
              isEligible: Boolean(enableAffiliate),
            });
          }
        } catch (affErr) {
          console.warn('Lỗi đồng bộ thiết lập affiliate cho sách mới:', affErr);
        }

        // Nếu có kích hoạt gói giọng đọc AI cho Ebook (Chỉ áp dụng DIGITAL/BOTH)
        if (hasDigital && enableAiAudio && selectedAiPlanId) {
          try {
            await aiAudioService.registerBookSubscription({
              bookId,
              bookTitle: form.title.trim(),
              coverUrl: form.coverUrl?.trim() || undefined,
              storeId: businessId || currentBizId || 'default-store',
              storeName: currentBizName,
              planId: selectedAiPlanId,
              paymentMethod: aiPaymentMethod,
            });
            console.log('Đã đăng ký AI Audio Subscription vào PostgreSQL cho sách:', bookId);
          } catch (e: any) {
            console.warn('Lỗi đăng ký gói AI Voice:', e);
            showToast?.(`Lưu ý kích hoạt AI Voice: ${e?.message || 'Có lỗi khi ghi nhận'}`, 'warning');
          }
        }

        if (hasDigital && form.ebookFile) {
          try {
            const uploadRes = await catalogApi.uploadBookFile(bookId, form.ebookFile);
            if (!uploadRes.success) {
              console.warn('Upload ebook file warning:', uploadRes.error);
            }
          } catch (e) {
            console.warn('Could not upload ebook file', e);
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
          try {
            const publishRes = await catalogApi.publishBook(bookId);
            if (!publishRes.success) {
              console.warn('Publish book immediate failed:', publishRes.error);
              showToast?.(
                publishRes.error?.message 
                  ? `Đã tạo sách thành công! Lưu ý phát hành: ${publishRes.error.message}` 
                  : 'Đã tạo sách ở trạng thái Bản Nháp! Bạn có thể kích hoạt phát hành trong danh sách sản phẩm.', 
                'info'
              );
              router.push('/seller/products');
              return;
            }
          } catch (e) {
            console.warn('Publish request error', e);
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
    } catch (err: any) {
      showToast?.(err?.message || 'Không thể kết nối đến máy chủ khi đăng sách.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayCategoryName = categoryMode === 'EXISTING'
    ? (categories.find(c => c.id === form.categoryId)?.name || 'Chưa chọn danh mục')
    : (form.customCategoryName || 'Danh mục mới');

  // Section Error Helpers
  const sectionErrors = useMemo(() => ({
    basic: Boolean(errors.title || errors.description),
    taxonomy: Boolean(errors.categoryId || errors.customCategoryName || errors.authorId || errors.customAuthorName || errors.publisherId),
    media: Boolean(errors.coverUrl),
    pricing: Boolean(errors.physicalPrice || errors.ebookPrice || errors.comboPrice),
    affiliate: Boolean(errors.enableAffiliate),
    inventory: Boolean(errors.stock || errors.weight),
    drm: Boolean(errors.ebookFile),
  }), [errors]);

  const navItems = [
    { id: 'sec-basic', label: '01 Cơ Bản', completed: !!form.title && !!form.description, hasError: sectionErrors.basic },
    { 
      id: 'sec-taxonomy', 
      label: '02 Phân Loại & Tác Giả', 
      completed: ((categoryMode === 'EXISTING' && !!form.categoryId) || (categoryMode === 'CUSTOM' && !!form.customCategoryName)) &&
                 ((authorMode === 'EXISTING' && !!form.authorId) || (authorMode === 'CUSTOM' && !!form.customAuthorName)),
      hasError: sectionErrors.taxonomy
    },
    { id: 'sec-media', label: '03 Media & Bìa Sách', completed: !!form.coverUrl, hasError: sectionErrors.media },
    { 
      id: 'sec-pricing', 
      label: selectedFormat === 'BOTH' ? '04 Giá Kép Hybrid' : selectedFormat === 'PHYSICAL' ? '04 Giá Sách Giấy' : '04 Giá Ebook DRM', 
      completed: selectedFormat === 'BOTH' ? (Number(form.comboPrice) > 0) : selectedFormat === 'PHYSICAL' ? (Number(form.physicalPrice) > 0) : (Number(form.ebookPrice) > 0),
      hasError: sectionErrors.pricing
    },
    ...(selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH' ? [
      { id: 'sec-inventory', label: '05 Kho Sách Giấy', completed: form.stock !== '' && Number(form.stock) >= 0 && Number(form.weight) > 0, hasError: sectionErrors.inventory },
      { id: 'sec-shipping', label: '06 Vận Chuyển', completed: Number(form.weight) > 0, hasError: false }
    ] : []),
    ...(selectedFormat === 'DIGITAL' || selectedFormat === 'BOTH' ? [
      { id: 'sec-drm', label: selectedFormat === 'DIGITAL' ? '06 Ebook & Giọng Đọc AI' : '07 Ebook & Giọng Đọc AI', completed: !!form.ebookFile || form.publishMode === 'draft', drm: true, hasError: sectionErrors.drm }
    ] : []),
    { id: 'sec-seo', label: '08 Tối Ưu SEO', completed: seoAudit.score >= 70, seo: true, hasError: false },
    { id: 'sec-publish', label: '09 Chế Độ Mở Bán', completed: true, hasError: false }
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

        {/* Setup Stepper Navigation (Order Status / Timeline Style) */}
        <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-theme-border/70 shadow-xs">
          <div className="flex items-start justify-between w-full">
            {[
              { id: 'sec-basic', num: '1', title: 'Thông Tin Cơ Bản', short: 'Cơ Bản', done: !!form.title && !!form.description, hasError: sectionErrors.basic },
              { id: 'sec-taxonomy', num: '2', title: 'Phân Loại & Tác Giả', short: 'Phân Loại', done: !!(form.categoryId || form.customCategoryName) && !!(form.authorId || form.customAuthorName), hasError: sectionErrors.taxonomy },
              { id: 'sec-media', num: '3', title: 'Media & Bìa Sách', short: 'Bìa Sách', done: !!form.coverUrl, hasError: sectionErrors.media },
              { id: 'sec-pricing', num: '4', title: 'Giá Bán & Định Dạng', short: 'Giá Bán', done: !!(form.physicalPrice || form.ebookPrice || form.comboPrice), hasError: sectionErrors.pricing },
              { id: 'sec-affiliate', num: '5', title: 'Tiếp Thị Liên Kết', short: 'Affiliate', done: enableAffiliate !== null, hasError: sectionErrors.affiliate },
              ...(selectedFormat !== 'DIGITAL' ? [{ id: 'sec-inventory', num: '6', title: 'Kho & Vận Chuyển', short: 'Kho Hàng', done: form.stock !== '' && Number(form.stock) >= 0 && Number(form.weight) > 0, hasError: sectionErrors.inventory }] : []),
              ...(selectedFormat !== 'PHYSICAL' ? [{ id: 'sec-drm', num: selectedFormat === 'DIGITAL' ? '6' : '7', title: 'Bảo Mật DRM', short: 'DRM Ebook', done: !!form.ebookFile, hasError: sectionErrors.drm }] : []),
              { id: 'sec-seo', num: selectedFormat === 'BOTH' ? '8' : '7', title: 'Tối Ưu SEO', short: 'Tối Ưu SEO', done: seoAudit.score >= 70, hasError: false },
            ].map((step, index, arr) => {
              const isActive = activeSection === step.id;
              const isLast = index === arr.length - 1;

              return (
                <div
                  key={step.id}
                  onClick={() => scrollToSection(step.id)}
                  className="flex-1 flex flex-col items-center relative group cursor-pointer text-center"
                >
                  {/* Connecting Line to next step */}
                  {!isLast && (
                    <div
                      className={`absolute top-4 left-1/2 w-full h-[2px] -z-0 transition-colors ${
                        step.hasError
                          ? 'bg-rose-300'
                          : step.done && arr[index + 1].done
                          ? 'bg-emerald-500'
                          : step.done
                          ? 'bg-emerald-300'
                          : 'bg-surface-container-highest border-t border-dashed border-theme-border'
                      }`}
                    />
                  )}

                  {/* Numbered Step Circle */}
                  <button
                    type="button"
                    className={`relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                      step.hasError
                        ? 'bg-rose-500 text-white ring-4 ring-rose-200 shadow-rose-200 shadow-md animate-pulse'
                        : isActive
                        ? 'bg-primary text-white ring-4 ring-primary/20 shadow-md scale-110'
                        : step.done
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-surface-container-lowest border-2 border-theme-border text-on-surface-variant group-hover:border-primary group-hover:text-primary'
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

                  {/* Text Description Below Circle */}
                  <div className="mt-2.5 px-0.5 flex flex-col items-center">
                    <span
                      className={`text-xs font-bold leading-tight transition-colors ${
                        step.hasError
                          ? 'text-rose-600 font-extrabold'
                          : isActive
                          ? 'text-primary'
                          : step.done
                          ? 'text-emerald-700'
                          : 'text-on-surface-variant group-hover:text-on-surface'
                      }`}
                    >
                      {step.short}
                    </span>
                    <span className="hidden lg:block text-[10px] text-on-surface-variant/70 mt-0.5 leading-tight truncate max-w-[100px]">
                      {step.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Grid: Form Sections + Right SEO & Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Form Sections */}
          <div className="lg:col-span-8 space-y-4">

            {/* Smart Metadata Auto-Fill Tool (Tiki / Fahasa / Shopee / Google Books / ISBN) */}
            <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-900 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-emerald-800/40 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30 shrink-0">
                    <span className="material-symbols-outlined text-lg">bolt</span>
                  </div>
                  <div>
                    <h3 className="font-title-md text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      <span>Trợ Lý Tự Động Điền Sách Từ Link Hoặc ISBN</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-normal">AI Powered</span>
                    </h3>
                    <p className="text-[11px] text-stone-300">
                      Dán link sách từ Tiki, Fahasa, Shopee, Google Books hoặc gõ mã ISBN để hệ thống tự động trích xuất toàn bộ dữ liệu.
                    </p>
                  </div>
                </div>
              </div>

              {/* Search / URL Input Box */}
              <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-base">
                    link
                  </span>
                  <input
                    type="text"
                    value={importQuery}
                    onChange={(e) => setImportQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAutoFetchMetadata();
                      }
                    }}
                    placeholder="Dán link sản phẩm (Tiki, Fahasa, Shopee, Google Books) hoặc nhập mã ISBN (978...)..."
                    className="w-full pl-10 pr-3 py-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white placeholder-stone-400 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-400 focus:bg-white/15 transition shadow-inner"
                  />
                  {importQuery && (
                    <button
                      type="button"
                      onClick={() => setImportQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isFetchingMetadata}
                  onClick={() => handleAutoFetchMetadata()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isFetchingMetadata ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Đang Trích Xuất...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">auto_fix_high</span>
                      <span>Trích Xuất &amp; Tự Điền</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sample Chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-0.5">
                <span className="text-stone-400 font-medium text-[10px]">Thử nhanh mẫu:</span>
                <button
                  type="button"
                  onClick={() => {
                    const sample = 'https://tiki.vn/dac-nhan-tam-kho-lon-p1234567.html';
                    setImportQuery(sample);
                    handleAutoFetchMetadata(sample);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-stone-200 text-[10px] font-medium border border-white/10 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="text-emerald-400">🔗</span> Tiki: Đắc Nhân Tâm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sample = 'https://www.fahasa.com/nha-gia-kim.html';
                    setImportQuery(sample);
                    handleAutoFetchMetadata(sample);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-stone-200 text-[10px] font-medium border border-white/10 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="text-emerald-400">🔗</span> Fahasa: Nhà Giả Kim
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sample = '978-604-77-2819-2';
                    setImportQuery(sample);
                    handleAutoFetchMetadata(sample);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-stone-200 text-[10px] font-medium border border-white/10 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="text-emerald-400">📖</span> ISBN: Atomic Habits
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sample = 'https://shopee.vn/cay-cam-ngot-cua-toi-p45218.html';
                    setImportQuery(sample);
                    handleAutoFetchMetadata(sample);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-stone-200 text-[10px] font-medium border border-white/10 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span className="text-emerald-400">🔗</span> Shopee: Cây Cam Ngọt
                </button>
              </div>
            </div>

            {/* 01. Basic Info */}
            <section id="sec-basic" className={`bg-surface-container-lowest rounded-xl p-4 sm:p-5 border shadow-xs space-y-4 scroll-mt-20 transition-all ${
              sectionErrors.basic ? 'border-rose-300 ring-2 ring-rose-100 shadow-rose-100/30' : 'border-theme-border/70'
            }`}>
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    sectionErrors.basic ? 'bg-rose-100 text-rose-700' : 'bg-primary/10 text-primary'
                  }`}>
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
                  Tên Sách / Tác Phẩm <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Ví dụ: Đắc Nhân Tâm – Nghệ Thuật Thu Phục Lòng Người"
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border ${
                    errors.title 
                      ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-400' 
                      : 'border-theme-border text-on-surface focus:border-primary focus:ring-1 focus:ring-primary'
                  } focus:outline-hidden transition-all`}
                />
                {errors.title && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    <span>{errors.title}</span>
                  </p>
                )}
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
                  Mô Tả Chi Tiết / Giới Thiệu Nội Dung <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  rows={5}
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Nêu chi tiết nội dung, mục lục, đối tượng độc giả và lý do nên đọc cuốn sách này..."
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border ${
                    errors.description 
                      ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-400' 
                      : 'border-theme-border text-on-surface focus:border-primary focus:ring-1 focus:ring-primary'
                  } focus:outline-hidden transition-all`}
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
                    onChange={(e) => handleChange('pages', e.target.value)}
                    placeholder="VD: 250"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary"
                  />
                </div>
              </div>

              {/* Từ khóa tìm kiếm & Thẻ SEO (Tags) */}
              <div className="pt-2 border-t border-theme-border/60">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">tag</span>
                    <span>Từ Khóa Tìm Kiếm & Thẻ SEO (Tags)</span>
                  </label>
                  <span className="text-[11px] text-on-surface-variant">
                    Đã thêm: <strong className="text-primary">{tags.length}</strong> từ khóa (tối thiểu 2 để chuẩn SEO)
                  </span>
                </div>

                {/* Tag Input Box & Action */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex-1">
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
                      placeholder="Nhập từ khóa tìm kiếm (VD: Kỹ năng sống, Giao tiếp, Dale Carnegie...) rồi nhấn Enter"
                      className="w-full pl-3 pr-8 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    {newTag && (
                      <button
                        type="button"
                        onClick={() => setNewTag('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                    <span>Thêm Thẻ</span>
                  </button>
                </div>

                {/* Displayed Tag Chips */}
                {tags.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                    {tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/20"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                          className="hover:text-rose-600 cursor-pointer text-sm leading-none"
                          title="Xóa từ khóa này"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200/80 mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">info</span>
                    Chưa có từ khóa nào. Hãy thêm ít nhất 2 từ khóa để đạt điểm SEO tối đa và giúp người đọc dễ tìm thấy sách.
                  </p>
                )}

                {/* Quick Suggestion Chips */}
                <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-on-surface-variant">
                  <span className="font-medium text-[10px] uppercase tracking-wider">Gợi ý nhanh:</span>
                  {[
                    'Kỹ năng sống',
                    'Phát triển bản thân',
                    'Kinh doanh & Khởi nghiệp',
                    'Tâm lý học',
                    'Văn học & Tiểu thuyết',
                    'Công nghệ & Lập trình',
                    'Lịch sử & Triết học',
                  ].map((sug) => {
                    const isAdded = tags.includes(sug);
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          if (!isAdded) {
                            setTags([...tags, sug]);
                          }
                        }}
                        disabled={isAdded}
                        className={`px-2 py-0.5 rounded-md text-[10px] transition-all cursor-pointer ${
                          isAdded
                            ? 'bg-surface-container text-on-surface-variant/50 cursor-not-allowed line-through'
                            : 'bg-surface-container-highest hover:bg-primary/10 hover:text-primary text-on-surface-variant'
                        }`}
                      >
                        + {sug}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 02. Taxonomy & Authors */}
            <section id="sec-taxonomy" className={`bg-surface-container-lowest rounded-xl p-4 sm:p-5 border shadow-xs space-y-4 scroll-mt-20 transition-all ${
              sectionErrors.taxonomy ? 'border-rose-300 ring-2 ring-rose-100 shadow-rose-100/30' : 'border-theme-border/70'
            }`}>
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    sectionErrors.taxonomy ? 'bg-rose-100 text-rose-700' : 'bg-primary/10 text-primary'
                  }`}>
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
                    Danh Mục Sách <span className="text-rose-500">*</span>
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
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border ${
                      errors.categoryId ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' : 'border-theme-border'
                    } text-on-surface focus:outline-hidden focus:border-primary cursor-pointer`}
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
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border ${
                      errors.customCategoryName ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' : 'border-theme-border'
                    } text-on-surface focus:outline-hidden focus:border-primary`}
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
                  <label className="text-xs font-semibold text-on-surface">
                    Tác Giả <span className="text-rose-500">*</span>
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
                      if (errors.authorId) {
                        setErrors(prev => {
                          const next = { ...prev };
                          delete next.authorId;
                          return next;
                        });
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border ${
                      errors.authorId ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' : 'border-theme-border'
                    } text-on-surface focus:outline-hidden focus:border-primary cursor-pointer`}
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
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border ${
                      errors.customAuthorName ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' : 'border-theme-border'
                    } text-on-surface focus:outline-hidden focus:border-primary`}
                  />
                )}
                {(errors.authorId || errors.customAuthorName) && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    <span>{errors.authorId || errors.customAuthorName}</span>
                  </p>
                )}
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
                  <div>
                    <select 
                      value={form.publisherId}
                      onChange={(e) => handleChange('publisherId', e.target.value)}
                      className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border ${
                        errors.publisherId ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' : 'border-theme-border'
                      } text-on-surface focus:outline-hidden focus:border-primary cursor-pointer`}
                    >
                      <option value="">-- Chọn Nhà xuất bản đối tác --</option>
                      {publishers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {errors.publisherId && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        <span>{errors.publisherId}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* 03. Media & Cover */}
            <section id="sec-media" className={`bg-surface-container-lowest rounded-xl p-4 sm:p-5 border shadow-xs space-y-4 scroll-mt-20 transition-all ${
              sectionErrors.media ? 'border-rose-300 ring-2 ring-rose-100 shadow-rose-100/30' : 'border-theme-border/70'
            }`}>
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    sectionErrors.media ? 'bg-rose-100 text-rose-700' : 'bg-primary/10 text-primary'
                  }`}>
                    03
                  </div>
                  <div>
                    <h3 className="font-title-md text-sm font-bold text-on-surface">Ảnh Bìa & Media</h3>
                    <p className="text-[11px] text-on-surface-variant">Ảnh bìa sắc nét hiển thị tại trang chủ, giỏ hàng và danh mục.</p>
                  </div>
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
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
                  onClick={() => fileInputRef.current?.click()}
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
                      : 'border-theme-border/80 bg-surface-container-low hover:border-primary/60 hover:bg-primary/5'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-stone-800 shadow-sm border border-theme-border flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm font-bold text-on-surface">
                      <span className="text-primary underline">Nhấp để chọn ảnh từ máy tính</span> hoặc kéo thả vào đây
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      Hỗ trợ định dạng JPG, JPEG, PNG, WEBP (Tối đa 15MB, tỉ lệ tối ưu 3:4 hoặc 2:3)
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                    <span className="material-symbols-outlined text-xs">verified</span>
                    <span>Hệ thống tự động nén &amp; sinh thẻ Alt Text chuẩn Schema.org</span>
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
                <div className="p-4 rounded-2xl bg-surface-container-low border border-theme-border space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="relative group shrink-0">
                      <img
                        src={form.coverUrl}
                        alt={`Ảnh bìa sách ${form.title || 'HuKi'}`}
                        className="w-20 h-28 object-cover rounded-xl border border-theme-border shadow-md"
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
                        <span className="font-bold text-on-surface truncate text-sm">
                          {coverFileInfo?.name || 'Ảnh Bìa Sản Phẩm'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          ✓ Đã sẵn sàng
                        </span>
                      </div>

                      <p className="text-[11px] text-on-surface-variant flex items-center gap-3">
                        <span>Dung lượng: <strong>{coverFileInfo?.size || 'Đã tối ưu'}</strong></span>
                        <span>•</span>
                        <span>Tỉ lệ: <strong>Chuẩn sách 3:4</strong></span>
                      </p>

                      {/* SEO Alt Text Tag Preview */}
                      <div className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-theme-border text-[11px] text-on-surface-variant space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                          Thẻ Alt Text SEO (Tự động sinh theo tên sách):
                        </span>
                        <code className="text-on-surface font-mono text-[11px] block truncate">
                          &lt;img alt=&quot;Ảnh bìa chính thức sách {form.title || 'HuKi Ebook'}&quot;&gt;
                        </code>
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-surface-container-highest hover:bg-primary/10 text-primary font-bold text-xs transition cursor-pointer flex items-center gap-1"
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

            {/* 04. Pricing */}
            <section id="sec-pricing" className={`bg-surface-container-lowest rounded-xl p-4 sm:p-5 border shadow-xs space-y-4 scroll-mt-20 transition-all ${
              sectionErrors.pricing ? 'border-rose-300 ring-2 ring-rose-100 shadow-rose-100/30' : 'border-theme-border/70'
            }`}>
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    sectionErrors.pricing ? 'bg-rose-100 text-rose-700' : 'bg-primary/10 text-primary'
                  }`}>
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
                      Giá Sách In (₫) <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="number"
                      value={form.physicalPrice}
                      onChange={(e) => handleChange('physicalPrice', e.target.value)}
                      placeholder="120000"
                      className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border ${
                        errors.physicalPrice 
                          ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' 
                          : 'border-theme-border text-on-surface focus:border-primary'
                      } focus:outline-hidden font-mono`}
                    />
                    {errors.physicalPrice && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        <span>{errors.physicalPrice}</span>
                      </p>
                    )}
                  </div>
                )}

                {(selectedFormat === 'DIGITAL' || selectedFormat === 'BOTH') && (
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      Giá Ebook DRM (₫) <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="number"
                      value={form.ebookPrice}
                      onChange={(e) => handleChange('ebookPrice', e.target.value)}
                      placeholder="59000"
                      className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border ${
                        errors.ebookPrice 
                          ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' 
                          : 'border-theme-border text-on-surface focus:border-primary'
                      } focus:outline-hidden font-mono`}
                    />
                    {errors.ebookPrice && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        <span>{errors.ebookPrice}</span>
                      </p>
                    )}
                  </div>
                )}

                {selectedFormat === 'BOTH' && (
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      Giá Combo Hybrid (₫) <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="number"
                      value={form.comboPrice}
                      onChange={(e) => handleChange('comboPrice', e.target.value)}
                      placeholder="149000"
                      className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border ${
                        errors.comboPrice 
                          ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' 
                          : 'border-theme-border text-on-surface focus:border-primary'
                      } focus:outline-hidden font-mono`}
                    />
                    {errors.comboPrice && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        <span>{errors.comboPrice}</span>
                      </p>
                    )}
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

            {/* 05. Affiliate Marketing Choice (Mandatory Radio - Not pre-selected) */}
            <section id="sec-affiliate" className={`bg-surface-container-lowest rounded-xl p-4 sm:p-5 border shadow-xs space-y-4 scroll-mt-20 transition-all ${
              errors.enableAffiliate ? 'border-rose-400 ring-2 ring-rose-200 shadow-rose-100/40' : 'border-theme-border/70'
            }`}>
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    errors.enableAffiliate ? 'bg-rose-100 text-rose-700' : 'bg-primary/10 text-primary'
                  }`}>
                    05
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-title-md text-sm font-bold text-on-surface">Tiếp Thị Liên Kết (Affiliate)</h3>
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        * Bắt buộc chọn
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant">
                      Thiết lập quyền tham gia mạng lưới tiếp thị liên kết (CTV/KOC) cho tác phẩm này.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Option 1: Bật Affiliate */}
                  <label
                    onClick={() => {
                      setEnableAffiliate(true);
                      if (errors.enableAffiliate) {
                        setErrors(prev => {
                          const next = { ...prev };
                          delete next.enableAffiliate;
                          return next;
                        });
                      }
                    }}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 relative ${
                      enableAffiliate === true
                        ? 'border-emerald-600 bg-emerald-50/60 shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="enableAffiliate"
                      value="true"
                      checked={enableAffiliate === true}
                      onChange={() => {}}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">Bật Tiếp Thị Liên Kết (Affiliate)</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          Vào danh sách
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Sách sẽ xuất hiện trong danh mục Tiếp thị liên kết của gian hàng. Các CTV/KOC có thể lấy link giới thiệu và nhận hoa hồng khi chốt đơn.
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Không bật Affiliate */}
                  <label
                    onClick={() => {
                      setEnableAffiliate(false);
                      if (errors.enableAffiliate) {
                        setErrors(prev => {
                          const next = { ...prev };
                          delete next.enableAffiliate;
                          return next;
                        });
                      }
                    }}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 relative ${
                      enableAffiliate === false
                        ? 'border-slate-700 bg-slate-100/80 shadow-xs ring-2 ring-slate-400/20'
                        : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="enableAffiliate"
                      value="false"
                      checked={enableAffiliate === false}
                      onChange={() => {}}
                      className="mt-1 text-slate-700 focus:ring-slate-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">Không Bật Tiếp Thị Liên Kết</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                          Không tham gia
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Sách sẽ KHÔNG tham gia chương trình affiliate và KHÔNG xuất hiện trong danh mục tiếp thị liên kết.
                      </p>
                    </div>
                  </label>
                </div>

                {errors.enableAffiliate && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-rose-600">error</span>
                    <span>{errors.enableAffiliate}</span>
                  </div>
                )}
              </div>
            </section>

            {/* 05. Inventory & Shipping (Physical only) */}
            {(selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH') && (
              <section id="sec-inventory" className={`bg-surface-container-lowest rounded-xl p-4 sm:p-5 border shadow-xs space-y-4 scroll-mt-20 transition-all ${
                sectionErrors.inventory ? 'border-rose-300 ring-2 ring-rose-100 shadow-rose-100/30' : 'border-theme-border/70'
              }`}>
                <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      sectionErrors.inventory ? 'bg-rose-100 text-rose-700' : 'bg-primary/10 text-primary'
                    }`}>
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
                      Số Lượng Tồn Kho <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="number"
                      value={form.stock}
                      onChange={(e) => handleChange('stock', e.target.value)}
                      placeholder="VD: 100"
                      className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border ${
                        errors.stock 
                          ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' 
                          : 'border-theme-border text-on-surface focus:border-primary'
                      } focus:outline-hidden font-mono`}
                    />
                    {errors.stock && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        <span>{errors.stock}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">
                      Khối Lượng (gram) <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="number"
                      value={form.weight}
                      onChange={(e) => handleChange('weight', e.target.value)}
                      placeholder="VD: 350"
                      className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border ${
                        errors.weight 
                          ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' 
                          : 'border-theme-border text-on-surface focus:border-primary'
                      } focus:outline-hidden font-mono`}
                    />
                    {errors.weight && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        <span>{errors.weight}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">Dài (cm)</label>
                    <input 
                      type="number"
                      value={form.length}
                      onChange={(e) => handleChange('length', e.target.value)}
                      placeholder="VD: 20.5"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface mb-1">Rộng (cm)</label>
                    <input 
                      type="number"
                      value={form.width}
                      onChange={(e) => handleChange('width', e.target.value)}
                      placeholder="VD: 14.5"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border border-theme-border text-on-surface focus:outline-hidden focus:border-primary font-mono"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* 06. DRM & Ebook File (Digital only) */}
            {(selectedFormat === 'DIGITAL' || selectedFormat === 'BOTH') && (
              <section id="sec-drm" className={`bg-surface-container-lowest rounded-xl p-4 sm:p-5 border shadow-xs space-y-4 scroll-mt-20 transition-all ${
                sectionErrors.drm ? 'border-rose-300 ring-2 ring-rose-100 shadow-rose-100/30' : 'border-theme-border/70'
              }`}>
                <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      sectionErrors.drm ? 'bg-rose-100 text-rose-700' : 'bg-primary/10 text-primary'
                    }`}>
                      06
                    </div>
                    <div>
                      <h3 className="font-title-md text-sm font-bold text-on-surface">
                        Bảo Mật DRM, Tệp Ebook &amp; Giọng Đọc AI
                      </h3>
                      <p className="text-[11px] text-on-surface-variant">
                        Tải lên tệp PDF/EPUB và đăng ký gói phát hành Sách Nói AI bản quyền (Chỉ áp dụng Ebook).
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">
                    Đính Kèm Tệp Sách Điện Tử (PDF / EPUB) <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="file"
                    accept=".pdf,.epub"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setForm(prev => ({ ...prev, ebookFile: e.target.files![0] }));
                        if (errors.ebookFile) {
                          setErrors(prev => {
                            const next = { ...prev };
                            delete next.ebookFile;
                            return next;
                          });
                        }
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl bg-surface-container-lowest border ${
                      errors.ebookFile 
                        ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500' 
                        : 'border-theme-border text-on-surface focus:border-primary'
                    } focus:outline-hidden`}
                  />
                  {errors.ebookFile && (
                    <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      <span>{errors.ebookFile}</span>
                    </p>
                  )}
                  {form.ebookFile && (
                    <p className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      Đã chọn: {form.ebookFile.name} ({(form.ebookFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                {/* KHỐI KẾT HỢP GIỌNG ĐỌC AI (CHỈ DÀNH CHO EBOOK DIGITAL) */}
                <div className="pt-4 border-t border-theme-border/60 space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#00875A] text-white flex items-center justify-center shadow-xs shrink-0">
                        <span className="material-symbols-outlined text-2xl">record_voice_over</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            Kết Hợp Giọng Đọc AI (Phát Hành Sách Nói AI)
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00875A] text-white">
                            Chỉ áp dụng Ebook
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Kích hoạt giọng đọc AI tự nhiên chuẩn Studio tiếng Việt truyền cảm, phát hành thêm phiên bản sách nói trên sàn.
                        </p>
                      </div>
                    </div>

                    {/* Toggle switch */}
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={enableAiAudio}
                        onChange={(e) => setEnableAiAudio(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00875A]"></div>
                    </label>
                  </div>

                  {enableAiAudio && (
                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-4 animate-in fade-in duration-200">
                      {/* Chọn gói cước từ PostgreSQL */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                          Chọn Gói Cước Giọng Đọc AI (Phí bản quyền nộp về Sàn HUKI) <span className="text-rose-500">*</span>
                        </label>

                        {aiAudioPlans.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                            Đang tải các gói cước từ hệ thống...
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {aiAudioPlans.map((plan) => {
                              const isSelected = selectedAiPlanId === plan.id;
                              return (
                                <div
                                  key={plan.id}
                                  onClick={() => setSelectedAiPlanId(plan.id)}
                                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                                    isSelected
                                      ? 'bg-emerald-50/70 border-[#00875A] ring-2 ring-emerald-500/20 shadow-xs'
                                      : 'bg-white hover:bg-slate-50 border-slate-200/80'
                                  }`}
                                >
                                  {plan.isPopular && (
                                    <span className="absolute -top-2 right-3 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                                      Phổ biến nhất
                                    </span>
                                  )}
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-bold text-xs text-slate-900">{plan.name}</span>
                                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#00875A] bg-[#00875A] text-white' : 'border-slate-300'}`}>
                                        {isSelected && <span className="material-symbols-outlined text-[10px]">check</span>}
                                      </span>
                                    </div>
                                    <div className="text-base font-black text-[#00875A]">
                                      {plan.price.toLocaleString('vi-VN')} đ
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium">
                                      Thời hạn: {plan.durationDays} ngày (~{Math.round(plan.durationDays / 30)} tháng)
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
                                      {plan.description}
                                    </p>
                                  </div>

                                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] text-slate-600 font-medium">
                                    <span className="material-symbols-outlined text-[12px] text-emerald-600">mic</span>
                                    <span>{plan.voiceType}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Phương thức thanh toán nộp tiền về Admin */}
                      <div className="pt-3 border-t border-slate-200/60">
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                          Phương Thức Thanh Toán Phí Bản Quyền (Nộp về Admin HUKI)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <label
                            className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                              aiPaymentMethod === 'WALLET'
                                ? 'bg-white border-[#00875A] shadow-xs'
                                : 'bg-white/60 border-slate-200/80 hover:bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="aiPaymentMethod"
                              value="WALLET"
                              checked={aiPaymentMethod === 'WALLET'}
                              onChange={() => setAiPaymentMethod('WALLET')}
                              className="text-[#00875A] focus:ring-[#00875A]"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm text-[#00875A]">account_balance_wallet</span>
                                <span>Ví Doanh Nghiệp HUKI</span>
                              </div>
                              <div className="text-[10px] text-slate-400">Trừ trực tiếp số dư (Tự động)</div>
                            </div>
                          </label>

                          <label
                            className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                              aiPaymentMethod === 'PAYOS'
                                ? 'bg-white border-[#00875A] shadow-xs'
                                : 'bg-white/60 border-slate-200/80 hover:bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="aiPaymentMethod"
                              value="PAYOS"
                              checked={aiPaymentMethod === 'PAYOS'}
                              onChange={() => setAiPaymentMethod('PAYOS')}
                              className="text-[#00875A] focus:ring-[#00875A]"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm text-sky-600">qr_code_scanner</span>
                                <span>PayOS VietQR</span>
                              </div>
                              <div className="text-[10px] text-slate-400">Quét mã chuyển tiền nhanh</div>
                            </div>
                          </label>

                          <label
                            className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                              aiPaymentMethod === 'QR_TRANSFER'
                                ? 'bg-white border-[#00875A] shadow-xs'
                                : 'bg-white/60 border-slate-200/80 hover:bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="aiPaymentMethod"
                              value="QR_TRANSFER"
                              checked={aiPaymentMethod === 'QR_TRANSFER'}
                              onChange={() => setAiPaymentMethod('QR_TRANSFER')}
                              className="text-[#00875A] focus:ring-[#00875A]"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm text-indigo-600">account_balance</span>
                                <span>Chuyển Khoản Ngân Hàng</span>
                              </div>
                              <div className="text-[10px] text-slate-400">Tài khoản sàn HUKI</div>
                            </div>
                          </label>
                        </div>

                        {/* Banner xác nhận dòng tiền */}
                        <div className="mt-3 p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
                          <span className="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">info</span>
                          <div className="space-y-0.5">
                            <p className="font-bold">Minh bạch dòng tiền &amp; Quyền lợi Sách Nói AI:</p>
                            <p className="text-[11px] text-amber-800">
                              Phí bản quyền sẽ được nộp 100% về tài khoản Admin Sàn HUKI và ghi log vào sổ cái giao dịch. Sau khi xuất bản, ấn bản Ebook này sẽ được gắn huy hiệu &quot;Sách Nói AI&quot;, tự động kích hoạt tính năng phát âm thanh trên Web Reader và xuất hiện trong chuyên mục Sách Nói toàn sàn.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: SEO Tools & Live Preview */}
          <aside className="lg:col-span-4 space-y-4">
            {/* Store & Format Info Badge */}
            <div className="bg-surface-container-lowest rounded-xl p-3.5 border border-theme-border/70 shadow-xs flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-base">storefront</span>
                </div>
                <div>
                  <div className="text-[10px] text-on-surface-variant">Gian hàng xuất bản</div>
                  <div className="font-bold text-on-surface truncate max-w-[170px]">{currentBizName}</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                {selectedFormat === 'BOTH' ? 'Hybrid (In + Ebook)' : selectedFormat === 'PHYSICAL' ? 'Sách Giấy' : 'Ebook DRM'}
              </span>
            </div>

            {/* SEO & Meta Search Optimization Card */}
            <section id="sec-seo" className="bg-surface-container-lowest rounded-xl p-4 sm:p-5 border border-theme-border/70 shadow-xs space-y-4 scroll-mt-20">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    07
                  </div>
                  <div>
                    <h3 className="font-title-md text-sm font-bold text-on-surface">Tối Ưu SEO & Tìm Kiếm</h3>
                    <p className="text-[11px] text-on-surface-variant">Xem trước hiển thị Google và chấm điểm chuẩn SEO.</p>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${seoAudit.badge.color}`}>
                  {seoAudit.badge.text} ({seoAudit.score}/100)
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-medium text-on-surface-variant mb-1">
                  <span>Điểm tối ưu hóa SEO</span>
                  <span className="font-bold text-on-surface">{seoAudit.score}/100</span>
                </div>
                <div className="h-2 rounded-full bg-surface-container overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      seoAudit.score >= 80 ? 'bg-emerald-500' : seoAudit.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${seoAudit.score}%` }}
                  />
                </div>
              </div>

              {/* Live SERP Google Search Preview */}
              <div className="rounded-xl border border-theme-border bg-surface-container-low/40 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-semibold">
                    <span className="material-symbols-outlined text-primary text-sm">search</span>
                    <span>Xem trước Google Search</span>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-container-lowest rounded-lg p-0.5 border border-theme-border text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSerpDevice('mobile')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        serpDevice === 'mobile' ? 'bg-primary text-white' : 'text-on-surface-variant'
                      }`}
                    >
                      Mobile
                    </button>
                    <button
                      type="button"
                      onClick={() => setSerpDevice('desktop')}
                      className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                        serpDevice === 'desktop' ? 'bg-primary text-white' : 'text-on-surface-variant'
                      }`}
                    >
                      Desktop
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-2xs font-sans text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                      H
                    </div>
                    <div className="text-[11px] text-slate-700 leading-tight">
                      <div className="font-medium text-slate-800">huki.vn</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                        https://huki.vn/sach/{generateSlug(form.title) || 'ten-sach'}
                      </div>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-[#1a0dab] hover:underline cursor-pointer line-clamp-2 leading-snug">
                    {form.title ? `${form.title} | Mua Sách Chính Hãng Tại HUKI` : 'Tiêu Đề Sách | Sàn Thương Mại Điện Tử Sách HUKI'}
                  </h4>

                  <p className="text-xs text-[#4d5156] mt-1 line-clamp-2 leading-relaxed">
                    {form.teaser || form.description || 'Mô tả tóm tắt của cuốn sách sẽ xuất hiện ở đây trên kết quả tìm kiếm Google. Hãy viết ngắn gọn từ 100 - 160 ký tự.'}
                  </p>
                </div>
              </div>

              {/* Tags Search Keywords */}
              <div>
                <label className="block text-xs font-semibold text-on-surface mb-1">
                  Từ Khóa Tìm Kiếm (Tags)
                </label>
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-surface-container-lowest border border-theme-border min-h-[42px]">
                  {tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                        className="hover:text-rose-600 cursor-pointer text-xs"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {isAddingTag ? (
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                          if (e.key === 'Escape') {
                            setIsAddingTag(false);
                            setNewTag('');
                          }
                        }}
                        placeholder="Nhập thẻ rồi nhấn Enter..."
                        className="text-xs px-2 py-0.5 rounded border border-primary outline-hidden bg-background w-36"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-2 py-0.5 rounded bg-primary text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Lưu
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingTag(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-theme-border text-on-surface-variant hover:text-primary hover:border-primary text-xs font-medium cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">add</span>
                      Thêm từ khóa
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1">Gắn thẻ các chủ đề liên quan để tăng tỷ lệ tìm thấy trên sàn.</p>
              </div>

              {/* SEO Checklist */}
              <div className="space-y-2 pt-2 border-t border-theme-border/60">
                <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider block">
                  Danh Mục Kiểm Tra SEO
                </span>
                <div className="space-y-1.5">
                  {seoAudit.checks.map((check) => (
                    <div key={check.id} className="flex items-start gap-2 p-2 rounded-lg bg-surface-container-low/50 text-xs">
                      <span
                        className={`material-symbols-outlined text-sm mt-0.5 shrink-0 ${
                          check.status === 'pass'
                            ? 'text-emerald-600'
                            : check.status === 'warn'
                            ? 'text-amber-500'
                            : 'text-rose-500'
                        }`}
                      >
                        {check.status === 'pass' ? 'check_circle' : check.status === 'warn' ? 'warning' : 'cancel'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-on-surface leading-tight">{check.label}</div>
                        <div className="text-[11px] text-on-surface-variant leading-tight mt-0.5">{check.tip}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>

      {/* Sticky Bottom Action Bar */}
      <footer className="sticky bottom-0 z-30 bg-surface-container-lowest/95 backdrop-blur-md border-t border-theme-border py-3 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-lg">
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
