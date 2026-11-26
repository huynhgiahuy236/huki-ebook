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
        actionUrl: "/seller/chat?conversationId=conversation-1",
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

  it("uses /book/:id#reviews for buyer notification links on review.created and review.replied", () => {
    const createdTargets = (consumer as any).targets({
      eventType: "review.created",
      payload: {
        reviewId: "review-2",
        authorId: "buyer-1",
        targetType: "BOOK",
        targetId: "book-1",
        rating: 5,
        storeId: "store-1",
      },
    });
    expect(createdTargets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recipientId: "store-1",
          recipientType: "BUSINESS",
          actionUrl: "/seller/reviews?reviewId=review-2",
        }),
        expect.objectContaining({
          recipientId: "buyer-1",
          recipientType: "USER",
          actionUrl: "/book/book-1#reviews",
        }),
      ]),
    );

    const repliedTargets = (consumer as any).targets({
      eventType: "review.replied",
      payload: {
        reviewId: "review-2",
        userId: "buyer-1",
        storeName: "HuKi Store",
        content: "Cảm ơn bạn",
        bookId: "book-1",
      },
    });
    expect(repliedTargets).toEqual([
      expect.objectContaining({
        recipientId: "buyer-1",
        recipientType: "USER",
        type: "NEW_REVIEW",
        actionUrl: "/book/book-1#reviews",
      }),
    ]);
  });

  it("expands BUSINESS chat recipients to store owner user IDs so bell, badge, and push reach the seller", async () => {
    const resolver = {
      resolveTarget: jest.fn().mockResolvedValue({
        businessIds: ["biz-1"],
        storeIds: ["store-1"],
        ownerUserIds: ["owner-user-1", "staff-user-2"],
      }),
    };
    const resolvedConsumer = new NotificationEventConsumer(
      bus as any,
      delivery as any,
      resolver as any,
    );

    await (resolvedConsumer as any).handle({
      eventId: "evt-chat-1",
      eventType: "chat.message.sent",
      payload: {
        conversationId: "conv-1",
        recipients: [{ id: "store-1", type: "BUSINESS" }],
        message: { id: "msg-1", senderName: "Buyer A", content: "Sách còn không shop?" },
      },
    });

    expect(resolver.resolveTarget).toHaveBeenCalledWith("store-1");
    expect(delivery.deliver).toHaveBeenCalledTimes(2);
    expect(delivery.deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "owner-user-1",
        recipientType: "BUSINESS",
        type: "NEW_MESSAGE",
        sourceKey: "evt-chat-1:owner-user-1:NEW_MESSAGE",
      }),
    );
    expect(delivery.deliver).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "staff-user-2",
        recipientType: "BUSINESS",
        type: "NEW_MESSAGE",
        sourceKey: "evt-chat-1:staff-user-2:NEW_MESSAGE",
      }),
    );
  });
});
