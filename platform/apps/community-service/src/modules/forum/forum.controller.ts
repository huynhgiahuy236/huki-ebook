import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  AuthenticatedCommunityGuard,
  CommunityActor,
  OptionalCommunityAuthGuard,
} from '../../common/community-auth.guard';
import { CurrentCommunityActor } from '../../common/current-community-actor.decorator';
import {
  CreateCommentDto,
  CreateForumPostDto,
  ForumPostQueryDto,
  MongoIdParamDto,
  PopularPostQueryDto,
  UpdateForumPostDto,
} from './dto/forum.dto';
import { ForumService } from './forum.service';

@ApiTags('Forum posts')
@Controller('forum/posts')
export class ForumPostsController {
  constructor(private readonly forum: ForumService) {}

  @Get()
  @UseGuards(OptionalCommunityAuthGuard)
  list(
    @Query() query: ForumPostQueryDto,
    @CurrentCommunityActor() actor?: CommunityActor,
  ) {
    return this.forum.listPosts(query, actor);
  }

  @Get('popular')
  @UseGuards(OptionalCommunityAuthGuard)
  popular(
    @Query() query: PopularPostQueryDto,
    @CurrentCommunityActor() actor?: CommunityActor,
  ) {
    return this.forum.popularPosts(query.limit, actor);
  }

  @Get(':id/comments')
  @UseGuards(OptionalCommunityAuthGuard)
  comments(
    @Param() { id }: MongoIdParamDto,
    @CurrentCommunityActor() actor?: CommunityActor,
  ) {
    return this.forum.listComments(id, actor);
  }

  @Get(':id')
  @UseGuards(OptionalCommunityAuthGuard)
  detail(
    @Param() { id }: MongoIdParamDto,
    @CurrentCommunityActor() actor?: CommunityActor,
  ) {
    return this.forum.getPost(id, actor);
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60 * 60_000 } })
  @ApiBearerAuth()
  @UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
  create(
    @CurrentCommunityActor() actor: CommunityActor,
    @Body() dto: CreateForumPostDto,
  ) {
    return this.forum.createPost(actor, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedCommunityGuard)
  update(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
    @Body() dto: UpdateForumPostDto,
  ) {
    return this.forum.updatePost(actor, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedCommunityGuard)
  remove(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
  ) {
    return this.forum.deletePost(actor, id);
  }

  @Post(':id/like')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedCommunityGuard)
  like(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
  ) {
    return this.forum.likePost(actor, id, true);
  }

  @Delete(':id/like')
  @ApiBearerAuth()
  @UseGuards(AuthenticatedCommunityGuard)
  unlike(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
  ) {
    return this.forum.likePost(actor, id, false);
  }

  @Post(':id/comments')
  @Throttle({ default: { limit: 30, ttl: 60 * 60_000 } })
  @ApiBearerAuth()
  @UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
  addComment(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
    @Body() dto: CreateCommentDto,
  ) {
    return this.forum.addComment(actor, id, dto);
  }
}

@ApiTags('Forum comments')
@ApiBearerAuth()
@UseGuards(AuthenticatedCommunityGuard)
@Controller('forum/comments')
export class ForumCommentsController {
  constructor(private readonly forum: ForumService) {}

  @Post(':id/replies')
  @Throttle({ default: { limit: 30, ttl: 60 * 60_000 } })
  @UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
  reply(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
    @Body() dto: CreateCommentDto,
  ) {
    return this.forum.reply(actor, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
  ) {
    return this.forum.deleteComment(actor, id);
  }

  @Post(':id/like')
  like(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
  ) {
    return this.forum.likeComment(actor, id, true);
  }

  @Delete(':id/like')
  unlike(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
  ) {
    return this.forum.likeComment(actor, id, false);
  }
}

@ApiTags('Forum categories')
@Controller('forum/categories')
export class ForumCategoriesController {
  constructor(private readonly forum: ForumService) {}

  @Get()
  list() {
    return this.forum.listCategories();
  }
}
