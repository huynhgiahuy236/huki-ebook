import {
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model, Types } from 'mongoose';
import { RabbitMqEventBus } from '@huki/shared';
import { CommunityActor } from '../../common/community-auth.guard';
import {
  ModerationAction,
  Report,
  ReportDocument,
  ReportStatus,
  ReportTargetType,
} from '../../entities/report.schema';
import { Review, ReviewDocument } from '../../entities/review.schema';
import { NotificationGateway } from '../notifications/notification.gateway';
import { NotificationDeliveryService } from '../notifications/notification-delivery.service';
import {
  BookModerationActionDto,
  BookUnlockAppealDto,
  CreateBookReportDto,
  CreateReportDto,
  ModerateContentDto,
  ModerationQueueQueryDto,
  ReportListQueryDto,
  ResolveReportDto,
} from './dto/moderation.dto';
import { throwConflict, throwNotFound, throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

type ContentType = Extract<ReportTargetType, 'REVIEW'>;
type ContentDocument = ReviewDocument;

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @InjectModel(Report.name)
    private readonly reports: Model<ReportDocument>,
    @InjectModel(Review.name)
    private readonly reviews: Model<ReviewDocument>,
    private readonly eventBus: RabbitMqEventBus,
    @Optional() private readonly gateway?: NotificationGateway,
    @Optional() private readonly notificationDelivery?: NotificationDeliveryService,
  ) {}

  async report(
    actor: CommunityActor,
    targetType: ContentType,
    targetId: string,
    dto: CreateReportDto,
  ) {
    const target = await this.requireContent(targetType, targetId);
    if (!['PUBLISHED', 'FLAGGED'].includes(target!.status)) {
      throwNotFound(ErrorCode.MODERATION_REPORT_NOT_FOUND);
    }
    if (target!.authorId === actor.sub) {
      throwForbidden(ErrorCode.AUTHZ_NOT_OWNER);
    }
    try {
      const isLanguage = ['OFFENSIVE', 'LANGUAGE_VIOLATION'].includes(dto.reason);
      const report = await this.reports.create({
        reporterId: actor.sub,
        targetType,
        targetId,
        targetAuthorId: target!.authorId,
        reason: dto.reason,
        description: dto.description?.trim(),
        detectionSource: 'USER_REPORT',
        violationCategory: isLanguage ? 'LANGUAGE_VIOLATION' : dto.reason,
        matchedKeywords: [],
        status: 'PENDING',
      });
      const updatedTarget = await this.model(targetType).findOneAndUpdate(
        { _id: target!._id },
        {
          $inc: { reportCount: 1 },
          $set: {
            isReported: true,
            lastReportReason: dto.reason,
          },
        },
        { new: true },
      );
      void this.publish('user.reported', report.id, {
        reportId: report.id,
        reporterId: actor.sub,
        reportedUserId: target!.authorId,
        targetType,
        targetId,
        reason: dto.reason,
      });
      if (this.notificationDelivery) {
        void this.notificationDelivery.deliver({
          sourceKey: `user.reported:${report.id}:admin_channel`,
          recipientId: 'admin_channel',
          recipientType: 'ADMIN',
          type: 'WATCHDOG_ALERT' as any,
          priority: 'HIGH',
          title: isLanguage
            ? 'Báo cáo vi phạm ngôn từ mới'
            : 'Báo cáo vi phạm đánh giá mới',
          message: `Có báo cáo ${dto.reason} cho đánh giá #${targetId}. Cần kiểm duyệt xử lý.`,
          actionUrl: isLanguage
            ? '/admin/moderation?reason=LANGUAGE_VIOLATION'
            : '/admin/moderation',
          payload: {
            reportId: report.id,
            targetType,
            targetId,
            reason: dto.reason,
            violationCategory: isLanguage ? 'LANGUAGE_VIOLATION' : dto.reason,
            detectionSource: 'USER_REPORT',
          },
        }).catch(() => null);
      }
      this.gateway?.emitAdminModerationEvent?.('moderation:created', {
        report: this.reportView(report),
      });
      this.gateway?.emitReviewEvent('review:updated', {
        targetType: target!.targetType,
        targetId: target!.targetId,
        storeId: target!.storeId,
        storeOwnerId: target!.storeOwnerId,
        authorId: target!.authorId,
        reviewId: targetId,
        review: {
          id: targetId,
          status: updatedTarget?.status ?? target!.status,
          isReported: true,
          reportCount:
            updatedTarget?.reportCount ?? ((target as any)?.reportCount ?? 0) + 1,
          reportReason: dto.reason,
        },
      });
      return {
        message: 'Report submitted',
        data: { reportId: report.id, status: report.status },
      };
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throwConflict(ErrorCode.MODERATION_REPORT_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  async reportBook(
    actor: Partial<CommunityActor> | undefined,
    bookId: string,
    dto: CreateBookReportDto,
  ) {
    const reporterId = actor?.sub || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      const report = await this.reports.create({
        reporterId,
        targetType: 'BOOK',
        targetId: bookId,
        targetAuthorId: dto.sellerId,
        reason: dto.reason,
        description: dto.description?.trim(),
        detectionSource: 'USER_REPORT',
        violationCategory: dto.reason,
        matchedKeywords: [],
        status: 'PENDING',
        metadata: {
          bookTitle: dto.bookTitle,
          bookCover: dto.bookCover,
          author: dto.author,
          publisher: dto.publisher,
          sellerId: dto.sellerId,
          sellerName: dto.sellerName,
          isbn: dto.isbn,
          format: dto.format,
          price: dto.price,
          evidenceUrl: dto.evidenceUrl,
          evidenceImages: Array.isArray(dto.evidenceImages) ? dto.evidenceImages : [],
          reporterName: dto.reporterName || actor?.fullName || actor?.email || 'Độc giả HuKi',
          reporterEmail: dto.reporterEmail || actor?.email,
        },
      });

      void this.publish('book.reported', report.id, {
        reportId: report.id,
        reporterId,
        bookId,
        bookTitle: dto.bookTitle,
        sellerId: dto.sellerId,
        reason: dto.reason,
      });

      if (this.notificationDelivery) {
        void this.notificationDelivery.deliver({
          sourceKey: `book.reported:${report.id}:admin_channel`,
          recipientId: 'admin_channel',
          recipientType: 'ADMIN',
          type: 'WATCHDOG_ALERT' as any,
          priority: 'HIGH',
          title: 'Báo cáo vi phạm tác phẩm mới',
          message: `Tác phẩm "${dto.bookTitle || bookId}" vừa bị báo cáo (${dto.reason}): ${dto.description}`,
          actionUrl: '/admin/book-moderation',
          payload: {
            reportId: report.id,
            targetType: 'BOOK',
            targetId: bookId,
            bookTitle: dto.bookTitle,
            reason: dto.reason,
            detectionSource: 'USER_REPORT',
          },
        }).catch(() => null);
      }

      this.gateway?.emitAdminModerationEvent?.('book:reported', {
        report: this.reportView(report),
      });
      this.gateway?.emitAdminModerationEvent?.('moderation:created', {
        report: this.reportView(report),
      });

      return {
        message: 'Báo cáo tác phẩm thành công',
        data: this.reportView(report),
      };
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throwConflict(ErrorCode.MODERATION_REPORT_ALREADY_EXISTS, 'Bạn đã gửi báo cáo cho tác phẩm này trước đó');
      }
      throw error;
    }
  }

  async listBookReports(query: {
    status?: string;
    searchQuery?: string;
    reason?: string;
  }) {
    const filter: Record<string, any> = { targetType: 'BOOK' };
    if (query.status && query.status !== 'all') {
      filter.status = query.status;
    }
    if (query.reason && query.reason !== 'all') {
      filter.reason = query.reason;
    }

    const reports = await this.reports.find(filter).sort({ createdAt: -1 }).lean();

    // Group by targetId (bookId)
    const grouped = new Map<string, any>();
    for (const r of reports) {
      const bId = r.targetId;
      const meta = (r as any).metadata || {};
      const singleReport = {
        id: (r as any)._id?.toString() || r.id,
        reporterId: r.reporterId,
        reporterName: meta.reporterName || 'Độc giả HuKi',
        reporterEmail: meta.reporterEmail,
        reason: r.reason,
        description: r.description,
        evidenceUrl: meta.evidenceUrl,
        evidenceImages: Array.isArray(meta.evidenceImages) ? meta.evidenceImages : [],
        createdAt: (r as any).createdAt ? new Date((r as any).createdAt).toISOString() : new Date().toISOString(),
      };

      if (!grouped.has(bId)) {
        grouped.set(bId, {
          bookId: bId,
          title: meta.bookTitle || 'Tác phẩm sách',
          author: meta.author || 'Tác giả',
          publisher: meta.publisher || 'Nhà xuất bản',
          cover: meta.bookCover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&auto=format&fit=crop&q=80',
          isbn: meta.isbn || 'Chưa cập nhật',
          format: meta.format || 'hybrid',
          formatLabel: meta.format === 'physical' ? 'Sách Giấy' : meta.format === 'ebook' ? 'Ebook DRM' : 'Combo Sách + Ebook',
          price: meta.price || 0,
          sellerId: meta.sellerId || r.targetAuthorId || 'unknown-seller',
          sellerName: meta.sellerName || 'Gian hàng sách',
          sellerEmail: 'shop@huki.vn',
          totalReports: 0,
          reasons: [] as { reason: string; count: number }[],
          reports: [] as typeof singleReport[],
          sellerAppeal: meta.sellerAppeal || undefined,
          status: r.status === 'RESOLVED' ? (r.action === 'NONE' ? 'DISMISSED' : 'BLOCKED') : r.status === 'DISMISSED' ? 'DISMISSED' : 'PENDING_REVIEW',
          actionTaken: r.action || 'NONE',
          actionNote: r.resolutionNote,
          moderatedBy: r.resolvedBy,
          moderatedAt: r.resolvedAt ? new Date(r.resolvedAt).toISOString() : undefined,
          lastReportedAt: singleReport.createdAt,
          createdAt: singleReport.createdAt,
        });
      }

      const bookEntry = grouped.get(bId)!;
      if (meta.sellerAppeal && (!bookEntry.sellerAppeal || new Date(meta.sellerAppeal.submittedAt || 0).getTime() > new Date(bookEntry.sellerAppeal.submittedAt || 0).getTime())) {
        bookEntry.sellerAppeal = meta.sellerAppeal;
      }
      bookEntry.reports.push(singleReport);
      bookEntry.totalReports = bookEntry.reports.length;
      if (new Date(singleReport.createdAt).getTime() > new Date(bookEntry.lastReportedAt).getTime()) {
        bookEntry.lastReportedAt = singleReport.createdAt;
      }
    }

    // Compute reasons breakdown for each book
    const items = Array.from(grouped.values()).map((book) => {
      const reasonCountMap: Record<string, number> = {};
      book.reports.forEach((rep: any) => {
        reasonCountMap[rep.reason] = (reasonCountMap[rep.reason] || 0) + 1;
      });
      book.reasons = Object.entries(reasonCountMap).map(([reason, count]) => ({ reason, count }));
      return book;
    });

    let filtered = items;
    if (query.searchQuery?.trim()) {
      const q = query.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.sellerName.toLowerCase().includes(q) ||
          b.isbn.toLowerCase().includes(q)
      );
    }

    const allReportsCount = await this.reports.countDocuments({ targetType: 'BOOK' });
    const pendingCount = await this.reports.countDocuments({ targetType: 'BOOK', status: 'PENDING' });
    const resolvedCount = await this.reports.countDocuments({ targetType: 'BOOK', status: 'RESOLVED' });
    const dismissedCount = await this.reports.countDocuments({ targetType: 'BOOK', status: 'DISMISSED' });

    return {
      items: filtered,
      stats: {
        total: allReportsCount,
        pending: pendingCount,
        blocked: resolvedCount,
        dismissed: dismissedCount,
      },
    };
  }

  async moderateBook(
    actor: CommunityActor,
    bookId: string,
    dto: BookModerationActionDto,
  ) {
    const terminalStatus: ReportStatus = dto.action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED';
    const action: ModerationAction = dto.action === 'BLOCK' ? 'DELETE' : dto.action === 'DISMISS' ? 'NONE' : 'NONE';
    const resolvedAt = new Date();

    const updateSet: Record<string, any> = {
      status: dto.action === 'UNBLOCK' ? 'DISMISSED' : terminalStatus,
      action,
      resolutionNote: dto.note || `Moderated to ${dto.action}`,
      reviewedBy: actor.sub,
      reviewedAt: resolvedAt,
      resolvedBy: actor.sub,
      resolvedAt,
    };

    if (dto.action === 'UNBLOCK') {
      updateSet['metadata.sellerAppeal.status'] = 'APPROVED';
      updateSet['metadata.sellerAppeal.reviewedAt'] = resolvedAt.toISOString();
    }

    const updateRes = await this.reports.updateMany(
      { targetType: 'BOOK', targetId: bookId },
      { $set: updateSet },
    );

    // Deliver notification to Seller if requested (single authoritative notification)
    if (dto.notifySeller !== false && (dto.action === 'BLOCK' || dto.action === 'UNBLOCK')) {
      const firstReport = await this.reports.findOne({ targetType: 'BOOK', targetId: bookId }).lean();
      const sellerId = firstReport?.targetAuthorId || (firstReport as any)?.metadata?.sellerId;
      const bookTitle = (firstReport as any)?.metadata?.bookTitle || 'Tác phẩm sách';

      if (sellerId && this.notificationDelivery) {
        if (dto.action === 'BLOCK') {
          void this.notificationDelivery.deliver({
            sourceKey: `book.blocked:${bookId}:${Date.now()}`,
            recipientId: sellerId,
            recipientType: 'BUSINESS',
            type: 'WATCHDOG_ALERT' as any,
            priority: 'CRITICAL',
            title: `[CẢNH BÁO VI PHẠM] Sách "${bookTitle}" đã bị tạm khóa`,
            message: `Tác phẩm "${bookTitle}" đã bị Ban Quản Trị tạm khóa lưu hành. Lý do: ${dto.note || 'Vi phạm chính sách sàn'}. Bấm để xem chi tiết lý do và gửi phản biện mở khóa.`,
            actionUrl: `/seller/product/${bookId}/moderation`,
            payload: {
              bookId,
              bookTitle,
              action: 'BLOCK',
              note: dto.note,
            },
          }).catch(() => null);
        } else {
          void this.notificationDelivery.deliver({
            sourceKey: `book.unblocked:${bookId}:${Date.now()}`,
            recipientId: sellerId,
            recipientType: 'BUSINESS',
            type: 'WATCHDOG_ALERT' as any,
            priority: 'NORMAL',
            title: `[ĐÃ MỞ KHÓA] Sách "${bookTitle}" đã được khôi phục lưu hành`,
            message: `Ban Quản Trị đã duyệt mở khóa cho tác phẩm "${bookTitle}". Gian hàng có thể tiếp tục kinh doanh bình thường.`,
            actionUrl: '/seller/products?tab=PUBLISHED',
            payload: {
              bookId,
              bookTitle,
              action: 'UNBLOCK',
              note: dto.note,
            },
          }).catch(() => null);
        }
      }
    }

    this.gateway?.emitAdminModerationEvent?.('book:moderated', {
      bookId,
      action: dto.action,
      resolvedBy: actor.sub,
      timestamp: resolvedAt.toISOString(),
    });

    return {
      success: true,
      bookId,
      action: dto.action,
      updatedCount: updateRes.modifiedCount,
    };
  }

  async appealBookUnlock(
    actor: CommunityActor,
    bookId: string,
    dto: BookUnlockAppealDto,
  ) {
    const nowIso = new Date().toISOString();
    const appealPayload = {
      message: dto.message.trim(),
      evidenceImages: Array.isArray(dto.evidenceImages) ? dto.evidenceImages : [],
      sellerId: actor.sub,
      sellerName: dto.sellerName || actor.fullName || actor.email || 'Gian hàng đối tác',
      submittedAt: nowIso,
      status: 'PENDING_UNLOCK',
    };

    const existing = await this.reports.findOne({ targetType: 'BOOK', targetId: bookId }).lean();
    if (existing) {
      await this.reports.updateMany(
        { targetType: 'BOOK', targetId: bookId },
        { $set: { 'metadata.sellerAppeal': appealPayload } },
      );
    } else {
      await this.reports.create({
        reporterId: `appeal_${actor.sub}_${Date.now()}`,
        targetType: 'BOOK',
        targetId: bookId,
        targetAuthorId: actor.sub,
        reason: 'OTHER',
        description: dto.message.trim(),
        detectionSource: 'USER_REPORT',
        violationCategory: 'OTHER',
        matchedKeywords: [],
        status: 'RESOLVED',
        action: 'DELETE',
        metadata: {
          bookTitle: dto.bookTitle || 'Tác phẩm sách',
          sellerId: actor.sub,
          sellerName: appealPayload.sellerName,
          sellerAppeal: appealPayload,
        },
      });
    }

    const bookTitle = dto.bookTitle || (existing as any)?.metadata?.bookTitle || 'Tác phẩm sách';

    if (this.notificationDelivery) {
      void this.notificationDelivery.deliver({
        sourceKey: `book.appeal:${bookId}:${Date.now()}`,
        recipientId: 'admin_channel',
        recipientType: 'ADMIN',
        type: 'WATCHDOG_ALERT' as any,
        priority: 'HIGH',
        title: 'Shop gửi giải trình & yêu cầu mở khóa sách',
        message: `Gian hàng "${appealPayload.sellerName}" đã chỉnh sửa và gửi yêu cầu mở khóa cho sách "${bookTitle}": ${dto.message.trim()}`,
        actionUrl: '/admin/book-moderation',
        payload: {
          bookId,
          bookTitle,
          sellerName: appealPayload.sellerName,
          appealMessage: dto.message.trim(),
        },
      }).catch(() => null);
    }

    this.gateway?.emitAdminModerationEvent?.('book:appealed', {
      bookId,
      bookTitle,
      sellerAppeal: appealPayload,
      timestamp: nowIso,
    });

    return {
      success: true,
      bookId,
      sellerAppeal: appealPayload,
    };
  }

  async getBookModerationDetailForSeller(bookId: string) {
    const reports = await this.reports
      .find({ targetType: 'BOOK', targetId: bookId })
      .sort({ createdAt: -1 })
      .lean();

    if (!reports.length) {
      return {
        bookId,
        status: 'NONE',
        resolutionNote: null,
        moderatedAt: null,
        sellerAppeal: null,
        reports: [],
      };
    }

    let latestAppeal: any = null;
    const mappedReports = reports.map((r: any) => {
      const meta = r.metadata || {};
      if (
        meta.sellerAppeal &&
        (!latestAppeal ||
          new Date(meta.sellerAppeal.submittedAt || 0).getTime() >
            new Date(latestAppeal.submittedAt || 0).getTime())
      ) {
        latestAppeal = meta.sellerAppeal;
      }
      return {
        id: r._id?.toString() || r.id,
        reason: r.reason,
        description: r.description,
        evidenceUrl: meta.evidenceUrl,
        evidenceImages: Array.isArray(meta.evidenceImages) ? meta.evidenceImages : [],
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      };
    });

    const primary = reports[0] as any;
    const derivedStatus =
      primary.status === 'RESOLVED'
        ? primary.action === 'NONE'
          ? 'DISMISSED'
          : 'BLOCKED'
        : primary.status === 'DISMISSED'
        ? 'DISMISSED'
        : 'PENDING_REVIEW';

    return {
      bookId,
      status: derivedStatus,
      reason: primary.reason,
      resolutionNote: primary.resolutionNote || null,
      moderatedAt: primary.resolvedAt ? new Date(primary.resolvedAt).toISOString() : null,
      sellerAppeal: latestAppeal,
      reports: mappedReports,
    };
  }

  async createAutoFlagReport(params: {
    targetType: ContentType;
    targetId: string;
    targetAuthorId?: string;
    reasons: string[];
    matchedKeywords?: string[];
    contentPreview?: string;
    bookOrStoreId?: string;
  }) {
    const isLanguageViolation = params.reasons.includes('PROFANITY');
    const reason: any = isLanguageViolation ? 'LANGUAGE_VIOLATION' : 'SPAM';
    const violationCategory = isLanguageViolation ? 'LANGUAGE_VIOLATION' : 'SPAM';
    const keywords = Array.from(new Set((params.matchedKeywords || []).filter(Boolean)));
    const keywordSuffix = keywords.length > 0 ? ` (Từ khóa: ${keywords.join(', ')})` : '';
    const previewSuffix = params.contentPreview ? ` — "${params.contentPreview.slice(0, 120)}"` : '';
    const description = isLanguageViolation
      ? `Hệ thống tự động phát hiện bình luận vi phạm ngôn từ${keywordSuffix}${previewSuffix}`
      : `Hệ thống tự động gắn cờ nội dung (${params.reasons.join(', ')})${previewSuffix}`;

    const reporterId = 'system:auto-moderation';
    const report = await this.reports.findOneAndUpdate(
      {
        reporterId,
        targetType: params.targetType,
        targetId: params.targetId,
      },
      {
        $set: {
          targetAuthorId: params.targetAuthorId,
          reason,
          description,
          detectionSource: 'AUTO_MODERATION',
          violationCategory,
          matchedKeywords: keywords,
          status: 'PENDING',
        },
        $setOnInsert: {
          reporterId,
          targetType: params.targetType,
          targetId: params.targetId,
        },
      },
      { upsert: true, new: true },
    );

    const reportViewData = this.reportView(report);
    const notifTitle = isLanguageViolation
      ? 'Phát hiện bình luận vi phạm ngôn từ'
      : 'Phát hiện bình luận nghi vấn tự động';
    const notifMsg = isLanguageViolation
      ? `Bình luận chứa từ ngữ vi phạm${keywordSuffix} đã được gắn nhãn và chuyển về hàng đợi kiểm duyệt.`
      : `Hệ thống tự động gắn cờ bình luận (${params.reasons.join(', ')}). Cần Admin kiểm duyệt.`;

    if (this.notificationDelivery) {
      void this.notificationDelivery
        .deliver({
          sourceKey: `auto-mod:${reportViewData.id}:${Date.now()}`,
          recipientId: 'admin_channel',
          recipientType: 'ADMIN',
          type: 'WATCHDOG_ALERT' as any,
          priority: isLanguageViolation ? 'HIGH' : 'NORMAL',
          title: notifTitle,
          message: notifMsg,
          actionUrl: `/admin/moderation?reason=${reason}`,
          payload: {
            reportId: reportViewData.id,
            targetType: params.targetType,
            targetId: params.targetId,
            reason,
            violationCategory,
            detectionSource: 'AUTO_MODERATION',
            matchedKeywords: keywords,
            targetBookOrStoreId: params.bookOrStoreId,
          },
        })
        .catch(() => null);
    }

    this.gateway?.emitAdminModerationEvent?.('moderation:created', {
      report: reportViewData,
    });

    return reportViewData;
  }

  async listReports(query: ReportListQueryDto) {
    const where: Record<string, unknown> = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
      ...(query.detectionSource ? { detectionSource: query.detectionSource } : {}),
    };
    if (query.reason) {
      where.reason =
        query.reason === 'LANGUAGE_VIOLATION'
          ? { $in: ['LANGUAGE_VIOLATION', 'OFFENSIVE'] }
          : query.reason;
    }
    const [items, total] = await Promise.all([
      this.reports
        .find(where)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      this.reports.countDocuments(where),
    ]);

    const reviewObjectIds = Array.from(
      new Set(
        items
          .filter((r: any) => this.isContentType(r.targetType) && Types.ObjectId.isValid(r.targetId))
          .map((r: any) => String(r.targetId)),
      ),
    ).map((id) => new Types.ObjectId(id));

    const contentMap = new Map<string, any>();
    if (reviewObjectIds.length > 0 && typeof this.reviews.find === 'function') {
      const contents = await this.reviews
        .find({ _id: { $in: reviewObjectIds } })
        .lean();
      for (const c of contents) {
        contentMap.set(String(c._id), this.contentView('REVIEW', c));
      }
    }

    return {
      data: items.map((report: any) => ({
        ...this.reportView(report),
        content: contentMap.get(String(report.targetId)) ?? null,
      })),
      pagination: this.pagination(query.page, query.limit, total),
    };
  }

  async reportDetail(id: string) {
    const report = await this.reports.findById(id).lean();
    if (!report) throwNotFound(ErrorCode.MODERATION_REPORT_NOT_FOUND);
    const contentType = this.isContentType(report!.targetType)
      ? report!.targetType
      : null;
    const content = contentType
      ? await this.findContent(contentType, report!.targetId)
      : null;
    return {
      data: {
        ...this.reportView(report!),
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
    if (!existing) throwNotFound(ErrorCode.MODERATION_REPORT_NOT_FOUND);
    if (existing!.status === 'REVIEWING' && existing!.reviewedBy === actor.sub) {
      return {
        message: 'Report is being reviewed',
        data: this.reportView(existing!),
      };
    }
    throwConflict(ErrorCode.MODERATION_REPORT_NOT_FOUND);
  }

  async resolve(actor: CommunityActor, id: string, dto: ResolveReportDto) {
    const report = await this.reports.findById(id);
    if (!report) throwNotFound(ErrorCode.MODERATION_REPORT_NOT_FOUND);
    if (['RESOLVED', 'DISMISSED'].includes(report!.status)) {
      throwConflict(ErrorCode.MODERATION_REPORT_ALREADY_EXISTS);
    }
    if (dto.outcome === 'DISMISSED' && dto.action !== 'NONE') {
      throwConflict(ErrorCode.MODERATION_CONTENT_DELETED);
    }
    if (
      ['HIDE', 'DELETE'].includes(dto.action) &&
      !this.isContentType(report!.targetType)
    ) {
      throwConflict(ErrorCode.MODERATION_CONTENT_DELETED);
    }
    if (['WARN', 'BAN'].includes(dto.action) && !report!.targetAuthorId) {
      throwConflict(ErrorCode.MODERATION_CONTENT_DELETED);
    }

    let shouldUpdateContent = true;
    if (
      this.isContentType(report!.targetType) &&
      (dto.outcome === 'DISMISSED' || dto.action === 'NONE')
    ) {
      const otherOpenReports = await this.reports.countDocuments({
        _id: { $ne: report!._id },
        targetType: report!.targetType,
        targetId: report!.targetId,
        status: { $in: ['PENDING', 'REVIEWING'] },
      });
      shouldUpdateContent = otherOpenReports === 0;
    }
    if (this.isContentType(report!.targetType) && shouldUpdateContent) {
      await this.applyContentAction(
        report!.targetType,
        report!.targetId,
        dto.outcome === 'DISMISSED' ? 'NONE' : dto.action,
        actor.sub,
        dto.note,
      );
    }
    const now = new Date();
    report!.status = dto.outcome;
    report!.reviewedBy ??= actor.sub;
    report!.reviewedAt ??= now;
    report!.resolvedBy = actor.sub;
    report!.resolvedAt = now;
    report!.action = dto.outcome === 'DISMISSED' ? 'NONE' : dto.action;
    report!.resolutionNote = dto.note.trim();
    await report!.save();

    if (['WARN', 'BAN'].includes(report!.action)) {
      void this.publish('user.moderation.requested', report!.id, {
        reportId: report!.id,
        userId: report!.targetAuthorId,
        action: report!.action,
        reason: report!.resolutionNote,
        requestedBy: actor.sub,
      });
    }
    void this.publish('moderation.report.resolved', report!.id, {
      reportId: report!.id,
      status: report!.status,
      action: report!.action,
      targetType: report!.targetType,
      targetId: report!.targetId,
      resolvedBy: actor.sub,
    });
    const resolvedView = this.reportView(report!);
    this.gateway?.emitAdminModerationEvent?.('moderation:resolved', {
      report: resolvedView,
    });
    return { message: 'Report resolved', data: resolvedView };
  }

  async queue(query: ModerationQueueQueryDto) {
    const types: ContentType[] = query.targetType
      ? [query.targetType]
      : ['REVIEW'];
    const statuses = query.status
      ? [query.status]
      : ['PENDING_REVIEW', 'FLAGGED'];
    const take = query.page * query.limit;
    const [groups, counts] = await Promise.all([
      Promise.all(
        types.map(async (type) => {
          const items = await this.model(type)
            .find({
              $or: [
                { status: { $in: statuses } },
                ...(!query.status ? [{ isReported: true, status: 'PUBLISHED' }] : []),
              ],
            })
            .sort({ createdAt: -1 })
            .limit(take)
            .lean();
          return items.map((item) => this.contentView(type, item));
        }),
      ),
      Promise.all(
        types.map((type) =>
          this.model(type).countDocuments({
            $or: [
              { status: { $in: statuses } },
              ...(!query.status ? [{ isReported: true, status: 'PUBLISHED' }] : []),
            ],
          }),
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
      data: this.contentView(targetType, content!),
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
    const result = await this.reviews.updateOne(
      { _id: new Types.ObjectId(targetId), status: { $ne: 'DELETED' } },
      {
        $set: {
          status,
          isReported: false,
          moderatedBy: adminId,
          moderatedAt: new Date(),
          moderationNote: note.trim(),
          ...(status === 'PUBLISHED' ? { reportCount: 0 } : {}),
        },
        ...(status === 'PUBLISHED' ? { $unset: { lastReportReason: '' } } : {}),
      },
    );
    if (!result.matchedCount) throwNotFound(ErrorCode.MODERATION_REPORT_NOT_FOUND);
    this.gateway?.emitReviewEvent(
      status === 'PUBLISHED' ? 'review:updated' : 'review:removed',
      {
        targetType: current!.targetType,
        targetId: current!.targetId,
        storeId: current!.storeId,
        storeOwnerId: current!.storeOwnerId,
        authorId: current!.authorId,
        reviewId: targetId,
        ...(status === 'PUBLISHED'
          ? {
              review: {
                id: targetId,
                status: 'PUBLISHED',
                isReported: false,
                reportCount: 0,
                moderationNote: note.trim(),
              },
            }
          : {}),
      },
    );
  }

  private async requireContent(
    targetType: ContentType,
    targetId: string,
    includeDeleted = false,
  ): Promise<ContentDocument | null> {
    const content = await this.findContent(targetType, targetId);
    if (!content || (!includeDeleted && content.status === 'DELETED')) {
      throwNotFound(ErrorCode.MODERATION_REPORT_NOT_FOUND);
    }
    return content as ContentDocument;
  }

  private findContent(targetType: ContentType, targetId: string) {
    return this.reviews.findById(new Types.ObjectId(targetId));
  }

  private model(targetType: ContentType): Model<any> {
    return this.reviews;
  }

  private isContentType(type: ReportTargetType): type is ContentType {
    return type === 'REVIEW';
  }

  private reportView(report: any) {
    const isLanguage = ['LANGUAGE_VIOLATION', 'OFFENSIVE'].includes(report.reason);
    return {
      id: report._id?.toString() ?? report.id,
      reporterId: report.reporterId,
      targetType: report.targetType,
      targetId: report.targetId,
      targetAuthorId: report.targetAuthorId,
      reason: report.reason,
      description: report.description,
      detectionSource:
        report.detectionSource ??
        (report.reporterId === 'system:auto-moderation'
          ? 'AUTO_MODERATION'
          : 'USER_REPORT'),
      violationCategory:
        report.violationCategory ??
        (isLanguage ? 'LANGUAGE_VIOLATION' : report.reason),
      matchedKeywords: Array.isArray(report.matchedKeywords)
        ? report.matchedKeywords
        : [],
      status: report.status,
      reviewedBy: report.reviewedBy,
      reviewedAt: report.reviewedAt,
      resolvedBy: report.resolvedBy,
      resolvedAt: report.resolvedAt,
      action: report.action,
      resolutionNote: report.resolutionNote,
      metadata: report.metadata || {},
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  private contentView(targetType: ContentType, content: any) {
    return {
      targetType,
      id: content._id.toString(),
      targetId: content.targetId,
      rating: content.rating,
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
