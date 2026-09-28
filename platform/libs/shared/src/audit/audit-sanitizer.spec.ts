import { AuditSanitizer } from './audit-sanitizer';

describe('AuditSanitizer', () => {
  it('should redact sensitive password and token fields', () => {
    const input = {
      id: 'usr-123',
      email: 'admin@huki.vn',
      password: 'PlainSecretPassword123!',
      passwordHash: '$2b$12$eX4mPL3H4sH...',
      refreshToken: 'sample_refresh_token_value',
      tokenHash: 'sha256_hash_value',
      pin: '123456',
      pinHash: 'hashed_pin_value',
      nested: {
        accessToken: 'bearer_token_abc',
        apiKey: 'secret-api-key',
        secret: 'top_secret',
      },
    };

    const sanitized = AuditSanitizer.sanitize(input);

    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.passwordHash).toBe('[REDACTED]');
    expect(sanitized.refreshToken).toBe('[REDACTED]');
    expect(sanitized.tokenHash).toBe('[REDACTED]');
    expect(sanitized.pin).toBe('[REDACTED]');
    expect(sanitized.pinHash).toBe('[REDACTED]');
    expect(sanitized.nested.accessToken).toBe('[REDACTED]');
    expect(sanitized.nested.apiKey).toBe('[REDACTED]');
    expect(sanitized.nested.secret).toBe('[REDACTED]');
    expect(sanitized.id).toBe('usr-123');
    expect(sanitized.email).toBe('admin@huki.vn');
  });

  it('should mask bank account numbers', () => {
    const input = {
      bankName: 'Vietcombank',
      bankAccountNumber: '001100489281',
      accountNumber: '98765432101234',
    };

    const sanitized = AuditSanitizer.sanitize(input);

    expect(sanitized.bankName).toBe('Vietcombank');
    expect(sanitized.bankAccountNumber).toBe('0011****9281');
    expect(sanitized.accountNumber).toBe('9876******1234');
  });

  it('should handle arrays and null values safely', () => {
    const input = {
      nullVal: null,
      undefinedVal: undefined,
      numVal: 42,
      boolVal: true,
      items: [
        { name: 'item1', password: 'secret1' },
        { name: 'item2', apiKey: 'key2' },
      ],
    };

    const sanitized = AuditSanitizer.sanitize(input);

    expect(sanitized.nullVal).toBeNull();
    expect(sanitized.numVal).toBe(42);
    expect(sanitized.boolVal).toBe(true);
    expect(sanitized.items[0].password).toBe('[REDACTED]');
    expect(sanitized.items[1].apiKey).toBe('[REDACTED]');
  });
});
