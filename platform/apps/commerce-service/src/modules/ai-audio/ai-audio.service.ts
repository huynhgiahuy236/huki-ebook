import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAiAudioPlanDto, UpdateAiAudioPlanDto } from './dto/ai-audio-plan.dto';
import { RegisterSubscriptionDto } from './dto/register-subscription.dto';

@Injectable()
export class AiAudioService implements OnModuleInit {
  private readonly logger = new Logger(AiAudioService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultPlansIfEmpty();
  }

  /**
   * Seed 3 gói cước mẫu tiêu chuẩn nếu bảng rỗng
   */
  private async seedDefaultPlansIfEmpty() {
    try {
      const count = await this.prisma.aiAudioPlan.count();
      if (count === 0) {
        this.logger.log('Khởi tạo 3 gói cước AI Voice chuẩn sàn HUKI vào PostgreSQL...');
        await this.prisma.aiAudioPlan.createMany({
          data: [
            {
              code: 'AI_VOICE_BASIC_100K',
              name: 'Gói AI Voice Tiết Kiệm (1 Tháng)',
              price: 100000,
              durationDays: 30,
              description: 'Kích hoạt giọng đọc AI tự nhiên chuẩn Studio HUKI cho 01 ấn bản Ebook DRM. Hỗ trợ 2 chất giọng Nam/Bắc truyền cảm, không giới hạn số lượt độc giả nghe trong tháng.',
              voiceType: 'Studio AI Chuẩn (Nam / Bắc)',
              isPopular: true,
              status: 'ACTIVE',
            },
            {
              code: 'AI_VOICE_PRO_250K',
              name: 'Gói AI Voice Nâng Cao (Quý 3 Tháng)',
              price: 250000,
              durationDays: 90,
              description: 'Tiết kiệm 50.000đ so với gói tháng. Tích hợp công nghệ cảm xúc ngữ điệu sâu sắc, hỗ trợ tạo mục lục âm thanh tự động cho từng chương sách.',
              voiceType: 'Studio AI Cảm Xúc Cao Cấp',
              isPopular: false,
              status: 'ACTIVE',
            },
            {
              code: 'AI_VOICE_ANNUAL_800K',
              name: 'Gói AI Voice VIP Trọn Năm (12 Tháng)',
              price: 800000,
              durationDays: 365,
              description: 'Gói tối ưu nhất cho Nhà Xuất Bản & Tác Giả. Tiết kiệm 400.000đ/năm. Ưu tiên băng thông phát thanh mượt mà 320kbps, bảo chứng huy hiệu "Sách Nói Bản Quyền".',
              voiceType: 'Master Studio 320k Đa Giọng Đọc',
              isPopular: false,
              status: 'ACTIVE',
            },
          ],
        });
        this.logger.log('Đã nạp 3 gói cước mẫu vào PostgreSQL thành công.');
      }
    } catch (err: any) {
      this.logger.warn(`Không thể tự động seed gói cước: ${err?.message}`);
    }
  }

  // ==========================================
  // 1. QUẢN LÝ GÓI CƯỚC (PLANS)
  // ==========================================
  async getPlans() {
    const plans = await this.prisma.aiAudioPlan.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: {
          where: {
            status: 'ACTIVE',
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        },
      },
    });

    return plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      price: Number(p.price),
      durationDays: p.durationDays,
      description: p.description,
      voiceType: p.voiceType,
      isPopular: p.isPopular,
      status: p.status,
      subscriberCount: p.subscriptions.length,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  async createPlan(dto: CreateAiAudioPlanDto) {
    const existing = await this.prisma.aiAudioPlan.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException(`Mã gói cước ${dto.code} đã tồn tại trong hệ thống.`);
    }

    const plan = await this.prisma.aiAudioPlan.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        price: dto.price,
        durationDays: dto.durationDays,
        description: dto.description.trim(),
        voiceType: dto.voiceType.trim(),
        isPopular: Boolean(dto.isPopular),
        status: dto.status || 'ACTIVE',
      },
    });

    return {
      ...plan,
      price: Number(plan.price),
      subscriberCount: 0,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  async updatePlan(id: string, dto: UpdateAiAudioPlanDto) {
    const plan = await this.prisma.aiAudioPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Không tìm thấy gói cước ID ${id}`);
    }

    const updated = await this.prisma.aiAudioPlan.update({
      where: { id },
      data: {
        ...(dto.code && { code: dto.code.trim().toUpperCase() }),
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.durationDays !== undefined && { durationDays: dto.durationDays }),
        ...(dto.description && { description: dto.description.trim() }),
        ...(dto.voiceType && { voiceType: dto.voiceType.trim() }),
        ...(dto.isPopular !== undefined && { isPopular: dto.isPopular }),
        ...(dto.status && { status: dto.status }),
      },
    });

    return {
      ...updated,
      price: Number(updated.price),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deletePlan(id: string) {
    const plan = await this.prisma.aiAudioPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Không tìm thấy gói cước ID ${id}`);
    }

    await this.prisma.aiAudioPlan.delete({ where: { id } });
    return { success: true, message: `Đã xóa gói cước ${plan.name}` };
  }

  async togglePlanStatus(id: string) {
    const plan = await this.prisma.aiAudioPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Không tìm thấy gói cước ID ${id}`);
    }

    const nextStatus = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await this.prisma.aiAudioPlan.update({
      where: { id },
      data: { status: nextStatus },
    });

    return {
      ...updated,
      price: Number(updated.price),
    };
  }

  // ==========================================
  // 2. QUẢN LÝ SÁCH KÍCH HOẠT (SUBSCRIPTIONS)
  // ==========================================
  async getSubscriptions() {
    const subs = await this.prisma.bookAiSubscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            price: true,
            durationDays: true,
          },
        },
      },
    });

    return subs.map((s) => ({
      id: s.id,
      bookId: s.bookId,
      bookTitle: s.bookTitle || 'Chưa rõ',
      coverUrl: s.coverUrl || undefined,
      storeId: s.storeId,
      storeName: s.storeName || `Gian hàng ${s.storeId.slice(0, 8)}...`,
      planId: s.planId,
      planName: s.plan?.name || 'Gói AI Voice',
      planPrice: Number(s.plan?.price || 0),
      durationDays: s.plan?.durationDays || 30,
      activatedAt: s.activatedAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      status: s.status,
      totalListens: s.totalListens,
    }));
  }

  async isBookAiAudioActive(bookId: string) {
    const sub = await this.prisma.bookAiSubscription.findFirst({
      where: {
        bookId,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
    });
    return { active: !!sub, subscription: sub };
  }

  async registerBookSubscription(dto: RegisterSubscriptionDto) {
    // 1. Tìm hoặc kiểm tra thông tin sách
    let bookTitle = dto.bookTitle || 'Tác phẩm Ebook';
    let storeId = dto.storeId || 'default-store';

    try {
      const book = await this.prisma.book.findUnique({
        where: { id: dto.bookId },
      });
      if (book) {
        bookTitle = book.title || bookTitle;
        storeId = book.storeId || storeId;
      }
    } catch (e) {
      // Bỏ qua nếu id không phải uuid của bảng books
    }

    // 2. Tìm gói cước được chọn
    let plan = await this.prisma.aiAudioPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) {
      plan = await this.prisma.aiAudioPlan.findFirst();
    }
    if (!plan) {
      throw new BadRequestException('Không tìm thấy gói cước AI Voice hợp lệ.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    const storeName = dto.storeName || `Gian hàng ${storeId.slice(0, 8)}`;

    // 3. Upsert BookAiSubscription trong PostgreSQL
    const subscription = await this.prisma.bookAiSubscription.upsert({
      where: {
        bookId_planId: {
          bookId: dto.bookId,
          planId: plan.id,
        },
      },
      update: {
        bookTitle,
        coverUrl: dto.coverUrl || undefined,
        storeName,
        activatedAt: now,
        expiresAt,
        status: 'ACTIVE',
      },
      create: {
        bookId: dto.bookId,
        bookTitle,
        coverUrl: dto.coverUrl || undefined,
        storeId,
        storeName,
        planId: plan.id,
        activatedAt: now,
        expiresAt,
        status: 'ACTIVE',
        totalListens: 0,
      },
    });

    // 4. Tạo giao dịch tài chính ghi nhận 100% doanh thu chảy về Admin Sàn HUKI
    const txnCode = `TXN-AIVOICE-${Date.now().toString().slice(-8)}`;
    const transaction = await this.prisma.aiRevenueTransaction.create({
      data: {
        txnCode,
        storeId,
        storeName: dto.storeName || `Gian hàng ${storeId.slice(0, 8)}`,
        bookId: dto.bookId,
        bookTitle,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        paymentMethod: dto.paymentMethod || 'WALLET',
        status: 'SUCCESS',
        createdAt: now,
      },
    });

    this.logger.log(
      `Đã đăng ký AI Voice thành công cho sách ${bookTitle} (${dto.bookId}). Giao dịch: ${txnCode}, Số tiền: ${plan.price}`
    );

    return {
      subscription: {
        ...subscription,
        bookTitle,
        planName: plan.name,
        planPrice: Number(plan.price),
        activatedAt: subscription.activatedAt.toISOString(),
        expiresAt: subscription.expiresAt.toISOString(),
      },
      transaction: {
        ...transaction,
        amount: Number(transaction.amount),
        createdAt: transaction.createdAt.toISOString(),
      },
    };
  }

  // ==========================================
  // 3. QUẢN LÝ DÒNG TIỀN (REVENUE TRANSACTIONS)
  // ==========================================
  async getTransactions() {
    const txns = await this.prisma.aiRevenueTransaction.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return txns.map((t) => ({
      id: t.id,
      txnCode: t.txnCode,
      storeId: t.storeId,
      storeName: t.storeName,
      bookId: t.bookId,
      bookTitle: t.bookTitle,
      planId: t.planId || '',
      planName: t.planName,
      amount: Number(t.amount),
      paymentMethod: t.paymentMethod,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  // Thống kê tài chính tổng quan
  async getFinancialSummary() {
    const txns = await this.prisma.aiRevenueTransaction.findMany();
    const plansCount = await this.prisma.aiAudioPlan.count({ where: { status: 'ACTIVE' } });
    const subsCount = await this.prisma.bookAiSubscription.count({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
    });

    const totalRevenue = txns.reduce(
      (acc, curr) => acc + (curr.status === 'SUCCESS' ? Number(curr.amount) : 0),
      0
    );

    return {
      totalRevenue,
      transactionCount: txns.length,
      activeSubscriptionsCount: subsCount,
      activePlansCount: plansCount,
    };
  }
}
