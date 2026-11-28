import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BusinessOutboxService } from '../outbox/outbox.service';
import { PenaltyActionDto } from './penalty.dto';

@Injectable()
export class PenaltyService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly outbox?: BusinessOutboxService,
  ) {}

  private calculateTier(points: number) {
    if (points >= 9) {
      return {
        tier: 'TIER_4_SUSPENDED' as const,
        tierLabel: 'Chế Tài Cấp 3 (≥9 điểm)',
        tierDescription: 'Gian hàng vi phạm nghiêm trọng quy chuẩn sàn, tạm dừng giao dịch.',
        badgeColor: 'slate',
        canJoinPlatformFlashSale: false,
        maxBooksPerPlatformSlot: 0,
        activeSanctionMessage: 'TẠM KHÓA GIAN HÀNG & ĐÓNG BĂNG RÚT TIỀN.',
      };
    }
    if (points >= 6) {
      return {
        tier: 'TIER_3_CRITICAL' as const,
        tierLabel: 'Chế Tài Cấp 2 (6-8 điểm)',
        tierDescription: 'Tước quyền Flash Sale Sàn và giảm độ ưu tiên hiển thị trên trang tìm kiếm.',
        badgeColor: 'purple',
        canJoinPlatformFlashSale: false,
        maxBooksPerPlatformSlot: 0,
        activeSanctionMessage: 'CẤM FLASH SALE SÀN & GIẢM HIỂN THỊ TÌM KIẾM.',
      };
    }
    if (points >= 3) {
      return {
        tier: 'TIER_2_RESTRICTED' as const,
        tierLabel: 'Chế Tài Cấp 1 (3-5 điểm)',
        tierDescription: 'Bị tước quyền đăng ký Flash Sale của Sàn trong 28 ngày do điểm Sao Quả Tạ đạt từ 3 điểm.',
        badgeColor: 'rose',
        canJoinPlatformFlashSale: false,
        maxBooksPerPlatformSlot: 0,
        activeSanctionMessage: 'BỊ KHÓA QUYỀN THAM GIA FLASH SALE SÀN TRONG 28 NGÀY. (Vẫn được tạo Flash Sale riêng của Shop).',
      };
    }
    if (points === 2) {
      return {
        tier: 'TIER_1_WARNING' as const,
        tierLabel: 'Cảnh Báo Nhẹ (2 điểm)',
        tierDescription: 'Gian hàng có vi phạm nhỏ. Giới hạn tối đa 3 cuốn sách cho mỗi slot Flash Sale Sàn.',
        badgeColor: 'amber',
        canJoinPlatformFlashSale: true,
        maxBooksPerPlatformSlot: 3,
        activeSanctionMessage: 'Hạn chế số lượng: Tối đa 3 sách / slot Flash Sale của Sàn.',
      };
    }
    return {
      tier: 'TIER_0_GOOD' as const,
      tierLabel: 'Hạng Tốt (Uy Tín)',
      tierDescription: 'Gian hàng tuân thủ quy chuẩn chất lượng, đủ điều kiện tham gia Flash Sale của Sàn.',
      badgeColor: 'emerald',
      canJoinPlatformFlashSale: true,
      maxBooksPerPlatformSlot: 20,
      activeSanctionMessage: null,
    };
  }

  private formatProfile(profile: any) {
    return {
      ...profile,
      history: profile.records || [],
      violationHistory: profile.records || [],
      metrics: {
        nonFulfillmentRate: profile.nonFulfillmentRate,
        lateShipmentRate: profile.lateShipmentRate,
        responseRate: profile.responseRate,
        rating: profile.rating,
      },
    };
  }

  async getAllProfiles() {
    const profiles = await this.prisma.storePenaltyProfile.findMany({
      include: {
        records: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { totalPoints: 'desc' },
    });
    return profiles.map((p) => this.formatProfile(p));
  }

  async getProfile(rawStoreId?: string) {
    const storeId = rawStoreId || 'default-store';

    let profile = await this.prisma.storePenaltyProfile.findUnique({
      where: { storeId },
      include: {
        records: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!profile) {
      const realStore = await this.prisma.store.findUnique({ where: { id: storeId } }).catch(() => null);
      const tierInfo = this.calculateTier(0);
      const created = await this.prisma.storePenaltyProfile.create({
        data: {
          storeId,
          storeName: realStore?.name || (storeId === 'default-store' ? 'Nhà Sách Tri Thức HuKi' : `Gian Hàng ${storeId}`),
          totalPoints: 0,
          penaltyPoints: 0,
          tier: tierInfo.tier,
          tierLabel: tierInfo.tierLabel,
          tierDescription: tierInfo.tierDescription,
          badgeColor: tierInfo.badgeColor,
          canJoinPlatformFlashSale: tierInfo.canJoinPlatformFlashSale,
          maxBooksPerPlatformSlot: tierInfo.maxBooksPerPlatformSlot,
          activeSanctionMessage: tierInfo.activeSanctionMessage,
          quarterCycle: 'Q4-2026',
          nonFulfillmentRate: 0,
          lateShipmentRate: 0,
          responseRate: 100,
          rating: 5.0,
          checklist: [],
        },
        include: {
          records: true,
        },
      });
      return this.formatProfile(created);
    }

    return this.formatProfile(profile);
  }

  async handleAction(dto: PenaltyActionDto) {
    const storeId = dto.storeId || 'default-store';
    let profile = await this.prisma.storePenaltyProfile.findUnique({
      where: { storeId },
      include: { records: true },
    });

    if (!profile) {
      await this.getProfile(storeId);
      profile = await this.prisma.storePenaltyProfile.findUnique({
        where: { storeId },
        include: { records: true },
      });
    }
    if (!profile) {
      throw new NotFoundException(`Store penalty profile for ${storeId} not found`);
    }

    if (dto.action === 'RESET_POINTS') {
      const tierInfo = this.calculateTier(0);
      await this.prisma.storePenaltyProfile.update({
        where: { storeId },
        data: {
          penaltyPoints: 0,
          totalPoints: 0,
          tier: tierInfo.tier,
          tierLabel: tierInfo.tierLabel,
          tierDescription: tierInfo.tierDescription,
          badgeColor: tierInfo.badgeColor,
          canJoinPlatformFlashSale: tierInfo.canJoinPlatformFlashSale,
          maxBooksPerPlatformSlot: tierInfo.maxBooksPerPlatformSlot,
          activeSanctionMessage: tierInfo.activeSanctionMessage,
        },
      });
    } else if (dto.action === 'APPEAL_VIOLATION' && dto.recordId) {
      await this.prisma.penaltyRecord.update({
        where: { id: dto.recordId },
        data: {
          isAppealed: true,
          appealStatus: 'PENDING',
          appealReason: dto.reason || '',
          appealProof: dto.proof || '',
        },
      });
    } else if (dto.action === 'ADMIN_REVIEW_APPEAL' && dto.recordId) {
      const record = await this.prisma.penaltyRecord.findUnique({
        where: { id: dto.recordId },
      });
      if (record) {
        const isApproved = dto.decision === 'APPROVED';
        await this.prisma.penaltyRecord.update({
          where: { id: dto.recordId },
          data: {
            appealStatus: isApproved ? 'APPROVED' : 'REJECTED',
            appealAdminNote: dto.adminNote || (isApproved ? 'Kháng nghị được chấp thuận' : 'Kháng nghị bị từ chối'),
            appealReviewedAt: new Date(),
          },
        });

        if (isApproved && record.points > 0) {
          const nextPoints = Math.max(0, profile.penaltyPoints - record.points);
          const tierInfo = this.calculateTier(nextPoints);
          await this.prisma.storePenaltyProfile.update({
            where: { storeId },
            data: {
              penaltyPoints: nextPoints,
              totalPoints: nextPoints,
              tier: tierInfo.tier,
              tierLabel: tierInfo.tierLabel,
              tierDescription: tierInfo.tierDescription,
              badgeColor: tierInfo.badgeColor,
              canJoinPlatformFlashSale: tierInfo.canJoinPlatformFlashSale,
              maxBooksPerPlatformSlot: tierInfo.maxBooksPerPlatformSlot,
              activeSanctionMessage: tierInfo.activeSanctionMessage,
            },
          });
        }

        if (this.outbox) {
          const store = await this.prisma.store.findUnique({
            where: { id: storeId },
            include: { business: true },
          }).catch(() => null);
          const ownerUserId = store?.business?.ownerId;

          await this.outbox.addToOutbox('penalty.appeal_reviewed', profile.id, {
            storeId,
            storeOwnerId: ownerUserId,
            sellerOwnerUserId: ownerUserId,
            decision: dto.decision,
            adminNote: dto.adminNote,
            recordId: dto.recordId,
          }).catch(() => {});
        }
      }
    } else if (dto.action === 'ADD_POINTS' && (dto.points || 0) > 0) {
      const pointsToAdd = dto.points || 1;
      const nextPoints = profile.penaltyPoints + pointsToAdd;
      const tierInfo = this.calculateTier(nextPoints);

      await this.prisma.penaltyRecord.create({
        data: {
          profileId: profile.id,
          storeId,
          violationType: dto.violationType || 'MANUAL_PENALTY',
          violationName: dto.violationName || 'Vi phạm chính sách vận hành',
          points: pointsToAdd,
          reason: dto.reason || 'Vi phạm do Ban Quản Trị ghi nhận',
          relatedOrderId: dto.relatedOrderId,
          relatedBookTitle: dto.relatedBookTitle,
          expiresAt: new Date(Date.now() + 86400000 * 90),
        },
      });

      await this.prisma.storePenaltyProfile.update({
        where: { storeId },
        data: {
          penaltyPoints: nextPoints,
          totalPoints: nextPoints,
          tier: tierInfo.tier,
          tierLabel: tierInfo.tierLabel,
          tierDescription: tierInfo.tierDescription,
          badgeColor: tierInfo.badgeColor,
          canJoinPlatformFlashSale: tierInfo.canJoinPlatformFlashSale,
          maxBooksPerPlatformSlot: tierInfo.maxBooksPerPlatformSlot,
          activeSanctionMessage: tierInfo.activeSanctionMessage,
        },
      });

      if (this.outbox) {
        const store = await this.prisma.store.findUnique({
          where: { id: storeId },
          include: { business: true },
        }).catch(() => null);
        const ownerUserId = store?.business?.ownerId;

        await this.outbox.addToOutbox('penalty.added', profile.id, {
          storeId,
          storeOwnerId: ownerUserId,
          sellerOwnerUserId: ownerUserId,
          points: pointsToAdd,
          reason: dto.reason || 'Vi phạm do Ban Quản Trị ghi nhận',
          violationType: dto.violationType || 'MANUAL_PENALTY',
        }).catch(() => {});
      }
    }

    return this.getProfile(storeId);
  }
}

