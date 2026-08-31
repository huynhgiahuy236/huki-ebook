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
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiTooManyRequestsResponse,
} from "@nestjs/swagger";
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
  UpdateReviewDto,
} from "./dto/review.dto";
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
  @ApiResponse({ status: 200, description: "Paginated book reviews" })
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create a book review",
    description: "Creates a new review for a book. Rate limited to 10 reviews per hour.",
  })
  @ApiParam({ name: "id", description: "Book ID" })
  @ApiResponse({ status: 201, description: "Review created successfully" })
  @ApiBadRequestResponse({ description: "Invalid review data or purchase not verified" })
  @ApiNotFoundResponse({ description: "Book not found" })
  @ApiTooManyRequestsResponse({ description: "Rate limit exceeded" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
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
  @ApiResponse({ status: 200, description: "Paginated store reviews" })
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create a store review",
    description: "Creates a new review for a store. Rate limited to 10 reviews per hour.",
  })
  @ApiParam({ name: "id", description: "Store ID" })
  @ApiResponse({ status: 201, description: "Review created successfully" })
  @ApiBadRequestResponse({ description: "Invalid review data or purchase not verified" })
  @ApiNotFoundResponse({ description: "Store not found" })
  @ApiTooManyRequestsResponse({ description: "Rate limit exceeded" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
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
@ApiBearerAuth()
@UseGuards(AuthenticatedCommunityGuard)
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Patch(":id")
  @Throttle({ default: { limit: 10, ttl: 60 * 60_000 } })
  @ApiOperation({
    summary: "Update a review",
    description: "Updates an existing review. Only the author can update.",
  })
  @ApiParam({ name: "id", description: "Review ID" })
  @ApiResponse({ status: 200, description: "Review updated successfully" })
  @ApiNotFoundResponse({ description: "Review not found" })
  @ApiForbiddenResponse({ description: "Not the review author" })
  @ApiTooManyRequestsResponse({ description: "Rate limit exceeded" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  @UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
  update(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviews.update(actor, id, dto);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete a review",
    description: "Deletes a review. Only the author can delete.",
  })
  @ApiParam({ name: "id", description: "Review ID" })
  @ApiResponse({ status: 200, description: "Review deleted successfully" })
  @ApiNotFoundResponse({ description: "Review not found" })
  @ApiForbiddenResponse({ description: "Not the review author" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  remove(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
  ) {
    return this.reviews.remove(actor, id);
  }

  @Post(":id/helpful")
  @ApiOperation({
    summary: "Mark review as helpful",
    description: "Marks a review as helpful.",
  })
  @ApiParam({ name: "id", description: "Review ID" })
  @ApiResponse({ status: 200, description: "Review marked as helpful" })
  @ApiNotFoundResponse({ description: "Review not found" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  helpful(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
  ) {
    return this.reviews.helpful(actor, id, true);
  }

  @Delete(":id/helpful")
  @ApiOperation({
    summary: "Remove helpful mark from review",
    description: "Removes the helpful mark from a review.",
  })
  @ApiParam({ name: "id", description: "Review ID" })
  @ApiResponse({ status: 200, description: "Helpful mark removed" })
  @ApiNotFoundResponse({ description: "Review not found" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  unhelpful(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
  ) {
    return this.reviews.helpful(actor, id, false);
  }

  @Post(":id/reply")
  @ApiOperation({
    summary: "Reply to a review",
    description: "Adds a seller reply to a review.",
  })
  @ApiParam({ name: "id", description: "Review ID" })
  @ApiResponse({ status: 201, description: "Reply added successfully" })
  @ApiNotFoundResponse({ description: "Review not found" })
  @ApiForbiddenResponse({ description: "Not authorized to reply to this review" })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  reply(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
    @Body() dto: CreateReviewReplyDto,
    @Headers("authorization") authorization: string,
  ) {
    return this.reviews.reply(actor, id, dto, authorization);
  }
}
