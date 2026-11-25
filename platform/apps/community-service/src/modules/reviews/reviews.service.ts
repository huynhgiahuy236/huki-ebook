import {
  Injectable,
  Logger,
  Optional,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Model, Types } from "mongoose";
import { RabbitMqEventBus } from "@huki/shared";
import { CommunityActor } from "../../common/community-auth.guard";
import {
  ReviewReply,
  ReviewReplyDocument,
} from "../../entities/review-reply.schema";
import {
  Review,
  ReviewDocument,
  ReviewTargetType,
} from "../../entities/review.schema";
import {
  CreateBookReviewDto,
  CreateReviewReplyDto,
  CreateStoreReviewDto,
  ReviewListQueryDto,
  SellerReviewListQueryDto,
  UpdateReviewDto,
} from "./dto/review.dto";
import { ReviewVerificationService } from "./review-verification.service";
import { AutoModerationService } from "../moderation/auto-moderation.service";
import { NotificationGateway } from "../notifications/notification.gateway";
import { NotificationDeliveryService } from "../notifications/notification-delivery.service";
import { SellerScopeResolverService } from "../notifications/seller-scope-resolver.service";
import { throwConflict, throwNotFound, throwForbidden, throwBadRequest } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectModel(Review.name)
    private readonly reviews: Model<ReviewDocument>,
    @InjectModel(ReviewReply.name)
    private readonly replies: Model<ReviewReplyDocument>,
    private readonly verification: ReviewVerificationService,
    private readonly eventBus: RabbitMqEventBus,
    private readonly autoModeration: AutoModerationService,
    @Optional() private readonly gateway?: NotificationGateway,
    @Optional() private readonly sellerScopeResolver?: SellerScopeResolverService,
    @Optional() private readonly notificationDelivery?: NotificationDeliveryService,
  ) { }

  async list(
    targetType: ReviewTargetType,
    targetId: string,
    query: ReviewListQueryDto,
    actor?: CommunityActor,
  ) {
    const publicFilter: Record<string, unknown> = {
      targetType,
      targetId,
      status: "PUBLISHED",
    };
    const listFilter = query.rating
      ? { ...publicFilter, rating: query.rating }
      : publicFilter;
    const [reviews, total, summaryRows] = await Promise.all([
      this.reviews
        .find(listFilter)
        .select("+helpful")
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.reviews.countDocuments(listFilter),
      this.reviews.aggregate<{ _id: number; count: number }>([
        { $match: publicFilter },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    const reviewIds = reviews.map((review) => review._id);
    const replies = reviewIds.length
      ? await this.replies
        .find({ reviewId: { $in: reviewIds }, status: "ACTIVE" })
        .sort({ createdAt: 1 })
        .exec()
      : [];
    const repliesByReview = new Map<string, ReviewReplyDocument[]>();
    for (const reply of replies) {
      const key = String(reply.reviewId);
      repliesByReview.set(key, [...(repliesByReview.get(key) ?? []), reply]);
    }

    return {
      data: reviews.map((review) =>
        this.reviewView(review, actor, repliesByReview.get(review.id) ?? []),
      ),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
      summary: this.summary(summaryRows),
    };
  }

  async getBatchSummaries(targetType: ReviewTargetType, targetIds: string[]) {
    if (!targetIds || !targetIds.length) {
      return {};
    }
    const cleanIds = Array.from(new Set(targetIds.filter(Boolean)));
    const rows = await this.reviews.aggregate<{
      _id: string;
      averageRating: number;
      totalReviews: number;
    }>([
      {
        $match: {
          targetType,
          targetId: { $in: cleanIds },
          status: "PUBLISHED",
        },
      },
      {
        $group: {
          _id: "$targetId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);
    const result: Record<string, { averageRating: number; totalReviews: number }> = {};
    for (const row of rows) {
      result[row._id] = {
        averageRating: Number(row.averageRating.toFixed(1)),
        totalReviews: row.totalReviews,
      };
    }
    return result;
  }

  async listMyReviews(actor: CommunityActor, query: ReviewListQueryDto) {
    const filter: Record<string, unknown> = {
      authorId: actor.sub,
      status: { $ne: "DELETED" },
    };
    if (query.rating) {
      filter.rating = query.rating;
    }
    const [reviews, total] = await Promise.all([
      this.reviews
        .find(filter)
        .select("+helpful")
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.reviews.countDocuments(filter),
    ]);
    const reviewIds = reviews.map((review) => review._id);
    const replies = reviewIds.length
      ? await this.replies
        .find({ reviewId: { $in: reviewIds }, status: "ACTIVE" })
        .sort({ createdAt: 1 })
        .exec()
      : [];
    const repliesByReview = new Map<string, ReviewReplyDocument[]>();
    for (const reply of replies) {
      const key = String(reply.reviewId);
      repliesByReview.set(key, [...(repliesByReview.get(key) ?? []), reply]);
    }

    return {
      data: reviews.map((review) =>
        this.reviewView(review, actor, repliesByReview.get(review.id) ?? []),
      ),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async listSellerReviews(actor: CommunityActor, query: SellerReviewListQueryDto) {
    const role = (actor.role ?? "").toUpperCase();
    const isAdmin = role === "PLATFORM_ADMIN" || role === "ADMIN";
    const isSeller = role === "BUSINESS" || role === "SELLER";
    if (!isSeller && !isAdmin) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
    }

    const baseFilter: Record<string, unknown> = {
      status: { $ne: "DELETED" },
    };

    if (!isAdmin) {
      const extra = actor as unknown as Record<string, unknown>;
      const targetIds = new Set<string>([actor.sub]);
      const ownerIds = new Set<string>([actor.sub]);
      if (extra.storeId) targetIds.add(String(extra.storeId));
      if (extra.businessId) targetIds.add(String(extra.businessId));

      if (this.sellerScopeResolver) {
        const scope = await this.sellerScopeResolver.resolveSellerScope(actor.sub);
        scope.storeIds.forEach((id) => targetIds.add(id));
        scope.businessIds.forEach((id) => targetIds.add(id));
        scope.ownerUserIds.forEach((id) => {
          ownerIds.add(id);
          targetIds.add(id);
        });
      }

      const idList = Array.from(targetIds);
      const ownerList = Array.from(ownerIds);
      baseFilter.$or = [
        { storeId: { $in: idList } },
        { storeOwnerId: { $in: ownerList } },
        { targetType: "STORE", targetId: { $in: idList } },
      ];
    }

    const listFilter: Record<string, unknown> = { ...baseFilter };
    if (query.rating) {
      listFilter.rating = query.rating;
    }
    if (query.targetType) {
      listFilter.targetType = query.targetType.toUpperCase();
    }
    if (query.search?.trim()) {
      const regex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      listFilter.$and = [
        {
          $or: [
            { title: regex },
            { content: regex },
            { authorName: regex },
          ],
        },
      ];
    }

    const [reviews, total, summaryRows] = await Promise.all([
      this.reviews
        .find(listFilter)
        .select("+helpful")
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.reviews.countDocuments(listFilter),
      this.reviews.aggregate<{ _id: number; count: number }>([
        { $match: baseFilter },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const reviewIds = reviews.map((review) => review._id);
    const replies = reviewIds.length
      ? await this.replies
        .find({ reviewId: { $in: reviewIds }, status: "ACTIVE" })
        .sort({ createdAt: 1 })
        .exec()
      : [];
    const repliesByReview = new Map<string, ReviewReplyDocument[]>();
    for (const reply of replies) {
      const key = String(reply.reviewId);
      repliesByReview.set(key, [...(repliesByReview.get(key) ?? []), reply]);
    }

    return {
      data: reviews.map((review) =>
        this.reviewView(review, actor, repliesByReview.get(review.id) ?? []),
      ),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
      summary: this.summary(summaryRows),
    };
  }

  async createBook(
    actor: CommunityActor,
    bookId: string,
    dto: CreateBookReviewDto,
    authorization: string,
  ) {
    this.assertCustomer(actor);
    await this.assertNoExisting(actor.sub, "BOOK", bookId);
    let purchase: any = null;
    try {
      purchase = await this.verification.bookPurchase(
        authorization,
        bookId,
        dto.format,
      );
    } catch {
      // verification service error fallback
    }

    if (!purchase) {
      throwBadRequest(ErrorCode.REVIEW_PURCHASE_REQUIRED);
    }

    let storeId: string | undefined = purchase?.storeId;
    let storeOwnerId: string | undefined = purchase?.storeOwnerId;

    if (!storeOwnerId || !storeId) {
      try {
        const bookStore = await this.verification.lookupBookStore(bookId);
        if (bookStore) {
          if (!storeId && bookStore.storeId) storeId = bookStore.storeId;
          if (!storeOwnerId && bookStore.ownerUserId) storeOwnerId = bookStore.ownerUserId;
        }
      } catch {
        // ignore lookup errors
      }
    }

    if (storeId && !storeOwnerId) {
      const resolved = await this.verification.resolveStoreOwner?.(storeId);
      storeOwnerId = resolved?.ownerUserIds?.[0];
    }

    return this.create(actor, {
      targetType: "BOOK",
      targetId: bookId,
      ...dto,
      images: this.images(dto.images),
      verifiedPurchase: Boolean(purchase),
      orderId: purchase?.orderId,
      sellerOrderId: purchase?.sellerOrderId,
      storeId,
      storeOwnerId,
    });
  }

  async createStore(
    actor: CommunityActor,
    storeId: string,
    dto: CreateStoreReviewDto,
    authorization: string,
  ) {
    this.assertCustomer(actor);
    await this.assertNoExisting(actor.sub, "STORE", storeId);
    let purchase: any = null;
    if (dto.orderId) {
      try {
        purchase = await this.verification.storePurchase(
          authorization,
          dto.orderId,
          storeId,
        );
      } catch {
        // fallback
      }
    }
    let storeOwnerId: string | undefined = purchase?.storeOwnerId;
    if (!storeOwnerId) {
      const resolved = await this.verification.resolveStoreOwner?.(storeId);
      storeOwnerId = resolved?.ownerUserIds?.[0];
    }
    const { orderId: _orderId, ...content } = dto;
    return this.create(actor, {
      targetType: "STORE",
      targetId: storeId,
      ...content,
      images: this.images(dto.images),
      verifiedPurchase: Boolean(purchase),
      orderId: purchase?.orderId || dto.orderId,
      sellerOrderId: purchase?.sellerOrderId,
      storeId,
      storeOwnerId,
    });
  }

  async update(actor: CommunityActor, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.requireOwned(actor, reviewId);
    if (dto.rating !== undefined) review!.rating = dto.rating;
    if (dto.title !== undefined) review!.title = dto.title.trim();
    if (dto.content !== undefined) review!.content = dto.content.trim();
    if (dto.images !== undefined) review!.images = this.images(dto.images);
    const moderation = this.autoModeration.inspect(
      review!.title,
      review!.content,
    );
    review!.status = moderation.flagged ? "FLAGGED" : "PUBLISHED";
    review!.moderatedAt = undefined;
    review!.moderatedBy = undefined;
    review!.moderationNote = this.autoModeration.note(moderation);
    await review!.save();
    const activeReplies =
      typeof this.replies?.find === "function"
        ? await this.replies
          .find({ reviewId: review!._id, status: "ACTIVE" })
          .sort({ createdAt: 1 })
          .exec()
        : [];
    const view = this.reviewView(review!, actor, activeReplies);
    if (review!.status === "PUBLISHED") {
      void this.emitTargetReviewEvent("review:updated", review!, { review: view });
    }
    return {
      message: "Review updated",
      data: view,
    };
  }

  async remove(actor: CommunityActor, reviewId: string) {
    const review = await this.requireOwned(actor, reviewId);
    review!.status = "DELETED";
    await review!.save();
    await this.replies.updateMany(
      { reviewId: review!._id, status: "ACTIVE" },
      { $set: { status: "DELETED" } },
    );
    return { message: "Review deleted" };
  }

  async helpful(actor: CommunityActor, reviewId: string, helpful: boolean) {
    const id = new Types.ObjectId(reviewId);
    const filter = helpful
      ? { _id: id, status: "PUBLISHED", helpful: { $ne: actor.sub } }
      : { _id: id, status: "PUBLISHED", helpful: actor.sub };
    const update = helpful
      ? { $addToSet: { helpful: actor.sub }, $inc: { helpfulCount: 1 } }
      : { $pull: { helpful: actor.sub }, $inc: { helpfulCount: -1 } };
    const updatedReview = (await this.reviews
      .findOneAndUpdate(filter, update, { new: true })
      .select("+helpful")
      .exec()) as ReviewDocument | null;
    const review =
      updatedReview ??
      ((await this.reviews
        .findOne({ _id: id, status: "PUBLISHED" })
        .select("+helpful")
        .exec()) as ReviewDocument | null);
    if (!review) throwNotFound(ErrorCode.REVIEW_NOT_FOUND);
    const helpfulCount = Math.max(0, review!.helpfulCount);
    this.gateway?.emitReviewEvent("review:helpful", {
      targetType: review!.targetType,
      targetId: review!.targetId,
      storeId: review!.storeId,
      storeOwnerId: review!.storeOwnerId,
      authorId: review!.authorId,
      reviewId: review!.id,
      helpfulCount,
    });
    return {
      data: {
        helpfulCount,
        isHelpful: review!.helpful.includes(actor.sub),
      },
    };
  }

  async reply(
    actor: CommunityActor,
    reviewId: string,
    dto: CreateReviewReplyDto,
    authorization: string,
  ) {
    const role = (actor.role ?? "").toUpperCase();
    if (role !== "BUSINESS" && role !== "SELLER") {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
    }
    const review = await this.reviews.findOne({
      _id: new Types.ObjectId(reviewId),
      status: "PUBLISHED",
    });
    if (!review) throwNotFound(ErrorCode.REVIEW_NOT_FOUND);
    let storeId: string =
      review!.storeId ??
      (review!.targetType === "STORE" ? review!.targetId : undefined) ??
      '';
    if (!storeId && review!.targetType === "BOOK") {
      const bookStore = await this.verification.lookupBookStore(review!.targetId);
      if (bookStore?.storeId) {
        storeId = bookStore.storeId;
      }
    }
    const business = await this.verification.businessAccess(
      authorization,
      actor.sub,
      storeId,
      actor,
    );
    const effectiveStoreId = storeId || business.storeId;
    try {
      const reply = await this.replies.create({
        reviewId: review!._id,
        businessId: business.businessId,
        storeId: effectiveStoreId,
        responderId: actor.sub,
        businessName: business.storeName,
        content: dto.content.trim(),
      });

      if (review?.authorId) {
        const replyEventId = randomUUID();
        const replyPayload = {
          reviewId: String(review._id),
          userId: review.authorId,
          storeName: business.storeName,
          content: dto.content.trim(),
          bookId: review.targetType === 'BOOK' ? review.targetId : undefined,
        };
        this.eventBus.publish({
          eventId: replyEventId,
          eventType: 'review.replied',
          occurredAt: new Date().toISOString(),
          producer: 'community-service',
          version: 1,
          aggregateId: String(review._id),
          payload: replyPayload,
        }).catch((err) => {
          this.logger.warn(`Failed to publish review.replied event: ${err?.message || err}`);
        });

        if (this.notificationDelivery) {
          void this.notificationDelivery.deliver({
            sourceKey: `${replyEventId}:${review.authorId}:NEW_REVIEW`,
            recipientId: review.authorId,
            recipientType: "USER",
            type: "NEW_REVIEW",
            title: `${business.storeName || 'Người bán'} đã phản hồi đánh giá của bạn`,
            message: dto.content.trim().slice(0, 140),
            actionUrl: review.targetType === 'BOOK' ? `/book/${review.targetId}#reviews` : `/orders`,
            payload: replyPayload,
          }).catch(() => null);
        }
      }

      const replyViewData = this.replyView(reply);
      this.gateway?.emitReviewEvent("review:replied", {
        targetType: review!.targetType,
        targetId: review!.targetId,
        storeId: effectiveStoreId,
        storeOwnerId: review!.storeOwnerId,
        authorId: review!.authorId,
        reviewId: String(review!._id),
        reply: replyViewData,
      });

      return {
        message: "Reply added",
        data: replyViewData,
      };
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throwConflict(ErrorCode.REVIEW_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  private async create(actor: CommunityActor, input: Record<string, unknown>) {
    try {
      const moderation = this.autoModeration.inspect(
        input.title as string,
        input.content as string,
      );
      const review = await this.reviews.create({
        ...input,
        authorId: actor.sub,
        authorName: this.actorName(actor),
        authorAvatar: actor.avatar,
        status: moderation.flagged ? "FLAGGED" : "PUBLISHED",
        moderationNote: this.autoModeration.note(moderation),
      });
      void this.publishCreated(review);
      return {
        message: "Review submitted",
        data: {
          id: review.id,
          status: review.status,
          verifiedPurchase: review.verifiedPurchase,
          createdAt: review.createdAt,
        },
      };
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        this.reviewAlreadyExists();
      }
      throw error;
    }
  }

  private async assertNoExisting(
    authorId: string,
    targetType: ReviewTargetType,
    targetId: string,
  ) {
    const exists = await this.reviews.exists({
      authorId,
      targetType,
      targetId,
      status: { $ne: "DELETED" },
    });
    if (exists) this.reviewAlreadyExists();
  }

  private async requireOwned(actor: CommunityActor, reviewId: string) {
    const review = await this.reviews.findOne({
      _id: new Types.ObjectId(reviewId),
      status: { $ne: "DELETED" },
    });
    if (!review) throwNotFound(ErrorCode.REVIEW_NOT_FOUND);
    if (review!.authorId !== actor.sub) {
      throwForbidden(ErrorCode.AUTHZ_NOT_OWNER);
    }
    return review;
  }

  private reviewView(
    review: ReviewDocument,
    actor: CommunityActor | undefined,
    replies: ReviewReplyDocument[],
  ) {
    return {
      id: review.id,
      targetType: review.targetType,
      targetId: review.targetId,
      rating: review.rating,
      title: review.title,
      content: review.content,
      author: {
        id: review.authorId,
        fullName: review.authorName,
        avatar: review.authorAvatar,
      },
      verifiedPurchase: review.verifiedPurchase,
      format: review.format,
      orderId: review.orderId,
      helpfulCount: review.helpfulCount,
      isHelpful: actor ? (review.helpful?.includes(actor.sub) ?? false) : false,
      images: review.images,
      replies: replies.map((reply) => this.replyView(reply)),
      status: review.status,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  private replyView(reply: ReviewReplyDocument) {
    return {
      id: reply.id,
      content: reply.content,
      business: { id: reply.storeId, name: reply.businessName },
      responderId: reply.responderId,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
    };
  }

  private summary(rows: Array<{ _id: number; count: number }>) {
    const ratingDistribution: Record<string, number> = {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
    };
    let totalReviews = 0;
    let ratingTotal = 0;
    for (const row of rows) {
      ratingDistribution[String(row._id)] = row.count;
      totalReviews += row.count;
      ratingTotal += row._id * row.count;
    }
    return {
      averageRating: totalReviews
        ? Number((ratingTotal / totalReviews).toFixed(2))
        : 0,
      totalReviews,
      ratingDistribution,
    };
  }

  private images(images: string[] = []) {
    return images.map((url) => ({ url }));
  }

  private assertCustomer(actor: CommunityActor) {
    if (!actor || !actor.sub) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
    }
  }

  private actorName(actor: CommunityActor) {
    return actor.fullName?.trim() || actor.email || "HUKI user";
  }

  private purchaseRequired(): never {
    throwBadRequest(ErrorCode.REVIEW_PURCHASE_REQUIRED);
    return undefined as never;
  }

  private reviewAlreadyExists(): never {
    throwConflict(ErrorCode.REVIEW_ALREADY_EXISTS);
    return undefined as never;
  }

  private async computeTargetSummary(targetType: ReviewTargetType, targetId: string) {
    const summaryRows = await this.reviews.aggregate<{ _id: number; count: number }>([
      { $match: { targetType, targetId, status: "PUBLISHED" } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return this.summary(summaryRows);
  }

  private async emitTargetReviewEvent(
    eventName: "review:created" | "review:updated",
    review: ReviewDocument,
    extra: Record<string, unknown>,
  ) {
    if (!this.gateway) return;
    try {
      const summary = await this.computeTargetSummary(review.targetType, review.targetId);
      this.gateway.emitReviewEvent(eventName, {
        targetType: review.targetType,
        targetId: review.targetId,
        storeId: review.storeId,
        storeOwnerId: review.storeOwnerId,
        authorId: review.authorId,
        summary,
        ...extra,
      });
    } catch {
      // ignore realtime summary errors
    }
  }

  private async publishCreated(review: ReviewDocument) {
    const eventId = randomUUID();
    const payload = {
      reviewId: review.id,
      authorId: review.authorId,
      targetType: review.targetType,
      targetId: review.targetId,
      rating: review.rating,
      verifiedPurchase: review.verifiedPurchase,
      storeId: review.storeId,
      storeOwnerId: review.storeOwnerId,
      reviewerName: review.authorName,
      comment: review.content,
    };

    if (review.status === "PUBLISHED") {
      const view = this.reviewView(review, undefined, []);
      void this.emitTargetReviewEvent("review:created", review, { review: view });
    }

    if (this.notificationDelivery) {
      const sellerRecipientId = review.storeOwnerId || review.storeId;
      if (sellerRecipientId) {
        void this.notificationDelivery.deliver({
          sourceKey: `${eventId}:${sellerRecipientId}:NEW_REVIEW`,
          recipientId: sellerRecipientId,
          recipientType: "BUSINESS",
          type: "NEW_REVIEW",
          title: "Có đánh giá mới",
          message: `Khách hàng vừa gửi đánh giá ${review.rating} sao.`,
          actionUrl: `/seller/reviews?reviewId=${review.id}`,
          payload,
        }).catch(() => null);
      }
      if (review.authorId) {
        void this.notificationDelivery.deliver({
          sourceKey: `${eventId}:${review.authorId}:NEW_REVIEW`,
          recipientId: review.authorId,
          recipientType: "USER",
          type: "NEW_REVIEW",
          title: "Đánh giá của bạn đã được ghi nhận",
          message: `Cảm ơn bạn đã gửi đánh giá ${review.rating} sao. Ý kiến của bạn giúp cộng đồng độc giả chọn sách tốt hơn!`,
          actionUrl: review.targetType === "BOOK" ? `/book/${review.targetId}#reviews` : "/orders",
          payload,
        }).catch(() => null);
      }
    }

    try {
      await this.eventBus.publish({
        eventId,
        eventType: "review.created",
        occurredAt: new Date().toISOString(),
        producer: "community-service",
        version: 1,
        aggregateId: review.id,
        payload,
      });
    } catch (error) {
      this.logger.warn(
        `Could not publish review.created: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
