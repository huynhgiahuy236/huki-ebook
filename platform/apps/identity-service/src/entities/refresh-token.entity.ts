import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { AuthSession } from './auth-session.entity';

@Entity('refresh_tokens')
@Index('idx_refresh_tokens_session', ['session'])
@Index('idx_refresh_tokens_token_hash', ['tokenHash'])
@Index('idx_refresh_tokens_family', ['tokenFamily'])
@Index('idx_refresh_tokens_expires', ['expiresAt'])
export class RefreshToken extends BaseEntity {
  @Column({ name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => AuthSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: AuthSession;

  @Column({ name: 'token_family', type: 'uuid' })
  tokenFamily: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash: string;

  @Column({ name: 'token_type', type: 'varchar', length: 50, default: 'REFRESH' })
  tokenType: string;

  @Column({ name: 'device_info', type: 'varchar', length: 500, nullable: true })
  deviceInfo: string | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'revoked_reason', type: 'varchar', length: 100, nullable: true })
  revokedReason: string | null;

  @Column({ name: 'replaced_by_token_id', type: 'uuid', nullable: true })
  replacedByTokenId: string | null;
}
