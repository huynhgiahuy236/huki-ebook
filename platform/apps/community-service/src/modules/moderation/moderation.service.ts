import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model, Types } from 'mongoose';
import { RabbitMqEventBus } from '../../../../../libs/shared/src';
import { CommunityActor } from '../../common/community-auth.guard';
import { Comment, CommentDocument } from '../../entities/comment.schema';
import { Forum, ForumDocument } from '../../entities/forum.schema';
import {
  ModerationAction,
  Report,
  ReportDocument,
  ReportTargetType,
} from '../../entities/report.schema';
import { Review, ReviewDocument } from '../../entities/review.schema';
import {
  CreateReportDto,
  ModerateContentDto,
  ModerationQueueQueryDto,
  ReportListQueryDto,
  ResolveReportDto,
} from './dto/moderation.dto';

type ContentType = Extract<ReportTargetType, 'POST' | 'COMMENT' | 'REVIEW'>;
type ContentDocument = ForumDocument | CommentDocument | ReviewDocument;

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @InjectModel(Report.name)
    private readonly reports: Model<ReportDocument>,
    @InjectModel(Forum.name)
    private readonly forums: Model<ForumDocument>,
    @InjectModel(Comment.name)
    private readonly comments: Model<CommentDocument>,
    @InjectModel(Review.name)
    private readonly reviews: Model<ReviewDocument>,
    private readonly eventBus: RabbitMqEventBus,
  ) {}

  async report(
    actor: CommunityActor,
    targetType: ContentType,
    targetId: string,
    dto: CreateReportDto,
  ) {
    const target = await this.requireContent(targetType, targetId);
    if (!['PUBLISHED', 'FLAGGED'].includes(target.status)) {
      throw new NotFoundException('Content not found');
    }
    if (target.authorId === actor.sub) {
      throw new ForbiddenException('You cannot report your own content');
    }
    try {
      const report = await this.reports.create({
        reporterId: actor.sub,
        targetType,
        targetId,
        targetAuthorId: target.authorId,
        reason: dto.reason,
        description: dto.description?.trim(),
        status: 'PENDING',
      });
      const flagged = await this.model(targetType).updateOne(
        { _id: target._id, status: 'PUBLISHED' },
        { $set: { status: 'FLAGGED' } },
      );
      if (targetType === 'COMMENT' && flagged.modifiedCount) {
        await this.forums.updateOne(
          { _id: (target as CommentDocument).postId },
          { $inc: { commentCount: -1 } },
        );
      }
      void this.publish('user.reported', report.id, {
        reportId: report.id,
        reporterId: actor.sub,
        reportedUserId: target.authorId,
        targetType,
        targetId,
        reason: dto.reason,
      });
      return {
        message: 'Report submitted',
        data: { reportId: report.id, status: report.status },
      };
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException({
          message: 'You have already reported this content',
          code: 'FORUM_REPORT_EXISTS',
        });
      }
      throw error;
    }
  }

  async listReports(query: ReportListQueryDto) {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
    };
    const [items, total] = await Promise.all([
      this.reports
        .find(where)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      this.reports.countDocuments(where),
    ]);
    return {
      data: items.map((report) => this.reportView(report)),
      pagination: this.pagination(query.page, query.limit, total),
    };
  }

  async reportDetail(id: string) {
    const report = await this.reports.findById(id).lean();
    if (!report) throw new NotFoundException('Report not found');
    const contentType = this.isContentType(report.targetType)
      ? report.targetType
      : null;
    const content = contentType
      ? await this.findContent(contentType, report.targetId)
      : null;
    return {
      data: {
        ...this.reportView(report),
        content:
          contentType && content
            ? this.contentView(contentType, content)
            : null,
      },
    };
  }

  async startReview(actor: CommunityActor, id: string) {
    const report = await this.reports.findOneAndUpdate(
      { _id: id, status: 'PENDING' },
      {
        $set: {
          status: 'REVIEWING',
          reviewedBy: actor.sub,
          reviewedAt: new Date(),
        },
      },
      { new: true },
    );
    if (report)
      return {
        message: 'Report is being reviewed',
        data: this.reportView(report),
      };
    const existing = await this.reports.findById(id);
    if (!existing) throw new NotFoundException('Report not found');
    if (existing.status === 'REVIEWING' && existing.reviewedBy === actor.sub) {
      return {
        message: 'Report is being reviewed',
        data: this.reportView(existing),
      };
    }
    throw new ConflictException('Report is not pending');
  }

  async resolve(actor: CommunityActor, id: string, dto: ResolveReportDto) {
    const report = await this.reports.findById(id);
    if (!report) throw new NotFoundException('Report not found');
    if (['RESOLVED', 'DISMISSED'].includes(report.status)) {
      throw new ConflictException('Report has already been resolved');
    }
    if (dto.outcome === 'DISMISSED' && dto.action !== 'NONE') {
      throw new ConflictException('Dismissed reports require action NONE');
    }
    if (
      ['HIDE', 'DELETE'].includes(dto.action) &&
      !this.isContentType(report.targetType)
    ) {
      throw new ConflictException('This action requires a content target');
    }
    if (['WARN', 'BAN'].includes(dto.action) && !report.targetAuthorId) {
      throw new ConflictException('This action requires a reported user');
    }

    let shouldUpdateContent = true;
    if (
      this.isContentType(report.targetType) &&
      (dto.outcome === 'DISMISSED' || dto.action === 'NONE')
    ) {
      const otherOpenReports = await this.reports.countDocuments({
        _id: { $ne: report._id },
        targetType: report.targetType,
        targetId: report.targetId,
        status: { $in: ['PENDING', 'REVIEWING'] },
      });
      shouldUpdateContent = otherOpenReports === 0;
    }
    if (this.isContentType(report.targetType) && shouldUpdateContent) {
      await this.applyContentAction(
        report.targetType,
        report.targetId,
        dto.outcome === 'DISMISSED' ? 'NONE' : dto.action,
        actor.sub,
        dto.note,
      );
    }
    const now = new Date();
    report.status = dto.outcome;
    report.reviewedBy ??= actor.sub;
    report.reviewedAt ??= now;
    report.resolvedBy = actor.sub;
    report.resolvedAt = now;
    report.action = dto.outcome === 'DISMISSED' ? 'NONE' : dto.action;
    report.resolutionNote = dto.note.trim();
    await report.save();

    if (['WARN', 'BAN'].includes(report.action)) {
      void this.publish('user.moderation.requested', report.id, {
        reportId: report.id,
        userId: report.targetAuthorId,
        action: report.action,
        reason: report.resolutionNote,
        requestedBy: actor.sub,
      });
    }
    void this.publish('moderation.report.resolved', report.id, {
      reportId: report.id,
      status: report.status,
      action: report.action,
      targetType: report.targetType,
      targetId: report.targetId,
      resolvedBy: actor.sub,
    });
    return { message: 'Report resolved', data: this.reportView(report) };
  }

  async queue(query: ModerationQueueQueryDto) {
    const types: ContentType[] = query.targetType
      ? [query.targetType]
      : ['POST', 'COMMENT', 'REVIEW'];
    const statuses = query.status
      ? [query.status]
      : ['PENDING_REVIEW', 'FLAGGED'];
    const take = query.page * query.limit;
    const [groups, counts] = await Promise.all([
      Promise.all(
        types.map(async (type) => {
          const items = await this.model(type)
            .find({ status: { $in: statuses } })
            .sort({ createdAt: -1 })
            .limit(take)
            .lean();
          return items.map((item) => this.contentView(type, item));
        }),
      ),
      Promise.all(
        types.map((type) =>
          this.model(type).countDocuments({ status: { $in: statuses } }),
        ),
      ),
    ]);
    const total = counts.reduce((sum, count) => sum + count, 0);
    const data = groups
      .flat()
      .sort(
        (a, b) =>
          new Date(b.createdAt as Date).getTime() -
          new Date(a.createdAt as Date).getTime(),
      )
      .slice((query.page - 1) * query.limit, query.page * query.limit);
    return {
      data,
      pagination: this.pagination(query.page, query.limit, total),
    };
  }

  async moderateContent(
    actor: CommunityActor,
    targetType: ContentType,
    targetId: string,
    dto: ModerateContentDto,
  ) {
    await this.requireContent(targetType, targetId);
    const action: ModerationAction =
      dto.action === 'APPROVE' ? 'NONE' : dto.action;
    await this.applyContentAction(
      targetType,
      targetId,
      action,
      actor.sub,
      dto.note ??
        (dto.action === 'APPROVE' ? 'Content approved' : 'Moderated by admin'),
    );
    const terminalStatus = dto.action === 'APPROVE' ? 'DISMISSED' : 'RESOLVED';
    const resolvedAt = new Date();
    await this.reports.updateMany(
      { targetType, targetId, status: { $in: ['PENDING', 'REVIEWING'] } },
      {
        $set: {
          status: terminalStatus,
          action,
          resolutionNote: dto.note ?? 'Resolved through moderation queue',
          reviewedBy: actor.sub,
          reviewedAt: resolvedAt,
          resolvedBy: actor.sub,
          resolvedAt,
        },
      },
    );
    const content = await this.requireContent(targetType, targetId, true);
    return {
      message: 'Content moderated',
      data: this.contentView(targetType, content),
    };
  }

  private async applyContentAction(
    targetType: ContentType,
    targetId: string,
    action: ModerationAction,
    adminId: string,
    note: string,
  ) {
    const current = await this.requireContent(targetType, targetId);
    const status =
      action === 'DELETE'
        ? 'DELETED'
        : ['HIDE', 'BAN'].includes(action)
          ? 'HIDDEN'
          : 'PUBLISHED';
    const result = await this.model(targetType).updateOne(
      { _id: new Types.ObjectId(targetId), status: { $ne: 'DELETED' } },
      {
        $set: {
          status,
          moderatedBy: adminId,
          moderatedAt: new Date(),
          moderationNote: note.trim(),
        },
      },
    );
    if (!result.matchedCount) throw new NotFoundException('Content not found');
    if (targetType === 'COMMENT') {
      const wasVisible = current.status === 'PUBLISHED';
      const isVisible = status === 'PUBLISHED';
      if (wasVisible !== isVisible) {
        await this.forums.updateOne(
          { _id: (current as CommentDocument).postId },
          { $inc: { commentCount: isVisible ? 1 : -1 } },
        );
      }
    }
    if (targetType === 'POST' && status === 'DELETED') {
      await this.comments.updateMany(
        { postId: new Types.ObjectId(targetId), status: { $ne: 'DELETED' } },
        {
          $set: {
            status: 'DELETED',
            moderatedBy: adminId,
            moderatedAt: new Date(),
            moderationNote: note.trim(),
          },
        },
      );
    }
  }

  private async requireContent(
    targetType: ContentType,
    targetId: string,
    includeDeleted = false,
  ): Promise<ContentDocument> {
    const content = await this.findContent(targetType, targetId);
    if (!content || (!includeDeleted && content.status === 'DELETED')) {
      throw new NotFoundException('Content not found');
    }
    return content as ContentDocument;
  }

  private findContent(targetType: ContentType, targetId: string) {
    return this.model(targetType).findById(new Types.ObjectId(targetId));
  }

  private model(targetType: ContentType): Model<any> {
    if (targetType === 'POST') return this.forums;
    if (targetType === 'COMMENT') return this.comments;
    return this.reviews;
  }

  private isContentType(type: ReportTargetType): type is ContentType {
    return ['POST', 'COMMENT', 'REVIEW'].includes(type);
  }

  private reportView(report: any) {
    return {
      id: report._id?.toString() ?? report.id,
      reporterId: report.reporterId,
      targetType: report.targetType,
      targetId: report.targetId,
      targetAuthorId: report.targetAuthorId,
      reason: report.reason,
      description: report.description,
      status: report.status,
      reviewedBy: report.reviewedBy,
      reviewedAt: report.reviewedAt,
      resolvedBy: report.resolvedBy,
      resolvedAt: report.resolvedAt,
      action: report.action,
      resolutionNote: report.resolutionNote,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  private contentView(targetType: ContentType, content: any) {
    return {
      targetType,
      id: content._id.toString(),
      title: content.title,
      content: content.content,
      authorId: content.authorId,
      authorName: content.authorName,
      status: content.status,
      moderationNote: content.moderationNote,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    };
  }

  private pagination(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  private async publish(
    eventType: string,
    aggregateId: string,
    payload: Record<string, unknown>,
  ) {
    try {
      await this.eventBus.publish({
        eventId: randomUUID(),
        eventType,
        occurredAt: new Date().toISOString(),
        producer: 'community-service',
        version: 1,
        aggregateId,
        payload,
      });
    } catch (error) {
      this.logger.warn(
        `Could not publish ${eventType}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
