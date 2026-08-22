import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export const REVIEW_TARGET_TYPES = ["BOOK", "STORE"] as const;
export const REVIEW_FORMATS = ["PHYSICAL", "DIGITAL"] as const;
export const REVIEW_STATUSES = [
  "PENDING_REVIEW",
  "PUBLISHED",
  "HIDDEN",
  "DELETED",
  "FLAGGED",
] as const;

export type ReviewTargetType = (typeof REVIEW_TARGET_TYPES)[number];
export type ReviewFormat = (typeof REVIEW_FORMATS)[number];
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

@Schema({ _id: false })
export class ReviewImage {
  @Prop({ required: true })
  url!: string;

  @Prop()
  thumbnail?: string;
}

export const ReviewImageSchema = SchemaFactory.createForClass(ReviewImage);
export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true, collection: "reviews" })
export class Review {
  @Prop({ required: true, type: String, enum: REVIEW_TARGET_TYPES })
  targetType!: ReviewTargetType;

  @Prop({ required: true, type: String })
  targetId!: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating!: number;

  @Prop({ required: true, trim: true, minlength: 3, maxlength: 200 })
  title!: string;

  @Prop({ required: true, trim: true, minlength: 10, maxlength: 5_000 })
  content!: string;

  @Prop({ required: true, type: String })
  authorId!: string;

  @Prop({ required: true, trim: true })
  authorName!: string;

  @Prop()
  authorAvatar?: string;

  @Prop({ type: String, enum: REVIEW_FORMATS })
  format?: ReviewFormat;

  @Prop({ default: false })
  verifiedPurchase!: boolean;

  @Prop({ type: String })
  orderId?: string;

  @Prop({ type: String })
  sellerOrderId?: string;

  @Prop({ type: String })
  storeId?: string;

  @Prop({ type: [ReviewImageSchema], default: [] })
  images!: ReviewImage[];

  @Prop({ type: [String], default: [], select: false })
  helpful!: string[];

  @Prop({ default: 0, min: 0 })
  helpfulCount!: number;

  @Prop({
    required: true,
    type: String,
    enum: REVIEW_STATUSES,
    default: "PENDING_REVIEW",
  })
  status!: ReviewStatus;

  @Prop({ type: String })
  moderatedBy?: string;

  @Prop()
  moderatedAt?: Date;

  @Prop()
  moderationNote?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ targetType: 1, targetId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ targetType: 1, targetId: 1, status: 1, rating: 1 });
ReviewSchema.index({ authorId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ storeId: 1, status: 1, createdAt: -1 });
ReviewSchema.index(
  { authorId: 1, targetType: 1, targetId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: ["PENDING_REVIEW", "PUBLISHED", "HIDDEN", "FLAGGED"],
      },
    },
  },
);
