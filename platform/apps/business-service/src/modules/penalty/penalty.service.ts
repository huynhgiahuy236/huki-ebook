import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PenaltyActionDto } from './penalty.dto';

@Injectable()
export class PenaltyService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateTier(points: number) {
    if (points >= 18) {
      return {
        tier: 'TIER_4_SUSPENDED' as const,
        tierLabel: '🔴 Hạng 4 (Tạm Đình Chỉ Gian Hàng)',
        tierDescription: 'Gian hàng tích lũy 18+ điểm phạt trong quý. Tài khoản tạm ngưng giao dịch kinh doanh.',
        badgeColor: 'rose',
        canJoinPlatformFlashSale: false,
        maxBooksPerPlatformSlot: 0,
        activeSanctionMessage: 'Gian hàng tạm khóa kinh doanh do vượt ngưỡng điểm phạt sàn (18 điểm). Vui lòng gửi kháng nghị để được xem xét.',
      };
    }
    if (points >= 12) {
      return {
        tier: 'TIER_3_CRITICAL' as const,
        tierLabel: '🟠 Hạng 3 (Hạn Chế Nghiêm Ngặt)',
        tierDescription: 'Gian hàng có nhiều vi phạm nghiêm trọng. Không được duyệt Flash Sale, giới hạn tải sách mới.',
        badgeColor: 'amber',
        canJoinPlatformFlashSale: false,
        maxBooksPerPlatformSlot: 5,
        activeSanctionMessage: 'Hạn chế xuất bản sách mới và ngắt tham gia mọi chiến dịch Mega Sale toàn sàn.',
      };
    }
    if (points >= 6) {
      return {
        tier: 'TIER_2_RESTRICTED' as const,
        tierLabel: '🟡 Hạng 2 (Cảnh Cáo & Hạn Chế Flash Sale)',
        tierDescription: 'Gian hàng có vi phạm vận hành hoặc chất lượng đơn hàng. Bị tạm khóa đăng ký Flash Sale sàn.',
        badgeColor: 'yellow',
        canJoinPlatformFlashSale: false,
        maxBooksPerPlatformSlot: 10,
        activeSanctionMessage: 'Tạm khóa quyền tự động duyệt tham gia các khung giờ Flash Sale của Sàn.',
      };
    }
    if (points >= 3) {
      return {
        tier: 'TIER_1_WARNING' as const,
        tierLabel: '🔵 Hạng 1 (Nhắc Nhở Vi Phạm Nhẹ)',
        tierDescription: 'Gian hàng có vi phạm nhẹ. Cần cải thiện tỷ lệ vận hành để tránh tăng hạng phạt.',
        badgeColor: 'blue',
        canJoinPlatformFlashSale: true,
        maxBooksPerPlatformSlot: 15,
        activeSanctionMessage: 'Vui lòng cải thiện thời gian đóng gói và tỷ lệ hủy đơn để giữ uy tín gian hàng.',
      };
    }
    return {
      tier: 'TIER_0_GOOD' as const,
      tierLabel: '🟢 Hạng Tốt (Uy Tín)',
      tierDescription: 'Gian hàng tuân thủ quy chuẩn chất lượng, đủ điều kiện tham gia Flash Sale của Sàn.',
      badgeColor: 'emerald',
      canJoinPlatformFlashSale: true,
      maxBooksPerPlatformSlot: 20,
      activeSanctionMessage: null,
    };
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
      const tierInfo = this.calculateTier(0);
      profile = await this.prisma.storePenaltyProfile.create({
        data: {
          storeId,
          storeName: storeId === 'default-store' ? 'Nhà Sách Tri Thức HuKi' : `Gian Hàng ${storeId}`,
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
          nonFulfillmentRate: 0.8,
          lateShipmentRate: 1.2,
          responseRate: 98.0,
          rating: 4.9,
          checklist: [],
        },
        include: {
          records: true,
        },
      });
    }

    return {
      ...profile,
      history: profile.records,
      violationHistory: profile.records,
      metrics: {
        nonFulfillmentRate: profile.nonFulfillmentRate,
        lateShipmentRate: profile.lateShipmentRate,
        responseRate: profile.responseRate,
        rating: profile.rating,
      },
    };
  }

  async handleAction(dto: PenaltyActionDto) {
    const storeId = dto.storeId || 'default-store';
    const profile = await this.prisma.storePenaltyProfile.findUnique({
      where: { storeId },
      include: { records: true },
    });

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
    }

    return this.getProfile(storeId);
  }
}

