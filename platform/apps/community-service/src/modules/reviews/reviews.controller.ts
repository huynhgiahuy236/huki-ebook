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
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
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
  @ApiOperation({ summary: "List book reviews with pagination" })
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
  @ApiOperation({ summary: "Create a book review" })
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
  @ApiOperation({ summary: "List store reviews with pagination" })
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
  @ApiOperation({ summary: "Create a store review" })
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
  @ApiOperation({ summary: "Update a review" })
  @UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
  update(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviews.update(actor, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a review" })
  remove(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
  ) {
    return this.reviews.remove(actor, id);
  }

  @Post(":id/helpful")
  @ApiOperation({ summary: "Mark review as helpful" })
  helpful(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
  ) {
    return this.reviews.helpful(actor, id, true);
  }

  @Delete(":id/helpful")
  @ApiOperation({ summary: "Remove helpful mark from review" })
  unhelpful(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
  ) {
    return this.reviews.helpful(actor, id, false);
  }

  @Post(":id/reply")
  @ApiOperation({ summary: "Reply to a review" })
  reply(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
    @Body() dto: CreateReviewReplyDto,
    @Headers("authorization") authorization: string,
  ) {
    return this.reviews.reply(actor, id, dto, authorization);
  }
}
