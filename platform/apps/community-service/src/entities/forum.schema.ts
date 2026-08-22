import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ForumDocument = HydratedDocument<Forum>;

@Schema({ timestamps: true, collection: 'forums' })
export class Forum {
  @Prop({ required: true, trim: true, minlength: 10, maxlength: 200 })
  title!: string;

  @Prop({ required: true, unique: true, trim: true })
  slug!: string;

  @Prop({ required: true, minlength: 50, maxlength: 50_000 })
  content!: string;

  @Prop({ required: true, index: true })
  authorId!: string;

  @Prop({ required: true })
  authorName!: string;

  @Prop()
  authorAvatar?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'ForumCategory',
    required: true,
    index: true,
  })
  categoryId!: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop()
  bookId?: string;

  @Prop()
  storeId?: string;

  @Prop({ type: [String], default: [], select: false })
  likes!: string[];

  @Prop({ default: 0, min: 0 })
  likeCount!: number;

  @Prop({ default: 0, min: 0 })
  commentCount!: number;

  @Prop({ default: 0, min: 0 })
  viewCount!: number;

  @Prop({ default: false })
  isPinned!: boolean;

  @Prop({ default: false })
  isLocked!: boolean;

  @Prop({
    enum: ['PENDING_REVIEW', 'PUBLISHED', 'HIDDEN', 'DELETED', 'FLAGGED'],
    default: 'PENDING_REVIEW',
    index: true,
  })
  status!: string;

  @Prop()
  coverImage?: string;

  @Prop({
    type: [{ type: { type: String, enum: ['IMAGE', 'FILE'] }, url: String }],
    default: [],
  })
  attachments!: Array<{ type: 'IMAGE' | 'FILE'; url: string }>;

  @Prop()
  moderatedBy?: string;

  @Prop()
  moderatedAt?: Date;

  @Prop()
  moderationNote?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ForumSchema = SchemaFactory.createForClass(Forum);
ForumSchema.index({ authorId: 1, createdAt: -1 });
ForumSchema.index({ bookId: 1, createdAt: -1 });
ForumSchema.index({ categoryId: 1, status: 1, createdAt: -1 });
ForumSchema.index({ status: 1, isPinned: -1, createdAt: -1 });
ForumSchema.index({ status: 1, viewCount: -1, likeCount: -1 });
ForumSchema.index(
  { title: 'text', content: 'text', tags: 'text' },
  { name: 'forums_text_search', weights: { title: 10, tags: 5, content: 1 } },
);
