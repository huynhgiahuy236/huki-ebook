import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ShipmentStatus, StaffStatus } from '../../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SHIPPING_EVENTS } from '@huki/shared';
import {
  AssignDeliveryStaffDto,
  CreateDeliveryStaffDto,
  UpdateDeliveryStaffDto,
} from './dto/delivery-staff.dto';
const TERMINAL = new Set<ShipmentStatus>([
  ShipmentStatus.DELIVERED,
  ShipmentStatus.RETURNED,
  ShipmentStatus.CANCELLED,
]);
@Injectable()
export class DeliveryStaffService {
  constructor(private readonly prisma: PrismaService) {}
  async create(dto: CreateDeliveryStaffDto) {
    try {
      return await this.prisma.deliveryStaff.create({ data: dto });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException(
          'This user is already registered as delivery staff',
        );
      throw error;
    }
  }
  list(status?: StaffStatus) {
    return this.prisma.deliveryStaff.findMany({
      where: status ? { status } : undefined,
      include: { _count: { select: { shipments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
  async update(id: string, dto: UpdateDeliveryStaffDto) {
    await this.requireStaff(id);
    try {
      return await this.prisma.deliveryStaff.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException(
          'This user is already registered as delivery staff',
        );
      throw error;
    }
  }
  async assign(shipmentId: string, dto: AssignDeliveryStaffDto) {
    const [shipment, staff] = await Promise.all([
      this.prisma.shipment.findUnique({ where: { id: shipmentId } }),
      this.requireStaff(dto.staffId),
    ]);
    if (!shipment) throw new NotFoundException('Shipment not found');
    if (TERMINAL.has(shipment.status))
      throw new ConflictException(
        `Cannot assign staff to a ${shipment.status} shipment`,
      );
    if (staff.status !== StaffStatus.ACTIVE)
      throw new ConflictException('Delivery staff is not active');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shipment.update({
        where: { id: shipmentId },
        data: { assignedStaffId: staff.id },
        include: { assignedStaff: true },
      });
      await tx.deliveryLog.create({
        data: {
          shipmentId,
          staffId: staff.id,
          status: shipment.status,
          source: 'ADMIN',
          action: 'STAFF_ASSIGNED',
          note: `Assigned to ${staff.name}`,
        },
      });
      await tx.outboxEvent.create({
        data: {
          eventId: randomBytes(16).toString('hex'),
          type: SHIPPING_EVENTS.STAFF_ASSIGNED,
          aggregateId: shipmentId,
          payload: { shipmentId, staffId: staff.id, staffUserId: staff.userId },
        },
      });
      return updated;
    });
  }
  async findByUserId(userId: string) {
    return this.prisma.deliveryStaff.findUnique({ where: { userId } });
  }

  async getOrCreateStaffProfile(actor: { sub: string; email?: string; role: string }) {
    let staff = await this.prisma.deliveryStaff.findUnique({ where: { userId: actor.sub } });
    if (!staff) {
      const emailPrefix = actor.email ? actor.email.split('@')[0] : 'shipper';
      const formattedName = emailPrefix
        .split(/[._-]/)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');
      staff = await this.prisma.deliveryStaff.create({
        data: {
          userId: actor.sub,
          name: formattedName || 'Bưu tá HuKi Express',
          phone: '0988 776 655',
          email: actor.email || 'shipper@huki.vn',
          status: StaffStatus.ACTIVE,
          currentArea: 'Đồng Tháp (TP. Cao Lãnh & TP. Sa Đéc)',
        },
      });
    }
    return staff;
  }

  async updateStatusByUserId(userId: string, status: StaffStatus) {
    const staff = await this.prisma.deliveryStaff.findUnique({ where: { userId } });
    if (!staff) {
      throw new NotFoundException('Delivery staff profile not found');
    }
    return this.prisma.deliveryStaff.update({
      where: { userId },
      data: { status },
    });
  }

  async listForStaff(userId: string) {
    const staff = await this.prisma.deliveryStaff.findUnique({
      where: { userId },
      include: { _count: { select: { shipments: true } } },
    });
    return staff ? [staff] : [];
  }

  private async requireStaff(id: string) {
    const staff = await this.prisma.deliveryStaff.findUnique({ where: { id } });
    if (!staff) throw new NotFoundException('Delivery staff not found');
    return staff;
  }
}
