import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LedgerModule } from '../ledger/ledger.module';
import { AuditModule } from '../audit/audit.module';
import { AffiliatePolicyResolverService } from './policy-engine/affiliate-policy-resolver.service';
import { AffiliateCommissionStateMachineService } from './state-machine/affiliate-commission-state-machine.service';
import { AffiliateAuditService } from './audit/affiliate-audit.service';
import { AffiliateApplicationService } from './services/affiliate-application.service';
import { SellerAffiliateService } from './services/seller-affiliate.service';
import { AffiliateLinkService } from './services/affiliate-link.service';
import { AffiliateCheckoutService } from './services/affiliate-checkout.service';
import { AffiliateLifecycleService } from './services/affiliate-lifecycle.service';
import { AffiliateWalletService } from './services/affiliate-wallet.service';
import { AffiliateSettlementWorker } from './services/affiliate-settlement-worker.service';
import { AffiliateReconciliationService } from './services/affiliate-reconciliation.service';
import { AffiliateDashboardService } from './services/affiliate-dashboard.service';
import { AffiliatePayoutService } from './services/affiliate-payout.service';
import { AffiliateFraudService } from './services/affiliate-fraud.service';
import { AffiliateController } from './controllers/affiliate.controller';
import { AffiliateAdminController } from './controllers/affiliate-admin.controller';
import { SellerAffiliateController } from './controllers/seller-affiliate.controller';
import { AffiliateLinkController } from './controllers/affiliate-link.controller';

@Module({
  imports: [PrismaModule, LedgerModule, AuditModule],
  controllers: [
    AffiliateController,
    AffiliateAdminController,
    SellerAffiliateController,
    AffiliateLinkController,
  ],
  providers: [
    AffiliatePolicyResolverService,
    AffiliateCommissionStateMachineService,
    AffiliateAuditService,
    AffiliateApplicationService,
    SellerAffiliateService,
    AffiliateLinkService,
    AffiliateCheckoutService,
    AffiliateLifecycleService,
    AffiliateWalletService,
    AffiliateSettlementWorker,
    AffiliateReconciliationService,
    AffiliateDashboardService,
    AffiliatePayoutService,
    AffiliateFraudService,
  ],
  exports: [
    AffiliatePolicyResolverService,
    AffiliateCommissionStateMachineService,
    AffiliateAuditService,
    AffiliateApplicationService,
    SellerAffiliateService,
    AffiliateLinkService,
    AffiliateCheckoutService,
    AffiliateLifecycleService,
    AffiliateWalletService,
    AffiliateSettlementWorker,
    AffiliateReconciliationService,
    AffiliateDashboardService,
    AffiliatePayoutService,
    AffiliateFraudService,
  ],
})
export class AffiliateModule {}
