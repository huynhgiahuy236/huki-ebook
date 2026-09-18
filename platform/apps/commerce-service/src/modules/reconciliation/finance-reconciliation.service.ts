import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  LedgerAccountType,
  LedgerEntryDirection,
  OrderStatus,
  PaymentStatus,
  SellerOrderStatus,
} from '../../../prisma/generated/client';
import { BookActor } from '../../common/book-auth.guard';
import { isDebitNormalAccount } from '../ledger/ledger.service';
import { PayoutDateUtil } from '../payout/utils/payout-date.util';
import {
  DiscrepancyType,
  EodReconciliationRunDto,
  EodReconciliationRunView,
  EodRunsQueryDto,
  FinancialDiscrepancyDto,
  FinanceControlSummaryView,
  RebuildSummaryQueryDto,
  ReconciliationQueryDto,
  ReconciliationReportDto,
  ReconciliationSeverity,
  SummaryRebuildAdjustmentDto,
  SummaryRebuildResultDto,
} from './dto/reconciliation.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class FinanceReconciliationService {
  private readonly logger = new Logger(FinanceReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute comprehensive financial reconciliation across Ledger, Wallet, Escrow, and Outbox
   * Follows strict DETECT and REPORT paradigm (zero raw data mutation)
   */
  async reconcile(
    query: ReconciliationQueryDto = {},
    actor?: BookActor,
  ): Promise<ReconciliationReportDto> {
    const startTime = Date.now();
    const runId = `REC-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;

    // 1. RBAC & Tenant Scoping Validation
    if (actor) {
      const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
      if (!isAdmin) {
        const actorStoreId = (actor as any).storeId;
        if (!actorStoreId || (query.storeId && query.storeId !== actorStoreId)) {
          throw new ForbiddenException(
            'Access denied: Merchants can only view reconciliation for their own verified store',
          );
        }
        // Force store scoping for merchant actor
        query.storeId = actorStoreId;
      }
    }

    const discrepancies: FinancialDiscrepancyDto[] = [];
    let totalChecked = 0;
    let totalMatched = 0;

    this.logger.log(`Starting financial reconciliation run ${runId} (storeId=${query.storeId || 'ALL'})`);

    // 2. Run Audit Checks
    // Check A: Double-Entry Ledger Invariant (WAL-002)
    const ledgerAudit = await this.auditLedgerDoubleEntry(query);
    discrepancies.push(...ledgerAudit.discrepancies);
    totalChecked += ledgerAudit.checked;
    totalMatched += ledgerAudit.matched;

    // Check B: Ledger Account Summary Projection Audit
    const summaryAudit = await this.auditLedgerAccountSummaries(query);
    discrepancies.push(...summaryAudit.discrepancies);
    totalChecked += summaryAudit.checked;
    totalMatched += summaryAudit.matched;

    // Check C: Wallet WAL-001 & Non-Negative Balance Audit
    const walletAudit = await this.auditWallets(query);
    discrepancies.push(...walletAudit.discrepancies);
    totalChecked += walletAudit.checked;
    totalMatched += walletAudit.matched;

    // Check D: Pending Balance Gross vs Net Invariant Audit
    const pendingAudit = await this.auditPendingBalances(query);
    discrepancies.push(...pendingAudit.discrepancies);
    totalChecked += pendingAudit.checked;
    totalMatched += pendingAudit.matched;

    // Check E: Available & Frozen Balance Audit with Integration Gap Detection
    const availableFrozenAudit = await this.auditAvailableAndFrozen(query);
    discrepancies.push(...availableFrozenAudit.discrepancies);
    totalChecked += availableFrozenAudit.checked;
    totalMatched += availableFrozenAudit.matched;

    // Check F: Payment Ingestion Lifecycle Audit
    const ingestionAudit = await this.auditPaymentIngestion(query);
    discrepancies.push(...ingestionAudit.discrepancies);
    totalChecked += ingestionAudit.checked;
    totalMatched += ingestionAudit.matched;

    // Check G: Settlement Lifecycle & Outbox Audit
    const settlementAudit = await this.auditSettlementLifecycle(query);
    discrepancies.push(...settlementAudit.discrepancies);
    totalChecked += settlementAudit.checked;
    totalMatched += settlementAudit.matched;

    // Check H: Multi-Tenant Dimension Validation
    const tenantAudit = await this.auditMultiTenantIsolation(query);
    discrepancies.push(...tenantAudit.discrepancies);
    totalChecked += tenantAudit.checked;
    totalMatched += tenantAudit.matched;

    // Check I: Payout Request Reservation & Compensating Reversal Audit (Task 76)
    const payoutAudit = await this.auditPayoutReservations(query);
    discrepancies.push(...payoutAudit.discrepancies);
    totalChecked += payoutAudit.checked;
    totalMatched += payoutAudit.matched;

    const durationMs = Date.now() - startTime;

    // 3. Aggregate Severity Breakdown
    const severityBreakdown = {
      info: discrepancies.filter((d) => d.severity === ReconciliationSeverity.INFO).length,
      warning: discrepancies.filter((d) => d.severity === ReconciliationSeverity.WARNING).length,
      error: discrepancies.filter((d) => d.severity === ReconciliationSeverity.ERROR).length,
      critical: discrepancies.filter((d) => d.severity === ReconciliationSeverity.CRITICAL).length,
    };

    let status: 'PASS' | 'PASS_WITH_WARNINGS' | 'FAIL' = 'PASS';
    if (severityBreakdown.critical > 0 || severityBreakdown.error > 0) {
      status = 'FAIL';
    } else if (severityBreakdown.warning > 0) {
      status = 'PASS_WITH_WARNINGS';
    }

    this.logger.log(
      `Reconciliation run ${runId} completed in ${durationMs}ms: status=${status}, checked=${totalChecked}, discrepancies=${discrepancies.length}`,
    );

    return {
      runId,
      executedAt: new Date(),
      durationMs,
      storeId: query.storeId,
      totalChecked,
      totalMatched,
      totalDiscrepancies: discrepancies.length,
      severityBreakdown,
      discrepancies,
      status,
    };
  }

  /**
   * Rebuild LedgerAccountSummary projections from immutable LedgerEntry history
   * Boundary: Modifies summary table ONLY; never touches LedgerTransaction, LedgerEntry, or Wallet
   */
  async rebuildAccountSummaries(
    query: RebuildSummaryQueryDto = {},
    actor?: BookActor,
  ): Promise<SummaryRebuildResultDto> {
    if (actor) {
      const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
      if (!isAdmin) {
        throw new ForbiddenException('Access denied: Only Platform Admins can trigger account summary rebuilds');
      }
    }

    const dryRun = !!query.dryRun;
    const storeIdFilter = query.storeId;

    this.logger.log(`Starting account summary rebuild (dryRun=${dryRun}, storeId=${storeIdFilter || 'ALL'})`);

    // 1. Fetch all immutable ledger entries
    const where: any = {};
    if (storeIdFilter) {
      where.storeId = storeIdFilter;
    }

    const entries = await this.prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    // 2. Aggregate entries by (accountType, storeId, currency)
    const aggregated = new Map<
      string,
      {
        accountType: LedgerAccountType;
        storeId: string;
        currency: string;
        totalDebits: Decimal;
        totalCredits: Decimal;
      }
    >();

    for (const entry of entries) {
      const storeIdKey = entry.storeId || '';
      const currencyKey = entry.currency || 'VND';
      const key = `${entry.accountType}::${storeIdKey}::${currencyKey}`;

      let acc = aggregated.get(key);
      if (!acc) {
        acc = {
          accountType: entry.accountType,
          storeId: storeIdKey,
          currency: currencyKey,
          totalDebits: new Decimal(0),
          totalCredits: new Decimal(0),
        };
        aggregated.set(key, acc);
      }

      const decAmount = new Decimal(entry.amount);
      if (entry.direction === LedgerEntryDirection.DEBIT) {
        acc.totalDebits = acc.totalDebits.add(decAmount);
      } else {
        acc.totalCredits = acc.totalCredits.add(decAmount);
      }
    }

    // 3. Fetch existing summaries to detect drift
    const existingSummaries = await this.prisma.ledgerAccountSummary.findMany({
      where: storeIdFilter ? { storeId: storeIdFilter } : {},
    });

    const existingMap = new Map<string, typeof existingSummaries[0]>();
    for (const s of existingSummaries) {
      const key = `${s.accountType}::${s.storeId || ''}::${s.currency}`;
      existingMap.set(key, s);
    }

    const adjustments: SummaryRebuildAdjustmentDto[] = [];
    let totalDriftCorrected = 0;

    for (const [key, calc] of aggregated.entries()) {
      const existing = existingMap.get(key);
      const debitNormal = isDebitNormalAccount(calc.accountType);
      const recomputedNet = debitNormal
        ? calc.totalDebits.sub(calc.totalCredits)
        : calc.totalCredits.sub(calc.totalDebits);

      const prevDebits = existing ? existing.totalDebits.toNumber() : 0;
      const prevCredits = existing ? existing.totalCredits.toNumber() : 0;
      const prevNet = existing ? existing.netBalance.toNumber() : 0;

      const hasDrift =
        !existing ||
        !existing.totalDebits.equals(calc.totalDebits) ||
        !existing.totalCredits.equals(calc.totalCredits) ||
        !existing.netBalance.equals(recomputedNet);

      if (hasDrift) {
        totalDriftCorrected++;
      }

      adjustments.push({
        accountType: calc.accountType,
        storeId: calc.storeId,
        currency: calc.currency,
        previousDebits: prevDebits,
        recomputedDebits: calc.totalDebits.toNumber(),
        previousCredits: prevCredits,
        recomputedCredits: calc.totalCredits.toNumber(),
        previousNetBalance: prevNet,
        recomputedNetBalance: recomputedNet.toNumber(),
        hasDrift,
      });

      // If NOT dryRun, update or create the summary row
      if (!dryRun) {
        await this.prisma.ledgerAccountSummary.upsert({
          where: {
            accountType_storeId_currency: {
              accountType: calc.accountType,
              storeId: calc.storeId,
              currency: calc.currency,
            },
          },
          update: {
            totalDebits: calc.totalDebits,
            totalCredits: calc.totalCredits,
            netBalance: recomputedNet,
          },
          create: {
            accountType: calc.accountType,
            storeId: calc.storeId,
            currency: calc.currency,
            totalDebits: calc.totalDebits,
            totalCredits: calc.totalCredits,
            netBalance: recomputedNet,
          },
        });
      }
    }

    // 4. Handle orphan/stale summaries that have 0 ledger entries
    for (const [key, existing] of existingMap.entries()) {
      if (!aggregated.has(key)) {
        const hasDrift =
          !existing.totalDebits.equals(0) ||
          !existing.totalCredits.equals(0) ||
          !existing.netBalance.equals(0);

        if (hasDrift) {
          totalDriftCorrected++;
        }

        adjustments.push({
          accountType: existing.accountType,
          storeId: existing.storeId || '',
          currency: existing.currency,
          previousDebits: existing.totalDebits.toNumber(),
          recomputedDebits: 0,
          previousCredits: existing.totalCredits.toNumber(),
          recomputedCredits: 0,
          previousNetBalance: existing.netBalance.toNumber(),
          recomputedNetBalance: 0,
          hasDrift,
        });

        if (!dryRun && hasDrift) {
          await this.prisma.ledgerAccountSummary.update({
            where: { id: existing.id },
            data: {
              totalDebits: new Decimal(0),
              totalCredits: new Decimal(0),
              netBalance: new Decimal(0),
            },
          });
        }
      }
    }

    this.logger.log(
      `Account summary rebuild completed: ${adjustments.length} audited, ${totalDriftCorrected} drift detected/corrected`,
    );

    return {
      dryRun,
      totalAccountsAudited: adjustments.length,
      totalDriftCorrected,
      adjustments,
      executedAt: new Date(),
    };
  }

  // =========================================================================
  // INTERNAL RECONCILIATION CHECK METHODS
  // =========================================================================

  /**
   * Check A: Audit Double-Entry Invariant (WAL-002) for LedgerTransactions across all batches
   */
  private async auditLedgerDoubleEntry(query: ReconciliationQueryDto): Promise<{
    checked: number;
    matched: number;
    discrepancies: FinancialDiscrepancyDto[];
  }> {
    const discrepancies: FinancialDiscrepancyDto[] = [];
    let checked = 0;
    let matched = 0;

    const isSellerAccount = (type: LedgerAccountType) =>
      type === LedgerAccountType.SELLER_PENDING ||
      type === LedgerAccountType.SELLER_AVAILABLE ||
      type === LedgerAccountType.SELLER_FROZEN;

    let currentCursor = query.cursor;
    const batchSize = query.batchSize || 100;
    let hasMore = true;

    while (hasMore) {
      const where: any = {};
      if (query.storeId) {
        where.storeId = query.storeId;
      }
      if (query.dateFrom || query.dateTo) {
        where.postedAt = {};
        if (query.dateFrom) where.postedAt.gte = new Date(query.dateFrom);
        if (query.dateTo) where.postedAt.lte = new Date(query.dateTo);
      }
      if (currentCursor) {
        where.id = { gt: currentCursor };
      }

      const transactions = await this.prisma.ledgerTransaction.findMany({
        where,
        take: batchSize,
        include: { entries: true },
        orderBy: { id: 'asc' },
      });

      if (transactions.length === 0) {
        break;
      }

      for (const tx of transactions) {
        checked++;
        const entries = tx.entries || [];

        // 1. Entries Count check
        if (entries.length < 2) {
          discrepancies.push({
            type: DiscrepancyType.INSUFFICIENT_ENTRIES,
            severity: ReconciliationSeverity.CRITICAL,
            entityType: 'LedgerTransaction',
            entityId: tx.id,
            storeId: tx.storeId || undefined,
            expected: 'At least 2 entries',
            actual: `${entries.length} entries`,
            details: `Transaction ${tx.transactionNumber} has fewer than 2 entries`,
            detectedAt: new Date(),
          });
          continue;
        }

        // 2. Sum(Debit) === Sum(Credit) check
        let sumDebit = new Decimal(0);
        let sumCredit = new Decimal(0);
        let hasInvalidAmount = false;
        let hasCurrencyMismatch = false;
        let hasMissingStoreDimension = false;

        for (const e of entries) {
          const dec = new Decimal(e.amount);
          if (dec.isNaN() || !dec.isFinite() || dec.lessThanOrEqualTo(0)) {
            hasInvalidAmount = true;
            discrepancies.push({
              type: DiscrepancyType.INVALID_ENTRY_AMOUNT,
              severity: ReconciliationSeverity.CRITICAL,
              entityType: 'LedgerEntry',
              entityId: e.id,
              storeId: e.storeId || undefined,
              expected: 'Positive Decimal amount > 0',
              actual: String(e.amount),
              details: `Entry ${e.id} in tx ${tx.transactionNumber} has non-positive or invalid amount`,
              detectedAt: new Date(),
            });
          }

          if (e.currency !== tx.currency) {
            hasCurrencyMismatch = true;
            discrepancies.push({
              type: DiscrepancyType.CURRENCY_MISMATCH,
              severity: ReconciliationSeverity.ERROR,
              entityType: 'LedgerEntry',
              entityId: e.id,
              storeId: e.storeId || undefined,
              expected: tx.currency,
              actual: e.currency,
              details: `Entry currency ${e.currency} does not match transaction currency ${tx.currency}`,
              detectedAt: new Date(),
            });
          }

          if (isSellerAccount(e.accountType) && (!e.storeId || e.storeId.trim() === '')) {
            hasMissingStoreDimension = true;
            discrepancies.push({
              type: DiscrepancyType.MISSING_STORE_DIMENSION,
              severity: ReconciliationSeverity.CRITICAL,
              entityType: 'LedgerEntry',
              entityId: e.id,
              storeId: undefined,
              expected: 'Valid storeId dimension',
              actual: 'null / empty',
              details: `Seller account entry ${e.accountType} lacks storeId dimension`,
              detectedAt: new Date(),
            });
          }

          if (e.direction === LedgerEntryDirection.DEBIT) {
            sumDebit = sumDebit.add(dec);
          } else if (e.direction === LedgerEntryDirection.CREDIT) {
            sumCredit = sumCredit.add(dec);
          }
        }

        if (!sumDebit.equals(sumCredit)) {
          discrepancies.push({
            type: DiscrepancyType.UNBALANCED_TRANSACTION,
            severity: ReconciliationSeverity.CRITICAL,
            entityType: 'LedgerTransaction',
            entityId: tx.id,
            storeId: tx.storeId || undefined,
            expected: `Sum(Debit) === Sum(Credit)`,
            actual: `Debit: ${sumDebit.toNumber()}, Credit: ${sumCredit.toNumber()}`,
            details: `Double-entry invariant violated for ${tx.transactionNumber}`,
            detectedAt: new Date(),
          });
        } else if (!hasInvalidAmount && !hasCurrencyMismatch && !hasMissingStoreDimension) {
          matched++;
        }
      }

      currentCursor = transactions[transactions.length - 1].id;
      if (transactions.length < batchSize || query.cursor !== undefined) {
        hasMore = false;
      }
    }

    // 3. Orphan entries check (Defensive data corruption check; FK constraint Restrict prevents creation under normal DB operations)
    const orphanEntries = await this.prisma.ledgerEntry.findMany({
      where: {
        ledgerTransaction: { is: null } as any,
      },
      take: 50,
    });

    for (const orphan of orphanEntries) {
      checked++;
      discrepancies.push({
        type: DiscrepancyType.ORPHAN_ENTRY,
        severity: ReconciliationSeverity.CRITICAL,
        entityType: 'LedgerEntry',
        entityId: orphan.id,
        storeId: orphan.storeId || undefined,
        expected: 'Valid parent LedgerTransaction',
        actual: 'No parent transaction found',
        details: `Orphan ledger entry detected with ID ${orphan.id}`,
        detectedAt: new Date(),
      });
    }

    return { checked, matched, discrepancies };
  }

  /**
   * Check B: Audit LedgerAccountSummary Projection against LedgerEntry recomputation
   */
  private async auditLedgerAccountSummaries(query: ReconciliationQueryDto): Promise<{
    checked: number;
    matched: number;
    discrepancies: FinancialDiscrepancyDto[];
  }> {
    const discrepancies: FinancialDiscrepancyDto[] = [];
    let checked = 0;
    let matched = 0;

    const where: any = {};
    if (query.storeId) {
      where.storeId = query.storeId;
    }

    const summaries = await this.prisma.ledgerAccountSummary.findMany({ where });

    for (const s of summaries) {
      checked++;
      const entries = await this.prisma.ledgerEntry.findMany({
        where: {
          accountType: s.accountType,
          storeId: s.storeId || null,
          currency: s.currency,
        },
      });

      let recomputedDebits = new Decimal(0);
      let recomputedCredits = new Decimal(0);

      for (const e of entries) {
        if (e.direction === LedgerEntryDirection.DEBIT) {
          recomputedDebits = recomputedDebits.add(new Decimal(e.amount));
        } else {
          recomputedCredits = recomputedCredits.add(new Decimal(e.amount));
        }
      }

      const debitNormal = isDebitNormalAccount(s.accountType);
      const recomputedNet = debitNormal
        ? recomputedDebits.sub(recomputedCredits)
        : recomputedCredits.sub(recomputedDebits);

      const isDebitsMatch = s.totalDebits.equals(recomputedDebits);
      const isCreditsMatch = s.totalCredits.equals(recomputedCredits);
      const isNetMatch = s.netBalance.equals(recomputedNet);

      if (!isDebitsMatch || !isCreditsMatch || !isNetMatch) {
        discrepancies.push({
          type: DiscrepancyType.SUMMARY_PROJECTION_DRIFT,
          severity: ReconciliationSeverity.WARNING,
          entityType: 'LedgerAccountSummary',
          entityId: s.id,
          storeId: s.storeId || undefined,
          expected: `Debits: ${recomputedDebits.toNumber()}, Credits: ${recomputedCredits.toNumber()}, Net: ${recomputedNet.toNumber()}`,
          actual: `Debits: ${s.totalDebits.toNumber()}, Credits: ${s.totalCredits.toNumber()}, Net: ${s.netBalance.toNumber()}`,
          details: `Summary projection drift for ${s.accountType} in store ${s.storeId || 'GLOBAL'}`,
          detectedAt: new Date(),
        });
      } else {
        matched++;
      }
    }

    return { checked, matched, discrepancies };
  }

  /**
   * Check C: Audit Wallet WAL-001 Invariant & Non-Negative Balances
   * Invariant: availableBalance >= 0, pendingBalance >= 0, frozenBalance >= 0, and historical reconstruction
   */
  private async auditWallets(query: ReconciliationQueryDto): Promise<{
    checked: number;
    matched: number;
    discrepancies: FinancialDiscrepancyDto[];
  }> {
    const discrepancies: FinancialDiscrepancyDto[] = [];
    let checked = 0;
    let matched = 0;

    const where: any = {};
    if (query.storeId) {
      where.storeId = query.storeId;
    }

    const wallets = await this.prisma.wallet.findMany({ where });

    for (const w of wallets) {
      checked++;
      const avail = new Decimal(w.availableBalance);
      const pend = new Decimal(w.pendingBalance);
      const froz = new Decimal(w.frozenBalance);

      // 1. Non-negative checks (WAL-001 fundamental constraint)
      if (avail.isNegative() || pend.isNegative() || froz.isNegative()) {
        discrepancies.push({
          type: DiscrepancyType.NEGATIVE_BALANCE,
          severity: ReconciliationSeverity.CRITICAL,
          entityType: 'Wallet',
          entityId: w.id,
          storeId: w.storeId,
          expected: 'Non-negative balance for all tiers (Available >= 0, Pending >= 0, Frozen >= 0)',
          actual: `Available=${avail.toNumber()}, Pending=${pend.toNumber()}, Frozen=${froz.toNumber()}`,
          details: `Wallet for store ${w.storeId} contains negative balance values`,
          detectedAt: new Date(),
        });
      }

      // 2. Historical Transaction Reconstruction Audit
      const txs = await this.prisma.walletTransaction.findMany({
        where: { walletId: w.id },
        orderBy: { createdAt: 'asc' },
      });

      if (txs.length > 0) {
        const lastTx = txs[txs.length - 1];
        const lastAvail = new Decimal(lastTx.availableAfter);
        const lastPend = new Decimal(lastTx.pendingAfter);
        const lastFroz = new Decimal(lastTx.frozenAfter);

        if (!avail.equals(lastAvail) || !pend.equals(lastPend) || !froz.equals(lastFroz)) {
          discrepancies.push({
            type: DiscrepancyType.WALLET_TX_HISTORY_MISMATCH,
            severity: ReconciliationSeverity.ERROR,
            entityType: 'Wallet',
            entityId: w.id,
            storeId: w.storeId,
            expected: `History: Avail=${lastAvail.toNumber()}, Pend=${lastPend.toNumber()}, Froz=${lastFroz.toNumber()}`,
            actual: `Current: Avail=${avail.toNumber()}, Pend=${pend.toNumber()}, Froz=${froz.toNumber()}`,
            details: `Wallet balances diverge from latest recorded WalletTransaction history`,
            detectedAt: new Date(),
          });
        } else {
          matched++;
        }
      } else {
        // Zero balance without history is normal initial state
        if (avail.isZero() && pend.isZero() && froz.isZero()) {
          matched++;
        } else {
          discrepancies.push({
            type: DiscrepancyType.AUDITABILITY_GAP,
            severity: ReconciliationSeverity.WARNING,
            entityType: 'Wallet',
            entityId: w.id,
            storeId: w.storeId,
            expected: 'WalletTransaction history exists for non-zero wallet',
            actual: '0 transactions recorded',
            details: `AUDITABILITY_LIMITATION: INCOMPLETE_WALLET_TX_HISTORY for non-zero wallet in store ${w.storeId}`,
            detectedAt: new Date(),
          });
        }
      }
    }

    return { checked, matched, discrepancies };
  }

  /**
   * Check D: Audit Pending Balance Gross vs Net Invariant (POL-14 / POL-15)
   * Gross Custodial Liability (Ledger SELLER_PENDING) vs Net Seller Proceeds (Wallet pendingBalance)
   */
  private async auditPendingBalances(query: ReconciliationQueryDto): Promise<{
    checked: number;
    matched: number;
    discrepancies: FinancialDiscrepancyDto[];
  }> {
    const discrepancies: FinancialDiscrepancyDto[] = [];
    let checked = 0;
    let matched = 0;

    const walletWhere: any = {};
    if (query.storeId) {
      walletWhere.storeId = query.storeId;
    }

    const wallets = await this.prisma.wallet.findMany({ where: walletWhere });
    const storeIds = Array.from(new Set(wallets.map((w) => w.storeId)));
    if (query.storeId && !storeIds.includes(query.storeId)) {
      storeIds.push(query.storeId);
    }

    for (const storeId of storeIds) {
      checked++;
      const wallet = await this.prisma.wallet.findUnique({ where: { storeId } });
      const walletPending = wallet && wallet.pendingBalance !== undefined && wallet.pendingBalance !== null
        ? new Decimal(wallet.pendingBalance)
        : new Decimal(0);

      const sellerOrders = await this.prisma.sellerOrder.findMany({
        where: { storeId },
        include: {
          order: {
            include: {
              statusHistory: true,
            },
          },
        },
      });

      // Find active unsettled SellerOrders for this store
      let expectedNetPendingSum = new Decimal(0);
      let grossLiabilitySum = new Decimal(0);

      for (const so of sellerOrders) {
        const order = so.order;
        if (!order) continue;

        // Active unsettled conditions: Payment succeeded, not cancelled/refunded, not ESCROW_RELEASED
        const isPaid =
          order.paymentStatus === PaymentStatus.SUCCEEDED ||
          (order.paymentMethod === 'COD' && order.status === OrderStatus.COMPLETED);
        const isCancelled =
          order.status === OrderStatus.CANCELLED ||
          order.status === OrderStatus.REFUNDED ||
          so.status === SellerOrderStatus.CANCELLED;
        const isSettled = order.statusHistory?.some(
          (h) => h.toStatus === 'ESCROW_RELEASED' && (!h.sellerOrderId || h.sellerOrderId === so.id),
        );

        if (isPaid && !isCancelled && !isSettled) {
          const grandTotal = new Decimal(so.grandTotal);
          grossLiabilitySum = grossLiabilitySum.add(grandTotal);

          // Extract historical calculation metadata from order status history or compute safely
          const ingestHistory = order.statusHistory?.find(
            (h) => h.toStatus === 'ESCROW_INGESTED' && (!h.sellerOrderId || h.sellerOrderId === so.id),
          );

          if (ingestHistory?.metadata && (ingestHistory.metadata as any).sellerNet !== undefined) {
            expectedNetPendingSum = expectedNetPendingSum.add(
              new Decimal((ingestHistory.metadata as any).sellerNet),
            );
          } else {
            // Default 85/15 calculation formula as defined in Task 72
            const commission = grandTotal.mul(new Decimal(0.15)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
            const net = grandTotal.sub(commission);
            expectedNetPendingSum = expectedNetPendingSum.add(net);
          }
        }
      }

      // Reconcile Wallet pendingBalance vs Expected Net Pending Sum
      if (!walletPending.equals(expectedNetPendingSum)) {
        discrepancies.push({
          type: DiscrepancyType.PENDING_GROSS_NET_MISMATCH,
          severity: ReconciliationSeverity.ERROR,
          entityType: 'Wallet',
          entityId: wallet?.id || storeId,
          storeId,
          expected: `Expected Net Pending: ${expectedNetPendingSum.toNumber()} VND`,
          actual: `Recorded Wallet Pending: ${walletPending.toNumber()} VND`,
          details: `Store ${storeId} wallet pending balance diverges from expected unsettled sub-orders net proceeds`,
          detectedAt: new Date(),
        });
      } else {
        matched++;
      }
    }

    return { checked, matched, discrepancies };
  }

  /**
   * Check E: Available & Frozen Balance Audit with Integration Gap Detection
   */
  private async auditAvailableAndFrozen(query: ReconciliationQueryDto): Promise<{
    checked: number;
    matched: number;
    discrepancies: FinancialDiscrepancyDto[];
  }> {
    const discrepancies: FinancialDiscrepancyDto[] = [];
    let checked = 0;
    let matched = 0;

    const walletWhere: any = {};
    if (query.storeId) {
      walletWhere.storeId = query.storeId;
    }

    const wallets = await this.prisma.wallet.findMany({ where: walletWhere });
    const storeIds = Array.from(new Set(wallets.map((w) => w.storeId)));
    if (query.storeId && !storeIds.includes(query.storeId)) {
      storeIds.push(query.storeId);
    }

    for (const storeId of storeIds) {
      checked++;
      const wallet = await this.prisma.wallet.findUnique({ where: { storeId } });
      if (!wallet) continue;

      // Available Balance check vs SELLER_AVAILABLE account summary
      const availSummary = await this.prisma.ledgerAccountSummary.findUnique({
        where: {
          accountType_storeId_currency: {
            accountType: LedgerAccountType.SELLER_AVAILABLE,
            storeId,
            currency: 'VND',
          },
        },
      });

      const ledgerAvail = availSummary ? availSummary.netBalance : new Decimal(0);
      const walletAvail = wallet && wallet.availableBalance !== undefined && wallet.availableBalance !== null
        ? new Decimal(wallet.availableBalance)
        : new Decimal(0);

      if (!walletAvail.equals(ledgerAvail)) {
        discrepancies.push({
          type: DiscrepancyType.ACCOUNTING_INTEGRATION_GAP,
          severity: ReconciliationSeverity.WARNING,
          entityType: 'Wallet',
          entityId: wallet.id,
          storeId,
          expected: `Ledger SELLER_AVAILABLE: ${ledgerAvail.toNumber()} VND`,
          actual: `Wallet Available: ${walletAvail.toNumber()} VND`,
          details: `Discrepancy between Wallet Available and Ledger SELLER_AVAILABLE (potentially unmirrored wallet debits/freeze)`,
          detectedAt: new Date(),
        });
      } else {
        matched++;
      }

      // Frozen Balance check vs SELLER_FROZEN account summary
      const frozenSummary = await this.prisma.ledgerAccountSummary.findUnique({
        where: {
          accountType_storeId_currency: {
            accountType: LedgerAccountType.SELLER_FROZEN,
            storeId,
            currency: 'VND',
          },
        },
      });

      const ledgerFrozen = frozenSummary ? frozenSummary.netBalance : new Decimal(0);
      const walletFrozen = wallet && wallet.frozenBalance !== undefined && wallet.frozenBalance !== null
        ? new Decimal(wallet.frozenBalance)
        : new Decimal(0);

      if (!walletFrozen.equals(ledgerFrozen)) {
        discrepancies.push({
          type: DiscrepancyType.ACCOUNTING_INTEGRATION_GAP,
          severity: ReconciliationSeverity.WARNING,
          entityType: 'Wallet',
          entityId: wallet.id,
          storeId,
          expected: `Ledger SELLER_FROZEN: ${ledgerFrozen.toNumber()} VND`,
          actual: `Wallet Frozen: ${walletFrozen.toNumber()} VND`,
          details: `Discrepancy between Wallet Frozen and Ledger SELLER_FROZEN (dispute freeze ledger integration gap)`,
          detectedAt: new Date(),
        });
      }
    }

    return { checked, matched, discrepancies };
  }

  /**
   * Check F: Audit Payment Ingestion Lifecycle (Payment -> ESCROW_INGEST -> CREDIT_PENDING) across all batches
   */
  private async auditPaymentIngestion(query: ReconciliationQueryDto): Promise<{
    checked: number;
    matched: number;
    discrepancies: FinancialDiscrepancyDto[];
  }> {
    const discrepancies: FinancialDiscrepancyDto[] = [];
    let checked = 0;
    let matched = 0;

    let currentCursor: string | undefined = undefined;
    const batchSize = query.batchSize || 100;
    let hasMore = true;

    while (hasMore) {
      const where: any = {
        paymentStatus: PaymentStatus.SUCCEEDED,
      };
      if (query.dateFrom || query.dateTo) {
        where.createdAt = {};
        if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
        if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
      }
      if (currentCursor) {
        where.id = { gt: currentCursor };
      }

      const orders = await this.prisma.order.findMany({
        where,
        include: { sellerOrders: true },
        take: batchSize,
        orderBy: { id: 'asc' },
      });

      if (orders.length === 0) {
        break;
      }

      for (const order of orders) {
        for (const so of order.sellerOrders) {
          if (query.storeId && so.storeId !== query.storeId) continue;
          checked++;

          // 1. Check Ledger ESCROW_INGEST transaction
          const ingestTx = await this.prisma.ledgerTransaction.findUnique({
            where: { idempotencyKey: `ESCROW_INGEST:${so.id}` },
          });

          if (!ingestTx) {
            discrepancies.push({
              type: DiscrepancyType.MISSING_PAYMENT_INGESTION,
              severity: ReconciliationSeverity.ERROR,
              entityType: 'SellerOrder',
              entityId: so.id,
              storeId: so.storeId,
              expected: `Ledger ESCROW_INGEST:${so.id} transaction exists`,
              actual: 'Missing ledger transaction',
              details: `Succeeded payment for sub-order ${so.code} lacks opening ESCROW_INGEST ledger record`,
              detectedAt: new Date(),
            });
            continue;
          }

          // 2. Check Wallet CREDIT_PENDING transaction
          const walletTx = await this.prisma.walletTransaction.findFirst({
            where: {
              referenceType: 'ORDER_ESCROW',
              referenceId: so.id,
            },
          });

          if (!walletTx) {
            discrepancies.push({
              type: DiscrepancyType.MISSING_PENDING_WALLET_CREDIT,
              severity: ReconciliationSeverity.ERROR,
              entityType: 'WalletTransaction',
              entityId: so.id,
              storeId: so.storeId,
              expected: `WalletTransaction ORDER_ESCROW:${so.id} exists`,
              actual: 'Missing wallet transaction',
              details: `Sub-order ${so.code} has ledger ingestion but lacks wallet pending credit`,
              detectedAt: new Date(),
            });
          } else {
            matched++;
          }
        }
      }

      currentCursor = orders[orders.length - 1].id;
      if (orders.length < batchSize || query.cursor !== undefined) {
        hasMore = false;
      }
    }

    return { checked, matched, discrepancies };
  }

  /**
   * Check G: Audit Settlement Lifecycle (ESCROW_RELEASED -> SETTLEMENT Ledger -> Wallet Available -> Outbox) across all batches
   */
  private async auditSettlementLifecycle(query: ReconciliationQueryDto): Promise<{
    checked: number;
    matched: number;
    discrepancies: FinancialDiscrepancyDto[];
  }> {
    const discrepancies: FinancialDiscrepancyDto[] = [];
    let checked = 0;
    let matched = 0;

    let currentCursor: string | undefined = undefined;
    const batchSize = query.batchSize || 100;
    let hasMore = true;

    while (hasMore) {
      const soWhere: any = {};
      if (query.storeId) {
        soWhere.storeId = query.storeId;
      }
      if (currentCursor) {
        soWhere.id = { gt: currentCursor };
      }

      const sellerOrders = await this.prisma.sellerOrder.findMany({
        where: soWhere,
        include: {
          order: {
            include: { statusHistory: true },
          },
        },
        take: batchSize,
        orderBy: { id: 'asc' },
      });

      if (sellerOrders.length === 0) {
        break;
      }

      for (const so of sellerOrders) {
        const order = so.order;
        if (!order) continue;

        const isReleased = order.statusHistory?.some(
          (h) => h.toStatus === 'ESCROW_RELEASED' && (!h.sellerOrderId || h.sellerOrderId === so.id),
        );

        const settlementLedgerTx = await this.prisma.ledgerTransaction.findUnique({
          where: { idempotencyKey: `SETTLEMENT:${so.id}` },
        });

        if (isReleased) {
          checked++;

          // 1. Check Settlement Ledger Tx
          if (!settlementLedgerTx) {
            discrepancies.push({
              type: DiscrepancyType.SETTLEMENT_WITHOUT_LEDGER,
              severity: ReconciliationSeverity.CRITICAL,
              entityType: 'SellerOrder',
              entityId: so.id,
              storeId: so.storeId,
              expected: `SETTLEMENT:${so.id} ledger transaction exists`,
              actual: 'Missing settlement ledger record',
              details: `Sub-order ${so.code} marked ESCROW_RELEASED without ledger settlement transaction`,
              detectedAt: new Date(),
            });
          }

          // 2. Check Wallet Settlement Transition
          const walletSettlementTx = await this.prisma.walletTransaction.findFirst({
            where: {
              referenceType: 'SETTLEMENT',
              referenceId: so.id,
            },
          });

          if (!walletSettlementTx) {
            discrepancies.push({
              type: DiscrepancyType.SETTLEMENT_WITHOUT_WALLET,
              severity: ReconciliationSeverity.ERROR,
              entityType: 'WalletTransaction',
              entityId: so.id,
              storeId: so.storeId,
              expected: `SETTLEMENT wallet transaction exists for ${so.id}`,
              actual: 'Missing wallet settlement transaction',
              details: `Sub-order ${so.code} settled on ledger but missing MOVE_PENDING_TO_AVAILABLE wallet movement`,
              detectedAt: new Date(),
            });
          }

          // 3. Check Outbox Event
          const outboxEvent = await this.prisma.outboxEvent.findFirst({
            where: {
              type: 'SETTLEMENT_COMPLETED',
              aggregateId: so.id,
            },
          });

          if (!outboxEvent) {
            discrepancies.push({
              type: DiscrepancyType.MISSING_OUTBOX_EVENT,
              severity: ReconciliationSeverity.WARNING,
              entityType: 'OutboxEvent',
              entityId: so.id,
              storeId: so.storeId,
              expected: `SETTLEMENT_COMPLETED outbox event exists for ${so.id}`,
              actual: 'Missing outbox event',
              details: `Settlement for sub-order ${so.code} lacks SETTLEMENT_COMPLETED event`,
              detectedAt: new Date(),
            });
          }

          if (settlementLedgerTx) {
            // Check historical calculation metadata: commissionBasis, commissionPercent, platformCommission, sellerNet
            const meta = (settlementLedgerTx.metadata as any) || {};
            const hasCalculationMetadata =
              meta.platformCommission !== undefined ||
              meta.commissionPercent !== undefined ||
              meta.commissionBasis !== undefined;

            if (!hasCalculationMetadata) {
              discrepancies.push({
                type: DiscrepancyType.AUDITABILITY_GAP,
                severity: ReconciliationSeverity.WARNING,
                entityType: 'LedgerTransaction',
                entityId: settlementLedgerTx.id,
                storeId: so.storeId,
                expected: `Persisted historical calculation metadata (commissionBasis, commissionPercent, platformCommission, sellerNet) on LedgerTransaction ${settlementLedgerTx.id}`,
                actual: 'Missing historical calculation metadata',
                details: `Settlement transaction for sub-order ${so.code} lacks persisted calculation metadata. Dynamic PolicyConfig fallback is intentionally omitted to preserve historical truth.`,
                detectedAt: new Date(),
              });
            }
          }

          if (settlementLedgerTx && walletSettlementTx && outboxEvent) {
            matched++;
          }
        } else if (settlementLedgerTx) {
          checked++;
          // Ledger settlement exists but ESCROW_RELEASED status missing
          discrepancies.push({
            type: DiscrepancyType.LEDGER_SETTLEMENT_WITHOUT_STATUS,
            severity: ReconciliationSeverity.ERROR,
            entityType: 'SellerOrder',
            entityId: so.id,
            storeId: so.storeId,
            expected: `ESCROW_RELEASED status history entry exists for ${so.id}`,
            actual: 'Missing status history record',
            details: `Sub-order ${so.code} has settlement ledger transaction but no ESCROW_RELEASED status history`,
            detectedAt: new Date(),
          });
        }
      }

      currentCursor = sellerOrders[sellerOrders.length - 1].id;
      if (sellerOrders.length < batchSize || query.cursor !== undefined) {
        hasMore = false;
      }
    }

    return { checked, matched, discrepancies };
  }

  /**
   * Check H: Audit Multi-Tenant Isolation & Cross-Store Contamination across all batches
   */
  private async auditMultiTenantIsolation(query: ReconciliationQueryDto): Promise<{
    checked: number;
    matched: number;
    discrepancies: FinancialDiscrepancyDto[];
  }> {
    const discrepancies: FinancialDiscrepancyDto[] = [];
    let checked = 0;
    let matched = 0;

    let currentCursor: string | undefined = undefined;
    const batchSize = query.batchSize || 100;
    let hasMore = true;

    while (hasMore) {
      const where: any = {};
      if (query.storeId) {
        where.storeId = query.storeId;
      }
      if (currentCursor) {
        where.id = { gt: currentCursor };
      }

      const txs = await this.prisma.ledgerTransaction.findMany({
        where,
        include: { entries: true },
        take: batchSize,
        orderBy: { id: 'asc' },
      });

      if (txs.length === 0) {
        break;
      }

      for (const tx of txs) {
        checked++;
        let hasCrossStore = false;

        if (tx.storeId) {
          for (const e of tx.entries) {
            if (e.storeId && e.storeId !== tx.storeId) {
              hasCrossStore = true;
              discrepancies.push({
                type: DiscrepancyType.CROSS_STORE_CONTAMINATION,
                severity: ReconciliationSeverity.CRITICAL,
                entityType: 'LedgerEntry',
                entityId: e.id,
                storeId: e.storeId,
                expected: `Entry storeId matching transaction header storeId (${tx.storeId})`,
                actual: `Contaminated entry storeId: ${e.storeId}`,
                details: `Cross-store contamination detected in ledger transaction ${tx.transactionNumber}`,
                detectedAt: new Date(),
              });
            }
          }
        }

        if (!hasCrossStore) {
          matched++;
        }
      }

      currentCursor = txs[txs.length - 1].id;
      if (txs.length < batchSize || query.cursor !== undefined) {
        hasMore = false;
      }
    }

    return { checked, matched, discrepancies };
  }

  /**
   * Check I: Audit Payout Request Reservations & Compensating Reversals (Task 76)
   * Ensures every PENDING / APPROVED payout has matching Wallet & balanced Ledger reservation.
   * Ensures every REJECTED payout has matching Wallet & balanced Ledger release/reversal.
   */
  private async auditPayoutReservations(query: ReconciliationQueryDto): Promise<{
    checked: number;
    matched: number;
    discrepancies: FinancialDiscrepancyDto[];
  }> {
    const discrepancies: FinancialDiscrepancyDto[] = [];
    let checked = 0;
    let matched = 0;

    let currentCursor: string | undefined = undefined;
    const batchSize = query.batchSize || 100;
    let hasMore = true;

    while (hasMore) {
      const where: any = {};
      if (query.storeId) {
        where.storeId = query.storeId;
      }
      if (query.dateFrom || query.dateTo) {
        where.createdAt = {};
        if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
        if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
      }
      if (currentCursor) {
        where.id = { gt: currentCursor };
      }

      const payouts = await (this.prisma as any).payoutRequest.findMany({
        where,
        take: batchSize,
        orderBy: { id: 'asc' },
      });

      if (!payouts || payouts.length === 0) {
        break;
      }

      for (const po of payouts) {
        checked++;
        const poAmount = new Decimal(po.amount);
        let hasIssue = false;

        if (
          po.status === 'PENDING' ||
          po.status === 'APPROVED' ||
          po.status === 'PROCESSING' ||
          po.status === 'FAILED'
        ) {
          // 1. Audit Wallet Reservation Transaction
          const walletResTx = await this.prisma.walletTransaction.findFirst({
            where: {
              walletId: po.walletId,
              referenceType: 'PAYOUT_REQUEST',
              referenceId: po.id,
              type: 'MOVE_AVAILABLE_TO_FROZEN' as any,
            },
          });

          if (!walletResTx) {
            hasIssue = true;
            discrepancies.push({
              type: DiscrepancyType.PAYOUT_MISSING_WALLET_RESERVATION,
              severity: ReconciliationSeverity.CRITICAL,
              entityType: 'PayoutRequest',
              entityId: po.id,
              storeId: po.storeId,
              expected: `Wallet reservation MOVE_AVAILABLE_TO_FROZEN for payout ${po.id}`,
              actual: 'Missing WalletTransaction reservation record',
              details: `Active/processing payout request ${po.id} has no corresponding wallet fund reservation`,
              detectedAt: new Date(),
            });
          } else if (!new Decimal(walletResTx.amount).equals(poAmount)) {
            hasIssue = true;
            discrepancies.push({
              type: DiscrepancyType.PAYOUT_RESERVATION_MISMATCH,
              severity: ReconciliationSeverity.ERROR,
              entityType: 'PayoutRequest',
              entityId: po.id,
              storeId: po.storeId,
              expected: `Wallet reservation amount ${poAmount.toString()}`,
              actual: `WalletTransaction amount ${walletResTx.amount}`,
              details: `Amount mismatch between payout request and wallet reservation transaction`,
              detectedAt: new Date(),
            });
          }

          // 2. Audit Ledger Reservation Transaction
          const ledgerResTx = await this.prisma.ledgerTransaction.findFirst({
            where: {
              referenceType: 'PAYOUT_REQUEST',
              referenceId: po.id,
            },
            include: { entries: true },
          });

          if (!ledgerResTx) {
            hasIssue = true;
            discrepancies.push({
              type: DiscrepancyType.PAYOUT_MISSING_LEDGER_RESERVATION,
              severity: ReconciliationSeverity.CRITICAL,
              entityType: 'PayoutRequest',
              entityId: po.id,
              storeId: po.storeId,
              expected: `Double-entry ledger journal for payout reservation ${po.id}`,
              actual: 'Missing LedgerTransaction record',
              details: `Active/processing payout request ${po.id} has no corresponding ledger journal reservation`,
              detectedAt: new Date(),
            });
          } else {
            // Verify balanced entries: DEBIT SELLER_AVAILABLE & CREDIT SELLER_FROZEN
            const debitAvailable = ledgerResTx.entries.find(
              (e) => e.accountType === LedgerAccountType.SELLER_AVAILABLE && e.direction === LedgerEntryDirection.DEBIT,
            );
            const creditFrozen = ledgerResTx.entries.find(
              (e) => e.accountType === LedgerAccountType.SELLER_FROZEN && e.direction === LedgerEntryDirection.CREDIT,
            );

            if (!debitAvailable || !creditFrozen || !new Decimal(debitAvailable.amount).equals(poAmount)) {
              hasIssue = true;
              discrepancies.push({
                type: DiscrepancyType.PAYOUT_RESERVATION_MISMATCH,
                severity: ReconciliationSeverity.ERROR,
                entityType: 'LedgerTransaction',
                entityId: ledgerResTx.id,
                storeId: po.storeId,
                expected: `Balanced DEBIT SELLER_AVAILABLE & CREDIT SELLER_FROZEN with amount ${poAmount.toString()}`,
                actual: 'Unbalanced or mismatched ledger entries for payout reservation',
                details: `Ledger reservation entries do not match expected payout reservation structure for ${po.id}`,
                detectedAt: new Date(),
              });
            }
          }
        } else if (po.status === 'COMPLETED') {
          // 3. Audit Disbursed Payout: Must have DEBIT_FROZEN in Wallet & PAYOUT_CLEARING in Ledger
          const walletDisbTx = await this.prisma.walletTransaction.findFirst({
            where: {
              walletId: po.walletId,
              referenceType: 'PAYOUT_DISBURSEMENT',
              referenceId: po.id,
              type: 'DEBIT_FROZEN' as any,
            },
          });

          if (!walletDisbTx) {
            hasIssue = true;
            discrepancies.push({
              type: DiscrepancyType.PAYOUT_MISSING_DISBURSEMENT_WALLET,
              severity: ReconciliationSeverity.CRITICAL,
              entityType: 'PayoutRequest',
              entityId: po.id,
              storeId: po.storeId,
              expected: `Wallet transaction DEBIT_FROZEN for completed payout ${po.id}`,
              actual: 'Missing DEBIT_FROZEN wallet transaction',
              details: `Completed payout ${po.id} has no record of frozen balance debit`,
              detectedAt: new Date(),
            });
          } else if (!new Decimal(walletDisbTx.amount).equals(poAmount)) {
            hasIssue = true;
            discrepancies.push({
              type: DiscrepancyType.PAYOUT_DISBURSEMENT_MISMATCH,
              severity: ReconciliationSeverity.ERROR,
              entityType: 'PayoutRequest',
              entityId: po.id,
              storeId: po.storeId,
              expected: `Wallet disbursement amount ${poAmount.toString()}`,
              actual: `WalletTransaction amount ${walletDisbTx.amount}`,
              details: `Disbursement amount mismatch in wallet transaction for completed payout ${po.id}`,
              detectedAt: new Date(),
            });
          }

          const ledgerDisbTx = await this.prisma.ledgerTransaction.findFirst({
            where: {
              referenceType: 'PAYOUT_DISBURSEMENT',
              referenceId: po.id,
            },
            include: { entries: true },
          });

          if (!ledgerDisbTx) {
            hasIssue = true;
            discrepancies.push({
              type: DiscrepancyType.PAYOUT_MISSING_DISBURSEMENT_LEDGER,
              severity: ReconciliationSeverity.CRITICAL,
              entityType: 'PayoutRequest',
              entityId: po.id,
              storeId: po.storeId,
              expected: `Ledger transaction for completed payout ${po.id}`,
              actual: 'Missing disbursement LedgerTransaction record',
              details: `Completed payout ${po.id} has no double-entry ledger journal`,
              detectedAt: new Date(),
            });
          } else {
            const debitFrozen = ledgerDisbTx.entries.find(
              (e) => e.accountType === LedgerAccountType.SELLER_FROZEN && e.direction === LedgerEntryDirection.DEBIT,
            );
            const creditClearing = ledgerDisbTx.entries.find(
              (e) => e.accountType === LedgerAccountType.PAYOUT_CLEARING && e.direction === LedgerEntryDirection.CREDIT,
            );

            if (!debitFrozen || !creditClearing || !new Decimal(debitFrozen.amount).equals(poAmount)) {
              hasIssue = true;
              discrepancies.push({
                type: DiscrepancyType.PAYOUT_DISBURSEMENT_MISMATCH,
                severity: ReconciliationSeverity.ERROR,
                entityType: 'LedgerTransaction',
                entityId: ledgerDisbTx.id,
                storeId: po.storeId,
                expected: `Balanced DEBIT SELLER_FROZEN & CREDIT PAYOUT_CLEARING with amount ${poAmount.toString()}`,
                actual: 'Unbalanced or mismatched ledger disbursement entries',
                details: `Ledger entries do not match expected payout clearing structure for ${po.id}`,
                detectedAt: new Date(),
              });
            }
          }
        } else if (po.status === 'REJECTED') {
          // 4. Audit Reversal / Fund Release for REJECTED payout
          const walletReleaseTx = await this.prisma.walletTransaction.findFirst({
            where: {
              walletId: po.walletId,
              referenceType: { in: ['PAYOUT_REJECTION', 'PAYOUT_CANCEL_REFUND'] },
              referenceId: po.id,
              type: 'MOVE_FROZEN_TO_AVAILABLE' as any,
            },
          });

          if (!walletReleaseTx) {
            hasIssue = true;
            discrepancies.push({
              type: DiscrepancyType.PAYOUT_REJECTION_RELEASE_MISMATCH,
              severity: ReconciliationSeverity.CRITICAL,
              entityType: 'PayoutRequest',
              entityId: po.id,
              storeId: po.storeId,
              expected: `Compensating wallet release MOVE_FROZEN_TO_AVAILABLE for rejected/cancelled payout ${po.id}`,
              actual: 'Missing wallet release transaction for rejected/cancelled payout',
              details: `Rejected/cancelled payout request ${po.id} has no corresponding fund release transaction`,
              detectedAt: new Date(),
            });
          }

          const ledgerReleaseTx = await this.prisma.ledgerTransaction.findFirst({
            where: {
              referenceType: { in: ['PAYOUT_REJECTION', 'PAYOUT_CANCEL_REFUND'] },
              referenceId: po.id,
            },
            include: { entries: true },
          });

          if (!ledgerReleaseTx) {
            hasIssue = true;
            discrepancies.push({
              type: DiscrepancyType.PAYOUT_REJECTION_RELEASE_MISMATCH,
              severity: ReconciliationSeverity.ERROR,
              entityType: 'PayoutRequest',
              entityId: po.id,
              storeId: po.storeId,
              expected: `Compensating ledger journal for rejected/cancelled payout ${po.id}`,
              actual: 'Missing ledger reversal transaction for rejected/cancelled payout',
              details: `Rejected/cancelled payout request ${po.id} has no corresponding ledger release entry`,
              detectedAt: new Date(),
            });
          }
        }

        if (!hasIssue) {
          matched++;
        }
      }

      currentCursor = payouts[payouts.length - 1].id;
      if (payouts.length < batchSize || query.cursor !== undefined) {
        hasMore = false;
      }
    }

    return { checked, matched, discrepancies };
  }

  /**
   * Run End-of-Day Financial Reconciliation and persist immutable audit report (Task 78)
   */
  async runEodReconciliation(
    dto: EodReconciliationRunDto = {},
    actor: BookActor,
  ): Promise<EodReconciliationRunView> {
    const startTime = Date.now();
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
    if (!isAdmin) {
      throw new ForbiddenException(
        'Access denied: Platform Admin privileges required to execute EOD financial reconciliation',
      );
    }

    // 1. Business Date & Timezone Definition
    const targetBusinessDate = dto.businessDate || PayoutDateUtil.getBusinessDayWindow().key;
    const timezone = PayoutDateUtil.DEFAULT_TIMEZONE;

    // 2. Concurrency Guard: prevent duplicate active runs for exact same scope/date
    const activeRun = await (this.prisma as any).financeReconciliationRun.findFirst({
      where: {
        businessDate: targetBusinessDate,
        storeId: dto.storeId ?? null,
        status: 'RUNNING',
      },
    });

    if (activeRun) {
      const activeDuration = Date.now() - new Date(activeRun.startedAt).getTime();
      // If running within 15 minutes, prevent concurrent duplicate
      if (activeDuration < 15 * 60 * 1000) {
        throw new BadRequestException(
          `An EOD reconciliation run is already active for business date ${targetBusinessDate} (Run: ${activeRun.runNumber})`,
        );
      }
    }

    // 3. Run number generation with collision retry loop
    let createdRun: any;
    let attempts = 0;
    const maxAttempts = 5;

    while (!createdRun && attempts < maxAttempts) {
      attempts++;
      const existingRuns = await (this.prisma as any).financeReconciliationRun.findMany({
        where: { businessDate: targetBusinessDate },
        select: { runNumber: true },
        orderBy: { createdAt: 'desc' },
      });

      let maxRunIdx = 0;
      for (const r of existingRuns) {
        const match = r.runNumber?.match(/RUN-(\d+)$/);
        if (match) {
          const idx = parseInt(match[1], 10);
          if (idx > maxRunIdx) maxRunIdx = idx;
        }
      }
      const previousRunCount = await (this.prisma as any).financeReconciliationRun.count({
        where: { businessDate: targetBusinessDate },
      });
      if (typeof previousRunCount === 'number' && previousRunCount > maxRunIdx) {
        maxRunIdx = previousRunCount;
      }
      const nextRunIdx = maxRunIdx + attempts;
      const runNumber = `EOD-${targetBusinessDate.replace(/-/g, '')}-RUN-${String(nextRunIdx).padStart(2, '0')}`;

      try {
        createdRun = await (this.prisma as any).financeReconciliationRun.create({
          data: {
            runNumber,
            businessDate: targetBusinessDate,
            timezone,
            status: 'RUNNING',
            triggerType: (dto as any).triggerType || 'MANUAL',
            triggeredBy: (actor as any).userId || actor.sub,
            storeId: dto.storeId ?? null,
            startedAt: new Date(),
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2002' && attempts < maxAttempts) {
          this.logger.warn(`Run number collision for ${runNumber}, retrying with higher index (attempt ${attempts})...`);
          continue;
        }
        throw err;
      }
    }

    try {
      // 4. Run Core Canonical Reconciliation Engine across all domains
      const baseReport = await this.reconcile(
        {
          storeId: dto.storeId,
          batchSize: dto.batchSize || 100,
        },
        actor,
      );

      // 5. Gather Domain Summary Metrics
      // Payouts
      const payoutWhere: any = {};
      if (dto.storeId) {
        payoutWhere.storeId = dto.storeId;
      }
      const allPayouts = await (this.prisma as any).payoutRequest.findMany({
        where: payoutWhere,
      });

      let payoutsPending = 0;
      let payoutsApproved = 0;
      let payoutsCompleted = 0;
      let payoutsFailed = 0;
      let staleProcessingPayouts = 0;
      let totalPayoutsReserved = new Decimal(0);
      let totalPayoutsCompleted = new Decimal(0);

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      for (const po of allPayouts) {
        const poAmount = new Decimal(po.amount);
        if (po.status === 'PENDING') {
          payoutsPending++;
          totalPayoutsReserved = totalPayoutsReserved.plus(poAmount);
        } else if (po.status === 'APPROVED') {
          payoutsApproved++;
          totalPayoutsReserved = totalPayoutsReserved.plus(poAmount);
        } else if (po.status === 'PROCESSING') {
          totalPayoutsReserved = totalPayoutsReserved.plus(poAmount);
          if (new Date(po.updatedAt) < oneHourAgo) {
            staleProcessingPayouts++;
          }
        } else if (po.status === 'COMPLETED') {
          payoutsCompleted++;
          totalPayoutsCompleted = totalPayoutsCompleted.plus(poAmount);
        } else if (po.status === 'FAILED') {
          payoutsFailed++;
        }
      }

      // Check PAYOUT_CLEARING Account Summary
      // Note: PAYOUT_CLEARING is DEBIT-NORMAL.
      // With internal completions Dr SELLER_FROZEN Cr PAYOUT_CLEARING,
      // expected net balance = -totalPayoutsCompleted
      const clearingSummaryWhere: any = {
        accountType: LedgerAccountType.PAYOUT_CLEARING,
      };
      if (dto.storeId) {
        clearingSummaryWhere.storeId = dto.storeId;
      }
      const clearingSummaries = await this.prisma.ledgerAccountSummary.findMany({
        where: clearingSummaryWhere,
      });

      let actualClearingNet = new Decimal(0);
      for (const s of clearingSummaries) {
        actualClearingNet = actualClearingNet.plus(new Decimal(s.netBalance));
      }

      const expectedOpenClearing = totalPayoutsCompleted.negated();
      const clearingDiff = actualClearingNet.minus(expectedOpenClearing);

      const discrepancies = [...baseReport.discrepancies];

      // If clearing difference is non-zero (i.e. abs > 0.01), record unexpected clearing discrepancy
      if (clearingDiff.abs().greaterThan(new Decimal('0.01'))) {
        discrepancies.push({
          type: DiscrepancyType.PAYOUT_DISBURSEMENT_MISMATCH,
          severity: ReconciliationSeverity.ERROR,
          entityType: 'LedgerAccountSummary',
          entityId: 'PAYOUT_CLEARING',
          storeId: dto.storeId,
          expected: `Expected PAYOUT_CLEARING open balance ${expectedOpenClearing.toString()}`,
          actual: `Actual PAYOUT_CLEARING net balance ${actualClearingNet.toString()}`,
          details: `Unexpected clearing discrepancy: net balance difference of ${clearingDiff.toString()} detected between completed payouts and PAYOUT_CLEARING account`,
          detectedAt: new Date(),
        });
      }

      // If stale processing payouts exist, record warning
      if (staleProcessingPayouts > 0) {
        discrepancies.push({
          type: DiscrepancyType.PAYOUT_RESERVATION_MISMATCH,
          severity: ReconciliationSeverity.WARNING,
          entityType: 'PayoutRequest',
          entityId: 'STALE_PROCESSING',
          storeId: dto.storeId,
          expected: 'Processing payouts resolved within operational window (1h)',
          actual: `${staleProcessingPayouts} stale processing payout(s)`,
          details: `${staleProcessingPayouts} payout request(s) remain in PROCESSING status beyond standard timeout. Provider status query required.`,
          detectedAt: new Date(),
        });
      }

      // Wallets count
      const walletWhere: any = {};
      if (dto.storeId) walletWhere.storeId = dto.storeId;
      const totalWallets = await this.prisma.wallet.count({ where: walletWhere });
      const walletIssues = discrepancies.filter((d) => d.entityType === 'Wallet' || d.entityType === 'SellerWallet').length;
      const healthyWallets = Math.max(0, totalWallets - walletIssues);

      // Ledger count
      const ledgerWhere: any = {};
      if (dto.storeId) ledgerWhere.storeId = dto.storeId;
      const totalLedgerTxs = await this.prisma.ledgerTransaction.count({ where: ledgerWhere });

      // Escrow / SellerOrders
      const orderWhere: any = {};
      if (dto.storeId) orderWhere.storeId = dto.storeId;
      const totalEscrowRecords = await this.prisma.sellerOrder.count({ where: orderWhere });

      const controlSummary: FinanceControlSummaryView = {
        businessDate: targetBusinessDate,
        timezone,
        walletsAudited: totalWallets,
        walletsHealthy: healthyWallets,
        ledgerTransactionsAudited: totalLedgerTxs,
        escrowRecordsAudited: totalEscrowRecords,
        payoutsAudited: allPayouts.length,
        payoutsPending,
        payoutsApproved,
        payoutsCompleted,
        payoutsFailed,
        staleProcessingPayouts,
        totalPayoutsReservedAmount: totalPayoutsReserved.toFixed(2),
        totalPayoutsCompletedAmount: totalPayoutsCompleted.toFixed(2),
        expectedOpenPayoutClearingAmount: expectedOpenClearing.toFixed(2),
        actualPayoutClearingNetBalance: actualClearingNet.toFixed(2),
        payoutClearingDifference: clearingDiff.toFixed(2),
        externalCashAccountingStatus: 'GAP_NOT_PROVEN',
        externalBankProviderStatus: 'MOCK_PROVIDER_ONLY',
      };

      const counts = {
        totalChecked: baseReport.totalChecked + allPayouts.length,
        totalMatched: baseReport.totalMatched + (allPayouts.length - (staleProcessingPayouts > 0 ? 1 : 0)),
        totalDiscrepancies: discrepancies.length,
        info: discrepancies.filter((d) => d.severity === ReconciliationSeverity.INFO).length,
        warning: discrepancies.filter((d) => d.severity === ReconciliationSeverity.WARNING).length,
        error: discrepancies.filter((d) => d.severity === ReconciliationSeverity.ERROR).length,
        critical: discrepancies.filter((d) => d.severity === ReconciliationSeverity.CRITICAL).length,
      };

      let finalStatus: 'COMPLETED_PASS' | 'COMPLETED_WARNING' | 'COMPLETED_FAIL' = 'COMPLETED_PASS';
      if (counts.critical > 0 || counts.error > 0) {
        finalStatus = 'COMPLETED_FAIL';
      } else if (counts.warning > 0) {
        finalStatus = 'COMPLETED_WARNING';
      }

      const durationMs = Date.now() - startTime;

      const updatedRun = await (this.prisma as any).financeReconciliationRun.update({
        where: { id: createdRun.id },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          durationMs,
          summary: controlSummary as any,
          counts: counts as any,
          discrepancies: discrepancies as any,
          metadata: {
            engineeringDefaultTimezone: 'Asia/Ho_Chi_Minh',
            canonicalPolicyTimezone: 'NOT_PROVEN',
            liveExternalBankProvider: 'NOT_PROVEN',
            liveProviderCredentials: 'NOT_PROVEN',
            bankAccountOwnershipVerification: 'NOT_PROVEN',
            externalCashAccounting: 'GAP_NOT_PROVEN',
            externalCashReconciliation: 'NOT_PROVEN',
            automatedScheduler: 'NOT_PROVEN',
          },
        },
      });

      // 6. Emit Outbox Event (sanitized payload with zero sensitive tokens/credentials/bank accounts)
      try {
        await this.prisma.outboxEvent.create({
          data: {
            eventId: `EVT-EOD-${createdRun.id}`,
            type: 'FINANCE_EOD_RECONCILIATION_COMPLETED',
            aggregateId: createdRun.id,
            payload: {
              runId: createdRun.id,
              runNumber: updatedRun.runNumber,
              businessDate: targetBusinessDate,
              status: finalStatus,
              totalChecked: counts.totalChecked,
              totalMatched: counts.totalMatched,
              totalDiscrepancies: discrepancies.length,
              durationMs,
              completedAt: updatedRun.completedAt,
            },
          },
        });
      } catch (evtErr) {
        this.logger.warn(`Failed to create EOD outbox event for run ${createdRun.id}: ${evtErr}`);
      }

      return this.mapToEodRunView(updatedRun);
    } catch (err: any) {
      await (this.prisma as any).financeReconciliationRun.update({
        where: { id: createdRun.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
          metadata: {
            error: err?.message || String(err),
          },
        },
      });
      throw err;
    }
  }

  /**
   * List historical EOD reconciliation runs (Task 78)
   */
  async getEodReconciliationRuns(
    query: EodRunsQueryDto = {},
    actor: BookActor,
  ): Promise<{ items: EodReconciliationRunView[]; total: number; page: number; limit: number }> {
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
    if (!isAdmin) {
      throw new ForbiddenException(
        'Access denied: Platform Admin privileges required to view EOD reconciliation runs',
      );
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.businessDate) where.businessDate = query.businessDate;
    if (query.storeId) where.storeId = query.storeId;

    const [items, total] = await Promise.all([
      (this.prisma as any).financeReconciliationRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      (this.prisma as any).financeReconciliationRun.count({ where }),
    ]);

    return {
      items: items.map((i: any) => this.mapToEodRunView(i)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get EOD reconciliation run by ID (Task 78)
   */
  async getEodReconciliationRunById(
    id: string,
    actor: BookActor,
  ): Promise<EodReconciliationRunView> {
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
    if (!isAdmin) {
      throw new ForbiddenException(
        'Access denied: Platform Admin privileges required to view EOD reconciliation run details',
      );
    }

    const run = await (this.prisma as any).financeReconciliationRun.findUnique({
      where: { id },
    });

    if (!run) {
      throw new NotFoundException(`EOD reconciliation run ${id} not found`);
    }

    return this.mapToEodRunView(run);
  }

  /**
   * Get latest completed EOD reconciliation run (Task 78)
   */
  async getLatestEodRun(
    businessDate?: string,
    actor?: BookActor,
  ): Promise<EodReconciliationRunView | null> {
    if (actor) {
      const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
      if (!isAdmin) {
        throw new ForbiddenException(
          'Access denied: Platform Admin privileges required to view EOD reconciliation run',
        );
      }
    }

    const where: any = {};
    if (businessDate) where.businessDate = businessDate;

    const run = await (this.prisma as any).financeReconciliationRun.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return run ? this.mapToEodRunView(run) : null;
  }

  private mapToEodRunView(record: any): EodReconciliationRunView {
    return {
      id: record.id,
      runNumber: record.runNumber,
      businessDate: record.businessDate,
      timezone: record.timezone,
      status: record.status,
      triggerType: record.triggerType,
      triggeredBy: record.triggeredBy,
      storeId: record.storeId,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      durationMs: record.durationMs,
      summary: record.summary,
      counts: record.counts,
      discrepancies: record.discrepancies || [],
      metadata: record.metadata,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
