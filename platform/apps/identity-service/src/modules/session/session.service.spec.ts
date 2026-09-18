import { NotFoundException } from '@nestjs/common';
import { SessionService } from './session.service';

describe('SessionService - Device Slot Management & Isolation', () => {
  const tx = [
    jest.fn(),
    jest.fn(),
  ];
  const prisma = {
    authSession: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((ops) => Promise.all(ops)),
  };

  const service = new SessionService(prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('TEST 5 & 6: getUserSessions only returns non-revoked, unexpired sessions', async () => {
    const now = new Date();
    prisma.authSession.findMany.mockResolvedValue([
      {
        id: 'sess-1',
        deviceType: 'mobile',
        deviceName: 'iPhone 15 Pro',
        location: 'HCM',
        ipAddress: '1.2.3.4',
        userAgent: 'Huki iOS',
        createdAt: now,
        lastActiveAt: now,
        expiresAt: new Date(Date.now() + 10000),
      },
    ]);

    const result = await service.getUserSessions('user-1');

    expect(result).toHaveLength(1);
    expect(prisma.authSession.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('TEST 7: User A cannot revoke User B session (Throws NotFoundException)', async () => {
    prisma.authSession.findFirst.mockResolvedValue(null);

    await expect(
      service.revokeSession('user-A', 'session-belonging-to-user-B'),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.authSession.findFirst).toHaveBeenCalledWith({
      where: { id: 'session-belonging-to-user-B', userId: 'user-A' },
    });
  });

  it('TEST: User revoking own session marks revokedAt and frees device slot', async () => {
    prisma.authSession.findFirst.mockResolvedValue({
      id: 'sess-1',
      userId: 'user-1',
    });

    const result = await service.revokeSession('user-1', 'sess-1');

    expect(result).toEqual({ message: 'Session revoked successfully' });
    expect(prisma.authSession.update).toHaveBeenCalledWith({
      where: { id: 'sess-1' },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
