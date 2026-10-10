/**
 * Personalization & Recommendation Service
 * 
 * Quản lý ghi nhận hành vi tìm kiếm (Search Tracking), sở thích Onboarding,
 * tương tác trò chuyện với Bé Cáo AI (AI Chat Taste Memory),
 * và tính toán điểm gợi ý cá nhân hóa (Personalized Recommendations)
 * đảm bảo không render sản phẩm trùng lặp.
 */

import type { BookData } from '../api/catalogApi';

export interface OnboardingPreferences {
  favoriteGenres?: string[];
  primaryGoals?: string[];
  preferredFormats?: string[];
  preferredTheme?: string;
  readingHabits?: {
    dailyMinutes?: number;
    yearlyBooksTarget?: number;
    preferredTime?: string;
  };
  hasCompletedOnboarding?: boolean;
}

export interface PersonalizedBookItem extends BookData {
  relevanceScore?: number;
  recommendationReason?: string;
}

export interface AiChatInterestItem {
  tag: string;
  time: number;
}

const SEARCH_HISTORY_KEY = 'huki_search_history';
const ONBOARDING_PREFS_KEY = 'huki_onboarding_preferences';
const RECENT_INTERACTIONS_KEY = 'huki_recent_interactions';
const AI_CHAT_INTERESTS_KEY = 'huki_ai_chat_interests';

/**
 * Chuẩn hóa chuỗi tiếng Việt không dấu để so khớp linh hoạt
 */
export function normalizeVietnameseText(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const personalizationService = {
  /**
   * Lấy sở thích từ Onboarding (nếu user đã hoàn thành hoặc chọn lúc đăng ký)
   */
  getOnboardingPreferences(): OnboardingPreferences | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(ONBOARDING_PREFS_KEY);
      if (raw) return JSON.parse(raw);

      const authUserRaw = localStorage.getItem('huki_user');
      if (authUserRaw) {
        const u = JSON.parse(authUserRaw);
        const prefs = u?.profile?.preferredCategories || u?.profile?.favoriteGenres;
        if (Array.isArray(prefs) && prefs.length > 0) {
          return {
            favoriteGenres: prefs,
            preferredFormats: u?.profile?.preferredFormats || [],
            hasCompletedOnboarding: true,
          };
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Lấy danh sách sở thích được Bé Cáo AI trích xuất từ cuộc trò chuyện
   */
  getAiChatInterests(): AiChatInterestItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(AI_CHAT_INTERESTS_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  /**
   * Ghi nhận danh sách sở thích / thể loại do Bé Cáo AI phân tích
   */
  recordAiInterests(tags: string[]): void {
    if (typeof window === 'undefined' || !Array.isArray(tags) || tags.length === 0) return;

    try {
      const current = this.getAiChatInterests();
      const now = Date.now();
      const newItems: AiChatInterestItem[] = tags
        .map((t) => t.trim())
        .filter(Boolean)
        .map((tag) => ({ tag, time: now }));

      // Gộp và giữ lại tối đa 12 sở thích gần đây nhất (không trùng lặp tag)
      const existingTags = new Set(newItems.map((i) => i.tag.toLowerCase()));
      const filteredOld = current.filter((i) => !existingTags.has(i.tag.toLowerCase()));
      const updated = [...newItems, ...filteredOld].slice(0, 12);

      localStorage.setItem(AI_CHAT_INTERESTS_KEY, JSON.stringify(updated));

      // Đồng thời cập nhật vào lịch sử tìm kiếm để bổ trợ
      tags.forEach((t) => this.recordSearch(t));

      // Phát sự kiện toàn hệ thống để Section "Gợi ý cho bạn" cập nhật ngay lập tức
      window.dispatchEvent(
        new CustomEvent('huki:personalization_updated', {
          detail: { type: 'ai_chat', tags, timestamp: now },
        })
      );
    } catch {
      // ignore storage error
    }
  },

  /**
   * Lấy lịch sử tìm kiếm gần đây
   */
  getSearchHistory(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  /**
   * Ghi nhận từ khóa tìm kiếm mới của người dùng
   */
  recordSearch(query: string): void {
    if (typeof window === 'undefined') return;
    const clean = query.trim();
    if (!clean) return;

    try {
      const current = this.getSearchHistory();
      const updated = [clean, ...current.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 10);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));

      // Phát sự kiện đồng bộ toàn ứng dụng
      window.dispatchEvent(new CustomEvent('huki:search_updated', { detail: { query: clean, history: updated } }));
      window.dispatchEvent(new CustomEvent('huki:personalization_updated', { detail: { type: 'search', query: clean } }));
    } catch {
      // ignore storage error
    }
  },

  /**
   * Ghi nhận tương tác xem sách / chi tiết sản phẩm
   */
  recordBookInteraction(bookId: string, categoryId?: string, categoryName?: string, authorName?: string): void {
    if (typeof window === 'undefined' || !bookId) return;
    try {
      const raw = localStorage.getItem(RECENT_INTERACTIONS_KEY);
      const current: Array<{ bookId: string; categoryId?: string; categoryName?: string; authorName?: string; time: number }> =
        raw ? JSON.parse(raw) : [];

      const updated = [
        { bookId, categoryId, categoryName, authorName, time: Date.now() },
        ...current.filter((item) => item.bookId !== bookId),
      ].slice(0, 15);

      localStorage.setItem(RECENT_INTERACTIONS_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('huki:personalization_updated', { detail: { type: 'interaction', bookId } }));
    } catch {
      // ignore
    }
  },

  /**
   * Thuật toán tính điểm và chọn lọc sách cá nhân hóa dựa trên:
   * 1. Thị hiếu từ cuộc trò chuyện với Bé Cáo AI (AI Chat Taste Memory - Trọng số cao nhất)
   * 2. Lịch sử tìm kiếm gần đây (Search history & current search query)
   * 3. Sở thích Onboarding (Genres & formats đã chọn)
   * 4. Sách đã tương tác gần đây
   * 5. Tiêu chí ưu tiên Gian Hàng: Điểm đánh giá cao, Official store, có sẵn tồn kho
   * 6. BẢO ĐẢM KHÔNG RENDER SẢN PHẨM TRÙNG LẶP (Strict Deduplication & Diversity)
   */
  getPersonalizedRecommendations(
    allBooks: BookData[],
    options?: {
      limit?: number;
      excludeBookIds?: string[] | Set<string>;
      currentSearchQuery?: string;
    }
  ): PersonalizedBookItem[] {
    if (!allBooks || allBooks.length === 0) return [];

    const limit = options?.limit || 10;
    const excludeSet = new Set(
      options?.excludeBookIds instanceof Set
        ? options.excludeBookIds
        : (options?.excludeBookIds || [])
    );

    const aiInterests = this.getAiChatInterests();
    const onboarding = this.getOnboardingPreferences();
    const searchHistory = this.getSearchHistory();
    const currentSearch = options?.currentSearchQuery?.trim() || '';

    // Danh sách từ khóa tìm kiếm (ưu tiên từ khóa tìm kiếm hiện tại lên đầu)
    const activeSearchTerms = [
      ...(currentSearch ? [currentSearch] : []),
      ...searchHistory.filter((term) => term.toLowerCase() !== currentSearch.toLowerCase()),
    ].slice(0, 5);

    // Chuẩn hóa onboarding genres
    const onboardGenresNorm = (onboarding?.favoriteGenres || []).map((g) => normalizeVietnameseText(g));

    // Lấy tương tác gần đây
    let recentCategories: string[] = [];
    let recentAuthors: string[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(RECENT_INTERACTIONS_KEY);
        if (raw) {
          const list: any[] = JSON.parse(raw);
          recentCategories = list.map((i) => i.categoryName).filter(Boolean);
          recentAuthors = list.map((i) => i.authorName).filter(Boolean);
        }
      } catch {
        // ignore
      }
    }

    // Map chấm điểm từng sách
    const scoredBooks: Array<{ book: BookData; score: number; reason: string }> = [];

    for (const book of allBooks) {
      // Bỏ qua nếu sách bị loại trừ hoặc chưa xuất bản
      if (excludeSet.has(book.id) || (book.status && book.status !== 'PUBLISHED')) {
        continue;
      }

      let score = 10; // Điểm cơ bản
      let topReason = 'Gợi ý nổi bật';

      const normTitle = normalizeVietnameseText(book.title || '');
      const normAuthor = normalizeVietnameseText(book.author?.name || (book as any).authorName || '');
      const normCat = normalizeVietnameseText(book.category?.name || (book as any).categoryName || '');
      const normDesc = normalizeVietnameseText(book.description || '');

      // 1. So khớp với Thị Hiếu do Bé Cáo AI phân tích (TRỌNG SỐ CAO NHẤT: +120 ĐIỂM)
      if (aiInterests.length > 0) {
        for (let i = 0; i < aiInterests.length; i++) {
          const item = aiInterests[i];
          const normTag = normalizeVietnameseText(item.tag);
          if (!normTag || normTag.length < 2) continue;

          // Độ mới: 3 tag gần nhất nhận điểm cao nhất
          const recencyBonus = i < 3 ? 1.4 : 1.0;

          if (normTitle.includes(normTag) || normCat.includes(normTag) || normDesc.includes(normTag) || normAuthor.includes(normTag)) {
            score += 120 * recencyBonus;
            topReason = `🦊 Bé Cáo gợi ý: "${item.tag}"`;
            break;
          }
        }
      }

      // 2. So khớp với từ khóa tìm kiếm gần đây
      if (activeSearchTerms.length > 0) {
        for (let idx = 0; idx < activeSearchTerms.length; idx++) {
          const term = activeSearchTerms[idx];
          const normTerm = normalizeVietnameseText(term);
          if (!normTerm || normTerm.length < 1) continue;

          const recencyMultiplier = idx === 0 ? 1.5 : 1.0;

          if (normTitle.includes(normTerm)) {
            score += 100 * recencyMultiplier;
            if (!topReason.startsWith('🦊')) topReason = `Khớp tìm kiếm: "${term}"`;
            break;
          } else if (normAuthor.includes(normTerm)) {
            score += 80 * recencyMultiplier;
            if (!topReason.startsWith('🦊')) topReason = `Tác giả bạn tìm: ${book.author?.name || term}`;
            break;
          } else if (normCat.includes(normTerm)) {
            score += 70 * recencyMultiplier;
            if (!topReason.startsWith('🦊')) topReason = `Chủ đề liên quan: ${book.category?.name || term}`;
            break;
          } else if (normDesc.includes(normTerm)) {
            score += 35 * recencyMultiplier;
            if (!topReason.startsWith('🦊')) topReason = `Nội dung liên quan: "${term}"`;
            break;
          }
        }
      }

      // 3. So khớp với sở thích Onboarding
      if (onboardGenresNorm.length > 0) {
        const matchesOnboardGenre = onboardGenresNorm.some(
          (genre) =>
            normCat.includes(genre) ||
            genre.includes(normCat) ||
            normTitle.includes(genre) ||
            (book.category?.slug && genre.includes(book.category.slug))
        );

        if (matchesOnboardGenre) {
          score += 60;
          if (topReason === 'Gợi ý nổi bật') {
            topReason = `Theo gu đọc: ${book.category?.name || 'Sở thích của bạn'}`;
          }
        }
      }

      // 4. Tương tác xem sách / bấm vô detail gần đây (Shopee-style real-time boost)
      if (recentCategories.length > 0) {
        for (let i = 0; i < recentCategories.length; i++) {
          const c = recentCategories[i];
          const normC = normalizeVietnameseText(c);
          if (normC && (normCat.includes(normC) || normC.includes(normCat) || normTitle.includes(normC))) {
            const recencyMultiplier = i < 2 ? 1.5 : 1.0;
            score += 110 * recencyMultiplier;
            if (topReason === 'Gợi ý nổi bật') {
              topReason = `Theo sách bạn vừa xem: ${c}`;
            }
            break;
          }
        }
      }
      if (recentAuthors.length > 0) {
        for (let i = 0; i < recentAuthors.length; i++) {
          const a = recentAuthors[i];
          const normA = normalizeVietnameseText(a);
          if (normA && normAuthor.includes(normA)) {
            const recencyMultiplier = i < 2 ? 1.4 : 1.0;
            score += 90 * recencyMultiplier;
            if (topReason === 'Gợi ý nổi bật') {
              topReason = `Cùng tác giả bạn vừa xem: ${a}`;
            }
            break;
          }
        }
      }

      // 5. Tiêu chí chất lượng sách & Gian hàng uy tín (Fair Store Prioritization)
      const bookAny = book as any;
      if (bookAny.rating && bookAny.rating >= 4.5) {
        score += 15; // Đánh giá cao
      }
      if (bookAny.isOfficialStore || bookAny.store?.isVerified || bookAny.businessId) {
        score += 20; // Gian hàng đối tác / đã xác thực
      }
      if (bookAny.hasEbook || bookAny.format === 'HYBRID' || bookAny.format === 'EBOOK') {
        score += 10; // Có hỗ trợ đọc Ebook DRM bản quyền
      }

      scoredBooks.push({
        book,
        score,
        reason: topReason,
      });
    }

    // Sắp xếp theo điểm số giảm dần
    scoredBooks.sort((a, b) => b.score - a.score);

    // 6. BẢO ĐẢM KHÔNG RENDER SẢN PHẨM TRÙNG LẶP & ĐA DẠNG HÓA
    const finalResults: PersonalizedBookItem[] = [];
    const seenIds = new Set<string>();
    const seenTitles = new Set<string>();

    for (const item of scoredBooks) {
      if (finalResults.length >= limit) break;

      const b = item.book;
      const cleanTitleKey = normalizeVietnameseText(b.title).slice(0, 25);

      if (seenIds.has(b.id) || seenTitles.has(cleanTitleKey)) {
        continue;
      }

      seenIds.add(b.id);
      seenTitles.add(cleanTitleKey);

      finalResults.push({
        ...b,
        relevanceScore: item.score,
        recommendationReason: item.reason,
      });
    }

    return finalResults;
  },
};
