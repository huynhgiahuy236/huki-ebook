# Review Flow

## Overview

Flow xử lý việc đánh giá sách sau khi mua.

## Flow Diagram

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Complete│───▶│ Check   │───▶│ Validate │───▶│ Create  │
│ Order   │    │ Purchased│    │ Content │    │ Review  │
└──────────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
                       │              │              │
                       ▼              ▼              ▼
                 ┌──────────┐  ┌──────────┐    ┌──────────┐
                 │ Not     │  │ Invalid  │    │ Publish  │
                 │ Purchased│  │ Rating  │    │ Event    │
                 │ Error   │  │ Error   │    │ & Return │
                 └──────────┘  └──────────┘    └──────────┘
```

## Process

### 1. Create Review

```typescript
async createReview(userId: string, dto: CreateReviewDto) {
  // 1. Find book
  const book = await this.prisma.book.findUnique({
    where: { id: dto.bookId },
  });
  if (!book) {
    throwNotFound(ErrorCode.BOOK_NOT_FOUND);
  }

  // 2. Check if already reviewed
  const existingReview = await this.prisma.review.findFirst({
    where: { userId, bookId: dto.bookId },
  });
  if (existingReview) {
    throwConflict(ErrorCode.REVIEW_ALREADY_EXISTS);
  }

  // 3. Check if user has purchased the book
  const hasPurchased = await this.prisma.bookAccess.findFirst({
    where: {
      userId,
      bookId: dto.bookId,
      status: 'ACTIVE',
    },
  });
  // Note: Only for verified purchase reviews
  if (dto.verifiedPurchase && !hasPurchased) {
    throwBadRequest(ErrorCode.REVIEW_PURCHASE_REQUIRED);
  }

  // 4. Validate rating (1-5)
  if (dto.rating < 1 || dto.rating > 5) {
    throwBadRequest(ErrorCode.VALIDATION_ERROR, 'Rating must be between 1 and 5');
  }

  // 5. Create review
  const review = await this.prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        userId,
        bookId: dto.bookId,
        rating: dto.rating,
        title: dto.title,
        content: dto.content,
        status: 'PENDING', // Pending moderation
        verifiedPurchase: hasPurchased ? true : dto.verifiedPurchase,
      },
      include: {
        user: { select: { id: true, fullName: true, avatar: true } },
      },
    });

    // Update book rating stats
    const stats = await tx.review.aggregate({
      where: { bookId: dto.bookId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: true,
    });

    await tx.book.update({
      where: { id: dto.bookId },
      data: {
        rating: stats._avg.rating ?? 0,
        reviewCount: stats._count,
      },
    });

    return created;
  });

  // 6. Publish event for notification
  await this.eventBus.publish({
    type: 'review.created',
    payload: {
      reviewId: review.id,
      bookId: dto.bookId,
      storeOwnerId: book.storeId, // Need store owner ID
      rating: dto.rating,
    },
  });

  return review;
}
```

### 2. Update Review

```typescript
async updateReview(userId: string, reviewId: string, dto: UpdateReviewDto) {
  // 1. Find review
  const review = await this.prisma.review.findUnique({
    where: { id: reviewId },
  });
  if (!review) {
    throwNotFound(ErrorCode.REVIEW_NOT_FOUND);
  }

  // 2. Check ownership
  if (review.userId !== userId) {
    throwForbidden(ErrorCode.AUTHZ_NOT_OWNER);
  }

  // 3. Check if can edit
  if (review.status === 'MODERATED') {
    throwBadRequest(ErrorCode.REVIEW_MODERATED);
  }

  // 4. Update
  const updated = await this.prisma.$transaction(async (tx) => {
    const newRating = dto.rating ?? review.rating;
    const newContent = dto.content ?? review.content;

    const updated = await tx.review.update({
      where: { id: reviewId },
      data: {
        rating: newRating,
        content: newContent,
        title: dto.title,
        status: 'PENDING', // Re-moderate after edit
      },
      include: {
        user: { select: { id: true, fullName: true, avatar: true } },
      },
    });

    // Recalculate book stats
    const stats = await tx.review.aggregate({
      where: { bookId: review.bookId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: true,
    });

    await tx.book.update({
      where: { id: review.bookId },
      data: {
        rating: stats._avg.rating ?? 0,
        reviewCount: stats._count,
      },
    });

    return updated;
  });

  return updated;
}
```

### 3. Get Book Reviews

```typescript
async getBookReviews(bookId: string, dto: ReviewQueryDto) {
  const where: Prisma.ReviewWhereInput = {
    bookId,
    status: 'APPROVED',
  };

  if (dto.rating) {
    where.rating = dto.rating;
  }

  const [reviews, total] = await this.prisma.$transaction([
    this.prisma.review.findMany({
      where,
      orderBy: [{ helpfulCount: 'desc' }, { createdAt: 'desc' }],
      skip: (dto.page - 1) * dto.limit,
      take: dto.limit,
      include: {
        user: { select: { id: true, fullName: true, avatar: true } },
      },
    }),
    this.prisma.review.count({ where }),
  ]);

  return {
    reviews,
    pagination: {
      page: dto.page,
      limit: dto.limit,
      total,
      totalPages: Math.ceil(total / dto.limit),
    },
  };
}
```

### 4. Moderation Flow

```typescript
async moderateReview(adminId: string, reviewId: string, dto: ModerateReviewDto) {
  const review = await this.prisma.review.findUnique({
    where: { id: reviewId },
  });
  if (!review) {
    throwNotFound(ErrorCode.REVIEW_REVIEW_NOT_FOUND);
  }

  await this.prisma.$transaction(async (tx) => {
    const updated = await tx.review.update({
      where: { id: reviewId },
      data: {
        status: dto.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        moderatedBy: adminId,
        moderatedAt: new Date(),
        moderatorNote: dto.note,
      },
    });

    // If rejected, restore book rating
    if (dto.action === 'REJECTED') {
      const stats = await tx.review.aggregate({
        where: { bookId: review.bookId, status: 'APPROVED' },
        _avg: { rating: true },
        _count: true,
      });

      await tx.book.update({
        where: { id: review.bookId },
        data: {
          rating: stats._avg.rating ?? 0,
          reviewCount: stats._count,
        },
      });
    }

    return updated;
  });
}
```

## Review Status

| Status | Description |
|--------|-------------|
| PENDING | Awaiting moderation |
| APPROVED | Visible to public |
| REJECTED | Hidden, not visible |
| FLAGGED | Flagged by community |
| DELETED | Deleted by user |

## Validation Rules

| Field | Rules |
|-------|-------|
| rating | Required, integer 1-5 |
| title | Optional, max 200 chars |
| content | Optional, max 5000 chars |
| images | Optional, max 5 images |

## Error Codes

| Code | Scenario |
|------|----------|
| REVIEW_NOT_FOUND | Review doesn't exist |
| REVIEW_ALREADY_EXISTS | User already reviewed this book |
| REVIEW_PURCHASE_REQUIRED | Must purchase before reviewing |
| REVIEW_CANNOT_EDIT | Review already moderated |
| REVIEW_MODERATED | Review is under moderation |

## Key Files

| File | Description |
|------|-------------|
| `community-service/.../review.service.ts` | Review logic |
| `community-service/.../review.controller.ts` | Review API |
| `community-service/.../moderation.service.ts` | Moderation logic |
