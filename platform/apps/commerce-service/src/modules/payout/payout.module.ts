import { Module } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { PayoutController } from './payout.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { WalletModule } from '../wallet/wallet.module';
import { LedgerModule } from '../ledger/ledger.module';
import { PayoutProcessorService } from './services/payout-processor.service';
import { MockBankTransferProvider } from './services/mock-bank-transfer.provider';
import { BANK_TRANSFER_PROVIDER } from './services/bank-transfer.provider';

@Module({
  imports: [PrismaModule, RedisModule, WalletModule, LedgerModule],
  controllers: [PayoutController],
  providers: [
    PayoutService,
    PayoutProcessorService,
    MockBankTransferProvider,
    {
      provide: BANK_TRANSFER_PROVIDER,
      useExisting: MockBankTransferProvider,
    },
  ],
  exports: [PayoutService, PayoutProcessorService, MockBankTransferProvider, BANK_TRANSFER_PROVIDER],
})
export class PayoutModule {}
