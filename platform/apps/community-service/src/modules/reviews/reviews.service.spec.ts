import { BadRequestException, ConflictException } from "@nestjs/common";
import { Types } from "mongoose";
import { ReviewsService } from "./reviews.service";

describe("ReviewsService", () => {
  const reviews = {
    exists: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
  };
  const replies = { create: jest.fn() };
  const verification = {
    bookPurchase: jest.fn(),
    storePurchase: jest.fn(),
    businessAccess: jest.fn(),
  };
  const eventBus = { publish: jest.fn() };
  const autoModeration = {
    inspect: jest.fn().mockReturnValue({ flagged: false, reasons: [] }),
    note: jest.fn().mockReturnValue(undefined),
  };
  const service = new ReviewsService(
    reviews as any,
    replies as any,
    verification as any,
    eventBus as any,
    autoModeration as any,
  );
  const actor = {
    sub: "user-1",
    email: "user@example.com",
    fullName: "HUKI User",
    role: "USER",
  };

  beforeEach(() => jest.clearAllMocks());

  it("creates a pending verified book review with purchase metadata", async () => {
    reviews.exists.mockResolvedValue(null);
    verification.bookPurchase.mockResolvedValue({
      orderId: "order-1",
      sellerOrderId: "seller-order-1",
      storeId: "store-1",
      format: "PHYSICAL",
    });
    reviews.create.mockResolvedValue({
      id: new Types.ObjectId().toString(),
      status: "PENDING_REVIEW",
      verifiedPurchase: true,
      createdAt: new Date(),
      authorId: actor.sub,
      targetType: "BOOK",
      targetId: "book-1",
      rating: 5,
      storeId: "store-1",
    });
    eventBus.publish.mockResolvedValue(undefined);

    const result = await service.createBook(
      actor,
      "book-1",
      {
        rating: 5,
        title: "Excellent book",
        content: "A very useful and enjoyable book.",
        format: "PHYSICAL",
      },
      "Bearer token",
    );

    expect(result.data).toEqual(
      expect.objectContaining({
        status: "PENDING_REVIEW",
        verifiedPurchase: true,
      }),
    );
    expect(reviews.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        sellerOrderId: "seller-order-1",
        storeId: "store-1",
        status: "PENDING_REVIEW",
      }),
    );
  });

  it("requires a completed purchase before creating a review", async () => {
    reviews.exists.mockResolvedValue(null);
    verification.bookPurchase.mockResolvedValue(null);
    await expect(
      service.createBook(
        actor,
        "book-1",
        {
          rating: 4,
          title: "Good book",
          content: "This is a sufficiently detailed review.",
          format: "DIGITAL",
        },
        "Bearer token",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("blocks a duplicate active review before purchase lookup", async () => {
    reviews.exists.mockResolvedValue({ _id: new Types.ObjectId() });
    await expect(
      service.createBook(
        actor,
        "book-1",
        {
          rating: 4,
          title: "Good book",
          content: "This is a sufficiently detailed review.",
          format: "DIGITAL",
        },
        "Bearer token",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(verification.bookPurchase).not.toHaveBeenCalled();
  });

  it("calculates the documented rating summary", () => {
    expect(
      (service as any).summary([
        { _id: 3, count: 1 },
        { _id: 5, count: 3 },
      ]),
    ).toEqual({
      averageRating: 4.5,
      totalReviews: 4,
      ratingDistribution: { "1": 0, "2": 0, "3": 1, "4": 0, "5": 3 },
    });
  });

  it("marks helpful with an atomic idempotency condition", async () => {
    const selected = {
      exec: jest.fn().mockResolvedValue({
        helpful: [actor.sub],
        helpfulCount: 1,
      }),
    };
    reviews.findOneAndUpdate.mockReturnValue({
      select: jest.fn().mockReturnValue(selected),
    });
    const reviewId = new Types.ObjectId().toString();

    await expect(service.helpful(actor, reviewId, true)).resolves.toEqual({
      data: { helpfulCount: 1, isHelpful: true },
    });
    expect(reviews.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ helpful: { $ne: actor.sub } }),
      { $addToSet: { helpful: actor.sub }, $inc: { helpfulCount: 1 } },
      { new: true },
    );
  });
});
