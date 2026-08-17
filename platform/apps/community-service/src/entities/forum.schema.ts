import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ForumDocument = Forum & Document;

@Schema({ timestamps: true })
export class Forum {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ required: true })
  authorName: string;

  @Prop()
  authorAvatar: string;

  @Prop({ required: true })
  category: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ default: 0 })
  commentCount: number;

  @Prop({ enum: ['PENDING_REVIEW', 'PUBLISHED', 'HIDDEN', 'DELETED', 'FLAGGED'], default: 'PENDING_REVIEW' })
  status: string;

  @Prop({ default: false })
  isPinned: boolean;

  @Prop({ default: false })
  isLocked: boolean;

  @Prop()
  coverImage: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  moderatedBy: Types.ObjectId;

  @Prop()
  moderatedAt: Date;

  @Prop()
  moderationNote: string;
}

export const ForumSchema = SchemaFactory.createForClass(Forum);
