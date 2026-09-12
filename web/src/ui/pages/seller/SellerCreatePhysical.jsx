import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { catalogApi, CategoryData } from '../../api/catalogApi';
import { businessApi } from '../../api/businessApi';

export default function SellerCreatePhysical() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shippingEnabled, setShippingEnabled] = useState(true);
  const [activeSection, setActiveSection] = useState('sec-basic');

  const [form, setForm] = useState({
    title: 'Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ (Bản Bìa Cứng)',
    teaser: 'Cuốn sách kinh điển hướng dẫn từng bước thiết lập hệ thống thói quen nguyên tử, giúp cải thiện 1% mỗi ngày để đạt thành tựu vượt bậc trong sự nghiệp và đời sống.',
    description: 'Trong Atomic Habits, James Clear chắt lọc những phát hiện đã được khoa học kiểm chứng từ sinh học, tâm lý học và thần kinh học để tạo ra một chỉ dẫn hành động dễ áp dụng cho bất kỳ ai muốn thay đổi nếp sống thường nhật.',
    language: 'Tiếng Việt',
    publishDate: '2026-08-15',
    isbn: '978-604-58-9123-4',
    edition: 'Tái bản lần thứ 12',
    pages: 384,
    coverType: 'Bìa cứng có áo ôm (Hardcover w/ Jacket)',
    categoryId: '',
    authorName: 'James Clear',
    publisherName: user?.business?.name || 'Alpha Books Official',
    distributorName: 'Alpha Books',
    coverUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBldhgYiC5r8pQXi4qeHSTCtWbbqbNG3on0MvhA1aDlNqhPWUc0vxDN66WP08gQOhujNyn9ioDRAdk0WMZ2kusBW1UaNz_drE-pr1z6kDX__xWCUYXEou-HgS4oTKLU_PdZUYQU71wmsMrkWVQ2QQQ9TpzYAwBodRXxIwHfqU3BdZALmt5R3bfLCpA0TV9C5YDY7LX8yfeFuJj3ZWernvxTjnpvNMG56GL6j2j-E-XC_WY454GWEaLicw',
    originalPrice: 189000,
    price: 149000,
    sku: 'AB-ATOMIC-HARD-01',
    stock: 120,
    lowStockThreshold: 10,
    warehouseLocation: 'Kho Tân Phú, TP. HCM (Khu B-12)',
    weight: 450,
    length: 21,
    width: 15,
    height: 3,
    publishMode: 'instant',
  });

  const [tags, setTags] = useState(['Thói quen', 'Kỷ luật bản thân', 'Năng suất']);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await catalogApi.getCategories();
        if (res.success && Array.isArray(res.data)) {
          setCategories(res.data);
          if (res.data.length > 0 && !form.categoryId) {
            setForm(prev => ({ ...prev, categoryId: res.data[0].id }));
          }
        }
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

  const handleSubmit = async (isDraft = false) => {
    if (!form.title.trim()) {
      showToast('Vui lòng nhập tên sản phẩm sách.', 'error');
      scrollToSection('sec-basic');
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      showToast('Vui lòng nhập giá bán hợp lệ.', 'error');
      scrollToSection('sec-pricing');
      return;
    }

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
        showToast('Bạn cần có doanh nghiệp đã được duyệt trước khi thêm sách.', 'error');
        return;
      }

      const payload = {
        title: form.title,
        isbn: form.isbn || undefined,
        description: form.description || form.teaser,
        price: Number(form.price),
        format: 'PHYSICAL',
        categoryId: form.categoryId || undefined,
        coverUrl: form.coverUrl || undefined,
        businessId,
        physicalDetails: {
          stock: Number(form.stock || 0),
          weight: Number(form.weight || 450),
          length: Number(form.length || 21),
          width: Number(form.width || 15),
          height: Number(form.height || 3),
          physicalEnabled: true,
        },
      };

      const res = await catalogApi.createBook(payload);

      if (res.success && res.data?.id) {
        const bookId = res.data.id;

        if (Number(form.stock) > 0) {
          try {
            await catalogApi.updateInventory(bookId, Number(form.stock));
          } catch (e) {
            console.warn('Inventory update failed', e);
          }
        }

        if (!isDraft) {
          const publishRes = await catalogApi.publishBook(bookId);
          if (!publishRes.success) {
            showToast(publishRes.error?.message || 'Đã tạo bản nháp nhưng không thể xuất bản sách.', 'error');
            return;
          }
        }

        showToast(
          isDraft
            ? `Đã lưu bản nháp sách "${form.title}" thành công!`
            : `Đã xuất bản thành công sách giấy: "${form.title}"!`,
          'success'
        );

        navigate('/seller/products');
      } else {
        showToast(res.error?.message || 'Có lỗi khi tạo sách giấy.', 'error');
      }
    } catch {
      showToast('Không thể kết nối API tạo sách.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const navItems = [
    { id: 'sec-basic', label: 'Thông Tin Cơ Bản', completed: true },
    { id: 'sec-category', label: 'Phân Loại Sách', completed: true },
    { id: 'sec-media', label: 'Ảnh & Media', completed: true },
    { id: 'sec-pricing', label: 'Giá Bán', completed: true },
    { id: 'sec-inventory', label: 'Kho Hàng', completed: false, warning: true },
    { id: 'sec-shipping', label: 'Vận Chuyển', completed: false, warning: true },
    { id: 'sec-publish', label: 'Xuất Bản', completed: false }
  ];

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
              <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">Thêm Sản Phẩm Mới</h1>
              <span className="px-2.5 py-0.5 rounded-full border border-theme-border bg-theme-secondary-subtle text-theme-primary font-label-sm text-[11px] tracking-wider uppercase font-bold">
                BẢN NHÁP
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Tạo sản phẩm sách mới cho gian hàng <span className="text-on-surface font-semibold">Alpha Books Official</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 border border-primary/15 px-3 py-1.5 rounded-full font-label-md">
              <span className="material-symbols-outlined text-sm">cloud_done</span>
              <span>Đã tự động lưu lúc 10:42</span>
            </div>
            <button className="px-3.5 py-2 rounded-xl border border-theme-border bg-surface-container-lowest text-xs font-semibold text-on-surface hover:bg-surface-container hover:border-theme-primary/30 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer">
              <span className="material-symbols-outlined text-sm">visibility</span>
              <span>Xem Trước</span>
            </button>
            <button className="p-2 rounded-xl border border-theme-border bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer">
              <span className="material-symbols-outlined text-base">more_vert</span>
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

            {/* Physical - Active */}
            <Link
              to="/seller/product/create-physical"
              className="relative rounded-2xl border-2 border-primary bg-primary/[0.04] p-5 cursor-pointer shadow-md ring-4 ring-primary/10 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-2xl">menu_book</span>
                  </div>
                  <div>
                    <h4 className="font-title-md text-sm font-bold text-primary">SÁCH GIẤY</h4>
                    <span className="text-[10px] text-primary font-bold tracking-wide uppercase">Vận chuyển vật lý</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-sm">check</span>
                </div>
              </div>
              <p className="text-xs text-on-surface-variant mt-3.5 leading-relaxed">
                Có tồn kho vật lý và đóng gói giao đến khách hàng qua các đối tác vận chuyển toàn quốc.
              </p>
            </Link>

            {/* Ebook - Inactive */}
            <Link
              to="/seller/product/create-ebook"
              className="relative rounded-2xl border border-theme-border/80 hover:border-primary/50 bg-surface-container-lowest hover:bg-primary/[0.02] p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-surface-container text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-2xl">tablet_mac</span>
                  </div>
                  <div>
                    <h4 className="font-title-md text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">EBOOK</h4>
                    <span className="text-[10px] text-on-surface-variant font-medium tracking-wide uppercase">Kỹ thuật số DRM</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-theme-border group-hover:border-primary transition-colors"></div>
              </div>
              <p className="text-xs text-on-surface-variant mt-3.5 leading-relaxed">
                Đọc trực tuyến trên HUKI Reader sau khi được cấp quyền DRM số. Không tốn phí kho bãi.
              </p>
            </Link>

            {/* Hybrid - Inactive */}
            <Link
              to="/seller/product/create-hybrid"
              className="relative rounded-2xl border border-theme-border/80 hover:border-primary/50 bg-surface-container-lowest hover:bg-primary/[0.02] p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-surface-container text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-2xl">auto_stories</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-title-md text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">SÁCH GIẤY + EBOOK</h4>
                      <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.2 rounded">BUNDLE</span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant font-bold tracking-wide uppercase">Combo Hybrid HUKI</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-theme-border group-hover:border-primary transition-colors"></div>
              </div>
              <p className="text-xs text-on-surface-variant mt-3.5 leading-relaxed">
                Khách nhận bản sách in tận tay, đồng thời được mở khóa đọc ngay bản điện tử trên app.
              </p>
            </Link>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-12 gap-6 items-start">

          {/* Left Sticky Sub-Navigation */}
          <nav className="col-span-12 lg:col-span-2 sticky top-20 bg-surface-container-lowest rounded-2xl p-3.5 border border-theme-border/70 shadow-xs space-y-1.5">
            <p className="px-2.5 py-1 font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
              MỤC NỘI DUNG
            </p>
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-primary/10 text-primary border-l-4 border-primary font-bold shadow-2xs'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  {item.completed ? (
                    <span className="material-symbols-outlined text-primary text-xs">check_circle</span>
                  ) : item.warning ? (
                    <span className="material-symbols-outlined text-amber-600 text-xs">warning</span>
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
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Thông Tin Cơ Bản</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Các thông tin thư mục học chính để nhận diện ấn bản sách in.</p>
                  </div>
                </div>
                <span className="text-[11px] text-on-surface-variant">Bắt buộc (*)</span>
              </div>

              <div>
                <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                  Tên sản phẩm sách <span className="text-primary">*</span>
                </label>
                <input 
                  className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                  type="text" 
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Nhập tựa đề sách in..."
                />
                <p className="font-label-sm text-[11px] text-on-surface-variant mt-1.5">Nên bao gồm tên tác phẩm và quy cách bìa (VD: Bìa mềm / Bìa cứng đặc biệt).</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="font-title-md text-xs font-bold text-on-surface">Giới thiệu ngắn (Lead text)</label>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">{form.teaser.length} / 300 ký tự</span>
                </div>
                <textarea 
                  className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none leading-relaxed transition-all resize-none" 
                  rows={2}
                  value={form.teaser}
                  onChange={(e) => handleChange('teaser', e.target.value)}
                  placeholder="Tóm tắt ngắn gọn 1-2 câu..."
                />
              </div>

              <div>
                <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                  Mô tả chi tiết sách <span className="text-primary">*</span>
                </label>
                <textarea
                  className="w-full rounded-xl border border-theme-border bg-surface-container-lowest p-3.5 text-sm font-body-md text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none leading-relaxed transition-all min-h-[140px]"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Mô tả chi tiết tác phẩm, mục lục, thông điệp chính..."
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Ngôn ngữ bản in</label>
                  <select 
                    value={form.language}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all"
                  >
                    <option value="Tiếng Việt">Tiếng Việt</option>
                    <option value="Tiếng Anh (Bản gốc)">Tiếng Anh (Bản gốc)</option>
                    <option value="Song ngữ">Song ngữ</option>
                  </select>
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Ngày phát hành</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="date" 
                    value={form.publishDate}
                    onChange={(e) => handleChange('publishDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                    Mã ISBN <span className="text-on-surface-variant font-normal text-[11px]">(Định danh quốc tế)</span>
                  </label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm font-mono text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="text" 
                    value={form.isbn}
                    onChange={(e) => handleChange('isbn', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Lần tái bản</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="text" 
                    value={form.edition}
                    onChange={(e) => handleChange('edition', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Số trang *</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="number" 
                    value={form.pages}
                    onChange={(e) => handleChange('pages', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Định dạng bìa</label>
                  <select 
                    value={form.coverType}
                    onChange={(e) => handleChange('coverType', e.target.value)}
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all"
                  >
                    <option value="Bìa cứng có áo ôm (Hardcover w/ Jacket)">Bìa cứng có áo ôm (Hardcover w/ Jacket)</option>
                    <option value="Bìa mềm cao cấp (Paperback)">Bìa mềm cao cấp (Paperback)</option>
                    <option value="Bìa da đặc biệt đánh số">Bìa da đặc biệt đánh số</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Section 2: Phân Loại Sách */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-category">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">2</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Phân Loại Sách &amp; Tác Giả</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Gắn đúng danh mục giúp độc giả dễ tìm kiếm trong gian hàng.</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Thể loại chính *</label>
                  <select 
                    value={form.categoryId}
                    onChange={(e) => handleChange('categoryId', e.target.value)}
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all font-medium"
                  >
                    {categories.length > 0 ? (
                      categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))
                    ) : (
                      <option value="">Đang tải thể loại...</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Đơn vị phát hành</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="text" 
                    value={form.distributorName}
                    onChange={(e) => handleChange('distributorName', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-title-md text-xs font-bold text-on-surface">Tác giả *</label>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-on-surface-variant text-lg">person</span>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest pl-10 pr-4 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="text" 
                    value={form.authorName}
                    onChange={(e) => handleChange('authorName', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Nhà xuất bản *</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="text" 
                    value={form.publisherName}
                    onChange={(e) => handleChange('publisherName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Ảnh bìa URL</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="text" 
                    value={form.coverUrl}
                    onChange={(e) => handleChange('coverUrl', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-title-md text-xs font-bold text-on-surface mb-2">Thẻ từ khóa (Tags)</label>
                <div className="flex flex-wrap items-center gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-xs font-medium text-on-surface border border-theme-border/50">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-primary cursor-pointer">
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
                      <button onClick={handleAddTag} className="px-2 py-0.5 rounded-full bg-primary text-white text-xs font-bold cursor-pointer">Lưu</button>
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

            {/* Section 3: Ảnh & Media */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-media">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">3</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Ảnh &amp; Media Sách</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Tỉ lệ ảnh bìa chuẩn 2:3 giúp tối ưu hiển thị trên ứng dụng độc giả.</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
              </div>

              <div>
                <label className="block font-title-md text-xs font-bold text-on-surface mb-2">
                  Ảnh bìa chính (Cover portrait) <span className="text-primary">*</span>
                </label>
                <div className="flex items-start gap-5">
                  <div className="relative w-32 sm:w-36 aspect-[2/3] rounded-xl overflow-hidden shadow-md border border-theme-border flex-shrink-0 group bg-surface-container">
                    <img className="w-full h-full object-cover" alt="Atomic Habits hardcover edition" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBldhgYiC5r8pQXi4qeHSTCtWbbqbNG3on0MvhA1aDlNqhPWUc0vxDN66WP08gQOhujNyn9ioDRAdk0WMZ2kusBW1UaNz_drE-pr1z6kDX__xWCUYXEou-HgS4oTKLU_PdZUYQU71wmsMrkWVQ2QQQ9TpzYAwBodRXxIwHfqU3BdZALmt5R3bfLCpA0TV9C5YDY7LX8yfeFuJj3ZWernvxTjnpvNMG56GL6j2j-E-XC_WY454GWEaLicw" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-bold px-2 py-1 rounded bg-black/50">2:3 Chuẩn</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Định dạng hỗ trợ: JPG, PNG, WEBP. Độ phân giải tối thiểu khuyến nghị: 1200 x 1800 px. Bìa sách cần rõ tiêu đề và không dính watermark lạ.
                    </p>
                    <div className="flex items-center gap-2">
                      <button className="px-3.5 py-1.5 rounded-xl border border-theme-border bg-surface-container-lowest text-xs font-semibold text-on-surface hover:bg-surface-container transition-all shadow-xs cursor-pointer" type="button">
                        Thay ảnh bìa
                      </button>
                      <button className="px-3 py-1.5 rounded-xl text-xs font-semibold text-primary hover:bg-primary/5 transition-all cursor-pointer" type="button">
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-title-md text-xs font-bold text-on-surface">Thư viện ảnh chi tiết (Trang mẫu &amp; ảnh thực tế)</label>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">3 / 8 ảnh</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="aspect-square rounded-xl overflow-hidden border border-theme-border relative group">
                    <img className="w-full h-full object-cover" alt="Open spread of a physical hardcover book" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCwCB6Wlqg0Dp0M3KCi9Y5xFN9ZaTbUvR_RkC7xsr3rU6lgcVtO9ks-477P7YaZsbxR_fiZ3RsXePjuJynqddu1G5Z2H-wb3UBK-M-97KNK7M69qjzQ4tNQC9Fe-F4785nNQm2wIhKM1mAtKpVF6pX2x68Lk4-xiRgmtuydtZ3wA3abct6DvRfkIDvUoP1UfpbW0IAlTgFlp_A-7FfnNL6vT3vq9rOoqqOCtINFDQvgv9iE53D2VuPb1g" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button className="text-white p-1 hover:text-primary cursor-pointer"><span className="material-symbols-outlined text-sm">delete</span></button>
                    </div>
                  </div>

                  <div className="aspect-square rounded-xl border border-theme-border overflow-hidden relative group">
                    <img className="w-full h-full object-cover" alt="Close up shot of the embossed gold foil book spine" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6_extTTzaSPj-y6ZKmvAzaatV6GPpeB8HCcTNa_i56IqecnuFJM0DT8TtzCuMoQj91R7tx4DqCoQHoFv7crIEvNVhTuB-0ayWPaBVKdwDBPd_T4zptXML5KZX0FBmvNkZGOA2vUlX4Xg3nX3UQZ2yBwO8uNF5cckmLq9mrHhlX3NMSxK0yUG1PDBwdwxygwQuHHue8sAjiatN6DOajuuutG6_VIKBYbz4exFr-YJ3Gt6MdDGu0CT77g" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button className="text-white p-1 hover:text-primary cursor-pointer"><span className="material-symbols-outlined text-sm">delete</span></button>
                    </div>
                  </div>

                  <div className="aspect-square rounded-xl border border-theme-border overflow-hidden relative group">
                    <img className="w-full h-full object-cover" alt="Lifestyle photograph of a reader taking notes" src="https://lh3.googleusercontent.com/aida-public/AB6AXuARuIGLTHMDCZuT1eHcw5xD6Cbu5rwaV76ew3V9Wzk9HIz__4vtzcX0PC-Wnec-DQytnkEDpg0S6m0SOZSUxX_FUwYfWzu8RaZfwAV0bEc8C8qpVCoC5NyorBuo55ril64zU7uC1Sy_b1Sg6RX3R_5sDqw4crh3OHMs5uCO0zeoi2Rj7cuMnIDm0XFfUlgC2OfQtNkfE_HRcIdbWay7hyV_DZrnrrP_zg43xSSjBxHl4KTPz_Yh_q36qQ" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button className="text-white p-1 hover:text-primary cursor-pointer"><span className="material-symbols-outlined text-sm">delete</span></button>
                    </div>
                  </div>

                  <div className="aspect-square rounded-xl border-2 border-dashed border-theme-border hover:border-primary flex flex-col items-center justify-center text-on-surface-variant hover:text-primary cursor-pointer transition-all bg-surface-container-low/30 hover:bg-primary/[0.03]">
                    <span className="material-symbols-outlined text-2xl mb-1">add_photo_alternate</span>
                    <span className="font-label-sm text-[10px] font-bold">+ Thêm ảnh</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Giá Bán & Khuyến Mãi */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-pricing">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">4</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Giá Bán &amp; Khuyến Mãi</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Định giá sản phẩm tại sàn HUKI và chiết khấu ưu đãi.</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Giá niêm yết (Giá bìa NXB)</label>
                  <div className="relative">
                    <input 
                      className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                      type="number" 
                      value={form.originalPrice}
                      onChange={(e) => handleChange('originalPrice', Number(e.target.value))}
                    />
                    <span className="absolute right-4 top-2.5 text-xs text-on-surface-variant font-bold">₫</span>
                  </div>
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                    Giá bán tại HUKI <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <input 
                      className="w-full rounded-xl border-2 border-primary bg-primary/[0.02] px-4 py-2.5 text-sm font-bold text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                      type="number" 
                      value={form.price}
                      onChange={(e) => handleChange('price', Number(e.target.value))}
                    />
                    <span className="absolute right-4 top-2.5 text-xs text-primary font-bold">₫</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/[0.06] to-transparent border border-primary/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-xl">savings</span>
                  <span className="text-xs text-on-surface">Tiết kiệm cho độc giả: <strong className="text-primary font-bold">{Math.max(0, form.originalPrice - form.price).toLocaleString('vi-VN')} ₫</strong></span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary font-bold text-xs">
                  {form.originalPrice > form.price ? `-${Math.round(((form.originalPrice - form.price) / form.originalPrice) * 100)}% Ưu đãi` : 'Giá chuẩn'}
                </span>
              </div>
            </section>

            {/* Section 5: Kho Hàng Sách Giấy */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-inventory">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">5</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Kho Hàng Sách Giấy</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Quản lý tồn kho thực tế và cảnh báo tồn thấp tự động.</p>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">Kho thực tế</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Mã SKU gian hàng *</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm font-mono text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="text" 
                    value={form.sku}
                    onChange={(e) => handleChange('sku', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Số lượng tồn kho ban đầu *</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm font-bold text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="number" 
                    value={form.stock}
                    onChange={(e) => handleChange('stock', Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Ngưỡng cảnh báo hết hàng</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="number" 
                    value={form.lowStockThreshold}
                    onChange={(e) => handleChange('lowStockThreshold', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Vị trí lưu kho</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="text" 
                    value={form.warehouseLocation}
                    onChange={(e) => handleChange('warehouseLocation', e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Section 6: Vận Chuyển */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-shipping">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">6</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Thông Tin Kiện Hàng &amp; Vận Chuyển</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Kích thước và trọng lượng sau khi đã đóng gói chống sốc.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low/70 border border-theme-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">local_shipping</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface">Bật giao hàng toàn quốc</p>
                    <p className="text-[11px] text-on-surface-variant">Tự động kết nối GHN, GHTK, Viettel Post qua hệ thống HUKI.</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShippingEnabled(!shippingEnabled)}
                  className={`w-12 h-6 rounded-full relative p-0.5 transition-colors cursor-pointer ${shippingEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${shippingEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-label-sm text-xs font-bold text-on-surface mb-1">Khối lượng (g) *</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="number" 
                    value={form.weight}
                    onChange={(e) => handleChange('weight', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-xs font-bold text-on-surface mb-1">Dài (cm) *</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="number" 
                    value={form.length}
                    onChange={(e) => handleChange('length', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-xs font-bold text-on-surface mb-1">Rộng (cm) *</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="number" 
                    value={form.width}
                    onChange={(e) => handleChange('width', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-xs font-bold text-on-surface mb-1">Cao (cm) *</label>
                  <input 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                    type="number" 
                    value={form.height}
                    onChange={(e) => handleChange('height', Number(e.target.value))}
                  />
                </div>
              </div>
            </section>

            {/* Section 7: Xuất Bản */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-4" id="sec-publish">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">7</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Xuất Bản &amp; Hiển Thị</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Quy tắc kích hoạt sản phẩm trên storefront người mua sau kiểm duyệt.</p>
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
                    name="publish_mode" 
                    type="radio" 
                  />
                  <div>
                    <span className="block text-xs font-bold text-on-surface">Tự động hiển thị và mở bán ngay trên Storefront</span>
                    <span className="block text-[11px] text-on-surface-variant mt-0.5">Sản phẩm sẽ xuất hiện lập tức trên gian hàng khi tạo thành công.</span>
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
                    name="publish_mode" 
                    type="radio" 
                  />
                  <div>
                    <span className="block text-xs font-bold text-on-surface">Lưu bản nháp ẩn (DRAFT)</span>
                    <span className="block text-[11px] text-on-surface-variant mt-0.5">Phù hợp khi bạn đang chuẩn bị hồ sơ hoặc chờ đúng ngày ra mắt.</span>
                  </div>
                </label>
              </div>
            </section>

          </div>

          {/* Right Aside: Live Card Preview & Checklist */}
          <aside className="col-span-12 lg:col-span-3 sticky top-20 space-y-5">

            {/* Preview Card */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-theme-border/70 shadow-xs">
              <div className="flex items-center justify-between mb-3.5">
                <span className="font-label-sm text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">XEM TRƯỚC THẺ SÁCH</span>
                <span className="px-2 py-0.5 rounded-full bg-theme-secondary-subtle font-label-sm text-[10px] text-theme-primary font-bold border border-theme-border">
                  {form.publishMode === 'draft' ? 'BẢN NHÁP' : 'SẴN SÀNG'}
                </span>
              </div>
              <div className="flex gap-3.5 items-start">
                <div className="w-20 sm:w-22 aspect-[2/3] rounded-xl overflow-hidden shadow-md border border-theme-border shrink-0 relative bg-surface-container">
                  <img className="w-full h-full object-cover" alt="Miniature front view of book" src={form.coverUrl} />
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                  <div>
                    <span className="inline-block font-label-sm text-[9px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold uppercase mb-1">Sách Giấy</span>
                    <h4 className="font-title-md text-xs font-bold text-on-surface truncate">{form.title || 'Tên sách...'}</h4>
                    <p className="font-body-sm text-[11px] text-on-surface-variant truncate">{form.authorName || 'Tác giả...'}</p>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-bold text-sm text-primary">{form.price ? `${form.price.toLocaleString('vi-VN')} ₫` : '0 ₫'}</span>
                    {form.originalPrice > form.price && (
                      <span className="text-[10px] line-through text-on-surface-variant">{form.originalPrice.toLocaleString('vi-VN')} ₫</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3.5 pt-3 border-t border-theme-border/60 flex items-center justify-between text-[11px] text-on-surface-variant">
                <span>Gian hàng:</span>
                <span className="font-semibold text-on-surface truncate max-w-[130px]">{form.publisherName}</span>
              </div>
            </div>

            {/* Completion Meter */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-theme-border/70 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-title-md text-xs font-bold text-on-surface">Mức độ hoàn thiện</span>
                <span className="font-title-md text-xs font-bold text-primary">100%</span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: '100%' }}></div>
              </div>
              <p className="text-[11px] text-emerald-800 font-medium flex items-center gap-1.5 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                <span className="material-symbols-outlined text-sm text-emerald-700">task_alt</span>
                <span>Thông tin hợp lệ &amp; sẵn sàng lưu.</span>
              </p>
            </div>
          </aside>

        </div>
      </main>

      {/* Sticky Bottom Action Footer */}
      <footer className="sticky bottom-0 z-30 bg-surface-container-lowest/95 backdrop-blur-md border-t border-theme-border/70 px-6 sm:px-8 py-3.5 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
          <span className="material-symbols-outlined text-primary text-base">cloud_done</span>
          <span>Sẵn sàng lưu vào hệ thống</span>
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
              <>
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>XUẤT BẢN SÁCH GIẤY</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
