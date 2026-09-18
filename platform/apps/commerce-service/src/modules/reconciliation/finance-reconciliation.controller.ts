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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Execute financial reconciliation run across Ledger, Wallet, Escrow, and Outbox',
    description: 'Admin only. Scans for accounting invariants, projection drifts, and lifecycle discrepancies.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reconciliation report with detailed diagnostic discrepancies',
    type: ReconciliationReportDto,
  })
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
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Rebuild LedgerAccountSummary projections from immutable LedgerEntry history',
    description: 'Admin only. Updates derived account summaries without modifying historical ledger or wallet entries.',
  })
  @ApiResponse({
    status: 200,
    description: 'Summary rebuild execution adjustments and status',
    type: SummaryRebuildResultDto,
  })
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
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Execute End-of-Day Financial Reconciliation run and persist immutable audit record',
    description: 'Admin only. Scans all finance invariants, analyzes clearing balances, and records immutable historical run.',
  })
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
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'List historical EOD reconciliation runs with summary statistics',
    description: 'Admin only. Retrieves historical immutable audit reports.',
  })
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
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Get latest completed EOD reconciliation run',
    description: 'Admin only. Retrieves the most recent financial control report.',
  })
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
  @ApiBearerAuth()
  @UseGuards(AuthenticatedGuard)
  @ApiOperation({
    summary: 'Get full details of a specific EOD reconciliation run by ID',
    description: 'Admin only. Retrieves full financial control summary, counts, and diagnostic discrepancies.',
  })
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

