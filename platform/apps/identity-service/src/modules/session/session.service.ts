import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserSessions(
    userId: string,
    currentUserAgent?: string,
    currentIp?: string,
  ) {
    const sessions = await this.prisma.authSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    let currentFound = false;

    const list = sessions.map((session, index) => {
      let isCurrent = false;
      if (!currentFound) {
        if (
          currentUserAgent &&
          session.userAgent === currentUserAgent &&
          (!currentIp || session.ipAddress === currentIp)
        ) {
          isCurrent = true;
          currentFound = true;
        } else if (index === 0 && !currentUserAgent) {
          isCurrent = true;
          currentFound = true;
        }
      }

      const parsed = this.parseDeviceInfo(session.userAgent, session.ipAddress);

      return {
        id: session.id,
        deviceType: session.deviceType || parsed.deviceType,
        deviceName: session.deviceName || parsed.deviceName,
        location: session.location || parsed.location,
        icon: parsed.icon,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt || session.createdAt,
        expiresAt: session.expiresAt,
        isCurrent,
      };
    });

    if (!currentFound && list.length > 0) {
      list[0].isCurrent = true;
    }

    return list;
  }

  parseDeviceInfo(userAgent?: string | null, ipAddress?: string | null) {
    let deviceName = 'Trình duyệt Web';
    let deviceType = 'desktop';
    let icon = 'devices';

    if (userAgent) {
      const ua = userAgent;
      let os = '';
      if (ua.includes('Windows NT 10.0') || ua.includes('Windows NT 11.0')) os = 'Máy tính Windows';
      else if (ua.includes('Windows')) os = 'Máy tính Windows';
      else if (ua.includes('Macintosh') || ua.includes('Mac OS X')) os = 'MacBook / macOS';
      else if (ua.includes('iPhone')) {
        os = 'iPhone';
        deviceType = 'mobile';
        icon = 'smartphone';
      } else if (ua.includes('iPad')) {
        os = 'iPad';
        deviceType = 'tablet';
        icon = 'tablet_mac';
      } else if (ua.includes('Android')) {
        if (ua.includes('Boox')) {
          os = 'Máy đọc sách Boox (Android)';
          deviceType = 'tablet';
          icon = 'tablet_android';
        } else {
          os = 'Thiết bị Android';
          deviceType = 'mobile';
          icon = 'smartphone';
        }
      } else if (ua.includes('Linux')) {
        os = 'Máy tính Linux';
      }

      let browser = '';
      if (ua.includes('Edg/')) {
        const match = ua.match(/Edg\/(\d+)/);
        browser = match ? `Edge ${match[1]}` : 'Edge';
      } else if (ua.includes('Chrome/')) {
        const match = ua.match(/Chrome\/(\d+)/);
        browser = match ? `Chrome ${match[1]}` : 'Chrome';
      } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
        browser = 'Safari';
      } else if (ua.includes('Firefox/')) {
        const match = ua.match(/Firefox\/(\d+)/);
        browser = match ? `Firefox ${match[1]}` : 'Firefox';
      }

      if (os && browser) {
        deviceName = `${os} (${browser})`;
      } else if (os) {
        deviceName = os;
      } else if (browser) {
        deviceName = browser;
      }

      if (deviceType === 'desktop') {
        icon = os.includes('Mac') ? 'laptop_mac' : 'laptop_windows';
      }
    }

    let location = 'Việt Nam';
    const cleanIp = ipAddress ? ipAddress.replace(/^::ffff:/, '') : '';
    if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
      location = 'Hà Nội, Việt Nam (Thiết bị cục bộ)';
    } else if (cleanIp) {
      location = `Hà Nội, Việt Nam (IP: ${cleanIp})`;
    }

    return { deviceName, deviceType, icon, location };
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

  async updateSessionExpiry(sessionId: string, expiresAt: Date) {
    return this.prisma.authSession.update({
      where: { id: sessionId },
      data: { expiresAt },
    });
  }
}
