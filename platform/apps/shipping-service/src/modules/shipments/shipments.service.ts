import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import {
  LogSource,
  Prisma,
  ShipmentStatus,
} from '../../../prisma/generated/client';
import { ShippingActor } from '../../common/shipping-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CARRIER_PROVIDER,
  CarrierProvider,
} from '../shipping/carrier.provider';
import {
  CreateShipmentsFromOrderDto,
  SellerOrderShipmentDto,
} from './dto/create-shipments.dto';
import { ShipmentQueryDto } from './dto/shipment-query.dto';
import {
  CancelShipmentDto,
  GhtkCallbackDto,
  UpdateShipmentStatusDto,
} from './dto/shipment-status.dto';
import { SHIPPING_EVENTS } from '@huki/shared/events';
import { throwBadRequest, throwConflict, throwForbidden, throwNotFound, throwUnauthorized } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

const NEXT_STATUSES: Record<ShipmentStatus, ShipmentStatus[]> = {
  PENDING: [
    ShipmentStatus.PICKED_UP,
    ShipmentStatus.CANCELLED,
    ShipmentStatus.FAILED,
  ],
  PICKED_UP: [
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.CANCELLED,
    ShipmentStatus.FAILED,
  ],
  IN_TRANSIT: [
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.FAILED,
    ShipmentStatus.RETURNED,
  ],
  OUT_FOR_DELIVERY: [
    ShipmentStatus.DELIVERED,
    ShipmentStatus.FAILED,
    ShipmentStatus.RETURNED,
  ],
  FAILED: [
    ShipmentStatus.OUT_FOR_DELIVERY,
    ShipmentStatus.RETURNED,
    ShipmentStatus.CANCELLED,
  ],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};
export function isShipmentTransitionAllowed(
  from: ShipmentStatus,
  to: ShipmentStatus,
) {
  return NEXT_STATUSES[from].includes(to);
}

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CARRIER_PROVIDER) private readonly carrier: CarrierProvider,
    private readonly config: ConfigService,
  ) {}

  async createFromOrder(dto: CreateShipmentsFromOrderDto) {
    const shippable = dto.sellerOrders.filter((item) => item.requiresShipping);
    if (!shippable.length)
      return { created: [], skipped: true, reason: 'NO_PHYSICAL_SELLER_ORDER' };
    if (!dto.shippingAddress) {
      throwBadRequest(ErrorCode.CHECKOUT_SHIPPING_REQUIRED);
    }
    const address = dto.shippingAddress as NonNullable<typeof dto.shippingAddress>;
    const created = [];
    for (const sellerOrder of shippable) {
      created.push(await this.createOne(dto, sellerOrder, address));
    }
    return { created, skipped: false };
  }

  async list(actor: ShippingActor, query: ShipmentQueryDto) {
    const where: Prisma.ShipmentWhereInput = this.actorScope(actor);
    if (query.status) where.status = query.status;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.shipment.findMany({
        where,
        include: { assignedStaff: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.shipment.count({ where }),
    ]);
    return {
      items: items.map((item) => this.view(item)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async detail(actor: ShippingActor, id: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id, ...this.actorScope(actor) },
      include: {
        assignedStaff: true,
        logs: { include: { staff: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!shipment) throwNotFound(ErrorCode.SHIPMENT_NOT_FOUND);
    return this.view(shipment);
  }

  async tracking(actor: ShippingActor, trackingNumber: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { trackingNumber, ...this.actorScope(actor) },
      include: {
        assignedStaff: true,
        logs: { include: { staff: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!shipment) throwNotFound(ErrorCode.SHIPMENT_NOT_FOUND);
    return this.view(shipment);
  }

  async updateStatus(
    actor: ShippingActor,
    id: string,
    dto: UpdateShipmentStatusDto,
  ) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throwNotFound(ErrorCode.SHIPMENT_NOT_FOUND);
    let staffId: string | undefined;
    let source: LogSource = LogSource.ADMIN;
    if (actor.role !== 'PLATFORM_ADMIN') {
      const staff = await this.prisma.deliveryStaff.findUnique({
        where: { userId: actor.sub },
      });
      if (!staff || shipment!.assignedStaffId !== staff.id) {
        throwForbidden(ErrorCode.SHIPMENT_STAFF_NOT_ASSIGNED);
      }
      staffId = staff!.id;
      source = LogSource.STAFF;
    }
    return this.transition(id, dto.status, source, {
      staffId,
      note: dto.note,
      location: dto.location,
    });
  }

  async handleGhtkCallback(dto: GhtkCallbackDto) {
    this.verifyCallback(dto);
    const replay = await this.prisma.deliveryLog.findUnique({
      where: { externalEventId: dto.eventId },
    });
    if (replay) return { accepted: true, idempotentReplay: true };
    const shipment = await this.prisma.shipment.findUnique({
      where: { trackingNumber: dto.trackingNumber },
    });
    if (!shipment) throwNotFound(ErrorCode.SHIPMENT_NOT_FOUND);
    if (shipment!.status === dto.status) {
      try {
        await this.prisma.deliveryLog.create({
          data: {
            shipmentId: shipment!.id,
            status: shipment!.status,
            source: LogSource.CARRIER,
            action: 'STATUS_CONFIRMED',
            externalEventId: dto.eventId,
            note: dto.note,
            location: dto.location,
            createdAt: new Date(dto.occurredAt),
          },
        });
      } catch (error) {
        if ((error as { code?: string }).code !== 'P2002') throw error;
      }
      return {
        accepted: true,
        idempotentReplay: false,
        shipment: this.view(shipment!),
      };
    }
    try {
      const updated = await this.transition(
        shipment!.id,
        dto.status,
        LogSource.CARRIER,
        {
          externalEventId: dto.eventId,
          note: dto.note,
          location: dto.location,
          occurredAt: new Date(dto.occurredAt),
        },
      );
      return { accepted: true, idempotentReplay: false, shipment: updated };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        return { accepted: true, idempotentReplay: true };
      throw error;
    }
  }

  async cancelBySellerOrder(sellerOrderId: string, dto: CancelShipmentDto) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { sellerOrderId },
    });
    if (!shipment) throwNotFound(ErrorCode.SHIPMENT_NOT_FOUND);
    if (shipment!.status === ShipmentStatus.CANCELLED)
      return this.view(shipment!);
    if (shipment!.trackingNumber)
      await this.carrier.cancelShipment(shipment!.trackingNumber);
    return this.transition(
      shipment!.id,
      ShipmentStatus.CANCELLED,
      LogSource.SYSTEM,
      { note: dto.reason },
    );
  }

  async cancelByOrder(orderId: string, reason: string) {
    const shipments = await this.prisma.shipment.findMany({
      where: { orderId },
    });
    const cancelled = [];
    for (const shipment of shipments) {
      if (
        shipment.status === ShipmentStatus.DELIVERED ||
        shipment.status === ShipmentStatus.RETURNED ||
        shipment.status === ShipmentStatus.CANCELLED
      )
        continue;
      if (shipment.trackingNumber)
        await this.carrier.cancelShipment(shipment.trackingNumber);
      cancelled.push(
        await this.transition(
          shipment.id,
          ShipmentStatus.CANCELLED,
          LogSource.SYSTEM,
          { note: reason },
        ),
      );
    }
    return { cancelled };
  }

  private async createOne(
    dto: CreateShipmentsFromOrderDto,
    sellerOrder: SellerOrderShipmentDto,
    address: NonNullable<CreateShipmentsFromOrderDto['shippingAddress']>,
  ) {
    const existing = await this.prisma.shipment.findUnique({
      where: { sellerOrderId: sellerOrder.sellerOrderId },
      include: { logs: true },
    });
    if (existing) return this.view(existing);
    const carrierInput = {
      province: address.province,
      district: address.district,
      weight: sellerOrder.weight,
      codAmount: dto.paymentMethod === 'COD' ? sellerOrder.codAmount : 0,
    };
    const quote = await this.carrier.calculateFee(carrierInput);
    const carrierShipment = await this.carrier.createShipment({
      sellerOrderId: sellerOrder.sellerOrderId,
      ...carrierInput,
    });
    try {
      const shipment = await this.prisma.$transaction(async (tx) => {
        const row = await tx.shipment.create({
          data: {
            orderId: dto.orderId,
            sellerOrderId: sellerOrder.sellerOrderId,
            userId: dto.userId,
            storeId: sellerOrder.storeId,
            ownerUserId: sellerOrder.ownerUserId,
            trackingNumber: carrierShipment.trackingNumber,
            paymentMethod: dto.paymentMethod,
            ...address,
            shippingFee: quote.shippingFee,
            codAmount:
              dto.paymentMethod === 'COD' ? (sellerOrder.codAmount ?? 0) : 0,
            codFee: quote.codFee,
            weight: sellerOrder.weight,
            estimatedDeliveryAt: carrierShipment.estimatedDeliveryAt,
          },
        });
        await tx.deliveryLog.create({
          data: {
            shipmentId: row.id,
            status: row.status,
            action: 'SHIPMENT_CREATED',
            note: 'Shipment created from order',
          },
        });
        await tx.outboxEvent.create({
          data: {
            eventId: randomBytes(16).toString('hex'),
            type: SHIPPING_EVENTS.CREATED,
            aggregateId: row.id,
            payload: {
              shipmentId: row.id,
              orderId: row.orderId,
              sellerOrderId: row.sellerOrderId,
              userId: row.userId,
              ownerUserId: row.ownerUserId,
              storeId: row.storeId,
              trackingNumber: row.trackingNumber,
            },
          },
        });
        return row;
      });
      return this.view(shipment);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        const replay = await this.prisma.shipment.findUnique({
          where: { sellerOrderId: sellerOrder.sellerOrderId },
        });
        if (replay) return this.view(replay);
      }
      throw error;
    }
  }

  private actorScope(actor: ShippingActor): Prisma.ShipmentWhereInput {
    if (actor.role === 'PLATFORM_ADMIN') return {};
    return actor.role === 'BUSINESS'
      ? { ownerUserId: actor.sub }
      : { userId: actor.sub };
  }

  private async transition(
    shipmentId: string,
    target: ShipmentStatus,
    source: LogSource,
    context: {
      staffId?: string;
      externalEventId?: string;
      note?: string;
      location?: string;
      occurredAt?: Date;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUnique({
        where: { id: shipmentId },
      });
      if (!shipment) throwNotFound(ErrorCode.SHIPMENT_NOT_FOUND);
      if (!isShipmentTransitionAllowed(shipment!.status, target)) {
        throwConflict(ErrorCode.SHIPMENT_STATUS_TRANSITION_INVALID);
      }
      const occurredAt = context.occurredAt ?? new Date();
      const changed = await tx.shipment.updateMany({
        where: { id: shipmentId, status: shipment!.status },
        data: {
          status: target,
          ...this.timelineData(target, occurredAt),
          failedAttempts:
            target === ShipmentStatus.FAILED ? { increment: 1 } : undefined,
        },
      });
      if (changed.count !== 1)
        throwConflict(ErrorCode.SHIPMENT_STATUS_TRANSITION_INVALID);
      await tx.deliveryLog.create({
        data: {
          shipmentId,
          staffId: context.staffId,
          status: target,
          source,
          action: 'STATUS_CHANGED',
          externalEventId: context.externalEventId,
          note: context.note,
          location: context.location,
          createdAt: occurredAt,
        },
      });
      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type: this.getShippingEventType(target),
          aggregateId: shipmentId,
          payload: {
            shipmentId,
            orderId: shipment!.orderId,
            sellerOrderId: shipment!.sellerOrderId,
            userId: shipment!.userId,
            ownerUserId: shipment!.ownerUserId,
            storeId: shipment!.storeId,
            trackingNumber: shipment!.trackingNumber,
            from: shipment!.status,
            to: target,
            occurredAt: occurredAt.toISOString(),
          },
        },
      });
      const updated = await tx.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          assignedStaff: true,
          logs: { include: { staff: true }, orderBy: { createdAt: 'asc' } },
        },
      });
      return this.view(updated!);
    });
  }

  private timelineData(
    status: ShipmentStatus,
    date: Date,
  ): Prisma.ShipmentUpdateManyMutationInput {
    switch (status) {
      case ShipmentStatus.PICKED_UP:
        return { pickedUpAt: date };
      case ShipmentStatus.IN_TRANSIT:
        return { shippedAt: date };
      case ShipmentStatus.DELIVERED:
        return { deliveredAt: date };
      case ShipmentStatus.RETURNED:
        return { returnedAt: date };
      case ShipmentStatus.CANCELLED:
        return { cancelledAt: date };
      default:
        return {};
    }
  }

  private verifyCallback(dto: GhtkCallbackDto) {
    const secret = this.config.get<string>('SHIPPING_WEBHOOK_SECRET');
    if (!secret)
      throwUnauthorized(ErrorCode.SYSTEM_INTERNAL_ERROR, 'Webhook secret not configured');
    const canonical = [
      dto.eventId,
      dto.trackingNumber,
      dto.status,
      dto.occurredAt,
      dto.location ?? '',
      dto.note ?? '',
    ].join('|');
    const expected = createHmac('sha256', secret!).update(canonical).digest();
    const provided = Buffer.from(dto.signature, 'hex');
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
      throwUnauthorized(ErrorCode.PAYMENT_SIGNATURE_INVALID, 'Invalid GHTK callback signature');
    }
  }

  private view(shipment: any) {
    return {
      ...shipment,
      shippingFee: Number(shipment.shippingFee),
      codAmount: Number(shipment.codAmount),
      codFee: Number(shipment.codFee),
    };
  }

  private getShippingEventType(status: ShipmentStatus): string {
    const eventMap: Record<ShipmentStatus, string> = {
      [ShipmentStatus.PENDING]: SHIPPING_EVENTS.CREATED,
      [ShipmentStatus.PICKED_UP]: SHIPPING_EVENTS.PICKED_UP,
      [ShipmentStatus.IN_TRANSIT]: SHIPPING_EVENTS.IN_TRANSIT,
      [ShipmentStatus.OUT_FOR_DELIVERY]: SHIPPING_EVENTS.OUT_FOR_DELIVERY,
      [ShipmentStatus.DELIVERED]: SHIPPING_EVENTS.DELIVERED,
      [ShipmentStatus.FAILED]: SHIPPING_EVENTS.FAILED,
      [ShipmentStatus.RETURNED]: SHIPPING_EVENTS.RETURNED,
      [ShipmentStatus.CANCELLED]: SHIPPING_EVENTS.CANCELLED,
    };
    return eventMap[status] ?? `SHIPMENT_${status}`;
  }
}
