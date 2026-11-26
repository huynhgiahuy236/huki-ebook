import { Injectable } from '@nestjs/common';

export interface AutoModerationResult {
  flagged: boolean;
  reasons: string[];
  matchedKeywords: string[];
  violationCategory?: 'LANGUAGE_VIOLATION' | 'SPAM';
}

// Short explicit Vietnamese slurs matched with Vietnamese diacritics on word boundaries
// to avoid false positives on everyday words ("nội dung" -> du, "các" -> cac, "lớn" -> lon, "đi" -> di).
const DIACRITIC_EXACT_WORDS = ['địt', 'đụ', 'đĩ', 'cặc', 'lồn', 'ngu quá'];

// Multi-char phrases (safe under unaccented normalization + punctuation-collapsed obfuscation checks)
const BLOCKED_PHRASES = [
  'đụ mẹ',
  'đụ má',
  'địt mẹ',
  'đm',
  'vcl',
  'chó đẻ',
  'khốn nạn',
  'súc vật',
  'ngu ngốc',
  'rác rưởi',
  'lừa đảo',
  'scam',
];

@Injectable()
export class AutoModerationService {
  inspect(
    ...parts: Array<string | string[] | undefined>
  ): AutoModerationResult {
    const original = parts
      .flatMap((part) => (Array.isArray(part) ? part : [part]))
      .filter((part): part is string => typeof part === 'string')
      .join(' ')
      .trim();
    const lowerOriginal = original.toLowerCase();
    const normalized = this.normalize(original);
    const collapsed = normalized.replace(/[^a-z0-9]/g, '');
    const reasons: string[] = [];

    const matchedExact = DIACRITIC_EXACT_WORDS.filter((word) => {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`, 'iu');
      return regex.test(lowerOriginal);
    });

    const matchedPhrases = BLOCKED_PHRASES.filter((phrase) => {
      const normPhrase = this.normalize(phrase);
      const collapsedPhrase = normPhrase.replace(/[^a-z0-9]/g, '');
      const escapedNorm = normPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wordRegex = new RegExp(`(?:^|[^a-z0-9])${escapedNorm}(?:[^a-z0-9]|$)`, 'i');
      if (wordRegex.test(normalized)) return true;
      // Only check collapsed form (e.g. "s_c_a_m", "l.u.a.d.a.o") when collapsed phrase >= 4 chars
      // AND each word in the phrase was individually spaced/punctuated rather than joining unrelated normal words.
      if (collapsedPhrase.length >= 4 && collapsed.includes(collapsedPhrase)) {
        const joinedWordsRegex = new RegExp(
          normPhrase
            .split(/\s+/)
            .map((w) => w.split('').join('[^a-z0-9]*'))
            .join('[^a-z0-9]*'),
          'i',
        );
        return joinedWordsRegex.test(normalized);
      }
      return false;
    });

    const matched = Array.from(new Set([...matchedExact, ...matchedPhrases]));
    if (matched.length) reasons.push('PROFANITY');
    if ((original.match(/https?:\/\//gi) ?? []).length >= 3) {
      reasons.push('EXCESSIVE_LINKS');
    }
    if (/(.)\1{9,}/iu.test(original)) reasons.push('REPEATED_CHARACTERS');
    const violationCategory = reasons.includes('PROFANITY')
      ? 'LANGUAGE_VIOLATION'
      : reasons.length > 0
        ? 'SPAM'
        : undefined;
    return {
      flagged: reasons.length > 0,
      reasons,
      matchedKeywords: matched,
      violationCategory,
    };
  }

  note(result: AutoModerationResult) {
    return result.flagged
      ? `Auto-moderation: ${result.reasons.join(', ')}`
      : undefined;
  }

  isCleanFeaturedContent(params: {
    title?: string;
    content?: string;
    status?: string;
    isReported?: boolean;
    moderationNote?: string;
    lastReportReason?: string;
  }): boolean {
    if (params.status && params.status !== 'PUBLISHED') return false;
    if (params.isReported || params.moderationNote || params.lastReportReason) {
      return false;
    }

    const combined = `${params.title || ''} ${params.content || ''}`.trim();
    const content = (params.content || params.title || '').trim();
    if (content.length < 5) return false;

    const inspected = this.inspect(params.title, params.content);
    if (inspected.flagged) return false;

    const normalized = this.normalize(combined);
    if (/^test(\s|\d|$)|\btest\s*\d{3,}/i.test(normalized)) {
      return false;
    }
    if (/(sadas|sdasda|asds|asdf|qwer|zxcv|fghj)/i.test(normalized)) {
      return false;
    }

    // Reject unbroken non-space tokens >= 14 chars (keyboard mash / spam tokens)
    const tokens = normalized.split(/\s+/).filter(Boolean);
    if (tokens.some((tok) => tok.replace(/[^a-z0-9]/g, '').length >= 14)) {
      return false;
    }

    return true;
  }

  private normalize(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .trim();
  }
}
