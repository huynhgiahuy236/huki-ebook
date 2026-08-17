import { ConflictException, ForbiddenException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Order, OrderStatus, OrderStatusHistory, PaymentMethod, PaymentStatus, SellerOrder, SellerOrderStatus } from '../../entities';
import { InventoryReservationService } from './inventory-reservation.service';
import { OrdersService } from './orders.service';

describe('OrdersService rules', () => {
  const service = new OrdersService({} as Repository<Order>, {} as Repository<SellerOrder>, {} as Repository<OrderStatusHistory>, {} as DataSource, {} as InventoryReservationService);

  it('prevents another seller from reading an order', async () => {
    const repo = { findOne: jest.fn().mockResolvedValue({ ownerUserId: 'owner-id' }) };
    const instance = new OrdersService({} as Repository<Order>, repo as unknown as Repository<SellerOrder>, {} as Repository<OrderStatusHistory>, {} as DataSource, {} as InventoryReservationService);
    await expect(instance.sellerDetail({ sub: 'other-id', role: 'BUSINESS' }, 'id')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('aggregates a partially cancelled multi-seller order', async () => {
    const order = { id: 'order-id', status: OrderStatus.PROCESSING, paymentStatus: PaymentStatus.PENDING, paymentMethod: PaymentMethod.COD } as Order;
    const repo = { find: jest.fn().mockResolvedValue([{ status: SellerOrderStatus.CANCELLED }, { status: SellerOrderStatus.CONFIRMED }]) };
    const manager = { getRepository: jest.fn(() => repo), save: jest.fn(async (value) => value), create: jest.fn((_entity, value) => value) } as unknown as EntityManager;
    const aggregate = service as unknown as { aggregate(manager: EntityManager, order: Order, actorType: string, actorId: string): Promise<void> };
    await aggregate.aggregate(manager, order, 'SYSTEM', 'actor-id');
    expect(order.status).toBe(OrderStatus.PARTIALLY_CANCELLED);
  });

  it('rejects an invalid seller state transition', async () => {
    const seller = { id: 'id', orderId: 'order-id', ownerUserId: 'seller-id', status: SellerOrderStatus.SHIPPED };
    const sellerRepo = { findOne: jest.fn().mockResolvedValue(seller) };
    const manager = { getRepository: jest.fn(() => sellerRepo) };
    const dataSource = { transaction: jest.fn((callback) => callback(manager)) } as unknown as DataSource;
    const instance = new OrdersService({} as Repository<Order>, {} as Repository<SellerOrder>, {} as Repository<OrderStatusHistory>, dataSource, {} as InventoryReservationService);
    await expect(instance.confirm({ sub: 'seller-id', role: 'BUSINESS' }, 'id')).rejects.toBeInstanceOf(ConflictException);
  });
});
