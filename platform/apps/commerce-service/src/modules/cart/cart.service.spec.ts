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

  it('coalesces 77777777/88888888/99999999 seed aliases for 1 seller into one storeGroup (BUG-050)', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: '77777777-0000-4000-8000-000000000001',
            name: 'Nhà Sách HuKi Official',
            stores: [
              { id: '88888888-0000-4000-8000-000000000001', name: 'Nhà Sách HuKi Official' },
            ],
          },
        ],
      }),
    } as any);

    prisma.cart.findUnique.mockResolvedValue({
      id: 'cart-2',
      userId: 'user-2',
      updatedAt: new Date('2026-11-25T10:00:00Z'),
      items: [
        {
          id: 'ci-a',
          bookId: 'book-a',
          format: 'DIGITAL',
          quantity: 1,
          unitPrice: 79000,
          book: {
            id: 'book-a',
            title: 'Nhà Giả Kim',
            slug: 'nha-gia-kim',
            status: 'PUBLISHED',
            price: 79000,
            storeId: '88888888-0000-4000-8000-000000000001',
            coverUrl: null,
            publisher: { name: 'Nhã Nam Books' },
            author: { name: 'Paulo Coelho' },
            digitalDetails: { digitalEnabled: true },
          },
        },
        {
          id: 'ci-b',
          bookId: 'book-b',
          format: 'DIGITAL',
          quantity: 1,
          unitPrice: 125000,
          book: {
            id: 'book-b',
            title: 'Tỷ Phú Bán Giày',
            slug: 'ty-phu-ban-giay',
            status: 'PUBLISHED',
            price: 125000,
            storeId: '99999999-0000-4000-8000-000000000001',
            coverUrl: null,
            publisher: { name: 'First News - Trí Việt' },
            author: { name: 'Tony Hsieh' },
            digitalDetails: { digitalEnabled: true },
          },
        },
        {
          id: 'ci-c',
          bookId: 'book-c',
          format: 'DIGITAL',
          quantity: 1,
          unitPrice: 30000,
          book: {
            id: 'book-c',
            title: 'Sách ebook test',
            slug: 'sach-ebook-test',
            status: 'PUBLISHED',
            price: 30000,
            storeId: '77777777-0000-4000-8000-000000000001',
            coverUrl: null,
            publisher: { name: 'First News - Trí Việt' },
            author: { name: 'Paulo Coelho' },
            digitalDetails: { digitalEnabled: true },
          },
        },
      ],
    });

    const res = await service.getCart('user-2');
    expect(res.storeGroups).toHaveLength(1);
    expect(res.storeGroups[0].id).toBe('77777777-0000-4000-8000-000000000001');
    expect(res.storeGroups[0].name).toBe('Nhà Sách HuKi Official');
    expect(res.storeGroups[0].items).toHaveLength(3);
    fetchSpy.mockRestore();
  });
});
