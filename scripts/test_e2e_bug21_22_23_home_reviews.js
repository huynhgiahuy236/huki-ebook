'use strict';

/**
 * E2E Verification Script: BUG-21, BUG-22, BUG-23
 * - BUG-21: Filter out violating/FLAGGED/profane/spam reviews from Home & guard public Book Detail,
 *           plus hydrate real user avatars from Identity Service (`POST /internal/users/profiles`) on both Home & Book Detail
 * - BUG-22: Home featured review card 2-column layout (Left info + engagement stats, Right 1-col book cover) & /book/[slug] navigation
 * - BUG-23: Engagement ranking by likes + comments & >=70% 5-star priority ratio
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
  console.log('=== E2E VERIFICATION: BUG-21, BUG-22, BUG-23 (HOME FEATURED REVIEWS & AVATAR HYDRATION) ===\n');

  const { Types } = require('mongoose');
  const { AutoModerationService } = require(
    path.join(PLATFORM_DIST, 'out-tsc', 'community-service', 'apps', 'community-service', 'src', 'modules', 'moderation', 'auto-moderation.service.js'),
  );
  const { ReviewsService } = require(
    path.join(PLATFORM_DIST, 'out-tsc', 'community-service', 'apps', 'community-service', 'src', 'modules', 'reviews', 'reviews.service.js'),
  );
  const { ReviewsController } = require(
    path.join(PLATFORM_DIST, 'out-tsc', 'community-service', 'apps', 'community-service', 'src', 'modules', 'reviews', 'reviews.controller.js'),
  );

  const autoModeration = new AutoModerationService();

  // Check clean vs violating filtering on exact live UAT samples
  assert.strictEqual(
    autoModeration.isCleanFeaturedContent({ content: 'đụ mẹ ngu quá', status: 'FLAGGED', isReported: true }),
    false,
    'Profane FLAGGED review must be excluded',
  );
  assert.strictEqual(
    autoModeration.isCleanFeaturedContent({ content: 'ádasdsadsadas', status: 'PUBLISHED' }),
    false,
    'Keyboard mash review must be excluded',
  );
  assert.strictEqual(
    autoModeration.isCleanFeaturedContent({ content: 'hAY NHA NÍ', status: 'PUBLISHED' }),
    true,
    'Valid Vietnamese review must pass',
  );
  console.log('[OK] AutoModeration clean featured review filters verified');

  const id5Top = new Types.ObjectId();
  const id5B = new Types.ObjectId();
  const id5C = new Types.ObjectId();
  const id5D = new Types.ObjectId();
  const id5E = new Types.ObjectId();
  const id4Top = new Types.ObjectId();
  const idProfane = new Types.ObjectId();

  const storedReviews = [
    {
      id: idProfane.toString(),
      _id: idProfane,
      targetType: 'BOOK',
      targetId: 'b1',
      rating: 5,
      title: 'Tệ',
      content: 'đụ mẹ ngu quá',
      authorId: 'u-bad',
      authorName: 'Bad Reviewer',
      helpfulCount: 50,
      status: 'FLAGGED',
      isReported: true,
      createdAt: new Date(),
    },
    {
      id: id5Top.toString(),
      _id: id5Top,
      targetType: 'BOOK',
      targetId: 'b1',
      rating: 5,
      title: 'Rất ý nghĩa',
      content: 'Sách giúp mình hiểu sâu hơn về bản thân và gia đình.',
      authorId: 'u-avatar-1',
      authorName: 'Huy Cũ',
      authorAvatar: undefined,
      verifiedPurchase: true,
      helpfulCount: 12,
      status: 'PUBLISHED',
      isReported: false,
      createdAt: new Date('2026-11-25T10:00:00Z'),
    },
    {
      id: id5B.toString(),
      _id: id5B,
      targetType: 'BOOK',
      targetId: 'b2',
      rating: 5,
      title: 'Đáng đọc',
      content: 'Giao hàng rất nhanh, sách mới nguyên seal rất thích.',
      authorId: 'u-avatar-2',
      authorName: 'Độc giả B',
      verifiedPurchase: true,
      helpfulCount: 5,
      status: 'PUBLISHED',
      isReported: false,
      createdAt: new Date('2026-11-24T10:00:00Z'),
    },
    {
      id: id5C.toString(),
      _id: id5C,
      targetType: 'BOOK',
      targetId: 'b1',
      rating: 5,
      title: 'Chất lượng',
      content: 'Bản ebook hiển thị rõ ràng, đọc trên tablet rất mượt.',
      authorId: 'u-3',
      authorName: 'Độc giả C',
      verifiedPurchase: true,
      helpfulCount: 4,
      status: 'PUBLISHED',
      isReported: false,
      createdAt: new Date('2026-11-23T10:00:00Z'),
    },
    {
      id: id5D.toString(),
      _id: id5D,
      targetType: 'BOOK',
      targetId: 'b2',
      rating: 5,
      title: 'Rất tốt',
      content: 'Nội dung dễ áp dụng vào thực tế hằng ngày.',
      authorId: 'u-4',
      authorName: 'Độc giả D',
      verifiedPurchase: true,
      helpfulCount: 2,
      status: 'PUBLISHED',
      isReported: false,
      createdAt: new Date('2026-11-22T10:00:00Z'),
    },
    {
      id: id5E.toString(),
      _id: id5E,
      targetType: 'BOOK',
      targetId: 'b1',
      rating: 5,
      title: 'Tuyệt vời',
      content: 'Văn phong nhẹ nhàng sâu sắc, rất đáng tiền mua.',
      authorId: 'u-5',
      authorName: 'Độc giả E',
      verifiedPurchase: true,
      helpfulCount: 1,
      status: 'PUBLISHED',
      isReported: false,
      createdAt: new Date('2026-11-21T10:00:00Z'),
    },
    {
      id: id4Top.toString(),
      _id: id4Top,
      targetType: 'BOOK',
      targetId: 'b2',
      rating: 4,
      title: 'Khá hay',
      content: 'Sách viết chi tiết, rất đáng tham khảo thêm nhiều góc nhìn.',
      authorId: 'u-6',
      authorName: 'Độc giả F',
      verifiedPurchase: true,
      helpfulCount: 7,
      status: 'PUBLISHED',
      isReported: false,
      createdAt: new Date('2026-11-24T12:00:00Z'),
    },
  ];

  const reviewsModel = {
    find: (query) => {
      const filtered = storedReviews.filter((r) => {
        if (query.status === 'PUBLISHED' && r.status !== 'PUBLISHED') return false;
        if (query.targetId && r.targetId !== query.targetId) return false;
        if (query.isReported?.$ne && r.isReported === true) return false;
        return true;
      });
      return {
        select() { return this; },
        sort() { return this; },
        skip() { return this; },
        limit() { return this; },
        exec: async () => filtered,
      };
    },
    countDocuments: async () => 1,
    aggregate: async () => [{ _id: 5, count: 1 }],
  };

  const repliesModel = {
    find: () => ({
      sort() { return this; },
      exec: async () => [
        {
          id: 'rep-1',
          reviewId: id5Top,
          storeId: 'store-1',
          businessName: 'NXB Trẻ',
          responderId: 'seller-1',
          content: 'Cảm ơn độc giả đã ủng hộ!',
          createdAt: new Date(),
        },
        {
          id: 'rep-2',
          reviewId: id4Top,
          storeId: 'store-1',
          businessName: 'NXB Trẻ',
          responderId: 'seller-1',
          content: 'Cảm ơn góp ý của bạn!',
          createdAt: new Date(),
        },
      ],
    }),
  };

  const verificationMock = {
    resolveUserProfiles: async (ids) => {
      const map = new Map();
      if (ids.includes('u-avatar-1')) {
        map.set('u-avatar-1', {
          fullName: 'Huỳnh Gia Huy',
          avatar: 'https://lh3.googleusercontent.com/real-user-avatar.png',
        });
      }
      return map;
    },
    fetchPublicBooksMap: async () =>
      new Map([
        ['b1', { id: 'b1', slug: 'nha-gia-kim', title: 'Nhà Giả Kim', coverUrl: 'https://cdn.huki.vn/nha-gia-kim.jpg' }],
        ['b2', { id: 'b2', slug: 'tuoi-tre-dang-gia-bao-nhieu', title: 'Tuổi Trẻ Đáng Giá Bao Nhiêu', coverUrl: 'https://cdn.huki.vn/tuoi-tre.jpg' }],
      ]),
  };

  const reviewsService = new ReviewsService(
    reviewsModel,
    repliesModel,
    verificationMock,
    { publish: async () => {} },
    autoModeration,
  );
  const controller = new ReviewsController(reviewsService);

  // Check featured endpoint behavior
  const featuredRes = await controller.getFeatured('6');
  assert(Array.isArray(featuredRes.data) && featuredRes.data.length === 6, 'Should return 6 curated reviews');
  assert(!featuredRes.data.some((r) => r.id === idProfane.toString()), 'Profane FLAGGED review must NEVER appear in featured');
  const fiveStarCount = featuredRes.data.filter((r) => r.rating === 5).length;
  assert(fiveStarCount / featuredRes.data.length >= 0.7, `Expected >=70% 5-star reviews, got ${fiveStarCount}/6`);
  assert.strictEqual(featuredRes.data[0].id, id5Top.toString(), 'Highest likes+comments 5-star review must rank #1');
  assert.strictEqual(featuredRes.data[0].author.avatar, 'https://lh3.googleusercontent.com/real-user-avatar.png', 'Real avatar from Identity must be hydrated');
  assert.strictEqual(featuredRes.data[0].bookSlug, 'nha-gia-kim', 'Book slug must be hydrated for /book/[slug] detail route');
  assert.strictEqual(featuredRes.data[0].bookCover, 'https://cdn.huki.vn/nha-gia-kim.jpg', 'Book cover must be hydrated for right column');
  console.log(`[OK] Featured reviews curated: ${fiveStarCount}/6 (${Math.round((fiveStarCount / 6) * 100)}%) 5-star, #1 score=${featuredRes.data[0].engagementScore}`);

  // Check Book Detail list behavior: anonymous public viewer gets clean PUBLISHED list + real avatar
  const bookDetailRes = await reviewsService.list('BOOK', 'b1', { page: 1, limit: 10 }, undefined);
  assert(!bookDetailRes.data.some((r) => r.id === idProfane.toString()), 'Public Book Detail list must restrict FLAGGED profanity reviews');
  const hydratedItem = bookDetailRes.data.find((r) => r.id === id5Top.toString());
  assert(hydratedItem && hydratedItem.author.avatar === 'https://lh3.googleusercontent.com/real-user-avatar.png', 'Book Detail review must also hydrate real avatar from Identity');
  console.log('[OK] Book Detail list restricts FLAGGED profanity and hydrates real Identity avatar');

  // Check Frontend Home & Book Detail contracts
  const homePage = fs.readFileSync(path.join(ROOT, 'web/src/app/page.tsx'), 'utf8');
  assert(homePage.includes('getFeaturedBookReviews'), 'Home page must fetch getFeaturedBookReviews');
  assert(homePage.includes('<UserAvatar'), 'Home page must render real UserAvatar');
  assert(homePage.includes('grid-cols-[1fr_88px] sm:grid-cols-[1fr_100px]'), 'Home card must have 2-column layout with right book cover column');
  assert(homePage.includes('/book/${rev.bookSlug}'), 'Home card must link to /book/[slug] detail route');
  assert(!homePage.includes('`/books/${rev.bookId}`'), 'Old broken /books/[id] link must be removed');

  const reviewCard = fs.readFileSync(path.join(ROOT, 'web/src/ui/components/review/ReviewCard.tsx'), 'utf8');
  assert(reviewCard.includes('isFlaggedHiddenFromPublic'), 'ReviewCard must guard FLAGGED content from public view');

  const checkoutPage = fs.readFileSync(path.join(ROOT, 'web/src/app/checkout/page.tsx'), 'utf8');
  assert(checkoutPage.includes('aria-disabled="true"'), 'Checkout 2h Express button must have aria-disabled="true"');
  assert(!checkoutPage.includes('setShippingMethod("express")'), 'Checkout 2h Express button must not allow selecting express');
  assert(checkoutPage.includes('opacity-50 cursor-not-allowed'), 'Checkout 2h Express button must be visually dimmed and non-clickable');

  console.log('\nPASS: BUG-21, BUG-22, BUG-23 & BUG-24 CHECKOUT EXPRESS GUARD E2E VERIFICATION SUCCEEDED.');
}

run().catch((err) => {
  console.error('\nFAIL:', err);
  process.exit(1);
});
