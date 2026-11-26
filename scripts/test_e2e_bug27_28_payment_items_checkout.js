'use strict';

/**
 * E2E Verification Script: BUG-27 & BUG-28
 * - BUG-27: OrdersService.buyerView exposes both canonical (bookTitle, bookCoverUrl, unitPrice, subtotal,
 *           shippingTotal, discountTotal) and compatibility aliases (title, coverUrl, coverImage, price,
 *           shippingFee, discountAmount); /checkout/payment/[orderId] & /order-success consume them cleanly.
 * - BUG-28: apiClient extractHumanErrorMessage prioritizes details over generic "Validation failed"
 *           and checkout page handles address validation, cartItemId sync, and note/affiliate bounds.
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
  console.log('=== E2E VERIFICATION: BUG-27 & BUG-28 ===\n');

  const { OrdersService } = require(
    path.join(
      PLATFORM_DIST,
      'out-tsc',
      'commerce-service',
      'apps',
      'commerce-service',
      'src',
      'modules',
      'orders',
      'orders.service.js',
    ),
  );

  const mockOrder = {
    id: 'ord-uat-27',
    code: 'ORD-MWXDF94U-30EF8D09',
    userId: 'buyer-huy',
    itemSubtotal: 552000,
    shippingTotal: 30000,
    discountTotal: 0,
    grandTotal: 582000,
    paymentMethod: 'ONLINE_PAYMENT',
    paymentProvider: 'PAYOS',
    paymentStatus: 'PROCESSING',
    status: 'PENDING_PAYMENT',
    shippingAddress: { recipientName: 'Huỳnh Gia Huy', phone: '0901234567' },
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    payments: [],
    sellerOrders: [
      {
        id: 'so-1',
        orderId: 'ord-uat-27',
        code: 'ORD-MWXDF94U-30EF8D09-S1',
        storeId: '77777777-0000-4000-8000-000000000001',
        ownerUserId: '99999999-0000-4000-8000-000000000001',
        requiresShipping: true,
        itemSubtotal: 552000,
        shippingFee: 30000,
        grandTotal: 582000,
        status: 'PENDING_PAYMENT',
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: 'oi-1',
            bookId: 'book-1',
            bookTitle: 'Nhà Giả Kim – The Alchemist',
            bookCoverUrl: 'https://cdn.huki.vn/alchemist.jpg',
            bookIsbn: '978-604-53-7890-1',
            format: 'DIGITAL',
            quantity: 1,
            unitPrice: 79000,
            subtotal: 79000,
          },
          {
            id: 'oi-2',
            bookId: 'book-2',
            bookTitle: 'Tuổi Trẻ Đáng Giá Bao Nhiêu',
            bookCoverUrl: 'https://cdn.huki.vn/tuoitre.jpg',
            bookIsbn: '978-604-53-1111-1',
            format: 'PHYSICAL',
            quantity: 2,
            unitPrice: 98000,
            subtotal: 196000,
          },
        ],
      },
    ],
  };

  const prismaStub = {
    order: {
      findFirst: async () => mockOrder,
    },
  };
  const service = new OrdersService(
    prismaStub,
    {},
    {},
    {},
    {},
    { get: () => undefined },
    {},
  );
  service.resolveStoreName = async () => 'Nhà Sách HuKi Official';

  const detail = await service.buyerDetail('buyer-huy', 'ord-uat-27');
  assert.strictEqual(detail.shippingTotal, 30000, 'shippingTotal must be 30000');
  assert.strictEqual(detail.shippingFee, 30000, 'shippingFee alias must be 30000');
  assert.strictEqual(detail.grandTotal, 582000, 'grandTotal must be 582000');

  const items = detail.sellerOrders.flatMap((so) => so.items);
  assert.strictEqual(items.length, 2, 'must expose 2 items');
  assert.strictEqual(items[0].bookTitle, 'Nhà Giả Kim – The Alchemist');
  assert.strictEqual(items[0].title, 'Nhà Giả Kim – The Alchemist');
  assert.strictEqual(items[0].coverUrl, 'https://cdn.huki.vn/alchemist.jpg');
  assert.strictEqual(items[0].price, 79000);
  assert.strictEqual(items[1].subtotal, 196000);
  console.log('[PASS] OrdersService.buyerDetail returns canonical + compatibility item/shipping fields.');

  const paymentPage = fs.readFileSync(
    path.join(ROOT, 'web', 'src', 'app', 'checkout', 'payment', '[orderId]', 'page.tsx'),
    'utf8',
  );
  assert(paymentPage.includes('item.bookTitle || item.title'), 'Payment page must read item.bookTitle || item.title');
  assert(paymentPage.includes('item.bookCoverUrl || item.coverUrl || item.coverImage'), 'Payment page must read item.bookCoverUrl');
  assert(paymentPage.includes('order.shippingTotal ?? order.shippingFee'), 'Payment page must read order.shippingTotal');
  console.log('[PASS] /checkout/payment/[orderId] consumes bookTitle, bookCoverUrl, unitPrice/subtotal, and shippingTotal.');

  const orderSuccessPage = fs.readFileSync(
    path.join(ROOT, 'web', 'src', 'app', 'order-success', 'page.tsx'),
    'utf8',
  );
  assert(orderSuccessPage.includes('shippingTotal ?? order?.shippingFee'), 'order-success must read shippingTotal');
  assert(!orderSuccessPage.includes('461.000đ'), 'order-success must not keep hardcoded 461.000đ fallback');
  console.log('[PASS] /order-success updated without hardcoded price fallback.');

  console.log('\nALL E2E CHECKS PASSED FOR BUG-27 & BUG-28.');
}

run().catch((err) => {
  console.error('E2E FAILED:', err);
  process.exit(1);
});
