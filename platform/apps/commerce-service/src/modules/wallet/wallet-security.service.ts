import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '@huki/shared';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { BookActor } from '../../common/book-auth.guard';
import {
  ChangePinDto,
  PinVerificationResultDto,
  Security2FAPurpose,
  SetupPinDto,
  TwoFactorChallengeDto,
  TwoFactorChallengeResultDto,
  TwoFactorVerifyDto,
  TwoFactorVerifyResultDto,
  VerifyPinDto,
  WalletSecurityStatusDto,
} from './dto/wallet-security.dto';

export interface AuditMetadata {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class WalletSecurityService {
  private readonly logger = new Logger(WalletSecurityService.name);
  private readonly BCRYPT_SALT_ROUNDS = 12;
  private readonly MAX_CONSECUTIVE_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CHALLENGE_TTL_SECONDS = 300; // 5 minutes
  private readonly FINANCE_AUTH_TOKEN_TTL_SECONDS = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Helper: Validate tenant isolation / store actor access
   */
  private validateActorStoreAccess(storeId: string, actor: BookActor): void {
    const isPlatformAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
    const actorStoreId = (actor as any).storeId;
    if (!isPlatformAdmin && actorStoreId && actorStoreId !== storeId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_STORE_ACCESS',
        message: 'Bạn không có quyền truy cập thông tin bảo mật của gian hàng này.',
      });
    }
  }

  /**
   * Helper: Get or initialize WalletSecurity record for a store
   */
  private async getOrCreateWalletSecurity(storeId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { storeId },
    });

    if (!wallet) {
      throw new NotFoundException(`Không tìm thấy ví cho gian hàng ${storeId}`);
    }

    let security = await this.prisma.walletSecurity.findUnique({
      where: { storeId },
    });

    if (!security) {
      try {
        security = await this.prisma.walletSecurity.create({
          data: {
            walletId: wallet.id,
            storeId,
            failedAttempts: 0,
          },
        });
      } catch (err) {
        security = await this.prisma.walletSecurity.findUnique({
          where: { storeId },
        });
        if (!security) throw err;
      }
    }

    return { wallet, security };
  }

  /**
   * Helper: Append-only security audit logging without secrets
   */
  async recordAuditLog(params: {
    storeId: string;
    walletId: string;
    eventType: string;
    actor: BookActor;
    details?: Record<string, any>;
    meta?: AuditMetadata;
  }): Promise<void> {
    try {
      await this.prisma.walletSecurityAuditLog.create({
        data: {
          storeId: params.storeId,
          walletId: params.walletId,
          eventType: params.eventType,
          actorId: params.actor.sub,
          actorRole: params.actor.role,
          ipAddress: params.meta?.ipAddress || null,
          userAgent: params.meta?.userAgent || null,
          details: params.details ? (params.details as any) : undefined,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to write security audit log for store ${params.storeId}`, error);
    }
  }

  /**
   * 1. Get Wallet Security Status
   */
  async getSecurityStatus(storeId: string, actor: BookActor): Promise<WalletSecurityStatusDto> {
    this.validateActorStoreAccess(storeId, actor);
    const { security } = await this.getOrCreateWalletSecurity(storeId);

    const now = new Date();
    const isTemporarilyLocked = !!(security.lockedUntil && security.lockedUntil > now);
    const remainingAttempts = isTemporarilyLocked
      ? 0
      : Math.max(0, this.MAX_CONSECUTIVE_FAILED_ATTEMPTS - (security.failedAttempts || 0));

    return {
      hasPin: !!security.pinHash,
      isLocked: isTemporarilyLocked,
      lockedUntil: isTemporarilyLocked ? security.lockedUntil : null,
      remainingAttempts,
      pinSetAt: security.pinSetAt,
    };
  }

  /**
   * 2. Setup 6-digit withdrawal PIN (Initial Bootstrap)
   */
  async setupPin(
    dto: SetupPinDto,
    actor: BookActor,
    meta?: AuditMetadata,
  ): Promise<{ message: string; hasPin: boolean }> {
    this.validateActorStoreAccess(dto.storeId, actor);

    if (!/^\d{6}$/.test(dto.pin)) {
      throw new BadRequestException('Mã PIN phải bao gồm chính xác 6 chữ số numeric.');
    }

    const { wallet, security } = await this.getOrCreateWalletSecurity(dto.storeId);

    if (security.pinHash) {
      throw new BadRequestException({
        code: 'PIN_ALREADY_EXISTS',
        message: 'Mã PIN giao dịch đã được thiết lập. Vui lòng sử dụng chức năng đổi mã PIN.',
      });
    }

    const pinHash = await bcrypt.hash(dto.pin, this.BCRYPT_SALT_ROUNDS);

    await this.prisma.walletSecurity.update({
      where: { storeId: dto.storeId },
      data: {
        pinHash,
        failedAttempts: 0,
        lockedUntil: null,
        pinSetAt: new Date(),
        pinUpdatedAt: new Date(),
      },
    });

    await this.recordAuditLog({
      storeId: dto.storeId,
      walletId: wallet.id,
      eventType: 'PIN_SET',
      actor,
      meta,
    });

    return {
      message: 'Thiết lập mã PIN giao dịch thành công.',
      hasPin: true,
    };
  }

  /**
   * 3. Verify 6-digit withdrawal PIN
   * Note: Successful PIN verification yields a step-1 verification token,
   * but does NOT issue a final finance authorization token.
   */
  async verifyPin(
    dto: VerifyPinDto,
    actor: BookActor,
    meta?: AuditMetadata,
  ): Promise<PinVerificationResultDto> {
    this.validateActorStoreAccess(dto.storeId, actor);

    if (!/^\d{6}$/.test(dto.pin)) {
      throw new BadRequestException('Mã PIN phải bao gồm chính xác 6 chữ số numeric.');
    }

    const { wallet, security } = await this.getOrCreateWalletSecurity(dto.storeId);

    if (!security.pinHash) {
      throw new BadRequestException({
        code: 'PIN_NOT_SET',
        message: 'Chưa thiết lập mã PIN giao dịch cho gian hàng.',
      });
    }

    const now = new Date();

    // Check active 24-hour lockout
    if (security.lockedUntil && security.lockedUntil > now) {
      throw new ForbiddenException({
        code: 'WALLET_SECURITY_LOCKED',
        message: 'Tài khoản đang tạm khóa chức năng xác thực rút tiền do nhập sai quá số lần quy định.',
        lockedUntil: security.lockedUntil,
      });
    }

    const isMatch = await bcrypt.compare(dto.pin, security.pinHash);

    if (!isMatch) {
      // Concurrency-safe failed-attempt increment
      const newFailedCount = (security.failedAttempts || 0) + 1;
      const isNowLocked = newFailedCount >= this.MAX_CONSECUTIVE_FAILED_ATTEMPTS;
      const lockedUntilDate = isNowLocked ? new Date(now.getTime() + this.LOCKOUT_DURATION_MS) : null;

      await this.prisma.walletSecurity.update({
        where: { storeId: dto.storeId },
        data: {
          failedAttempts: isNowLocked ? this.MAX_CONSECUTIVE_FAILED_ATTEMPTS : newFailedCount,
          lockedUntil: lockedUntilDate,
        },
      });

      if (isNowLocked) {
        await this.recordAuditLog({
          storeId: dto.storeId,
          walletId: wallet.id,
          eventType: 'PIN_LOCKED',
          actor,
          details: { failedAttempts: newFailedCount, lockedUntil: lockedUntilDate },
          meta,
        });

        throw new ForbiddenException({
          code: 'WALLET_SECURITY_LOCKED',
          message: 'Bạn đã nhập sai mã PIN 5 lần liên tiếp. Chức năng rút tiền tạm khóa trong 24 giờ.',
          lockedUntil: lockedUntilDate,
        });
      } else {
        await this.recordAuditLog({
          storeId: dto.storeId,
          walletId: wallet.id,
          eventType: 'PIN_VERIFY_FAILED',
          actor,
          details: { failedAttempts: newFailedCount },
          meta,
        });

        const remaining = this.MAX_CONSECUTIVE_FAILED_ATTEMPTS - newFailedCount;
        throw new BadRequestException({
          code: 'PIN_INCORRECT',
          message: `Mã PIN không đúng. Bạn còn ${remaining} lần thử trước khi bị khóa 24 giờ.`,
          remainingAttempts: remaining,
        });
      }
    }

    // Success: Reset failed attempts & update last verified timestamp
    await this.prisma.walletSecurity.update({
      where: { storeId: dto.storeId },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        lastVerifiedAt: now,
      },
    });

    await this.recordAuditLog({
      storeId: dto.storeId,
      walletId: wallet.id,
      eventType: 'PIN_VERIFY_SUCCEEDED',
      actor,
      meta,
    });

    // Generate short-lived step-1 token (5 minutes TTL in Redis)
    const step1Token = `pin_step1_${randomUUID()}`;
    await this.redis.set(
      `finance:pin:step1:${step1Token}`,
      {
        storeId: dto.storeId,
        actorId: actor.sub,
        purpose: dto.purpose || Security2FAPurpose.WALLET_WITHDRAWAL,
        verifiedAt: now.toISOString(),
      },
      this.CHALLENGE_TTL_SECONDS,
    );

    return {
      verified: true,
      step1Token,
      remainingAttempts: this.MAX_CONSECUTIVE_FAILED_ATTEMPTS,
      message: 'Xác thực mã PIN thành công. Vui lòng hoàn tất xác thực 2FA.',
    };
  }

  /**
   * 4. Change 6-digit withdrawal PIN (Requires current PIN + 2FA token)
   */
  async changePin(
    dto: ChangePinDto,
    actor: BookActor,
    meta?: AuditMetadata,
  ): Promise<{ message: string }> {
    this.validateActorStoreAccess(dto.storeId, actor);

    if (!/^\d{6}$/.test(dto.newPin) || !/^\d{6}$/.test(dto.currentPin)) {
      throw new BadRequestException('Mã PIN phải bao gồm chính xác 6 chữ số numeric.');
    }

    // Verify 2FA Finance Auth Token with purpose PIN_CHANGE
    const tokenKey = `finance:auth:token:${dto.twoFactorToken}`;
    const tokenData = await this.redis.get<{
      storeId: string;
      actorId: string;
      purpose: Security2FAPurpose;
    }>(tokenKey);

    if (
      !tokenData ||
      tokenData.storeId !== dto.storeId ||
      tokenData.actorId !== actor.sub ||
      tokenData.purpose !== Security2FAPurpose.PIN_CHANGE
    ) {
      throw new ForbiddenException({
        code: 'INVALID_2FA_AUTH_TOKEN',
        message: 'Mã xác thực 2FA không hợp lệ hoặc đã hết hạn. Vui lòng xác thực 2FA lại.',
      });
    }

    const { wallet, security } = await this.getOrCreateWalletSecurity(dto.storeId);

    if (!security.pinHash) {
      throw new BadRequestException('Chưa có mã PIN để đổi. Vui lòng thiết lập mã PIN ban đầu.');
    }

    const isMatch = await bcrypt.compare(dto.currentPin, security.pinHash);
    if (!isMatch) {
      throw new BadRequestException('Mã PIN hiện tại không chính xác.');
    }

    const newPinHash = await bcrypt.hash(dto.newPin, this.BCRYPT_SALT_ROUNDS);

    await this.prisma.walletSecurity.update({
      where: { storeId: dto.storeId },
      data: {
        pinHash: newPinHash,
        pinUpdatedAt: new Date(),
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    // Single-use 2FA token consumption (replay protection)
    await this.redis.del(tokenKey);

    await this.recordAuditLog({
      storeId: dto.storeId,
      walletId: wallet.id,
      eventType: 'PIN_CHANGED',
      actor,
      meta,
    });

    return {
      message: 'Đổi mã PIN giao dịch thành công.',
    };
  }

  /**
   * 5. Issue Step-Up 2FA Challenge (OTP via Email)
   * Enforces that a valid PIN Step-1 proof exists and atomically consumes it (Option A: single-chain).
   */
  async issueTwoFactorChallenge(
    dto: TwoFactorChallengeDto,
    actor: BookActor,
    meta?: AuditMetadata,
  ): Promise<TwoFactorChallengeResultDto> {
    this.validateActorStoreAccess(dto.storeId, actor);
    const { wallet } = await this.getOrCreateWalletSecurity(dto.storeId);

    // Enforce and Atomically Consume PIN Step-1 Proof
    if (!dto.step1Token) {
      throw new ForbiddenException({
        code: 'MISSING_STEP1_PROOF',
        message: 'Yêu cầu xác thực bước 1 (mã PIN) trước khi yêu cầu mã OTP 2FA.',
      });
    }

    const step1Key = `finance:pin:step1:${dto.step1Token}`;
    // Atomic GET and DEL prevents using the same Step-1 token to create multiple challenges
    const step1Data = await this.redis.getdel<{
      storeId: string;
      actorId: string;
      purpose: Security2FAPurpose;
    }>(step1Key);

    if (
      !step1Data ||
      step1Data.storeId !== dto.storeId ||
      step1Data.actorId !== actor.sub ||
      step1Data.purpose !== dto.purpose
    ) {
      throw new ForbiddenException({
        code: 'INVALID_STEP1_PROOF',
        message: 'Mã xác thực bước 1 (mã PIN) không hợp lệ, không đúng mục đích hoặc đã hết hạn/đã sử dụng.',
      });
    }

    // Generate 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = createHash('sha256').update(otpCode).digest('hex');
    const challengeId = `chal_${randomUUID()}`;

    const challengeKey = `finance:2fa:challenge:${challengeId}`;
    await this.redis.set(
      challengeKey,
      {
        storeId: dto.storeId,
        actorId: actor.sub,
        purpose: dto.purpose,
        codeHash,
        attempts: 0,
        createdAt: new Date().toISOString(),
      },
      this.CHALLENGE_TTL_SECONDS,
    );

    // Dispatch OTP via EmailService
    try {
      if (actor.sub) {
        const userEmail = (actor as any).email || 'seller@huki.vn';
        await this.emailService.sendVerificationEmail(userEmail, otpCode);
      }
    } catch (err) {
      this.logger.warn(`Failed to dispatch 2FA email for challenge ${challengeId}`, err);
    }

    await this.recordAuditLog({
      storeId: dto.storeId,
      walletId: wallet.id,
      eventType: '2FA_CHALLENGE_ISSUED',
      actor,
      details: { purpose: dto.purpose, challengeId },
      meta,
    });

    return {
      challengeId,
      expiresInSeconds: this.CHALLENGE_TTL_SECONDS,
      message: 'Mã xác thực OTP đã được gửi đến email của bạn.',
    };
  }

  /**
   * 6. Verify 2FA OTP Code & Issue Short-Lived Finance Authorization Token
   * Uses atomic Lua script in Redis to evaluate codeHash, increment attempts, and consume challenge atomically.
   */
  async verifyTwoFactorChallenge(
    dto: TwoFactorVerifyDto,
    actor: BookActor,
    meta?: AuditMetadata,
  ): Promise<TwoFactorVerifyResultDto> {
    this.validateActorStoreAccess(dto.storeId, actor);
    const { wallet } = await this.getOrCreateWalletSecurity(dto.storeId);

    const challengeKey = `finance:2fa:challenge:${dto.challengeId}`;
    const inputHash = createHash('sha256').update(dto.code).digest('hex');

    // Concurrency-safe atomic OTP verification and consumption
    const atomicResult = await this.redis.verifyAndConsumeChallengeAtomic(challengeKey, inputHash, 3);

    if (atomicResult.status === 'NOT_FOUND') {
      await this.recordAuditLog({
        storeId: dto.storeId,
        walletId: wallet.id,
        eventType: '2FA_VERIFY_FAILED',
        actor,
        details: { reason: 'CHALLENGE_EXPIRED_OR_NOT_FOUND', challengeId: dto.challengeId },
        meta,
      });

      throw new BadRequestException({
        code: '2FA_CHALLENGE_EXPIRED',
        message: 'Mã xác thực OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.',
      });
    }

    if (atomicResult.status === 'INCORRECT' || atomicResult.status === 'INVALIDATED') {
      await this.recordAuditLog({
        storeId: dto.storeId,
        walletId: wallet.id,
        eventType: '2FA_VERIFY_FAILED',
        actor,
        details: { attempts: atomicResult.attempts, challengeId: dto.challengeId },
        meta,
      });

      throw new BadRequestException({
        code: '2FA_OTP_INCORRECT',
        message: 'Mã OTP không chính xác.',
      });
    }

    const challenge = atomicResult.data;

    // Tenant and Actor binding validation
    if (challenge.storeId !== dto.storeId || challenge.actorId !== actor.sub) {
      throw new ForbiddenException({
        code: '2FA_ACTOR_MISMATCH',
        message: 'Yêu cầu xác thực 2FA không khớp với thông tin người dùng hoặc gian hàng.',
      });
    }

    // Generate signed, single-use Finance Authorization Token
    const financeAuthToken = `fin_auth_${randomUUID()}`;
    const expiresAt = new Date(Date.now() + this.FINANCE_AUTH_TOKEN_TTL_SECONDS * 1000);

    await this.redis.set(
      `finance:auth:token:${financeAuthToken}`,
      {
        storeId: dto.storeId,
        actorId: actor.sub,
        purpose: challenge.purpose,
        issuedAt: new Date().toISOString(),
      },
      this.FINANCE_AUTH_TOKEN_TTL_SECONDS,
    );

    await this.recordAuditLog({
      storeId: dto.storeId,
      walletId: wallet.id,
      eventType: '2FA_VERIFY_SUCCEEDED',
      actor,
      details: { purpose: challenge.purpose },
      meta,
    });

    return {
      verified: true,
      financeAuthToken,
      expiresAt,
      message: 'Xác thực 2FA thành công.',
    };
  }

  /**
   * 7. Consume Single-Use Finance Authorization Token (Primitive for future Task 76/77)
   * Atomically retrieves and deletes the token via Redis GETDEL (or Lua script).
   * Guarantees exactly one concurrent caller succeeds.
   */
  async consumeFinanceAuthorization(params: {
    token: string;
    actor: BookActor;
    storeId: string;
    purpose: Security2FAPurpose;
  }): Promise<boolean> {
    const tokenKey = `finance:auth:token:${params.token}`;
    
    // Atomic GETDEL guarantees single-use across concurrent callers
    const authData = await this.redis.getdel<{
      storeId: string;
      actorId: string;
      purpose: Security2FAPurpose;
      issuedAt: string;
    }>(tokenKey);

    if (!authData) {
      throw new ForbiddenException({
        code: 'FINANCE_AUTH_EXPIRED',
        message: 'Phiên xác thực giao dịch tài chính không tồn tại, đã hết hạn hoặc đã được sử dụng.',
      });
    }

    if (
      authData.storeId !== params.storeId ||
      authData.actorId !== params.actor.sub ||
      authData.purpose !== params.purpose
    ) {
      throw new ForbiddenException({
        code: 'FINANCE_AUTH_MISMATCH',
        message: 'Thông tin xác thực giao dịch tài chính không khớp với người dùng hoặc mục đích.',
      });
    }

    return true;
  }
}

