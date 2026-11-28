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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
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
import { AffiliateHealthService } from '../monitoring/affiliate-health.service';
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

@ApiTags('Admin - Affiliates')
@ApiBearerAuth('JWT-auth')
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
    private readonly healthService: AffiliateHealthService,
  ) {}

  /**
   * Admin: List applications in review queue or partner pool
   */
  @Get()
  @ApiOperation({ summary: 'List affiliate applications in review queue or partner pool' })
  @ApiQuery({ name: 'status', required: false, enum: AffiliatePartnerStatus })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiSuccessResponse(undefined, { description: 'Affiliate applications retrieved' })
  @ApiStandardErrors(401, 403)
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
   * Admin: Approve application
   */
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve affiliate application' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Application approved' })
  @ApiStandardErrors(401, 403, 404, 409)
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
  @ApiOperation({ summary: 'Request changes on affiliate application' })
  @ApiBody({ schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string' }, requestedChanges: { type: 'object', additionalProperties: { type: 'string' } } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Changes requested' })
  @ApiStandardErrors(400, 401, 403, 404)
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
  @ApiOperation({ summary: 'Reject affiliate application' })
  @ApiBody({ schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Application rejected' })
  @ApiStandardErrors(400, 401, 403, 404)
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
  @ApiOperation({ summary: 'Suspend active affiliate partner' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Partner suspended' })
  @ApiStandardErrors(400, 401, 403, 404)
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
  @ApiOperation({ summary: 'Re-activate suspended affiliate partner' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Partner activated' })
  @ApiStandardErrors(401, 403, 404)
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
  @ApiOperation({ summary: 'Trigger settlement of matured HOLDING commissions' })
  @ApiQuery({ name: 'batchSize', required: false, type: Number })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Matured holdings processed' })
  @ApiStandardErrors(401, 403)
  async processMaturedHoldings(@Query('batchSize') batchSize?: number) {
    const limit = batchSize && Number(batchSize) > 0 ? Number(batchSize) : 50;
    return this.lifecycleService.processMaturedHoldings(limit);
  }

  /**
   * Admin: Reverse settled commission (Refund/Fraud Reversal)
   */
  @Post('commissions/:id/reverse')
  @ApiOperation({ summary: 'Reverse settled commission (refund/fraud)' })
  @ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Commission reversed' })
  @ApiStandardErrors(400, 401, 403, 404)
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
  @ApiOperation({ summary: 'Cancel pending/holding commission' })
  @ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Commission cancelled' })
  @ApiStandardErrors(400, 401, 403, 404)
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
  @ApiOperation({ summary: 'Get affiliate wallet detail by profileId' })
  @ApiSuccessResponse(undefined, { description: 'Affiliate wallet detail retrieved' })
  @ApiStandardErrors(401, 403, 404)
  async getWallet(@Param('profileId') profileId: string) {
    return this.walletService.getWalletByProfileId(profileId);
  }

  /**
   * Admin Maker: Request manual balance adjustment
   */
  @Post('wallets/adjustments')
  @ApiOperation({ summary: 'Request manual affiliate balance adjustment (Maker)' })
  @ApiBody({ schema: { type: 'object', required: ['profileId', 'amount', 'direction', 'reason'], properties: { profileId: { type: 'string' }, amount: { type: 'number' }, direction: { type: 'string', enum: ['CREDIT', 'DEBIT'] }, reason: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Adjustment requested' })
  @ApiStandardErrors(400, 401, 403)
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
  @ApiOperation({ summary: 'Approve manual affiliate balance adjustment (Checker)' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Adjustment approved' })
  @ApiStandardErrors(401, 403, 404, 409)
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
  @ApiOperation({ summary: 'Reject manual affiliate balance adjustment (Checker)' })
  @ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Adjustment rejected' })
  @ApiStandardErrors(401, 403, 404)
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
  @ApiOperation({ summary: 'View latest affiliate reconciliation report' })
  @ApiSuccessResponse(undefined, { description: 'Reconciliation report retrieved' })
  @ApiStandardErrors(401, 403)
  async getReconciliationReport() {
    return this.reconciliationService.runReconciliationAudit();
  }

  /**
   * Admin: Trigger manual run of 00:00 settlement batch
   */
  @Post('settlement/trigger')
  @ApiOperation({ summary: 'Trigger manual run of settlement batch' })
  @ApiQuery({ name: 'batchSize', required: false, type: Number })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Settlement batch triggered' })
  @ApiStandardErrors(401, 403)
  async triggerSettlementBatch(@Query('batchSize') batchSize?: number) {
    const limit = batchSize && Number(batchSize) > 0 ? Number(batchSize) : 200;
    return this.settlementWorker.runSettlementBatch(undefined, limit);
  }

  /**
   * Admin: Get platform-wide affiliate dashboard overview & financial metrics
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'Get platform-wide affiliate dashboard overview' })
  @ApiSuccessResponse(undefined, { description: 'Admin affiliate dashboard retrieved' })
  @ApiStandardErrors(401, 403)
  async getAdminDashboard() {
    return this.dashboardService.getAdminDashboardStats();
  }

  /**
   * Admin: Export all platform affiliate transactions report (CSV / Excel)
   */
  @Get('reports/export')
  @ApiOperation({ summary: 'Export platform affiliate transactions report' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xlsx'] })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiSuccessResponse(undefined, { description: 'Admin affiliate report exported' })
  @ApiStandardErrors(401, 403)
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
  @ApiOperation({ summary: 'Review and verify/reject CTV KYC & bank account' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'KYC reviewed' })
  @ApiStandardErrors(400, 401, 403, 404)
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
  @ApiOperation({ summary: 'List all affiliate payout requests' })
  @ApiQuery({ name: 'status', required: false, enum: AffiliatePayoutStatus })
  @ApiQuery({ name: 'profileId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiSuccessResponse(undefined, { description: 'Payout requests listed' })
  @ApiStandardErrors(401, 403)
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
  @ApiOperation({ summary: 'Approve payout and execute bank disbursal' })
  @ApiBody({ schema: { type: 'object', properties: { providerRef: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Payout approved' })
  @ApiStandardErrors(400, 401, 403, 404)
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
  @ApiOperation({ summary: 'Reject payout and restore frozen balance' })
  @ApiBody({ schema: { type: 'object', required: ['reason'], properties: { reason: { type: 'string' } } } })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Payout rejected' })
  @ApiStandardErrors(400, 401, 403, 404)
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
  @ApiOperation({ summary: 'List affiliate fraud investigation cases' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiSuccessResponse(undefined, { description: 'Fraud cases listed' })
  @ApiStandardErrors(401, 403)
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
  @ApiOperation({ summary: 'Open an affiliate fraud investigation case' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Fraud case created' })
  @ApiStandardErrors(400, 401, 403)
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
  @ApiOperation({ summary: 'Resolve affiliate fraud investigation case' })
  @ApiSuccessResponse(undefined, { status: 201, description: 'Fraud case resolved' })
  @ApiStandardErrors(400, 401, 403, 404)
  async resolveFraudCase(
    @Param('id') id: string,
    @Req() req: BookRequest,
    @Body() dto: ResolveFraudCaseDto,
  ) {
    const reviewerId = req.user!.sub;
    return this.fraudService.resolveFraudCase(id, reviewerId, dto);
  }

  /**
   * Admin: Get Affiliate Subsystem operational health & SLO metrics
   */
  @Get('health')
  @ApiOperation({ summary: 'Get Affiliate subsystem operational health & SLO metrics' })
  @ApiSuccessResponse(undefined, { description: 'Affiliate health retrieved' })
  @ApiStandardErrors(401, 403)
  async getHealth() {
    return this.healthService.checkHealth();
  }
  /**
   * Admin: View application detail and audit history (Placed at end of controller to avoid shadowing static routes - BUG-03-013)
   */
  @Get(':id')
  @ApiOperation({ summary: 'View affiliate application detail and audit history' })
  @ApiSuccessResponse(undefined, { description: 'Application detail retrieved' })
  @ApiStandardErrors(401, 403, 404)
  async getApplicationDetail(@Param('id') id: string) {
    return this.applicationService.adminGetApplicationDetail(id);
  }
}
