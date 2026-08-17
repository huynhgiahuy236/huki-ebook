import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'Forum', required: true })
  postId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Comment' })
  parentId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ required: true })
  authorName: string;

  @Prop()
  authorAvatar: string;

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ enum: ['PENDING_REVIEW', 'PUBLISHED', 'DELETED'], default: 'PUBLISHED' })
  status: string;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
