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
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
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

@ApiTags("Book reviews")
@Controller("books/:id/reviews")
export class BookReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @UseGuards(OptionalCommunityAuthGuard)
  list(
    @Param() { id }: ReviewTargetParamDto,
    @Query() query: ReviewListQueryDto,
    @CurrentCommunityActor() actor?: CommunityActor,
  ) {
    return this.reviews.list("BOOK", id, query, actor);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthenticatedCommunityGuard)
  create(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewTargetParamDto,
    @Body() dto: CreateBookReviewDto,
    @Headers("authorization") authorization: string,
  ) {
    return this.reviews.createBook(actor, id, dto, authorization);
  }
}

@ApiTags("Store reviews")
@Controller("stores/:id/reviews")
export class StoreReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @UseGuards(OptionalCommunityAuthGuard)
  list(
    @Param() { id }: ReviewTargetParamDto,
    @Query() query: ReviewListQueryDto,
    @CurrentCommunityActor() actor?: CommunityActor,
  ) {
    return this.reviews.list("STORE", id, query, actor);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthenticatedCommunityGuard)
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
  update(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviews.update(actor, id, dto);
  }

  @Delete(":id")
  remove(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
  ) {
    return this.reviews.remove(actor, id);
  }

  @Post(":id/helpful")
  helpful(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
  ) {
    return this.reviews.helpful(actor, id, true);
  }

  @Delete(":id/helpful")
  unhelpful(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
  ) {
    return this.reviews.helpful(actor, id, false);
  }

  @Post(":id/reply")
  reply(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: ReviewIdParamDto,
    @Body() dto: CreateReviewReplyDto,
    @Headers("authorization") authorization: string,
  ) {
    return this.reviews.reply(actor, id, dto, authorization);
  }
}
