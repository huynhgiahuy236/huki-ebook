import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { BookFormat, BookStatus, Cart, CartItemFormat, CheckoutSession, Order } from '../../entities';
import { CartService } from '../cart/cart.service';
import { CheckoutService } from './checkout.service';
import { InventoryReservationService } from './inventory-reservation.service';

describe('CheckoutService', () => {
  const cart = {
    id: 'cart-id', updatedAt: new Date(), items: [{
      id: 'item-id', format: CartItemFormat.PHYSICAL, quantity: 2,
      book: { id: 'book-id', storeId: 'store-id', ownerUserId: 'seller-id', title: 'Book', coverUrl: null, isbn: null,
        status: BookStatus.PUBLISHED, format: BookFormat.PHYSICAL, price: 100,
        physicalDetails: { physicalEnabled: true, stock: 5, reserved: 1, weight: 0.5 }, digitalDetails: null },
    }],
  } as unknown as Cart;
  const cartService = { getCartEntity: jest.fn().mockResolvedValue(cart) } as unknown as CartService;
  const sessions = { create: jest.fn((value) => value), save: jest.fn(async (value) => ({ id: 'session-id', ...value })) } as unknown as Repository<CheckoutSession>;
  const orderRepo = { findOne: jest.fn() } as unknown as Repository<Order>;
  const dataSource = { getRepository: jest.fn(() => orderRepo) } as unknown as DataSource;
  const config = { get: jest.fn((key) => key.includes('shipping') ? 30000 : 15) } as unknown as ConfigService;
  const service = new CheckoutService(cartService, sessions, dataSource, config, {} as InventoryReservationService);

  beforeEach(() => jest.clearAllMocks());

  it('requires a shipping address for physical books', async () => {
    await expect(service.preview('user-id', {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('groups a preview by store and snapshots current price', async () => {
    const result = await service.preview('user-id', { shippingAddress: { recipientName: 'Buyer', phone: '0912345678', line1: '1 Street', province: 'HCM' } });
    expect(result).toMatchObject({ sessionId: 'session-id', itemSubtotal: 200, shippingTotal: 30000, grandTotal: 30200 });
    expect(result.groups[0]).toMatchObject({ storeId: 'store-id', requiresShipping: true, itemSubtotal: 200 });
  });

  it('replays the original result for the same idempotency key', async () => {
    (orderRepo.findOne as jest.Mock).mockResolvedValue({ paymentMethod: 'COD', paymentStatus: 'PENDING', paymentProvider: null });
    await expect(service.confirm('user-id', 'same-key', { sessionId: '6d1f1407-4a8f-4f63-94e6-dddc64e06ed8', paymentMethod: 'COD' } as never)).resolves.toMatchObject({ idempotentReplay: true, paymentRequired: false });
  });
});

