'use strict';

/**
 * E2E Verification Script: BUG-17 & BUG-18 (Book Detail Related Books + Format-Aware Specs)
 *
 * Tests real runtime behavior against:
 * 1. Compiled `BooksService.findOne` public serialization exposing `weight`, `dimensions`, `pageCount`,
 *    `physicalEnabled`, `digitalEnabled`, `accessType`, `hasPdf`, `hasEpub`, `categoryId`
 * 2. Compiled `BooksService.findRelated('tu-huyet-cam-xuc', 6)` ranking `SAME_CATEGORY -> SAME_AUTHOR_OR_PUBLISHER -> SAME_FORMAT`
 * 3. Compiled API Gateway `classifyRoute('GET', '/api/v1/books/tu-huyet-cam-xuc/related') === 'PUBLIC'`
 * 4. Frontend contracts in `catalogApi.ts`, `SimilarBooksSection.tsx`, and `web/src/app/book/[id]/page.tsx`
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
  console.log('=== E2E VERIFICATION: BUG-17 & BUG-18 (BOOK DETAIL SPECS & RELATED BOOKS) ===\n');

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
  const { classifyRoute } = require(
    path.join(
      PLATFORM_DIST,
      'out-tsc',
      'api-gateway',
      'apps',
      'api-gateway',
      'src',
      'modules',
      'proxy',
      'route-classification.js',
    ),
  );

  // 1. Public specs + dimensions + digital specs on BOTH book (`tu-huyet-cam-xuc`)
  const anchorBook = {
    id: '5ae1c197-9109-4d27-b80b-2d4ecd8e9b8c',
    slug: 'tu-huyet-cam-xuc',
    title: 'Tử Huyệt Cảm Xúc',
    storeId: 'store-huki',
    businessId: 'store-huki',
    status: 'PUBLISHED',
    format: 'BOTH',
    price: 115000,
    categoryId: 'cat-psychology',
    authorId: 'author-roy-garn',
    publisherId: 'pub-first-news',
    category: { id: 'cat-psychology', name: 'Tâm lý học - Giao tiếp' },
    author: { id: 'author-roy-garn', name: 'Roy Garn', bio: 'Chuyên gia tâm lý ứng dụng.' },
    publisher: { id: 'pub-first-news', name: 'First News - Trí Việt' },
    physicalDetails: {
      weight: 350,
      dimensions: '14 x 20.5 cm',
      pageCount: 256,
      stock: 100,
      reserved: 1,
      physicalEnabled: true,
    },
    digitalDetails: {
      pdfKey: 'ebooks/tu-huyet-cam-xuc.pdf',
      epubKey: null,
      previewPdfKey: 'ebooks/tu-huyet-preview.pdf',
      digitalEnabled: true,
      accessType: 'PAID',
    },
  };

  const mockCatalogRows = [
    {
      id: 'rel-cat-1',
      slug: 'dac-nhan-tam',
      title: 'Đắc Nhân Tâm',
      format: 'BOTH',
      status: 'PUBLISHED',
      price: 120000,
      categoryId: 'cat-psychology',
      authorId: 'author-carnegie',
      publisherId: 'pub-first-news',
      category: { id: 'cat-psychology', name: 'Tâm lý học - Giao tiếp' },
      physicalDetails: { weight: 320, dimensions: '14.5 x 20.5 cm', stock: 50, reserved: 0 },
      digitalDetails: { pdfKey: 'ebooks/dac-nhan-tam.pdf', digitalEnabled: true },
    },
    {
      id: 'rel-author-2',
      slug: 'ngon-tu-quyen-luc',
      title: 'Ngôn Từ Quyền Lực',
      format: 'PHYSICAL',
      status: 'PUBLISHED',
      price: 98000,
      categoryId: 'cat-skills',
      authorId: 'author-roy-garn',
      publisherId: 'pub-tre',
      physicalDetails: { weight: 290, stock: 20, reserved: 0 },
      digitalDetails: null,
    },
    {
      id: 'rel-format-3',
      slug: 'nha-gia-kim',
      title: 'Nhà Giả Kim',
      format: 'BOTH',
      status: 'PUBLISHED',
      price: 98000,
      categoryId: 'cat-fiction',
      authorId: 'author-coelho',
      publisherId: 'pub-khxh',
      physicalDetails: { weight: 280, pageCount: 228, stock: 30, reserved: 0 },
      digitalDetails: { digitalEnabled: true },
    },
  ];

  const mockPrisma = {
    book: {
      findUnique: async () => anchorBook,
      findFirst: async () => anchorBook,
      findMany: async ({ where }) => {
        const excluded = new Set(where?.id?.notIn || []);
        return mockCatalogRows.filter((row) => {
          if (excluded.has(row.id)) return false;
          if (where.categoryId && row.categoryId !== where.categoryId) return false;
          if (where.OR) {
            const matchesOr = where.OR.some(
              (cond) =>
                (cond.authorId && row.authorId === cond.authorId) ||
                (cond.publisherId && row.publisherId === cond.publisherId),
            );
            if (!matchesOr) return false;
          }
          if (where.format && row.format !== where.format) return false;
          return true;
        });
      },
    },
    discount: { findMany: async () => [] },
    orderItem: { aggregate: async () => ({ _sum: { quantity: 2 } }) },
  };

  const booksService = new BooksService(mockPrisma);

  const detail = await booksService.findOne(anchorBook.id, undefined, { light: true });
  assert.strictEqual(detail.weight, 350);
  assert.strictEqual(detail.dimensions, '14 x 20.5 cm');
  assert.strictEqual(detail.pageCount, 256);
  assert.strictEqual(detail.physicalEnabled, true);
  assert.strictEqual(detail.digitalEnabled, true);
  assert.strictEqual(detail.accessType, 'PAID');
  assert.strictEqual(detail.categoryId, 'cat-psychology');
  assert.strictEqual(detail.physicalDetails, undefined, 'Private physicalDetails must stay omitted for guests');
  console.log('[PASS] Step 1 (BUG-18): Public findOne exposes weight=350g, dimensions, pageCount, digitalEnabled & accessType safely');

  const related = await booksService.findRelated('tu-huyet-cam-xuc', 6);
  assert.strictEqual(related.length, 3);
  assert.strictEqual(related[0].id, 'rel-cat-1');
  assert.strictEqual(related[0].matchReason, 'SAME_CATEGORY');
  assert.strictEqual(related[1].id, 'rel-author-2');
  assert.strictEqual(related[1].matchReason, 'SAME_AUTHOR_OR_PUBLISHER');
  assert.strictEqual(related[2].id, 'rel-format-3');
  assert.strictEqual(related[2].matchReason, 'SAME_FORMAT');
  console.log('[PASS] Step 2 (BUG-17): BooksService.findRelated ranked SAME_CATEGORY -> SAME_AUTHOR_OR_PUBLISHER -> SAME_FORMAT');

  const gatewayAccess = classifyRoute('GET', '/api/v1/books/tu-huyet-cam-xuc/related');
  assert.strictEqual(gatewayAccess, 'PUBLIC');
  console.log('[PASS] Step 3: API Gateway classifies GET /books/:id/related as PUBLIC');

  const catalogApiSrc = fs.readFileSync(path.join(ROOT, 'web', 'src', 'ui', 'api', 'catalogApi.ts'), 'utf8');
  const similarSrc = fs.readFileSync(path.join(ROOT, 'web', 'src', 'ui', 'components', 'recommendations', 'SimilarBooksSection.tsx'), 'utf8');
  const detailPageSrc = fs.readFileSync(path.join(ROOT, 'web', 'src', 'app', 'book', '[id]', 'page.tsx'), 'utf8');

  assert.ok(catalogApiSrc.includes('getRelatedBooks'));
  assert.ok(similarSrc.includes('max-w-[1240px]'));
  assert.ok(similarSrc.includes('getRelatedBooks'));
  assert.ok(detailPageSrc.includes('Quy Cách Sách Vật Lý &amp; Giao Hàng'));
  assert.ok(detailPageSrc.includes('Thông Số Phiên Bản Ebook &amp; Bản Quyền Số'));
  assert.ok(detailPageSrc.includes('book.dimensions'));
  assert.ok(detailPageSrc.includes('book.weight'));
  console.log('[PASS] Step 4: Frontend Catalog API, SimilarBooksSection & BookDetailPage contracts verified');

  console.log('\nALL BUG-17 & BUG-18 E2E CHECKS PASSED.');
}

run().catch((err) => {
  console.error('\n[FAIL] BUG-17 & BUG-18 E2E verification failed:', err);
  process.exit(1);
});
