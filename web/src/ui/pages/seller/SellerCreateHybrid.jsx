import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function SellerCreateHybrid() {
  const [shippingEnabled, setShippingEnabled] = useState(true);
  const [samplePreviewEnabled, setSamplePreviewEnabled] = useState(true);
  const [tags, setTags] = useState(['Atomic Habits', 'Thói quen', 'Phát triển bản thân', 'Combo Hybrid']);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [publishMode, setPublishMode] = useState('instant');
  const [activeSection, setActiveSection] = useState('sec-basic');

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

  const navItems = [
    { id: 'sec-basic', label: '01 Cơ Bản', completed: true },
    { id: 'sec-taxonomy', label: '02 Tác Giả & Phân Loại', completed: true },
    { id: 'sec-media', label: '03 Media & Bìa Sách', completed: true },
    { id: 'sec-pricing', label: '04 Giá Kép Hybrid', completed: true },
    { id: 'sec-inventory', label: '05 Kho Sách Giấy', completed: true },
    { id: 'sec-shipping', label: '06 Vận Chuyển', completed: true },
    { id: 'sec-drm', label: '07 Tệp Ebook DRM', completed: true, drm: true },
    { id: 'sec-publish', label: '08 Xuất Bản', completed: false }
  ];

  return (
    <div className="w-full bg-background text-on-surface font-body-md text-body-md antialiased min-h-screen py-6 pb-28">
      <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

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
                <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">Thêm Sản Phẩm Mới (Hybrid Bundle)</h1>
                <span className="px-2.5 py-0.5 rounded-full border border-theme-border bg-theme-secondary-subtle text-theme-primary font-label-sm text-[11px] tracking-wider uppercase font-bold">
                  BẢN NHÁP
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                Tạo gói phát hành kép (Sách in + Ebook DRM) cho gian hàng <span className="text-on-surface font-semibold">Alpha Books Official</span>.
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

              {/* Physical - Inactive */}
              <Link
                to="/seller/product/create-physical"
                className="relative rounded-2xl border border-theme-border/80 hover:border-primary/50 bg-surface-container-lowest hover:bg-primary/[0.02] p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between group"
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
                      <h4 className="font-title-md text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">EBOOK DRM</h4>
                      <span className="text-[10px] text-on-surface-variant font-medium tracking-wide uppercase">Kỹ thuật số</span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-theme-border group-hover:border-primary transition-colors"></div>
                </div>
                <p className="text-xs text-on-surface-variant mt-3.5 leading-relaxed">
                  Đọc trực tuyến trên HUKI Reader sau khi được cấp quyền DRM số. Không tốn phí kho bãi.
                </p>
              </Link>

              {/* Hybrid - Active */}
              <Link
                to="/seller/product/create-hybrid"
                className="relative rounded-2xl border-2 border-primary bg-primary/[0.04] p-5 cursor-pointer shadow-md ring-4 ring-primary/10 transition-all flex flex-col justify-between"
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
              </Link>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-surface-container-low/70 border border-theme-border/60 flex items-start gap-2.5 text-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5">info</span>
              <span>Khách hàng có thể chọn mua <strong>Sách Giấy</strong>, <strong>Ebook</strong> hoặc cả <strong>Combo Hybrid</strong> từ cùng một trang sản phẩm với mức ưu đãi tốt nhất.</span>
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
                    defaultValue="Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ (Bản Bìa Cứng & Ebook DRM)" 
                  />
                  <p className="font-label-sm text-[11px] text-on-surface-variant mt-1.5">Tên sách sẽ hiển thị nhất quán trên kệ sách giấy và thư viện số.</p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="font-title-md text-xs font-bold text-on-surface">Giới thiệu ngắn (Teaser)</label>
                    <span className="font-label-sm text-[11px] text-on-surface-variant">112 / 300 ký tự</span>
                  </div>
                  <textarea 
                    className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none leading-relaxed transition-all resize-none" 
                    rows={2}
                    defaultValue="Cuốn sách thực tiễn về cách xây dựng thói quen nhỏ để tạo ra những thay đổi lớn vượt bậc trong cuộc sống và sự nghiệp."
                  />
                </div>

                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                    Mô tả chi tiết <span className="text-primary">*</span>
                  </label>
                  <div className="border border-theme-border rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                    <div className="bg-surface-container-low/70 px-3 py-2 border-b border-theme-border flex flex-wrap items-center gap-1 text-on-surface-variant">
                      <button className="p-1 rounded-lg hover:bg-surface-container font-bold text-xs w-7 h-7 flex items-center justify-center cursor-pointer" type="button">B</button>
                      <button className="p-1 rounded-lg hover:bg-surface-container italic text-xs w-7 h-7 flex items-center justify-center cursor-pointer" type="button">I</button>
                      <button className="p-1 rounded-lg hover:bg-surface-container font-bold text-xs w-7 h-7 flex items-center justify-center cursor-pointer" type="button">H1</button>
                      <button className="p-1 rounded-lg hover:bg-surface-container font-bold text-xs w-7 h-7 flex items-center justify-center cursor-pointer" type="button">H2</button>
                      <span className="w-px h-4 bg-theme-border mx-1"></span>
                      <button className="p-1 rounded-lg hover:bg-surface-container flex items-center justify-center w-7 h-7 cursor-pointer" type="button">
                        <span className="material-symbols-outlined text-base">format_list_bulleted</span>
                      </button>
                      <button className="p-1 rounded-lg hover:bg-surface-container flex items-center justify-center w-7 h-7 cursor-pointer" type="button">
                        <span className="material-symbols-outlined text-base">format_quote</span>
                      </button>
                      <button className="p-1 rounded-lg hover:bg-surface-container flex items-center justify-center w-7 h-7 cursor-pointer" type="button">
                        <span className="material-symbols-outlined text-base">link</span>
                      </button>
                    </div>

                    <div className="p-4 text-sm font-body-md text-on-surface leading-relaxed space-y-2 bg-surface-container-lowest min-h-[140px]">
                      <p className="font-headline-sm text-base text-primary italic">"Thay đổi 1% mỗi ngày – Bạn sẽ ngạc nhiên với kết quả sau 1 năm."</p>
                      <p><strong>Atomic Habits (Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ)</strong> của James Clear là một trong những cuốn sách phi hư cấu bán chạy nhất toàn cầu, giải mã khoa học thần kinh đằng sau những thói quen tự động của con người.</p>
                      <p className="text-on-surface-variant">Bản Hybrid Bundle cho phép bạn sở hữu trọn vẹn cuốn sách bìa cứng cao cấp để thưởng thức trên kệ sách gia đình, đồng thời cấp ngay quyền đọc bản số DRM mã hóa độc quyền trên ứng dụng HUKI Ebook để tra cứu mọi lúc mọi nơi.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Ngôn ngữ</label>
                    <select className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all">
                      <option>Tiếng Việt</option>
                      <option>Tiếng Anh (English)</option>
                      <option>Song ngữ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Ngày xuất bản</label>
                    <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" type="text" defaultValue="15/08/2020" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Mã ISBN</label>
                    <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm font-mono text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" type="text" defaultValue="978-604-58-9123-4" />
                  </div>
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Phiên bản</label>
                    <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" type="text" defaultValue="Tái bản lần thứ 3 (Hiệu đính)" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Số trang <span className="text-primary">*</span></label>
                    <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" type="number" defaultValue="320" />
                  </div>
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Mã SKU gốc</label>
                    <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm font-mono text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" type="text" defaultValue="ALPHA-AH-HYBRID" />
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
                    <select className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all">
                      <option>Phát Triển Bản Thân</option>
                      <option>Kinh Doanh &amp; Khởi Nghiệp</option>
                      <option>Tâm Lý Học Ứng Dụng</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Danh mục phụ</label>
                    <select className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all">
                      <option>Thói Quen &amp; Kỷ Luật</option>
                      <option>Quản Lý Thời Gian</option>
                      <option>Tư Duy &amp; Nhận Thức</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="font-title-md text-xs font-bold text-on-surface">Tác giả <span className="text-primary">*</span></label>
                      <Link className="text-xs text-primary hover:underline font-semibold" to="/">+ Đề xuất mới</Link>
                    </div>
                    <div className="relative">
                      <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest pl-4 pr-10 py-2.5 text-sm font-semibold text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" type="text" defaultValue="James Clear" />
                      <span className="material-symbols-outlined absolute right-3.5 top-2.5 text-primary text-lg">check</span>
                    </div>
                  </div>
                  <div>
                    <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Nhà xuất bản đối tác</label>
                    <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" type="text" defaultValue="NXB Thế Giới - Alpha Books Liên Kết" />
                  </div>
                </div>

                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-2">Từ khóa tìm kiếm (Tags)</label>
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

              {/* Section 3: Media */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-media">
                <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">3</span>
                    <div>
                      <h2 className="font-headline-sm text-base font-bold text-on-surface">Ảnh Bìa &amp; Thư Viện Media</h2>
                      <p className="font-body-sm text-xs text-on-surface-variant">Ảnh bìa dùng chung cho bản in và thumbnail Ebook.</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">
                  <div className="sm:col-span-1">
                    <div className="w-32 sm:w-36 aspect-[3/4] relative rounded-xl overflow-hidden border border-theme-border shadow-md bg-surface-container group">
                      <img className="w-full h-full object-cover" alt="Atomic Habits main cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBldhgYiC5r8pQXi4qeHSTCtWbbqbNG3on0MvhA1aDlNqhPWUc0vxDN66WP08gQOhujNyn9ioDRAdk0WMZ2kusBW1UaNz_drE-pr1z6kDX__xWCUYXEou-HgS4oTKLU_PdZUYQU71wmsMrkWVQ2QQQ9TpzYAwBodRXxIwHfqU3BdZALmt5R3bfLCpA0TV9C5YDY7LX8yfeFuJj3ZWernvxTjnpvNMG56GL6j2j-E-XC_WY454GWEaLicw" />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-primary text-white text-[10px] font-bold tracking-wide">
                        BÌA CHÍNH
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <button className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer" type="button">
                        <span className="material-symbols-outlined text-sm">sync</span> Thay ảnh
                      </button>
                      <span className="text-[11px] text-primary font-medium">✓ Đã tối ưu WebP</span>
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-3">
                    <div className="font-title-md text-xs font-bold text-on-surface">Ảnh minh họa thực tế &amp; Trang mẫu Ebook</div>
                    <div className="grid grid-cols-4 gap-2.5">
                      <div className="aspect-square rounded-xl border border-theme-border overflow-hidden relative group bg-surface-container">
                        <img className="w-full h-full object-cover" alt="Back cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2ObjFzX-qOeDSx11vlWD-3ZwGh01OAEiuJcAXcm3a08zXkVuei7P2YjZH7woDsurwMyPGpQvmxLuGDdn4tVMeNohnE8jeCKmpIf_dLoNw66f5jsDb1Sc85attvMaPRY6RMgj_7e_lBoI9ZlZBOasHLT04lPg3qjet_3swCfsmnz3cxcJJc4X2ORipgLtkkMaEYjDuYzHAROSzgnmOY35ebqhn90We9QPYGL41KU9pSsw_z1zR6i4aXw" />
                        <span className="absolute bottom-1 left-1 px-1 bg-black/60 text-white rounded text-[9px]">Mặt sau</span>
                      </div>
                      <div className="aspect-square rounded-xl border border-theme-border overflow-hidden relative group bg-surface-container">
                        <img className="w-full h-full object-cover" alt="Spine" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7eePQIEA_5rfnpK_54q3WoiNecNNZD5qh1L080VOjeSiykvuPh-mTykFhryP1a-a1R41QEFjhcyM_7E-Q_dsd14DA9EJz5f2NFCX07ud5R0XwBiydikV12YB5Wxq5VgFyFM6scfwmiOrsKzO_zUU2nY7nSHP4CYdEG54I-KIgdZACosVKfxkxN1AuaSurE5x4ZG_vgruH01iufhDw_tiC372Mh2sd8tdClxcsk3dMo94_d5KdQiIE4Q" />
                        <span className="absolute bottom-1 left-1 px-1 bg-black/60 text-white rounded text-[9px]">Gáy cứng</span>
                      </div>
                      <div className="aspect-square rounded-xl border border-theme-border overflow-hidden relative group bg-surface-container">
                        <img className="w-full h-full object-cover" alt="Interior" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuvDhzM1w0zaO_fY7fEb6vL2cqNcOdMHvY1VjkKSWAmg-Eq-fxuDxRXYMAXDmrbtMykllAntDcR3N1W2BNGiHbZB_9Q1Li8KfKUE0nQz8tpRoVps-IMEesKym7B4P4x35gf6VLeePHdULRdwbS31MQn29nCw23cuJ7alckH4R4FZM_L6bTod0elwSFFZz4irYH1RaT-25Gvsp5iQfocKBOQmwTCpA-BQGKqWTcRH7uGSBcR1zBZXkEuw" />
                        <span className="absolute bottom-1 left-1 px-1 bg-black/60 text-white rounded text-[9px]">Ruột sách</span>
                      </div>
                      <label className="aspect-square rounded-xl border-2 border-dashed border-theme-border hover:border-primary flex flex-col items-center justify-center cursor-pointer transition-all bg-surface-container-low/40 hover:bg-primary/[0.03]">
                        <span className="material-symbols-outlined text-on-surface-variant">add_photo_alternate</span>
                        <span className="text-[10px] text-on-surface-variant mt-1 font-bold">+ Thêm ảnh</span>
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 4: Giá Bán Kép Hybrid */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border-2 border-primary/20 shadow-xs space-y-5" id="sec-pricing">
                <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center shadow-xs">4</span>
                    <div>
                      <h2 className="font-headline-sm text-base font-bold text-on-surface">Giá Bán Kép Riêng Biệt (Dual Pricing)</h2>
                      <p className="font-body-sm text-xs text-on-surface-variant">Thiết lập giá độc lập cho từng định dạng.</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-[11px] font-bold">
                    HYBRID CORE
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-surface-container-low/60 border border-theme-border/70 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-lg">menu_book</span>
                          <span className="font-title-md text-xs font-bold text-on-surface uppercase">Sách Giấy Vật Lý</span>
                        </div>
                        <span className="text-[10px] font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">Giao tận tay</span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-on-surface-variant mb-1">Giá bìa niêm yết</label>
                          <div className="relative">
                            <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2 text-sm font-semibold text-on-surface focus:border-primary focus:outline-none" type="text" defaultValue="189.000" />
                            <span className="absolute right-3.5 top-2 text-xs text-on-surface-variant font-bold">₫</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-on-surface mb-1">Giá bán HUKI *</label>
                          <div className="relative">
                            <input className="w-full rounded-xl border-2 border-primary bg-surface-container-lowest px-3.5 py-2 text-sm font-bold text-primary focus:border-primary focus:outline-none" type="text" defaultValue="149.000" />
                            <span className="absolute right-3.5 top-2 text-xs font-bold text-primary">₫</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3.5 pt-2.5 border-t border-theme-border/50 text-[11px] flex items-center justify-between text-primary font-semibold">
                      <span>Tiết kiệm: 40.000 ₫</span>
                      <span className="bg-primary/10 px-1.5 py-0.5 rounded font-bold">-21%</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-primary/[0.03] border-2 border-primary/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-lg">tablet_mac</span>
                          <span className="font-title-md text-xs font-bold text-primary uppercase">Ebook DRM Số</span>
                        </div>
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">Đọc tức thì</span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-on-surface-variant mb-1">Giá bìa tham chiếu</label>
                          <div className="relative">
                            <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2 text-sm font-semibold text-on-surface focus:border-primary focus:outline-none" type="text" defaultValue="149.000" />
                            <span className="absolute right-3.5 top-2 text-xs text-on-surface-variant font-bold">₫</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-primary mb-1">Giá bán Ebook HUKI *</label>
                          <div className="relative">
                            <input className="w-full rounded-xl border-2 border-primary bg-surface-container-lowest px-3.5 py-2 text-sm font-bold text-primary focus:border-primary focus:outline-none" type="text" defaultValue="79.000" />
                            <span className="absolute right-3.5 top-2 text-xs font-bold text-primary">₫</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3.5 pt-2.5 border-t border-theme-border/50 text-[11px] flex items-center justify-between text-primary font-semibold">
                      <span>Tiết kiệm: 70.000 ₫</span>
                      <span className="bg-primary text-white px-1.5 py-0.5 rounded font-bold">-47%</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 5: Kho Sách Giấy */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-inventory">
                <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">5</span>
                    <div>
                      <h2 className="font-headline-sm text-base font-bold text-on-surface">Quản Lý Kho Sách Giấy</h2>
                      <p className="font-body-sm text-xs text-on-surface-variant">Tồn kho áp dụng cho bản sách in.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">SKU Sách Giấy *</label>
                    <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2 text-xs font-mono focus:border-primary focus:outline-none" type="text" defaultValue="ATOMIC-HABITS-PHY" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">Tồn kho thực tế *</label>
                    <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2 text-sm font-bold focus:border-primary focus:outline-none" type="number" defaultValue="120" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">Báo tồn kho thấp</label>
                    <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2 text-sm focus:border-primary focus:outline-none" type="number" defaultValue="10" />
                  </div>
                </div>
              </section>

              {/* Section 6: Vận Chuyển */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="sec-shipping">
                <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">6</span>
                    <div>
                      <h2 className="font-headline-sm text-base font-bold text-on-surface">Vận Chuyển Hàng Hóa</h2>
                      <p className="font-body-sm text-xs text-on-surface-variant">Quy cách kiện hàng đóng gói phục vụ giao nhận.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">Khối lượng (g) *</label>
                    <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2 text-sm focus:border-primary focus:outline-none" type="number" defaultValue="450" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">Dài (cm) *</label>
                    <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2 text-sm focus:border-primary focus:outline-none" type="number" defaultValue="21" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">Rộng (cm) *</label>
                    <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2 text-sm focus:border-primary focus:outline-none" type="number" defaultValue="15" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1">Cao (cm) *</label>
                    <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2 text-sm focus:border-primary focus:outline-none" type="number" defaultValue="3.5" />
                  </div>
                </div>
              </section>

              {/* Section 7: Tệp Ebook DRM */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border-2 border-primary/30 shadow-xs space-y-5" id="sec-drm">
                <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center shadow-xs">7</span>
                    <div>
                      <h2 className="font-headline-sm text-base font-bold text-on-surface">Tệp Ebook Số &amp; Bảo Mật DRM</h2>
                      <p className="font-body-sm text-xs text-primary font-semibold">Tệp số được mã hóa và mở khóa tự động khi mua</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-[11px] font-bold">
                    DRM READY
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-low/70 border border-primary/25 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-title-md text-sm font-bold text-on-surface">Atomic-Habits-Hybrid-DRM.pdf</span>
                          <span className="px-2 py-0.5 rounded-full bg-primary text-white font-label-sm text-[10px] font-bold">DRM V3.4</span>
                        </div>
                        <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                          Dung lượng: <strong>48.2 MB</strong> · Sẵn sàng cấp quyền đọc tức thì
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary flex items-center gap-1 bg-surface-container-lowest px-2.5 py-1 rounded-lg border border-primary/20 shadow-2xs">
                      <span className="material-symbols-outlined text-sm">verified</span>
                      <span>Sẵn Sàng</span>
                    </span>
                  </div>
                </div>
              </section>

              {/* Section 8: Xuất Bản */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-4" id="sec-publish">
                <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">8</span>
                    <div>
                      <h2 className="font-headline-sm text-base font-bold text-on-surface">Xuất Bản Combo Hybrid</h2>
                      <p className="font-body-sm text-xs text-on-surface-variant">Quy tắc mở bán sản phẩm kép.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label 
                    onClick={() => setPublishMode('instant')}
                    className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                      publishMode === 'instant' 
                        ? 'border-primary bg-primary/[0.03] ring-2 ring-primary/10' 
                        : 'border-theme-border hover:bg-surface-container-low'
                    }`}
                  >
                    <input 
                      checked={publishMode === 'instant'} 
                      onChange={() => setPublishMode('instant')}
                      className="mt-1 text-primary focus:ring-0 focus:outline-none cursor-pointer" 
                      name="publish_mode_hybrid" 
                      type="radio" 
                    />
                    <div>
                      <span className="block text-xs font-bold text-on-surface">Tự động phát hành cả 2 định dạng ngay khi duyệt xong</span>
                      <span className="block text-[11px] text-on-surface-variant mt-0.5">Sách in và Ebook DRM sẽ hiển thị đồng bộ trên cùng một trang chi tiết sản phẩm.</span>
                    </div>
                  </label>

                  <label 
                    onClick={() => setPublishMode('draft')}
                    className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-all ${
                      publishMode === 'draft' 
                        ? 'border-primary bg-primary/[0.03] ring-2 ring-primary/10' 
                        : 'border-theme-border hover:bg-surface-container-low'
                    }`}
                  >
                    <input 
                      checked={publishMode === 'draft'} 
                      onChange={() => setPublishMode('draft')}
                      className="mt-1 text-primary focus:ring-0 focus:outline-none cursor-pointer" 
                      name="publish_mode_hybrid" 
                      type="radio" 
                    />
                    <div>
                      <span className="block text-xs font-bold text-on-surface">Lưu trữ ở trạng thái Riêng tư / Chờ phát hành</span>
                      <span className="block text-[11px] text-on-surface-variant mt-0.5">Cho phép bạn chủ động chọn ngày giờ mở bán khớp với kế hoạch truyền thông.</span>
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
                    <img className="w-full h-full object-cover" alt="Atomic Habits Hybrid" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBldhgYiC5r8pQXi4qeHSTCtWbbqbNG3on0MvhA1aDlNqhPWUc0vxDN66WP08gQOhujNyn9ioDRAdk0WMZ2kusBW1UaNz_drE-pr1z6kDX__xWCUYXEou-HgS4oTKLU_PdZUYQU71wmsMrkWVQ2QQQ9TpzYAwBodRXxIwHfqU3BdZALmt5R3bfLCpA0TV9C5YDY7LX8yfeFuJj3ZWernvxTjnpvNMG56GL6j2j-E-XC_WY454GWEaLicw" />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <span className="inline-block font-label-sm text-[9px] px-2 py-0.5 rounded bg-primary text-white font-bold uppercase mb-1">Giấy + Ebook</span>
                      <h4 className="font-title-md text-xs font-bold text-on-surface truncate">Atomic Habits (Combo)</h4>
                      <p className="font-body-sm text-[11px] text-on-surface-variant truncate">James Clear</p>
                    </div>
                    <div className="mt-2 flex flex-col gap-0.5">
                      <span className="font-bold text-xs text-primary">In: 149.000 ₫</span>
                      <span className="font-bold text-xs text-on-surface">Ebook: 79.000 ₫</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3.5 pt-3 border-t border-theme-border/60 flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span>Gian hàng:</span>
                  <span className="font-semibold text-on-surface">Alpha Books Official</span>
                </div>
              </div>

              {/* Completion Meter */}
              <div className="bg-surface-container-lowest rounded-2xl p-5 border border-theme-border/70 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-title-md text-xs font-bold text-on-surface">Mức độ hoàn thiện</span>
                  <span className="font-title-md text-xs font-bold text-primary">90%</span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: '90%' }}></div>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium flex items-center gap-1.5 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                  <span className="material-symbols-outlined text-sm text-emerald-700">task_alt</span>
                  <span>Đầy đủ cả 2 cấu hình Sách In &amp; DRM.</span>
                </p>
              </div>

              {/* Checklist */}
              <div className="bg-surface-container-lowest rounded-2xl p-5 border border-theme-border/70 shadow-xs space-y-3">
                <h4 className="font-label-sm text-[11px] uppercase font-bold text-on-surface-variant tracking-wider">
                  CHECKLIST HYBRID COMBO
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span>Thông tin cơ bản &amp; Tác giả</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span>Giá kép (Sách in &amp; Ebook)</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span>Tồn kho vật lý</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span>Tệp PDF/EPUB mã hóa DRM</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span>Kích thước kiện hàng</span>
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
          <span>Đã tự động lưu nháp lúc 10:42</span>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/seller/products" className="px-3.5 py-2 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">
            Hủy / Thoát
          </Link>
          <button className="px-4 py-2 rounded-xl border border-theme-border bg-surface-container-lowest text-xs font-semibold text-on-surface hover:bg-surface-container transition-all shadow-xs cursor-pointer" type="button">
            Lưu Bản Nháp
          </button>
          <button className="px-4 py-2 rounded-xl border border-theme-border bg-surface-container text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-all cursor-pointer" type="button">
            Xem Trước Giao Diện Gian Hàng
          </button>

          <button className="px-6 py-2.5 rounded-xl bg-primary hover:opacity-90 text-white font-title-md text-xs font-bold tracking-wide transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer" type="button">
            <span>GỬI DUYỆT SẢN PHẨM</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
