/**
 * SEO Head Component
 * Client-side component for adding SEO elements to pages
 */

'use client';

import React, { useEffect, useState } from 'react';
import Head from 'next/head';

interface SEOScriptProps {
  schema: object | object[];
  id?: string;
}

interface SEOMetaProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  canonical?: string;
  noIndex?: boolean;
}

const SITE_NAME = 'HUKI EBOOK';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hukiebook.vn';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

/**
 * JSON-LD Schema Script Component
 */
export function SchemaScript({ schema, id = 'json-ld-schema' }: SEOScriptProps) {
  const schemas = Array.isArray(schema) ? schema : [schema];

  return (
    <>
      {schemas.map((s, index) => (
        <script
          key={`${id}-${index}`}
          id={`${id}-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}
    </>
  );
}

/**
 * SEO Meta Tags Component
 */
export function SEOMeta({
  title,
  description,
  keywords,
  ogImage,
  canonical,
  noIndex = false,
}: SEOMetaProps) {
  const fullTitle = title?.includes(SITE_NAME) ? title : `${title || SITE_NAME} | ${SITE_NAME}`;
  const ogImageUrl = ogImage || DEFAULT_OG_IMAGE;

  return (
    <Head>
      {title && <title>{fullTitle}</title>}
      {description && <meta name="description" content={description} />}
      {keywords && keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || ''} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical || SITE_URL} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="vi_VN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || ''} />
      <meta name="twitter:image" content={ogImageUrl} />
      <meta name="twitter:site" content="@hukiebook" />
      <meta name="twitter:creator" content="@hukiebook" />

      {/* Robots */}
      {noIndex && (
        <>
          <meta name="robots" content="noindex, nofollow" />
          <meta name="googlebot" content="noindex, nofollow" />
        </>
      )}
    </Head>
  );
}

/**
 * Breadcrumb JSON-LD Component
 */
export function BreadcrumbSchema({ items }: { items: Array<{ name: string; url: string }> }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };

  return <SchemaScript schema={schema} id="breadcrumb" />;
}

/**
 * Book Schema Component
 */
export function BookSchema(book: {
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
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    '@id': `${SITE_URL}/books/${book.slug}`,
    name: book.title,
    description: book.description?.slice(0, 160) || book.title,
    url: `${SITE_URL}/books/${book.slug}`,
    image: book.coverUrl || DEFAULT_OG_IMAGE,
    ...(book.isbn && { isbn: book.isbn }),
    author: book.author ? {
      '@type': 'Person',
      name: book.author,
    } : undefined,
    publisher: book.publisher ? {
      '@type': 'Organization',
      name: book.publisher,
    } : undefined,
    ...(book.publishDate && { datePublished: book.publishDate }),
    ...(book.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: book.rating,
        reviewCount: book.reviewCount || 0,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    offers: {
      '@type': 'Offer',
      price: book.price || 0,
      priceCurrency: 'VND',
      availability: 'https://schema.org/InStock',
    },
  };

  return <SchemaScript schema={schema} id="book" />;
}

/**
 * Store Schema Component
 */
export function StoreSchema(store: {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  rating?: number;
  reviewCount?: number;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${SITE_URL}/stores/${store.slug}`,
    name: store.name,
    description: store.description?.slice(0, 160) || store.name,
    url: `${SITE_URL}/stores/${store.slug}`,
    image: store.banner || store.logo,
    ...(store.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: store.rating,
        reviewCount: store.reviewCount || 0,
      },
    }),
  };

  return <SchemaScript schema={schema} id="store" />;
}

/**
 * FAQ Schema Component
 */
export function FAQSchema({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return <SchemaScript schema={schema} id="faq" />;
}

/**
 * Organization Schema Component
 */
export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [
      'https://facebook.com/hukiebook',
      'https://instagram.com/hukiebook',
      'https://youtube.com/hukiebook',
    ],
  };

  return <SchemaScript schema={schema} id="organization" />;
}

/**
 * WebSite Schema Component (for Sitelinks Search Box)
 */
export function WebsiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: 'Nền tảng sách thật và Ebook bản quyền HUKI',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return <SchemaScript schema={schema} id="website" />;
}
