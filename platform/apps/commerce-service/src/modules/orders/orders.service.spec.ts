import { ConflictException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService (Prisma)', () => {
  const prisma = { sellerOrder: { findUnique: jest.fn() }, $transaction: jest.fn() };
  const service = new OrdersService(prisma as any, {} as any, {} as any);
  beforeEach(() => jest.clearAllMocks());

  it('prevents another seller from reading an order', async () => {
    prisma.sellerOrder.findUnique.mockResolvedValue({ ownerUserId: 'owner-id', items: [], order: null });
    await expect(service.sellerDetail({ sub: 'other-id', role: 'BUSINESS' } as any, 'seller-id')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an invalid seller state transition in a Prisma transaction', async () => {
    prisma.$transaction.mockImplementation(async (callback: any) => callback({ sellerOrder: { findUnique: jest.fn().mockResolvedValue({ id: 'seller-id', ownerUserId: 'seller-id', status: 'SHIPPED', items: [], orderId: 'order-id' }) } }));
    await expect(service.confirm({ sub: 'seller-id', role: 'BUSINESS' } as any, 'seller-id')).rejects.toBeInstanceOf(ConflictException);
  });
});
