/**
 * Audit Sanitizer Utility
 * Recursively masks or redacts credentials, security tokens, and PII before audit logging.
 */

const REDACTED_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'refreshtoken',
  'refresh_token',
  'refreshtokenhash',
  'refresh_token_hash',
  'accesstoken',
  'access_token',
  'tokenhash',
  'token_hash',
  'pin',
  'pinhash',
  'pin_hash',
  'secret',
  'apikey',
  'api_key',
  'otp',
  'authorization',
  'cookie',
  'sessionid',
  'session_id',
]);

const MASK_PATTERNS: Array<{ keyRegex: RegExp; maskFn: (val: string) => string }> = [
  {
    // Bank account numbers: mask middle digits (e.g. 001100489281 -> 0011****9281)
    keyRegex: /(bank_?account_?number|account_?number)/i,
    maskFn: (val: string) => {
      const clean = String(val).trim();
      if (clean.length <= 6) return '****';
      const start = clean.slice(0, 4);
      const end = clean.slice(-4);
      return `${start}${'*'.repeat(Math.max(clean.length - 8, 4))}${end}`;
    },
  },
];

export class AuditSanitizer {
  /**
   * Deeply sanitizes any object or array by redacting sensitive keys and masking specific PII.
   * Returns a clean clone without mutating the input.
   */
  static sanitize<T = any>(input: T): T {
    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input !== 'object') {
      return input;
    }

    if (input instanceof Date) {
      return new Date(input.getTime()) as unknown as T;
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitize(item)) as unknown as T;
    }

    const sanitizedObj: Record<string, any> = {};

    for (const [key, value] of Object.entries(input)) {
      const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');

      // Check for exact redacted keys or keys ending/starting with sensitive words
      if (
        REDACTED_KEYS.has(normalizedKey) ||
        normalizedKey.includes('secret') ||
        normalizedKey.includes('privatekey') ||
        normalizedKey.includes('apikey') ||
        normalizedKey.includes('authtoken') ||
        normalizedKey.endsWith('password') ||
        normalizedKey.endsWith('passwordhash') ||
        normalizedKey.endsWith('tokenhash') ||
        normalizedKey.endsWith('pinhash')
      ) {
        sanitizedObj[key] = '[REDACTED]';
        continue;
      }

      // Check for masking rules (e.g. bank accounts)
      const maskRule = MASK_PATTERNS.find((rule) => rule.keyRegex.test(key));
      if (maskRule && typeof value === 'string' && value.length > 0) {
        sanitizedObj[key] = maskRule.maskFn(value);
        continue;
      }

      // Recurse for nested objects/arrays
      if (typeof value === 'object' && value !== null) {
        sanitizedObj[key] = this.sanitize(value);
      } else {
        sanitizedObj[key] = value;
      }
    }

    return sanitizedObj as T;
  }
}
