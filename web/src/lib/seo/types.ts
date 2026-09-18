/**
 * SEO Types
 */

export interface Book {
  id?: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  teaser?: string;
  author: Author | string;
  publisher?: string;
  isbn?: string;
  edition?: string;
  pages?: number;
  publishDate?: string;
  coverUrl?: string;
  gallery?: string[];
  price: number;
  originalPrice?: number;
  type?: 'physical' | 'digital' | 'hybrid';
  category?: string;
  tags?: string[];
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
  storeId?: string;
  storeName?: string;
  storeSlug?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
}

export interface Store {
  id?: string;
  slug: string;
  name: string;
  description?: string;
  logo?: string;
  banner?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: string;
  priceRange?: string;
  rating?: number;
  reviewCount?: number;
  socialLinks?: string[];
  productCount?: number;
}

export interface Author {
  id?: string;
  name: string;
  bio?: string;
  image?: string;
  url?: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  parentId?: string;
  children?: Category[];
  productCount?: number;
}

export interface Article {
  id?: string;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  author?: Author | string;
  publishedAt?: string;
  updatedAt?: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
}

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'book' | 'product';
  noIndex?: boolean;
  noFollow?: boolean;
  structuredData?: object | object[];
}

export interface SitemapEntry {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export const DEFAULT_SEO_CONFIG = {
  siteName: 'HUKI EBOOK',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://hukiebook.vn',
  siteLogo: '/logo.png',
  defaultImage: '/og-default.jpg',
};

