import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { User, UserRole, UserStatus } from '../../../prisma/generated/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RefreshTokenDto, RegisterDto } from './dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Email already exists');
    }
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        fullName: dto.fullName,
        phone: dto.phone,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      },
    });
    return {
      user: this.sanitizeUser(user),
      ...(await this.generateTokens(user)),
    };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user) throw new UnauthorizedException('Invalid email or password');
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }
    if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
      const failedLoginAttempts = user.failedLoginAttempts + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts,
          lockedUntil:
            failedLoginAttempts >= 5
              ? new Date(Date.now() + 30 * 60_000)
              : null,
        },
      });
      throw new UnauthorizedException('Invalid email or password');
    }
    const activeUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
    return {
      user: this.sanitizeUser(activeUser),
      ...(await this.generateTokens(activeUser, { userAgent, ipAddress })),
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
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    await this.prisma.refreshToken.update({
      where: { id: token.id },
      data: { revokedAt: new Date(), revokedReason: 'token_rotation' },
    });
    return {
      accessToken: this.signAccessToken(token.session.user),
      expiresIn: 900,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: randomUUID(),
          passwordResetExpiresAt: new Date(Date.now() + 60 * 60_000),
        },
      });
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
    if (!user) throw new BadRequestException('Invalid or expired reset token');
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await bcrypt.hash(dto.newPassword, 12),
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        },
      }),
      this.prisma.authSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
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
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.accessTokenExpiresIn'),
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
}
