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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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

@ApiTags('Forum')
@Controller('forum/posts')
export class ForumPostsController {
  constructor(private readonly forum: ForumService) {}

  @Get()
  @ApiOperation({ summary: 'List forum posts with pagination' })
  @UseGuards(OptionalCommunityAuthGuard)
  list(
    @Query() query: ForumPostQueryDto,
    @CurrentCommunityActor() actor?: CommunityActor,
  ) {
    return this.forum.listPosts(query, actor);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular forum posts' })
  @UseGuards(OptionalCommunityAuthGuard)
  popular(
    @Query() query: PopularPostQueryDto,
    @CurrentCommunityActor() actor?: CommunityActor,
  ) {
    return this.forum.popularPosts(query.limit, actor);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @UseGuards(OptionalCommunityAuthGuard)
  comments(
    @Param() { id }: MongoIdParamDto,
    @CurrentCommunityActor() actor?: CommunityActor,
  ) {
    return this.forum.listComments(id, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get forum post by ID' })
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
  @ApiOperation({ summary: 'Create a new forum post' })
  @UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
  create(
    @CurrentCommunityActor() actor: CommunityActor,
    @Body() dto: CreateForumPostDto,
  ) {
    return this.forum.createPost(actor, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a forum post' })
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
  @ApiOperation({ summary: 'Delete a forum post' })
  @UseGuards(AuthenticatedCommunityGuard)
  remove(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
  ) {
    return this.forum.deletePost(actor, id);
  }

  @Post(':id/like')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a forum post' })
  @UseGuards(AuthenticatedCommunityGuard)
  like(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
  ) {
    return this.forum.likePost(actor, id, true);
  }

  @Delete(':id/like')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlike a forum post' })
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
  @ApiOperation({ summary: 'Add a comment to a post' })
  @UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
  addComment(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
    @Body() dto: CreateCommentDto,
  ) {
    return this.forum.addComment(actor, id, dto);
  }
}

@ApiTags('Forum')
@ApiBearerAuth()
@UseGuards(AuthenticatedCommunityGuard)
@Controller('forum/comments')
export class ForumCommentsController {
  constructor(private readonly forum: ForumService) {}

  @Post(':id/replies')
  @Throttle({ default: { limit: 30, ttl: 60 * 60_000 } })
  @ApiOperation({ summary: 'Reply to a comment' })
  @UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
  reply(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
    @Body() dto: CreateCommentDto,
  ) {
    return this.forum.reply(actor, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment' })
  remove(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
  ) {
    return this.forum.deleteComment(actor, id);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Like a comment' })
  like(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
  ) {
    return this.forum.likeComment(actor, id, true);
  }

  @Delete(':id/like')
  @ApiOperation({ summary: 'Unlike a comment' })
  unlike(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
  ) {
    return this.forum.likeComment(actor, id, false);
  }
}

@ApiTags('Forum')
@Controller('forum/categories')
export class ForumCategoriesController {
  constructor(private readonly forum: ForumService) {}

  @Get()
  @ApiOperation({ summary: 'Get all forum categories' })
  list() {
    return this.forum.listCategories();
  }
}
