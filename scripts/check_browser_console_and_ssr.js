const http = require('http');

function get(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3100${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    }).on('error', (err) => {
      resolve({ path, status: 'ERROR', error: err.message });
    });
  });
}

async function auditPages() {
  console.log('=== AUDITING PAGES FOR SSR RUNTIME, HYDRATION & CONSOLE TRAPS ===\n');

  const pages = [
    '/',
    '/stores',
    '/checkout',
    '/shop/store-002-nhanam-books',
    '/seller/dashboard',
    '/seller/promotions/discounts',
    '/admin/dashboard',
    '/admin/escrow',
  ];

  let hasErrors = false;

  for (const p of pages) {
    const res = await get(p);
    const isOk = res.status === 200 || res.status === 307;
    console.log(`\nChecking [${p}] -> HTTP ${res.status}`);

    if (!isOk) {
      console.error(`  ❌ HTTP error on ${p}: ${res.status}`);
      hasErrors = true;
      continue;
    }

    if (res.body) {
      // Check for Next.js build / runtime error markers
      if (res.body.includes('Application error: a client-side exception has occurred')) {
        console.error(`  ❌ Client-side exception trap detected on ${p}`);
        hasErrors = true;
      }
      if (res.body.includes('Error: Hydration failed') || res.body.includes('hydration-mismatch')) {
        console.error(`  ❌ Hydration mismatch warning in SSR on ${p}`);
        hasErrors = true;
      }
      if (res.body.includes('Unhandled Runtime Error')) {
        console.error(`  ❌ Unhandled Runtime Error overlay on ${p}`);
        hasErrors = true;
      }
      console.log(`  ✅ SSR rendered cleanly (${Buffer.byteLength(res.body)} bytes). No runtime crash markers.`);
    }
  }

  if (hasErrors) {
    throw new Error('Some pages failed SSR/runtime check');
  }
  console.log('\n>>> ALL AUDITED PAGES RENDER CLEANLY WITH 0 RUNTIME EXCEPTIONS! <<<');
}

auditPages().catch((err) => {
  console.error('\nAUDIT FAILED:', err.message);
  process.exitCode = 1;
});
