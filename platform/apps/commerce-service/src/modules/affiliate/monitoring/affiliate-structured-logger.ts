import { Logger } from '@nestjs/common';

export interface StructuredLogPayload {
  level: 'info' | 'warn' | 'error' | 'debug';
  action: string;
  traceId?: string;
  requestId?: string;
  durationMs?: number;
  userId?: string;
  storeId?: string;
  profileId?: string;
  metadata?: Record<string, any>;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
}

export class AffiliateStructuredLogger {
  private readonly nestLogger: Logger;

  constructor(context: string = 'AffiliateModule') {
    this.nestLogger = new Logger(context);
  }

  /**
   * Masks sensitive fields like CCCD, bank account, phone number, email, tokens
   */
  public static maskPii(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => AffiliateStructuredLogger.maskPii(item));
    }

    const masked: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      if (typeof value === 'string') {
        if (
          lowerKey.includes('idcard') ||
          lowerKey.includes('cccd') ||
          lowerKey.includes('cmnd')
        ) {
          // Keep first 3 and last 4
          masked[key] = value.length > 7
            ? `${value.slice(0, 3)}****${value.slice(-4)}`
            : '********';
        } else if (
          lowerKey.includes('accountnumber') ||
          lowerKey.includes('bankaccount')
        ) {
          // Keep first 4 and last 2
          masked[key] = value.length > 6
            ? `${value.slice(0, 4)}****${value.slice(-2)}`
            : '******';
        } else if (lowerKey.includes('phone') || lowerKey.includes('sdt')) {
          masked[key] = value.length > 6
            ? `${value.slice(0, 3)}****${value.slice(-3)}`
            : '******';
        } else if (lowerKey.includes('email')) {
          const parts = value.split('@');
          if (parts.length === 2) {
            const name = parts[0];
            masked[key] = `${name.slice(0, 1)}***@${parts[1]}`;
          } else {
            masked[key] = '***@***';
          }
        } else if (
          lowerKey.includes('token') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('password')
        ) {
          masked[key] = '[REDACTED]';
        } else {
          masked[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = AffiliateStructuredLogger.maskPii(value);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  /**
   * Log structured info
   */
  log(payload: Omit<StructuredLogPayload, 'level'>) {
    this.emit({ ...payload, level: 'info' });
  }

  /**
   * Log structured warning
   */
  warn(payload: Omit<StructuredLogPayload, 'level'>) {
    this.emit({ ...payload, level: 'warn' });
  }

  /**
   * Log structured error
   */
  error(payload: Omit<StructuredLogPayload, 'level'>) {
    this.emit({ ...payload, level: 'error' });
  }

  private emit(payload: StructuredLogPayload) {
    const formatted = {
      timestamp: new Date().toISOString(),
      service: 'commerce-service',
      subsystem: 'affiliate',
      level: payload.level,
      action: payload.action,
      traceId: payload.traceId || payload.requestId || 'no-trace-id',
      durationMs: payload.durationMs,
      userId: payload.userId,
      storeId: payload.storeId,
      profileId: payload.profileId,
      metadata: payload.metadata ? AffiliateStructuredLogger.maskPii(payload.metadata) : undefined,
      error: payload.error
        ? {
            name: payload.error.name,
            message: payload.error.message,
            stack: payload.level === 'error' ? payload.error.stack : undefined,
          }
        : undefined,
    };

    const jsonString = JSON.stringify(formatted);

    switch (payload.level) {
      case 'error':
        this.nestLogger.error(jsonString);
        break;
      case 'warn':
        this.nestLogger.warn(jsonString);
        break;
      case 'debug':
        this.nestLogger.debug(jsonString);
        break;
      default:
        this.nestLogger.log(jsonString);
        break;
    }

    return formatted;
  }
}
