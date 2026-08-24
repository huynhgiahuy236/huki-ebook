import { NotificationDeliveryService } from "./notification-delivery.service";

describe("NotificationDeliveryService", () => {
  const notifications = { updateOne: jest.fn(), findOne: jest.fn() };
  const preferences = { findOne: jest.fn() };
  const devices = { find: jest.fn(), updateMany: jest.fn() };
  const gateway = { notification: jest.fn() };
  const firebase = { send: jest.fn() };
  const eventBus = { publish: jest.fn() };
  const service = new NotificationDeliveryService(
    notifications as any,
    preferences as any,
    devices as any,
    gateway as any,
    firebase as any,
    eventBus as any,
  );
  const input = {
    sourceKey: "event-1:user-1:NEW_MESSAGE",
    recipientId: "user-1",
    recipientType: "USER" as const,
    type: "NEW_MESSAGE" as const,
    title: "New message",
    message: "Hello",
    payload: { conversationId: "conversation-1" },
  };

  beforeEach(() => jest.clearAllMocks());

  it("persists once, emits realtime and sends push", async () => {
    preferences.findOne.mockResolvedValue(null);
    notifications.updateOne.mockResolvedValue({ upsertedCount: 1 });
    notifications.findOne.mockResolvedValue({
      id: "notification-1",
      ...input,
      isRead: false,
    });
    devices.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ deviceToken: "device-token-1" }]),
    });
    firebase.send.mockResolvedValue([]);
    eventBus.publish.mockResolvedValue(undefined);

    await expect(service.deliver(input)).resolves.toBeTruthy();
    expect(gateway.notification).toHaveBeenCalledWith(
      input.recipientId,
      expect.objectContaining({ type: "NEW_MESSAGE" }),
    );
    expect(firebase.send).toHaveBeenCalledWith(
      ["device-token-1"],
      expect.objectContaining({ title: input.title }),
    );
  });

  it("does not redeliver an idempotent event", async () => {
    preferences.findOne.mockResolvedValue(null);
    notifications.updateOne.mockResolvedValue({ upsertedCount: 0 });
    await expect(service.deliver(input)).resolves.toBeNull();
    expect(gateway.notification).not.toHaveBeenCalled();
    expect(firebase.send).not.toHaveBeenCalled();
  });

  it("honors disabled chat notification preference", async () => {
    preferences.findOne.mockResolvedValue({ chatMessages: false });
    await expect(service.deliver(input)).resolves.toBeNull();
    expect(notifications.updateOne).not.toHaveBeenCalled();
  });

  it("disables invalid FCM tokens returned by Firebase", async () => {
    preferences.findOne.mockResolvedValue(null);
    notifications.updateOne.mockResolvedValue({ upsertedCount: 1 });
    notifications.findOne.mockResolvedValue({
      id: "notification-1",
      ...input,
      isRead: false,
    });
    devices.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([{ deviceToken: "invalid-token" }]),
    });
    firebase.send.mockResolvedValue(["invalid-token"]);
    eventBus.publish.mockResolvedValue(undefined);

    await service.deliver(input);
    expect(devices.updateMany).toHaveBeenCalledWith(
      { deviceToken: { $in: ["invalid-token"] } },
      { $set: { enabled: false } },
    );
  });
});
