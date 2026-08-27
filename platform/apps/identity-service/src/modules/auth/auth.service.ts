import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { User, UserRole, UserStatus } from '../../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/password.dto';
import { throwConflict, throwUnauthorized, throwBadRequest, throwNotFound } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';
import { USER_EVENTS } from '@huki/shared/events';

// ============================================
// USER DOMAIN EVENTS (Simple Abstraction)
// ============================================
interface UserRegisteredEvent {
  userId: string;
  email: string;
  timestamp: string;
}

interface UserLoggedInEvent {
  userId: string;
  timestamp: string;
}

interface UserEmailVerifiedEvent {
  userId: string;
  timestamp: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    // Check if email exists
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throwConflict(ErrorCode.AUTH_EMAIL_EXISTS);
    }

    // Generate email verification token
    const emailVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60_1000); // 24 hours

    // Create user with PENDING status (requires email verification)
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        fullName: dto.fullName,
        phone: dto.phone,
        role: UserRole.USER,
        status: UserStatus.PENDING, // Requires email verification
        emailVerificationToken,
        emailVerificationExpiresAt,
      },
    });

    // TODO: Send verification email
    // await this.emailService.sendVerificationEmail(user.email, emailVerificationToken);

    // Publish USER_REGISTERED event
    this.emitUserRegistered({
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    // Return user info (no tokens until email is verified)
    return {
      user: this.sanitizeUser(user),
      message: 'Registration successful. Please verify your email.',
      requiresVerification: true,
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throwBadRequest(ErrorCode.AUTH_RESET_TOKEN_INVALID, 'Invalid or expired verification token');
    }

    // Update user to ACTIVE
    const updatedUser = await this.prisma.user.update({
      where: { id: user!.id },
      data: {
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    // Publish USER_EMAIL_VERIFIED event
    this.emitUserEmailVerified({
      userId: updatedUser.id,
      timestamp: new Date().toISOString(),
    });

    return {
      message: 'Email verified successfully. You can now login.',
      user: this.sanitizeUser(updatedUser),
    };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If email exists, verification has been sent.' };
    }

    if (user.status === UserStatus.ACTIVE && user.emailVerifiedAt) {
      return { message: 'Email already verified.' };
    }

    // Generate new verification token
    const emailVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60_1000);

    await this.prisma.user.update({
      where: { id: user!.id },
      data: {
        emailVerificationToken,
        emailVerificationExpiresAt,
      },
    });

    // TODO: Send verification email
    // await this.emailService.sendVerificationEmail(user.email, emailVerificationToken);

    return { message: 'Verification email sent.' };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (!user) throwUnauthorized(ErrorCode.AUTH_LOGIN_INVALID_CREDENTIALS);

    // Check if account is locked
    if (user!.lockedUntil && user!.lockedUntil > new Date()) {
      throwUnauthorized(ErrorCode.AUTH_LOGIN_ACCOUNT_BLOCKED, 'Account is temporarily locked');
    }

    // Check user status - PENDING means not verified
    if (user!.status === UserStatus.PENDING) {
      throwUnauthorized(ErrorCode.AUTH_LOGIN_ACCOUNT_PENDING, 'Please verify your email first');
    }

    // Check if account is blocked
    if (user!.status === UserStatus.BLOCKED) {
      throwUnauthorized(ErrorCode.AUTH_LOGIN_ACCOUNT_BLOCKED);
    }

    // Verify password
    if (!(await bcrypt.compare(dto.password, user!.passwordHash))) {
      const failedLoginAttempts = user!.failedLoginAttempts + 1;
      await this.prisma.user.update({
        where: { id: user!.id },
        data: {
          failedLoginAttempts,
          lockedUntil: failedLoginAttempts >= 5
            ? new Date(Date.now() + 30 * 60_1000)
            : null,
        },
      });
      throwUnauthorized(ErrorCode.AUTH_LOGIN_INVALID_CREDENTIALS);
    }

    // Reset failed attempts on successful auth attempt
    const activeUser = await this.prisma.user.update({
      where: { id: user!.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    // Generate tokens
    const tokens = await this.generateTokens(activeUser, { userAgent, ipAddress });

    // Publish USER_LOGGED_IN event
    this.emitUserLoggedIn({
      userId: activeUser.id,
      timestamp: new Date().toISOString(),
    });

    return {
      user: this.sanitizeUser(activeUser),
      ...tokens,
    };
  }

  async logout(refreshToken: string) {
    if (!refreshToken) return;
    const token = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
    });
    if (token) {
      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: { revokedAt: new Date(), revokedReason: 'user_logout' },
      });
    }
  }

  async logoutAll(userId: string) {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async refreshToken(dto: RefreshTokenDto) {
    const token = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: this.hashToken(dto.refreshToken), revokedAt: null },
      include: { session: { include: { user: true } } },
    });
    if (!token || token.expiresAt < new Date() || token.session.revokedAt) {
      throwUnauthorized(ErrorCode.AUTH_TOKEN_EXPIRED);
    }
    const refreshToken = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
    await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: { id: token!.id, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'token_rotation' },
      });
      if (revoked.count !== 1) {
        throwUnauthorized(ErrorCode.AUTH_TOKEN_EXPIRED);
      }

      const replacement = await tx.refreshToken.create({
        data: {
          sessionId: token!.sessionId,
          tokenFamily: token!.tokenFamily,
          tokenHash: this.hashToken(refreshToken),
          expiresAt,
        },
      });
      await tx.refreshToken.update({
        where: { id: token!.id },
        data: { replacedByTokenId: replacement.id },
      });
    });
    return {
      accessToken: this.signAccessToken(token!.session.user),
      refreshToken,
      expiresIn: 900,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (user) {
      await this.prisma.user.update({
        where: { id: user!.id },
        data: {
          passwordResetToken: randomUUID(),
          passwordResetExpiresAt: new Date(Date.now() + 60 * 60_1000),
        },
      });
      // TODO: Send password reset email
      // await this.emailService.sendPasswordResetEmail(user.email, token);
    }
    return { message: 'If email exists, reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });
    if (!user) throwBadRequest(ErrorCode.AUTH_RESET_TOKEN_EXPIRED);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user!.id },
        data: {
          passwordHash: await bcrypt.hash(dto.newPassword, 12),
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        },
      }),
      this.prisma.authSession.updateMany({
        where: { userId: user!.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throwNotFound(ErrorCode.USER_NOT_FOUND);
    if (!(await bcrypt.compare(dto.currentPassword, user!.passwordHash))) {
      throwBadRequest(ErrorCode.AUTH_PASSWORD_INCORRECT);
    }
    if (dto.currentPassword === dto.newPassword) {
      throwBadRequest(ErrorCode.AUTH_PASSWORD_SAME, 'New password must be different');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) },
      }),
      this.prisma.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { message: 'Password changed successfully' };
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id: userId, status: UserStatus.ACTIVE, deletedAt: null },
    });
  }

  private async generateTokens(
    user: User,
    deviceInfo?: { userAgent?: string; ipAddress?: string },
  ) {
    const refreshToken = randomUUID();
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: tokenHash,
        userAgent: deviceInfo?.userAgent,
        ipAddress: deviceInfo?.ipAddress,
        expiresAt,
        refreshTokens: {
          create: { tokenFamily: randomUUID(), tokenHash, expiresAt },
        },
      },
    });
    return {
      tokens: {
        accessToken: this.signAccessToken(user),
        refreshToken,
        expiresIn: 900,
      },
    };
  }

  private signAccessToken(user: User): string {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        avatar: user.avatar,
      },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
      },
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      emailVerified: Boolean(user.emailVerifiedAt),
      createdAt: user.createdAt,
    };
  }

  // ============================================
  // EVENT EMITTERS (Simple Abstraction)
  // ============================================

  private emitUserRegistered(event: UserRegisteredEvent) {
    setImmediate(() => {
      this.eventEmitter.emit(USER_EVENTS.REGISTERED, event);
    });
  }

  private emitUserLoggedIn(event: UserLoggedInEvent) {
    setImmediate(() => {
      this.eventEmitter.emit(USER_EVENTS.LOGGED_IN, event);
    });
  }

  private emitUserEmailVerified(event: UserEmailVerifiedEvent) {
    setImmediate(() => {
      this.eventEmitter.emit(USER_EVENTS.EMAIL_VERIFIED, event);
    });
  }
}
