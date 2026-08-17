import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { User, UserStatus, UserRole } from '../../entities/user.entity';
import { AuthSession } from '../../entities/auth-session.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
import { ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from './dto/password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuthSession)
    private sessionRepository: Repository<AuthSession>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ==================== REGISTER ====================
  async register(dto: RegisterDto) {
    // Check if email exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Create user
    const user = this.userRepository.create({
      email: dto.email,
      fullName: dto.fullName,
      phone: dto.phone,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    });

    await user.hashPassword(dto.password);
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ==================== LOGIN ====================
  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked');
    }

    // Check status
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    // Validate password
    const isPasswordValid = await user.validatePassword(dto.password);

    if (!isPasswordValid) {
      // Increment failed login attempts
      user.failedLoginAttempts += 1;

      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      await this.userRepository.save(user);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset failed login attempts
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user, {
      userAgent,
      ipAddress,
    });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ==================== LOGOUT ====================
  async logout(refreshToken: string) {
    if (!refreshToken) return;

    const tokenHash = await this.hashToken(refreshToken);

    // Find and revoke the refresh token
    const token = await this.refreshTokenRepository.findOne({
      where: { tokenHash, revokedAt: IsNull() },
    });

    if (token) {
      token.revokedAt = new Date();
      token.revokedReason = 'user_logout';
      await this.refreshTokenRepository.save(token);
    }
  }

  async logoutAll(userId: string) {
    // Revoke all sessions for user
    await this.sessionRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  // ==================== REFRESH TOKEN ====================
  async refreshToken(dto: RefreshTokenDto) {
    const tokenHash = await this.hashToken(dto.refreshToken);

    const token = await this.refreshTokenRepository.findOne({
      where: { tokenHash, revokedAt: IsNull() },
      relations: ['session', 'session.user'],
    });

    if (!token || token.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Check if session is still valid
    if (token.session.revokedAt) {
      throw new UnauthorizedException('Session has been revoked');
    }

    // Token rotation - revoke old token and create new one
    token.revokedAt = new Date();
    token.revokedReason = 'token_rotation';
    await this.refreshTokenRepository.save(token);

    // Generate new access token
    const payload = {
      sub: token.session.user.id,
      email: token.session.user.email,
      role: token.session.user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: this.configService.get('jwt.accessTokenExpiresIn'),
    });

    return {
      accessToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  // ==================== FORGOT PASSWORD ====================
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If email exists, reset link has been sent' };
    }

    // Generate reset token
    const resetToken = uuidv4();
    user.passwordResetToken = resetToken;
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.userRepository.save(user);

    // TODO: Send email with reset link
    // await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'If email exists, reset link has been sent' };
  }

  // ==================== RESET PASSWORD ====================
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpiresAt: IsNull(),
      },
    });

    // More precise query for non-expired token
    const userByToken = await this.userRepository
      .createQueryBuilder('user')
      .where('user.passwordResetToken = :token', { token: dto.token })
      .andWhere(
        'user.passwordResetExpiresAt IS NOT NULL AND user.passwordResetExpiresAt > :now',
        { now: new Date() },
      )
      .getOne();

    if (!userByToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Update password
    await userByToken.hashPassword(dto.newPassword);
    userByToken.passwordResetToken = null;
    userByToken.passwordResetExpiresAt = null;
    await this.userRepository.save(userByToken);

    // Revoke all sessions
    await this.logoutAll(userByToken.id);

    return { message: 'Password reset successfully' };
  }

  // ==================== CHANGE PASSWORD ====================
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate current password
    const isValid = await user.validatePassword(dto.currentPassword);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Update password
    await user.hashPassword(dto.newPassword);
    await this.userRepository.save(user);

    // Revoke all sessions except current
    await this.logoutAll(userId);

    return { message: 'Password changed successfully' };
  }

  // ==================== HELPERS ====================
  private async generateTokens(
    user: User,
    deviceInfo?: { userAgent?: string; ipAddress?: string },
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Access token
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: this.configService.get('jwt.accessTokenExpiresIn'),
    });

    // Refresh token (with rotation)
    const refreshToken = uuidv4();
    const refreshTokenHash = await this.hashToken(refreshToken);

    // Create session
    const session = this.sessionRepository.create({
      userId: user.id,
      refreshTokenHash: refreshTokenHash,
      userAgent: deviceInfo?.userAgent,
      ipAddress: deviceInfo?.ipAddress,
      expiresAt: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      ),
    });
    await this.sessionRepository.save(session);

    // Create refresh token
    const refreshTokenEntity = this.refreshTokenRepository.create({
      sessionId: session.id,
      tokenFamily: uuidv4(), // For token rotation tracking
      tokenHash: refreshTokenHash,
      expiresAt: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      ),
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes
      },
    };
  }

  private async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10);
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      emailVerified: !!user.emailVerifiedAt,
      createdAt: user.createdAt,
    };
  }

  // ==================== VALIDATE USER (for JWT) ====================
  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId, status: UserStatus.ACTIVE },
    });
  }
}
