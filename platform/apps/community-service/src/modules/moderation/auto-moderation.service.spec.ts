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
});
