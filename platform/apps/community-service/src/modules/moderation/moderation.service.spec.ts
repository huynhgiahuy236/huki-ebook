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
});
