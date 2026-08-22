import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CommentDocument = HydratedDocument<Comment>;

@Schema({ timestamps: true, collection: 'comments' })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'Forum', required: true, index: true })
  postId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Comment', default: null, index: true })
  parentId?: Types.ObjectId | null;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 5_000 })
  content!: string;

  @Prop({ required: true, index: true })
  authorId!: string;

  @Prop({ required: true })
  authorName!: string;

  @Prop()
  authorAvatar?: string;

  @Prop({ type: [String], default: [], select: false })
  likes!: string[];

  @Prop({ default: 0, min: 0 })
  likeCount!: number;

  @Prop({ default: false })
  isEdited!: boolean;

  @Prop({
    enum: ['PENDING_REVIEW', 'PUBLISHED', 'DELETED'],
    default: 'PUBLISHED',
    index: true,
  })
  status!: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
CommentSchema.index({ postId: 1, status: 1, createdAt: 1 });
CommentSchema.index({ authorId: 1, createdAt: -1 });
