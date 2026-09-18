import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
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

  it("flags review with FLAGGED status when auto-moderation detects profanity/spam", async () => {
    reviews.exists.mockResolvedValue(null);
    verification.bookPurchase.mockResolvedValue({
      orderId: "order-1",
      sellerOrderId: "seller-order-1",
      storeId: "store-1",
      format: "PHYSICAL",
    });
    autoModeration.inspect.mockReturnValueOnce({
      flagged: true,
      reasons: ["PROFANITY", "EXCESSIVE_LINKS"],
    });
    autoModeration.note.mockReturnValueOnce("Auto-moderation: PROFANITY, EXCESSIVE_LINKS");

    reviews.create.mockResolvedValue({
      id: new Types.ObjectId().toString(),
      status: "FLAGGED",
      verifiedPurchase: true,
      createdAt: new Date(),
      authorId: actor.sub,
      targetType: "BOOK",
      targetId: "book-1",
      rating: 1,
      moderationNote: "Auto-moderation: PROFANITY, EXCESSIVE_LINKS",
    });

    const result = await service.createBook(
      actor,
      "book-1",
      {
        rating: 1,
        title: "Bad words scam",
        content: "Nội dung lừa đảo https://a https://b https://c",
        format: "PHYSICAL",
      },
      "Bearer token",
    );

    expect(result.data.status).toBe("FLAGGED");
    expect(reviews.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FLAGGED",
        moderationNote: "Auto-moderation: PROFANITY, EXCESSIVE_LINKS",
      }),
    );
  });

  it("re-runs auto-moderation when a review is updated", async () => {
    const mockReview: any = {
      _id: new Types.ObjectId(),
      authorId: actor.sub,
      title: "Old title",
      content: "Old content",
      rating: 5,
      status: "PUBLISHED",
      images: [],
      moderationNote: undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };
    reviews.findOne.mockResolvedValue(mockReview);

    autoModeration.inspect.mockReturnValueOnce({
      flagged: true,
      reasons: ["PROFANITY"],
    });
    autoModeration.note.mockReturnValueOnce("Auto-moderation: PROFANITY");

    const result = await service.update(actor, mockReview._id.toString(), {
      title: "Updated with scam",
      content: "Nội dung lừa đảo",
    });

    expect(mockReview.status).toBe("FLAGGED");
    expect(mockReview.moderationNote).toBe("Auto-moderation: PROFANITY");
    expect(mockReview.save).toHaveBeenCalled();
    expect(result.data.status).toBe("FLAGGED");
  });

  describe("reply", () => {
    const sellerActor = {
      sub: "seller-user-1",
      email: "seller@store.com",
      fullName: "Store Manager",
      role: "BUSINESS",
    };

    it("allows a verified store owner/member to reply to a published review", async () => {
      const reviewId = new Types.ObjectId().toString();
      const mockReview: any = {
        _id: new Types.ObjectId(reviewId),
        status: "PUBLISHED",
        storeId: "store-123",
        targetType: "BOOK",
        targetId: "book-1",
      };
      reviews.findOne.mockResolvedValue(mockReview);
      verification.businessAccess.mockResolvedValue({
        businessId: "biz-1",
        storeId: "store-123",
        storeName: "Nhà sách Fahasa",
      });
      replies.create.mockResolvedValue({
        id: "reply-1",
        content: "Cảm ơn bạn đã phản hồi, chúng tôi sẽ cải thiện chất lượng.",
        storeId: "store-123",
        businessName: "Nhà sách Fahasa",
        responderId: sellerActor.sub,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.reply(
        sellerActor,
        reviewId,
        { content: "Cảm ơn bạn đã phản hồi, chúng tôi sẽ cải thiện chất lượng." },
        "Bearer seller-token",
      );

      expect(reviews.findOne).toHaveBeenCalledWith({
        _id: expect.any(Types.ObjectId),
        status: "PUBLISHED",
      });
      expect(verification.businessAccess).toHaveBeenCalledWith(
        "Bearer seller-token",
        sellerActor.sub,
        "store-123",
      );
      expect(replies.create).toHaveBeenCalledWith({
        reviewId: mockReview._id,
        businessId: "biz-1",
        storeId: "store-123",
        responderId: sellerActor.sub,
        businessName: "Nhà sách Fahasa",
        content: "Cảm ơn bạn đã phản hồi, chúng tôi sẽ cải thiện chất lượng.",
      });
      expect(result.message).toBe("Reply added");
      expect(result.data.content).toBe("Cảm ơn bạn đã phản hồi, chúng tôi sẽ cải thiện chất lượng.");
    });

    it("blocks a buyer from replying as seller (AUTHZ_ROLE_INSUFFICIENT)", async () => {
      const reviewId = new Types.ObjectId().toString();
      await expect(
        service.reply(
          actor, // role: USER
          reviewId,
          { content: "Buyer trying to reply as seller" },
          "Bearer user-token",
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(reviews.findOne).not.toHaveBeenCalled();
    });

    it("throws NotFoundException if review does not exist or is not published", async () => {
      const reviewId = new Types.ObjectId().toString();
      reviews.findOne.mockResolvedValue(null);

      await expect(
        service.reply(
          sellerActor,
          reviewId,
          { content: "Reply to missing review" },
          "Bearer seller-token",
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws ForbiddenException if seller does not own or have access to review's store", async () => {
      const reviewId = new Types.ObjectId().toString();
      const mockReview: any = {
        _id: new Types.ObjectId(reviewId),
        status: "PUBLISHED",
        storeId: "store-other",
      };
      reviews.findOne.mockResolvedValue(mockReview);
      verification.businessAccess.mockRejectedValue(new ForbiddenException("Store access denied"));

      await expect(
        service.reply(
          sellerActor,
          reviewId,
          { content: "Trying to reply to another store's review" },
          "Bearer seller-token",
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("throws ConflictException if review already has an active reply (11000 duplicate)", async () => {
      const reviewId = new Types.ObjectId().toString();
      const mockReview: any = {
        _id: new Types.ObjectId(reviewId),
        status: "PUBLISHED",
        storeId: "store-123",
      };
      reviews.findOne.mockResolvedValue(mockReview);
      verification.businessAccess.mockResolvedValue({
        businessId: "biz-1",
        storeId: "store-123",
        storeName: "Nhà sách Fahasa",
      });
      replies.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.reply(
          sellerActor,
          reviewId,
          { content: "Second reply attempt" },
          "Bearer seller-token",
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
