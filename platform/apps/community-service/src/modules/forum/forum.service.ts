import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes, randomUUID } from 'crypto';
import { FilterQuery, Model, Types } from 'mongoose';
import { RabbitMqEventBus } from '@huki/shared';
import { CommunityActor } from '../../common/community-auth.guard';
import { Comment } from '../../entities/comment.schema';
import { ForumCategory } from '../../entities/forum-category.schema';
import { Forum } from '../../entities/forum.schema';
import {
  CreateCommentDto,
  CreateForumPostDto,
  ForumPostQueryDto,
  UpdateForumPostDto,
} from './dto/forum.dto';
import { AutoModerationService } from '../moderation/auto-moderation.service';
import { throwConflict, throwNotFound, throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

const DEFAULT_CATEGORIES = [
  { name: 'Thảo luận chung', slug: 'general', icon: '💬', sortOrder: 1 },
  { name: 'Review sách', slug: 'reviews', icon: '📚', sortOrder: 2 },
  { name: 'Hỏi đáp', slug: 'qa', icon: '❓', sortOrder: 3 },
];

@Injectable()
export class ForumService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ForumService.name);

  constructor(
    @InjectModel(Forum.name) private readonly forums: Model<Forum>,
    @InjectModel(Comment.name) private readonly comments: Model<Comment>,
    @InjectModel(ForumCategory.name)
    private readonly categories: Model<ForumCategory>,
    private readonly eventBus: RabbitMqEventBus,
    private readonly autoModeration: AutoModerationService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await Promise.all(
      DEFAULT_CATEGORIES.map((category) =>
        this.categories.updateOne(
          { slug: category.slug },
          { $setOnInsert: { ...category, isActive: true } },
          { upsert: true },
        ),
      ),
    );
  }

  async listPosts(query: ForumPostQueryDto, actor?: CommunityActor) {
    const where: FilterQuery<Forum> = { status: 'PUBLISHED' };
    if (query.category) {
      const category = await this.findCategory(query.category);
      where.categoryId = category!._id;
    }
    if (query.search) where.$text = { $search: query.search };

    const direction = query.order === 'asc' ? 1 : -1;
    const sortField = {
      created_at: 'createdAt',
      view_count: 'viewCount',
      like_count: 'likeCount',
    }[query.sort];
    const sort: Record<string, any> = query.search
      ? { score: { $meta: 'textScore' }, isPinned: -1, [sortField]: direction }
      : { isPinned: -1, [sortField]: direction };

    let cursor = this.forums
      .find(where, query.search ? { score: { $meta: 'textScore' } } : undefined)
      .populate('categoryId')
      .sort(sort)
      .skip((query.page - 1) * query.limit)
      .limit(query.limit);
    if (actor) cursor = cursor.select('+likes');
    const [items, total] = await Promise.all([
      cursor.lean(),
      this.forums.countDocuments(where),
    ]);
    return {
      data: items.map((post) => this.postView(post, actor)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async popularPosts(limit: number, actor?: CommunityActor) {
    let query = this.forums
      .find({ status: 'PUBLISHED' })
      .populate('categoryId')
      .sort({
        isPinned: -1,
        viewCount: -1,
        likeCount: -1,
        commentCount: -1,
        createdAt: -1,
      })
      .limit(limit);
    if (actor) query = query.select('+likes');
    const posts = await query.lean();
    return { data: posts.map((post) => this.postView(post, actor)) };
  }

  async getPost(id: string, actor?: CommunityActor) {
    const post = await this.findPost(id, actor, true);
    if (post!.status === 'PUBLISHED') {
      await this.forums.updateOne(
        { _id: post!._id },
        { $inc: { viewCount: 1 } },
      );
      post!.viewCount += 1;
    }
    const comments = await this.commentTree(post!._id.toString(), actor);
    return { data: { ...this.postView(post!, actor), comments } };
  }

  async createPost(actor: CommunityActor, dto: CreateForumPostDto) {
    const category = await this.activeCategory(dto.categoryId);
    const moderation = this.autoModeration.inspect(
      dto.title,
      dto.content,
      dto.tags,
    );
    const post = await this.forums.create({
      title: dto.title.trim(),
      slug: this.slug(dto.title),
      content: dto.content.trim(),
      authorId: actor.sub,
      authorName: actor.fullName ?? actor.email ?? actor.sub,
      authorAvatar: actor.avatar,
      categoryId: category!._id,
      tags: this.tags(dto.tags),
      coverImage: dto.coverImage,
      bookId: dto.bookId,
      storeId: dto.storeId,
      status: moderation.flagged ? 'FLAGGED' : 'PENDING_REVIEW',
      moderationNote: this.autoModeration.note(moderation),
    });
    return {
      message: 'Post created successfully',
      data: {
        id: post._id.toString(),
        title: post.title,
        status: post.status,
        createdAt: post.createdAt,
      },
    };
  }

  async updatePost(actor: CommunityActor, id: string, dto: UpdateForumPostDto) {
    const post = await this.ownedPost(actor, id);
    if (post!.status === 'DELETED')
      throwConflict(ErrorCode.FORUM_POST_DELETED);
    if (dto.categoryId) await this.activeCategory(dto.categoryId);
    const moderation = this.autoModeration.inspect(
      dto.title ?? post!.title,
      dto.content ?? post!.content,
      dto.tags ?? post!.tags,
    );
    const updated = await this.forums.findByIdAndUpdate(
      post!._id,
      {
        $set: {
          ...(dto.title ? { title: dto.title.trim() } : {}),
          ...(dto.content ? { content: dto.content.trim() } : {}),
          ...(dto.categoryId
            ? { categoryId: new Types.ObjectId(dto.categoryId) }
            : {}),
          ...(dto.tags ? { tags: this.tags(dto.tags) } : {}),
          ...(dto.coverImage !== undefined
            ? { coverImage: dto.coverImage }
            : {}),
          ...(dto.bookId !== undefined ? { bookId: dto.bookId } : {}),
          ...(dto.storeId !== undefined ? { storeId: dto.storeId } : {}),
          status: moderation.flagged ? 'FLAGGED' : 'PENDING_REVIEW',
          ...(moderation.flagged
            ? { moderationNote: this.autoModeration.note(moderation) }
            : {}),
        },
        $unset: {
          moderatedBy: 1,
          moderatedAt: 1,
          ...(!moderation.flagged ? { moderationNote: 1 } : {}),
        },
      },
      { new: true, runValidators: true },
    );
    return {
      message: 'Post updated successfully',
      data: {
        id: updated!._id.toString(),
        title: updated!.title,
        updatedAt: updated!.updatedAt,
      },
    };
  }

  async deletePost(actor: CommunityActor, id: string) {
    const post = await this.ownedPost(actor, id);
    if (post!.status !== 'DELETED') {
      await Promise.all([
        this.forums.updateOne(
          { _id: post!._id },
          { $set: { status: 'DELETED' } },
        ),
        this.comments.updateMany(
          { postId: post!._id },
          { $set: { status: 'DELETED' } },
        ),
      ]);
    }
    return { message: 'Post deleted successfully' };
  }

  async likePost(actor: CommunityActor, id: string, like: boolean) {
    this.assertId(id);
    const filter: FilterQuery<Forum> = {
      _id: new Types.ObjectId(id),
      status: 'PUBLISHED',
      likes: like ? { $ne: actor.sub } : actor.sub,
    };
    const update = like
      ? { $addToSet: { likes: actor.sub }, $inc: { likeCount: 1 } }
      : { $pull: { likes: actor.sub }, $inc: { likeCount: -1 } };
    let post = await this.forums
      .findOneAndUpdate(filter, update, { new: true })
      .select('+likes');
    if (!post)
      post = await this.forums
        .findOne({ _id: id, status: 'PUBLISHED' })
        .select('+likes');
    if (!post) throwNotFound(ErrorCode.FORUM_POST_NOT_FOUND);
    return {
      data: {
        isLiked: post!.likes.includes(actor.sub),
        likeCount: post!.likeCount,
      },
    };
  }

  async listComments(postId: string, actor?: CommunityActor) {
    await this.findPost(postId, actor, false);
    return { data: await this.commentTree(postId, actor) };
  }

  async addComment(
    actor: CommunityActor,
    postId: string,
    dto: CreateCommentDto,
  ) {
    const post = await this.publishedPost(postId);
    if (post!.isLocked)
      throwConflict(ErrorCode.FORUM_POST_LOCKED);
    const moderation = this.autoModeration.inspect(dto.content);
    const comment = await this.comments.create({
      postId: post!._id,
      content: dto.content.trim(),
      authorId: actor.sub,
      authorName: actor.fullName ?? actor.email ?? actor.sub,
      authorAvatar: actor.avatar,
      status: moderation.flagged ? 'FLAGGED' : 'PUBLISHED',
      moderationNote: this.autoModeration.note(moderation),
    });
    if (!moderation.flagged) {
      await this.forums.updateOne(
        { _id: post!._id },
        { $inc: { commentCount: 1 } },
      );
      void this.publishCommentEvent(comment, post!.authorId);
    }
    return {
      message: 'Comment added',
      data: this.commentView(comment.toObject(), actor),
    };
  }

  async reply(actor: CommunityActor, commentId: string, dto: CreateCommentDto) {
    this.assertId(commentId);
    const parent = await this.comments.findOne({
      _id: commentId,
      status: 'PUBLISHED',
    });
    if (!parent) throwNotFound(ErrorCode.FORUM_COMMENT_NOT_FOUND);
    const post = await this.publishedPost(parent!.postId.toString());
    if (post!.isLocked)
      throwConflict(ErrorCode.FORUM_POST_LOCKED);
    const moderation = this.autoModeration.inspect(dto.content);
    const reply = await this.comments.create({
      postId: parent!.postId,
      parentId: parent!._id,
      content: dto.content.trim(),
      authorId: actor.sub,
      authorName: actor.fullName ?? actor.email ?? actor.sub,
      authorAvatar: actor.avatar,
      status: moderation.flagged ? 'FLAGGED' : 'PUBLISHED',
      moderationNote: this.autoModeration.note(moderation),
    });
    if (!moderation.flagged) {
      await this.forums.updateOne(
        { _id: post!._id },
        { $inc: { commentCount: 1 } },
      );
      void this.publishCommentEvent(reply, parent!.authorId);
    }
    return {
      message: 'Reply added',
      data: this.commentView(reply.toObject(), actor),
    };
  }

  async deleteComment(actor: CommunityActor, id: string) {
    this.assertId(id);
    const comment = await this.comments.findById(id);
    if (!comment) throwNotFound(ErrorCode.FORUM_COMMENT_NOT_FOUND);
    this.assertOwner(actor, comment!.authorId);
    if (comment!.status !== 'DELETED') {
      await this.comments.updateOne(
        { _id: comment!._id },
        { $set: { status: 'DELETED' } },
      );
      await this.forums.updateOne(
        { _id: comment!.postId, commentCount: { $gt: 0 } },
        { $inc: { commentCount: -1 } },
      );
    }
    return { message: 'Comment deleted successfully' };
  }

  async likeComment(actor: CommunityActor, id: string, like: boolean) {
    this.assertId(id);
    const filter: FilterQuery<Comment> = {
      _id: new Types.ObjectId(id),
      status: 'PUBLISHED',
      likes: like ? { $ne: actor.sub } : actor.sub,
    };
    const update = like
      ? { $addToSet: { likes: actor.sub }, $inc: { likeCount: 1 } }
      : { $pull: { likes: actor.sub }, $inc: { likeCount: -1 } };
    let comment = await this.comments
      .findOneAndUpdate(filter, update, { new: true })
      .select('+likes');
    if (!comment)
      comment = await this.comments
        .findOne({ _id: id, status: 'PUBLISHED' })
        .select('+likes');
    if (!comment) throwNotFound(ErrorCode.FORUM_COMMENT_NOT_FOUND);
    return {
      data: {
        isLiked: comment!.likes.includes(actor.sub),
        likeCount: comment!.likeCount,
      },
    };
  }

  async listCategories() {
    const categories = await this.categories
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    const data = await Promise.all(
      categories.map(async (category) => ({
        id: category._id.toString(),
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        postCount: await this.forums.countDocuments({
          categoryId: category._id,
          status: 'PUBLISHED',
        }),
      })),
    );
    return { data };
  }

  private async publishCommentEvent(
    comment: Comment & { _id: Types.ObjectId },
    recipientId: string,
  ) {
    try {
      await this.eventBus.publish({
        eventId: randomUUID(),
        eventType: 'forum.comment.created',
        occurredAt: new Date().toISOString(),
        producer: 'community-service',
        version: 1,
        aggregateId: comment._id.toString(),
        payload: {
          commentId: comment._id.toString(),
          postId: comment.postId.toString(),
          parentId: comment.parentId?.toString(),
          authorId: comment.authorId,
          authorName: comment.authorName,
          recipientId,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Could not publish forum.comment.created: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async commentTree(postId: string, actor?: CommunityActor) {
    this.assertId(postId);
    let query = this.comments
      .find({
        postId: new Types.ObjectId(postId),
        status: { $in: ['PUBLISHED', 'DELETED'] },
      })
      .sort({ createdAt: 1 });
    if (actor) query = query.select('+likes');
    const rows = await query.lean();
    const nodes = new Map<string, any>();
    for (const row of rows)
      nodes.set(row._id.toString(), {
        ...this.commentView(row, actor),
        replies: [],
      });
    const roots: any[] = [];
    for (const row of rows) {
      const node = nodes.get(row._id.toString());
      const parent = row.parentId ? nodes.get(row.parentId.toString()) : null;
      if (parent) parent.replies.push(node);
      else roots.push(node);
    }
    return roots;
  }

  private async findPost(
    id: string,
    actor: CommunityActor | undefined,
    includeLikes: boolean,
  ) {
    this.assertId(id);
    let query = this.forums.findById(id).populate('categoryId');
    if (includeLikes || actor) query = query.select('+likes');
    const post = await query;
    if (!post || post.status === 'DELETED')
      throwNotFound(ErrorCode.FORUM_POST_NOT_FOUND);
    if (
      post!.status !== 'PUBLISHED' &&
      actor?.sub !== post!.authorId &&
      actor?.role !== 'PLATFORM_ADMIN'
    ) {
      throwNotFound(ErrorCode.FORUM_POST_NOT_FOUND);
    }
    return post;
  }

  private async publishedPost(id: string) {
    this.assertId(id);
    const post = await this.forums.findOne({ _id: id, status: 'PUBLISHED' });
    if (!post) throwNotFound(ErrorCode.FORUM_POST_NOT_FOUND);
    return post!;
  }

  private async ownedPost(actor: CommunityActor, id: string) {
    this.assertId(id);
    const post = await this.forums.findById(id);
    if (!post) throwNotFound(ErrorCode.FORUM_POST_NOT_FOUND);
    this.assertOwner(actor, post!.authorId);
    return post!;
  }

  private assertOwner(actor: CommunityActor, authorId: string) {
    if (actor.sub !== authorId && actor.role !== 'PLATFORM_ADMIN') {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
    }
  }

  private async findCategory(value: string) {
    const category = Types.ObjectId.isValid(value)
      ? await this.categories.findById(value)
      : await this.categories.findOne({ slug: value.toLowerCase() });
    if (!category || !category.isActive)
      throwNotFound(ErrorCode.FORUM_POST_NOT_FOUND);
    return category;
  }

  private async activeCategory(id: string) {
    this.assertId(id);
    const category = await this.categories.findOne({ _id: id, isActive: true });
    if (!category) throwNotFound(ErrorCode.FORUM_POST_NOT_FOUND);
    return category;
  }

  private assertId(id: string) {
    if (!Types.ObjectId.isValid(id))
      throwNotFound(ErrorCode.FORUM_POST_NOT_FOUND);
  }

  private tags(tags?: string[]) {
    return [
      ...new Set(
        (tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean),
      ),
    ];
  }

  private slug(title: string) {
    const base = title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 160);
    return `${base || 'post'}-${randomBytes(4).toString('hex')}`;
  }

  private postView(post: any, actor?: CommunityActor) {
    const category = post.categoryId;
    const likes: string[] = post.likes ?? [];
    return {
      id: post._id.toString(),
      slug: post.slug,
      title: post.title,
      content: post.content,
      author: {
        id: post.authorId,
        fullName: post.authorName,
        avatar: post.authorAvatar ?? null,
      },
      category: category?._id
        ? {
            id: category._id.toString(),
            name: category.name,
            slug: category.slug,
          }
        : null,
      tags: post.tags,
      bookId: post.bookId ?? null,
      storeId: post.storeId ?? null,
      coverImage: post.coverImage ?? null,
      viewCount: post.viewCount,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      status: post.status,
      isPinned: post.isPinned,
      isLocked: post.isLocked,
      isLiked: actor ? likes.includes(actor.sub) : false,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  private commentView(comment: any, actor?: CommunityActor) {
    const deleted = comment.status === 'DELETED';
    const likes: string[] = comment.likes ?? [];
    return {
      id: comment._id.toString(),
      postId: comment.postId.toString(),
      parentId: comment.parentId?.toString() ?? null,
      content: deleted ? '[deleted]' : comment.content,
      author: deleted
        ? null
        : {
            id: comment.authorId,
            fullName: comment.authorName,
            avatar: comment.authorAvatar ?? null,
          },
      likeCount: deleted ? 0 : comment.likeCount,
      isLiked: !deleted && actor ? likes.includes(actor.sub) : false,
      isEdited: comment.isEdited,
      status: comment.status,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
