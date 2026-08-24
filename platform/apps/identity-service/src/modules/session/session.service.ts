import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserSessions(userId: string) {
    const sessions = await this.prisma.authSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
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
      isCurrent: false,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.authSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Session not found');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.authSession.update({ where: { id: sessionId }, data: { revokedAt: now } }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt: now, revokedReason: 'session_revoked' },
      }),
    ]);
    return { message: 'Session revoked successfully' };
  }

  async revokeAllSessions(userId: string, exceptCurrent?: string) {
    const sessions = await this.prisma.authSession.findMany({
      where: { userId, revokedAt: null, ...(exceptCurrent ? { id: { not: exceptCurrent } } : {}) },
      select: { id: true },
    });
    const sessionIds = sessions.map(({ id }) => id);
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.authSession.updateMany({
        where: { id: { in: sessionIds } },
        data: { revokedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId: { in: sessionIds }, revokedAt: null },
        data: { revokedAt: now, revokedReason: 'all_sessions_revoked' },
      }),
    ]);
    return { message: 'All sessions revoked' };
  }

  async cleanupExpiredSessions() {
    const result = await this.prisma.authSession.updateMany({
      where: { revokedAt: null, expiresAt: { lt: new Date() } },
      data: { revokedAt: new Date() },
    });
    return { message: 'Expired sessions cleaned up', count: result.count };
  }

  async updateLastActive(sessionId: string) {
    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });
  }

  async getSession(sessionId: string) {
    return this.prisma.authSession.findUnique({ where: { id: sessionId } });
  }
}
