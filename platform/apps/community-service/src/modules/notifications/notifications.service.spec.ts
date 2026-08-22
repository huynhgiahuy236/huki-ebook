import { Types } from "mongoose";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  const notifications = {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
  };
  const preferences = { findOneAndUpdate: jest.fn() };
  const devices = { updateOne: jest.fn(), deleteOne: jest.fn() };
  const gateway = { read: jest.fn(), readAll: jest.fn() };
  const service = new NotificationsService(
    notifications as any,
    preferences as any,
    devices as any,
    gateway as any,
  );
  const actor = { sub: "user-1", role: "USER" };

  beforeEach(() => jest.clearAllMocks());

  it("lists only the current recipient notifications and unread count", async () => {
    const rows = [{ id: "notification-1", type: "SYSTEM", isRead: false }];
    notifications.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(rows),
    });
    notifications.countDocuments
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(4);

    const result = await service.list(actor, {
      page: 1,
      limit: 20,
      isRead: false,
    });

    expect(notifications.find).toHaveBeenCalledWith({
      recipientId: actor.sub,
      isRead: false,
    });
    expect(result.unreadCount).toBe(4);
    expect(result.pagination.totalPages).toBe(1);
  });

  it("marks an owned notification as read idempotently", async () => {
    const id = new Types.ObjectId().toString();
    notifications.findOneAndUpdate.mockResolvedValue({
      id,
      type: "SYSTEM",
      isRead: true,
      readAt: new Date(),
    });
    await service.markRead(actor, id);
    expect(notifications.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: actor.sub, isRead: false }),
      { $set: { isRead: true, readAt: expect.any(Date) } },
      { new: true },
    );
    expect(gateway.read).toHaveBeenCalledWith(actor.sub, id);
  });

  it("updates nested preferences without replacing sibling values", async () => {
    preferences.findOneAndUpdate.mockResolvedValue({
      orderUpdates: true,
      promotions: false,
      newReviews: true,
      chatMessages: true,
      forumActivity: true,
      emailNotifications: {},
      pushNotifications: { enabled: true, orderUpdates: false },
    });
    await service.updateSettings(actor, {
      promotions: false,
      pushNotifications: { orderUpdates: false },
    });
    expect(preferences.findOneAndUpdate).toHaveBeenCalledWith(
      { recipientId: actor.sub },
      expect.objectContaining({
        $set: {
          promotions: false,
          "pushNotifications.orderUpdates": false,
        },
      }),
      expect.objectContaining({ upsert: true }),
    );
  });

  it("upserts a device token and transfers it to the current recipient", async () => {
    devices.updateOne.mockResolvedValue({ upsertedCount: 1 });
    await service.registerDevice(actor, {
      deviceToken: "a-valid-fcm-device-token",
      deviceType: "ANDROID",
      appVersion: "1.0.0",
    });
    expect(devices.updateOne).toHaveBeenCalledWith(
      { deviceToken: "a-valid-fcm-device-token" },
      expect.objectContaining({
        $set: expect.objectContaining({
          recipientId: actor.sub,
          enabled: true,
        }),
      }),
      { upsert: true },
    );
  });
});
