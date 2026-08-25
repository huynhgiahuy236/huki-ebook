import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';

describe('AuthService refresh rotation', () => {
  const tx = {
    refreshToken: {
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const prisma = {
    refreshToken: { findFirst: jest.fn() },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const jwt = { sign: jest.fn().mockReturnValue('new-access-token') };
  const config = { get: jest.fn((key: string) => key === 'jwt.secret' ? 'secret' : '15m') };
  const service = new AuthService(prisma as any, jwt as any, config as any, { emit: jest.fn() } as any);

  beforeEach(() => jest.clearAllMocks());

  it('revokes the old refresh token and returns a replacement', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'old-token-id',
      sessionId: 'session-id',
      tokenFamily: 'family-id',
      expiresAt: new Date(Date.now() + 60_000),
      session: { revokedAt: null, user: { id: 'user-id' } },
    });
    tx.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    tx.refreshToken.create.mockResolvedValue({ id: 'new-token-id' });

    const result = await service.refreshToken({ refreshToken: 'old-refresh-token' });

    expect(result).toMatchObject({ accessToken: 'new-access-token', expiresIn: 900 });
    expect(result.refreshToken).not.toBe('old-refresh-token');
    expect(tx.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: 'session-id',
        tokenFamily: 'family-id',
        tokenHash: createHash('sha256').update(result.refreshToken).digest('hex'),
      }),
    });
    expect(tx.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'old-token-id' },
      data: { replacedByTokenId: 'new-token-id' },
    });
  });
});
