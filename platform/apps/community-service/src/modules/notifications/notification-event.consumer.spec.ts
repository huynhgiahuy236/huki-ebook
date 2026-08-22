import { ORDER_EVENTS, SHIPPING_EVENTS } from "../../../../../libs/shared/src";
import { NotificationEventConsumer } from "./notification-event.consumer";

describe("NotificationEventConsumer", () => {
  const bus = { subscribe: jest.fn() };
  const delivery = { deliver: jest.fn() };
  const consumer = new NotificationEventConsumer(bus as any, delivery as any);

  beforeEach(() => jest.clearAllMocks());

  it("subscribes the durable notification queue", () => {
    consumer.onApplicationBootstrap();
    expect(bus.subscribe).toHaveBeenCalledWith(
      "community-service.order-confirmations",
      expect.arrayContaining([
        ORDER_EVENTS.CREATED,
        SHIPPING_EVENTS.CREATED,
        SHIPPING_EVENTS.DELIVERED,
        "chat.message.sent",
        "review.created",
      ]),
      expect.any(Function),
    );
  });

  it("creates buyer and seller notifications from order events", () => {
    const targets = (consumer as any).targets({
      eventType: ORDER_EVENTS.CREATED,
      payload: {
        orderId: "order-1",
        orderCode: "HUK-001",
        userId: "user-1",
        sellerOrders: [
          { sellerOrderId: "seller-order-1", ownerUserId: "owner-1" },
        ],
      },
    });
    expect(targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ recipientId: "user-1" }),
        expect.objectContaining({
          recipientId: "owner-1",
          recipientType: "BUSINESS",
        }),
      ]),
    );
  });

  it("preserves participant type for chat recipients", () => {
    const targets = (consumer as any).targets({
      eventType: "chat.message.sent",
      payload: {
        conversationId: "conversation-1",
        recipients: [{ id: "owner-1", type: "BUSINESS" }],
        message: { senderName: "Customer", content: "Hello" },
      },
    });
    expect(targets[0]).toEqual(
      expect.objectContaining({
        recipientId: "owner-1",
        recipientType: "BUSINESS",
        type: "NEW_MESSAGE",
      }),
    );
  });

  it("notifies the store owner about a verified review", () => {
    const targets = (consumer as any).targets({
      eventType: "review.created",
      payload: {
        reviewId: "review-1",
        rating: 5,
        storeOwnerId: "owner-1",
      },
    });
    expect(targets).toEqual([
      expect.objectContaining({
        recipientId: "owner-1",
        type: "NEW_REVIEW",
      }),
    ]);
  });
});
