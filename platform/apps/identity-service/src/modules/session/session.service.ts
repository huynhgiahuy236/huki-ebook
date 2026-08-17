import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan } from 'typeorm';
import { AuthSession } from '../../../entities/auth-session.entity';
import { RefreshToken } from '../../../entities/refresh-token.entity';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(AuthSession)
    private sessionRepository: Repository<AuthSession>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async getUserSessions(userId: string) {
    const sessions = await this.sessionRepository.find({
      where: {
        userId,
        revokedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });

    return sessions.map((session) => ({
      id: session.id,
      deviceType: session.deviceType,
      deviceName: session.deviceName,
      location: session.location,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      isCurrent: false, // Will be set based on current session
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Revoke session
    session.revokedAt = new Date();
    await this.sessionRepository.save(session);

    // Revoke all refresh tokens for this session
    await this.refreshTokenRepository.update(
      { sessionId },
      { revokedAt: new Date(), revokedReason: 'session_revoked' },
    );

    return { message: 'Session revoked successfully' };
  }

  async revokeAllSessions(userId: string, exceptCurrent?: string) {
    const whereClause: any = {
      userId,
      revokedAt: IsNull(),
    };

    await this.sessionRepository.update(whereClause, { revokedAt: new Date() });

    // Revoke all refresh tokens
    const sessionCondition = exceptCurrent
      ? { userId, revokedAt: IsNull(), id: exceptCurrent }
      : { userId, revokedAt: IsNull() };

    const sessionsToKeep = exceptCurrent
      ? await this.sessionRepository.findOne({ where: { id: exceptCurrent } })
      : null;

    await this.refreshTokenRepository.update(
      { sessionId: exceptCurrent ? exceptCurrent : undefined },
      { revokedAt: new Date(), revokedReason: 'all_sessions_revoked' },
    );

    return { message: 'All sessions revoked' };
  }

  async cleanupExpiredSessions() {
    const result = await this.sessionRepository.update(
      {
        revokedAt: IsNull(),
        expiresAt: LessThan(new Date()),
      },
      { revokedAt: new Date() },
    );

    return {
      message: 'Expired sessions cleaned up',
      count: result.affected || 0,
    };
  }

  async updateLastActive(sessionId: string) {
    await this.sessionRepository.update(sessionId, {
      lastActiveAt: new Date(),
    });
  }

  async getSession(sessionId: string) {
    return this.sessionRepository.findOne({
      where: { id: sessionId },
    });
  }
}
