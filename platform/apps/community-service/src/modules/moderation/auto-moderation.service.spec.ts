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
});
