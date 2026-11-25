import { CartService } from './cart.service';

describe('CartService (Prisma)', () => {
  const prisma = { cart: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() } };
  const cache = { invalidate: jest.fn(), set: jest.fn() };
  const service = new CartService(prisma as any, cache as any);
  beforeEach(() => jest.clearAllMocks());

  it('creates an empty cart with Prisma when it does not exist', async () => {
    prisma.cart.findUnique.mockResolvedValue(null);
    prisma.cart.create.mockResolvedValue({ id: 'cart-id', userId: 'user-id', items: [] });
    await expect(service.getCartEntity('user-id')).resolves.toMatchObject({ id: 'cart-id' });
    expect(prisma.cart.create).toHaveBeenCalledWith(expect.objectContaining({ data: { userId: 'user-id' } }));
  });

  it('resolves huki-official and default-store aliases to Nhà Sách HuKi Official', async () => {
    await expect(service.resolveStoreName('huki-official')).resolves.toBe('Nhà Sách HuKi Official');
    await expect(service.resolveStoreName('default-store')).resolves.toBe('Nhà Sách HuKi Official');
  });

  it('keeps publisher separate from storeName and names storeGroups by storeName (BUG-038)', async () => {
    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      userId: 'user-1',
      updatedAt: new Date('2026-11-25T10:00:00Z'),
      items: [
        {
          id: 'ci-1',
          bookId: 'book-1',
          format: 'PHYSICAL',
          quantity: 1,
          unitPrice: 120000,
          book: {
            id: 'book-1',
            title: 'Đắc Nhân Tâm',
            slug: 'dac-nhan-tam',
            status: 'PUBLISHED',
            price: 120000,
            storeId: 'huki-official',
            coverUrl: null,
            publisher: { name: 'First News - Trí Việt' },
            author: { name: 'Dale Carnegie' },
            physicalDetails: { physicalEnabled: true, stock: 10, reserved: 0 },
          },
        },
      ],
    });

    const res = await service.getCart('user-1');
    expect(res.items[0].book.publisher).toBe('First News - Trí Việt');
    expect(res.items[0].book.storeName).toBe('Nhà Sách HuKi Official');
    expect(res.storeGroups).toHaveLength(1);
    expect(res.storeGroups[0].name).toBe('Nhà Sách HuKi Official');
  });
});
