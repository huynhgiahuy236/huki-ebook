import { Injectable } from '@nestjs/common';

export interface AutoModerationResult {
  flagged: boolean;
  reasons: string[];
}

const BLOCKED_PHRASES = ['địt', 'đụ', 'đĩ', 'cặc', 'lồn', 'lừa đảo', 'scam'];

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
    const normalized = this.normalize(original);
    const collapsed = normalized.replace(/[^a-z0-9]/g, '');
    const reasons: string[] = [];
    const matched = BLOCKED_PHRASES.filter((phrase) => {
      const normPhrase = this.normalize(phrase);
      const collapsedPhrase = normPhrase.replace(/[^a-z0-9]/g, '');
      return (
        normalized.includes(normPhrase) ||
        (collapsedPhrase.length >= 3 && collapsed.includes(collapsedPhrase))
      );
    });
    if (matched.length) reasons.push('PROFANITY');
    if ((original.match(/https?:\/\//gi) ?? []).length >= 3) {
      reasons.push('EXCESSIVE_LINKS');
    }
    if (/(.)\1{9,}/iu.test(original)) reasons.push('REPEATED_CHARACTERS');
    return { flagged: reasons.length > 0, reasons };
  }

  note(result: AutoModerationResult) {
    return result.flagged
      ? `Auto-moderation: ${result.reasons.join(', ')}`
      : undefined;
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
