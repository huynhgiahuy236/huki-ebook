export type RouteTier = 'PUBLIC' | 'AUTHENTICATED' | 'SELLER' | 'ADMIN';

export const ADMIN_ROLES = new Set(['PLATFORM_ADMIN', 'ADMIN', 'SUPER_ADMIN']);
export const SELLER_ROLES = new Set([
  'SELLER',
  'BUSINESS',
  'BUSINESS_OWNER',
  'BUSINESS_STAFF',
  'PLATFORM_ADMIN',
  'ADMIN',
  'SUPER_ADMIN',
]);

/**
 * Strips global prefix (/api/v1) and query strings to get a normalized path.
 */
export function normalizePath(originalUrl: string): string {
  const pathWithoutQuery = originalUrl.split('?')[0];
  const stripped = pathWithoutQuery.replace(/^\/api\/v1/, '');
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}

/**
 * Classifies an incoming request by HTTP method and normalized path into security tiers.
 */
export function classifyRoute(method: string, originalUrl: string): RouteTier {
  const normPath = normalizePath(originalUrl);
  const upperMethod = method.toUpperCase();

  // Public system maintenance & broadcast checks
  if (
    normPath === '/system/maintenance' ||
    normPath.startsWith('/system/maintenance') ||
    normPath === '/system-maintenance' ||
    normPath === '/broadcast-notifications' ||
    normPath.startsWith('/broadcast-notifications') ||
    normPath === '/seller/feature-flags' ||
    normPath.startsWith('/seller/feature-flags') ||
    normPath === '/seller-features' ||
    normPath.startsWith('/seller-features') ||
    normPath === '/seller/penalties' ||
    normPath.startsWith('/seller/penalties') ||
    normPath === '/seller-penalties' ||
    normPath.startsWith('/seller-penalties')
  ) {
    if (upperMethod === 'GET') {
      return 'PUBLIC';
    }
  }

  // 1. Health checks & Swagger documentation are always PUBLIC
  if (
    normPath === '/health' ||
    normPath.startsWith('/health/') ||
    normPath === '/openapi.json' ||
    normPath === '/api/openapi.json' ||
    normPath.startsWith('/docs') ||
    normPath.startsWith('/api/docs')
  ) {
    return 'PUBLIC';
  }

  // 2. Authentication public endpoints
  if (
    normPath === '/auth/login' ||
    normPath === '/auth/register' ||
    normPath === '/auth/refresh' ||
    normPath === '/auth/forgot-password' ||
    normPath === '/auth/reset-password' ||
    normPath === '/auth/verify-email' ||
    normPath === '/auth/resend-verification' ||
    normPath === '/auth/verify-reset-token' ||
    normPath.startsWith('/auth/google') ||
    normPath === '/chat/ai' ||
    normPath.startsWith('/chat/ai')
  ) {
    return 'PUBLIC';
  }

  // 3. Webhooks & Callbacks from external payment/logistics providers
  if (
    normPath.startsWith('/callbacks/') ||
    normPath.startsWith('/shipping/callbacks/') ||
    normPath.startsWith('/payments/webhook')
  ) {
    return 'PUBLIC';
  }

  // 4. ADMIN Routes: Dedicated admin prefixes & endpoints (BUG-MOD07-01, BUG-MOD07-08)
  if (
    normPath === '/admin' ||
    normPath.startsWith('/admin/') ||
    normPath.includes('/admin/') ||
    normPath.endsWith('/admin') ||
    normPath === '/moderation' ||
    normPath.startsWith('/moderation/') ||
    normPath.startsWith('/businesses/admin') ||
    normPath.startsWith('/stores/admin') ||
    normPath.startsWith('/users/admin') ||
    normPath.startsWith('/ledger/admin') ||
    normPath.startsWith('/wallet/admin') ||
    normPath.startsWith('/payout/admin') ||
    normPath.startsWith('/sanctions') ||
    ((normPath.startsWith('/system/maintenance') || normPath.startsWith('/system-maintenance')) && upperMethod !== 'GET')
  ) {
    return 'ADMIN';
  }

  // 5. SELLER Routes: Dedicated seller prefixes & seller store/catalog management
  if (
    normPath === '/seller' ||
    normPath.startsWith('/seller/') ||
    normPath.startsWith('/flash-sales/seller') ||
    normPath.startsWith('/discounts/seller')
  ) {
    return 'SELLER';
  }

  // Mutations to book reviews require standard customer authentication (not SELLER)
  if (
    normPath.includes('/reviews') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)
  ) {
    return 'AUTHENTICATED';
  }

  // Mutations to books catalog require SELLER role
  if (
    (normPath === '/books' || normPath.startsWith('/books/')) &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod)
  ) {
    return 'SELLER';
  }

  // 6. Public read-only catalog, browsing, and content
  if (upperMethod === 'GET') {
    if (
      normPath.startsWith('/catalog') ||
      normPath.startsWith('/categories') ||
      normPath.startsWith('/authors') ||
      normPath.startsWith('/publishers') ||
      normPath.startsWith('/banners') ||
      normPath === '/vouchers' ||
      normPath === '/ai-audio/plans' ||
      normPath.startsWith('/ai-audio/plans') ||
      normPath.startsWith('/reviews') ||
      /^\/stores\/[^/]+\/reviews/.test(normPath) ||
      /^\/books\/[^/]+\/reviews/.test(normPath) ||
      normPath === '/shipping/rates' ||
      normPath === '/shipping/methods' ||
      normPath === '/affiliate/program' ||
      normPath === '/affiliate/code-availability' ||
      normPath === '/affiliate/catalog' ||
      normPath.startsWith('/affiliate/resolve/') ||
      normPath.startsWith('/affiliate/books/') ||
      normPath.startsWith('/r/')
    ) {
      return 'PUBLIC';
    }

    // Public businesses & stores storefront endpoints (excluding private seller/admin/my endpoints)
    if (
      (normPath === '/businesses' || normPath.startsWith('/businesses/')) &&
      !normPath.startsWith('/businesses/admin') &&
      !normPath.startsWith('/businesses/my') &&
      !normPath.startsWith('/businesses/following')
    ) {
      return 'PUBLIC';
    }

    if (
      (normPath === '/stores' || normPath.startsWith('/stores/')) &&
      !normPath.startsWith('/stores/admin') &&
      !normPath.startsWith('/stores/my')
    ) {
      return 'PUBLIC';
    }

    // Public books detail/list, excluding protected reader/forensic/digital endpoints
    if (
      (normPath === '/books' || normPath.startsWith('/books/')) &&
      !normPath.includes('/digital') &&
      !normPath.includes('/forensics') &&
      !normPath.includes('/read')
    ) {
      return 'PUBLIC';
    }

    // Public flash sales promotions
    if (normPath.startsWith('/flash-sales') && !normPath.startsWith('/flash-sales/seller')) {
      return 'PUBLIC';
    }
  }

  // 7. Everything else requires authenticated access
  return 'AUTHENTICATED';
}
