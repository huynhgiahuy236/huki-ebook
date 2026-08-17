import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reporterId: Types.ObjectId;

  @Prop({
    enum: ['POST', 'COMMENT', 'REVIEW', 'USER', 'STORE', 'MESSAGE'],
    required: true
  })
  targetType: string;

  @Prop({ type: Types.ObjectId, required: true })
  targetId: Types.ObjectId;

  @Prop({
    enum: ['SPAM', 'HARASSMENT', 'OFFENSIVE', 'MISINFORMATION', 'COPYRIGHT', 'OTHER'],
    required: true
  })
  reason: string;

  @Prop()
  description: string;

  @Prop({ enum: ['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'], default: 'PENDING' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy: Types.ObjectId;

  @Prop()
  reviewedAt: Date;

  @Prop({ enum: ['DELETED', 'WARNING', 'NO_ACTION'], })
  resolution: string;

  @Prop()
  resolutionNote: string;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
