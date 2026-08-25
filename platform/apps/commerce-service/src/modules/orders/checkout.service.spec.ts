import { BadRequestException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';

describe('CheckoutService (Prisma)', () => {
  const cartService = { getCartEntity: jest.fn() };
  const service = new CheckoutService({} as any, cartService as any, {} as any, {} as any);
  beforeEach(() => jest.clearAllMocks());

  it('rejects preview when the Prisma cart has no items', async () => {
    cartService.getCartEntity.mockResolvedValue({ id: 'cart-id', items: [] });
    await expect(service.preview('user-id', {} as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});
