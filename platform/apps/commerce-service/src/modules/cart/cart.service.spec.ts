import { CartService } from './cart.service';

describe('CartService (Prisma)', () => {
  const prisma = { cart: { findUnique: jest.fn(), create: jest.fn() } };
  const cache = { invalidate: jest.fn() };
  const service = new CartService(prisma as any, cache as any);
  beforeEach(() => jest.clearAllMocks());

  it('creates an empty cart with Prisma when it does not exist', async () => {
    prisma.cart.findUnique.mockResolvedValue(null);
    prisma.cart.create.mockResolvedValue({ id: 'cart-id', userId: 'user-id', items: [] });
    await expect(service.getCartEntity('user-id')).resolves.toMatchObject({ id: 'cart-id' });
    expect(prisma.cart.create).toHaveBeenCalledWith(expect.objectContaining({ data: { userId: 'user-id' } }));
  });
});
