import React, { useState, useEffect, useCallback } from 'react';
import { catalogApi } from '../../api/catalogApi';
import { useToast } from '../../context/ToastContext';

export default function AdminCategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('CATEGORIES');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, authRes, pubRes] = await Promise.allSettled([
        catalogApi.getCategories(),
        catalogApi.getAuthors(),
        catalogApi.getPublishers(),
      ]);

      if (catRes.status === 'fulfilled' && catRes.value.success && Array.isArray(catRes.value.data)) {
        setCategories(catRes.value.data);
      } else {
        setCategories([]);
      }

      if (authRes.status === 'fulfilled' && authRes.value.success && Array.isArray(authRes.value.data)) {
        setAuthors(authRes.value.data);
      } else {
        setAuthors([]);
      }

      if (pubRes.status === 'fulfilled' && pubRes.value.success && Array.isArray(pubRes.value.data)) {
        setPublishers(pubRes.value.data);
      } else {
        setPublishers([]);
      }
    } catch (err) {
      console.warn('Lỗi khi tải dữ liệu phân loại:', err);
      showToast({
        title: 'Lỗi tải dữ liệu',
        message: 'Không thể tải danh mục và tác giả từ hệ thống.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredCategories = categories.filter((c) => {
    if (!searchQuery.trim()) return true;
    return c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.slug?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredAuthors = authors.filter((a) => {
    if (!searchQuery.trim()) return true;
    return a.name?.toLowerCase().includes(searchQuery.toLowerCase()) || a.slug?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredPublishers = publishers.filter((p) => {
    if (!searchQuery.trim()) return true;
    return p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.slug?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
              QUẢN TRỊ TAXONOMY
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500 font-medium">Cây danh mục, Tác giả &amp; Nhà xuất bản</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1 font-editorial">
            Danh Mục &amp; Tác Giả Toàn Sàn
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Quản lý cấu trúc thể loại sách, danh sách tác giả uy tín và đơn vị nhà xuất bản trên sàn HUKI.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin text-emerald-600' : 'text-gray-500'}`}>
            refresh
          </span>
          <span>Làm mới</span>
        </button>
      </div>

      {/* 2. TABS & SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-1">
          {[
            { key: 'CATEGORIES', label: 'Cây Danh Mục Thể Loại', count: categories.length, icon: 'category' },
            { key: 'AUTHORS', label: 'Tác Giả', count: authors.length, icon: 'person' },
            { key: 'PUBLISHERS', label: 'Nhà Xuất Bản', count: publishers.length, icon: 'apartment' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-[#00875A] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên thể loại, tác giả, NXB..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 3. CONTENT CONTAINER */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs">
        {loading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-gray-400">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <span className="text-xs font-semibold">Đang tải dữ liệu phân loại...</span>
          </div>
        ) : activeTab === 'CATEGORIES' ? (
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">DANH MỤC THỂ LOẠI TOÀN SÀN</h2>
              <span className="text-xs text-gray-400">{filteredCategories.length} danh mục</span>
            </div>

            {filteredCategories.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">Không tìm thấy danh mục nào.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCategories.map((cat) => (
                  <div key={cat.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-purple-300 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900">{cat.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                          Active
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">Đường dẫn: /{cat.slug}</p>
                      {cat.description && (
                        <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">{cat.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'AUTHORS' ? (
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">DANH SÁCH TÁC GIẢ</h2>
              <span className="text-xs text-gray-400">{filteredAuthors.length} tác giả</span>
            </div>

            {filteredAuthors.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">Không tìm thấy tác giả nào.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredAuthors.map((auth) => (
                  <div key={auth.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                      {auth.name ? auth.name.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-gray-900 block truncate">{auth.name}</span>
                      <span className="text-[11px] text-gray-400 block truncate">Slug: /{auth.slug || 'n-a'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">DANH SÁCH NHÀ XUẤT BẢN</h2>
              <span className="text-xs text-gray-400">{filteredPublishers.length} NXB</span>
            </div>

            {filteredPublishers.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">Không tìm thấy nhà xuất bản nào.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredPublishers.map((pub) => (
                  <div key={pub.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                      {pub.name ? pub.name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-gray-900 block truncate">{pub.name}</span>
                      <span className="text-[11px] text-gray-400 block truncate">Slug: /{pub.slug || 'n-a'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
