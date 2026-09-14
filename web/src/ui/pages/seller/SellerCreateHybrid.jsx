import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { catalogApi, CategoryData } from '../../api/catalogApi';
import { businessApi } from '../../api/businessApi';
import { can, PERMISSIONS } from '../../utils/permissions';

export default function SellerCreateHybrid({ initialFormat = 'BOTH' }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, activeBusinessId } = useAuth();

  const currentBizId = user?.business?.id || activeBusinessId;
  const canCreateProduct = can(PERMISSIONS.PRODUCT_CREATE, currentBizId, user);

  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('sec-basic');
  const [selectedFormat, setSelectedFormat] = useState(initialFormat); // 'BOTH' | 'PHYSICAL' | 'DIGITAL'

  // Form State
  const [form, setForm] = useState({
    title: 'Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ (Combo Bìa Cứng & Ebook DRM)',
    teaser: 'Cuốn sách thực tiễn về cách xây dựng thói quen nhỏ để tạo ra những thay đổi lớn vượt bậc trong cuộc sống.',
    description: 'Bản Hybrid Bundle cho phép bạn sở hữu trọn vẹn cuốn sách bìa cứng cao cấp để thưởng thức trên kệ sách gia đình, đồng thời cấp ngay quyền đọc bản số DRM mã hóa độc quyền trên ứng dụng HUKI Ebook để tra cứu mọi lúc mọi nơi.',
    language: 'Tiếng Việt',
    publishDate: '2026-08-15',
    isbn: '978-604-58-9123-4',
    edition: 'Tái bản lần thứ 3 (Hiệu đính)',
    pages: 320,
    sku: 'ALPHA-AH-HYBRID',
    categoryId: '',
    authorId: '',
    publisherId: '',
    authorName: 'James Clear',
    publisherName: user?.business?.name || 'Alpha Books Official',
    coverUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBldhgYiC5r8pQXi4qeHSTCtWbbqbNG3on0MvhA1aDlNqhPWUc0vxDN66WP08gQOhujNyn9ioDRAdk0WMZ2kusBW1UaNz_drE-pr1z6kDX__xWCUYXEou-HgS4oTKLU_PdZUYQU71wmsMrkWVQ2QQQ9TpzYAwBodRXxIwHfqU3BdZALmt5R3bfLCpA0TV9C5YDY7LX8yfeFuJj3ZWernvxTjnpvNMG56GL6j2j-E-XC_WY454GWEaLicw',
    physicalPrice: 149000,
    originalPrice: 189000,
    ebookPrice: 79000,
    comboPrice: 199000,
    stock: 50,
    weight: 450,
    allowOnlineRead: true,
    allowDownload: false,
    drmEnabled: true,
    publishMode: 'instant', // 'instant' | 'draft'
  });

  const [tags, setTags] = useState(['Atomic Habits', 'Thói quen', 'Phát triển bản thân', 'Combo Hybrid']);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Load real categories from Backend
  useEffect(() => {
    const loadCategories = async () => {
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
          authorId: prev.authorId || authorData[0]?.id || '',
          authorName: authorData.find(item => item.id === (prev.authorId || authorData[0]?.id))?.name || prev.authorName,
          publisherId: prev.publisherId || publisherData[0]?.id || '',
          publisherName: publisherData.find(item => item.id === (prev.publisherId || publisherData[0]?.id))?.name || prev.publisherName,
        }));
      } catch (err) {
        console.warn('Could not load categories', err);
      }
    };
    loadCategories();
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
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

  // Submit Handler: Tạo Sách Hybrid Thật
  const handleSubmit = async (isDraft = false) => {
    if (!form.title.trim()) {
      showToast('Vui lòng nhập tên sản phẩm sách.', 'error');
      scrollToSection('sec-basic');
      return;
    }
    const hasPhysical = selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH';
    const hasDigital = selectedFormat === 'DIGITAL' || selectedFormat === 'BOTH';
    const sellingPrice = selectedFormat === 'BOTH' ? form.comboPrice : hasPhysical ? form.physicalPrice : form.ebookPrice;
    if (!sellingPrice || sellingPrice < 0) {
      showToast('Vui lòng nhập giá bán hợp lệ cho định dạng đã chọn.', 'error');
      scrollToSection('sec-pricing');
      return;
    }
    if (hasDigital && !isDraft && !form.ebookFile) {
      showToast('Vui lòng chọn tệp PDF Ebook trước khi xuất bản.', 'error');
      scrollToSection('sec-drm');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Resolve the owning business (Business is the storefront).
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
        showToast('Bạn cần có doanh nghiệp đã được duyệt trước khi thêm sách.', 'error');
        return;
      }

      // 2. Build CreateBook payload
      const payload = {
        title: form.title,
        isbn: form.isbn || undefined,
        description: form.description || form.teaser,
        price: Number(sellingPrice),
        format: selectedFormat,
        categoryId: form.categoryId || undefined,
        authorId: form.authorId || undefined,
        publisherId: form.publisherId || undefined,
        coverUrl: form.coverUrl || undefined,
        businessId,
        ...(hasPhysical && { physicalDetails: {
          stock: Number(form.stock || 0),
          weight: Number(form.weight || 400),
          length: Number(form.length || 20.5),
          width: Number(form.width || 14.5),
          height: Number(form.height || 2.5),
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

        if (hasDigital && form.ebookFile) {
          const uploadRes = await catalogApi.uploadBookFile(bookId, form.ebookFile);
          if (!uploadRes.success) {
            showToast(uploadRes.error?.message || 'Đã tạo bản nháp nhưng không thể tải tệp Ebook lên kho DRM.', 'error');
            return;
          }
        }

        // Cập nhật tồn kho
        if (hasPhysical && Number(form.stock) > 0) {
          try {
            await catalogApi.updateInventory(bookId, Number(form.stock));
          } catch (e) {
            console.warn('Inventory update failed', e);
          }
        }

        // Xuất bản nếu không phải bản nháp
        if (!isDraft && form.publishMode === 'instant') {
          const publishRes = await catalogApi.publishBook(bookId);
          if (!publishRes.success) {
            showToast(publishRes.error?.message || 'Đã tạo bản nháp nhưng không thể xuất bản sách.', 'error');
            return;
          }
        }

        showToast(
          isDraft 
            ? `Đã lưu bản nháp sách "${form.title}" thành công!` 
            : `Đã xuất bản thành công sách Hybrid: "${form.title}"!`, 
          'success'
        );

        navigate('/seller/products');
      } else {
        showToast(res.error?.message || 'Có lỗi khi tạo sách Hybrid.', 'error');
      }
    } catch (err) {
      showToast('Không thể kết nối API tạo sách.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const navItems = [
    { id: 'sec-basic', label: '01 Cơ Bản', completed: !!form.title },
    { id: 'sec-taxonomy', label: '02 Tác Giả & Phân Loại', completed: !!form.authorName },
    { id: 'sec-media', label: '03 Media & Bìa Sách', completed: !!form.coverUrl },
    { id: 'sec-pricing', label: '04 Giá Kép Hybrid', completed: form.physicalPrice > 0 && form.ebookPrice > 0 },
    { id: 'sec-inventory', label: '05 Kho Sách Giấy', completed: form.stock > 0 },
    { id: 'sec-shipping', label: '06 Vận Chuyển', completed: form.weight > 0 },
    { id: 'sec-drm', label: '07 Tệp Ebook DRM', completed: true, drm: true },
    { id: 'sec-publish', label: '08 Xuất Bản', completed: true }
  ];

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
    <div className="w-full bg-background text-on-surface font-body-md text-body-md antialiased min-h-screen pt-6 pb-0 flex flex-col justify-between">
      <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6 flex-1 pb-10">


        {/* Top Header & Breadcrumbs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-theme-border/60 pb-5">
          <div>
            <Link 
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-theme-secondary-subtle px-2.5 py-1 rounded-lg transition-colors mb-2" 
              to="/seller/products"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Danh Sách Sản Phẩm</span>
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">Thêm Sản Phẩm Mới (Hybrid Bundle)</h1>
              <span className="px-2.5 py-0.5 rounded-full border border-theme-border bg-theme-secondary-subtle text-theme-primary font-label-sm text-[11px] tracking-wider uppercase font-bold">
                {form.publishMode === 'instant' ? 'SẴN SÀNG PHÁT HÀNH' : 'BẢN NHÁP'}
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Tạo gói phát hành kép (Sách in + Ebook DRM) cho gian hàng <span className="text-on-surface font-semibold">{form.publisherName}</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 border border-primary/15 px-3 py-1.5 rounded-full font-label-md">
              <span className="material-symbols-outlined text-sm">cloud_done</span>
              <span>Tự động kết nối DB</span>
            </div>
            <button 
              type="button"
              onClick={() => scrollToSection('sec-basic')}
              className="px-3.5 py-2 rounded-xl border border-theme-border bg-surface-container-lowest text-xs font-semibold text-on-surface hover:bg-surface-container hover:border-theme-primary/30 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">visibility</span>
              <span>Xem Trước</span>
            </button>
          </div>
        </div>

        {/* Format Selector Cards */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 border border-theme-border/70 shadow-xs">
          <div className="mb-4">
            <h3 className="font-title-md text-base font-bold text-on-surface">Định Dạng Sản Phẩm</h3>
            <p className="text-xs text-on-surface-variant">Chọn hình thức mà khách hàng có thể mua sản phẩm này trên HUKI.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Physical */}
            <button
              type="button"
              onClick={() => setSelectedFormat('PHYSICAL')}
              className={`text-left relative rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between group ${selectedFormat === 'PHYSICAL' ? 'border-primary bg-primary/[0.04] ring-4 ring-primary/10' : 'border-theme-border/80 bg-surface-container-lowest hover:border-primary/50 hover:bg-primary/[0.02]'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-surface-container text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-2xl">menu_book</span>
                  </div>
                  <div>
                    <h4 className="font-title-md text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">SÁCH GIẤY</h4>
                    <span className="text-[10px] text-on-surface-variant font-medium tracking-wide uppercase">Vận chuyển vật lý</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-theme-border group-hover:border-primary transition-colors"></div>
              </div>
              <p className="text-xs text-on-surface-variant mt-3.5 leading-relaxed">
                Có tồn kho vật lý và đóng gói giao đến khách hàng qua các đối tác vận chuyển toàn quốc.
              </p>
            </button>

            {/* Ebook */}
            <button
              type="button"
              onClick={() => setSelectedFormat('DIGITAL')}
              className={`text-left relative rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between group ${selectedFormat === 'DIGITAL' ? 'border-primary bg-primary/[0.04] ring-4 ring-primary/10' : 'border-theme-border/80 bg-surface-container-lowest hover:border-primary/50 hover:bg-primary/[0.02]'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-surface-container text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-2xl">tablet_mac</span>
                  </div>
                  <div>
                    <h4 className="font-title-md text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">EBOOK DRM</h4>
                    <span className="text-[10px] text-on-surface-variant font-medium tracking-wide uppercase">Kỹ thuật số</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-theme-border group-hover:border-primary transition-colors"></div>
              </div>
              <p className="text-xs text-on-surface-variant mt-3.5 leading-relaxed">
                Đọc trực tuyến trên HUKI Reader sau khi được cấp quyền DRM số. Không tốn phí kho bãi.
              </p>
            </button>

            {/* Hybrid */}
            <button
              type="button"
              onClick={() => setSelectedFormat('BOTH')}
              className={`text-left relative rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between ${selectedFormat === 'BOTH' ? 'border-primary bg-primary/[0.04] ring-4 ring-primary/10' : 'border-theme-border/80 bg-surface-container-lowest hover:border-primary/50 hover:bg-primary/[0.02]'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-2xl">library_books</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-title-md text-sm font-bold text-primary">SÁCH GIẤY + EBOOK</h4>
                      <span className="px-1.5 py-0.2 bg-primary/15 text-primary rounded text-[9px] font-bold">KHUYÊN DÙNG</span>
                    </div>
                    <span className="text-[10px] text-primary font-bold tracking-wide uppercase">Combo Hybrid HUKI</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-sm">check</span>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant mt-3.5 leading-relaxed">
                Cung cấp đồng thời cả hai định dạng trên cùng một trang sản phẩm với mức giá và quản lý độc lập.
              </p>
            </button>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-12 gap-6 items-start">

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
                  {item.drm ? (
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
                  className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                  type="text" 
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Nhập tên sách..."
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="font-title-md text-xs font-bold text-on-surface">Giới thiệu ngắn (Teaser)</label>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">{form.teaser.length} / 300 ký tự</span>
                </div>
                <textarea 
                  className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none leading-relaxed transition-all resize-none" 
                  rows={2}
                  value={form.teaser}
                  onChange={(e) => handleChange('teaser', e.target.value)}
                />
              </div>

              <div>
                <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                  Mô tả chi tiết <span className="text-primary">*</span>
                </label>
                <textarea 
                  className="w-full rounded-xl border border-theme-border bg-surface-container-lowest p-4 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none leading-relaxed transition-all min-h-[120px]" 
                  rows={4}
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Nội dung giới thiệu chi tiết tác phẩm..."
                />
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Mã ISBN</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm font-mono text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="text" 
                    value={form.isbn}
                    onChange={(e) => handleChange('isbn', e.target.value)}
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
              </div>
            </section>

            {/* Section 2: Phân Loại & Tác Giả */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-taxonomy">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">2</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Phân Loại Sách &amp; Tác Giả</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Tối ưu hóa danh mục hiển thị trên storefront.</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Danh mục chính <span className="text-primary">*</span></label>
                  <select 
                    value={form.categoryId}
                    onChange={(e) => handleChange('categoryId', e.target.value)}
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                    {categories.length === 0 && (
                      <option value="">Phát Triển Bản Thân</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Tác giả <span className="text-primary">*</span></label>
                  <select
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all"
                    value={form.authorId}
                    onChange={(e) => {
                      handleChange('authorId', e.target.value);
                      handleChange('authorName', authors.find(item => item.id === e.target.value)?.name || '');
                    }}
                  >
                    <option value="">Chưa xác định tác giả</option>
                    {authors.map(author => <option key={author.id} value={author.id}>{author.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Nhà xuất bản</label>
                <select
                  className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all"
                  value={form.publisherId}
                  onChange={(e) => {
                    handleChange('publisherId', e.target.value);
                    handleChange('publisherName', publishers.find(item => item.id === e.target.value)?.name || user?.business?.name || '');
                  }}
                >
                  <option value="">Chưa xác định nhà xuất bản</option>
                  {publishers.map(publisher => <option key={publisher.id} value={publisher.id}>{publisher.name}</option>)}
                </select>
              </div>

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
                  className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-xs font-mono text-on-surface focus:border-primary focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-start gap-4">
                <div className="w-28 aspect-[3/4] relative rounded-xl overflow-hidden border border-theme-border shadow-md bg-surface-container shrink-0">
                  <img className="w-full h-full object-cover" alt="Cover preview" src={form.coverUrl || '/banners/hero-library.jpg'} />
                </div>
                <div className="text-xs text-on-surface-variant space-y-1">
                  <p className="font-bold text-on-surface">Khuyến nghị ảnh bìa:</p>
                  <p>• Tỷ lệ chuẩn 3:4 hoặc 2:3</p>
                  <p>• Định dạng WebP, JPEG hoặc PNG chất lượng cao</p>
                </div>
              </div>
            </section>

            {/* Section 4: Giá Kép Hybrid */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-pricing">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">4</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Cấu Hình Giá Bán Hybrid</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Thiết lập giá cho sách in và bản số Ebook DRM.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH') && <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Giá Sách Giấy (VNĐ) *</label>
                  <input 
                    type="number"
                    value={form.physicalPrice}
                    onChange={(e) => handleChange('physicalPrice', Number(e.target.value))}
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-primary focus:border-primary focus:outline-none"
                  />
                </div>}
                {(selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH') && <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Giá Gốc Niêm Yết (VNĐ)</label>
                  <input 
                    type="number"
                    value={form.originalPrice}
                    onChange={(e) => handleChange('originalPrice', Number(e.target.value))}
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm text-gray-500 focus:border-primary focus:outline-none"
                  />
                </div>}
                {(selectedFormat === 'DIGITAL' || selectedFormat === 'BOTH') && <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Giá Ebook DRM (VNĐ) *</label>
                  <input 
                    type="number"
                    value={form.ebookPrice}
                    onChange={(e) => handleChange('ebookPrice', Number(e.target.value))}
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-emerald-800 focus:border-primary focus:outline-none"
                  />
                </div>}
                {selectedFormat === 'BOTH' && <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Giá Combo ưu đãi (VNĐ) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.comboPrice}
                    onChange={(e) => handleChange('comboPrice', Number(e.target.value))}
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-primary focus:border-primary focus:outline-none"
                  />
                </div>}
              </div>
            </section>

            {/* Section 5: Kho Sách Giấy */}
            {(selectedFormat === 'PHYSICAL' || selectedFormat === 'BOTH') && (
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-inventory">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">5</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Tồn Kho Vật Lý &amp; Trọng Lượng</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Quản lý số lượng sách sẵn sàng giao cho vận chuyển.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Số lượng tồn kho (cuốn) *</label>
                  <input 
                    type="number"
                    value={form.stock}
                    onChange={(e) => handleChange('stock', Number(e.target.value))}
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Khối lượng đóng gói (grams) *</label>
                  <input 
                    type="number"
                    value={form.weight}
                    onChange={(e) => handleChange('weight', Number(e.target.value))}
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none"
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
                    <p className="font-body-sm text-xs text-on-surface-variant">Mã hóa bản quyền số chống sao chép trái phép.</p>
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
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Tệp Ebook (PDF/EPUB)</label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => handleChange('ebookFile', e.target.files?.[0] || null)}
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2 text-xs text-on-surface focus:border-primary focus:outline-none"
                  />
                  <p className="text-[10px] text-on-surface-variant mt-1">PDF riêng tư, tối đa 100 MB; được chuyển vào kho DRM sau khi tạo sách.</p>
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Số trang *</label>
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

            {/* Section 8: Xuất Bản */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-4" id="sec-publish">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">8</span>
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
                    <span className="block text-xs font-bold text-on-surface">Tự động phát hành cả 2 định dạng ngay khi gửi</span>
                    <span className="block text-[11px] text-on-surface-variant mt-0.5">Sách in và Ebook DRM sẽ hiển thị đồng bộ trên cùng một trang chi tiết sản phẩm.</span>
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
                    <span className="block text-[11px] text-on-surface-variant mt-0.5">Cho phép bạn hoàn thiện nội dung trước khi bấm xuất bản chính thức.</span>
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
                <span className="font-label-sm text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">XEM TRƯỚC HYBRID</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 font-label-sm text-[10px] text-primary font-bold border border-primary/20">COMBO BUNDLE</span>
              </div>
              <div className="flex gap-3.5 items-start">
                <div className="w-20 sm:w-22 aspect-[3/4] rounded-xl overflow-hidden shadow-md border border-theme-border shrink-0 relative bg-surface-container">
                  <img className="w-full h-full object-cover" alt="Cover preview" src={form.coverUrl || '/banners/hero-library.jpg'} />
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                  <div>
                    <span className="inline-block font-label-sm text-[9px] px-2 py-0.5 rounded bg-primary text-white font-bold uppercase mb-1">Giấy + Ebook</span>
                    <h4 className="font-title-md text-xs font-bold text-on-surface truncate">{form.title || 'Tên sách...'}</h4>
                    <p className="font-body-sm text-[11px] text-on-surface-variant truncate">{form.authorName}</p>
                  </div>
                  <div className="mt-2 flex flex-col gap-0.5">
                    <span className="font-bold text-xs text-primary">In: {form.physicalPrice.toLocaleString('vi-VN')} ₫</span>
                    <span className="font-bold text-xs text-emerald-800">Ebook: {form.ebookPrice.toLocaleString('vi-VN')} ₫</span>
                  </div>
                </div>
              </div>
              <div className="mt-3.5 pt-3 border-t border-theme-border/60 flex items-center justify-between text-[11px] text-on-surface-variant">
                <span>Gian hàng:</span>
                <span className="font-semibold text-on-surface">{form.publisherName}</span>
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-theme-border/70 shadow-xs space-y-3">
              <h4 className="font-label-sm text-[11px] uppercase font-bold text-on-surface-variant tracking-wider">
                CHECKLIST HYBRID COMBO
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  <span>Tên sách &amp; Tác giả</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  <span>Giá kép (Sách in &amp; Ebook)</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  <span>Tồn kho: {form.stock} cuốn</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  <span>Bảo hộ HUKI DRM V3.4</span>
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
                <span>XUẤT BẢN SÁCH HYBRID</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
