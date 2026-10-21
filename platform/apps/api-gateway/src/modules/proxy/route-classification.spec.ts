import {
  classifyRoute,
  normalizePath,
  ADMIN_ROLES,
  SELLER_ROLES,
} from './route-classification';

describe('route-classification', () => {
  describe('normalizePath', () => {
    it('strips /api/v1 prefix and query parameters', () => {
      expect(normalizePath('/api/v1/catalog?page=1&limit=10')).toBe('/catalog');
      expect(normalizePath('/api/v1/auth/login')).toBe('/auth/login');
      expect(normalizePath('/health')).toBe('/health');
    });
  });

  describe('classifyRoute', () => {
    it('classifies health and docs as PUBLIC', () => {
      expect(classifyRoute('GET', '/api/v1/health')).toBe('PUBLIC');
      expect(classifyRoute('GET', '/health')).toBe('PUBLIC');
      expect(classifyRoute('GET', '/api/openapi.json')).toBe('PUBLIC');
      expect(classifyRoute('GET', '/api/docs')).toBe('PUBLIC');
    });

    it('classifies public auth endpoints as PUBLIC', () => {
      expect(classifyRoute('POST', '/api/v1/auth/login')).toBe('PUBLIC');
      expect(classifyRoute('POST', '/api/v1/auth/register')).toBe('PUBLIC');
      expect(classifyRoute('POST', '/api/v1/auth/refresh')).toBe('PUBLIC');
      expect(classifyRoute('POST', '/api/v1/auth/forgot-password')).toBe('PUBLIC');
      expect(classifyRoute('POST', '/api/v1/auth/reset-password')).toBe('PUBLIC');
      expect(classifyRoute('GET', '/api/v1/auth/verify-email?token=xyz')).toBe('PUBLIC');
      expect(classifyRoute('GET', '/api/v1/auth/google')).toBe('PUBLIC');
    });

    it('classifies public catalog and browsing GET requests as PUBLIC', () => {
      expect(classifyRoute('GET', '/api/v1/catalog/search?q=book')).toBe('PUBLIC');
      expect(classifyRoute('GET', '/api/v1/books')).toBe('PUBLIC');
      expect(classifyRoute('GET', '/api/v1/books/b123')).toBe('PUBLIC');
      expect(classifyRoute('GET', '/api/v1/categories')).toBe('PUBLIC');
      expect(classifyRoute('GET', '/api/v1/authors')).toBe('PUBLIC');
      expect(classifyRoute('GET', '/api/v1/publishers')).toBe('PUBLIC');
      expect(classifyRoute('GET', '/api/v1/banners')).toBe('PUBLIC');
      expect(classifyRoute('GET', '/api/v1/vouchers')).toBe('PUBLIC');
      expect(classifyRoute('GET', '/api/v1/flash-sales')).toBe('PUBLIC');
      expect(classifyRoute('GET', '/api/v1/books/b123/reviews')).toBe('PUBLIC');
      expect(classifyRoute('GET', '/api/v1/stores/s123/reviews')).toBe('PUBLIC');
    });

    it('classifies admin endpoints as ADMIN', () => {
      expect(classifyRoute('GET', '/api/v1/admin/finance/reconciliation')).toBe('ADMIN');
      expect(classifyRoute('POST', '/api/v1/admin/drm/vault')).toBe('ADMIN');
      expect(classifyRoute('GET', '/api/v1/moderation/queue')).toBe('ADMIN');
      expect(classifyRoute('GET', '/api/v1/businesses/admin/all')).toBe('ADMIN');
      expect(classifyRoute('GET', '/api/v1/stores/admin/all')).toBe('ADMIN');
      expect(classifyRoute('GET', '/api/v1/users/admin/list')).toBe('ADMIN');
    });

    it('classifies seller endpoints as SELLER', () => {
      expect(classifyRoute('GET', '/api/v1/seller/orders')).toBe('SELLER');
      expect(classifyRoute('POST', '/api/v1/seller/vouchers')).toBe('SELLER');
      expect(classifyRoute('POST', '/api/v1/seller/discounts')).toBe('SELLER');
      expect(classifyRoute('GET', '/api/v1/flash-sales/seller/list')).toBe('SELLER');
      expect(classifyRoute('POST', '/api/v1/books')).toBe('SELLER');
      expect(classifyRoute('PUT', '/api/v1/books/123')).toBe('SELLER');
      expect(classifyRoute('DELETE', '/api/v1/books/123')).toBe('SELLER');
    });

    it('classifies authenticated buyer & user endpoints as AUTHENTICATED', () => {
      expect(classifyRoute('GET', '/api/v1/cart')).toBe('AUTHENTICATED');
      expect(classifyRoute('POST', '/api/v1/cart/checkout')).toBe('AUTHENTICATED');
      expect(classifyRoute('GET', '/api/v1/orders/my')).toBe('AUTHENTICATED');
      expect(classifyRoute('GET', '/api/v1/wallet/me')).toBe('AUTHENTICATED');
      expect(classifyRoute('POST', '/api/v1/wallet/pin')).toBe('AUTHENTICATED');
      expect(classifyRoute('POST', '/api/v1/vouchers/claim')).toBe('AUTHENTICATED');
      expect(classifyRoute('GET', '/api/v1/users/me')).toBe('AUTHENTICATED');
      expect(classifyRoute('GET', '/api/v1/chat/conversations')).toBe('AUTHENTICATED');
      expect(classifyRoute('GET', '/api/v1/notifications')).toBe('AUTHENTICATED');
      expect(classifyRoute('POST', '/api/v1/reviews')).toBe('AUTHENTICATED');
    });
  });

  describe('role definitions', () => {
    it('ADMIN_ROLES contains PLATFORM_ADMIN, ADMIN, SUPER_ADMIN', () => {
      expect(ADMIN_ROLES.has('PLATFORM_ADMIN')).toBe(true);
      expect(ADMIN_ROLES.has('ADMIN')).toBe(true);
      expect(ADMIN_ROLES.has('SUPER_ADMIN')).toBe(true);
      expect(ADMIN_ROLES.has('USER')).toBe(false);
      expect(ADMIN_ROLES.has('BUSINESS')).toBe(false);
    });

    it('SELLER_ROLES includes business roles and admin roles', () => {
      expect(SELLER_ROLES.has('SELLER')).toBe(true);
      expect(SELLER_ROLES.has('BUSINESS')).toBe(true);
      expect(SELLER_ROLES.has('BUSINESS_OWNER')).toBe(true);
      expect(SELLER_ROLES.has('BUSINESS_STAFF')).toBe(true);
      expect(SELLER_ROLES.has('PLATFORM_ADMIN')).toBe(true);
      expect(SELLER_ROLES.has('USER')).toBe(false);
    });
  });
});
