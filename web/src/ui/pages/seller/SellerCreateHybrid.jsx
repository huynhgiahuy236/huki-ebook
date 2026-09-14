import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { catalogApi, CategoryData } from '../../api/catalogApi';
import { businessApi } from '../../api/businessApi';
import { can, PERMISSIONS } from '../../utils/permissions';

// Slug Generator Utility
function generateSlug(text) {
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

export default function SellerCreateHybrid({ initialFormat = 'BOTH' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { user, activeBusinessId } = useAuth();

  const currentBizId = user?.business?.id || activeBusinessId;
  const currentBizName = user?.business?.name || 'Doanh nghiệp của bạn';
  const canCreateProduct = can(PERMISSIONS.PRODUCT_CREATE, currentBizId, user);

  // Determine current format from URL pathname or initialFormat prop
  const getFormatFromUrl = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('physical')) return 'PHYSICAL';
    if (path.includes('ebook')) return 'DIGITAL';
    if (path.includes('hybrid')) return 'BOTH';
    return initialFormat;
  };

  const [selectedFormat, setSelectedFormat] = useState(getFormatFromUrl());
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('sec-basic');
  const [errors, setErrors] = useState({});

  // Category Logic: 'EXISTING' (Chọn danh mục có sẵn) | 'CUSTOM' (Nhập danh mục mới)
  const [categoryMode, setCategoryMode] = useState('EXISTING');
  // Publisher Logic: 'SELF' (Gian hàng chính là NXB) | 'PARTNER' (Liên kết NXB cấp phép)
  const [publisherMode, setPublisherMode] = useState('SELF');
  // Author Logic: 'EXISTING' (Chọn tác giả có sẵn) | 'CUSTOM' (Nhập tác giả mới)
  const [authorMode, setAuthorMode] = useState('EXISTING');
  // SERP Preview Device: 'mobile' | 'desktop'
  const [serpDevice, setSerpDevice] = useState('mobile');

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
    ebookFile: null,
    publishMode: 'instant', // 'instant' | 'draft'
  });

  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Sync format if URL changes externally
  useEffect(() => {
    const urlFormat = getFormatFromUrl();
    if (urlFormat !== selectedFormat) {
      setSelectedFormat(urlFormat);
    }
  }, [location.pathname]);

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

  // Nạp dữ liệu mẫu thuận tiện cho người bán thử nghiệm nhanh
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
      physicalPrice: 128000,
      originalPrice: 160000,
      ebookPrice: 59000,
      comboPrice: 159000,
      stock: 50,
      weight: 400,
    }));
    setTags(['Kỹ năng sống', 'Giao tiếp', 'Phát triển bản thân']);
    setErrors({});
    showToast('Đã nạp dữ liệu mẫu chuẩn SEO thành công!', 'info');
  };

  // Format switch handler (syncs format state + URL cleanly)
  const handleFormatChange = (format) => {
    setSelectedFormat(format);
    setErrors({});
    let targetUrl = '/seller/product/create-hybrid';
    if (format === 'PHYSICAL') targetUrl = '/seller/product/create-physical';
    if (format === 'DIGITAL') targetUrl = '/seller/product/create-ebook';
    navigate(targetUrl, { replace: true });
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Realtime error clearing
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

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Real-time SEO Health & Score Analyzer
  const seoAudit = useMemo(() => {
    let score = 0;
    const checks = [];

    // 1. Tiêu đề SEO (Title Length)
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

    // 2. Thẻ Meta Description / Teaser
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

    // 3. Mã ISBN quốc tế & Schema.org
    if (form.isbn && form.isbn.trim().length >= 10) {
      score += 15;
      checks.push({ id: 'isbn', label: `Mã ISBN hợp lệ (${form.isbn})`, status: 'pass', tip: 'Tự động kích hoạt dữ liệu cấu trúc Schema.org/Book cho Google Books.' });
    } else {
      checks.push({ id: 'isbn', label: 'Chưa có mã ISBN chuẩn quốc tế', status: 'warn', tip: 'Bổ sung ISBN giúp sách hiển thị nổi bật trong mục Google Knowledge Panel.' });
    }

    // 4. Ảnh bìa OpenGraph / Social Share
    if (form.coverUrl && form.coverUrl.startsWith('http')) {
      score += 15;
      checks.push({ id: 'img', label: 'Ảnh bìa hợp lệ sẵn sàng cho Social OpenGraph', status: 'pass', tip: 'Hình ảnh sắc nét sẽ hiển thị thumbnail đẹp trên Facebook, Zalo và Google.' });
    } else {
      checks.push({ id: 'img', label: 'Chưa có ảnh bìa URL', status: 'fail', tip: 'Cần URL ảnh bìa để tạo thẻ og:image và thumbnail.' });
    }

    // 5. Đường dẫn tĩnh thân thiện (URL Slug)
    const slug = generateSlug(form.title) || 'ten-sach';
    if (slug && slug.length >= 5) {
      score += 10;
      checks.push({ id: 'slug', label: `URL Slug chuẩn SEO: /sach/${slug}`, status: 'pass', tip: 'Đường dẫn ngắn gọn, không dấu, tối ưu lập chỉ mục.' });
    } else {
      checks.push({ id: 'slug', label: 'URL Slug chưa hoàn thiện', status: 'fail', tip: 'Cần tiêu đề sách để tự động sinh URL thân thiện.' });
    }

    // 6. Từ khóa tìm kiếm (Focus Keywords / Tags)
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

  // Calculate Combo Savings Helper
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

  // Comprehensive Form Validation
  const validateForm = (isDraft = false) => {
    const newErrors = {};
    const hasPhysical = selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH';
    const hasDigital = selectedFormat === 'DIGITAL' || selectedFormat === 'BOTH';

    // 1. Basic info
    if (!form.title || !form.title.trim()) {
      newErrors.title = 'Vui lòng nhập tên sản phẩm sách.';
    } else if (form.title.trim().length < 3) {
      newErrors.title = 'Tên sản phẩm phải có ít nhất 3 ký tự.';
    }

    if (!form.description || !form.description.trim()) {
      newErrors.description = 'Vui lòng nhập mô tả chi tiết cho tác phẩm.';
    }

    // Category validation
    if (categoryMode === 'EXISTING' && !form.categoryId) {
      newErrors.categoryId = 'Vui lòng chọn danh mục chính cho sách.';
    } else if (categoryMode === 'CUSTOM' && !form.customCategoryName?.trim()) {
      newErrors.customCategoryName = 'Vui lòng nhập tên danh mục mới.';
    }

    // Author validation
    if (authorMode === 'EXISTING' && !form.authorId && !form.authorName?.trim()) {
      newErrors.authorId = 'Vui lòng chọn tác giả từ danh sách hệ thống.';
    } else if (authorMode === 'CUSTOM' && !form.customAuthorName?.trim()) {
      newErrors.customAuthorName = 'Vui lòng nhập tên tác giả.';
    }

    // Publisher partner validation if in partner mode
    if (publisherMode === 'PARTNER' && !form.publisherId && !form.customPublisherName?.trim()) {
      newErrors.publisherId = 'Vui lòng chọn hoặc nhập tên Nhà xuất bản cấp phép liên kết.';
    }

    // Cover image validation
    if (!form.coverUrl || !form.coverUrl.trim()) {
      newErrors.coverUrl = 'Vui lòng cung cấp URL ảnh bìa sách.';
    } else if (!form.coverUrl.startsWith('http://') && !form.coverUrl.startsWith('https://') && !form.coverUrl.startsWith('/')) {
      newErrors.coverUrl = 'Đường dẫn ảnh bìa không hợp lệ (cần bắt đầu bằng http:// hoặc https://).';
    }

    // 2. Pricing validation
    if (selectedFormat === 'PHYSICAL') {
      if (!form.physicalPrice || Number(form.physicalPrice) <= 0) {
        newErrors.physicalPrice = 'Vui lòng nhập giá sách in lớn hơn 0 ₫.';
      }
    } else if (selectedFormat === 'DIGITAL') {
      if (!form.ebookPrice || Number(form.ebookPrice) <= 0) {
        newErrors.ebookPrice = 'Vui lòng nhập giá Ebook DRM lớn hơn 0 ₫.';
      }
    } else if (selectedFormat === 'BOTH') {
      if (!form.comboPrice || Number(form.comboPrice) <= 0) {
        newErrors.comboPrice = 'Vui lòng nhập giá bán Combo Hybrid lớn hơn 0 ₫.';
      }
      if (!form.physicalPrice || Number(form.physicalPrice) <= 0) {
        newErrors.physicalPrice = 'Vui lòng nhập giá sách in riêng lẻ.';
      }
      if (!form.ebookPrice || Number(form.ebookPrice) <= 0) {
        newErrors.ebookPrice = 'Vui lòng nhập giá Ebook DRM riêng lẻ.';
      }
    }

    // 3. Physical inventory validation
    if (hasPhysical) {
      if (form.stock === undefined || form.stock === null || form.stock === '' || Number(form.stock) < 0) {
        newErrors.stock = 'Số lượng tồn kho phải là số nguyên không âm (≥ 0).';
      }
      if (!form.weight || Number(form.weight) <= 0) {
        newErrors.weight = 'Khối lượng đóng gói phải lớn hơn 0 gram.';
      }
    }

    // 4. Digital Ebook validation
    if (hasDigital && !isDraft && form.publishMode === 'instant') {
      if (form.drmEnabled && !form.ebookFile) {
        newErrors.ebookFile = 'Vui lòng đính kèm tệp PDF Ebook để kích hoạt kho DRM trước khi phát hành.';
      }
    }

    setErrors(newErrors);

    // Scroll to the first error section if validation fails
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
      showToast('Vui lòng kiểm tra lại các thông tin bắt buộc còn thiếu hoặc chưa hợp lệ.', 'error');
      return;
    }

    const hasPhysical = selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH';
    const hasDigital = selectedFormat === 'DIGITAL' || selectedFormat === 'BOTH';
    const sellingPrice = selectedFormat === 'BOTH' ? form.comboPrice : hasPhysical ? form.physicalPrice : form.ebookPrice;

    setIsSubmitting(true);
    try {
      // 1. Resolve owning business (Business is ALWAYS the seller's storefront).
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
        showToast('Bạn cần có gian hàng doanh nghiệp đã được phê duyệt trước khi đăng sách.', 'error');
        return;
      }

      // 2. Resolve Category ID (tạo mới nếu nhập danh mục mới)
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
              setCategories(prev => [...prev, catRes.data]);
            }
          } catch (e) {
            console.warn('Could not create category on the fly', e);
          }
        }
      }

      // 3. Resolve Author ID (tạo mới nếu nhập tác giả mới)
      let resolvedAuthorId = form.authorId;
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
              setAuthors(prev => [...prev, authRes.data]);
            }
          } catch (e) {
            console.warn('Could not create author on the fly', e);
          }
        }
      } else if (authorMode === 'EXISTING' && form.authorId) {
        resolvedAuthorId = form.authorId;
      }

      // 4. Resolve publisher ID
      let resolvedPublisherId = undefined;
      if (publisherMode === 'PARTNER' && form.publisherId) {
        resolvedPublisherId = form.publisherId;
      }

      // 5. Build CreateBook payload
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
        ...(hasPhysical && { physicalDetails: {
          stock: Number(form.stock || 0),
          weight: Number(form.weight || 400),
          length: Number(form.length || 20.5),
          width: Number(form.width || 14.5),
          height: Number(form.height || 2.0),
          physicalEnabled: true,
        } }),
        ...(hasDigital && { digitalDetails: {
          digitalEnabled: true,
          allowOnlineRead: form.allowOnlineRead,
          allowDownload: form.allowDownload,
          drmEnabled: form.drmEnabled,
        } }),
      };

      const res = await catalogApi.createBook(payload);

      if (res.success && res.data?.id) {
        const bookId = res.data.id;

        // Upload PDF if present
        if (hasDigital && form.ebookFile) {
          const uploadRes = await catalogApi.uploadBookFile(bookId, form.ebookFile);
          if (!uploadRes.success) {
            showToast(uploadRes.error?.message || 'Đã tạo sách nhưng không thể tải tệp Ebook lên kho DRM.', 'error');
            return;
          }
        }

        // Update inventory if physical
        if (hasPhysical && Number(form.stock) > 0) {
          try {
            await catalogApi.updateInventory(bookId, Number(form.stock));
          } catch (e) {
            console.warn('Inventory update failed', e);
          }
        }

        // Publish if instant mode and not draft
        if (!isDraft && form.publishMode === 'instant') {
          const publishRes = await catalogApi.publishBook(bookId);
          if (!publishRes.success) {
            showToast(publishRes.error?.message || 'Đã lưu sản phẩm nhưng chưa thể kích hoạt phát hành ngay.', 'error');
            return;
          }
        }

        const formatLabel = selectedFormat === 'BOTH' ? 'Hybrid Combo' : selectedFormat === 'PHYSICAL' ? 'Sách Giấy' : 'Ebook DRM';
        showToast(
          isDraft 
            ? `Đã lưu bản nháp "${form.title}" thành công!` 
            : `Đã xuất bản thành công ${formatLabel}: "${form.title}"!`, 
          'success'
        );

        navigate('/seller/products');
      } else {
        showToast(res.error?.message || 'Có lỗi khi tạo sản phẩm sách.', 'error');
      }
    } catch (err) {
      showToast('Không thể kết nối đến máy chủ khi đăng sách.', 'error');
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
          to="/seller/products"
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
              to="/seller/products"
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
            <button 
              type="button"
              onClick={() => scrollToSection('sec-basic')}
              className="px-2.5 py-1.5 rounded-xl border border-theme-border bg-surface-container-lowest text-xs font-semibold text-on-surface hover:bg-surface-container hover:border-theme-primary/30 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">visibility</span>
              <span>Xem Trước</span>
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
                    <span className="material-symbols-outlined text-lg">tablet_mac</span>
                  </div>
                  <div>
                    <h4 className={`font-title-md text-xs font-semibold transition-colors ${selectedFormat === 'DIGITAL' ? 'text-primary font-bold' : 'text-on-surface group-hover:text-primary'}`}>
                      EBOOK DRM
                    </h4>
                    <span className="text-[9px] text-on-surface-variant font-medium tracking-wide uppercase">Kỹ thuật số</span>
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
                Đọc trực tuyến trên HUKI Reader có bản quyền DRM. Không tốn phí kho bãi.
              </p>
            </button>

            {/* 3. Hybrid */}
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
                    <span className="material-symbols-outlined text-lg">library_books</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <h4 className={`font-title-md text-xs transition-colors ${selectedFormat === 'BOTH' ? 'text-primary font-bold' : 'text-on-surface group-hover:text-primary'}`}>
                        SÁCH GIẤY + EBOOK
                      </h4>
                      <span className="px-1 py-0.2 bg-primary/15 text-primary rounded text-[8.5px] font-bold">HYBRID</span>
                    </div>
                    <span className="text-[9px] text-on-surface-variant font-medium tracking-wide uppercase">Combo Kép Đồng Bộ</span>
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
                Cung cấp đồng thời cả hai định dạng trên cùng trang sản phẩm với mức giá combo.
              </p>
            </button>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-12 gap-4 items-start">

          {/* Left Sticky Sub-Navigation */}
          <nav className="col-span-12 lg:col-span-2 sticky top-24 bg-surface-container-lowest rounded-2xl p-3.5 border border-theme-border/70 shadow-xs space-y-1.5">
            <p className="px-2.5 py-1 font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              MỤC NỘI DUNG
            </p>
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-primary/10 text-primary border-l-4 border-primary font-bold shadow-2xs'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  {item.seo ? (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      seoAudit.score >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {seoAudit.score}%
                    </span>
                  ) : item.drm ? (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-primary text-white font-bold">DRM</span>
                  ) : item.completed ? (
                    <span className="material-symbols-outlined text-primary text-xs">check_circle</span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-outline/40"></span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Middle Form Sections */}
          <div className="col-span-12 lg:col-span-7 space-y-6">

            {/* Section 1: Thông Tin Cơ Bản */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-basic">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">1</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Thông Tin Cơ Bản Chung</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Dùng chung cho cả bản in vật lý và bản đọc số DRM.</p>
                  </div>
                </div>
                <span className="text-[11px] text-on-surface-variant">Bắt buộc (*)</span>
              </div>

              <div>
                <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                  Tên sản phẩm <span className="text-primary">*</span>
                </label>
                <input 
                  className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-2.5 text-sm font-medium text-on-surface focus:outline-none transition-all ${
                    errors.title 
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10' 
                      : 'border-theme-border focus:border-primary focus:ring-4 focus:ring-primary/10'
                  }`}
                  type="text" 
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Ví dụ: Hoàng Tử Bé, Nhà Giả Kim, Đắc Nhân Tâm..."
                />
                {errors.title && (
                  <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.title}</p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="font-title-md text-xs font-bold text-on-surface">Giới thiệu ngắn (Teaser / Meta Snippet)</label>
                  <span className={`font-label-sm text-[11px] ${
                    form.teaser?.length >= 100 && form.teaser?.length <= 160 ? 'text-emerald-700 font-bold' : 'text-on-surface-variant'
                  }`}>
                    {form.teaser?.length || 0} / 160 ký tự (Chuẩn SEO Google)
                  </span>
                </div>
                <textarea 
                  className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none leading-relaxed transition-all resize-none" 
                  rows={2}
                  value={form.teaser}
                  onChange={(e) => handleChange('teaser', e.target.value)}
                  placeholder="Mô tả tóm tắt ngắn gọn thu hút người đọc và làm snippet tìm kiếm Google..."
                />
              </div>

              <div>
                <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                  Mô tả chi tiết tác phẩm <span className="text-primary">*</span>
                </label>
                <textarea 
                  className={`w-full rounded-xl border bg-surface-container-lowest p-4 text-sm text-on-surface focus:outline-none leading-relaxed transition-all min-h-[120px] ${
                    errors.description 
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10' 
                      : 'border-theme-border focus:border-primary focus:ring-4 focus:ring-primary/10'
                  }`}
                  rows={4}
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Nội dung giới thiệu chi tiết tác phẩm, lời tựa, mục lục tóm lược..."
                />
                {errors.description && (
                  <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Ngôn ngữ</label>
                  <select 
                    value={form.language}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all"
                  >
                    <option>Tiếng Việt</option>
                    <option>Tiếng Anh (English)</option>
                    <option>Song ngữ</option>
                  </select>
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Ngày xuất bản</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="date" 
                    value={form.publishDate}
                    onChange={(e) => handleChange('publishDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Mã ISBN</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm font-mono text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="text" 
                    value={form.isbn}
                    onChange={(e) => handleChange('isbn', e.target.value)}
                    placeholder="978-604-..."
                  />
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Số trang</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="number" 
                    value={form.pages}
                    onChange={(e) => handleChange('pages', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Phiên bản / Lần in</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="text" 
                    value={form.edition}
                    onChange={(e) => handleChange('edition', e.target.value)}
                    placeholder="Tái bản lần 1..."
                  />
                </div>
              </div>
            </section>

            {/* Section 2: Phân Loại Sách & Tác Giả (Hỗ trợ chọn hoặc nhập mới) */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-taxonomy">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">2</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Phân Loại Sách, Tác Giả &amp; Xuất Bản</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Xác thực gian hàng sở hữu, danh mục ngành hàng và thông tin xuất bản.</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
              </div>

              {/* 1. Gian hàng phát hành (Khóa cố định theo seller đang đăng nhập) */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    <span className="material-symbols-outlined text-xl">storefront</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-title-md text-xs font-bold text-on-surface">Gian Hàng Sở Hữu / Đơn Vị Phát Hành</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">ĐÃ XÁC THỰC</span>
                    </div>
                    <p className="text-xs font-bold text-primary mt-0.5">{currentBizName}</p>
                  </div>
                </div>
                <span className="text-[11px] text-on-surface-variant font-medium self-start sm:self-center">
                  (Cố định theo tài khoản của bạn)
                </span>
              </div>

              {/* 2. Danh mục chính của sách (Hỗ trợ chọn hoặc nhập mới) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-title-md text-xs font-bold text-on-surface">
                    Danh mục chính của sách <span className="text-primary">*</span>
                  </label>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setCategoryMode('EXISTING')}
                      className={`font-semibold cursor-pointer transition-colors ${categoryMode === 'EXISTING' ? 'text-primary border-b-2 border-primary pb-0.5' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      Chọn danh mục có sẵn
                    </button>
                    <span className="text-outline/40">|</span>
                    <button
                      type="button"
                      onClick={() => setCategoryMode('CUSTOM')}
                      className={`font-semibold cursor-pointer transition-colors ${categoryMode === 'CUSTOM' ? 'text-primary border-b-2 border-primary pb-0.5' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      + Nhập danh mục mới
                    </button>
                  </div>
                </div>

                {categoryMode === 'EXISTING' ? (
                  <div>
                    <select 
                      value={form.categoryId}
                      onChange={(e) => handleChange('categoryId', e.target.value)}
                      className={`w-full rounded-xl border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:outline-none transition-all ${
                        errors.categoryId 
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10' 
                          : 'border-theme-border focus:border-primary focus:ring-4 focus:ring-primary/10'
                      }`}
                    >
                      <option value="">-- Chọn danh mục sách phù hợp --</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    {errors.categoryId && (
                      <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.categoryId}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={form.customCategoryName}
                      onChange={(e) => handleChange('customCategoryName', e.target.value)}
                      placeholder="Nhập tên danh mục mới (ví dụ: Tài Chính Cá Nhân, Trí Tuệ Nhân Tạo, Tiểu Thuyết Lịch Sử...)"
                      className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface focus:outline-none transition-all ${
                        errors.customCategoryName 
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10' 
                          : 'border-theme-border focus:border-primary focus:ring-4 focus:ring-primary/10'
                      }`}
                    />
                    {errors.customCategoryName ? (
                      <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.customCategoryName}</p>
                    ) : (
                      <p className="text-[11px] text-on-surface-variant mt-1">Danh mục mới này sẽ được tạo tự động và gán trực tiếp cho sách khi xuất bản.</p>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Tác giả tác phẩm */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-title-md text-xs font-bold text-on-surface">
                    Tác giả tác phẩm <span className="text-primary">*</span>
                  </label>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setAuthorMode('EXISTING')}
                      className={`font-semibold cursor-pointer transition-colors ${authorMode === 'EXISTING' ? 'text-primary border-b-2 border-primary pb-0.5' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      Chọn tác giả có sẵn
                    </button>
                    <span className="text-outline/40">|</span>
                    <button
                      type="button"
                      onClick={() => setAuthorMode('CUSTOM')}
                      className={`font-semibold cursor-pointer transition-colors ${authorMode === 'CUSTOM' ? 'text-primary border-b-2 border-primary pb-0.5' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      + Nhập tác giả mới
                    </button>
                  </div>
                </div>

                {authorMode === 'EXISTING' ? (
                  <div>
                    <select
                      className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface focus:outline-none transition-all ${
                        errors.authorId 
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10' 
                          : 'border-theme-border focus:border-primary focus:ring-4 focus:ring-primary/10'
                      }`}
                      value={form.authorId}
                      onChange={(e) => {
                        handleChange('authorId', e.target.value);
                        handleChange('authorName', authors.find(item => item.id === e.target.value)?.name || '');
                      }}
                    >
                      <option value="">-- Chọn tác giả từ cơ sở dữ liệu --</option>
                      {authors.map(author => <option key={author.id} value={author.id}>{author.name}</option>)}
                    </select>
                    {errors.authorId && (
                      <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.authorId}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={form.customAuthorName}
                      onChange={(e) => {
                        handleChange('customAuthorName', e.target.value);
                        handleChange('authorName', e.target.value);
                      }}
                      placeholder="Nhập họ và tên tác giả..."
                      className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface focus:outline-none transition-all ${
                        errors.customAuthorName 
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10' 
                          : 'border-theme-border focus:border-primary focus:ring-4 focus:ring-primary/10'
                      }`}
                    />
                    {errors.customAuthorName ? (
                      <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.customAuthorName}</p>
                    ) : (
                      <p className="text-[11px] text-on-surface-variant mt-1">Tác giả mới sẽ được tự động lưu vào hệ thống khi xuất bản sách.</p>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Nhà Xuất Bản Cấp Phép */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-title-md text-xs font-bold text-on-surface">
                    Đơn Vị Cấp Phép Xuất Bản (NXB)
                  </label>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer text-on-surface font-medium">
                      <input 
                        type="radio" 
                        name="publisherMode" 
                        checked={publisherMode === 'SELF'} 
                        onChange={() => {
                          setPublisherMode('SELF');
                          handleChange('publisherId', '');
                          handleChange('publisherName', currentBizName);
                        }}
                        className="text-primary focus:ring-0"
                      />
                      <span>Chính doanh nghiệp ({currentBizName})</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-on-surface font-medium">
                      <input 
                        type="radio" 
                        name="publisherMode" 
                        checked={publisherMode === 'PARTNER'} 
                        onChange={() => setPublisherMode('PARTNER')}
                        className="text-primary focus:ring-0"
                      />
                      <span>NXB liên kết khác</span>
                    </label>
                  </div>
                </div>

                {publisherMode === 'PARTNER' && (
                  <div className="space-y-2">
                    <select
                      className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:outline-none transition-all ${
                        errors.publisherId 
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10' 
                          : 'border-theme-border focus:border-primary focus:ring-4 focus:ring-primary/10'
                      }`}
                      value={form.publisherId}
                      onChange={(e) => {
                        handleChange('publisherId', e.target.value);
                        handleChange('publisherName', publishers.find(item => item.id === e.target.value)?.name || '');
                      }}
                    >
                      <option value="">-- Chọn Nhà Xuất Bản liên kết (NXB Kim Đồng, Trẻ, Hội Nhà Văn...) --</option>
                      {publishers.map(publisher => <option key={publisher.id} value={publisher.id}>{publisher.name}</option>)}
                    </select>
                    {errors.publisherId && (
                      <p className="mt-1 text-xs text-rose-500 font-medium">{errors.publisherId}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block font-title-md text-xs font-bold text-on-surface mb-2">Từ khóa tìm kiếm (Tags)</label>
                <div className="flex flex-wrap items-center gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-xs font-medium text-on-surface border border-theme-border/50">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-primary cursor-pointer">
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    </span>
                  ))}
                  {isAddingTag ? (
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        placeholder="Nhập tag..."
                        className="h-7 px-2.5 rounded-full border border-primary text-xs bg-surface-container-lowest focus:outline-none"
                        autoFocus
                      />
                      <button type="button" onClick={handleAddTag} className="px-2 py-0.5 rounded-full bg-primary text-white text-xs font-bold cursor-pointer">Lưu</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsAddingTag(true)} 
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-theme-border text-xs text-on-surface-variant hover:border-primary hover:text-primary transition-all cursor-pointer" 
                      type="button"
                    >
                      <span className="material-symbols-outlined text-xs">add</span>
                      <span>Thêm tag</span>
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Section 3: Media */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-media">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">3</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Ảnh Bìa &amp; Thư Viện Media</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">URL ảnh bìa dùng chung cho bản in và thumbnail Ebook.</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
              </div>

              <div>
                <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                  URL Ảnh Bìa Sách <span className="text-primary">*</span>
                </label>
                <input 
                  type="text"
                  value={form.coverUrl}
                  onChange={(e) => handleChange('coverUrl', e.target.value)}
                  placeholder="https://..."
                  className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-2.5 text-xs font-mono text-on-surface focus:outline-none transition-all ${
                    errors.coverUrl 
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10' 
                      : 'border-theme-border focus:border-primary'
                  }`}
                />
                {errors.coverUrl && (
                  <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.coverUrl}</p>
                )}
              </div>

              <div className="flex items-start gap-4">
                <div className="w-28 aspect-[3/4] relative rounded-xl overflow-hidden border border-theme-border shadow-md bg-surface-container shrink-0 flex items-center justify-center">
                  {form.coverUrl ? (
                    <img 
                      className="w-full h-full object-cover" 
                      alt="Cover preview" 
                      src={form.coverUrl} 
                      onError={(e) => { e.currentTarget.src = '/banners/hero-library.jpg'; }}
                    />
                  ) : (
                    <div className="text-center p-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-2xl block mb-1">image</span>
                      <span className="text-[10px]">Chưa có ảnh</span>
                    </div>
                  )}
                </div>
                <div className="text-xs text-on-surface-variant space-y-1">
                  <p className="font-bold text-on-surface">Khuyến nghị ảnh bìa chuẩn sàn HUKI:</p>
                  <p>• Tỷ lệ kích thước chuẩn 3:4 hoặc 2:3</p>
                  <p>• Định dạng WebP, JPEG hoặc PNG sắc nét</p>
                  <p>• Hình ảnh rõ tên sách và tên tác giả, không mờ nhòe</p>
                </div>
              </div>
            </section>

            {/* Section 4: Cấu Hình Giá Bán */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-pricing">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">4</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">
                      {selectedFormat === 'BOTH' ? 'Cấu Hình Giá Kép Hybrid' : selectedFormat === 'PHYSICAL' ? 'Cấu Hình Giá Sách In' : 'Cấu Hình Giá Ebook DRM'}
                    </h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      {selectedFormat === 'BOTH' ? 'Thiết lập giá cho sách in, bản số Ebook DRM và giá Combo ưu đãi.' : 'Thiết lập mức giá niêm yết và giá bán trực tiếp trên sàn.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Smart Savings Notification for Hybrid */}
              {comboSavings && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                  comboSavings.isDiscounted 
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                    : comboSavings.isOverpriced 
                    ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                    : 'bg-primary/5 border-primary/20 text-on-surface'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">
                      {comboSavings.isDiscounted ? 'savings' : 'info'}
                    </span>
                    <span>
                      {comboSavings.isDiscounted 
                        ? `Ưu đãi Combo: Khách hàng tiết kiệm được ${comboSavings.saved.toLocaleString('vi-VN')} ₫ (${comboSavings.percent}%) so với mua lẻ từng bản.` 
                        : comboSavings.isOverpriced
                        ? `Lưu ý: Giá Combo (${Number(form.comboPrice).toLocaleString('vi-VN')} ₫) đang cao hơn tổng 2 bản lẻ (${comboSavings.sum.toLocaleString('vi-VN')} ₫).`
                        : 'Giá Combo bằng đúng tổng 2 định dạng lẻ.'}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH') && (
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                      Giá Sách Giấy (VNĐ) <span className="text-primary">*</span>
                    </label>
                    <input 
                      type="number"
                      placeholder="120000"
                      value={form.physicalPrice}
                      onChange={(e) => handleChange('physicalPrice', e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-primary focus:outline-none ${
                        errors.physicalPrice ? 'border-rose-400 focus:border-rose-500' : 'border-theme-border focus:border-primary'
                      }`}
                    />
                    {errors.physicalPrice && (
                      <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.physicalPrice}</p>
                    )}
                  </div>
                )}
                {(selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH') && (
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Giá Gốc Niêm Yết (VNĐ)</label>
                    <input 
                      type="number"
                      placeholder="150000"
                      value={form.originalPrice}
                      onChange={(e) => handleChange('originalPrice', e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm text-gray-500 focus:border-primary focus:outline-none"
                    />
                  </div>
                )}
                {(selectedFormat === 'DIGITAL' || selectedFormat === 'BOTH') && (
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                      Giá Ebook DRM (VNĐ) <span className="text-primary">*</span>
                    </label>
                    <input 
                      type="number"
                      placeholder="69000"
                      value={form.ebookPrice}
                      onChange={(e) => handleChange('ebookPrice', e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-emerald-800 focus:outline-none ${
                        errors.ebookPrice ? 'border-rose-400 focus:border-rose-500' : 'border-theme-border focus:border-primary'
                      }`}
                    />
                    {errors.ebookPrice && (
                      <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.ebookPrice}</p>
                    )}
                  </div>
                )}
                {selectedFormat === 'BOTH' && (
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                      Giá Combo ưu đãi (VNĐ) <span className="text-primary">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="169000"
                      value={form.comboPrice}
                      onChange={(e) => handleChange('comboPrice', e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-primary focus:outline-none ${
                        errors.comboPrice ? 'border-rose-400 focus:border-rose-500' : 'border-theme-border focus:border-primary'
                      }`}
                    />
                    {errors.comboPrice && (
                      <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.comboPrice}</p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Section 5: Kho Sách Giấy */}
            {(selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH') && (
              <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-inventory">
                <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">5</span>
                    <div>
                      <h2 className="font-headline-sm text-base font-bold text-on-surface">Tồn Kho Vật Lý &amp; Trọng Lượng Đóng Gói</h2>
                      <p className="font-body-sm text-xs text-on-surface-variant">Quản lý số lượng sách sẵn sàng giao và thông số vận chuyển.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                      Số lượng tồn kho (cuốn) <span className="text-primary">*</span>
                    </label>
                    <input 
                      type="number"
                      value={form.stock}
                      onChange={(e) => handleChange('stock', e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-on-surface focus:outline-none ${
                        errors.stock ? 'border-rose-400 focus:border-rose-500' : 'border-theme-border focus:border-primary'
                      }`}
                    />
                    {errors.stock && (
                      <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.stock}</p>
                    )}
                  </div>
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                      Khối lượng đóng gói (grams) <span className="text-primary">*</span>
                    </label>
                    <input 
                      type="number"
                      value={form.weight}
                      onChange={(e) => handleChange('weight', e.target.value === '' ? '' : Number(e.target.value))}
                      className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:outline-none ${
                        errors.weight ? 'border-rose-400 focus:border-rose-500' : 'border-theme-border focus:border-primary'
                      }`}
                    />
                    {errors.weight && (
                      <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.weight}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Dài (cm)</label>
                    <input 
                      type="number"
                      step="0.1"
                      value={form.length}
                      onChange={(e) => handleChange('length', Number(e.target.value))}
                      className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Rộng (cm)</label>
                    <input 
                      type="number"
                      step="0.1"
                      value={form.width}
                      onChange={(e) => handleChange('width', Number(e.target.value))}
                      className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Dày (cm)</label>
                    <input 
                      type="number"
                      step="0.1"
                      value={form.height}
                      onChange={(e) => handleChange('height', Number(e.target.value))}
                      className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2 text-sm text-on-surface focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Section 7: Tệp Ebook DRM */}
            {(selectedFormat === 'DIGITAL' || selectedFormat === 'BOTH') && (
              <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-drm">
                <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">7</span>
                    <div>
                      <h2 className="font-headline-sm text-base font-bold text-on-surface">Tệp Số Ebook &amp; Bảo Mật DRM</h2>
                      <p className="font-body-sm text-xs text-on-surface-variant">Mã hóa bản quyền số chống sao chép độc quyền cho gian hàng của bạn.</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-[11px] font-bold">
                    DRM READY
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl text-[#00875A]">verified_user</span>
                    <div>
                      <span className="font-bold text-xs text-emerald-900 block">Bảo hộ HUKI DRM V3.4 Kích hoạt</span>
                      <span className="text-[11px] text-emerald-700">Tự động gắn Watermark độc quyền độc giả khi mở khóa đọc.</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                    Đã Kích Hoạt
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                      Tệp Ebook (PDF/EPUB) {form.publishMode === 'instant' && <span className="text-primary">*</span>}
                    </label>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => handleChange('ebookFile', e.target.files?.[0] || null)}
                      className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-2 text-xs text-on-surface focus:outline-none ${
                        errors.ebookFile ? 'border-rose-400 focus:border-rose-500' : 'border-theme-border focus:border-primary'
                      }`}
                    />
                    {errors.ebookFile ? (
                      <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.ebookFile}</p>
                    ) : (
                      <p className="text-[10px] text-on-surface-variant mt-1">PDF riêng tư, tối đa 100 MB; được chuyển vào kho DRM sau khi tạo sách.</p>
                    )}
                  </div>
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Số trang Ebook</label>
                    <input
                      type="number"
                      min="1"
                      value={form.pages}
                      onChange={(e) => handleChange('pages', Number(e.target.value))}
                      className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Section 8: BỘ PHÂN TÍCH SEO & XEM TRƯỚC GOOGLE (Google SERP Snippet Preview & SEO Score) */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-6" id="sec-seo">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme-border/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">8</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface flex items-center gap-2">
                      <span>Tối Ưu SEO &amp; Hiển Thị Tìm Kiếm Google</span>
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase">Tự Động Check</span>
                    </h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Phân tích chuẩn SEO thời gian thực, đo lường điểm số và mô phỏng Google Snippet.</p>
                  </div>
                </div>

                {/* Score Badge */}
                <div className="flex items-center gap-2.5 self-start sm:self-center">
                  <div className="text-right">
                    <span className="text-[10px] text-on-surface-variant uppercase font-bold block">ĐIỂM CHẤT LƯỢNG SEO</span>
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border inline-block ${seoAudit.badge.color}`}>
                      {seoAudit.score}/100 · {seoAudit.badge.text}
                    </span>
                  </div>
                </div>
              </div>

              {/* Score Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-on-surface">
                  <span>Mức độ sẵn sàng lập chỉ mục Googlebot</span>
                  <span className={seoAudit.score >= 80 ? 'text-emerald-700' : seoAudit.score >= 55 ? 'text-amber-700' : 'text-rose-600'}>
                    {seoAudit.score}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 rounded-full ${
                      seoAudit.score >= 80 ? 'bg-emerald-500' : seoAudit.score >= 55 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${seoAudit.score}%` }}
                  ></div>
                </div>
              </div>

              {/* Google SERP Snippet Preview Box */}
              <div className="p-5 rounded-2xl bg-[#f8f9fa] dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#4285F4] text-lg">search</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Xem Trước Kết Quả Tìm Kiếm Google (SERP Preview)</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs">
                    <button 
                      type="button" 
                      onClick={() => setSerpDevice('mobile')}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${serpDevice === 'mobile' ? 'bg-primary text-white font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <span className="material-symbols-outlined text-xs">smartphone</span>
                      <span>Mobile</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setSerpDevice('desktop')}
                      className={`px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${serpDevice === 'desktop' ? 'bg-primary text-white font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <span className="material-symbols-outlined text-xs">desktop_windows</span>
                      <span>Desktop</span>
                    </button>
                  </div>
                </div>

                {/* Google Search Result Card Simulation */}
                <div className={`p-4 rounded-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-1.5 ${serpDevice === 'mobile' ? 'max-w-md' : 'w-full'}`}>
                  <div className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-zinc-400 truncate">
                    <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">H</span>
                    <span className="truncate">https://huki.vn › sach › {seoAudit.slug}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer leading-snug">
                    {form.title ? `${form.title} - ${displayAuthorName} | HUKI EBOOK` : 'Tiêu Đề Sách - Tác Giả | HUKI EBOOK'}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4d5156] dark:text-zinc-400 leading-relaxed line-clamp-2">
                    {form.teaser || form.description || 'Đọc online bản Ebook DRM bảo mật cao hoặc đặt mua sách giấy giao hàng tận nhà. Khám phá tác phẩm chọn lọc trên nền tảng HUKI Ebook.'}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 font-medium">
                    <span className="text-[#e37400]">★★★★★ 5.0</span>
                    <span>·</span>
                    <span>{form.physicalPrice ? `${Number(form.physicalPrice).toLocaleString('vi-VN')} ₫` : 'Giá ưu đãi'}</span>
                    <span>·</span>
                    <span className="text-emerald-700">Còn hàng</span>
                    <span>·</span>
                    <span>Bảo hộ bản quyền DRM</span>
                  </div>
                </div>
              </div>

              {/* SEO Checklist & Diagnostic Items */}
              <div className="space-y-2.5">
                <h4 className="font-title-md text-xs font-bold text-on-surface uppercase tracking-wider">
                  BẢNG KIỂM TRA TIÊU CHUẨN SEO
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {seoAudit.checks.map((item) => (
                    <div 
                      key={item.id}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs transition-colors ${
                        item.status === 'pass' 
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' 
                          : item.status === 'warn'
                          ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                          : 'bg-rose-50/60 border-rose-200 text-rose-900'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-base shrink-0 mt-0.5 ${
                        item.status === 'pass' ? 'text-emerald-600' : item.status === 'warn' ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {item.status === 'pass' ? 'check_circle' : item.status === 'warn' ? 'warning' : 'cancel'}
                      </span>
                      <div>
                        <span className="font-bold block">{item.label}</span>
                        <span className="text-[11px] opacity-85 mt-0.5 block">{item.tip}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Section 9: Chế Độ Mở Bán */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-4" id="sec-publish">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">9</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Chế Độ Mở Bán</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Lựa chọn phát hành ngay lên sàn hoặc lưu nháp.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label 
                  onClick={() => handleChange('publishMode', 'instant')}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    form.publishMode === 'instant' 
                      ? 'border-primary bg-primary/[0.03] ring-2 ring-primary/10' 
                      : 'border-theme-border hover:bg-surface-container-low'
                  }`}
                >
                  <input 
                    checked={form.publishMode === 'instant'} 
                    onChange={() => handleChange('publishMode', 'instant')}
                    className="mt-1 text-primary focus:ring-0 focus:outline-none cursor-pointer" 
                    name="publish_mode_hybrid" 
                    type="radio" 
                  />
                  <div>
                    <span className="block text-xs font-bold text-on-surface">
                      {selectedFormat === 'BOTH' ? 'Tự động phát hành cả 2 định dạng ngay khi gửi' : 'Tự động phát hành sản phẩm ngay khi gửi'}
                    </span>
                    <span className="block text-[11px] text-on-surface-variant mt-0.5">
                      {selectedFormat === 'BOTH' 
                        ? 'Sách in và Ebook DRM sẽ hiển thị đồng bộ trên cùng một trang chi tiết sản phẩm.' 
                        : 'Sản phẩm sẽ hiển thị công khai trên gian hàng và sẵn sàng nhận đơn đặt hàng.'}
                    </span>
                  </div>
                </label>

                <label 
                  onClick={() => handleChange('publishMode', 'draft')}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                    form.publishMode === 'draft' 
                      ? 'border-primary bg-primary/[0.03] ring-2 ring-primary/10' 
                      : 'border-theme-border hover:bg-surface-container-low'
                  }`}
                >
                  <input 
                    checked={form.publishMode === 'draft'} 
                    onChange={() => handleChange('publishMode', 'draft')}
                    className="mt-1 text-primary focus:ring-0 focus:outline-none cursor-pointer" 
                    name="publish_mode_hybrid" 
                    type="radio" 
                  />
                  <div>
                    <span className="block text-xs font-bold text-on-surface">Lưu trữ ở trạng thái Bản Nháp</span>
                    <span className="block text-[11px] text-on-surface-variant mt-0.5">Cho phép bạn hoàn thiện thông tin trước khi bấm xuất bản chính thức.</span>
                  </div>
                </label>
              </div>
            </section>

          </div>

          {/* Right Aside */}
          <aside className="col-span-12 lg:col-span-3 sticky top-24 space-y-5">

            {/* Preview Card */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-theme-border/70 shadow-xs">
              <div className="flex items-center justify-between mb-3.5">
                <span className="font-label-sm text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">XEM TRƯỚC SẢN PHẨM</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 font-label-sm text-[10px] text-primary font-bold border border-primary/20">
                  {selectedFormat === 'BOTH' ? 'COMBO BUNDLE' : selectedFormat === 'PHYSICAL' ? 'SÁCH IN' : 'EBOOK DRM'}
                </span>
              </div>
              <div className="flex gap-3.5 items-start">
                <div className="w-20 sm:w-22 aspect-[3/4] rounded-xl overflow-hidden shadow-md border border-theme-border shrink-0 relative bg-surface-container flex items-center justify-center">
                  {form.coverUrl ? (
                    <img 
                      className="w-full h-full object-cover" 
                      alt="Cover preview" 
                      src={form.coverUrl} 
                      onError={(e) => { e.currentTarget.src = '/banners/hero-library.jpg'; }}
                    />
                  ) : (
                    <span className="material-symbols-outlined text-3xl text-on-surface-variant">auto_stories</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                  <div>
                    <span className="inline-block font-label-sm text-[9px] px-2 py-0.5 rounded bg-primary text-white font-bold uppercase mb-1">
                      {selectedFormat === 'BOTH' ? 'Giấy + Ebook' : selectedFormat === 'PHYSICAL' ? 'Sách Giấy' : 'Ebook DRM'}
                    </span>
                    <h4 className="font-title-md text-xs font-bold text-on-surface truncate">{form.title || 'Tên sách mới...'}</h4>
                    <p className="font-body-sm text-[11px] text-on-surface-variant truncate">{displayAuthorName}</p>
                    <p className="text-[10px] text-primary font-medium truncate mt-0.5">🏷️ {displayCategoryName}</p>
                  </div>
                  <div className="mt-2 flex flex-col gap-0.5">
                    {(selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH') && (
                      <span className="font-bold text-xs text-primary">
                        In: {form.physicalPrice ? Number(form.physicalPrice).toLocaleString('vi-VN') : '0'} ₫
                      </span>
                    )}
                    {(selectedFormat === 'DIGITAL' || selectedFormat === 'BOTH') && (
                      <span className="font-bold text-xs text-emerald-800">
                        Ebook: {form.ebookPrice ? Number(form.ebookPrice).toLocaleString('vi-VN') : '0'} ₫
                      </span>
                    )}
                    {selectedFormat === 'BOTH' && (
                      <span className="font-bold text-xs text-amber-600">
                        Combo: {form.comboPrice ? Number(form.comboPrice).toLocaleString('vi-VN') : '0'} ₫
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3.5 pt-3 border-t border-theme-border/60 flex items-center justify-between text-[11px] text-on-surface-variant">
                <span>Gian hàng:</span>
                <span className="font-semibold text-on-surface truncate max-w-[150px]">{currentBizName}</span>
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-theme-border/70 shadow-xs space-y-3">
              <h4 className="font-label-sm text-[11px] uppercase font-bold text-on-surface-variant tracking-wider">
                CHECKLIST SẢN PHẨM
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-on-surface">
                  <span className={`material-symbols-outlined text-sm ${form.title ? 'text-primary' : 'text-outline/40'}`}>
                    {form.title ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span>Tên sách: {form.title ? 'Đã nhập' : 'Chưa nhập'}</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface">
                  <span className={`material-symbols-outlined text-sm ${((categoryMode === 'EXISTING' && form.categoryId) || (categoryMode === 'CUSTOM' && form.customCategoryName)) ? 'text-primary' : 'text-outline/40'}`}>
                    {((categoryMode === 'EXISTING' && form.categoryId) || (categoryMode === 'CUSTOM' && form.customCategoryName)) ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span>Danh mục: {displayCategoryName}</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface">
                  <span className={`material-symbols-outlined text-sm ${((authorMode === 'EXISTING' && form.authorId) || (authorMode === 'CUSTOM' && form.customAuthorName)) ? 'text-primary' : 'text-outline/40'}`}>
                    {((authorMode === 'EXISTING' && form.authorId) || (authorMode === 'CUSTOM' && form.customAuthorName)) ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span>Tác giả: {displayAuthorName}</span>
                </div>
                {(selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH') && (
                  <div className="flex items-center gap-2 text-on-surface">
                    <span className={`material-symbols-outlined text-sm ${Number(form.stock) >= 0 ? 'text-primary' : 'text-outline/40'}`}>
                      {Number(form.stock) >= 0 ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span>Tồn kho: {form.stock || 0} cuốn</span>
                  </div>
                )}
                {(selectedFormat === 'DIGITAL' || selectedFormat === 'BOTH') && (
                  <div className="flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span>Bảo hộ HUKI DRM V3.4</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-on-surface">
                  <span className={`material-symbols-outlined text-sm ${seoAudit.score >= 70 ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {seoAudit.score >= 70 ? 'check_circle' : 'info'}
                  </span>
                  <span>SEO Score: {seoAudit.score}% ({seoAudit.badge.text})</span>
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
          <Link to="/seller/products" className="px-3.5 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">
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
