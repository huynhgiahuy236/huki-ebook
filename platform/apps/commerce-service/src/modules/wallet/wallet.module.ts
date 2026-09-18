import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { EmailModule } from '@huki/shared';
import { WalletService } from './wallet.service';
import { WalletSecurityService } from './wallet-security.service';
import { WalletController } from './wallet.controller';

@Module({
  imports: [PrismaModule, RedisModule, EmailModule],
  controllers: [WalletController],
  providers: [WalletService, WalletSecurityService],
  exports: [WalletService, WalletSecurityService],
})
export class WalletModule {}
