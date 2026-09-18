"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { catalogApi } from '@/ui/api/catalogApi';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  children?: Category[];
}

export default function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const res = await catalogApi.getCategories();
        if (res.success && res.data) {
          setCategories(res.data.slice(0, 8)); // Take first 8 categories
        }
      } catch (err) {
        setError('Không thể tải danh mục');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Default categories if API fails
  const defaultCategories = [
    { id: '1', name: 'Văn học', slug: 'van-hoc', icon: 'auto_stories' },
    { id: '2', name: 'Kinh tế', slug: 'kinh-te', icon: 'trending_up' },
    { id: '3', name: 'Kỹ năng sống', slug: 'ky-nang', icon: 'psychology' },
    { id: '4', name: 'Thiếu nhi', slug: 'thieu-nhi', icon: 'child_care' },
    { id: '5', name: 'Công nghệ', slug: 'cong-nghe', icon: 'smart_toy' },
    { id: '6', name: 'Ngoại ngữ', slug: 'ngoai-ngu', icon: 'translate' },
    { id: '7', name: 'Sách nói', slug: 'sach-noi', icon: 'headphones' },
    { id: '8', name: 'Ebook DRM', slug: 'ebook', icon: 'devices' },
  ];

  const displayCategories = categories.length > 0 ? categories : defaultCategories;

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center animate-pulse">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-200 mb-2" />
            <div className="h-3 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 sm:gap-4">
      {displayCategories.map((cat, i) => (
        <Link
          key={cat.id || i}
          href={`/books?category=${cat.slug}`}
          className="flex flex-col items-center text-center group cursor-pointer"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-emerald-100/80 p-0.5 shadow-xs group-hover:scale-110 group-hover:border-emerald-600 group-hover:shadow-md transition-all mb-2 bg-[#FAF8F5]">
            <div className="w-full h-full rounded-full bg-emerald-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-emerald-600">
                {cat.icon || 'menu_book'}
              </span>
            </div>
          </div>
          <span className="text-[11.5px] sm:text-xs font-semibold text-gray-800 group-hover:text-[#003B2B] transition-colors leading-tight">
            {cat.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
