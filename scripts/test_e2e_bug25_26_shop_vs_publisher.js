'use strict';

/**
 * E2E Verification Script: BUG-25 & BUG-26
 * - BUG-25: Complete separation between Shop (Business/Store) and Publisher (attribute/filter only):
 *           NO hardcoded PARTNER_MAP, NO /shop/[publisher] fake mall pages, NO publisher fallback for Shop name
 * - BUG-26: Flash Sale getGroupedShopFlashSales resolves real Shop name/slug/avatar via BusinessService (id/ownerId/storeId)
 *           instead of defaulting to book.publisher ("First News - Trí Việt")
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const Module = require('module');

const ROOT = path.resolve(__dirname, '..');
const PLATFORM_DIST = path.join(ROOT, 'platform', 'dist');
const PLATFORM_NODE_MODULES = path.join(ROOT, 'platform', 'node_modules');

const origResolve = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (request === '@huki/shared') {
    return path.join(PLATFORM_DIST, 'libs', 'shared', 'index.js');
  }
  if (request.startsWith('@huki/shared/')) {
    const sub = request.slice('@huki/shared/'.length);
    const asFile = path.join(PLATFORM_DIST, 'libs', 'shared', `${sub}.js`);
    return fs.existsSync(asFile)
      ? asFile
      : path.join(PLATFORM_DIST, 'libs', 'shared', sub, 'index.js');
  }
  try {
    return origResolve.call(this, request, parent, isMain, options);
  } catch (err) {
    const nextOptions = Object.assign({}, options || {}, {
      paths: [PLATFORM_NODE_MODULES, ...((options && options.paths) || [])],
    });
    return origResolve.call(this, request, parent, isMain, nextOptions);
  }
};

async function run() {
  console.log('=== E2E VERIFICATION: BUG-25 & BUG-26 (SHOP VS PUBLISHER & FLASH SALE SHOP RESOLUTION) ===\n');

  const { FlashSalesService } = require(
    path.join(
      PLATFORM_DIST,
      'out-tsc',
      'promotion-service',
      'apps',
      'promotion-service',
      'src',
      'modules',
      'flash-sales',
      'flash-sales.service.js',
    ),
  );

  const ownerUuid = '99999999-0000-4000-8000-000000000001';
  const prisma = {
    flashSale: {
      findMany: async () => [
        {
          id: 'b1cd6215-4775-4fff-8a66-00d7ff18c32f',
          name: 'Flash Sale Giờ Vàng Shop',
          description: null,
          bannerUrl: null,
          scope: 'SHOP',
          storeId: ownerUuid,
          startsAt: new Date(Date.now() - 60_000),
          endsAt: new Date(Date.now() + 3_600_000),
          status: 'ACTIVE',
          items: [
            {
              id: 'fs-item-1',
              flashSaleId: 'b1cd6215-4775-4fff-8a66-00d7ff18c32f',
              bookId: '5ae1c197-9109-4d27-b80b-2d4ecd8e9b8c',
              originalPrice: 115000,
              salePrice: 80500,
              stock: 9,
              sold: 1,
              maxPerUser: 1,
            },
          ],
        },
      ],
      update: async () => ({}),
      updateMany: async () => ({ count: 0 }),
    },
    flashSaleItem: { findMany: async () => [] },
    $transaction: async () => [],
  };
  const redis = { status: 'ready', disconnect: () => {} };
  const svc = new FlashSalesService(prisma, redis, { publish: async () => {} });

  svc.preloadCommerceBooks = async () =>
    new Map([
      [
        '5ae1c197-9109-4d27-b80b-2d4ecd8e9b8c',
        {
          id: '5ae1c197-9109-4d27-b80b-2d4ecd8e9b8c',
          title: 'Tử Huyệt Cảm Xúc',
          slug: 'tu-huyet-cam-xuc',
          storeId: ownerUuid,
          publisher: { id: 'pub-fn', name: 'First News - Trí Việt', slug: 'first-news-tri-viet' },
        },
      ],
    ]);
  svc.preloadPublicBusinesses = async () => [
    {
      id: '77777777-0000-4000-8000-000000000001',
      name: 'Nhà Sách HuKi Official',
      slug: 'nha-sach-huki-official',
      ownerId: ownerUuid,
      logo: 'https://cdn.huki.vn/huki-official.png',
      stores: [
        {
          id: 'store-huki-1',
          name: 'Nhà Sách HuKi Official',
          slug: 'nha-sach-huki-official',
          logo: 'https://cdn.huki.vn/huki-official.png',
        },
      ],
    },
  ];

  const grouped = await svc.getGroupedShopFlashSales();
  assert.strictEqual(grouped.length, 1);
  assert.strictEqual(grouped[0].storeName, 'Nhà Sách HuKi Official', 'Must display real Seller shop name');
  assert.notStrictEqual(grouped[0].storeName, 'First News - Trí Việt', 'Must NEVER display book publisher as shop name');
  assert.strictEqual(grouped[0].storeSlug, 'nha-sach-huki-official');
  assert.strictEqual(grouped[0].campaigns[0].storeName, 'Nhà Sách HuKi Official');
  console.log('[OK] Compiled FlashSalesService.getGroupedShopFlashSales resolved real Shop "Nhà Sách HuKi Official"');

  // Verify frontend files have zero hardcoded PARTNER_MAP / fake publisher shops
  const shopPage = fs.readFileSync(path.join(ROOT, 'web/src/app/shop/[id]/page.tsx'), 'utf8');
  assert(!shopPage.includes('PARTNER_MAP'), 'PARTNER_MAP must be removed from /shop/[id]');
  assert(!shopPage.includes('catalogApi.getPublishers'), '/shop/[id] must not turn Publishers into Shop pages');
  assert(!shopPage.includes('isAlpha'), '/shop/[id] must not hardcode isAlpha/atomic habits');
  assert(shopPage.includes('/books?publisher='), '/shop/[id] should direct unknown publisher slugs to book filter');

  const featuredStores = fs.readFileSync(path.join(ROOT, 'web/src/ui/components/sections/FeaturedStoresSection.tsx'), 'utf8');
  assert(!featuredStores.includes('42.5k người theo dõi'), 'FeaturedStoresSection must not have hardcoded publisher-shop mock counts');
  assert(!featuredStores.includes("'first-news'"), 'FeaturedStoresSection must not hardcode first-news shop');

  const flashSalePage = fs.readFileSync(path.join(ROOT, 'web/src/app/flash-sale/page.tsx'), 'utf8');
  assert(!flashSalePage.includes('matchBook?.publisher'), '/flash-sale must not resolve Shop name from book.publisher');

  const bookDetailPage = fs.readFileSync(path.join(ROOT, 'web/src/app/book/[id]/page.tsx'), 'utf8');
  assert(bookDetailPage.includes("String(biz.ownerId || '').toLowerCase() === lowerTarget"), 'Book Detail must match Shop by ownerId');
  assert(!bookDetailPage.includes('businesses.length === 1 ? businesses[0] : null'), 'Book Detail must not blindly pick businesses[0]');

  const storesPage = fs.readFileSync(path.join(ROOT, 'web/src/app/stores/page.tsx'), 'utf8');
  assert(!storesPage.includes('NXB Chính Hãng'), '/stores must not label Seller shops as NXB Chính Hãng');
  assert(!storesPage.includes('person_star'), '/stores must not render broken/unnecessary person_star icon');
  assert(!storesPage.includes('pId === st.id'), '/stores must count books by real store/business/owner IDs only');

  const homePage = fs.readFileSync(path.join(ROOT, 'web/src/app/page.tsx'), 'utf8');
  assert(!homePage.includes('Gian Hàng NXB &amp; Đối Tác Chính Hãng'), 'Home Section 5 must separate Publishers as book filter instead of Gian Hàng');

  const vscodeSettings = JSON.parse(fs.readFileSync(path.join(ROOT, '.vscode/settings.json'), 'utf8'));
  assert.strictEqual(vscodeSettings['files.autoSave'], 'off', '.vscode/settings.json must prevent VS Code autoSave overwrites');

  console.log('[OK] All Frontend & VS Code configuration checks verified');
  console.log('\nPASS: BUG-25 & BUG-26 SHOP VS PUBLISHER E2E VERIFICATION SUCCEEDED.');
}

run().catch((err) => {
  console.error('\nFAIL:', err);
  process.exit(1);
});
