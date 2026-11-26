import type { ReviewItemData } from '@/ui/api/reviewApi';

export interface FeaturedReviewCandidate extends Omit<Partial<ReviewItemData>, 'author' | 'status'> {
  id: string;
  rating: number;
  title?: string;
  content?: string;
  author?: { id?: string; fullName?: string; name?: string; avatar?: string };
  authorAvatar?: string;
  helpfulCount?: number;
  likesCount?: number;
  commentsCount?: number;
  replies?: Array<any>;
  verifiedPurchase?: boolean;
  status?: string;
  isReported?: boolean;
  moderationNote?: string;
  reportReason?: string;
  lastReportReason?: string;
  bookId?: string;
  bookSlug?: string;
  bookTitle?: string;
  bookCover?: string;
  createdAt?: string;
}

const DIACRITIC_EXACT_PROFANITY = ['địt', 'đụ', 'đĩ', 'cặc', 'lồn', 'ngu quá'];

const NORMALIZED_BLOCKED_PHRASES = [
  'du me',
  'du ma',
  'dit me',
  'cho de',
  'khon nan',
  'suc vat',
  'ngu ngoc',
  'ngu qua',
  'rac ruoi',
  'lua dao',
  'scam',
];

function normalizeText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
}

function hasProfanity(title?: string, content?: string): boolean {
  const original = `${title || ''} ${content || ''}`.toLowerCase().trim();
  if (!original) return false;
  for (const word of DIACRITIC_EXACT_PROFANITY) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`, 'iu').test(original)) {
      return true;
    }
  }
  const normalized = normalizeText(original);
  return NORMALIZED_BLOCKED_PHRASES.some((phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, 'i').test(normalized);
  });
}

function isValidFeaturedBookTitle(title?: string): boolean {
  if (!title) return true;
  const t = normalizeText(title);
  if (t.startsWith('http://') || t.startsWith('https://')) return false;
  if (/^test(\s|\d|$)|\btest\s*\d{3,}/i.test(t)) return false;
  if (/(sadas|sdasda|asdasd)/i.test(t)) return false;
  return true;
}

/**
 * Kiểm tra đánh giá đủ sạch & chất lượng để đưa lên Trang chủ (không vi phạm, không FLAGGED, không rác/spam)
 */
export function isCleanReviewForDisplay(review: FeaturedReviewCandidate): boolean {
  if (!review) return false;
  if (review.status && review.status !== 'PUBLISHED') return false;
  if (review.isReported || review.moderationNote || review.reportReason || review.lastReportReason) {
    return false;
  }
  if (!isValidFeaturedBookTitle(review.bookTitle)) return false;

  const content = String(review.content || review.title || '').trim();
  if (content.length < 5) return false;

  const normalized = normalizeText(`${review.title || ''} ${review.content || ''}`);
  if (!normalized) return false;

  if (hasProfanity(review.title, review.content)) {
    return false;
  }
  if (/^test(\s|\d|$)|\btest\s*\d{3,}/i.test(normalized)) {
    return false;
  }
  if (/(sadas|sdasda|asds|asdf|qwer|zxcv|fghj)/i.test(normalized)) {
    return false;
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.some((tok) => tok.replace(/[^a-z0-9]/g, '').length >= 14)) {
    return false;
  }

  return true;
}

export function getReviewLikesCount(review: FeaturedReviewCandidate): number {
  return Math.max(0, Number(review.likesCount ?? review.helpfulCount ?? 0));
}

export function getReviewCommentsCount(review: FeaturedReviewCandidate): number {
  if (typeof review.commentsCount === 'number' && !Number.isNaN(review.commentsCount)) {
    return Math.max(0, review.commentsCount);
  }
  return Array.isArray(review.replies) ? review.replies.length : 0;
}

/**
 * Điểm xếp hạng tương tác theo lượt thích + bình luận/phản hồi
 */
export function computeReviewEngagementScore(review: FeaturedReviewCandidate): number {
  const likes = getReviewLikesCount(review);
  const comments = getReviewCommentsCount(review);
  return likes * 2 + comments * 3;
}

function compareByEngagement<T extends FeaturedReviewCandidate>(a: T, b: T): number {
  const scoreDiff = computeReviewEngagementScore(b) - computeReviewEngagementScore(a);
  if (scoreDiff !== 0) return scoreDiff;

  const totalInteractionsDiff =
    getReviewLikesCount(b) + getReviewCommentsCount(b) - (getReviewLikesCount(a) + getReviewCommentsCount(a));
  if (totalInteractionsDiff !== 0) return totalInteractionsDiff;

  const avatarDiff =
    Number(Boolean(b.author?.avatar || b.authorAvatar)) - Number(Boolean(a.author?.avatar || a.authorAvatar));
  if (avatarDiff !== 0) return avatarDiff;

  const verifiedDiff = Number(Boolean(b.verifiedPurchase)) - Number(Boolean(a.verifiedPurchase));
  if (verifiedDiff !== 0) return verifiedDiff;

  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return timeB - timeA;
}

/**
 * Chọn danh sách đánh giá hiển thị trên Trang chủ:
 * - Lọc sạch 100% review vi phạm / FLAGGED / spam
 * - Xếp hạng theo lượt thích + bình luận
 * - Ưu tiên tối thiểu 70% đánh giá 5 sao (Math.ceil(totalSlots * 0.7))
 */
export function selectFeaturedReviews<T extends FeaturedReviewCandidate>(
  candidates: T[],
  limit = 6,
): Array<T & { likesCount: number; commentsCount: number; engagementScore: number }> {
  const seen = new Set<string>();
  const clean = (candidates || []).filter((item) => {
    const key = String(item?.id || '');
    if (!key || seen.has(key)) return false;
    if (!isCleanReviewForDisplay(item)) return false;
    if (Number(item.rating || 0) < 4) return false;
    seen.add(key);
    return true;
  });

  if (clean.length === 0) return [];

  const targetCount = Math.min(Math.max(1, limit), clean.length);
  const fiveStars = clean.filter((r) => Math.round(Number(r.rating || 0)) >= 5).sort(compareByEngagement);
  const fourStars = clean.filter((r) => Math.round(Number(r.rating || 0)) === 4).sort(compareByEngagement);

  const fiveStarTarget = Math.min(fiveStars.length, Math.ceil(targetCount * 0.7));
  const picked: T[] = fiveStars.slice(0, fiveStarTarget);
  const remainingSlots = targetCount - picked.length;

  if (remainingSlots > 0) {
    picked.push(...fourStars.slice(0, remainingSlots));
  }

  // Backfill from leftover 5-star pool if 4-star pool couldn't fill the remaining 30%
  if (picked.length < targetCount && fiveStars.length > fiveStarTarget) {
    const stillNeeded = targetCount - picked.length;
    picked.push(...fiveStars.slice(fiveStarTarget, fiveStarTarget + stillNeeded));
  }

  return picked
    .sort((a, b) => {
      const scoreDiff = computeReviewEngagementScore(b) - computeReviewEngagementScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      const starDiff = Number(b.rating || 0) - Number(a.rating || 0);
      if (starDiff !== 0) return starDiff;
      return compareByEngagement(a, b);
    })
    .map((item) => ({
      ...item,
      likesCount: getReviewLikesCount(item),
      commentsCount: getReviewCommentsCount(item),
      engagementScore: computeReviewEngagementScore(item),
    }));
}
