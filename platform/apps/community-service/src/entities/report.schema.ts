import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const REPORT_TARGET_TYPES = [
  'POST',
  'COMMENT',
  'REVIEW',
  'USER',
  'STORE',
] as const;
export const REPORT_REASONS = [
  'SPAM',
  'HARASSMENT',
  'OFFENSIVE',
  'MISINFORMATION',
  'COPYRIGHT',
  'OTHER',
] as const;
export const REPORT_STATUSES = [
  'PENDING',
  'REVIEWING',
  'RESOLVED',
  'DISMISSED',
] as const;
export const MODERATION_ACTIONS = [
  'NONE',
  'WARN',
  'HIDE',
  'DELETE',
  'BAN',
] as const;

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];
export type ReportDocument = HydratedDocument<Report>;

@Schema({ timestamps: true, collection: 'reports' })
export class Report {
  @Prop({ required: true, type: String })
  reporterId!: string;

  @Prop({ required: true, type: String, enum: REPORT_TARGET_TYPES })
  targetType!: ReportTargetType;

  @Prop({ required: true, type: String })
  targetId!: string;

  @Prop({ type: String })
  targetAuthorId?: string;

  @Prop({ required: true, type: String, enum: REPORT_REASONS })
  reason!: ReportReason;

  @Prop({ type: String, trim: true, maxlength: 2_000 })
  description?: string;

  @Prop({
    required: true,
    type: String,
    enum: REPORT_STATUSES,
    default: 'PENDING',
  })
  status!: ReportStatus;

  @Prop({ type: String })
  reviewedBy?: string;

  @Prop()
  reviewedAt?: Date;

  @Prop({ type: String })
  resolvedBy?: string;

  @Prop()
  resolvedAt?: Date;

  @Prop({ type: String, enum: MODERATION_ACTIONS })
  action?: ModerationAction;

  @Prop({ type: String, trim: true, maxlength: 2_000 })
  resolutionNote?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
ReportSchema.index(
  { reporterId: 1, targetType: 1, targetId: 1 },
  { unique: true },
);
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ targetType: 1, targetId: 1, status: 1 });
ReportSchema.index({ targetAuthorId: 1, createdAt: -1 });
