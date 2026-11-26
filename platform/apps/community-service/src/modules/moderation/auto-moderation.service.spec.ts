import { AutoModerationService } from './auto-moderation.service';

describe('AutoModerationService', () => {
  const service = new AutoModerationService();

  it('allows ordinary community content', () => {
    expect(service.inspect('Một bài viết chia sẻ về sách').flagged).toBe(false);
  });

  it('flags profanity after Vietnamese accent normalization', () => {
    expect(service.inspect('NỘI DUNG LỪA ĐẢO NGƯỜI ĐỌC')).toEqual(
      expect.objectContaining({ flagged: true, reasons: ['PROFANITY'] }),
    );
  });

  it('flags link spam and repeated characters', () => {
    const result = service.inspect(
      'aaaaaaaaaaa https://a.test https://b.test https://c.test',
    );
    expect(result.reasons).toEqual(
      expect.arrayContaining(['EXCESSIVE_LINKS', 'REPEATED_CHARACTERS']),
    );
  });

  it('flags profanity with punctuation or spaces separating letters', () => {
    expect(service.inspect('s_c_a_m và l.u.a.d.a.o')).toEqual(
      expect.objectContaining({ flagged: true, reasons: ['PROFANITY'] }),
    );
  });

  it('generates proper moderation note', () => {
    const result = service.inspect('scam https://1 https://2 https://3');
    expect(service.note(result)).toContain('Auto-moderation: PROFANITY, EXCESSIVE_LINKS');
  });

  it('returns matchedKeywords and LANGUAGE_VIOLATION category for offensive Vietnamese/English terms', () => {
    const result = service.inspect('Sách quá rác rưởi ngu ngốc lừa đảo');
    expect(result).toEqual(
      expect.objectContaining({
        flagged: true,
        violationCategory: 'LANGUAGE_VIOLATION',
      }),
    );
    expect(result.matchedKeywords).toEqual(
      expect.arrayContaining(['ngu ngốc', 'rác rưởi', 'lừa đảo']),
    );
  });

  it('rejects profanity, flagged status, and keyboard mash in isCleanFeaturedContent while allowing genuine Vietnamese reviews', () => {
    expect(
      service.isCleanFeaturedContent({
        title: 'Tuổi trẻ',
        content: 'đụ mẹ ngu quá',
        status: 'FLAGGED',
        isReported: true,
      }),
    ).toBe(false);

    expect(
      service.isCleanFeaturedContent({
        title: 'Test',
        content: 'ádasdsadsadas',
        status: 'PUBLISHED',
      }),
    ).toBe(false);

    expect(
      service.isCleanFeaturedContent({
        title: 'Bình luận',
        content: 'jyhfgvkhujmgbikyuhjgbkuijh,gbujik,hm',
        status: 'PUBLISHED',
      }),
    ).toBe(false);

    expect(
      service.isCleanFeaturedContent({
        title: 'Đáng đọc',
        content: 'hAY NHA NÍ',
        status: 'PUBLISHED',
      }),
    ).toBe(true);

    expect(
      service.isCleanFeaturedContent({
        title: 'Rất ý nghĩa',
        content: 'Sách in đẹp, nội dung thực tế và rất đáng để suy ngẫm.',
        status: 'PUBLISHED',
      }),
    ).toBe(true);

    // Ensure common Vietnamese words ("nội dung", "các", "lớn", "đi") do NOT false-positive
    expect(
      service.isCleanFeaturedContent({
        title: 'Khuyên đọc',
        content: 'Các bạn nên mua cuốn Nghĩ Lớn Để Thành Công đi nhé, nội dung rất hay!',
        status: 'PUBLISHED',
      }),
    ).toBe(true);
  });
});
