import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { AskAiDto } from "./dto/ai-chat.dto";

export interface SuggestedBookItem {
  id: string;
  title: string;
  author: string;
  price: number;
  originalPrice?: number;
  coverUrl: string;
  slug?: string;
  format?: string;
  soldCount?: number;
}

export interface AiChatAction {
  type: "ADD_TO_CART" | "BUY_NOW" | "TRACK_ORDER" | "VIEW_BOOK";
  bookId?: string;
  bookTitle?: string;
  format?: string;
}

export interface AiChatResponse {
  reply: string;
  extractedInterests: string[];
  suggestedBooks: SuggestedBookItem[];
  action?: AiChatAction;
  isFallback: boolean;
}

export interface BookCatalogItem {
  id: string;
  title: string;
  slug?: string;
  author: string;
  category: string;
  price: number;
  originalPrice?: number;
  coverUrl: string;
  format: string;
  soldCount: number;
  description: string;
}

export interface SessionContext {
  turns: Array<{ role: "user" | "assistant"; text: string; time: number }>;
  suggestedBookIds: string[];
  lastCandidateIds: string[];
  lastCategory?: string;
  lastSubjectBookId?: string;
  lastSubjectBookTitle?: string;
  lastIntent?: string;
}

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);
  private redis: Redis | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>("REDIS_HOST") || process.env.REDIS_HOST || "localhost";
    const port = Number(this.config.get<number>("REDIS_PORT") || process.env.REDIS_PORT || 6379);
    const password = this.config.get<string>("REDIS_PASSWORD") || process.env.REDIS_PASSWORD || undefined;

    try {
      this.redis = new Redis({
        host,
        port,
        password,
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        retryStrategy: (times) => Math.min(times * 200, 3000),
      });

      this.redis.on("error", (err) => {
        this.logger.warn(`Redis connection error in AiChatService: ${err?.message}`);
      });

      this.redis.on("connect", () => {
        this.logger.log("Redis connected successfully for AI Chat Service");
      });
    } catch (e) {
      this.logger.warn(`Failed to initialize Redis client in AiChatService: ${e}`);
    }
  }

  private getApiKey(): string {
    return (
      this.config.get<string>("GEMINI_API_KEY") ||
      process.env.GEMINI_API_KEY ||
      ""
    );
  }

  /**
   * Lấy toàn bộ sách thật từ Commerce Database (có cache trên Redis 1 tiếng)
   */
  async getCatalogBooks(): Promise<BookCatalogItem[]> {
    const REDIS_CATALOG_KEY = "ai:books:catalog";
    const REDIS_CATALOG_TTL = 3600; // 1 giờ

    // 1. Kiểm tra cache trên Redis trước
    if (this.redis) {
      try {
        const cached = await this.redis.get(REDIS_CATALOG_KEY);
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list) && list.length > 0) {
            return list;
          }
        }
      } catch (err) {
        this.logger.warn(`Redis read error for catalog: ${err}`);
      }
    }

    // 2. Lấy dữ liệu thật từ Commerce Service
    try {
      const commerceUrl =
        this.config.get<string>("COMMERCE_SERVICE_URL") ||
        process.env.COMMERCE_SERVICE_URL ||
        "http://localhost:3003";

      const res = await fetch(`${commerceUrl}/api/v1/books?limit=100`, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const json = await res.json();
        const rawBooks = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.data?.items)
          ? json.data.items
          : Array.isArray(json.items)
          ? json.items
          : [];
        if (rawBooks.length > 0) {
          const catalogItems: BookCatalogItem[] = rawBooks.map((b: any) => ({
            id: b.id,
            title: b.title || "Tựa sách HUKI",
            slug: b.slug,
            author: b.author?.name || (typeof b.author === "string" ? b.author : "Tác giả HUKI"),
            category: b.category?.name || (typeof b.category === "string" ? b.category : "Sách chọn lọc"),
            price: Number(b.price || 0),
            originalPrice: b.originalPrice ? Number(b.originalPrice) : undefined,
            coverUrl: b.coverUrl || b.coverImage || "",
            format: b.format === "DIGITAL" ? "Ebook DRM" : b.format === "PHYSICAL" ? "Sách giấy" : "Combo (Giấy + Ebook)",
            soldCount: Number(b.soldCount ?? b.sales ?? 0),
            description: (b.description || "").slice(0, 300),
          }));

          // Lưu vào Redis với TTL 1 giờ
          if (this.redis && catalogItems.length > 0) {
            try {
              await this.redis.set(REDIS_CATALOG_KEY, JSON.stringify(catalogItems), "EX", REDIS_CATALOG_TTL);
              this.logger.log(`Cached ${catalogItems.length} books into Redis key '${REDIS_CATALOG_KEY}' (TTL: ${REDIS_CATALOG_TTL}s)`);
            } catch {}
          }

          return catalogItems;
        }
      }
    } catch (error) {
      this.logger.error("Failed to fetch books from commerce-service:", error);
    }

    // Dự phòng an toàn từ kho sách kinh điển nếu DB vừa khởi động
    return this.getFallbackStaticBooks();
  }

  /**
   * Bộ nhớ phiên hội thoại (Multi-turn Session Context) trên Redis
   */
  private async getSessionContext(sessionId?: string): Promise<SessionContext> {
    const defaultCtx: SessionContext = {
      turns: [],
      suggestedBookIds: [],
      lastCandidateIds: [],
    };
    if (!sessionId || !this.redis) return defaultCtx;

    try {
      const data = await this.redis.get(`ai:session:${sessionId}`);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          turns: Array.isArray(parsed.turns) ? parsed.turns : [],
          suggestedBookIds: Array.isArray(parsed.suggestedBookIds) ? parsed.suggestedBookIds : [],
          lastCandidateIds: Array.isArray(parsed.lastCandidateIds) ? parsed.lastCandidateIds : [],
          lastCategory: parsed.lastCategory,
          lastSubjectBookId: parsed.lastSubjectBookId,
          lastSubjectBookTitle: parsed.lastSubjectBookTitle,
          lastIntent: parsed.lastIntent,
        };
      }
    } catch (err) {
      this.logger.warn(`Failed to read session context: ${err}`);
    }
    return defaultCtx;
  }

  private async saveSessionContext(sessionId: string | undefined, ctx: SessionContext): Promise<void> {
    if (!sessionId || !this.redis) return;
    try {
      const key = `ai:session:${sessionId}`;
      // Giới hạn lịch sử tối đa 16 lượt để không tràn bộ nhớ
      ctx.turns = ctx.turns.slice(-16);
      // Giữ tối đa 40 ID sách đã gợi ý gần nhất
      ctx.suggestedBookIds = Array.from(new Set(ctx.suggestedBookIds)).slice(-40);
      await this.redis.set(key, JSON.stringify(ctx), "EX", 86400); // 24 giờ
    } catch (err) {
      this.logger.warn(`Failed to save session context: ${err}`);
    }
  }

  async askAi(dto: AskAiDto): Promise<AiChatResponse> {
    const query = dto.message.trim();
    const sessionId = dto.sessionId || `anon_${Date.now()}`;

    // 1. Lấy ngữ cảnh phiên hội thoại từ Redis
    const sessionCtx = await this.getSessionContext(sessionId);

    // Đồng bộ lịch sử truyền từ client nếu phiên Redis mới
    if (sessionCtx.turns.length === 0 && Array.isArray(dto.history) && dto.history.length > 0) {
      sessionCtx.turns = dto.history.map((h) => ({
        role: h.role,
        text: h.content,
        time: Date.now(),
      }));
    }

    // 2. Lấy kho sách thật từ Commerce Service / Cache
    const allBooks = await this.getCatalogBooks();

    // 3. Phân tích ngữ cảnh & Nhận diện ý định (Intent Recognition & Context Resolution)
    const analysis = this.analyzeIntentAndContext(query, sessionCtx, allBooks);

    // 4. Nếu có GEMINI_API_KEY, gọi Google Gemini với RAG và kho sách thật
    const apiKey = this.getApiKey();
    let result: AiChatResponse;

    if (apiKey) {
      result = await this.askGeminiWithContext(query, sessionCtx, analysis, allBooks, apiKey);
    } else {
      result = this.generateSmartLocalResponseWithContext(query, sessionCtx, analysis, allBooks);
    }

    // 5. Cập nhật Session Context vào Redis (Anti-Repetition & Memory)
    sessionCtx.turns.push({ role: "user", text: query, time: Date.now() });
    sessionCtx.turns.push({ role: "assistant", text: result.reply, time: Date.now() });

    if (result.suggestedBooks && result.suggestedBooks.length > 0) {
      const newIds = result.suggestedBooks.map((b) => b.id);
      sessionCtx.suggestedBookIds.push(...newIds);
      sessionCtx.lastCandidateIds = newIds;
      sessionCtx.lastSubjectBookId = newIds[0];
      sessionCtx.lastSubjectBookTitle = result.suggestedBooks[0].title;
    }

    if (analysis.extractedCategory) {
      sessionCtx.lastCategory = analysis.extractedCategory;
    }
    sessionCtx.lastIntent = analysis.intent;

    await this.saveSessionContext(sessionId, sessionCtx);

    return result;
  }

  /**
   * Phân tích ý định tự nhiên, phát hiện cảm xúc, tiếng lóng và giải quyết câu hỏi nối tiếp
   */
  private analyzeIntentAndContext(
    query: string,
    sessionCtx: SessionContext,
    allBooks: BookCatalogItem[]
  ): {
    intent: string;
    isFollowUp: boolean;
    extractedCategory?: string;
    targetBook?: BookCatalogItem;
    candidateBooks: BookCatalogItem[];
  } {
    const qLower = query.toLowerCase().trim();
    const qNorm = this.normalizeText(qLower);

    // 1. CẢM XÚC TIÊU CỰC / BỰC BỘI / TIẾNG LÓNG
    const isNegativeEmotion =
      qNorm.includes("nhu qq") ||
      qNorm.includes("nhu cc") ||
      qNorm.includes("chan vay") ||
      qNorm.includes("chan the") ||
      qNorm.includes("chan pheo") ||
      qNorm.includes("te qua") ||
      qNorm.includes("do qua") ||
      qNorm.includes("do ec") ||
      qNorm.includes("tu van kieu gi") ||
      qNorm.includes("tu van do") ||
      qNorm.includes("tao lao") ||
      qNorm.includes("vo dung") ||
      qNorm.includes("khong thich may cuon") ||
      qNorm.includes("k thich") ||
      qNorm.includes("doi cuon khac") ||
      qNorm.includes("xau qua");

    if (isNegativeEmotion) {
      return {
        intent: "DISSATISFACTION",
        isFollowUp: true,
        candidateBooks: this.getFreshDiverseBooks(allBooks, sessionCtx.suggestedBookIds, 3),
      };
    }

    // 2. KHEN NGỢI / CẢM ƠN / CHÀO HỎI NGẮN
    if (
      qLower === "hi" ||
      qLower === "hello" ||
      qLower.startsWith("chào") ||
      qLower === "alo" ||
      qLower === "ê" ||
      qLower === "ê bé cáo"
    ) {
      return {
        intent: "GREETING",
        isFollowUp: false,
        candidateBooks: this.getTopBestsellers(allBooks, 3),
      };
    }

    if (
      qLower.includes("cảm ơn") ||
      qLower.includes("cam on") ||
      qLower.includes("tks") ||
      qLower.includes("thank") ||
      qLower.includes("hay quá") ||
      qLower.includes("tuyệt vời") ||
      qLower === "ok" ||
      qLower === "oke" ||
      qLower === "dạ"
    ) {
      return {
        intent: "GRATITUDE",
        isFollowUp: false,
        candidateBooks: [],
      };
    }

    // 3. CÂU HỎI TIẾP NỐI: "Còn cuốn khác không?", "Có cuốn nào nữa không?", "Xem thêm"
    const isMoreRequest =
      qNorm.includes("con cuon khac khong") ||
      qNorm.includes("con cuon nao nua khong") ||
      qNorm.includes("con sach khac khong") ||
      qNorm.includes("doi cuon khac") ||
      qNorm.includes("xem them") ||
      qNorm.includes("khac nua di") ||
      qNorm.includes("goi y them");

    if (isMoreRequest) {
      // Ưu tiên cùng thể loại với lượt trước nhưng loại trừ các cuốn đã gợi ý
      let freshBooks: BookCatalogItem[] = [];
      if (sessionCtx.lastCategory) {
        freshBooks = allBooks.filter(
          (b) =>
            this.normalizeText(b.category).includes(this.normalizeText(sessionCtx.lastCategory!)) &&
            !sessionCtx.suggestedBookIds.includes(b.id)
        );
      }
      if (freshBooks.length === 0) {
        freshBooks = this.getFreshDiverseBooks(allBooks, sessionCtx.suggestedBookIds, 4);
      }
      return {
        intent: "MORE_BOOKS",
        isFollowUp: true,
        extractedCategory: sessionCtx.lastCategory,
        candidateBooks: freshBooks.slice(0, 4),
      };
    }

    // 4. CÂU HỎI TIẾP NỐI VỀ NỘI DUNG CUỐN SÁCH CỤ THỂ: "Cuốn đầu tiên nói về gì?", "Cuốn 1 nói gì?"
    const isDetailRequest =
      qNorm.includes("cuon dau tien") ||
      qNorm.includes("cuon thu nhat") ||
      qNorm.includes("cuon 1") ||
      qNorm.includes("noi ve gi") ||
      qNorm.includes("tom tat") ||
      qNorm.includes("noi dung sao") ||
      qNorm.includes("ke ve gi");

    if (isDetailRequest) {
      let targetId = sessionCtx.lastCandidateIds[0] || sessionCtx.lastSubjectBookId;
      if (qNorm.includes("cuon thu hai") || qNorm.includes("cuon 2")) {
        targetId = sessionCtx.lastCandidateIds[1] || targetId;
      }
      const targetBook = allBooks.find((b) => b.id === targetId) || allBooks[0];
      return {
        intent: "BOOK_DETAIL",
        isFollowUp: true,
        targetBook,
        candidateBooks: targetBook ? [targetBook] : [],
      };
    }

    // 5. CÂU HỎI TIẾP NỐI VỀ GIÁ BÁN: "Giá bao nhiêu?", "Nhiêu tiền?"
    const isPriceRequest =
      qNorm.includes("gia bao nhieu") ||
      qNorm.includes("nhieu tien") ||
      qNorm.includes("bao nhieu tien") ||
      qNorm.includes("bao nhieu mot cuon") ||
      qNorm.includes("gia sao");

    if (isPriceRequest) {
      const targetId = sessionCtx.lastSubjectBookId || sessionCtx.lastCandidateIds[0];
      const targetBook = allBooks.find((b) => b.id === targetId) || allBooks[0];
      return {
        intent: "PRICE_INQUIRY",
        isFollowUp: true,
        targetBook,
        candidateBooks: targetBook ? [targetBook] : [],
      };
    }

    // 6. CÂU HỎI VỀ ĐỊNH DẠNG: "Có bản ebook không?", "Có sách giấy không?", "Có DRM không?"
    const isFormatRequest =
      qNorm.includes("co ban ebook khong") ||
      qNorm.includes("co ebook ko") ||
      qNorm.includes("co sach giay khong") ||
      qNorm.includes("doc online duoc khong") ||
      qNorm.includes("co drm khong");

    if (isFormatRequest) {
      const targetId = sessionCtx.lastSubjectBookId || sessionCtx.lastCandidateIds[0];
      const targetBook = allBooks.find((b) => b.id === targetId) || allBooks[0];
      return {
        intent: "FORMAT_INQUIRY",
        isFollowUp: true,
        targetBook,
        candidateBooks: targetBook ? [targetBook] : [],
      };
    }

    // 7. CÂU HỎI VỀ SÁCH RẺ HƠN: "Tìm sách rẻ hơn đi", "Cuốn nào rẻ hơn"
    const isCheaperRequest =
      qNorm.includes("re hon") ||
      qNorm.includes("gia re") ||
      qNorm.includes("re nhat") ||
      qNorm.includes("it tien") ||
      qNorm.includes("duoi 100") ||
      qNorm.includes("duoi 200");

    if (isCheaperRequest) {
      const targetId = sessionCtx.lastSubjectBookId || sessionCtx.lastCandidateIds[0];
      const currentBook = allBooks.find((b) => b.id === targetId);
      const maxPrice = currentBook ? currentBook.price : 100000;

      const cheaper = allBooks
        .filter((b) => b.price < maxPrice && !sessionCtx.suggestedBookIds.includes(b.id))
        .sort((a, b) => a.price - b.price);

      const candidates = cheaper.length > 0 ? cheaper.slice(0, 3) : allBooks.sort((a, b) => a.price - b.price).slice(0, 3);
      return {
        intent: "PRICE_CHEAPER",
        isFollowUp: true,
        candidateBooks: candidates,
      };
    }

    // 8. CÂU HỎI TỔNG QUAN: "Sách nào hay?", "Có sách gì hot?"
    const isGeneralRec =
      qNorm === "sach nao hay" ||
      qNorm.includes("sach nao hay") ||
      qNorm.includes("sach gi hot") ||
      qNorm.includes("tu van sach hay") ||
      qNorm.includes("nen doc gi");

    if (isGeneralRec) {
      const top = this.getTopBestsellers(allBooks, 4);
      return {
        intent: "GENERAL_RECOMMENDATION",
        isFollowUp: false,
        candidateBooks: top,
      };
    }

    // 9. Ý ĐỊNH ĐẶT HÀNG / THÊM GIỎ HÀNG TRỰC TIẾP
    const isCartOrder =
      qNorm.includes("them vao gio") ||
      qNorm.includes("cho vao gio") ||
      qNorm.includes("mua sach") ||
      qNorm.includes("dat mua") ||
      qNorm.includes("mua ngay") ||
      qNorm.includes("mua cuon") ||
      qNorm.includes("cho minh cuon") ||
      qNorm.includes("chot don");

    if (isCartOrder) {
      const matched = this.searchRelevantBooks(query, allBooks);
      const target = matched[0] || (sessionCtx.lastSubjectBookId ? allBooks.find((b) => b.id === sessionCtx.lastSubjectBookId) : undefined);
      return {
        intent: "CART_ORDER",
        isFollowUp: true,
        targetBook: target,
        candidateBooks: target ? [target] : matched.slice(0, 3),
      };
    }

    // 10. Ý ĐỊNH TRA CỨU ĐƠN HÀNG & TIẾN ĐỘ VẬN CHUYỂN
    const isOrderTracking =
      qNorm.includes("tra cuu don") ||
      qNorm.includes("kiem tra don") ||
      qNorm.includes("don hang cua toi") ||
      qNorm.includes("tinh trang don") ||
      qNorm.includes("don hang dau roi");

    if (isOrderTracking) {
      return {
        intent: "ORDER_TRACKING",
        isFollowUp: false,
        candidateBooks: [],
      };
    }

    // 11. CÂU HỎI VỀ DỊCH VỤ / HỆ SINH THÁI HUKI
    if (qNorm.includes("drm") || qNorm.includes("doc nhu the nao") || qNorm.includes("tu sach")) {
      return { intent: "DRM_GUIDE", isFollowUp: false, candidateBooks: [] };
    }
    if (qNorm.includes("giao hang") || qNorm.includes("phi ship") || qNorm.includes("van chuyen")) {
      return { intent: "SHIPPING_GUIDE", isFollowUp: false, candidateBooks: [] };
    }
    if (qNorm.includes("doi tra") || qNorm.includes("hoan tien") || qNorm.includes("bao hanh")) {
      return { intent: "RETURN_GUIDE", isFollowUp: false, candidateBooks: [] };
    }

    // 10. TÌM KIẾM THEO CHỦ ĐỀ / THỂ LOẠI / TỪ KHÓA
    const matched = this.searchRelevantBooks(query, allBooks);
    if (matched.length > 0) {
      const cat = matched[0].category;
      return {
        intent: "CATEGORY_SEARCH",
        isFollowUp: false,
        extractedCategory: cat,
        candidateBooks: matched.slice(0, 4),
      };
    }

    // Mặc định: Trả về sách đa dạng từ kho
    return {
      intent: "GENERAL_DISCOVERY",
      isFollowUp: false,
      candidateBooks: this.getTopBestsellers(allBooks, 3),
    };
  }

  /**
   * Gọi Google Gemini RAG với bối cảnh đầy đủ và dự phòng đa mô hình
   */
  private async askGeminiWithContext(
    query: string,
    sessionCtx: SessionContext,
    analysis: any,
    allBooks: BookCatalogItem[],
    apiKey: string
  ): Promise<AiChatResponse> {
    try {
      // 1. Tuyển tập kho sách liên quan phong phú (lên đến 25 cuốn) để Gemini có đầy đủ dữ liệu tư vấn
      const directMatches = this.searchRelevantBooks(query, allBooks);
      const bestsellers = this.getTopBestsellers(allBooks, 6);
      const diverseBooks = this.getFreshDiverseBooks(allBooks, sessionCtx.suggestedBookIds, 8);

      const candidateMap = new Map<string, BookCatalogItem>();
      for (const b of [...directMatches, ...bestsellers, ...diverseBooks, ...analysis.candidateBooks]) {
        if (!candidateMap.has(b.id)) {
          candidateMap.set(b.id, b);
        }
        if (candidateMap.size >= 25) break;
      }
      const candidateBooks = Array.from(candidateMap.values());

      const booksContext = candidateBooks.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        category: b.category,
        price: b.price,
        format: b.format,
        soldCount: b.soldCount,
        description: (b.description || "").slice(0, 160),
      }));

      const sampleTitle = candidateBooks[0]?.title || "Đắc Nhân Tâm";
      const sampleId = candidateBooks[0]?.id || "77777777-0000-4000-8000-000000000001";

      const systemInstruction = `Bạn là Bé Cáo HUKI - Trợ lý thủ thư thông thái, đáng yêu, tâm lý và tận tâm của sàn sách HUKI Ebook (hukiebook.vn).

KHO SÁCH THẬT HIỆN CÓ TẠI HUKI (BẠN CHỈ ĐƯỢC PHÉP GỢI Ý CÁC CUỐN SÁCH CÓ TRONG DANH SÁCH NÀY):
${JSON.stringify(booksContext, null, 2)}

QUY TẮC BẮT BUỘC KHI GỢI Ý VÀ TƯ VẤN:
1. Khi nhắc đến cuốn sách nào trong danh sách trên, BẮT BUỘC chèn link trực tiếp theo cú pháp Markdown: [Tên Sách](/book/id)
   Ví dụ: "Bạn có thể xem cuốn [${sampleTitle}](/book/${sampleId}) nhé!"
2. TUYỆT ĐỐI KHÔNG BỊA RA sách, tác giả hoặc ID không có trong danh sách trên!
3. Xưng hô: Xưng "Bé Cáo", gọi "bạn". Giọng văn ấm áp, vui vẻ, tri thức và tự nhiên (📚, 🦊, ✨).
4. Xử lý cảm xúc & tiếng lóng:
   - Nếu khách chê bai, than chán, bực bội hoặc dùng tiếng lóng ("như qq", "chán vậy", "mày tư vấn kiểu gì thế"): Hãy xin lỗi duyên dáng, thấu cảm, xoa dịu và chân thành hỏi lại để tìm đúng gu sách của khách. Không tranh cãi, không tự ái!
5. Câu hỏi nối tiếp ("còn cuốn khác không?", "cuốn đầu tiên nói về gì?", "giá bao nhiêu?", "rẻ hơn đi"):
   - Dựa vào lịch sử hội thoại để trả lời chính xác, tránh lặp lại những cuốn sách khách đã từ chối.
6. Hỗ trợ mua sắm & giỏ hàng (QUAN TRỌNG):
   - Nếu khách muốn mua, muốn đặt, thêm vào giỏ hàng hoặc chốt đơn một cuốn sách cụ thể: Hãy vui vẻ xác nhận và thêm mã lệnh [ACTION: ADD_TO_CART: bookId] ở cuối câu.
   - Nếu khách muốn mua ngay / thanh toán ngay: thêm [ACTION: BUY_NOW: bookId].
7. Tra cứu đơn hàng & chính sách HUKI:
   - Nếu khách hỏi về tình trạng đơn hàng, tra cứu mã đơn: Hướng dẫn khách mở trang [Xem Đơn Hàng Của Bạn](/account/orders) và thêm mã lệnh [ACTION: TRACK_ORDER].
   - Ebook DRM: Đọc trực tiếp trên Web Reader bảo mật, sách mở khóa ngay trong Tủ Sách Cá Nhân sau thanh toán.
   - Sách in: Giao hàng 1-2 ngày nội thành, 2-4 ngày toàn quốc. Hỗ trợ đổi trả trong 7 ngày nếu lỗi in ấn.
8. Cuối phản hồi, BẮT BUỘC thêm các dòng siêu dữ liệu:
   [BOOKS: id1, id2] (danh sách ID của các cuốn sách thật được đề xuất trong câu)
   [TAGS: tag1, tag2] (thể loại hoặc chủ đề liên quan, tối đa 3 tag)
   [ACTION: ADD_TO_CART: id] hoặc [ACTION: BUY_NOW: id] hoặc [ACTION: TRACK_ORDER] (nếu khách có ý định mua/đặt/tra cứu)`;

      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
        {
          role: "user",
          parts: [{ text: `System Instructions: ${systemInstruction}` }],
        },
        {
          role: "model",
          parts: [{ text: "Dạ vâng, Bé Cáo đã ghi nhớ kho sách thật của HUKI, hiểu rõ cảm xúc khách hàng, sẵn sàng hỗ trợ chọn sách, thêm vào giỏ và luôn chèn link [Tên sách](/book/id) chuẩn xác ạ! ✨" }],
        },
      ];

      // Thêm tối đa 8 tin nhắn gần nhất từ lịch sử phiên
      if (Array.isArray(sessionCtx.turns) && sessionCtx.turns.length > 0) {
        for (const item of sessionCtx.turns.slice(-8)) {
          contents.push({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.text }],
          });
        }
      }

      contents.push({
        role: "user",
        parts: [{ text: query }],
      });

      const preferredModel =
        this.config.get<string>("GEMINI_MODEL") ||
        process.env.GEMINI_MODEL ||
        "gemini-3.5-flash-lite";

      const candidateModels = Array.from(
        new Set([preferredModel, "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"])
      );

      let rawReply = "";
      for (const model of candidateModels) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(Number(process.env.GEMINI_TIMEOUT_MS || 8000)),
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: 0.65,
                maxOutputTokens: 750,
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            rawReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (rawReply) {
              this.logger.log(`Gemini response received successfully via model '${model}'`);
              break;
            }
          } else {
            this.logger.warn(`Model '${model}' returned status ${res.status}`);
          }
        } catch (fetchErr) {
          this.logger.warn(`Error calling model '${model}': ${fetchErr}`);
        }
      }

      if (!rawReply) {
        this.logger.warn("All candidate Gemini models failed or returned empty reply, falling back to local intelligence.");
        return this.generateSmartLocalResponseWithContext(query, sessionCtx, analysis, allBooks);
      }

      // Trích xuất tags và book ids
      const tagMatch = rawReply.match(/\[TAGS:\s*([^\]]*)\]/i);
      let tags: string[] = [];
      if (tagMatch && tagMatch[1].trim()) {
        tags = tagMatch[1].split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean);
      }

      const bookMatch = rawReply.match(/\[BOOKS:\s*([^\]]*)\]/i);
      let mentionedIds: string[] = [];
      if (bookMatch && bookMatch[1].trim()) {
        mentionedIds = bookMatch[1].split(",").map((id: string) => id.trim()).filter(Boolean);
      }

      // Trích xuất action nếu có
      const actionMatch = rawReply.match(/\[ACTION:\s*([A-Z_]+)(?::\s*([^\]]*))?\]/i);
      let action: AiChatAction | undefined = undefined;
      if (actionMatch) {
        const actType = actionMatch[1].trim().toUpperCase() as AiChatAction["type"];
        const targetId = actionMatch[2]?.trim();
        const matchedBook = targetId ? allBooks.find((b) => b.id === targetId || b.id.includes(targetId)) : undefined;
        action = {
          type: actType,
          bookId: matchedBook ? matchedBook.id : targetId,
          bookTitle: matchedBook?.title,
          format: matchedBook?.format,
        };
      }

      // Lọc sạch reply
      const cleanReply = rawReply
        .replace(/\[TAGS:\s*[^\]]*\]/gi, "")
        .replace(/\[BOOKS:\s*[^\]]*\]/gi, "")
        .replace(/\[ACTION:\s*[^\]]*\]/gi, "")
        .trim();

      // Tạo danh sách suggestedBooks có cấu trúc từ DB thật (tìm trên toàn bộ allBooks)
      const suggestedBooks: SuggestedBookItem[] = allBooks
        .filter(
          (b) =>
            mentionedIds.includes(b.id) ||
            cleanReply.includes(`/book/${b.id}`) ||
            (action?.bookId && b.id === action.bookId)
        )
        .slice(0, 4)
        .map((b) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          price: b.price,
          originalPrice: b.originalPrice,
          coverUrl: b.coverUrl,
          slug: b.slug,
          format: b.format,
          soldCount: b.soldCount,
        }));

      return {
        reply: cleanReply,
        extractedInterests: tags,
        suggestedBooks,
        action,
        isFallback: false,
      };
    } catch (err) {
      this.logger.error("Gemini context call error:", err);
      return this.generateSmartLocalResponseWithContext(query, sessionCtx, analysis, allBooks);
    }
  }

  /**
   * Bộ máy AI cục bộ thông minh xử lý đầy đủ kịch bản khi không có Gemini hoặc API lỗi
   */
  private generateSmartLocalResponseWithContext(
    query: string,
    sessionCtx: SessionContext,
    analysis: any,
    allBooks: BookCatalogItem[]
  ): AiChatResponse {
    const { intent, candidateBooks, targetBook } = analysis;

    // 0. Ý ĐỊNH ĐẶT HÀNG / THÊM VÀO GIỎ HÀNG
    if (intent === "CART_ORDER") {
      const book = targetBook || candidateBooks[0] || (sessionCtx.lastSubjectBookId ? allBooks.find((b) => b.id === sessionCtx.lastSubjectBookId) : undefined) || allBooks[0];
      const reply = `Dạ Bé Cáo đã ghi nhận bạn muốn chọn cuốn [${book.title}](/book/${book.id}) rồi nè! 🦊🛒\nBé Cáo đã hỗ trợ thêm vào giỏ hàng giúp bạn, bạn có thể kiểm tra giỏ hàng để tiến hành thanh toán nhé! ✨`;
      return {
        reply,
        extractedInterests: [book.category.toLowerCase()],
        suggestedBooks: this.toSuggestedItems([book]),
        action: {
          type: "ADD_TO_CART",
          bookId: book.id,
          bookTitle: book.title,
          format: book.format,
        },
        isFallback: true,
      };
    }

    // 0.1. Ý ĐỊNH TRA CỨU ĐƠN HÀNG
    if (intent === "ORDER_TRACKING") {
      const reply =
        "📦 Dạ bạn có thể theo dõi tiến độ vận chuyển và trạng thái chi tiết của tất cả đơn hàng tại [Xem Đơn Hàng Của Bạn](/account/orders) nha! Nếu bạn cần kiểm tra mã đơn cụ thể, bạn cứ gửi mã (ví dụ: ORD-xxx) để Bé Cáo hỗ trợ nhé! 🦊✨";
      return {
        reply,
        extractedInterests: [],
        suggestedBooks: [],
        action: {
          type: "TRACK_ORDER",
        },
        isFallback: true,
      };
    }

    // 1. DISSATISFACTION / TIẾNG LÓNG BỰC BỘI ("như qq", "chán vậy", "mày tư vấn kiểu gì thế")
    if (intent === "DISSATISFACTION") {
      const reply =
        "Dạ chắc Bé Cáo tư vấn chưa đúng gu bạn rồi nè 🦊😅 Bạn đừng bực nha! Bạn muốn mình đổi sang thể loại khác như Kỹ năng sống, Tiểu thuyết hay gợi ý những cuốn thực tế, dễ áp dụng hơn nè? Mình gửi bạn thử vài tựa sách được độc giả yêu thích khác nhé:";
      return {
        reply,
        extractedInterests: ["đổi thể loại"],
        suggestedBooks: this.toSuggestedItems(candidateBooks.slice(0, 3)),
        isFallback: true,
      };
    }

    // 2. CHÀO HỎI
    if (intent === "GREETING") {
      const reply =
        "Dạ Bé Cáo chào bạn nha! 👋 Rất vui được gặp bạn hôm nay. Bạn đang muốn tìm một cuốn sách để đọc thư giãn hay nghiên cứu chủ đề nào nè, cứ bảo mình tư vấn cho nghen! 🦊✨";
      return {
        reply,
        extractedInterests: [],
        suggestedBooks: this.toSuggestedItems(candidateBooks.slice(0, 3)),
        isFallback: true,
      };
    }

    // 3. KHEN NGỢI / CẢM ƠN
    if (intent === "GRATITUDE") {
      const reply =
        "Dạ hihi, Bé Cáo cảm ơn bạn nhiều nhen! ✨ Thấy bạn vui là Bé Cáo có thêm động lực rồi á. Bạn có cần mình hỗ trợ thêm điều gì về sách hay đơn hàng nữa không nè? 📚🦊";
      return { reply, extractedInterests: [], suggestedBooks: [], isFallback: true };
    }

    // 4. CÂU HỎI TIẾP NỐI: "Còn cuốn khác không?" (Anti-Repetition)
    if (intent === "MORE_BOOKS") {
      if (candidateBooks.length > 0) {
        const bookLinks = candidateBooks
          .map((b: BookCatalogItem) => `• [${b.title}](/book/${b.id}) - ${b.author} (${b.price.toLocaleString("vi-VN")}đ)`)
          .join("\n");
        const reply = `Dạ Bé Cáo có ngay những cuốn sách mới toanh khác gửi bạn đây ạ, không sợ trùng nhen! 🦊✨\n\n${bookLinks}\n\nBạn thích cuốn nào thì bấm xem ngay nha!`;
        return {
          reply,
          extractedInterests: analysis.extractedCategory ? [analysis.extractedCategory.toLowerCase()] : [],
          suggestedBooks: this.toSuggestedItems(candidateBooks),
          isFallback: true,
        };
      }
    }

    // 5. CÂU HỎI TIẾP NỐI: "Cuốn đầu tiên nói về gì?"
    if (intent === "BOOK_DETAIL" && targetBook) {
      const desc = targetBook.description || "Tác phẩm xuất sắc giàu giá trị nhân văn và bài học thực tiễn.";
      const reply = `📖 Cuốn [${targetBook.title}](/book/${targetBook.id}) của tác giả **${targetBook.author}**:\n\n${desc}\n\nCuốn sách này hiện có giá **${targetBook.price.toLocaleString("vi-VN")}đ** với định dạng **${targetBook.format}** trên sàn HUKI đó bạn! ✨`;
      return {
        reply,
        extractedInterests: [targetBook.category.toLowerCase()],
        suggestedBooks: this.toSuggestedItems([targetBook]),
        isFallback: true,
      };
    }

    // 6. CÂU HỎI TIẾP NỐI: "Giá bao nhiêu?"
    if (intent === "PRICE_INQUIRY" && targetBook) {
      const reply = `Dạ cuốn [${targetBook.title}](/book/${targetBook.id}) hiện đang có giá niêm yết là **${targetBook.price.toLocaleString("vi-VN")}đ** nha bạn! 🦊 Đơn sách này bạn có thể chọn mua sách in hoặc mở khóa Ebook đọc liền tay trên Web Reader ạ.`;
      return {
        reply,
        extractedInterests: [targetBook.category.toLowerCase()],
        suggestedBooks: this.toSuggestedItems([targetBook]),
        isFallback: true,
      };
    }

    // 7. CÂU HỎI TIẾP NỐI: "Có bản ebook không?"
    if (intent === "FORMAT_INQUIRY" && targetBook) {
      const formatDesc =
        targetBook.format.includes("Ebook") || targetBook.format.includes("Combo")
          ? "Đặc biệt cuốn này CÓ BẢN EBOOK DRM bản quyền! Mua xong là sách vào Tủ Sách Cá Nhân để bạn đọc ngay trên Web Reader."
          : `Hiện cuốn này đang có định dạng **${targetBook.format}** rất chất lượng bạn nha!`;
      const reply = `Dạ cuốn [${targetBook.title}](/book/${targetBook.id}) của bạn đây nè: 📱\n${formatDesc} Bạn bấm vào tên sách để xem chi tiết nhé!`;
      return {
        reply,
        extractedInterests: [targetBook.category.toLowerCase()],
        suggestedBooks: this.toSuggestedItems([targetBook]),
        isFallback: true,
      };
    }

    // 8. CÂU HỎI TIẾP NỐI: "Tìm sách rẻ hơn đi"
    if (intent === "PRICE_CHEAPER") {
      const bookLinks = candidateBooks
        .map((b: BookCatalogItem) => `• [${b.title}](/book/${b.id}) - ${b.price.toLocaleString("vi-VN")}đ (Định dạng: ${b.format})`)
        .join("\n");
      const reply = `Dạ Bé Cáo đã lọc ra những cuốn sách có mức giá siêu hạt dẻ, tiết kiệm hơn cho bạn nè: 💸🦊\n\n${bookLinks}\n\nBạn ưng cuốn nào thì cứ bấm vào xem nha!`;
      return {
        reply,
        extractedInterests: ["sách giá rẻ"],
        suggestedBooks: this.toSuggestedItems(candidateBooks),
        isFallback: true,
      };
    }

    // 9. CÂU HỎI TỔNG QUAN: "Sách nào hay?"
    if (intent === "GENERAL_RECOMMENDATION") {
      const bookLinks = candidateBooks
        .map((b: BookCatalogItem) => `• [${b.title}](/book/${b.id}) - ${b.author} (${b.category})`)
        .join("\n");
      const reply = `📚 Dạ Bé Cáo gợi ý bạn một số cuốn sách hay, bán chạy và được yêu thích nhất tại HUKI hiện nay nè: 🦊✨\n\n${bookLinks}\n\nBạn đang thích chủ đề nào nhất, bảo mình tư vấn kỹ hơn cho nhen!`;
      return {
        reply,
        extractedInterests: ["sách bán chạy"],
        suggestedBooks: this.toSuggestedItems(candidateBooks),
        isFallback: true,
      };
    }

    // 10. HƯỚNG DẪN DỊCH VỤ HUKI
    if (intent === "DRM_GUIDE") {
      const reply =
        "📱 **Về Ebook DRM bản quyền tại HUKI:**\n" +
        "- Khi mua Ebook, sách sẽ được đưa vào **Tủ Sách Cá Nhân** của bạn ngay lập tức.\n" +
        "- Bạn đọc trực tiếp trên **Web Reader** tích hợp công nghệ chống sao chép và bảo vệ bản quyền.\n" +
        "- Nếu bạn chọn gói **Hybrid (Combo)**, bạn vừa có sách in giao tận tay vừa được mở khóa Ebook đọc liền luôn nè! ✨";
      return { reply, extractedInterests: ["ebook drm"], suggestedBooks: [], isFallback: true };
    }

    if (intent === "SHIPPING_GUIDE") {
      const reply =
        "🚚 **Thời gian & Phí giao hàng tại HUKI:**\n" +
        "- Nội thành (TP.HCM, Hà Nội): Nhận sách trong 1 - 2 ngày làm việc.\n" +
        "- Các tỉnh thành khác: Khoảng 2 - 4 ngày.\n" +
        "- Đơn hàng từ 250.000đ được hỗ trợ phí ship qua các mã Freeship trong giỏ hàng nha bạn!";
      return { reply, extractedInterests: [], suggestedBooks: [], isFallback: true };
    }

    if (intent === "RETURN_GUIDE") {
      const reply =
        "🛡️ **Chính sách đổi trả tại HUKI rất an tâm bạn nha:**\n" +
        "- Sàn hỗ trợ đổi trả trong vòng **7 ngày** nếu sách in bị lỗi in ấn, rách trang hoặc hư hại do vận chuyển.\n" +
        "- Tiền thanh toán được giữ an toàn trong tài khoản ký quỹ PayOS cho đến khi bạn xác nhận hài lòng!";
      return { reply, extractedInterests: [], suggestedBooks: [], isFallback: true };
    }

    // TÌM KIẾM THEO CHỦ ĐỀ HOẶC MẶC ĐỊNH
    if (candidateBooks.length > 0) {
      const bookLinks = candidateBooks
        .map((b: BookCatalogItem) => `• [${b.title}](/book/${b.id}) - ${b.author} (${b.price.toLocaleString("vi-VN")}đ)`)
        .join("\n");
      const reply = `📚 Dạ Bé Cáo gửi bạn những tựa sách phù hợp với câu hỏi của bạn nè: 🦊✨\n\n${bookLinks}\n\nBạn bấm vào từng cuốn để xem thử nội dung nhé!`;
      return {
        reply,
        extractedInterests: analysis.extractedCategory ? [analysis.extractedCategory.toLowerCase()] : [],
        suggestedBooks: this.toSuggestedItems(candidateBooks),
        isFallback: true,
      };
    }

    const defaultTop = this.getTopBestsellers(allBooks, 3);
    const reply =
      "Dạ Bé Cáo là trợ lý thủ thư của sàn sách HUKI! 🦊 Nếu bạn cần tìm sách hay, hỏi về đơn hàng hay cách đọc ebook DRM thì cứ nhắn cho mình nhé. Dưới đây là một số cuốn sách nổi bật đang có trên sàn nè:";
    return {
      reply,
      extractedInterests: [],
      suggestedBooks: this.toSuggestedItems(defaultTop),
      isFallback: true,
    };
  }

  private toSuggestedItems(books: BookCatalogItem[]): SuggestedBookItem[] {
    return books.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      price: b.price,
      originalPrice: b.originalPrice,
      coverUrl: b.coverUrl,
      slug: b.slug,
      format: b.format,
      soldCount: b.soldCount,
    }));
  }

  private getTopBestsellers(allBooks: BookCatalogItem[], limit = 4): BookCatalogItem[] {
    return [...allBooks].sort((a, b) => b.soldCount - a.soldCount).slice(0, limit);
  }

  private getFreshDiverseBooks(allBooks: BookCatalogItem[], excludeIds: string[], limit = 3): BookCatalogItem[] {
    const unshown = allBooks.filter((b) => !excludeIds.includes(b.id));
    if (unshown.length >= limit) {
      return unshown.slice(0, limit);
    }
    return allBooks.slice(0, limit);
  }

  private searchRelevantBooks(query: string, allBooks: BookCatalogItem[]): BookCatalogItem[] {
    const q = query.toLowerCase().trim();
    if (!q || allBooks.length === 0) return [];

    const qNormalized = this.normalizeText(q);

    const scored = allBooks.map((b) => {
      let score = 0;
      const titleNorm = this.normalizeText(b.title);
      const authorNorm = this.normalizeText(b.author);
      const catNorm = this.normalizeText(b.category);
      const descNorm = this.normalizeText(b.description);

      // Khớp cụm từ chính xác
      if (titleNorm.includes(qNormalized)) score += 120;
      if (authorNorm.includes(qNormalized)) score += 90;
      if (catNorm.includes(qNormalized)) score += 70;
      if (descNorm.includes(qNormalized)) score += 40;

      // Khớp từng từ
      const tokens = qNormalized.split(/\s+/).filter((t) => t.length >= 2);
      for (const t of tokens) {
        if (titleNorm.includes(t)) score += 30;
        if (authorNorm.includes(t)) score += 20;
        if (catNorm.includes(t)) score += 15;
        if (descNorm.includes(t)) score += 5;
      }

      // Điểm cộng theo lượt bán thật
      score += Math.min(b.soldCount * 3, 30);

      return { book: b, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.book);
  }

  private normalizeText(str: string): string {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s]/g, " ")
      .trim();
  }

  private getFallbackStaticBooks(): BookCatalogItem[] {
    return [
      {
        id: "77777777-0000-4000-8000-000000000001",
        title: "Đắc Nhân Tâm (How to Win Friends and Influence People)",
        author: "Dale Carnegie",
        category: "Kỹ năng sống & Phát triển bản thân",
        price: 86000,
        originalPrice: 110000,
        coverUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80",
        format: "Combo (Giấy + Ebook)",
        soldCount: 1540,
        description: "Cuốn sách nghệ thuật thu phục lòng người kinh điển nhất mọi thời đại.",
      },
      {
        id: "77777777-0000-4000-8000-000000000002",
        title: "Nhà Giả Kim (The Alchemist)",
        author: "Paulo Coelho",
        category: "Văn học cổ điển & Tiểu thuyết",
        price: 79000,
        originalPrice: 95000,
        coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80",
        format: "Ebook DRM",
        soldCount: 2310,
        description: "Hành trình theo đuổi vận mệnh và giấc mơ của chàng chăn cừu Santiago.",
      },
      {
        id: "77777777-0000-4000-8000-000000000003",
        title: "Bí Quyết Gây Dựng Cơ Nghiệp Bạc Tỷ",
        author: "Adam Khoo",
        category: "Kinh doanh & Đầu tư",
        price: 110000,
        originalPrice: 145000,
        coverUrl: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80",
        format: "Combo (Giấy + Ebook)",
        soldCount: 980,
        description: "Cẩm nang thực chiến khởi nghiệp từ hai bàn tay trắng.",
      },
    ];
  }
}
