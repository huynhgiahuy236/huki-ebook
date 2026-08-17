import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema()
export class ReviewImage {
  @Prop({ required: true })
  url: string;

  @Prop()
  thumbnail: string;
}

@Schema({ timestamps: true })
export class Review {
  @Prop({ enum: ['BOOK', 'STORE'], required: true })
  targetType: string;

  @Prop({ type: Types.ObjectId, required: true })
  targetId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop()
  title: string;

  @Prop()
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId: Types.ObjectId;

  @Prop({ required: true })
  authorName: string;

  @Prop()
  authorAvatar: string;

  @Prop({ enum: ['PHYSICAL', 'DIGITAL'] })
  format: string;

  @Prop({ default: false })
  verifiedPurchase: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId: Types.ObjectId;

  @Prop({ type: [ReviewImage], default: [] })
  images: ReviewImage[];

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ default: 0 })
  helpfulCount: number;

  @Prop({ enum: ['PENDING', 'PUBLISHED', 'HIDDEN', 'DELETED'], default: 'PENDING' })
  status: string;

  @Prop()
  moderatedBy: Types.ObjectId;

  @Prop()
  moderatedAt: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
