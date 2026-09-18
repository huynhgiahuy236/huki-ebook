/**
 * Dynamic Sitemap Generator
 * Generates sitemap.xml for HUKI EBOOK
 */

import { MetadataRoute } from 'next';
import { DEFAULT_SEO_CONFIG } from './types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SEO_CONFIG.siteUrl;

interface SitemapEntry {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/**
 * Static pages for sitemap
 */
const STATIC_PAGES: SitemapEntry[] = [
  {
    url: SITE_URL,
    changeFrequency: 'daily',
    priority: 1.0,
  },
  {
    url: `${SITE_URL}/books`,
    changeFrequency: 'daily',
    priority: 0.9,
  },
  {
    url: `${SITE_URL}/stores`,
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    url: `${SITE_URL}/search`,
    changeFrequency: 'weekly',
    priority: 0.7,
  },
  {
    url: `${SITE_URL}/about`,
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    url: `${SITE_URL}/contact`,
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    url: `${SITE_URL}/faq`,
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    url: `${SITE_URL}/terms`,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    url: `${SITE_URL}/privacy`,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
];

/**
 * Category pages for sitemap
 */
const CATEGORY_PAGES: SitemapEntry[] = [
  { url: `${SITE_URL}/categories/kinh-te`, priority: 0.8, changeFrequency: 'weekly' },
  { url: `${SITE_URL}/categories/van-hoc`, priority: 0.8, changeFrequency: 'weekly' },
  { url: `${SITE_URL}/categories/ky-nang-song`, priority: 0.8, changeFrequency: 'weekly' },
  { url: `${SITE_URL}/categories/tre-em`, priority: 0.7, changeFrequency: 'weekly' },
  { url: `${SITE_URL}/categories/cong-nghe`, priority: 0.7, changeFrequency: 'weekly' },
  { url: `${SITE_URL}/categories/tieu-thuyet`, priority: 0.7, changeFrequency: 'weekly' },
];

/**
 * Generate sitemap for Next.js
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [...STATIC_PAGES, ...CATEGORY_PAGES];
}

/**
 * API Route to fetch dynamic sitemap entries
 * This should be called from getServerSideProps or similar
 */
export async function fetchSitemapData() {
  try {
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

    const [booksRes, storesRes, categoriesRes] = await Promise.all([
      fetch(`${apiUrl}/books?limit=1000&status=PUBLISHED`).then(r => r.json()).catch(() => null),
      fetch(`${apiUrl}/stores?limit=500&status=ACTIVE`).then(r => r.json()).catch(() => null),
      fetch(`${apiUrl}/categories`).then(r => r.json()).catch(() => null),
    ]);

    const dynamicEntries: SitemapEntry[] = [];

    // Add books
    if (booksRes?.data?.items) {
      dynamicEntries.push(
        ...booksRes.data.items.map((book: { slug: string; updatedAt?: string }) => ({
          url: `${SITE_URL}/books/${book.slug}`,
          lastModified: book.updatedAt ? new Date(book.updatedAt) : undefined,
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }))
      );
    }

    // Add stores
    if (storesRes?.data?.items) {
      dynamicEntries.push(
        ...storesRes.data.items.map((store: { slug: string; updatedAt?: string }) => ({
          url: `${SITE_URL}/stores/${store.slug}`,
          lastModified: store.updatedAt ? new Date(store.updatedAt) : undefined,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }))
      );
    }

    // Add categories
    if (categoriesRes?.data) {
      const categories = Array.isArray(categoriesRes.data) ? categoriesRes.data : categoriesRes.data.items || [];
      dynamicEntries.push(
        ...categories.map((cat: { slug: string }) => ({
          url: `${SITE_URL}/categories/${cat.slug}`,
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }))
      );
    }

    return {
      static: STATIC_PAGES,
      categories: CATEGORY_PAGES,
      dynamic: dynamicEntries,
      all: [...STATIC_PAGES, ...CATEGORY_PAGES, ...dynamicEntries],
    };
  } catch (error) {
    console.error('Failed to fetch sitemap data:', error);
    return {
      static: STATIC_PAGES,
      categories: CATEGORY_PAGES,
      dynamic: [],
      all: [...STATIC_PAGES, ...CATEGORY_PAGES],
    };
  }
}

/**
 * Generate robots.txt content
 */
export function generateRobotsTxt(): string {
  const sitemapUrl = `${SITE_URL}/sitemap.xml`;

  return `# Robots.txt for HUKI EBOOK
# https://hukiebook.vn

User-agent: *
Allow: /

# Disallow admin and internal pages
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /auth/
Disallow: /seller/dashboard/settings

# Allow crawling of public pages
Allow: /books/
Allow: /stores/
Allow: /categories/
Allow: /search

# Sitemap
Sitemap: ${sitemapUrl}

# Crawl delay (optional, be nice to small sites)
Crawl-delay: 1

# User-agent specific rules
User-agent: Googlebot
Allow: /
Crawl-delay: 0.5

User-agent: Bingbot
Allow: /
Crawl-delay: 1

User-agent: Slurp
Allow: /
Crawl-delay: 1

User-agent: DuckDuckBot
Allow: /
Crawl-delay: 1

# Block bad bots
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MJ12bot
Disallow: /
`;
}
