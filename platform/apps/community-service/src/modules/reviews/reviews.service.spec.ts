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
  const replies = {
    create: jest.fn(),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    }),
  };
  const verification = {
    bookPurchase: jest.fn(),
    storePurchase: jest.fn(),
    businessAccess: jest.fn(),
    lookupBookStore: jest.fn(),
    resolveStoreOwner: jest.fn(),
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
      status: "PUBLISHED",
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
        status: "PUBLISHED",
        verifiedPurchase: true,
      }),
    );
    expect(reviews.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-1",
        sellerOrderId: "seller-order-1",
        storeId: "store-1",
        status: "PUBLISHED",
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
        sellerActor,
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

  it("falls back to resolveStoreOwner when creating a book review with missing storeOwnerId", async () => {
    reviews.exists.mockResolvedValue(null);
    verification.bookPurchase.mockResolvedValue({
      orderId: "order-99",
      sellerOrderId: "seller-order-99",
      storeId: "store-99",
      storeOwnerId: undefined,
    });
    verification.resolveStoreOwner.mockResolvedValue({
      businessIds: ["biz-99"],
      storeIds: ["store-99"],
      ownerUserIds: ["owner-99"],
    });
    reviews.create.mockResolvedValue({
      id: "rev-99",
      authorId: actor.sub,
      targetType: "BOOK",
      targetId: "book-99",
      rating: 5,
      verifiedPurchase: true,
      storeId: "store-99",
      storeOwnerId: "owner-99",
      status: "PUBLISHED",
      createdAt: new Date(),
    });

    await service.createBook(
      actor,
      "book-99",
      { rating: 5, title: "Rất đáng đọc", content: "Sách rất hay và giao hàng nhanh", format: "PHYSICAL" },
      "Bearer token",
    );

    expect(verification.resolveStoreOwner).toHaveBeenCalledWith("store-99");
    expect(reviews.create).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: "store-99",
        storeOwnerId: "owner-99",
      }),
    );
  });

  it("lists seller reviews across resolved storeIds, businessIds, and ownerUserIds", async () => {
    const gateway = { emitReviewEvent: jest.fn() };
    const scopeResolver = {
      resolveSellerScope: jest.fn().mockResolvedValue({
        businessIds: ["7777-biz"],
        storeIds: ["8888-store"],
        ownerUserIds: ["9999-owner"],
      }),
    };
    const scopedReviews = {
      ...reviews,
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue([]),
    };
    const svc = new ReviewsService(
      scopedReviews as any,
      replies as any,
      verification as any,
      eventBus as any,
      autoModeration as any,
      gateway as any,
      scopeResolver as any,
    );

    await svc.listSellerReviews(
      { sub: "staff-1", role: "BUSINESS" },
      { page: 1, limit: 20 },
    );

    expect(scopeResolver.resolveSellerScope).toHaveBeenCalledWith("staff-1");
    expect(scopedReviews.find).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          {
            storeId: {
              $in: expect.arrayContaining(["staff-1", "8888-store", "7777-biz", "9999-owner"]),
            },
          },
          {
            storeOwnerId: { $in: expect.arrayContaining(["staff-1", "9999-owner"]) },
          },
        ]),
      }),
    );
  });

  it("emits realtime review:helpful event with updated helpfulCount", async () => {
    const gateway = { emitReviewEvent: jest.fn() };
    const id = new Types.ObjectId().toString();
    const reviewDoc = {
      id,
      targetType: "BOOK",
      targetId: "book-1",
      storeId: "store-1",
      storeOwnerId: "owner-1",
      authorId: "author-2",
      helpful: [actor.sub],
      helpfulCount: 1,
    };
    reviews.findOneAndUpdate.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(reviewDoc),
      }),
    });

    const svc = new ReviewsService(
      reviews as any,
      replies as any,
      verification as any,
      eventBus as any,
      autoModeration as any,
      gateway as any,
    );

    const res = await svc.helpful(actor, id, true);

    expect(res.data).toEqual({ helpfulCount: 1, isHelpful: true });
    expect(gateway.emitReviewEvent).toHaveBeenCalledWith(
      "review:helpful",
      expect.objectContaining({
        reviewId: id,
        targetId: "book-1",
        storeId: "store-1",
        helpfulCount: 1,
      }),
    );
  });

  it("triggers moderationService.createAutoFlagReport when review contains profanity", async () => {
    const id = new Types.ObjectId();
    const gateway = { emitReviewEvent: jest.fn() };
    const moderationService = {
      createAutoFlagReport: jest.fn().mockResolvedValue({ id: "auto-rep-99" }),
    };
    reviews.exists.mockResolvedValue(null);
    autoModeration.inspect.mockReturnValue({
      flagged: true,
      reasons: ["PROFANITY"],
      matchedKeywords: ["lừa đảo"],
      violationCategory: "LANGUAGE_VIOLATION",
    });
    verification.bookPurchase.mockResolvedValue({
      orderId: "order-1",
      sellerOrderId: "so-1",
      storeId: "store-1",
      storeOwnerId: "owner-1",
      format: "PHYSICAL",
    });
    reviews.create.mockResolvedValue({
      id: id.toString(),
      _id: id,
      targetType: "BOOK",
      targetId: "book-1",
      storeId: "store-1",
      storeOwnerId: "owner-1",
      authorId: "user-1",
      authorName: "User 1",
      rating: 1,
      content: "Sách lừa đảo đừng mua",
      status: "PUBLISHED",
      isReported: true,
      reportCount: 1,
      lastReportReason: "LANGUAGE_VIOLATION",
      createdAt: new Date(),
    });

    const svc = new ReviewsService(
      reviews as any,
      replies as any,
      verification as any,
      eventBus as any,
      autoModeration as any,
      gateway as any,
      undefined,
      undefined,
      moderationService as any,
    );

    await svc.createBook(
      { sub: "user-1", fullName: "User 1", email: "u1@test.com", role: "USER" } as any,
      "book-1",
      { rating: 1, content: "Sách lừa đảo đừng mua" } as any,
      "Bearer test-token",
    );

    expect(moderationService.createAutoFlagReport).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: "REVIEW",
        targetId: id.toString(),
        reasons: ["PROFANITY"],
        matchedKeywords: ["lừa đảo"],
      }),
    );
  });

  it("restricts FLAGGED reviews from anonymous public book detail list and hydrates real user avatars from Identity", async () => {
    const reviewDoc = {
      id: new Types.ObjectId().toString(),
      _id: new Types.ObjectId(),
      targetType: "BOOK",
      targetId: "book-1",
      rating: 5,
      title: "Tuyệt vời",
      content: "Sách rất hay và bổ ích cho mọi lứa tuổi",
      authorId: "buyer-avatar-1",
      authorName: "Tên cũ",
      authorAvatar: undefined,
      verifiedPurchase: true,
      helpfulCount: 3,
      helpful: [],
      images: [],
      status: "PUBLISHED",
      isReported: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const listReviewsModel: any = {
      ...reviews,
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([reviewDoc]),
      }),
      countDocuments: jest.fn().mockResolvedValue(1),
      aggregate: jest.fn().mockResolvedValue([{ _id: 5, count: 1 }]),
    };

    const verificationWithIdentity: any = {
      ...verification,
      resolveUserProfiles: jest.fn().mockResolvedValue(
        new Map([
          [
            "buyer-avatar-1",
            {
              fullName: "Huỳnh Gia Huy",
              avatar: "https://lh3.googleusercontent.com/real-avatar.jpg",
            },
          ],
        ]),
      ),
    };

    const svc = new ReviewsService(
      listReviewsModel,
      replies as any,
      verificationWithIdentity,
      eventBus as any,
      autoModeration as any,
    );

    const res = await svc.list("BOOK", "book-1", { page: 1, limit: 10 }, undefined);

    expect(listReviewsModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: "BOOK",
        targetId: "book-1",
        status: "PUBLISHED",
      }),
    );
    expect(verificationWithIdentity.resolveUserProfiles).toHaveBeenCalledWith(["buyer-avatar-1"]);
    expect(res.data[0].author.avatar).toBe("https://lh3.googleusercontent.com/real-avatar.jpg");
    expect(res.data[0].author.fullName).toBe("Huỳnh Gia Huy");
  });

  it("curates featured reviews by excluding violations, hydrating avatars/books, ranking by likes+comments, and enforcing >=70% 5-star priority", async () => {
    const idFiveHigh = new Types.ObjectId();
    const idFiveMid = new Types.ObjectId();
    const idFiveLow = new Types.ObjectId();
    const idFiveExtra = new Types.ObjectId();
    const idFourHigh = new Types.ObjectId();
    const idFourLow = new Types.ObjectId();
    const idProfane = new Types.ObjectId();

    const docs: any[] = [
      {
        id: idProfane.toString(),
        _id: idProfane,
        targetType: "BOOK",
        targetId: "b1",
        rating: 5,
        title: "Chửi",
        content: "đụ mẹ ngu quá",
        authorId: "u-bad",
        authorName: "Bad User",
        helpfulCount: 99,
        status: "PUBLISHED",
        isReported: false,
        createdAt: new Date(),
      },
      {
        id: idFiveLow.toString(),
        _id: idFiveLow,
        targetType: "BOOK",
        targetId: "b1",
        rating: 5,
        title: "Hay",
        content: "Sách rất hay và đáng mua để đọc nhiều lần",
        authorId: "u1",
        authorName: "Độc giả 1",
        helpfulCount: 1,
        status: "PUBLISHED",
        createdAt: new Date("2026-11-20T00:00:00Z"),
      },
      {
        id: idFiveHigh.toString(),
        _id: idFiveHigh,
        targetType: "BOOK",
        targetId: "b2",
        rating: 5,
        title: "Rất giá trị",
        content: "Cuốn sách thay đổi tư duy tài chính cá nhân của mình",
        authorId: "u2",
        authorName: "Độc giả 2",
        helpfulCount: 8,
        status: "PUBLISHED",
        createdAt: new Date("2026-11-22T00:00:00Z"),
      },
      {
        id: idFiveMid.toString(),
        _id: idFiveMid,
        targetType: "BOOK",
        targetId: "b1",
        rating: 5,
        title: "Giao nhanh",
        content: "Đóng gói cẩn thận, giấy đẹp, nội dung chất lượng cao",
        authorId: "u3",
        authorName: "Độc giả 3",
        helpfulCount: 4,
        status: "PUBLISHED",
        createdAt: new Date("2026-11-21T00:00:00Z"),
      },
      {
        id: idFiveExtra.toString(),
        _id: idFiveExtra,
        targetType: "BOOK",
        targetId: "b1",
        rating: 5,
        title: "Khuyên đọc",
        content: "Ngôn từ súc tích, dễ hiểu cho người mới bắt đầu",
        authorId: "u4",
        authorName: "Độc giả 4",
        helpfulCount: 3,
        status: "PUBLISHED",
        createdAt: new Date("2026-11-19T00:00:00Z"),
      },
      {
        id: idFourHigh.toString(),
        _id: idFourHigh,
        targetType: "BOOK",
        targetId: "b2",
        rating: 4,
        title: "Tốt",
        content: "Nội dung rất ổn, trình bày rõ ràng dễ theo dõi",
        authorId: "u5",
        authorName: "Độc giả 5",
        helpfulCount: 6,
        status: "PUBLISHED",
        createdAt: new Date("2026-11-23T00:00:00Z"),
      },
      {
        id: idFourLow.toString(),
        _id: idFourLow,
        targetType: "BOOK",
        targetId: "b1",
        rating: 4,
        title: "Khá hay",
        content: "Sách hữu ích cho sinh viên năm cuối tham khảo",
        authorId: "u6",
        authorName: "Độc giả 6",
        helpfulCount: 0,
        status: "PUBLISHED",
        createdAt: new Date("2026-11-18T00:00:00Z"),
      },
    ];

    const featuredReviewsModel: any = {
      ...reviews,
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(docs),
      }),
    };
    const featuredRepliesModel: any = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          { id: "rep-1", reviewId: idFiveHigh, storeId: "s1", businessName: "Shop", responderId: "sel1", content: "Cảm ơn bạn!" },
          { id: "rep-2", reviewId: idFourHigh, storeId: "s1", businessName: "Shop", responderId: "sel1", content: "Cảm ơn bạn!" },
        ]),
      }),
    };
    const featuredVerification: any = {
      ...verification,
      resolveUserProfiles: jest.fn().mockResolvedValue(
        new Map([["u2", { fullName: "Độc giả 2", avatar: "https://cdn.huki.vn/u2.png" }]]),
      ),
      fetchPublicBooksMap: jest.fn().mockResolvedValue(
        new Map([
          ["b1", { id: "b1", slug: "nha-gia-kim", title: "Nhà Giả Kim", coverUrl: "https://cdn.huki.vn/b1.jpg" }],
          ["b2", { id: "b2", slug: "tuoi-tre", title: "Tuổi Trẻ Đáng Giá", coverUrl: "https://cdn.huki.vn/b2.jpg" }],
        ]),
      ),
    };
    const realAutoMod = new (require("../moderation/auto-moderation.service").AutoModerationService)();

    const svc = new ReviewsService(
      featuredReviewsModel,
      featuredRepliesModel,
      featuredVerification,
      eventBus as any,
      realAutoMod,
    );

    const res = await svc.listFeatured(4);

    expect(res.data.length).toBe(4);
    expect(res.data.some((r: any) => r.id === idProfane.toString())).toBe(false);
    // Out of 4 slots, >=70% => at least 3 five-star reviews + 1 highest-engaged 4-star
    const fiveStarCount = res.data.filter((r: any) => r.rating === 5).length;
    expect(fiveStarCount).toBeGreaterThanOrEqual(3);
    expect(res.data[0].id).toBe(idFiveHigh.toString());
    expect(res.data[0].author.avatar).toBe("https://cdn.huki.vn/u2.png");
    expect(res.data[0].bookCover).toBe("https://cdn.huki.vn/b2.jpg");
    expect(res.data[0].bookSlug).toBe("tuoi-tre");
    expect(res.data[0].likesCount).toBe(8);
    expect(res.data[0].commentsCount).toBe(1);
  });
});
