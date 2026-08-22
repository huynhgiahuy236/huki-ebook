import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Model, Types } from "mongoose";
import { RabbitMqEventBus } from "../../../../../libs/shared/src";
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
  UpdateReviewDto,
} from "./dto/review.dto";
import { ReviewVerificationService } from "./review-verification.service";

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
  ) {}

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

  async createBook(
    actor: CommunityActor,
    bookId: string,
    dto: CreateBookReviewDto,
    authorization: string,
  ) {
    this.assertCustomer(actor);
    await this.assertNoExisting(actor.sub, "BOOK", bookId);
    const purchase = await this.verification.bookPurchase(
      authorization,
      bookId,
      dto.format,
    );
    if (!purchase) this.purchaseRequired();
    return this.create(actor, {
      targetType: "BOOK",
      targetId: bookId,
      ...dto,
      images: this.images(dto.images),
      verifiedPurchase: true,
      orderId: purchase.orderId,
      sellerOrderId: purchase.sellerOrderId,
      storeId: purchase.storeId,
      storeOwnerId: purchase.storeOwnerId,
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
    const purchase = await this.verification.storePurchase(
      authorization,
      dto.orderId,
      storeId,
    );
    if (!purchase) this.purchaseRequired();
    const { orderId: _orderId, ...content } = dto;
    return this.create(actor, {
      targetType: "STORE",
      targetId: storeId,
      ...content,
      images: this.images(dto.images),
      verifiedPurchase: true,
      orderId: purchase.orderId,
      sellerOrderId: purchase.sellerOrderId,
      storeId,
      storeOwnerId: purchase.storeOwnerId,
    });
  }

  async update(actor: CommunityActor, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.requireOwned(actor, reviewId);
    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.title !== undefined) review.title = dto.title.trim();
    if (dto.content !== undefined) review.content = dto.content.trim();
    if (dto.images !== undefined) review.images = this.images(dto.images);
    review.status = "PENDING_REVIEW";
    review.moderatedAt = undefined;
    review.moderatedBy = undefined;
    review.moderationNote = undefined;
    await review.save();
    return {
      message: "Review updated",
      data: this.reviewView(review, actor, []),
    };
  }

  async remove(actor: CommunityActor, reviewId: string) {
    const review = await this.requireOwned(actor, reviewId);
    review.status = "DELETED";
    await review.save();
    await this.replies.updateMany(
      { reviewId: review._id, status: "ACTIVE" },
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
    if (!review) throw new NotFoundException("Review not found");
    return {
      data: {
        helpfulCount: Math.max(0, review.helpfulCount),
        isHelpful: review.helpful.includes(actor.sub),
      },
    };
  }

  async reply(
    actor: CommunityActor,
    reviewId: string,
    dto: CreateReviewReplyDto,
    authorization: string,
  ) {
    if (actor.role !== "BUSINESS") {
      throw new ForbiddenException("Business role is required");
    }
    const review = await this.reviews.findOne({
      _id: new Types.ObjectId(reviewId),
      status: "PUBLISHED",
    });
    if (!review) throw new NotFoundException("Review not found");
    const storeId =
      review.storeId ??
      (review.targetType === "STORE" ? review.targetId : undefined);
    if (!storeId) throw new ForbiddenException("Review has no verified store");
    const business = await this.verification.businessAccess(
      authorization,
      actor.sub,
      storeId,
    );
    try {
      const reply = await this.replies.create({
        reviewId: review._id,
        businessId: business.businessId,
        storeId,
        responderId: actor.sub,
        businessName: business.storeName,
        content: dto.content.trim(),
      });
      return {
        message: "Reply added",
        data: this.replyView(reply),
      };
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException("This store has already replied");
      }
      throw error;
    }
  }

  private async create(actor: CommunityActor, input: Record<string, unknown>) {
    try {
      const review = await this.reviews.create({
        ...input,
        authorId: actor.sub,
        authorName: this.actorName(actor),
        authorAvatar: actor.avatar,
        status: "PENDING_REVIEW",
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
    if (!review) throw new NotFoundException("Review not found");
    if (review.authorId !== actor.sub) {
      throw new ForbiddenException("You can only modify your own review");
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
    if (actor.role !== "USER") {
      throw new ForbiddenException("Only customers can submit reviews");
    }
  }

  private actorName(actor: CommunityActor) {
    return actor.fullName?.trim() || actor.email || "HUKI user";
  }

  private purchaseRequired(): never {
    throw new BadRequestException({
      message: "Purchase verification required",
      code: "REVIEW_PURCHASE_REQUIRED",
    });
  }

  private reviewAlreadyExists(): never {
    throw new ConflictException({
      message: "You have already reviewed this item",
      code: "REVIEW_ALREADY_EXISTS",
    });
  }

  private async publishCreated(review: ReviewDocument) {
    try {
      await this.eventBus.publish({
        eventId: randomUUID(),
        eventType: "review.created",
        occurredAt: new Date().toISOString(),
        producer: "community-service",
        version: 1,
        aggregateId: review.id,
        payload: {
          reviewId: review.id,
          authorId: review.authorId,
          targetType: review.targetType,
          targetId: review.targetId,
          rating: review.rating,
          verifiedPurchase: review.verifiedPurchase,
          storeId: review.storeId,
          storeOwnerId: review.storeOwnerId,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Could not publish review.created: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
