import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get('jwt.secret') ||
        configService.get('JWT_SECRET') ||
        process.env.JWT_SECRET ||
        'your-super-secret-jwt-key',
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const isPendingDeletion = user.status === 'PENDING_DELETION';
    let remainingDays = 0;
    if (isPendingDeletion && user.deletionScheduledAt) {
      const diffMs = new Date(user.deletionScheduledAt).getTime() - Date.now();
      remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      status: user.status,
      avatar: user.avatar,
      isPendingDeletion,
      deletionScheduledAt: user.deletionScheduledAt,
      remainingDays,
    };
  }
}
