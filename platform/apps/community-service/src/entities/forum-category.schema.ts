import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ForumCategoryDocument = HydratedDocument<ForumCategory>;

@Schema({ timestamps: true, collection: 'forum_categories' })
export class ForumCategory {
  @Prop({ required: true, trim: true, maxlength: 100 })
  name!: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug!: string;

  @Prop({ maxlength: 500 })
  description?: string;

  @Prop()
  icon?: string;

  @Prop({ default: 0 })
  sortOrder!: number;

  @Prop({ default: true, index: true })
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ForumCategorySchema = SchemaFactory.createForClass(ForumCategory);
ForumCategorySchema.index({ isActive: 1, sortOrder: 1, name: 1 });
