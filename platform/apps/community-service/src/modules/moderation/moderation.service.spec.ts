import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  const reports = {
    create: jest.fn(),
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
  };
    const reviews = {
    findById: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
  const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
  const service = new ModerationService(
    reports as any,
    reviews as any,
    eventBus as any,
  );
  const actor = { sub: 'user-1', role: 'USER' };
  const admin = { sub: 'admin-1', role: 'PLATFORM_ADMIN' };

  beforeEach(() => jest.clearAllMocks());

  it('stores a unique report, marks review as reported without hiding it, and emits user.reported', async () => {
    const id = new Types.ObjectId();
    reviews.findById.mockResolvedValue({
      _id: id,
      authorId: 'author-1',
      status: 'PUBLISHED',
    });
    reports.create.mockResolvedValue({
      id: 'report-1',
      status: 'PENDING',
    });
    reviews.findOneAndUpdate.mockResolvedValue({
      _id: id,
      status: 'PUBLISHED',
      isReported: true,
      reportCount: 1,
    });

    const result = await service.report(actor as any, 'REVIEW', id.toString(), {
      reason: 'SPAM',
      description: 'Spam review',
    });

    expect(reviews.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: id }),
      expect.objectContaining({
        $inc: { reportCount: 1 },
        $set: expect.objectContaining({
          isReported: true,
          lastReportReason: 'SPAM',
        }),
      }),
      { new: true },
    );
    expect(result.data.status).toBe('PENDING');
    await Promise.resolve();
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'user.reported' }),
    );
  });

  it('rejects reporting your own review', async () => {
    const id = new Types.ObjectId();
    reviews.findById.mockResolvedValue({
      _id: id,
      authorId: actor.sub,
      status: 'PUBLISHED',
    });
    await expect(
      service.report(actor as any, 'REVIEW', id.toString(), { reason: 'OTHER' }),
    ).rejects.toThrow();
  });

  it('maps the unique report index to conflict error', async () => {
    const id = new Types.ObjectId();
    reviews.findById.mockResolvedValue({
      _id: id,
      authorId: 'author-1',
      status: 'PUBLISHED',
    });
    reports.create.mockRejectedValue({ code: 11000 });
    await expect(
      service.report(actor as any, 'REVIEW', id.toString(), { reason: 'SPAM' }),
    ).rejects.toThrow();
  });

  it('resolves a report and hides the target review', async () => {
    const id = new Types.ObjectId();
    const report = {
      id: 'report-1',
      reporterId: 'user-1',
      targetType: 'REVIEW',
      targetId: id.toString(),
      targetAuthorId: 'author-1',
      status: 'REVIEWING',
      save: jest.fn().mockResolvedValue(undefined),
    };
    reports.findById.mockResolvedValue(report);
    reviews.findById.mockResolvedValue({
      _id: id,
      authorId: 'author-1',
      status: 'FLAGGED',
    });
    reviews.updateOne.mockResolvedValue({ matchedCount: 1 });

    await service.resolve(admin as any, 'report-1', {
      outcome: 'RESOLVED',
      action: 'HIDE',
      note: 'Vi phạm quy định đánh giá',
    });

    expect(reviews.updateOne).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'HIDDEN' }),
      }),
    );
    expect(report.status).toBe('RESOLVED');
    expect(report.save).toHaveBeenCalled();
  });

  it('notifies admin channel and emits realtime events on report and resolve hide', async () => {
    const gateway = { emitReviewEvent: jest.fn() };
    const notificationDelivery = {
      deliver: jest.fn().mockResolvedValue(undefined),
    };
    const svc = new ModerationService(
      reports as any,
      reviews as any,
      eventBus as any,
      gateway as any,
      notificationDelivery as any,
    );

    const id = new Types.ObjectId();
    reviews.findById.mockResolvedValue({
      _id: id,
      authorId: 'author-1',
      targetType: 'BOOK',
      targetId: 'book-123',
      storeId: 'store-123',
      storeOwnerId: 'owner-123',
      status: 'PUBLISHED',
    });
    reports.create.mockResolvedValue({
      id: 'report-rt-1',
      status: 'PENDING',
    });
    reviews.findOneAndUpdate.mockResolvedValue({
      _id: id,
      status: 'PUBLISHED',
      isReported: true,
      reportCount: 1,
    });
    reviews.updateOne.mockResolvedValue({ matchedCount: 1 });

    await svc.report(actor as any, 'REVIEW', id.toString(), {
      reason: 'SPAM',
      description: 'Bình luận quảng cáo rác',
    });

    await Promise.resolve();
    expect(notificationDelivery.deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientType: 'ADMIN',
        recipientId: 'admin_channel',
        actionUrl: '/admin/moderation',
      }),
    );
    expect(gateway.emitReviewEvent).toHaveBeenCalledWith(
      'review:updated',
      expect.objectContaining({ reviewId: id.toString() }),
    );

    const reportDoc = {
      id: 'report-rt-1',
      reporterId: 'user-1',
      targetType: 'REVIEW',
      targetId: id.toString(),
      targetAuthorId: 'author-1',
      status: 'REVIEWING',
      save: jest.fn().mockResolvedValue(undefined),
    };
    reports.findById.mockResolvedValue(reportDoc);
    await svc.resolve(admin as any, 'report-rt-1', {
      outcome: 'RESOLVED',
      action: 'HIDE',
      note: 'Ẩn đánh giá spam',
    });

    expect(gateway.emitReviewEvent).toHaveBeenCalledWith(
      'review:removed',
      expect.objectContaining({ reviewId: id.toString() }),
    );
  });

  it('hydrates reported review content in listReports for admin moderation review', async () => {
    const id = new Types.ObjectId();
    (reports as any).find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId(),
          reporterId: 'seller-1',
          targetType: 'REVIEW',
          targetId: id.toString(),
          reason: 'SPAM',
          description: 'Báo cáo spam',
          status: 'REVIEWING',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });
    reports.countDocuments.mockResolvedValue(1);
    reviews.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        {
          _id: id,
          targetId: 'book-123',
          rating: 5,
          title: 'Tiêu đề đánh giá',
          content: 'Nội dung đánh giá chi tiết của khách hàng',
          authorId: 'buyer-1',
          authorName: 'Nguyễn Văn A',
          status: 'PUBLISHED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });

    const result = await service.listReports({ page: 1, limit: 20 } as any);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].content).toEqual(
      expect.objectContaining({
        id: id.toString(),
        targetId: 'book-123',
        rating: 5,
        title: 'Tiêu đề đánh giá',
        content: 'Nội dung đánh giá chi tiết của khách hàng',
        authorName: 'Nguyễn Văn A',
      }),
    );
  });

  it('creates LANGUAGE_VIOLATION auto-moderation report, notifies admin_channel, and emits moderation:created', async () => {
    const gateway = { emitReviewEvent: jest.fn(), emitAdminModerationEvent: jest.fn() };
    const notificationDelivery = {
      deliver: jest.fn().mockResolvedValue(undefined),
    };
    const svc = new ModerationService(
      reports as any,
      reviews as any,
      eventBus as any,
      gateway as any,
      notificationDelivery as any,
    );
    const targetId = new Types.ObjectId().toString();
    const createdDoc = {
      id: 'auto-rep-1',
      _id: 'auto-rep-1',
      reporterId: 'system:auto-moderation',
      targetType: 'REVIEW',
      targetId,
      targetAuthorId: 'author-bad',
      reason: 'LANGUAGE_VIOLATION',
      detectionSource: 'AUTO_MODERATION',
      violationCategory: 'LANGUAGE_VIOLATION',
      matchedKeywords: ['lừa đảo', 'ngu ngốc'],
      description: 'Hệ thống tự động phát hiện bình luận vi phạm ngôn từ (Từ khóa: lừa đảo, ngu ngốc)',
      status: 'PENDING',
    };
    reports.findOneAndUpdate.mockResolvedValue(createdDoc);

    const res = await svc.createAutoFlagReport({
      targetType: 'REVIEW',
      targetId,
      targetAuthorId: 'author-bad',
      reasons: ['PROFANITY'],
      matchedKeywords: ['lừa đảo', 'ngu ngốc'],
      contentPreview: 'Sách lừa đảo ngu ngốc',
    });

    await Promise.resolve();
    expect(reports.findOneAndUpdate).toHaveBeenCalledWith(
      {
        reporterId: 'system:auto-moderation',
        targetType: 'REVIEW',
        targetId,
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          reason: 'LANGUAGE_VIOLATION',
          detectionSource: 'AUTO_MODERATION',
          violationCategory: 'LANGUAGE_VIOLATION',
          matchedKeywords: ['lừa đảo', 'ngu ngốc'],
        }),
      }),
      { upsert: true, new: true },
    );
    expect(notificationDelivery.deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientType: 'ADMIN',
        recipientId: 'admin_channel',
        type: 'WATCHDOG_ALERT',
        actionUrl: '/admin/moderation?reason=LANGUAGE_VIOLATION',
      }),
    );
    expect(gateway.emitAdminModerationEvent).toHaveBeenCalledWith(
      'moderation:created',
      expect.objectContaining({
        report: expect.objectContaining({
          id: 'auto-rep-1',
          reason: 'LANGUAGE_VIOLATION',
          detectionSource: 'AUTO_MODERATION',
        }),
      }),
    );
    expect(res).toEqual(expect.objectContaining({ reason: 'LANGUAGE_VIOLATION' }));
  });
});
