import { createHash } from "node:crypto";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { policyConfig } from "@huki/shared";
import { ForbiddenException } from "@nestjs/common";

describe("AuthService refresh rotation & DRM active device limits", () => {
  const tx = {
    refreshToken: {
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    authSession: {
      count: jest.fn(),
      create: jest.fn(),
    },
    $executeRaw: jest.fn().mockResolvedValue(1),
  };
  const prisma = {
    refreshToken: { findFirst: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
    authSession: { count: jest.fn(), create: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const jwt = { sign: jest.fn().mockReturnValue("new-access-token") };
  const config = {
    get: jest.fn((key: string) => (key === "jwt.secret" ? "secret" : "15m")),
  };
  const email = {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };
  const service = new AuthService(
    prisma as any,
    jwt as any,
    config as any,
    { emit: jest.fn() } as any,
    email as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(bcrypt, "compare").mockImplementation(async () => true);
  });

  it("revokes the old refresh token and returns a replacement", async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: "old-token-id",
      sessionId: "session-id",
      tokenFamily: "family-id",
      expiresAt: new Date(Date.now() + 60_000),
      session: { revokedAt: null, user: { id: "user-id" } },
    });
    tx.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    tx.refreshToken.create.mockResolvedValue({ id: "new-token-id" });

    const result = await service.refreshToken({
      refreshToken: "old-refresh-token",
    });

    expect(result).toMatchObject({
      accessToken: "new-access-token",
      expiresIn: 900,
    });
    expect(result.refreshToken).not.toBe("old-refresh-token");
    expect(tx.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: "session-id",
        tokenFamily: "family-id",
        tokenHash: createHash("sha256")
          .update(result.refreshToken)
          .digest("hex"),
      }),
    });
    expect(tx.refreshToken.update).toHaveBeenCalledWith({
      where: { id: "old-token-id" },
      data: { replacedByTokenId: "new-token-id" },
    });
  });

  it("stores a reset token and sends the password reset email", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-id",
      email: "user@example.com",
    });
    prisma.user.update.mockResolvedValue({ id: "user-id" });

    await service.forgotPassword({ email: "USER@example.com" });

    const token = prisma.user.update.mock.calls[0][0].data.passwordResetToken;
    expect(token).toEqual(expect.any(String));
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
    });
    expect(email.sendPasswordResetEmail).toHaveBeenCalledWith(
      "user@example.com",
      token,
    );
  });

  describe("DRM Device Limit Enforcement (POL-04 / DRM-003 / DEC-007)", () => {
    const mockUser = {
      id: "user-uuid-1",
      email: "reader@huki.vn",
      passwordHash: "hashed-pw",
      status: "ACTIVE",
      role: "USER",
      failedLoginAttempts: 0,
      lockedUntil: null,
    };

    it("TEST 1: limit = 3, active = 0 -> login creates new session successfully", async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      tx.authSession.count.mockResolvedValue(0);
      tx.authSession.create.mockResolvedValue({ id: "session-1" });

      const result = await service.login(
        { email: "reader@huki.vn", password: "password123" },
        "Chrome on MacOS",
        "127.0.0.1",
      );

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(tx.authSession.count).toHaveBeenCalledWith({
        where: {
          userId: "user-uuid-1",
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
      });
      expect(tx.authSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-uuid-1",
          userAgent: "Chrome on MacOS",
          ipAddress: "127.0.0.1",
        }),
      });
    });

    it("TEST 2: limit = 3, active = 2 -> login creates new session successfully", async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      tx.authSession.count.mockResolvedValue(2);
      tx.authSession.create.mockResolvedValue({ id: "session-3" });

      const result = await service.login(
        { email: "reader@huki.vn", password: "password123" },
        "Safari on iPad",
        "127.0.0.1",
      );

      expect(result).toHaveProperty("accessToken");
      expect(tx.authSession.create).toHaveBeenCalled();
    });

    it("TEST 3: limit = 3, active = 3 -> rejects new device with AUTHZ_FORBIDDEN", async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      tx.authSession.count.mockResolvedValue(3);

      await expect(
        service.login(
          { email: "reader@huki.vn", password: "password123" },
          "Boox Palma E-ink",
          "127.0.0.1",
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(tx.authSession.create).not.toHaveBeenCalled();
    });

    it("TEST 4: dynamic limit = 5, active = 3 -> allows login (not hardcoded to 3)", async () => {
      const drmSpy = jest
        .spyOn(policyConfig, "drmMaxActiveDevices", "get")
        .mockReturnValue(5);

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      tx.authSession.count.mockResolvedValue(3);
      tx.authSession.create.mockResolvedValue({ id: "session-4" });

      const result = await service.login(
        { email: "reader@huki.vn", password: "password123" },
        "Device 4",
        "127.0.0.1",
      );

      expect(result).toHaveProperty("accessToken");
      expect(tx.authSession.create).toHaveBeenCalled();

      drmSpy.mockRestore();
    });

    it("TEST 5 & 6: query excludes revoked and expired sessions", async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      tx.authSession.count.mockResolvedValue(1);
      tx.authSession.create.mockResolvedValue({ id: "session-new" });

      await service.login(
        { email: "reader@huki.vn", password: "password123" },
        "Device New",
        "127.0.0.1",
      );

      expect(tx.authSession.count).toHaveBeenCalledWith({
        where: {
          userId: "user-uuid-1",
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
      });
    });

    it("TEST 8: concurrent attempts evaluated inside atomic transaction", async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);

      // Simulating when slot limit is reached during transaction execution
      tx.authSession.count.mockResolvedValue(3);

      await expect(
        service.login(
          { email: "reader@huki.vn", password: "password123" },
          "Concurrent Device",
          "127.0.0.1",
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("TEST 10: token refresh rotates within same session without incrementing device count", async () => {
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: "old-tok",
        sessionId: "existing-session",
        tokenFamily: "fam-1",
        expiresAt: new Date(Date.now() + 60_000),
        session: { revokedAt: null, user: mockUser },
      });
      tx.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      tx.refreshToken.create.mockResolvedValue({ id: "new-tok" });

      await service.refreshToken({ refreshToken: "valid-tok" });

      // refreshToken does not create a new authSession or invoke quota count
      expect(tx.authSession.create).not.toHaveBeenCalled();
      expect(tx.authSession.count).not.toHaveBeenCalled();
    });
  });
});

