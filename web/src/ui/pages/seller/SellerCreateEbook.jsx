import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function SellerCreateEbook() {
  const [sampleEnabled, setSampleEnabled] = useState(true);
  const [tags, setTags] = useState(['Atomic Habits', 'Ebook bản quyền', 'Kỷ luật bản thân']);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [publishMode, setPublishMode] = useState('instant');
  const [activeSection, setActiveSection] = useState('section-basic');

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
    { id: 'section-basic', label: 'Thông Tin Cơ Bản', completed: true },
    { id: 'section-category', label: 'Phân Loại & Tác Giả', completed: true },
    { id: 'section-media', label: 'Ảnh Bìa & Media', completed: true },
    { id: 'section-pricing', label: 'Giá Bán Ebook', completed: true },
    { id: 'section-ebook-content', label: 'Tệp Ebook & DRM', completed: true, drm: true },
    { id: 'section-rights', label: 'Cam Kết Bản Quyền', completed: false, warning: true },
    { id: 'section-publish', label: 'Xuất Bản & Mở Bán', completed: false }
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
              <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">Thêm Sản Phẩm Ebook DRM</h1>
              <span className="px-2.5 py-0.5 rounded-full border border-theme-border bg-theme-secondary-subtle text-theme-primary font-label-sm text-[11px] tracking-wider uppercase font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                BẢN QUYỀN SỐ
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Tạo sản phẩm sách điện tử DRM cho gian hàng <span className="text-on-surface font-semibold">Alpha Books Official</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 border border-primary/15 px-3 py-1.5 rounded-full font-label-md">
              <span className="material-symbols-outlined text-sm">cloud_done</span>
              <span>Đã tự động lưu lúc 10:42</span>
            </div>
            <button className="px-3.5 py-2 rounded-xl border border-theme-border bg-surface-container-lowest text-xs font-semibold text-on-surface hover:bg-surface-container hover:border-theme-primary/30 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer">
              <span className="material-symbols-outlined text-sm">visibility</span>
              <span>Xem Trước Reader</span>
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

            {/* Ebook - Active */}
            <Link
              to="/seller/product/create-ebook"
              className="relative rounded-2xl border-2 border-primary bg-primary/[0.04] p-5 cursor-pointer shadow-md ring-4 ring-primary/10 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-2xl">tablet_mac</span>
                  </div>
                  <div>
                    <h4 className="font-title-md text-sm font-bold text-primary">EBOOK KỸ THUẬT SỐ</h4>
                    <span className="text-[10px] text-primary font-bold tracking-wide uppercase">DRM Bản Quyền</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-sm">check</span>
                </div>
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
                  {item.drm ? (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-primary text-white font-bold">DRM</span>
                  ) : item.completed ? (
                    <span className="material-symbols-outlined text-primary text-xs">check_circle</span>
                  ) : item.warning ? (
                    <span className="material-symbols-outlined text-amber-600 text-xs">warning</span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-outline/40"></span>
                  )}
                </button>
              );
            })}

            <div className="pt-2 mt-2 border-t border-theme-border/60 text-[11px] text-on-surface-variant leading-tight flex items-start gap-1.5 px-2">
              <span className="material-symbols-outlined text-xs text-primary mt-0.5">info</span>
              <span>Ebook tự động cấp quyền đọc số, không tốn phí lưu kho.</span>
            </div>
          </nav>

          {/* Middle Form Sections */}
          <div className="col-span-12 lg:col-span-7 space-y-6">

            {/* Section 1: Thông Tin Cơ Bản Ebook */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="section-basic">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">1</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Thông Tin Cơ Bản Ebook</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Tên và thông tin thư mục của ấn bản điện tử.</p>
                  </div>
                </div>
                <span className="text-[11px] text-on-surface-variant">Bắt buộc (*)</span>
              </div>

              <div>
                <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                  Tên sản phẩm Ebook <span className="text-primary">*</span>
                </label>
                <input 
                  className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm font-medium text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" 
                  type="text" 
                  defaultValue="Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ (Bản Kỹ Thuật Số DRM)" 
                />
                <p className="font-label-sm text-[11px] text-on-surface-variant mt-1.5">Tên sách điện tử kèm định danh bản quyền để bạn đọc dễ nhận diện trên HUKI Reader.</p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="font-title-md text-xs font-bold text-on-surface">Giới thiệu ngắn (Lead text)</label>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">142 / 300 ký tự</span>
                </div>
                <textarea 
                  className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none leading-relaxed transition-all resize-none" 
                  rows={2}
                  defaultValue="Cuốn sách kinh điển toàn cầu về việc hình thành thói quen tốt và loại bỏ thói quen xấu một cách tự nhiên thông qua hệ thống phân tầng hành vi 1% mỗi ngày."
                />
              </div>

              <div>
                <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                  Mô tả chi tiết nội dung sách <span className="text-primary">*</span>
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
                    <p className="font-headline-sm text-base text-primary italic">"Thay đổi không bắt đầu từ mục tiêu lớn lao, mà từ chu kỳ 1% cải thiện nhỏ nhặt mỗi ngày."</p>
                    <p>Trong ấn bản điện tử chính thức phân phối trên HUKI, độc giả được tiếp cận toàn bộ sơ đồ ma trận hành vi độ phân giải cao, chỉ mục tương tác chuyển chương tức thì và tính năng ghi chú riêng tư đồng bộ qua Cloud Reader.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Ngôn ngữ <span className="text-primary">*</span></label>
                  <select className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all">
                    <option>Tiếng Việt</option>
                    <option>English</option>
                    <option>Song ngữ Anh - Việt</option>
                  </select>
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Ngày phát hành điện tử <span className="text-primary">*</span></label>
                  <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" type="date" defaultValue="2025-05-15" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Mã eISBN Bản Quyền Số <span className="text-primary">*</span></label>
                  <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm font-mono text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" type="text" defaultValue="978-604-58-9123-4-EB" />
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Số trang kỹ thuật số <span className="text-primary">*</span></label>
                  <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" type="number" defaultValue="380" />
                </div>
              </div>
            </section>

            {/* Section 2: Phân Loại & Tác Giả */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="section-category">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">2</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Phân Loại &amp; Tác Giả</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Phân loại giúp độc giả dễ tìm kiếm và tối ưu SEO.</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Danh mục chính *</label>
                  <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" type="text" defaultValue="Phát Triển Bản Thân" />
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Danh mục phụ</label>
                  <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" type="text" defaultValue="Thói Quen &amp; Kỷ Luật" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-title-md text-xs font-bold text-on-surface">Tác giả *</label>
                    <Link className="font-body-sm text-[11px] text-primary hover:underline" to="/">Không tìm thấy? Đề xuất mới</Link>
                  </div>
                  <div className="relative">
                    <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest pl-4 pr-10 py-2.5 text-sm font-semibold text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" type="text" defaultValue="James Clear" />
                    <span className="material-symbols-outlined absolute right-3.5 top-2.5 text-primary text-lg">check</span>
                  </div>
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Nhà xuất bản bản quyền *</label>
                  <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" type="text" defaultValue="NXB Thế Giới - Alpha Books" />
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

            {/* Section 3: Ảnh Bìa Kỹ Thuật Số & Media */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="section-media">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">3</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Ảnh Bìa Kỹ Thuật Số &amp; Media</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Tối ưu hóa hiển thị trên màn hình smartphone, tablet &amp; e-reader.</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-32 sm:w-36 flex-shrink-0">
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-theme-border shadow-md bg-surface-container group">
                    <img className="w-full h-full object-cover" alt="Official graphic book cover design of Atomic Habits" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDOYh4ba1idBkiR2I8t0pbdA5FVcmBvHkOWsn-6ihQAw4v36GBdi9qZb-Ef2l9Q7pwf8U5b-YhC_MHz4uICBBj1fVy10mzaI1UWVXqpQY8u2Pt0bsfSl7mZtxUx2jwedu3VpfRL-dHGtqxlrkAAJCUYiX9sL3DilKi9JH38UBhTg7gbdhOvQ49VfEsuXjVZSGFMhjkdSxAVpWEetgSSRzLHqYif101iDoUn8nRyClOOEC8cuhL8j3JLag" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-white font-label-sm text-[9px] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[11px] text-primary">lock</span>
                      <span>DRM</span>
                    </div>
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-white/90 text-on-surface font-label-sm text-[9px] font-bold">
                      3:4 Hi-Res
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2.5">
                    <button className="flex-1 py-1.5 rounded-xl border border-theme-border bg-surface-container-lowest text-xs font-semibold text-on-surface hover:bg-surface-container transition-all shadow-xs cursor-pointer" type="button">
                      Thay ảnh
                    </button>
                    <button className="px-2.5 py-1.5 rounded-xl border border-theme-border bg-surface-container-lowest text-primary text-xs font-semibold hover:bg-primary/5 transition-all shadow-xs cursor-pointer" type="button">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="p-4 rounded-xl bg-surface-container-low/50 border border-dashed border-theme-border flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-primary text-3xl mb-1">add_photo_alternate</span>
                    <span className="font-title-md text-xs font-bold text-on-surface">Tải ảnh bìa sắc nét hoặc banner quảng bá Ebook</span>
                    <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">Khuyến nghị tỉ lệ 3:4, tối thiểu 1600x2133 px, dung lượng dưới 10MB (JPG, PNG, WebP).</p>
                    <button className="mt-2.5 px-3.5 py-1.5 rounded-xl bg-surface-container-lowest border border-theme-border text-xs font-semibold hover:bg-surface-container shadow-xs cursor-pointer">
                      Tải tệp lên từ máy
                    </button>
                  </div>

                  <div>
                    <span className="font-title-md text-xs font-bold text-on-surface block mb-2">Thư viện ảnh trang sách mẫu &amp; Infographic minh họa (3)</span>
                    <div className="flex gap-3">
                      <div className="w-16 h-20 rounded-xl border border-theme-border overflow-hidden bg-surface-container-high">
                        <img className="w-full h-full object-cover" alt="Infographic page preview" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTwSz4ICEALQ7BW7d5Piktpd_iLDoCQsvkP8SXNBtxH2hlcRdP0m5kG1Z76w4LVUIZJBw5Er9itVIdCTwoT9xdev1AFuXOZttzRojLhtqccxe4SN_c2jz9RS4WVC2BqZMGAhmnVEEdVzXZlZ-4YSjGxG8NCv0BPjJUPylLSDryKzlYGCtgW-5Y9zCSo2VcOI-iQD71gmCt8LGBOc3hCmJ3N-6bZw_di6lBnYWwtPEn3esRDV3vReJl9w" />
                      </div>
                      <div className="w-16 h-20 rounded-xl border border-theme-border overflow-hidden bg-surface-container-high">
                        <img className="w-full h-full object-cover" alt="Book interior chapter header" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUkdO_KBXafZYeYIc4h0qGePrs2MBc9U6UloeqRMDnNaXnvAued2YBSWO-zQV39Web2b1ouxwGyxFW_-hDGIDmEmwTbtrjEKFA7haFoGL0URiYW78w-Is1otIIGEvxq_r8DLKWnEfIuTDdoPY4xt3n1p67ttOKNDROgfPL21IgXKB527wtlYeEKLF47pNO5xdb2XOLpLH23poyoJo5lWqm79Fv_Mi7SKK7cdOpBxf8T752MisOaSRIbA" />
                      </div>
                      <div className="w-16 h-20 rounded-xl border border-dashed border-theme-border hover:border-primary flex items-center justify-center text-on-surface-variant hover:text-primary cursor-pointer transition-all bg-surface-container-low/40">
                        <span className="material-symbols-outlined text-xl">add</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Giá Bán Bản Quyền Ebook */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-5" id="section-pricing">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">4</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Giá Bán Bản Quyền Ebook</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Thiết lập giá bán đọc số và tỷ lệ chiết khấu.</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">Giá bìa niêm yết (Tham chiếu sách giấy)</label>
                  <div className="relative">
                    <input className="w-full rounded-xl border border-theme-border bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" type="text" defaultValue="149.000" />
                    <span className="absolute right-4 top-2.5 text-xs text-on-surface-variant font-bold">₫</span>
                  </div>
                </div>
                <div>
                  <label className="block font-title-md text-xs font-bold text-on-surface mb-1.5">
                    Giá bán Ebook HUKI <span className="text-primary">*</span>
                  </label>
                  <div className="relative">
                    <input className="w-full rounded-xl border-2 border-primary bg-primary/[0.02] px-4 py-2.5 text-sm font-bold text-primary focus:border-primary focus:ring-4 focus:ring-primary/10 focus:outline-none transition-all" type="text" defaultValue="79.000" />
                    <span className="absolute right-4 top-2.5 text-xs text-primary font-bold">₫</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/[0.06] to-transparent border border-primary/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-xl">savings</span>
                  <span className="text-xs text-on-surface">Độc giả tiết kiệm: <strong className="text-primary font-bold">70.000 ₫ (-47%)</strong> so với bản giấy</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-primary/15 text-primary font-bold text-xs">
                  Tỉ lệ chuyển đổi cao
                </span>
              </div>
            </section>

            {/* Section 5: Nội Dung Ebook & Bảo Mật DRM */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border-2 border-primary/30 shadow-xs space-y-6 relative overflow-hidden" id="section-ebook-content">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center shadow-xs">5</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Nội Dung Ebook &amp; Bảo Mật DRM</h2>
                    <p className="font-body-sm text-xs text-primary font-semibold">Trung tâm tệp số phân phối độc quyền</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary font-label-sm text-[11px] font-bold">
                  DRM SECURE V3.4
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-title-md text-xs font-bold text-on-surface">
                    Tệp Ebook Chính (Master File) <span className="text-primary">*</span>
                  </label>
                  <span className="font-body-sm text-[11px] text-on-surface-variant">Hỗ trợ EPUB 3.0, PDF mã hóa DRM</span>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-low/70 border border-primary/25 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-title-md text-sm font-bold text-on-surface">Atomic-Habits-Vietnamese-Edition.pdf</span>
                          <span className="px-2 py-0.5 rounded-full bg-primary text-white font-label-sm text-[10px] font-bold">DRM Ready</span>
                        </div>
                        <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                          Dung lượng: <strong>48.2 MB</strong> · Định dạng: <strong>PDF DRM Ready</strong> · Tải lên: <strong>Hôm nay, 10:32</strong>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-primary font-title-md text-xs font-bold bg-surface-container-lowest px-2.5 py-1 rounded-lg border border-primary/20 shadow-2xs">
                      <span className="material-symbols-outlined text-sm">verified</span>
                      <span>Sẵn Sàng</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-theme-border/60">
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-theme-border hover:bg-surface-container font-body-sm text-xs font-semibold text-on-surface flex items-center gap-1.5 shadow-2xs cursor-pointer" type="button">
                        <span className="material-symbols-outlined text-sm text-primary">chrome_reader_mode</span>
                        <span>Xem Trước Reader</span>
                      </button>
                      <button className="px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-theme-border hover:bg-surface-container font-body-sm text-xs text-on-surface flex items-center gap-1.5 shadow-2xs cursor-pointer" type="button">
                        <span className="material-symbols-outlined text-sm text-on-surface-variant">sync</span>
                        <span>Thay Tệp Khác</span>
                      </button>
                    </div>
                    <button className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-body-sm text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer" type="button">
                      <span className="material-symbols-outlined text-sm">fingerprint</span>
                      <span>Kiểm Tra DRM & Watermark</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-theme-border bg-surface-container-lowest space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-title-md text-xs font-bold text-on-surface block">Nội Dung Đọc Thử / Xem Trước (Sample Preview)</span>
                    <p className="font-body-sm text-xs text-on-surface-variant">Khuyến khích bạn đọc trải nghiệm trước khi thanh toán</p>
                  </div>

                  <button 
                    type="button"
                    onClick={() => setSampleEnabled(!sampleEnabled)}
                    className={`w-12 h-6 rounded-full relative p-0.5 transition-colors cursor-pointer ${sampleEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${sampleEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
                <div className="pt-2 flex items-center gap-4 text-body-sm text-on-surface">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input defaultChecked className="text-primary focus:ring-primary" name="sample_rule" type="radio" />
                    <span>Tự động trích xuất 30 trang đầu tiên từ tệp chính (10% nội dung)</span>
                  </label>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-surface-container-low/70 border border-theme-border/60 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl flex-shrink-0 mt-0.5">shield</span>
                <div className="space-y-1">
                  <span className="font-title-md text-xs font-bold text-on-surface">Quyền Truy Cập Độc Quyền &amp; Chống Sao Chép</span>
                  <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                    Khách hàng mua sách sẽ được cấp quyền đọc vĩnh viễn trên ứng dụng HUKI Reader. Hệ thống DRM độc quyền tự động chèn chữ ký số mờ (dynamic forensic watermarking) gồm ID người dùng, email và thời gian đọc trên từng trang.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 6: Cam Kết Bản Quyền */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-4" id="section-rights">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">6</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Cam Kết Bản Quyền &amp; Giấy Phép Phân Phối Số</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Xác nhận tư cách pháp lý của gian hàng đối với tác phẩm này.</p>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-200">Cần xác nhận</span>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-theme-border/70 hover:bg-surface-container-low cursor-pointer transition-colors">
                  <input defaultChecked className="mt-1 text-primary focus:ring-0" type="checkbox" />
                  <span className="text-xs text-on-surface leading-relaxed">
                    Gian hàng <strong>Alpha Books Official</strong> cam kết sở hữu hợp đồng bản quyền phân phối điện tử hợp pháp từ tác giả/đơn vị chủ quản tác phẩm <strong>Atomic Habits</strong> tại thị trường Việt Nam.
                  </span>
                </label>
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-theme-border/70 hover:bg-surface-container-low cursor-pointer transition-colors">
                  <input defaultChecked className="mt-1 text-primary focus:ring-0" type="checkbox" />
                  <span className="text-xs text-on-surface leading-relaxed">
                    Đồng ý để HUKI Reader áp dụng công nghệ DRM chống sao chép và tự động quản lý phân phối số cho người mua.
                  </span>
                </label>
              </div>
            </section>

            {/* Section 7: Xuất Bản */}
            <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-7 border border-theme-border/70 shadow-xs space-y-4" id="section-publish">
              <div className="flex items-center justify-between border-b border-theme-border/60 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">7</span>
                  <div>
                    <h2 className="font-headline-sm text-base font-bold text-on-surface">Xuất Bản &amp; Mở Bán</h2>
                    <p className="font-body-sm text-xs text-on-surface-variant">Quy tắc mở khóa ấn bản điện tử tới độc giả.</p>
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
                    name="publish_mode_ebook" 
                    type="radio" 
                  />
                  <div>
                    <span className="block text-xs font-bold text-on-surface">Tự động phát hành Ebook ngay sau khi phê duyệt</span>
                    <span className="block text-[11px] text-on-surface-variant mt-0.5">Sách sẽ mở bán tức thì trên HUKI Reader Store sau khi biên tập viên thông qua DRM.</span>
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
                    name="publish_mode_ebook" 
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
          <aside className="col-span-12 lg:col-span-3 sticky top-20 space-y-5">

            {/* Preview Card */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-theme-border/70 shadow-xs">
              <div className="flex items-center justify-between mb-3.5">
                <span className="font-label-sm text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">XEM TRƯỚC EBOOK</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 font-label-sm text-[10px] text-primary font-bold border border-primary/20">DRM READY</span>
              </div>
              <div className="flex gap-3.5 items-start">
                <div className="w-20 sm:w-22 aspect-[3/4] rounded-xl overflow-hidden shadow-md border border-theme-border shrink-0 relative bg-surface-container">
                  <img className="w-full h-full object-cover" alt="Atomic Habits Ebook" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDOYh4ba1idBkiR2I8t0pbdA5FVcmBvHkOWsn-6ihQAw4v36GBdi9qZb-Ef2l9Q7pwf8U5b-YhC_MHz4uICBBj1fVy10mzaI1UWVXqpQY8u2Pt0bsfSl7mZtxUx2jwedu3VpfRL-dHGtqxlrkAAJCUYiX9sL3DilKi9JH38UBhTg7gbdhOvQ49VfEsuXjVZSGFMhjkdSxAVpWEetgSSRzLHqYif101iDoUn8nRyClOOEC8cuhL8j3JLag" />
                </div>
                <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                  <div>
                    <span className="inline-block font-label-sm text-[9px] px-2 py-0.5 rounded bg-primary text-white font-bold uppercase mb-1">Ebook DRM</span>
                    <h4 className="font-title-md text-xs font-bold text-on-surface truncate">Atomic Habits</h4>
                    <p className="font-body-sm text-[11px] text-on-surface-variant truncate">James Clear</p>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="font-bold text-sm text-primary">79.000 ₫</span>
                    <span className="text-[10px] line-through text-on-surface-variant">149.000 ₫</span>
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
                <span className="font-title-md text-xs font-bold text-primary">85%</span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: '85%' }}></div>
              </div>
              <p className="text-[11px] text-emerald-800 font-medium flex items-center gap-1.5 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                <span className="material-symbols-outlined text-sm text-emerald-700">task_alt</span>
                <span>Tệp DRM đã hợp lệ &amp; sẵn sàng xuất bản.</span>
              </p>
            </div>

            {/* Checklist */}
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-theme-border/70 shadow-xs space-y-3">
              <h4 className="font-label-sm text-[11px] uppercase font-bold text-on-surface-variant tracking-wider">
                CHECKLIST EBOOK DRM
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  <span>Thông tin bản quyền &amp; eISBN</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  <span>Tệp PDF/EPUB mã hóa DRM</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  <span>Ảnh bìa 3:4 Hi-Res</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  <span>Trích xuất đọc thử (Sample)</span>
                </div>
                <div className="flex items-center gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  <span>Cam kết sở hữu trí tuệ</span>
                </div>
              </div>
            </div>

            {/* Support widget */}
            <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-theme-border/60 space-y-2">
              <div className="flex items-center gap-2 text-on-surface font-bold text-xs">
                <span className="material-symbols-outlined text-primary text-base">verified_user</span>
                <span>Hỗ trợ Kỹ thuật DRM</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Cần trợ giúp chuyển đổi định dạng EPUB 3.0 hoặc mã hóa bảo mật?
              </p>
              <div className="pt-1">
                <Link className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline" to="/">
                  <span className="material-symbols-outlined text-sm">call</span>
                  <span>Hotline DRM: 1900 8866</span>
                </Link>
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
            <span>GỬI DUYỆT EBOOK</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
