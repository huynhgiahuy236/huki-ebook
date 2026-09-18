import { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hukiebook.vn';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/books`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/stores`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ];

  // Categories
  const categories = [
    { slug: 'kinh-te', priority: 0.8 },
    { slug: 'van-hoc', priority: 0.8 },
    { slug: 'ky-nang-song', priority: 0.8 },
    { slug: 'tre-em', priority: 0.7 },
    { slug: 'cong-nghe', priority: 0.7 },
    { slug: 'tieu-thuyet', priority: 0.7 },
    { slug: 'truyen-ngan', priority: 0.7 },
    { slug: 'self-help', priority: 0.7 },
    { slug: 'tam-ly', priority: 0.7 },
    { slug: 'lich-su', priority: 0.7 },
  ];

  const categoryPages = categories.map(cat => ({
    url: `${baseUrl}/categories/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: cat.priority,
  }));

  // Fetch dynamic pages (books, stores) from API
  try {
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

    const [booksRes, storesRes] = await Promise.all([
      fetch(`${apiUrl}/books?limit=1000&status=PUBLISHED`, {
        next: { revalidate: 3600 } // Cache for 1 hour
      }).catch(() => null),
      fetch(`${apiUrl}/stores?limit=500&status=ACTIVE`, {
        next: { revalidate: 3600 }
      }).catch(() => null),
    ]);

    const dynamicPages: MetadataRoute.Sitemap = [];

    // Add published books
    if (booksRes?.ok) {
      const booksData = await booksRes.json().catch(() => null);
      if (booksData?.data?.items) {
        dynamicPages.push(
          ...booksData.data.items.map((book: { slug: string; updatedAt?: string }) => ({
            url: `${baseUrl}/books/${book.slug}`,
            lastModified: book.updatedAt ? new Date(book.updatedAt) : new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
          }))
        );
      }
    }

    // Add active stores
    if (storesRes?.ok) {
      const storesData = await storesRes.json().catch(() => null);
      if (storesData?.data?.items) {
        dynamicPages.push(
          ...storesData.data.items.map((store: { slug: string; updatedAt?: string }) => ({
            url: `${baseUrl}/stores/${store.slug}`,
            lastModified: store.updatedAt ? new Date(store.updatedAt) : new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
          }))
        );
      }
    }

    return [...staticPages, ...categoryPages, ...dynamicPages];
  } catch (error) {
    console.error('Failed to fetch sitemap data:', error);
    // Return static pages only on error
    return [...staticPages, ...categoryPages];
  }
}
