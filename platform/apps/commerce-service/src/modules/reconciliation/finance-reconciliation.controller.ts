import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, ApiStandardErrors } from '@huki/shared';
import { AuthenticatedGuard, BookActor } from '../../common/book-auth.guard';
import { CurrentBookActor } from '../../common/current-book-actor.decorator';
import { FinanceReconciliationService } from './finance-reconciliation.service';
import {
  EodReconciliationRunDto,
  EodRunsQueryDto,
  RebuildSummaryQueryDto,
  ReconciliationQueryDto,
  ReconciliationReportDto,
  SummaryRebuildResultDto,
} from './dto/reconciliation.dto';

@ApiTags('Admin Finance Reconciliation')
@Controller('admin/finance/reconciliation')
export class FinanceReconciliationController {
  constructor(
    private readonly reconciliationService: FinanceReconciliationService,
  ) {}

  @Post('run')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Execute financial reconciliation run across Ledger, Wallet, Escrow, and Outbox',
    description: 'Admin only. Scans for accounting invariants, projection drifts, and lifecycle discrepancies.',
  })
  @ApiSuccessResponse(ReconciliationReportDto, { status: 201, description: 'Reconciliation report with detailed diagnostic discrepancies' })
  @ApiStandardErrors(400, 401, 403)
  async runReconciliation(
    @Body() query: ReconciliationQueryDto,
    @CurrentBookActor() actor: BookActor,
  ): Promise<ReconciliationReportDto> {
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
    if (!isAdmin) {
      throw new ForbiddenException('Access denied: Platform Admin privileges required to execute reconciliation');
    }
    return this.reconciliationService.reconcile(query, actor);
  }

  @Post('rebuild-summaries')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Rebuild LedgerAccountSummary projections from immutable LedgerEntry history',
    description: 'Admin only. Updates derived account summaries without modifying historical ledger or wallet entries.',
  })
  @ApiSuccessResponse(SummaryRebuildResultDto, { status: 201, description: 'Summary rebuild execution adjustments and status' })
  @ApiStandardErrors(400, 401, 403)
  async rebuildSummaries(
    @Body() query: RebuildSummaryQueryDto,
    @CurrentBookActor() actor: BookActor,
  ): Promise<SummaryRebuildResultDto> {
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
    if (!isAdmin) {
      throw new ForbiddenException('Access denied: Platform Admin privileges required to rebuild account summaries');
    }
    return this.reconciliationService.rebuildAccountSummaries(query, actor);
  }

  // ============================================
  // TASK 78: EOD RECONCILIATION & AUDIT REPORTS
  // ============================================

  @Post('eod/run')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Execute End-of-Day Financial Reconciliation run and persist immutable audit record',
    description: 'Admin only. Scans all finance invariants, analyzes clearing balances, and records immutable historical run.',
  })
  @ApiSuccessResponse(undefined, { status: 201, description: 'EOD reconciliation run created' })
  @ApiStandardErrors(400, 401, 403)
  async runEodReconciliation(
    @Body() dto: EodReconciliationRunDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
    if (!isAdmin) {
      throw new ForbiddenException('Access denied: Platform Admin privileges required to execute EOD reconciliation');
    }
    return this.reconciliationService.runEodReconciliation(dto, actor);
  }

  @Get('eod/runs')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'List historical EOD reconciliation runs with summary statistics',
    description: 'Admin only. Retrieves historical immutable audit reports.',
  })
  @ApiSuccessResponse(undefined, { isArray: true, description: 'EOD reconciliation runs list' })
  @ApiStandardErrors(401, 403)
  async getEodRuns(
    @Query() query: EodRunsQueryDto,
    @CurrentBookActor() actor: BookActor,
  ) {
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
    if (!isAdmin) {
      throw new ForbiddenException('Access denied: Platform Admin privileges required to view EOD reconciliation runs');
    }
    return this.reconciliationService.getEodReconciliationRuns(query, actor);
  }

  @Get('eod/runs/latest')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Get latest completed EOD reconciliation run',
    description: 'Admin only. Retrieves the most recent financial control report.',
  })
  @ApiQuery({ name: 'businessDate', required: false, type: String })
  @ApiSuccessResponse(undefined, { description: 'Latest EOD reconciliation run' })
  @ApiStandardErrors(401, 403, 404)
  async getLatestEodRun(
    @Query('businessDate') businessDate: string | undefined,
    @CurrentBookActor() actor: BookActor,
  ) {
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
    if (!isAdmin) {
      throw new ForbiddenException('Access denied: Platform Admin privileges required to view EOD reconciliation run');
    }
    return this.reconciliationService.getLatestEodRun(businessDate, actor);
  }

  @Get('eod/runs/:id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Get full details of a specific EOD reconciliation run by ID',
    description: 'Admin only. Retrieves full financial control summary, counts, and diagnostic discrepancies.',
  })
  @ApiSuccessResponse(undefined, { description: 'EOD reconciliation run detail' })
  @ApiStandardErrors(401, 403, 404)
  async getEodRunById(
    @Param('id') id: string,
    @CurrentBookActor() actor: BookActor,
  ) {
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
    if (!isAdmin) {
      throw new ForbiddenException('Access denied: Platform Admin privileges required to view EOD reconciliation run details');
    }
    return this.reconciliationService.getEodReconciliationRunById(id, actor);
  }
}

