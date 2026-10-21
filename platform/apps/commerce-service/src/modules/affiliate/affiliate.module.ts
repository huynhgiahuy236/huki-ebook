import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LedgerModule } from '../ledger/ledger.module';
import { AuditModule } from '../audit/audit.module';
import { AffiliatePolicyResolverService } from './policy-engine/affiliate-policy-resolver.service';
import { AffiliateCommissionStateMachineService } from './state-machine/affiliate-commission-state-machine.service';
import { AffiliateAuditService } from './audit/affiliate-audit.service';

@Module({
  imports: [PrismaModule, LedgerModule, AuditModule],
  providers: [
    AffiliatePolicyResolverService,
    AffiliateCommissionStateMachineService,
    AffiliateAuditService,
  ],
  exports: [
    AffiliatePolicyResolverService,
    AffiliateCommissionStateMachineService,
    AffiliateAuditService,
  ],
})
export class AffiliateModule {}
