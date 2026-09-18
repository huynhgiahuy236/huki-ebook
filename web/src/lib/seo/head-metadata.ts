/**
 * SEO Head Metadata Component
 * Provides complete SEO metadata for pages
 */

import { Metadata } from 'next';
import { Book, Store, SEOProps, DEFAULT_SEO_CONFIG } from './types';

export interface PageSEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: 'website' | 'article' | 'book';
  canonical?: string;
  noIndex?: boolean;
  noFollow?: boolean;
}

/**
 * Generate base metadata for a page
 */
export function generatePageMetadata(config: PageSEOConfig): Metadata {
  const siteName = DEFAULT_SEO_CONFIG.siteName;
  const siteUrl = DEFAULT_SEO_CONFIG.siteUrl;

  const fullTitle = config.title.includes(siteName)
    ? config.title
    : `${config.title} | ${siteName}`;

  const metadata: Metadata = {
    title: fullTitle,
    description: config.description,
    keywords: config.keywords?.join(', '),
    alternates: {
      canonical: config.canonical || undefined,
    },
    robots: {
      index: config.noIndex ? false : true,
      follow: config.noFollow ? false : true,
      googleBot: {
        index: config.noIndex ? false : true,
        follow: config.noFollow ? false : true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: config.ogType || 'website',
      siteName,
      title: fullTitle,
      description: config.description,
      url: config.canonical || siteUrl,
      images: config.ogImage ? [
        {
          url: config.ogImage,
          width: 1200,
          height: 630,
          alt: config.title,
        },
      ] : [
        {
          url: `${siteUrl}/og-default.jpg`,
          width: 1200,
          height: 630,
          alt: siteName,
        },
      ],
      locale: 'vi_VN',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: config.description,
      images: config.ogImage ? [config.ogImage] : [`${siteUrl}/og-default.jpg`],
      site: '@hukiebook',
      creator: '@hukiebook',
    },
  };

  return metadata;
}

/**
 * Generate metadata for Book pages
 */
export function generateBookMetadata(book: Book): Metadata {
  const siteUrl = DEFAULT_SEO_CONFIG.siteUrl;
  const bookUrl = `${siteUrl}/books/${book.slug}`;

  const authorName = typeof book.author === 'string' ? book.author : book.author?.name || '';
  const fullTitle = `${book.title}${authorName ? ` - ${authorName}` : ''}`;
  const description = truncateDescription(book.description || book.teaser);

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords: [
      book.title,
      authorName,
      book.publisher,
      book.category,
      ...(book.tags || []),
    ].filter(Boolean).join(', '),
    authors: authorName ? [{ name: authorName }] : undefined,
    alternates: {
      canonical: bookUrl,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'book',
      url: bookUrl,
      title: fullTitle,
      description,
      siteName: DEFAULT_SEO_CONFIG.siteName,
      images: book.coverUrl ? [
        {
          url: book.coverUrl,
          width: 800,
          height: 1200,
          alt: book.title,
        },
      ] : undefined,
      locale: 'vi_VN',
      authors: authorName ? [authorName] : undefined,
      isbn: book.isbn,
      releaseDate: book.publishDate,
      tags: book.tags,
    } as any,
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: book.coverUrl ? [book.coverUrl] : undefined,
    },
  };

  return metadata;
}

/**
 * Generate metadata for Store pages
 */
export function generateStoreMetadata(store: Store): Metadata {
  const siteUrl = DEFAULT_SEO_CONFIG.siteUrl;
  const storeUrl = `${siteUrl}/stores/${store.slug}`;

  const description = truncateDescription(store.description);

  return {
    title: `${store.name} | ${DEFAULT_SEO_CONFIG.siteName}`,
    description,
    keywords: [store.name, 'gian hàng', 'nhà sách', 'sách bản quyền'].join(', '),
    alternates: {
      canonical: storeUrl,
    },
    openGraph: {
      type: 'website',
      url: storeUrl,
      title: store.name,
      description,
      siteName: DEFAULT_SEO_CONFIG.siteName,
      images: store.banner || store.logo ? [
        {
          url: store.banner || store.logo!,
          width: 1200,
          height: 630,
          alt: store.name,
        },
      ] : undefined,
      locale: 'vi_VN',
    },
  };
}

/**
 * Generate metadata for Category pages
 */
export function generateCategoryMetadata(category: { name: string; slug: string; description?: string; productCount?: number }): Metadata {
  const siteUrl = DEFAULT_SEO_CONFIG.siteUrl;
  const categoryUrl = `${siteUrl}/categories/${category.slug}`;

  const title = category.productCount
    ? `${category.name} (${category.productCount} sách) | ${DEFAULT_SEO_CONFIG.siteName}`
    : `${category.name} | ${DEFAULT_SEO_CONFIG.siteName}`;
  const description = category.description || `Khám phá bộ sưu tập ${category.name} chất lượng cao tại ${DEFAULT_SEO_CONFIG.siteName}`;

  return {
    title,
    description,
    keywords: [category.name, 'sách', 'ebook', 'nhà xuất bản'].join(', '),
    alternates: {
      canonical: categoryUrl,
    },
    openGraph: {
      type: 'website',
      url: categoryUrl,
      title,
      description,
      siteName: DEFAULT_SEO_CONFIG.siteName,
      locale: 'vi_VN',
    },
  };
}

/**
 * Generate metadata for Search results page
 */
export function generateSearchMetadata(query: string, resultCount?: number): Metadata {
  const siteUrl = DEFAULT_SEO_CONFIG.siteUrl;
  const searchUrl = `${siteUrl}/search?q=${encodeURIComponent(query)}`;

  const title = resultCount !== undefined
    ? `Tìm kiếm "${query}" (${resultCount} kết quả) | ${DEFAULT_SEO_CONFIG.siteName}`
    : `Tìm kiếm "${query}" | ${DEFAULT_SEO_CONFIG.siteName}`;
  const description = `Kết quả tìm kiếm cho "${query}" trên ${DEFAULT_SEO_CONFIG.siteName}. Tìm thấy ${resultCount || 0} sách và ebook.`;

  return {
    title,
    description,
    robots: {
      index: false,
      follow: true,
    },
    alternates: {
      canonical: searchUrl,
    },
    openGraph: {
      type: 'website',
      url: searchUrl,
      title,
      description,
      siteName: DEFAULT_SEO_CONFIG.siteName,
      locale: 'vi_VN',
    },
  };
}

/**
 * Truncate description helper
 */
function truncateDescription(text?: string, fallback?: string, maxLength = 160) {
  const source = text || fallback || '';
  if (source.length <= maxLength) return source;
  return source.slice(0, maxLength - 3) + '...';
}
