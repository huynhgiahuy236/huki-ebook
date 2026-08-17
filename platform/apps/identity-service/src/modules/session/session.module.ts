import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthSession } from '../../entities/auth-session.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuthSession, RefreshToken])],
  providers: [],
  exports: [],
})
export class SessionModule {}
