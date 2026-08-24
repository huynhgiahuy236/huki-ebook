import { BadGatewayException, ForbiddenException } from "@nestjs/common";
import { ReviewVerificationService } from "./review-verification.service";

describe("ReviewVerificationService", () => {
  const config = {
    get: jest.fn((key: string) =>
      key === "services.commerceUrl" ? "http://commerce" : "http://business",
    ),
  };
  const service = new ReviewVerificationService(config as any);
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
  });

  it("finds a completed purchase for the requested book format", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "order-1",
            status: "COMPLETED",
            sellerOrders: [
              {
                id: "seller-order-1",
                storeId: "store-1",
                status: "COMPLETED",
                items: [{ bookId: "book-1", format: "DIGITAL" }],
              },
            ],
          },
        ],
        pagination: { totalPages: 1 },
      }),
    });

    await expect(
      service.bookPurchase("Bearer token", "book-1", "DIGITAL"),
    ).resolves.toEqual({
      orderId: "order-1",
      sellerOrderId: "seller-order-1",
      storeId: "store-1",
      format: "DIGITAL",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://commerce/api/v1/orders?status=COMPLETED&page=1&limit=100",
      expect.objectContaining({
        headers: { authorization: "Bearer token" },
      }),
    );
  });

  it("rejects a store review when the completed order has no matching store", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "order-1",
        status: "COMPLETED",
        sellerOrders: [],
      }),
    });

    await expect(
      service.storePurchase("Bearer token", "order-1", "store-1"),
    ).resolves.toBeNull();
  });

  it("verifies that a business actor belongs to the reviewed store", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: "store-1",
            name: "HUKI Store",
            business: { id: "business-1" },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "member" }),
      });

    await expect(
      service.businessAccess("Bearer token", "actor-1", "store-1"),
    ).resolves.toEqual({
      businessId: "business-1",
      storeId: "store-1",
      storeName: "HUKI Store",
    });
  });

  it("denies business access when the store does not exist", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    await expect(
      service.businessAccess("Bearer token", "actor-1", "store-1"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("maps dependency failures to a gateway error", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await expect(
      service.storePurchase("Bearer token", "order-1", "store-1"),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
