/**
 * HUKI EBOOK - Forum Controller
 *
 * Handles forum posts, comments, and reactions
 */

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
} from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'List forum posts',
    description: 'Returns a paginated list of forum posts.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of posts' })
  list(
    @Query() query: ForumPostQueryDto,
    @CurrentCommunityActor() actor?: CommunityActor,
  ) {
    return this.forum.listPosts(query, actor);
  }

  @Get('popular')
  @ApiOperation({
    summary: 'Get popular forum posts',
    description: 'Returns a list of popular posts sorted by engagement.',
  })
  @ApiResponse({ status: 200, description: 'List of popular posts' })
  popular(
    @Query() query: PopularPostQueryDto,
    @CurrentCommunityActor() actor?: CommunityActor,
  ) {
    return this.forum.popularPosts(query.limit, actor);
  }

  @Get(':id/comments')
  @ApiOperation({
    summary: 'Get comments for a post',
    description: 'Returns paginated comments for a forum post.',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Paginated comments' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  comments(
    @Param() { id }: MongoIdParamDto,
    @CurrentCommunityActor() actor?: CommunityActor,
  ) {
    return this.forum.listComments(id, actor);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get forum post by ID',
    description: 'Returns a single forum post with details.',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post details' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  detail(
    @Param() { id }: MongoIdParamDto,
    @CurrentCommunityActor() actor?: CommunityActor,
  ) {
    return this.forum.getPost(id, actor);
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60 * 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new forum post',
    description: 'Creates a new forum post. Rate limited to 20 posts per hour.',
  })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  @ApiBadRequestResponse({ description: 'Invalid post data' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  @UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
  create(
    @CurrentCommunityActor() actor: CommunityActor,
    @Body() dto: CreateForumPostDto,
  ) {
    return this.forum.createPost(actor, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a forum post',
    description: 'Updates an existing forum post. Only the author can update.',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post updated successfully' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  @ApiForbiddenResponse({ description: 'Not the post author' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
  @ApiOperation({
    summary: 'Delete a forum post',
    description: 'Deletes a forum post. Only the author can delete.',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  @ApiForbiddenResponse({ description: 'Not the post author' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  @UseGuards(AuthenticatedCommunityGuard)
  remove(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
  ) {
    return this.forum.deletePost(actor, id);
  }

  @Post(':id/like')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Like a forum post',
    description: 'Toggles like on a forum post.',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Like toggled' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  @UseGuards(AuthenticatedCommunityGuard)
  like(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
  ) {
    return this.forum.likePost(actor, id, true);
  }

  @Delete(':id/like')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Unlike a forum post',
    description: 'Removes like from a forum post.',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 200, description: 'Like removed' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
  @ApiOperation({
    summary: 'Add a comment to a post',
    description: 'Adds a new comment to a forum post. Rate limited to 30 comments per hour.',
  })
  @ApiParam({ name: 'id', description: 'Post ID' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  @ApiBadRequestResponse({ description: 'Invalid comment data' })
  @ApiNotFoundResponse({ description: 'Post not found' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
@Controller('forum/comments')
export class ForumCommentsController {
  constructor(private readonly forum: ForumService) {}

  @Post(':id/replies')
  @Throttle({ default: { limit: 30, ttl: 60 * 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reply to a comment',
    description: 'Adds a reply to an existing comment.',
  })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 201, description: 'Reply added successfully' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  @UseGuards(AuthenticatedCommunityGuard, ThrottlerGuard)
  reply(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
    @Body() dto: CreateCommentDto,
  ) {
    return this.forum.reply(actor, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a comment',
    description: 'Deletes a comment. Only the author can delete.',
  })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiForbiddenResponse({ description: 'Not the comment author' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  remove(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
  ) {
    return this.forum.deleteComment(actor, id);
  }

  @Post(':id/like')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Like a comment',
    description: 'Toggles like on a comment.',
  })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Like toggled' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
  like(
    @CurrentCommunityActor() actor: CommunityActor,
    @Param() { id }: MongoIdParamDto,
  ) {
    return this.forum.likeComment(actor, id, true);
  }

  @Delete(':id/like')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Unlike a comment',
    description: 'Removes like from a comment.',
  })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Like removed' })
  @ApiNotFoundResponse({ description: 'Comment not found' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing token' })
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
  @ApiOperation({
    summary: 'Get all forum categories',
    description: 'Returns all available forum categories.',
  })
  @ApiResponse({ status: 200, description: 'List of categories' })
  list() {
    return this.forum.listCategories();
  }
}
