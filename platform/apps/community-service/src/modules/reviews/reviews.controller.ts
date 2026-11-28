/**
 * HUKI EBOOK - Reviews Controller
 *
 * Handles book and store reviews
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { ApiSuccessResponse, ApiStandardErrors } from "@huki/shared";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import {
  AuthenticatedCommunityGuard,
  CommunityActor,
  OptionalCommunityAuthGuard,
} from "../../common/community-auth.guard";
import { CurrentCommunityActor } from "../../common/current-community-actor.decorator";
import {
  CreateBookReviewDto,
  CreateReviewReplyDto,
  CreateStoreReviewDto,
  ReviewIdParamDto,
  ReviewListQueryDto,
  ReviewTargetParamDto,
  SellerReviewListQueryDto,
  UpdateReviewDto,
} from "./dto/review.dto";
import { ReviewTargetType } from "../../entities/review.schema";
import { ReviewsService } from "./reviews.service";

@ApiTags("Reviews")
@Controller("books/:id/reviews")
export class BookReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @ApiOperation({
    summary: "List book reviews",
    description: "Returns paginated reviews for a specific book.",
  })
  @ApiParam({ name: "id", description: "Book ID" })
  @ApiSuccessResponse(undefined, { isArray: true, description: "Paginated book reviews" })
  @UseGuards(OptionalCommunityAuthGuard)
  list(
    @Param() { id }: ReviewTargetParamDto,
    @Query() query: ReviewListQueryDto,
    @CurrentCommunityActor() actor?: CommunityActor,
  ) {
    return this.reviews.list("BOOK", id, query, actor);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({
    summary: "Create a book review",
    description: "Creates a new review for a book. Rate limited to 10 reviews per hour.",
  })
  @ApiParam({ name: "id", description: "Book ID" })
  @ApiSuccessResponse(undefined, { status: 201, description: "Review created successfully" })
  @ApiStandardErrors(400, 401, 404, 429)
  @UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
  create(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewTargetParamDto,
    @Body() dto: CreateBookReviewDto,
    @Headers("authorization") authorization: string,
  ) {
    return this.reviews.createBook(actor, id, dto, authorization);
  }
}

@ApiTags("Reviews")
@Controller("stores/:id/reviews")
export class StoreReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @ApiOperation({
    summary: "List store reviews",
    description: "Returns paginated reviews for a specific store.",
  })
  @ApiParam({ name: "id", description: "Store ID" })
  @ApiSuccessResponse(undefined, { isArray: true, description: "Paginated store reviews" })
  @UseGuards(OptionalCommunityAuthGuard)
  list(
    @Param() { id }: ReviewTargetParamDto,
    @Query() query: ReviewListQueryDto,
    @CurrentCommunityActor() actor?: CommunityActor,
  ) {
    return this.reviews.list("STORE", id, query, actor);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({
    summary: "Create a store review",
    description: "Creates a new review for a store. Rate limited to 10 reviews per hour.",
  })
  @ApiParam({ name: "id", description: "Store ID" })
  @ApiSuccessResponse(undefined, { status: 201, description: "Review created successfully" })
  @ApiStandardErrors(400, 401, 404, 429)
  @UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
  create(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewTargetParamDto,
    @Body() dto: CreateStoreReviewDto,
    @Headers("authorization") authorization: string,
  ) {
    return this.reviews.createStore(actor, id, dto, authorization);
  }
}

@ApiTags("Reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get("featured")
  @ApiOperation({
    summary: "Get curated, clean featured book reviews for Homepage",
    description:
      "Returns clean published book reviews prioritized by likes/comments engagement and 70% 5-star mix, excluding flagged/reported or profane content.",
  })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiSuccessResponse(undefined, { isArray: true, description: "Featured book reviews" })
  @UseGuards(OptionalCommunityAuthGuard)
  getFeatured(@Query("limit") limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 6;
    return this.reviews.listFeatured(Number.isFinite(parsedLimit) ? parsedLimit : 6);
  }

  @Get("batch-summary")
  @ApiOperation({
    summary: "Get batch review summaries for books or stores",
    description: "Returns average rating and total review count for multiple targets without authentication.",
  })
  @ApiQuery({ name: "targetType", required: false, enum: ["BOOK", "STORE"] })
  @ApiQuery({ name: "ids", required: false, type: String, description: "Comma-separated target IDs" })
  @ApiSuccessResponse(undefined, { description: "Batch review summaries" })
  @UseGuards(OptionalCommunityAuthGuard)
  getBatchSummary(
    @Query("targetType") targetType: ReviewTargetType = "BOOK",
    @Query("ids") ids?: string,
  ) {
    const targetIds = (ids || "").split(",").map((s) => s.trim()).filter(Boolean);
    return this.reviews.getBatchSummaries(targetType, targetIds);
  }

  @Get("me")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthenticatedCommunityGuard)
  @ApiOperation({
    summary: "List current user reviews",
    description: "Returns paginated reviews submitted by current user.",
  })
  @ApiSuccessResponse(undefined, { isArray: true, description: "Paginated user reviews" })
  @ApiStandardErrors(401)
  myReviews(
    @CurrentCommunityActor() actor: CommunityActor,
    @Query() query: ReviewListQueryDto,
  ) {
    return this.reviews.listMyReviews(actor, query);
  }

  @Get("seller")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthenticatedCommunityGuard)
  @ApiOperation({
    summary: "List reviews across the authenticated seller's books and stores",
    description: "Returns paginated reviews belonging to any store, business, or book owned by the seller.",
  })
  @ApiSuccessResponse(undefined, { isArray: true, description: "Paginated seller reviews" })
  @ApiStandardErrors(401)
  sellerReviews(
    @CurrentCommunityActor() actor: CommunityActor,
    @Query() query: SellerReviewListQueryDto,
  ) {
    return this.reviews.listSellerReviews(actor, query);
  }

  @Patch(":id")
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
  @ApiOperation({
    summary: "Update a review",
    description: "Updates an existing review. Only the author can update.",
  })
  @ApiParam({ name: "id", description: "Review ID" })
  @ApiSuccessResponse(undefined, { description: "Review updated successfully" })
  @ApiStandardErrors(400, 401, 403, 404, 429)
  update(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviews.update(actor, id, dto);
  }

  @Delete(":id")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthenticatedCommunityGuard)
  @ApiOperation({
    summary: "Delete a review",
    description: "Deletes a review. Only the author can delete.",
  })
  @ApiParam({ name: "id", description: "Review ID" })
  @ApiSuccessResponse(undefined, { description: "Review deleted successfully" })
  @ApiStandardErrors(401, 403, 404)
  remove(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
  ) {
    return this.reviews.remove(actor, id);
  }

  @Post(":id/helpful")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthenticatedCommunityGuard)
  @ApiOperation({
    summary: "Mark review as helpful",
    description: "Marks a review as helpful.",
  })
  @ApiParam({ name: "id", description: "Review ID" })
  @ApiSuccessResponse(undefined, { status: 201, description: "Review marked as helpful" })
  @ApiStandardErrors(401, 404)
  helpful(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
  ) {
    return this.reviews.helpful(actor, id, true);
  }

  @Delete(":id/helpful")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthenticatedCommunityGuard)
  @ApiOperation({
    summary: "Remove helpful mark from review",
    description: "Removes the helpful mark from a review.",
  })
  @ApiParam({ name: "id", description: "Review ID" })
  @ApiSuccessResponse(undefined, { description: "Helpful mark removed" })
  @ApiStandardErrors(401, 404)
  unhelpful(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
  ) {
    return this.reviews.helpful(actor, id, false);
  }

  @Post(":id/reply")
  @ApiBearerAuth("JWT-auth")
  @UseGuards(AuthenticatedCommunityGuard)
  @ApiOperation({
    summary: "Reply to a review",
    description: "Adds a seller reply to a review.",
  })
  @ApiParam({ name: "id", description: "Review ID" })
  @ApiSuccessResponse(undefined, { status: 201, description: "Reply added successfully" })
  @ApiStandardErrors(400, 401, 403, 404)
  reply(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
    @Body() dto: CreateReviewReplyDto,
    @Headers("authorization") authorization: string,
  ) {
    return this.reviews.reply(actor, id, dto, authorization);
  }
}
