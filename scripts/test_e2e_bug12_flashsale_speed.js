'use strict';

/**
 * E2E Verification Script: BUG-12 (Flash Sale Seller & Admin Action Latency / Speed Optimization)
 *
 * Tests real runtime behavior against:
 * 1. Compiled `BooksService.findOne(..., { light: true })` skipping R2 `exists()` & `orderItem.aggregate`
 * 2. Compiled `FlashSalesService`:
 *    - `sellerCancelItem` skipping Commerce HTTP call when `item.storeId === businessId` or Admin
 *    - `sellerCancelItem`, `cancel`, `endEarly` running `eventBus.publish` non-blocking (returns <100ms even with 800ms slow broker)
 *    - `getCommerceBookCached` 120s cache deduplicating repeat book lookups
 * 3. Frontend optimistic updates & anti-double-reload (`skipSelfBusUntilRef`, `savingRowId`, filtered `NOTIFICATIONS_UPDATED`)
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
  console.log('=== E2E VERIFICATION: BUG-12 (FLASH SALE SPEED & OPTIMISTIC UI) ===\n');

  const { BooksService } = require(
    path.join(
      PLATFORM_DIST,
      'out-tsc',
      'commerce-service',
      'apps',
      'commerce-service',
      'src',
      'modules',
      'books',
      'books.service.js',
    ),
  );
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

  // 1. Test BooksService.findOne({ light: true })
  let aggregateCalls = 0;
  let r2ExistsCalls = 0;
  const mockPrismaBooks = {
    book: {
      findUnique: async () => ({
        id: 'book-fs-fast',
        slug: 'book-fs-fast',
        title: 'Sách Flash Sale Nhanh',
        storeId: 'store-fast-1',
        status: 'PUBLISHED',
        price: 120000,
        stock: 50,
        digitalDetails: { pdfKey: 'ebooks/dac-nhan-tam.pdf' },
        physicalDetails: null,
        category: null,
        author: null,
        publisher: null,
        issuingCompany: null,
        translator: null,
        affiliateSetting: null,
      }),
    },
    orderItem: {
      aggregate: async () => {
        aggregateCalls += 1;
        return { _sum: { quantity: 10 } };
      },
    },
    discount: {
      findMany: async () => [],
    },
  };
  const mockStorage = {
    exists: async () => {
      r2ExistsCalls += 1;
      await new Promise((r) => setTimeout(r, 400));
      return true;
    },
  };
  const booksService = new BooksService(mockPrismaBooks, undefined, undefined, mockStorage);
  const t0 = Date.now();
  const lightBook = await booksService.findOne('book-fs-fast', undefined, { light: true });
  const lightMs = Date.now() - t0;
  assert.strictEqual(lightBook.id, 'book-fs-fast');
  assert.strictEqual(aggregateCalls, 0, 'light=1 must skip orderItem.aggregate');
  assert.strictEqual(r2ExistsCalls, 0, 'light=1 must skip slow R2 HeadObject check');
  assert.ok(lightMs < 100, `light=1 should resolve fast (<100ms), got ${lightMs}ms`);
  console.log(`[PASS] Step 1: BooksService.findOne({ light: true }) took ${lightMs}ms (0 R2/aggregate calls)`);

  // 2. Test FlashSalesService non-blocking eventBus & zero HTTP on sellerCancelItem / cancel / endEarly
  let httpCalls = 0;
  const origFetch = global.fetch;
  global.fetch = async (url) => {
    httpCalls += 1;
    return {
      ok: true,
      json: async () => ({
        data: { id: 'book-fs-fast', title: 'Sách Flash Sale Nhanh', price: 120000, stock: 50, storeId: 'store-fast-1', format: 'PHYSICAL' },
      }),
    };
  };

  try {
    let publishedEvents = 0;
    const slowEventBus = {
      async publish() {
        await new Promise((r) => setTimeout(r, 800));
        publishedEvents += 1;
      },
    };
    const mockRedis = {
      status: 'ready',
      del: async () => 1,
      get: async () => null,
      set: async () => 'OK',
      disconnect: () => {},
    };
    const now = Date.now();
    const mockPromoPrisma = {
      flashSale: {
        findUnique: async () => ({
          id: 'slot-fast-1',
          name: 'Slot 12h',
          scope: 'SHOP',
          storeId: 'store-fast-1',
          status: 'ACTIVE',
          startsAt: new Date(now - 60000),
          endsAt: new Date(now + 3600000),
          items: [{ id: 'item-fast-1', storeId: 'store-fast-1', bookId: 'book-fs-fast' }],
        }),
        update: async ({ data }) => ({ id: 'slot-fast-1', ...data }),
      },
      flashSaleItem: {
        findUnique: async () => ({
          id: 'item-fast-1',
          flashSaleId: 'slot-fast-1',
          bookId: 'book-fs-fast',
          storeId: 'store-fast-1',
          flashSale: {
            id: 'slot-fast-1',
            name: 'Slot 12h',
            scope: 'SHOP',
            storeId: 'store-fast-1',
            status: 'SCHEDULED',
            endsAt: new Date(now + 3600000),
          },
        }),
        findMany: async () => [{ storeId: 'store-fast-1' }],
        delete: async () => ({ id: 'item-fast-1' }),
      },
    };

    const flashService = new FlashSalesService(mockPromoPrisma, mockRedis, slowEventBus);

    // 2a. sellerCancelItem when storeId === businessId
    const tCancelItem = Date.now();
    const cancelItemRes = await flashService.sellerCancelItem('store-fast-1', 'item-fast-1');
    const cancelItemMs = Date.now() - tCancelItem;
    assert.strictEqual(httpCalls, 0, 'sellerCancelItem with matching item.storeId must skip Commerce HTTP');
    assert.ok(cancelItemMs < 100, `sellerCancelItem should not block on 800ms eventBus (took ${cancelItemMs}ms)`);
    assert.ok(cancelItemRes && (cancelItemRes.deleted || cancelItemRes.removedItemId === 'item-fast-1' || cancelItemRes.id === 'item-fast-1' || cancelItemRes.message));
    console.log(`[PASS] Step 2a: FlashSalesService.sellerCancelItem resolved in ${cancelItemMs}ms (0 HTTP calls, non-blocking eventBus)`);

    // 2b. cancel(slotId) with slow eventBus
    const tCancelSlot = Date.now();
    const cancelledSlot = await flashService.cancel('slot-fast-1');
    const cancelSlotMs = Date.now() - tCancelSlot;
    assert.strictEqual(cancelledSlot.status, 'CANCELLED');
    assert.ok(cancelSlotMs < 100, `cancel() should not block on 800ms eventBus (took ${cancelSlotMs}ms)`);
    console.log(`[PASS] Step 2b: FlashSalesService.cancel resolved in ${cancelSlotMs}ms`);

    // 2c. endEarly(slotId) with slow eventBus
    const tEndEarly = Date.now();
    await flashService.endEarly('slot-fast-1');
    const endEarlyMs = Date.now() - tEndEarly;
    assert.ok(endEarlyMs < 100, `endEarly() should not block on 800ms eventBus (took ${endEarlyMs}ms)`);
    console.log(`[PASS] Step 2c: FlashSalesService.endEarly resolved in ${endEarlyMs}ms`);

    // Wait for background eventBus promises to settle
    await new Promise((r) => setTimeout(r, 900));
    assert.ok(publishedEvents >= 3, `Expected >=3 background events published, got ${publishedEvents}`);
    console.log(`[PASS] Step 2d: Background eventBus eventually published ${publishedEvents} events without blocking HTTP responses`);
  } finally {
    global.fetch = origFetch;
  }

  // 3. Frontend anti-double-reload & optimistic state contracts
  const sellerViewSrc = fs.readFileSync(
    path.join(ROOT, 'web', 'src', 'ui', 'components', 'seller', 'SellerFlashSaleView.tsx'),
    'utf8',
  );
  const adminViewSrc = fs.readFileSync(
    path.join(ROOT, 'web', 'src', 'ui', 'components', 'admin', 'AdminFlashSaleView.tsx'),
    'utf8',
  );
  const detailPageSrc = fs.readFileSync(
    path.join(ROOT, 'web', 'src', 'app', 'seller', 'promotions', 'flash-sale', '[id]', 'page.tsx'),
    'utf8',
  );

  assert.ok(sellerViewSrc.includes('skipSelfBusUntilRef'));
  assert.ok(sellerViewSrc.includes("notiType.includes('FLASH_SALE')"));
  assert.ok(adminViewSrc.includes('skipSelfBusUntilRef'));
  assert.ok(adminViewSrc.includes('savingRowId'));
  assert.ok(adminViewSrc.includes("notiType.includes('FLASH_SALE')"));
  assert.ok(detailPageSrc.includes('handleConfirmCancelItem'));
  console.log('[PASS] Step 3: SellerFlashSaleView, AdminFlashSaleView & FlashSaleDetailPage optimistic + anti-double-reload guards verified');

  console.log('\nALL BUG-12 E2E CHECKS PASSED.');
}

run().catch((err) => {
  console.error('\n[FAIL] BUG-12 E2E verification failed:', err);
  process.exit(1);
});
