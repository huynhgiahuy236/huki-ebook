const http = require('http');
const fs = require('fs');

const routes = [
  // Store & Public
  '/',
  '/books',
  '/book/con-duong-phia-truoc',
  '/book/con-duong-phia-truoc/preview',
  '/audiobooks',
  '/author/bill-gates',
  '/cart',
  '/checkout',
  '/order/success',
  '/order-success',
  '/orders',
  '/orders/ord-123456',
  '/orders/ord-123456/invoice',
  '/orders/ord-123456/return',
  '/orders/ord-123456/review',
  '/library',
  '/library/con-duong-phia-truoc',
  '/library/devices',
  '/reader',
  '/flash-sale',
  '/stores',
  '/shop/huki-store',
  '/messages',

  // Profile
  '/profile',
  '/profile/addresses',
  '/profile/security',
  '/profile/wallet',

  // Community
  '/community',
  '/community/challenge',
  '/community/clubs',
  '/community/clubs/clb-cong-nghe',
  '/community/posts/post-1',
  '/community/quotes',
  '/community/reviews',

  // Auth
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/change-password',
  '/auth/verify',
  '/auth/status',
  '/auth/onboarding',

  // Seller
  '/seller',
  '/seller/dashboard',
  '/seller/products',
  '/seller/products/create',
  '/seller/products/prod-1/edit',
  '/seller/products/prod-1/correct',
  '/seller/product/create',
  '/seller/product/create-ebook',
  '/seller/product/create-hybrid',
  '/seller/product/create-physical',
  '/seller/product/edit-hybrid',
  '/seller/product/correction',
  '/seller/orders',
  '/seller/orders/ord-1',
  '/seller/inventory',
  '/seller/finance',
  '/seller/revenue',
  '/seller/wallet',
  '/seller/stores',
  '/seller/stores/new',
  '/seller/staff',
  '/seller/vouchers',
  '/seller/chat',
  '/seller/profile',
  '/seller/business',
  '/seller/business/notifications',
  '/seller/notifications',
  '/seller/edge-cases',
  '/seller/register',

  // Admin
  '/admin',
  '/admin/dashboard',
  '/admin/accounts',
  '/admin/book-moderation',
  '/admin/books',
  '/admin/business-requests',
  '/admin/businesses',
  '/admin/calendar',
  '/admin/categories',
  '/admin/drm-vault',
  '/admin/finance',
  '/admin/health',
  '/admin/integrations',
  '/admin/marketing',
  '/admin/publisher-leads',
  '/admin/publishers',
  '/admin/reports',
  '/admin/settings',
  '/admin/stores',
  '/admin/support',
  '/admin/users'
];

function fetchRoute(route) {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3100' + route, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          route,
          status: res.statusCode,
          size: data.length,
          hasHtml: data.includes('<!DOCTYPE html>') || data.includes('<html'),
          errorText: data.includes('Application error') ? 'App Error' : (res.statusCode >= 400 ? 'HTTP ' + res.statusCode : null)
        });
      });
    });
    req.on('error', (err) => {
      resolve({ route, status: 0, errorText: err.message });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ route, status: 408, errorText: 'Timeout' });
    });
  });
}

async function smokeTest() {
  console.log('Testing total routes:', routes.length);
  const results = [];
  for (const r of routes) {
    const res = await fetchRoute(r);
    results.push(res);
  }
  
  const passed = results.filter(r => r.status === 200);
  const failed = results.filter(r => r.status !== 200);
  
  console.log(`Passed: ${passed.length}/${results.length}`);
  if (failed.length > 0) {
    console.log('Failed routes:', failed);
  }
  
  fs.writeFileSync('smoke_test_results.json', JSON.stringify(results, null, 2), 'utf8');
}

smokeTest();
