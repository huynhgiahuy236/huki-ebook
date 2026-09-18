import { BookAccessService } from './book-access.service';
import { AccessReason, BookAccessType, SubscriptionTier } from '../../../../../libs/shared/src/enums';

describe('BookAccessService - Canonical DRM Access & Revocation', () => {
  const prisma = {
    book: {
      findUnique: jest.fn(),
    },
    bookAccess: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    subscription: {
      findFirst: jest.fn(),
    },
    subscriptionAccessLog: {
      count: jest.fn(),
      create: jest.fn(),
    },
  };

  const service = new BookAccessService(prisma as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows reading for ACTIVE purchased bookAccess', async () => {
    prisma.book.findUnique.mockResolvedValue({
      id: 'book-1',
      status: 'PUBLISHED',
      digitalDetails: { digitalEnabled: true, accessType: BookAccessType.FREE },
    });
    prisma.bookAccess.findUnique.mockResolvedValue({
      id: 'access-1',
      userId: 'user-1',
      bookId: 'book-1',
      status: 'ACTIVE',
    });

    const result = await service.checkAccess('user-1', 'book-1');

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe(AccessReason.OWNED);
  });

  it('rejects reading and returns ACCESS_REVOKED for REVOKED bookAccess (Refund / Dispute)', async () => {
    prisma.book.findUnique.mockResolvedValue({
      id: 'book-1',
      status: 'PUBLISHED',
      digitalDetails: { digitalEnabled: true, accessType: BookAccessType.FREE },
    });
    prisma.bookAccess.findUnique.mockResolvedValue({
      id: 'access-1',
      userId: 'user-1',
      bookId: 'book-1',
      status: 'REVOKED',
    });

    const result = await service.checkAccess('user-1', 'book-1');

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(AccessReason.ACCESS_REVOKED);
    expect(result.message).toContain('thu hồi');
  });

  it('revokeAccess updates status to REVOKED', async () => {
    prisma.bookAccess.update.mockResolvedValue({
      id: 'access-1',
      status: 'REVOKED',
    });

    await service.revokeAccess({
      userId: 'user-1',
      bookId: 'book-1',
      reason: 'Order refunded',
    });

    expect(prisma.bookAccess.update).toHaveBeenCalledWith({
      where: {
        userId_bookId: { userId: 'user-1', bookId: 'book-1' },
      },
      data: {
        status: 'REVOKED',
      },
    });
  });
});
