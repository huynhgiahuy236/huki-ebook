import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";
import { Model } from "mongoose";
import Redis from "ioredis";
import { QuickReply, QuickReplyDocument } from "../../entities/quick-reply.schema";
import { CreateQuickReplyDto, UpdateQuickReplyDto } from "./dto/quick-reply.dto";

const DEFAULT_TEMPLATES = [
  {
    shortcut: "chao",
    title: "Chào khách hàng",
    content: "Dạ em chào bạn ạ! Cảm ơn bạn đã ghé thăm gian hàng sách của bên em. Em có thể hỗ trợ gì cho bạn hôm nay ạ?",
  },
  {
    shortcut: "conhang",
    title: "Báo còn sách & quà",
    content: "Dạ tác phẩm này bên em hiện đang sẵn hàng tại kho, sách mới 100% nguyên màng co và tặng kèm bookmark độc quyền ạ!",
  },
  {
    shortcut: "ebook",
    title: "Hướng dẫn Ebook DRM",
    content: "Dạ ấn bản Ebook DRM sau khi thanh toán thành công sẽ tự động đồng bộ ngay vào Tủ Sách của bạn và đọc mượt mà trên Web Reader ạ!",
  },
  {
    shortcut: "ship",
    title: "Thời gian giao hàng",
    content: "Dạ đơn hàng sách giấy bên em sẽ được đóng gói cẩn thận bọc chống sốc và gửi đi ngay trong ngày. Dự kiến giao đến bạn trong 1-3 ngày làm việc ạ!",
  },
  {
    shortcut: "kiemtra",
    title: "Chính sách kiểm hàng",
    content: "Dạ bạn hoàn toàn yên tâm được kiểm tra ngoại quan sách cùng shipper trước khi nhận hàng để đảm bảo sách nguyên vẹn nhé ạ!",
  },
];

@Injectable()
export class QuickReplyService {
  private readonly logger = new Logger(QuickReplyService.name);
  private redis: Redis | null = null;
  private readonly CACHE_TTL = 86400; // 24 giờ

  constructor(
    @InjectModel(QuickReply.name)
    private readonly quickReplyModel: Model<QuickReplyDocument>,
    private readonly config: ConfigService,
  ) {
    this.initRedis();
  }

  private initRedis() {
    try {
      const host = this.config.get<string>("REDIS_HOST") || process.env.REDIS_HOST || "localhost";
      const port = Number(this.config.get<number>("REDIS_PORT") || process.env.REDIS_PORT || 6379);
      const password = this.config.get<string>("REDIS_PASSWORD") || process.env.REDIS_PASSWORD || undefined;

      this.redis = new Redis({
        host,
        port,
        password,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });

      this.redis.connect().catch((err) => {
        this.logger.warn(`Redis connection error for QuickReplyService: ${err?.message}`);
      });
    } catch (e) {
      this.logger.warn(`Failed to initialize Redis in QuickReplyService: ${e}`);
    }
  }

  private cacheKey(storeId: string) {
    return `chat:quick_replies:${storeId}`;
  }

  async list(storeId: string): Promise<QuickReply[]> {
    if (!storeId) return [];

    // 1. Kiểm tra cache trên Redis trước để siêu nhanh (< 2ms)
    if (this.redis) {
      try {
        const cached = await this.redis.get(this.cacheKey(storeId));
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {
        this.logger.warn(`Redis get quick replies error: ${err}`);
      }
    }

    // 2. Nếu cache miss: Truy vấn MongoDB
    let items = await this.quickReplyModel
      .find({ storeId })
      .sort({ usageCount: -1, updatedAt: -1 })
      .lean()
      .exec();

    // 3. Nếu shop chưa từng có phím tắt nào: Tự động khởi tạo bộ mẫu câu chuẩn
    if (!items || items.length === 0) {
      const seeds = DEFAULT_TEMPLATES.map((tmpl) => ({
        storeId,
        shortcut: tmpl.shortcut,
        title: tmpl.title,
        content: tmpl.content,
        usageCount: 0,
      }));

      await this.quickReplyModel.insertMany(seeds);
      items = await this.quickReplyModel
        .find({ storeId })
        .sort({ usageCount: -1, updatedAt: -1 })
        .lean()
        .exec();
    }

    // 4. Lưu lại vào Redis Cache
    if (this.redis && items.length > 0) {
      try {
        await this.redis.set(this.cacheKey(storeId), JSON.stringify(items), "EX", this.CACHE_TTL);
      } catch (err) {
        this.logger.warn(`Redis set quick replies error: ${err}`);
      }
    }

    return items as unknown as QuickReply[];
  }

  async create(dto: CreateQuickReplyDto): Promise<QuickReply> {
    const cleanShortcut = dto.shortcut.replace(/^\/+/, "").toLowerCase().trim();
    const created = await this.quickReplyModel.create({
      storeId: dto.storeId,
      shortcut: cleanShortcut,
      title: dto.title.trim(),
      content: dto.content.trim(),
      usageCount: 0,
    });

    await this.invalidateCache(dto.storeId);
    return created.toObject();
  }

  async update(id: string, storeId: string, dto: UpdateQuickReplyDto): Promise<QuickReply> {
    const updateData: any = {};
    if (dto.shortcut) {
      updateData.shortcut = dto.shortcut.replace(/^\/+/, "").toLowerCase().trim();
    }
    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.content !== undefined) updateData.content = dto.content.trim();

    const updated = await this.quickReplyModel
      .findOneAndUpdate({ _id: id, storeId }, { $set: updateData }, { new: true })
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException("Không tìm thấy tin nhắn mẫu cần sửa");
    }

    await this.invalidateCache(storeId);
    return updated as unknown as QuickReply;
  }

  async delete(id: string, storeId: string): Promise<{ success: boolean }> {
    const result = await this.quickReplyModel.deleteOne({ _id: id, storeId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException("Không tìm thấy tin nhắn mẫu cần xóa");
    }

    await this.invalidateCache(storeId);
    return { success: true };
  }

  async incrementUsage(id: string, storeId: string): Promise<void> {
    await this.quickReplyModel.updateOne({ _id: id, storeId }, { $inc: { usageCount: 1 } }).exec();
    await this.invalidateCache(storeId);
  }

  private async invalidateCache(storeId: string) {
    if (this.redis && storeId) {
      try {
        await this.redis.del(this.cacheKey(storeId));
      } catch (err) {
        this.logger.warn(`Redis del quick replies error: ${err}`);
      }
    }
  }
}
