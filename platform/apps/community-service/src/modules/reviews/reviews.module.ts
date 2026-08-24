import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerModule } from "@nestjs/throttler";
import { EventsModule } from "../../../../../libs/shared/src";
import {
  AuthenticatedCommunityGuard,
  OptionalCommunityAuthGuard,
} from "../../common/community-auth.guard";
import {
  ReviewReply,
  ReviewReplySchema,
} from "../../entities/review-reply.schema";
import { Review, ReviewSchema } from "../../entities/review.schema";
import {
  BookReviewsController,
  ReviewsController,
  StoreReviewsController,
} from "./reviews.controller";
import { ReviewVerificationService } from "./review-verification.service";
import { ReviewsService } from "./reviews.service";
import { ModerationModule } from "../moderation/moderation.module";

@Module({
  imports: [
    ModerationModule,
    ThrottlerModule.forRoot([{ ttl: 60 * 60_000, limit: 10 }]),
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: ReviewReply.name, schema: ReviewReplySchema },
    ]),
    EventsModule,
  ],
  controllers: [
    BookReviewsController,
    StoreReviewsController,
    ReviewsController,
  ],
  providers: [
    ReviewsService,
    ReviewVerificationService,
    AuthenticatedCommunityGuard,
    OptionalCommunityAuthGuard,
  ],
})
export class ReviewsModule {}
