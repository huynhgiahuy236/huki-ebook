import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBroadcastDto, UpdateBroadcastActionDto } from './broadcast.dto';

@Injectable()
export class BroadcastService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(businessId?: string) {
    const notifications = await this.prisma.broadcastNotification.findMany({
      include: {
        receipts: true,
      },
      orderBy: [
        { isPinnedTop: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return notifications.map((n) => {
      const readByBusinessIds = n.receipts
        .filter((r) => r.isRead)
        .map((r) => r.businessId);
      const dismissedByBusinessIds = n.receipts
        .filter((r) => r.isDismissed)
        .map((r) => r.businessId);

      const isRead = businessId ? readByBusinessIds.includes(businessId) : false;
      const isDismissed = businessId ? dismissedByBusinessIds.includes(businessId) : false;

      const { receipts, ...rest } = n;
      return {
        ...rest,
        readByBusinessIds,
        dismissedByBusinessIds,
        isRead,
        isDismissed,
      };
    });
  }

  async findOne(id: string) {
    const notif = await this.prisma.broadcastNotification.findUnique({
      where: { id },
      include: { receipts: true },
    });
    if (!notif) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    const readByBusinessIds = notif.receipts
      .filter((r) => r.isRead)
      .map((r) => r.businessId);
    const dismissedByBusinessIds = notif.receipts
      .filter((r) => r.isDismissed)
      .map((r) => r.businessId);

    const { receipts, ...rest } = notif;
    return {
      ...rest,
      readByBusinessIds,
      dismissedByBusinessIds,
    };
  }

  async create(dto: CreateBroadcastDto, authorName?: string) {
    const id = dto.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const category = (dto.category as any) || 'POLICY';
    const severity = (dto.severity as any) || 'INFO';
    const targetType = (dto.targetType as any) || 'ALL';
    const status = (dto.status as any) || 'ACTIVE';

    const notif = await this.prisma.broadcastNotification.create({
      data: {
        id,
        title: dto.title,
        summary: dto.summary,
        content: dto.content,
        category,
        severity,
        targetType,
        targetSegment: dto.targetSegment,
        targetRoles: dto.targetRoles || ['ALL'],
        targetBusinessIds: dto.targetBusinessIds || [],
        channels: dto.channels || ['BELL'],
        isPinnedTop: Boolean(dto.isPinnedTop),
        isDismissible: dto.isDismissible !== false,
        scheduleType: dto.scheduleType || 'INSTANT',
        recurringRule: dto.recurringRule,
        status,
        authorName: dto.authorName || authorName || 'Ban Quản Trị HUKI',
        actionUrl: dto.actionUrl,
        actionLabel: dto.actionLabel,
      },
    });

    const fullList = await this.findAll();
    return { notif, list: fullList };
  }

  async handleAction(dto: UpdateBroadcastActionDto) {
    const effBiz = dto.businessId || 'default_seller';

    if (dto.action === 'MARK_READ' && dto.id) {
      await this.prisma.broadcastReceipt.upsert({
        where: {
          notificationId_businessId: {
            notificationId: dto.id,
            businessId: effBiz,
          },
        },
        update: {
          isRead: true,
          readAt: new Date(),
        },
        create: {
          notificationId: dto.id,
          businessId: effBiz,
          isRead: true,
          readAt: new Date(),
        },
      });
    } else if (dto.action === 'MARK_ALL_READ') {
      const allActive = await this.prisma.broadcastNotification.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });

      for (const n of allActive) {
        await this.prisma.broadcastReceipt.upsert({
          where: {
            notificationId_businessId: {
              notificationId: n.id,
              businessId: effBiz,
            },
          },
          update: {
            isRead: true,
            readAt: new Date(),
          },
          create: {
            notificationId: n.id,
            businessId: effBiz,
            isRead: true,
            readAt: new Date(),
          },
        });
      }
    } else if (dto.action === 'TOGGLE_PIN' && dto.id) {
      const existing = await this.prisma.broadcastNotification.findUnique({
        where: { id: dto.id },
      });
      if (existing) {
        const nextPinned = !existing.isPinnedTop;
        const nextChannels = nextPinned
          ? Array.from(new Set([...existing.channels, 'TOP_BAR']))
          : existing.channels.filter((c) => c !== 'TOP_BAR');

        await this.prisma.broadcastNotification.update({
          where: { id: dto.id },
          data: {
            isPinnedTop: nextPinned,
            channels: nextChannels,
          },
        });
      }
    } else if (dto.action === 'DISMISS' && dto.id) {
      await this.prisma.broadcastReceipt.upsert({
        where: {
          notificationId_businessId: {
            notificationId: dto.id,
            businessId: effBiz,
          },
        },
        update: {
          isDismissed: true,
          dismissedAt: new Date(),
        },
        create: {
          notificationId: dto.id,
          businessId: effBiz,
          isDismissed: true,
          dismissedAt: new Date(),
        },
      });
    }

    const list = await this.findAll(effBiz);
    return { list };
  }

  async delete(id: string) {
    await this.prisma.broadcastNotification.delete({
      where: { id },
    });
    const list = await this.findAll();
    return { list };
  }
}

