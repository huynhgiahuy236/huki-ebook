import { describe, it, expect } from 'vitest';
import {
  isCleanReviewForDisplay,
  computeReviewEngagementScore,
  selectFeaturedReviews,
} from '../featuredReviews';

describe('featuredReviews curation, clean moderation, and 70% 5-star ranking', () => {
  it('filters out flagged, reported, profane, test, and gibberish reviews', () => {
    expect(
      isCleanReviewForDisplay({
        id: 'r-bad-1',
        rating: 5,
        content: 'đụ mẹ ngu quá',
        status: 'FLAGGED',
        isReported: true,
      }),
    ).toBe(false);

    expect(
      isCleanReviewForDisplay({
        id: 'r-bad-2',
        rating: 5,
        content: 'ádasdsadsadas',
        status: 'PUBLISHED',
      }),
    ).toBe(false);

    expect(
      isCleanReviewForDisplay({
        id: 'r-bad-3',
        rating: 5,
        content: 'jyhfgvkhujmgbikyuhjgbkuijh,gbujik,hm',
        status: 'PUBLISHED',
      }),
    ).toBe(false);

    expect(
      isCleanReviewForDisplay({
        id: 'r-bad-4',
        rating: 4,
        content: 'Sách ebook test 456456 hay 2',
        status: 'PUBLISHED',
      }),
    ).toBe(false);

    expect(
      isCleanReviewForDisplay({
        id: 'r-good-1',
        rating: 5,
        content: 'hAY NHA NÍ',
        status: 'PUBLISHED',
      }),
    ).toBe(true);

    expect(
      isCleanReviewForDisplay({
        id: 'r-good-vn',
        rating: 5,
        content: 'Các bạn nên đọc cuốn Nghĩ Lớn này đi, nội dung rất thực tế!',
        status: 'PUBLISHED',
      }),
    ).toBe(true);
  });

  it('ranks by likes + comments engagement and maintains >= 70% 5-star priority ratio', () => {
    const pool = [
      { id: '5-low', rating: 5, content: 'Sách rất hay và đáng đọc', helpfulCount: 1, replies: [], status: 'PUBLISHED' },
      { id: '5-high', rating: 5, content: 'Tuyệt vời, kiến thức thực tiễn', helpfulCount: 10, replies: [{ id: 'c1' }, { id: 'c2' }], status: 'PUBLISHED' },
      { id: '5-mid', rating: 5, content: 'Đóng gói đẹp, giao nhanh', helpfulCount: 4, replies: [{ id: 'c3' }], status: 'PUBLISHED' },
      { id: '5-mid2', rating: 5, content: 'Rất hữu ích cho công việc', helpfulCount: 3, replies: [], status: 'PUBLISHED' },
      { id: '5-mid3', rating: 5, content: 'Bản in sắc nét, nội dung sâu sắc', helpfulCount: 2, replies: [], status: 'PUBLISHED' },
      { id: '4-top', rating: 4, content: 'Khá ổn áp, nên đọc cuối tuần', helpfulCount: 9, replies: [{ id: 'c4' }], status: 'PUBLISHED' },
      { id: '4-low', rating: 4, content: 'Nội dung tạm ổn cho người mới', helpfulCount: 0, replies: [], status: 'PUBLISHED' },
      { id: '5-profane', rating: 5, content: 'đụ mẹ ngu quá', helpfulCount: 99, status: 'FLAGGED', isReported: true },
    ];

    const selected = selectFeaturedReviews(pool, 6);
    expect(selected.length).toBe(6);
    expect(selected.some((x) => x.id === '5-profane')).toBe(false);

    const fiveStarCount = selected.filter((x) => x.rating === 5).length;
    expect(fiveStarCount / selected.length).toBeGreaterThanOrEqual(0.7);
    expect(selected[0].id).toBe('5-high');
    expect(computeReviewEngagementScore(selected[0])).toBe(26);
    expect(selected.some((x) => x.id === '4-top')).toBe(true);
  });
});
