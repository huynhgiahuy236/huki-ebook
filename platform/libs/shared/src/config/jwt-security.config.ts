export const DEFAULT_DEV_JWT_SECRET = 'your-super-secret-jwt-key';

const INSECURE_SECRETS = new Set([
  'your-super-secret-jwt-key',
  'secret',
  'changeme',
  '123456',
  'jwt-secret',
]);

/**
 * Returns the JWT secret for the current environment.
 * In production (NODE_ENV === 'production'):
 * - Throws an error if JWT_SECRET is unset or empty.
 * - Throws an error if JWT_SECRET is a known weak/placeholder value or under 32 chars.
 * In development or testing:
 * - Falls back to DEFAULT_DEV_JWT_SECRET if not explicitly set.
 */
export function getJwtSecret(overrideSecret?: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const secret = overrideSecret !== undefined ? overrideSecret : process.env.JWT_SECRET;

  if (isProduction) {
    if (!secret || secret.trim() === '') {
      throw new Error('FATAL: JWT_SECRET environment variable is required in production');
    }
    if (INSECURE_SECRETS.has(secret.trim()) || secret.trim().length < 32) {
      throw new Error(
        'FATAL: Insecure or too short default JWT_SECRET cannot be used in production (minimum 32 characters required)',
      );
    }
    return secret;
  }

  return secret || DEFAULT_DEV_JWT_SECRET;
}

/**
 * Fail-fast security assertions during service bootstrap.
 */
export function assertProductionSecurity(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    getJwtSecret();
  }
}
