/**
 * SEO Schema Generator
 * Generates JSON-LD structured data for HUKI EBOOK
 */

import { Book, Store, Author, DEFAULT_SEO_CONFIG } from './types';
export { DEFAULT_SEO_CONFIG };

export interface SchemaConfig {
  siteName: string;
  siteUrl: string;
  siteLogo: string;
  defaultImage: string;
}

/**
 * Generate Book JSON-LD Schema
 * https://schema.org/Book
 */
export function generateBookSchema(book: Book, config: SchemaConfig) {
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    '@id': `${config.siteUrl}/books/${book.slug}`,
    name: book.title,
    description: truncateDescription(book.description || book.teaser),
    url: `${config.siteUrl}/books/${book.slug}`,
    image: book.coverUrl || config.defaultImage,
    isbn: book.isbn,
    bookEdition: book.edition,
    bookFormat: getBookFormat(book.type),
    numberOfPages: book.pages,
    author: generateAuthorSchema(book.author),
    publisher: {
      '@type': 'Organization',
      name: book.publisher || 'HUKI EBOOK',
      url: config.siteUrl,
    },
    aggregateRating: book.rating ? {
      '@type': 'AggregateRating',
      ratingValue: book.rating,
      reviewCount: book.reviewCount || 0,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
    offers: {
      '@type': 'Offer',
      url: `${config.siteUrl}/books/${book.slug}`,
      priceCurrency: 'VND',
      price: book.price,
      availability: book.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: book.storeName || 'HUKI EBOOK',
      },
    },
  };

  // Add genre/category
  if (book.category) {
    schema.genre = book.category;
  }

  // Add datePublished
  if (book.publishDate) {
    schema.datePublished = book.publishDate;
  }

  // Add dimensions for physical books
  if (book.weight || book.dimensions) {
    schema.additionalProperty = [];
    if (book.weight) {
      schema.additionalProperty.push({
        '@type': 'QuantitativeValue',
        name: 'weight',
        value: book.weight,
        unitCode: 'GRM',
      });
    }
    if (book.dimensions) {
      schema.additionalProperty.push({
        '@type': 'QuantitativeValue',
        name: 'dimensions',
        value: `${book.dimensions.length}x${book.dimensions.width}x${book.dimensions.height}`,
        unitCode: 'CMT',
      });
    }
  }

  // Remove undefined fields
  return removeUndefined(schema);
}

/**
 * Generate Store/Organization JSON-LD Schema
 * https://schema.org/Store
 */
export function generateStoreSchema(store: Store, config: SchemaConfig) {
  return removeUndefined({
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${config.siteUrl}/stores/${store.slug}`,
    name: store.name,
    description: truncateDescription(store.description),
    url: `${config.siteUrl}/stores/${store.slug}`,
    image: store.banner || store.logo || config.defaultImage,
    priceRange: store.priceRange || '₫₫',
    telephone: store.phone,
    email: store.email,
    address: store.address ? {
      '@type': 'PostalAddress',
      streetAddress: store.address,
      addressLocality: store.city,
      addressRegion: store.region,
      postalCode: store.postalCode,
      addressCountry: 'VN',
    } : undefined,
    geo: store.latitude && store.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: store.latitude,
      longitude: store.longitude,
    } : undefined,
    openingHoursSpecification: store.openingHours ? {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '08:00',
      closes: '22:00',
    } : undefined,
    aggregateRating: store.rating ? {
      '@type': 'AggregateRating',
      ratingValue: store.rating,
      reviewCount: store.reviewCount || 0,
    } : undefined,
    sameAs: store.socialLinks || [],
  });
}

/**
 * Generate BreadcrumbList Schema
 * https://schema.org/BreadcrumbList
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>, config: SchemaConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${config.siteUrl}${item.url}`,
    })),
  };
}

/**
 * Generate FAQ Schema
 * https://schema.org/FAQPage
 */
export function generateFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
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
}

/**
 * Generate WebSite Schema for Sitelinks Searchbox
 * https://schema.org/WebSite
 */
export function generateWebsiteSchema(config: SchemaConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.siteName,
    url: config.siteUrl,
    description: 'Nền tảng sách thật và Ebook bản quyền HUKI',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${config.siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    sameAs: [
      'https://facebook.com/hukiebook',
      'https://instagram.com/hukiebook',
      'https://youtube.com/hukiebook',
    ],
  };
}

/**
 * Generate Organization Schema
 */
export function generateOrganizationSchema(config: SchemaConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${config.siteUrl}/#organization`,
    name: config.siteName,
    url: config.siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: config.siteLogo,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+84-28-xxxx-xxxx',
      contactType: 'customer service',
      availableLanguage: ['Vietnamese', 'English'],
      areaServed: 'VN',
    },
    sameAs: [
      'https://facebook.com/hukiebook',
      'https://instagram.com/hukiebook',
      'https://youtube.com/hukiebook',
    ],
  };
}

/**
 * Generate Author Schema
 */
function generateAuthorSchema(author: Author | string) {
  const authorName = typeof author === 'string' ? author : author.name;
  return {
    '@type': 'Person',
    name: authorName,
    url: typeof author === 'string' ? undefined : author.url,
  };
}

/**
 * Get BookFormat Schema type based on product type
 */
function getBookFormat(type?: string) {
  switch (type?.toLowerCase()) {
    case 'digital':
    case 'ebook':
      return 'https://schema.org/EBook';
    case 'physical':
    case 'book':
    default:
      return 'https://schema.org/Book';
  }
}

/**
 * Truncate description to 160 chars for SEO
 */
function truncateDescription(description?: string, fallback?: string, maxLength = 160) {
  const text = description || fallback || '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Remove undefined and null values from object
 */
function removeUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.filter(item => item !== undefined && item !== null).map(removeUndefined);
  }
  if (obj && typeof obj === 'object') {
    return Object.entries(obj)
      .filter(([_, value]) => value !== undefined && value !== null)
      .reduce((acc, [key, value]) => {
        acc[key] = removeUndefined(value);
        return acc;
      }, {} as any);
  }
  return obj;
}

