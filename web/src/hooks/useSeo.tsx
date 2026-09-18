/**
 * SEO Hooks for React Components
 */

'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BookSchema, StoreSchema, FAQSchema, BreadcrumbSchema, SchemaScript, WebsiteSchema, OrganizationSchema } from '../components/seo/SEOTags';

/**
 * Hook for book page SEO
 */
export function useBookSEO(book: {
  title: string;
  slug: string;
  description?: string;
  author?: string;
  publisher?: string;
  isbn?: string;
  coverUrl?: string;
  price?: number;
  rating?: number;
  reviewCount?: number;
  publishDate?: string;
}) {
  return {
    schema: <BookSchema {...book} />,
  };
}

/**
 * Hook for store page SEO
 */
export function useStoreSEO(store: {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  rating?: number;
  reviewCount?: number;
}) {
  return {
    schema: <StoreSchema {...store} />,
  };
}

/**
 * Hook for FAQ page SEO
 */
export function useFAQSEO(faqs: Array<{ question: string; answer: string }>) {
  return {
    schema: <FAQSchema faqs={faqs} />,
  };
}

/**
 * Hook for breadcrumb SEO
 */
export function useBreadcrumbSEO(items: Array<{ name: string; url: string }>) {
  return {
    schema: <BreadcrumbSchema items={items} />,
  };
}

/**
 * Hook for global SEO (Website + Organization)
 */
export function useGlobalSEO() {
  return {
    schemas: (
      <>
        <WebsiteSchema />
        <OrganizationSchema />
      </>
    ),
  };
}

/**
 * Hook for SEO with dynamic title/description
 */
export function useDynamicSEO() {
  const updateURL = useCallback((title: string, url?: string) => {
    if (typeof window === 'undefined') return;

    // Update browser title
    document.title = `${title} | HUKI EBOOK`;

    // Update meta tags
    const metaDesc = document.querySelector('meta[name="description"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');

    if (ogTitle) ogTitle.setAttribute('content', `${title} | HUKI EBOOK`);
    if (twitterTitle) twitterTitle.setAttribute('content', `${title} | HUKI EBOOK`);
  }, []);

  return { updateURL };
}

/**
 * Hook to track SEO performance
 */
export function useSEOPerformance() {
  const trackView = useCallback((pageType: string, pageSlug?: string) => {
    // Track pageview in analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_type: pageType,
        page_slug: pageSlug,
      });
    }
  }, []);

  const trackClick = useCallback((element: string, target?: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'seo_interaction', {
        event_category: 'click',
        event_label: element,
        target_url: target,
      });
    }
  }, []);

  return { trackView, trackClick };
}

/**
 * Open Graph Image Generator
 * Returns OG image URL with dynamic content
 */
export function useOGImage() {
  const generateOGImageUrl = useCallback((params: {
    title?: string;
    author?: string;
    price?: number;
    coverUrl?: string;
  }) => {
    const baseUrl = process.env.NEXT_PUBLIC_OG_IMAGE_URL || '/api/og';
    const searchParams = new URLSearchParams();

    if (params.title) searchParams.set('title', params.title);
    if (params.author) searchParams.set('author', params.author);
    if (params.price) searchParams.set('price', params.price.toString());
    if (params.coverUrl) searchParams.set('cover', params.coverUrl);

    return `${baseUrl}?${searchParams.toString()}`;
  }, []);

  return { generateOGImageUrl };
}
