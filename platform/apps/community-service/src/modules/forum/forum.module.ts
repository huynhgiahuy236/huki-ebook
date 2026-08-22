import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  AuthenticatedCommunityGuard,
  OptionalCommunityAuthGuard,
} from '../../common/community-auth.guard';
import { Comment, CommentSchema } from '../../entities/comment.schema';
import {
  ForumCategory,
  ForumCategorySchema,
} from '../../entities/forum-category.schema';
import { Forum, ForumSchema } from '../../entities/forum.schema';
import {
  ForumCategoriesController,
  ForumCommentsController,
  ForumPostsController,
} from './forum.controller';
import { ForumService } from './forum.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Forum.name, schema: ForumSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: ForumCategory.name, schema: ForumCategorySchema },
    ]),
  ],
  controllers: [
    ForumPostsController,
    ForumCommentsController,
    ForumCategoriesController,
  ],
  providers: [
    ForumService,
    AuthenticatedCommunityGuard,
    OptionalCommunityAuthGuard,
  ],
})
export class ForumModule {}
