import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

export const REVIEW_REPLY_STATUSES = ["ACTIVE", "DELETED"] as const;
export type ReviewReplyStatus = (typeof REVIEW_REPLY_STATUSES)[number];
export type ReviewReplyDocument = HydratedDocument<ReviewReply>;

@Schema({ timestamps: true, collection: "review_replies" })
export class ReviewReply {
  @Prop({
    required: true,
    type: MongooseSchema.Types.ObjectId,
    ref: "Review",
  })
  reviewId!: Types.ObjectId;

  @Prop({ required: true, type: String })
  businessId!: string;

  @Prop({ required: true, type: String })
  storeId!: string;

  @Prop({ required: true, type: String })
  responderId!: string;

  @Prop({ required: true, trim: true })
  businessName!: string;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 2_000 })
  content!: string;

  @Prop({
    required: true,
    type: String,
    enum: REVIEW_REPLY_STATUSES,
    default: "ACTIVE",
  })
  status!: ReviewReplyStatus;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ReviewReplySchema = SchemaFactory.createForClass(ReviewReply);

ReviewReplySchema.index({ reviewId: 1, status: 1, createdAt: 1 });
ReviewReplySchema.index({ businessId: 1, createdAt: -1 });
ReviewReplySchema.index(
  { reviewId: 1, storeId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "ACTIVE" },
  },
);
