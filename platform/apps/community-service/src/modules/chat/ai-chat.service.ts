import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
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

export interface AiChatResponse {
  reply: string;
  extractedInterests: string[];
  suggestedBooks: SuggestedBookItem[];
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

    // 1. Kiểm tra cache trên Redis trước để siêu nhẹ, không query liên tục
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
        const rawBooks = Array.isArray(json.data) ? json.data : [];
        const catalogItems: BookCatalogItem[] = rawBooks.map((b: any) => ({
          id: b.id,
          title: b.title || "Tựa sách HUKI",
          slug: b.slug,
          author: b.author?.name || (typeof b.author === "string" ? b.author : "Tác giả HUKI"),
          category: b.category?.name || "Sách chọn lọc",
          price: Number(b.price || 0),
          originalPrice: b.originalPrice ? Number(b.originalPrice) : undefined,
          coverUrl: b.coverUrl || b.coverImage || "",
          format: b.format === "DIGITAL" ? "Ebook DRM" : b.format === "PHYSICAL" ? "Sách giấy" : "Combo (Giấy + Ebook)",
          soldCount: Number(b.soldCount ?? b.sales ?? 0),
          description: (b.description || "").slice(0, 250),
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
    } catch (error) {
      this.logger.error("Failed to fetch books from commerce-service:", error);
    }

    return [];
  }

  async askAi(dto: AskAiDto): Promise<AiChatResponse> {
    const query = dto.message.trim();
    const queryLower = query.toLowerCase();

    // 1. Kiểm tra cache câu trả lời trên Redis (TTL: 30 phút)
    const queryHash = createHash("md5").update(queryLower).digest("hex");
    const REDIS_RESPONSE_CACHE_KEY = `ai:cache:${queryHash}`;
    if (this.redis) {
      try {
        const cachedRes = await this.redis.get(REDIS_RESPONSE_CACHE_KEY);
        if (cachedRes) {
          const parsed = JSON.parse(cachedRes);
          // Ghi nhận chat history vào session nếu có
          if (dto.sessionId) {
            this.saveSessionChatToRedis(dto.sessionId, query, parsed.reply);
          }
          return parsed;
        }
      } catch (err) {
        this.logger.warn(`Redis response cache get error: ${err}`);
      }
    }

    // 2. Lấy kho sách thật từ DB
    const allBooks = await this.getCatalogBooks();

    // 3. Nếu có Gemini API Key, dùng Google Gemini RAG với kho sách thật
    const apiKey = this.getApiKey();
    let result: AiChatResponse;

    if (apiKey) {
      result = await this.askGeminiWithCatalog(query, dto.history || [], allBooks, apiKey);
    } else {
      result = this.generateSmartLocalResponse(query, allBooks);
    }

    // 4. Lưu cache câu trả lời vào Redis (TTL: 1800 giây = 30 phút)
    if (this.redis) {
      try {
        await this.redis.set(REDIS_RESPONSE_CACHE_KEY, JSON.stringify(result), "EX", 1800);
      } catch {}
    }

    // 5. Lưu lịch sử hội thoại của session vào Redis (TTL: 86400 giây = 24 giờ)
    if (dto.sessionId) {
      this.saveSessionChatToRedis(dto.sessionId, query, result.reply);
    }

    return result;
  }

  private async saveSessionChatToRedis(sessionId: string, userMsg: string, aiMsg: string): Promise<void> {
    if (!this.redis || !sessionId) return;
    try {
      const key = `ai:chat:${sessionId}`;
      const existing = await this.redis.get(key);
      const history = existing ? JSON.parse(existing) : [];
      history.push({ role: "user", text: userMsg, time: Date.now() });
      history.push({ role: "assistant", text: aiMsg, time: Date.now() });
      const trimmed = history.slice(-20); // Giữ tối đa 20 tin nhắn gần nhất
      await this.redis.set(key, JSON.stringify(trimmed), "EX", 86400); // 24 giờ
    } catch (err) {
      this.logger.warn(`Redis session chat save error: ${err}`);
    }
  }

  /**
   * Google Gemini RAG với kho sách thật từ Database
   */
  private async askGeminiWithCatalog(
    query: string,
    history: Array<{ role: string; content: string }>,
    allBooks: BookCatalogItem[],
    apiKey: string
  ): Promise<AiChatResponse> {
    try {
      const matchedBooks = this.searchRelevantBooks(query, allBooks);
      const topBooks = allBooks.slice(0, 15);
      const candidateBooks = matchedBooks.length > 0 ? matchedBooks.slice(0, 10) : topBooks;

      const booksContext = candidateBooks.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        category: b.category,
        price: b.price,
        format: b.format,
        soldCount: b.soldCount,
        description: b.description,
      }));

      const systemInstruction = `Bạn là Bé Cáo HUKI - Thủ thư thông thái, đáng yêu và tận tâm của sàn sách HUKI Ebook (hukiebook.vn).

KHO SÁCH THẬT HIỆN CÓ TẠI HUKI (BẠN CHỈ ĐƯỢC PHÉP GỢI Ý CÁC CUỐN SÁCH CÓ TRONG DANH SÁCH NÀY):
${JSON.stringify(booksContext, null, 2)}

QUY TẮC BẮT BUỘC KHI GỢI Ý SÁCH:
1. Khi nhắc đến cuốn sách nào, BẮT BUỘC chèn link trực tiếp theo cú pháp Markdown: [Tên Sách](/book/id_của_sách)
   Ví dụ: "Bạn có thể đọc cuốn [${candidateBooks[0]?.title || 'Sách'}](/book/${candidateBooks[0]?.id}) nhé!"
   => Giúp khách hàng bấm vào là mở ngay sách thật trên sàn HUKI!
2. TUYỆT ĐỐI KHÔNG BỊA RA sách hoặc ID không có trong danh sách trên!
3. Xưng hô: Xưng "Bé Cáo", gọi "bạn". Giọng văn ấm áp, vui vẻ, tri thức và tự nhiên (📚, 🦊, ✨).
4. Nếu khách chào hỏi, khen ngợi ("hay nha bạn", "cảm ơn", "chào bạn"): Trả lời duyên dáng, thân thiện. Tuyệt đối KHÔNG máy móc nói câu như "đã ghi nhận sở thích" hay "đồng bộ vào mục gợi ý".
5. Cuối phản hồi, thêm dòng ẩn:
   [BOOKS: id1, id2] (các id sách được gợi ý trong bài)
   [TAGS: tag1, tag2] (thể loại hoặc tác giả được nhắc đến, tối đa 3 tag)`;

      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
        {
          role: "user",
          parts: [{ text: `System Instructions: ${systemInstruction}` }],
        },
        {
          role: "model",
          parts: [{ text: "Dạ vâng, Bé Cáo đã ghi nhớ kho sách thật của HUKI và luôn chèn link [Tên sách](/book/id) để khách bấm vào là ra sách ngay ạ! ✨" }],
        },
      ];

      // Thêm 6 tin nhắn lịch sử gần nhất
      if (Array.isArray(history) && history.length > 0) {
        for (const item of history.slice(-6)) {
          contents.push({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.content }],
          });
        }
      }

      contents.push({
        role: "user",
        parts: [{ text: query }],
      });

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          },
        }),
      });

      if (!res.ok) {
        return this.generateSmartLocalResponse(query, allBooks);
      }

      const data = await res.json();
      const rawReply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawReply) {
        return this.generateSmartLocalResponse(query, allBooks);
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

      // Lọc sạch reply
      const cleanReply = rawReply
        .replace(/\[TAGS:\s*[^\]]*\]/gi, "")
        .replace(/\[BOOKS:\s*[^\]]*\]/gi, "")
        .trim();

      // Tạo danh sách suggestedBooks có cấu trúc từ DB
      const suggestedBooks: SuggestedBookItem[] = candidateBooks
        .filter((b) => mentionedIds.includes(b.id) || cleanReply.includes(`/book/${b.id}`))
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
        isFallback: false,
      };
    } catch (err) {
      this.logger.error("Gemini RAG call error:", err);
      return this.generateSmartLocalResponse(query, allBooks);
    }
  }

  /**
   * Bộ máy AI cục bộ thông minh: lấy sách thật từ DB, chèn link /book/{id} bấm ra ngay sách
   */
  private generateSmartLocalResponse(query: string, allBooks: BookCatalogItem[]): AiChatResponse {
    const q = query.toLowerCase().trim();
    let reply = "";
    let extractedInterests: string[] = [];
    let suggestedBooks: SuggestedBookItem[] = [];

    // 1. Chào hỏi
    if (q === "hi" || q === "hello" || q.startsWith("chào") || q === "alo" || q === "ê") {
      reply =
        "Dạ Bé Cáo chào bạn nha! 👋 Rất vui được gặp bạn hôm nay. Bạn đang muốn tìm một cuốn sách để đọc thư giãn hay nghiên cứu chủ đề nào nè, cứ bảo mình tư vấn cho nghen! 🦊✨";
      return { reply, extractedInterests: [], suggestedBooks: [], isFallback: true };
    }

    // 2. Khen ngợi, cảm ơn, tán gẫu ngắn
    if (
      q.includes("hay nha") ||
      q.includes("hay quá") ||
      q.includes("cảm ơn") ||
      q.includes("cam on") ||
      q.includes("tks") ||
      q.includes("thank") ||
      q === "ok" ||
      q === "oke" ||
      q === "dạ" ||
      q.includes("tuyệt") ||
      q.includes("được đó")
    ) {
      reply =
        "Dạ hihi, Bé Cáo cảm ơn bạn nhiều nhen! ✨ Thấy bạn vui và hài lòng là Bé Cáo có thêm động lực rồi á. Bạn có đang ấp ủ muốn tìm cuốn sách nào nữa không, cứ bảo mình cùng tìm nhé! 📚";
      return { reply, extractedInterests: [], suggestedBooks: [], isFallback: true };
    }

    // 3. Sách bán chạy nhất
    if (q.includes("bán chạy") || q.includes("hot") || q.includes("top") || q.includes("mua nhiều")) {
      const bestsellers = [...allBooks]
        .sort((a, b) => b.soldCount - a.soldCount)
        .slice(0, 4);

      if (bestsellers.length > 0) {
        reply =
          "🔥 **Top những tựa sách bán chạy nhất tại HUKI hiện nay nè bạn:**\n\n" +
          bestsellers
            .map(
              (b, idx) =>
                `${idx + 1}. 📖 **[${b.title}](/book/${b.id})**\n   • Tác giả: ${b.author}\n   • Giá: ${b.price.toLocaleString("vi-VN")}đ • *Đã bán: ${b.soldCount} lượt*\n   • ${b.description.slice(0, 110)}...`
            )
            .join("\n\n") +
          "\n\n👉 Bạn bấm trực tiếp vào tên sách bên trên hoặc thẻ sách bên dưới để xem chi tiết và đặt sách nhé! 🦊✨";

        suggestedBooks = bestsellers.map((b) => ({
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
        extractedInterests = ["sách bán chạy"];
        return { reply, extractedInterests, suggestedBooks, isFallback: true };
      }
    }

    // 4. Tìm kiếm theo chủ đề, từ khóa, thể loại hoặc tác giả
    const matched = this.searchRelevantBooks(query, allBooks).slice(0, 4);

    if (matched.length > 0) {
      reply =
        `📚 **Dạ Bé Cáo đã tìm thấy các tựa sách cực kỳ phù hợp trên kệ HUKI cho bạn nè:**\n\n` +
        matched
          .map(
            (b, idx) =>
              `${idx + 1}. 📖 **[${b.title}](/book/${b.id})**\n   • Tác giả: ${b.author} | Thể loại: ${b.category}\n   • Giá ưu đãi: ${b.price.toLocaleString("vi-VN")}đ (${b.format})\n   • *${b.description ? b.description.slice(0, 120) + "..." : "Sách chính hãng phân phối tại HUKI"}*`
          )
          .join("\n\n") +
        "\n\n✨ Toàn bộ đều là sách thật có bản quyền. Bạn bấm trực tiếp vào tên cuốn sách là mở trang đọc thử và xem chi tiết liền nha! 🦊";

      suggestedBooks = matched.map((b) => ({
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

      extractedInterests = Array.from(new Set(matched.map((b) => b.category.toLowerCase()))).slice(0, 3);
      return { reply, extractedInterests, suggestedBooks, isFallback: true };
    }

    // 5. Câu hỏi về Dịch vụ (Ebook DRM, Đổi trả, Vận chuyển)
    if (q.includes("drm") || q.includes("ebook") || q.includes("đọc như thế nào")) {
      reply =
        "📱 **Về Ebook DRM bản quyền tại HUKI:**\n" +
        "- Khi mua Ebook, sách sẽ được đưa vào **Tủ Sách Cá Nhân** của bạn ngay lập tức.\n" +
        "- Bạn đọc trực tiếp trên **Web Reader** tích hợp công nghệ chống sao chép và bảo vệ bản quyền.\n" +
        "- Nếu bạn chọn gói **Hybrid (Combo)**, bạn vừa có sách in giao tận tay vừa được mở khóa Ebook đọc liền luôn nè! ✨";
      return { reply, extractedInterests: ["ebook drm"], suggestedBooks: [], isFallback: true };
    }

    if (q.includes("giao hàng") || q.includes("ship") || q.includes("vận chuyển") || q.includes("phí")) {
      reply =
        "🚚 **Thời gian & Phí giao hàng tại HUKI:**\n" +
        "- Nội thành (TP.HCM, Hà Nội): Nhận sách trong 1 - 2 ngày làm việc.\n" +
        "- Các tỉnh thành khác: Khoảng 2 - 4 ngày.\n" +
        "- Đơn hàng từ 250.000đ được hỗ trợ phí ship qua các mã Freeship trong giỏ hàng nha bạn!";
      return { reply, extractedInterests: [], suggestedBooks: [], isFallback: true };
    }

    if (q.includes("đổi trả") || q.includes("hoàn tiền") || q.includes("bảo hành")) {
      reply =
        "🛡️ **Chính sách đổi trả tại HUKI rất an tâm bạn nha:**\n" +
        "- Sàn hỗ trợ đổi trả trong vòng **7 ngày** nếu sách in bị lỗi in ấn, rách trang hoặc hư hại do vận chuyển.\n" +
        "- Tiền thanh toán được giữ an toàn trong tài khoản ký quỹ PayOS cho đến khi bạn xác nhận hài lòng!";
      return { reply, extractedInterests: [], suggestedBooks: [], isFallback: true };
    }

    // 6. Mặc định gợi ý một vài cuốn sách hay từ kho
    const defaultSuggestions = allBooks.slice(0, 3);
    reply =
      "Dạ Bé Cáo lắng nghe bạn nè! 🦊 Bạn có thể chia sẻ thêm về tác giả hoặc chủ đề sách bạn muốn tìm không?\n\n" +
      "Hoặc bạn có thể tham khảo một số tựa sách nổi bật này nhé:\n" +
      defaultSuggestions
        .map((b) => `• 📖 **[${b.title}](/book/${b.id})** - ${b.author} (${b.price.toLocaleString("vi-VN")}đ)`)
        .join("\n") +
      "\n\nBấm vào tên sách để xem chi tiết ngay nha bạn! 📚✨";

    suggestedBooks = defaultSuggestions.map((b) => ({
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

    return { reply, extractedInterests: [], suggestedBooks, isFallback: true };
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
}
