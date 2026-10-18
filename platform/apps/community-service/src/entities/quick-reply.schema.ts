import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type QuickReplyDocument = HydratedDocument<QuickReply>;

@Schema({ timestamps: true, collection: "store_quick_replies" })
export class QuickReply {
  @Prop({ required: true, type: String, index: true })
  storeId!: string;

  @Prop({ required: true, type: String, trim: true })
  shortcut!: string; // ví dụ: "chao", "ship", "voucher"

  @Prop({ required: true, type: String, trim: true })
  title!: string; // tiêu đề ngắn

  @Prop({ required: true, type: String, trim: true, maxlength: 2000 })
  content!: string; // nội dung mẫu đầy đủ

  @Prop({ type: Number, default: 0 })
  usageCount!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export const QuickReplySchema = SchemaFactory.createForClass(QuickReply);

QuickReplySchema.index({ storeId: 1, shortcut: 1 });
QuickReplySchema.index({ storeId: 1, usageCount: -1 });
