import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { BookRequest, BookWriteGuard } from '../../../common/book-auth.guard';
import { AffiliateApplicationService } from '../services/affiliate-application.service';
import { AffiliateLifecycleService } from '../services/affiliate-lifecycle.service';
import { AffiliateCommissionStateMachineService } from '../state-machine/affiliate-commission-state-machine.service';
import { AffiliateWalletService } from '../services/affiliate-wallet.service';
import { AffiliateSettlementWorker } from '../services/affiliate-settlement-worker.service';
import { AffiliateReconciliationService } from '../services/affiliate-reconciliation.service';
import { AffiliateDashboardService } from '../services/affiliate-dashboard.service';
import { AffiliatePayoutService } from '../services/affiliate-payout.service';
import { AffiliateFraudService } from '../services/affiliate-fraud.service';
import {
  AdminReviewApplicationDto,
  AdminSuspendPartnerDto,
} from '../dto/affiliate-application.dto';
import {
  ReviewKycDto,
  ReviewPayoutDto,
  CreateFraudCaseDto,
  ResolveFraudCaseDto,
} from '../dto/affiliate-payout.dto';
import {
  AffiliatePartnerStatus,
  AffiliatePayoutStatus,
} from '../../../../prisma/generated/client';

@Controller('admin/affiliates')
@UseGuards(BookWriteGuard)
export class AffiliateAdminController {
  constructor(
    private readonly applicationService: AffiliateApplicationService,
    private readonly lifecycleService: AffiliateLifecycleService,
    private readonly stateMachine: AffiliateCommissionStateMachineService,
    private readonly walletService: AffiliateWalletService,
    private readonly settlementWorker: AffiliateSettlementWorker,
    private readonly reconciliationService: AffiliateReconciliationService,
    private readonly dashboardService: AffiliateDashboardService,
    private readonly payoutService: AffiliatePayoutService,
    private readonly fraudService: AffiliateFraudService,
  ) {}

  /**
   * Admin: List applications in review queue or partner pool
   */
  @Get()
  async listApplications(
    @Query('status') status?: AffiliatePartnerStatus,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.applicationService.adminListApplications({
      status,
      search,
      page,
      limit,
    });
  }

  /**
   * Admin: View application detail and audit history
   */
  @Get(':id')
  async getApplicationDetail(@Param('id') id: string) {
    return this.applicationService.adminGetApplicationDetail(id);
  }

  /**
   * Admin: Approve application
   */
  @Post(':id/approve')
  async approveApplication(
    @Param('id') id: string,
    @Req() req: BookRequest,
    @Headers('x-request-id') requestId?: string,
  ) {
    const reviewerId = req.user!.sub;
    const reviewerRole = req.user!.role;
    return this.applicationService.adminApprove(id, reviewerId, reviewerRole, {
      requestId,
    });
  }

  /**
   * Admin: Request changes
   */
  @Post(':id/request-changes')
  async requestChanges(
    @Param('id') id: string,
    @Req() req: BookRequest,
    @Body() dto: { reason: string; requestedChanges?: Record<string, string> },
    @Headers('x-request-id') requestId?: string,
  ) {
    const reviewerId = req.user!.sub;
    const reviewerRole = req.user!.role;
    return this.applicationService.adminRequestChanges(
      id,
      reviewerId,
      reviewerRole,
      dto,
      { requestId },
    );
  }

  /**
   * Admin: Reject application
   */
  @Post(':id/reject')
  async rejectApplication(
    @Param('id') id: string,
    @Req() req: BookRequest,
    @Body() dto: { reason: string },
    @Headers('x-request-id') requestId?: string,
  ) {
    const reviewerId = req.user!.sub;
    const reviewerRole = req.user!.role;
    return this.applicationService.adminReject(id, reviewerId, reviewerRole, dto.reason, {
      requestId,
    });
  }

  /**
   * Admin: Suspend active partner
   */
  @Post(':id/suspend')
  async suspendPartner(
    @Param('id') id: string,
    @Req() req: BookRequest,
    @Body() dto: AdminSuspendPartnerDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    const reviewerId = req.user!.sub;
    const reviewerRole = req.user!.role;
    return this.applicationService.adminSuspend(id, reviewerId, reviewerRole, dto.reason, {
      requestId,
    });
  }

  /**
   * Admin: Re-activate suspended partner
   */
  @Post(':id/activate')
  async activatePartner(
    @Param('id') id: string,
    @Req() req: BookRequest,
    @Headers('x-request-id') requestId?: string,
  ) {
    const reviewerId = req.user!.sub;
    const reviewerRole = req.user!.role;
    return this.applicationService.adminActivate(id, reviewerId, reviewerRole, {
      requestId,
    });
  }

  /**
   * Admin / Scheduled Ops: Trigger settlement of matured HOLDING commissions
   */
  @Post('process-matured-holdings')
  async processMaturedHoldings(@Query('batchSize') batchSize?: number) {
    const limit = batchSize && Number(batchSize) > 0 ? Number(batchSize) : 50;
    return this.lifecycleService.processMaturedHoldings(limit);
  }

  /**
   * Admin: Reverse settled commission (Refund/Fraud Reversal)
   */
  @Post('commissions/:id/reverse')
  async reverseCommission(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.stateMachine.reverseCommission(
      id,
      reason || 'Admin manual reversal',
    );
  }

  /**
   * Admin: Cancel pending/holding commission
   */
  @Post('commissions/:id/cancel')
  async cancelCommission(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.stateMachine.cancelCommission(
      id,
      reason || 'Admin manual cancellation',
    );
  }

  /**
   * Admin: Get affiliate wallet detail by profileId
   */
  @Get('wallets/:profileId')
  async getWallet(@Param('profileId') profileId: string) {
    return this.walletService.getWalletByProfileId(profileId);
  }

  /**
   * Admin Maker: Request manual balance adjustment
   */
  @Post('wallets/adjustments')
  async requestAdjustment(
    @Req() req: BookRequest,
    @Body()
    dto: {
      profileId: string;
      amount: number;
      direction: 'CREDIT' | 'DEBIT';
      reason: string;
    },
  ) {
    const adminId = req.user!.sub;
    return this.walletService.requestManualAdjustment({
      ...dto,
      requestedBy: adminId,
    });
  }

  /**
   * Admin Checker: Approve manual balance adjustment (must be different admin)
   */
  @Post('wallets/adjustments/:id/approve')
  async approveAdjustment(
    @Param('id') id: string,
    @Req() req: BookRequest,
  ) {
    const adminId = req.user!.sub;
    return this.walletService.approveManualAdjustment(id, adminId);
  }

  /**
   * Admin Checker: Reject manual balance adjustment
   */
  @Post('wallets/adjustments/:id/reject')
  async rejectAdjustment(
    @Param('id') id: string,
    @Req() req: BookRequest,
    @Body('reason') reason: string,
  ) {
    const adminId = req.user!.sub;
    return this.walletService.rejectManualAdjustment(id, adminId, reason || 'Rejected by admin');
  }

  /**
   * Admin: View latest reconciliation report
   */
  @Get('reconciliation')
  async getReconciliationReport() {
    return this.reconciliationService.runReconciliationAudit();
  }

  /**
   * Admin: Trigger manual run of 00:00 settlement batch
   */
  @Post('settlement/trigger')
  async triggerSettlementBatch(@Query('batchSize') batchSize?: number) {
    const limit = batchSize && Number(batchSize) > 0 ? Number(batchSize) : 200;
    return this.settlementWorker.runSettlementBatch(undefined, limit);
  }

  /**
   * Admin: Get platform-wide affiliate dashboard overview & financial metrics
   */
  @Get('dashboard')
  async getAdminDashboard() {
    return this.dashboardService.getAdminDashboardStats();
  }

  /**
   * Admin: Export all platform affiliate transactions report (CSV / Excel)
   */
  @Get('reports/export')
  async exportAdminReport(
    @Query('format') format?: 'csv' | 'xlsx',
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Res({ passthrough: true }) res?: any,
  ) {
    const result = await this.dashboardService.exportReport(
      'ADMIN',
      'platform',
      format || 'csv',
      fromDate,
      toDate,
    );

    if (res) {
      res.set({
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      });
    }

    return result.content;
  }

  /**
   * Admin: Review and verify/reject CTV KYC & bank account
   */
  @Post('kyc/:profileId/review')
  async reviewKyc(
    @Param('profileId') profileId: string,
    @Req() req: BookRequest,
    @Body() dto: ReviewKycDto,
  ) {
    const reviewerId = req.user!.sub;
    return this.payoutService.reviewKyc(profileId, reviewerId, dto);
  }

  /**
   * Admin: List all affiliate payout requests
   */
  @Get('payouts')
  async listPayoutRequests(
    @Query('status') status?: AffiliatePayoutStatus,
    @Query('profileId') profileId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.payoutService.listPayoutRequests({
      status,
      profileId,
      page,
      limit,
    });
  }

  /**
   * Admin: Approve payout and execute bank disbursal
   */
  @Post('payouts/:id/approve')
  async approvePayout(
    @Param('id') id: string,
    @Req() req: BookRequest,
    @Body('providerRef') providerRef?: string,
  ) {
    const reviewerId = req.user!.sub;
    return this.payoutService.approvePayout(id, reviewerId, providerRef);
  }

  /**
   * Admin: Reject payout and restore frozen balance to available
   */
  @Post('payouts/:id/reject')
  async rejectPayout(
    @Param('id') id: string,
    @Req() req: BookRequest,
    @Body('reason') reason: string,
  ) {
    const reviewerId = req.user!.sub;
    return this.payoutService.rejectPayout(id, reviewerId, reason);
  }

  /**
   * Admin: List fraud investigation cases
   */
  @Get('fraud')
  async listFraudCases(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.fraudService.listFraudCases({
      status,
      page,
      limit,
    });
  }

  /**
   * Admin / Risk Engine: Open a fraud investigation case
   */
  @Post('fraud')
  async createFraudCase(
    @Req() req: BookRequest,
    @Body() dto: CreateFraudCaseDto,
  ) {
    const adminId = req.user!.sub;
    return this.fraudService.createFraudCase(dto, adminId);
  }

  /**
   * Admin: Resolve fraud investigation case (CONFIRMED -> SUSPEND or DISMISSED -> CLEAR)
   */
  @Post('fraud/:id/resolve')
  async resolveFraudCase(
    @Param('id') id: string,
    @Req() req: BookRequest,
    @Body() dto: ResolveFraudCaseDto,
  ) {
    const reviewerId = req.user!.sub;
    return this.fraudService.resolveFraudCase(id, reviewerId, dto);
  }
}
