import { NotificationGateway } from "./notification.gateway";

describe("NotificationGateway", () => {
  const jwt = { verifyAsync: jest.fn() };
  const gateway = new NotificationGateway(jwt as any);

  beforeEach(() => jest.clearAllMocks());

  it("authenticates the socket and joins the recipient room", async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: "user-1", role: "USER" });
    const client = {
      handshake: { auth: { token: "access-token" }, headers: {} },
      data: {},
      join: jest.fn(),
      disconnect: jest.fn(),
    };
    await gateway.handleConnection(client as any);
    expect(jwt.verifyAsync).toHaveBeenCalledWith("access-token");
    expect(client.join).toHaveBeenCalledWith("user:user-1");
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it("emits notifications only to the recipient room", () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    (gateway as any).server = { to };
    gateway.notification("user-1", { id: "notification-1" });
    expect(to).toHaveBeenCalledWith("user:user-1");
    expect(emit).toHaveBeenCalledWith("notification", {
      id: "notification-1",
    });
  });
});
