import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  LedgerAccountType,
  LedgerEntryDirection,
  LedgerTransaction,
  LedgerEntry,
} from '../../../prisma/generated/client';
import { BookActor } from '../../common/book-auth.guard';
import {
  PostLedgerTransactionDto,
  ReversalTransactionDto,
  LedgerEntryDto,
} from './dto/ledger.dto';
import { randomBytes } from 'crypto';

export interface LedgerTransactionView {
  id: string;
  transactionNumber: string;
  idempotencyKey: string;
  description: string;
  referenceType: string;
  referenceId: string;
  storeId?: string | null;
  currency: string;
  totalAmount: number;
  isReversal: boolean;
  reversalOfTransactionId?: string | null;
  reversedByTransactionId?: string | null;
  reversalReason?: string | null;
  metadata?: Record<string, unknown> | null;
  postedAt: Date;
  createdAt: Date;
  entries: Array<{
    id: string;
    accountType: LedgerAccountType;
    direction: LedgerEntryDirection;
    amount: number;
    currency: string;
    storeId?: string | null;
    description?: string | null;
    createdAt: Date;
  }>;
}

/**
 * Normal balance direction determination:
 * - DEBIT normal (Asset / Expense / Clearing): netBalance = totalDebits - totalCredits
 * - CREDIT normal (Liability / Revenue / Seller Balances): netBalance = totalCredits - totalDebits
 */
export function isDebitNormalAccount(accountType: LedgerAccountType): boolean {
  switch (accountType) {
    case LedgerAccountType.ESCROW_HOLDING:
    case LedgerAccountType.PLATFORM_MARKETING_EXPENSE:
    case LedgerAccountType.REFUND_CLEARING:
    case LedgerAccountType.PAYOUT_CLEARING:
      return true;
    case LedgerAccountType.SELLER_PENDING:
    case LedgerAccountType.SELLER_AVAILABLE:
    case LedgerAccountType.SELLER_FROZEN:
    case LedgerAccountType.PLATFORM_REVENUE:
      return false;
  }
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Post a balanced double-entry accounting transaction within an existing Prisma transaction client
   */
  async postTransactionWithTx(tx: any, dto: PostLedgerTransactionDto): Promise<LedgerTransactionView> {
    this.validatePosting(dto);

    const totalDebit = dto.entries
      .filter((e) => e.direction === LedgerEntryDirection.DEBIT)
      .reduce((sum, e) => sum.add(new Decimal(e.amount)), new Decimal(0));

    const currency = dto.currency || 'VND';
    const transactionNumber = `LTX-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;

    // Create Ledger Transaction Header
    const createdTx = await tx.ledgerTransaction.create({
      data: {
        transactionNumber,
        idempotencyKey: dto.idempotencyKey,
        description: dto.description,
        referenceType: dto.referenceType,
        referenceId: dto.referenceId,
        storeId: dto.storeId || null,
        currency,
        totalAmount: totalDebit,
        isReversal: false,
        metadata: dto.metadata as any,
        postedAt: new Date(),
      },
    });

    // Create Individual Journal Postings (Ledger Entries)
    const createdEntries: LedgerEntry[] = [];
    for (const entryDto of dto.entries) {
      const decAmount = new Decimal(entryDto.amount);
      const entryStoreId = entryDto.storeId || dto.storeId || null;

      const entry = await tx.ledgerEntry.create({
        data: {
          ledgerTransactionId: createdTx.id,
          accountType: entryDto.accountType,
          direction: entryDto.direction,
          amount: decAmount,
          currency: entryDto.currency || currency,
          storeId: entryStoreId,
          description: entryDto.description || null,
        },
      });
      createdEntries.push(entry);

      // Update Running Account Summary Balance
      const summaryStoreId = entryStoreId || '';
      const summaryCurrency = entryDto.currency || currency;

      await this.updateAccountSummary(
        tx,
        entryDto.accountType,
        summaryStoreId,
        summaryCurrency,
        entryDto.direction,
        decAmount,
      );
    }

    return this.formatTransactionView({
      ...createdTx,
      entries: createdEntries,
    });
  }

  /**
   * Post a balanced double-entry accounting transaction (WAL-002 Invariant: SUM(DEBIT) == SUM(CREDIT))
   */
  async postTransaction(dto: PostLedgerTransactionDto): Promise<LedgerTransactionView> {
    // 1. Application-level Idempotency Pre-check
    const existing = await this.prisma.ledgerTransaction.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      include: { entries: true },
    });
    if (existing) {
      this.logger.log(`Idempotent return for existing ledger transaction: ${existing.transactionNumber}`);
      return this.formatTransactionView(existing);
    }

    // 2. Accounting Invariant & Double-Entry & Tenant Validation
    this.validatePosting(dto);

    // 3. Atomic Multi-Entry Posting & Account Summary Updates with DB-level concurrency catch
    try {
      return await this.prisma.$transaction(async (tx) => {
        return this.postTransactionWithTx(tx, dto);
      });
    } catch (err: any) {
      // Handle concurrent insert hitting DB unique constraint on idempotency_key
      if (err?.code === 'P2002' && (err?.meta?.target?.includes('idempotency_key') || String(err?.message).includes('idempotency_key'))) {
        this.logger.warn(`Concurrent insert caught on idempotencyKey: ${dto.idempotencyKey}. Retrieving existing record.`);
        const concurrentExisting = await this.prisma.ledgerTransaction.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
          include: { entries: true },
        });
        if (concurrentExisting) {
          return this.formatTransactionView(concurrentExisting);
        }
      }
      throw err;
    }
  }

  /**
   * Create an immutable compensating reversal transaction (Traceable correction per WAL-002)
   */
  async createReversalTransaction(dto: ReversalTransactionDto): Promise<LedgerTransactionView> {
    // 1. Idempotency Check for Reversal
    const existingReversal = await this.prisma.ledgerTransaction.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      include: { entries: true },
    });
    if (existingReversal) {
      return this.formatTransactionView(existingReversal);
    }

    // 2. Fetch Original Transaction
    const original = await this.prisma.ledgerTransaction.findUnique({
      where: { id: dto.originalTransactionId },
      include: { entries: true },
    });
    if (!original) {
      throw new NotFoundException(`Original ledger transaction ${dto.originalTransactionId} not found`);
    }

    if (original.reversedByTransactionId) {
      throw new ConflictException(
        `Ledger transaction ${original.transactionNumber} has already been reversed by ${original.reversedByTransactionId}`,
      );
    }

    // 3. Mirror entries with swapped directions (DEBIT <-> CREDIT)
    const reversedEntries: LedgerEntryDto[] = original.entries.map((entry) => ({
      accountType: entry.accountType,
      direction:
        entry.direction === LedgerEntryDirection.DEBIT
          ? LedgerEntryDirection.CREDIT
          : LedgerEntryDirection.DEBIT,
      amount: entry.amount.toNumber(),
      currency: entry.currency,
      storeId: entry.storeId || undefined,
      description: `Reversal of entry ${entry.id}: ${dto.reversalReason}`,
    }));

    const transactionNumber = `LTX-REV-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;

    // 4. Atomically persist reversal transaction and link back to original with DB uniqueness protection
    try {
      return await this.prisma.$transaction(async (tx) => {
        const reversalTx = await tx.ledgerTransaction.create({
          data: {
            transactionNumber,
            idempotencyKey: dto.idempotencyKey,
            description: dto.description || `Reversal of ${original.transactionNumber}: ${dto.reversalReason}`,
            referenceType: 'REVERSAL',
            referenceId: original.id,
            storeId: original.storeId,
            currency: original.currency,
            totalAmount: original.totalAmount,
            isReversal: true,
            reversalOfTransactionId: original.id,
            reversalReason: dto.reversalReason,
            metadata: { originalTransactionNumber: original.transactionNumber },
            postedAt: new Date(),
          },
        });

        // Create Reversal Entries
        const createdEntries: LedgerEntry[] = [];
        for (const revEntry of reversedEntries) {
          const decAmount = new Decimal(revEntry.amount);
          const entry = await tx.ledgerEntry.create({
            data: {
              ledgerTransactionId: reversalTx.id,
              accountType: revEntry.accountType,
              direction: revEntry.direction,
              amount: decAmount,
              currency: revEntry.currency || original.currency,
              storeId: revEntry.storeId || original.storeId || null,
              description: revEntry.description,
            },
          });
          createdEntries.push(entry);

          // Update Account Summaries
          const summaryStoreId = revEntry.storeId || original.storeId || '';
          await this.updateAccountSummary(
            tx,
            revEntry.accountType,
            summaryStoreId,
            revEntry.currency || original.currency,
            revEntry.direction,
            decAmount,
          );
        }

        // Link original transaction to reversal
        await tx.ledgerTransaction.update({
          where: { id: original.id },
          data: { reversedByTransactionId: reversalTx.id },
        });

        return this.formatTransactionView({
          ...reversalTx,
          entries: createdEntries,
        });
      });
    } catch (err: any) {
      // Handle concurrent reversal on unique constraint reversal_of_transaction_id or idempotency_key
      if (err?.code === 'P2002') {
        if (err?.meta?.target?.includes('reversal_of_transaction_id') || String(err?.message).includes('reversal_of_transaction_id')) {
          throw new ConflictException(`Transaction ${original.transactionNumber} has already been reversed by another concurrent request`);
        }
        if (err?.meta?.target?.includes('idempotency_key') || String(err?.message).includes('idempotency_key')) {
          const existing = await this.prisma.ledgerTransaction.findUnique({
            where: { idempotencyKey: dto.idempotencyKey },
            include: { entries: true },
          });
          if (existing) {
            return this.formatTransactionView(existing);
          }
        }
      }
      throw err;
    }
  }

  /**
   * Get single transaction by ID with authorization and tenant scoping
   */
  async getTransactionById(id: string, actor: BookActor): Promise<LedgerTransactionView> {
    const tx = await this.prisma.ledgerTransaction.findUnique({
      where: { id },
      include: { entries: true },
    });
    if (!tx) {
      throw new NotFoundException(`Ledger transaction ${id} not found`);
    }

    const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
    if (isAdmin) {
      return this.formatTransactionView(tx);
    }

    const isBusiness = actor.role === 'BUSINESS' || actor.role === 'STORE_OWNER' || actor.role === 'MERCHANT';
    const actorStoreId = (actor as any).storeId;

    if (!isBusiness || !actorStoreId || (tx.storeId && tx.storeId !== actorStoreId)) {
      throw new ForbiddenException('Access denied: Unauthorized merchant store or insufficient finance privileges');
    }

    return this.formatTransactionView(tx);
  }

  /**
   * List account summaries for audit (Admin can see all, Merchant sees own store accounts)
   */
  async listAccountSummaries(actor: BookActor, storeId?: string) {
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
    const isBusiness = actor.role === 'BUSINESS' || actor.role === 'STORE_OWNER' || actor.role === 'MERCHANT';
    const actorStoreId = (actor as any).storeId;

    if (!isAdmin && (!isBusiness || !actorStoreId)) {
      throw new ForbiddenException('Access denied: Admin role or verified merchant store ownership required');
    }

    const effectiveStoreId = isAdmin ? (storeId !== undefined ? storeId : undefined) : actorStoreId;

    const where = effectiveStoreId !== undefined ? { storeId: effectiveStoreId } : {};

    const summaries = await this.prisma.ledgerAccountSummary.findMany({
      where,
      orderBy: [{ accountType: 'asc' }, { storeId: 'asc' }],
    });

    return summaries.map((s) => ({
      id: s.id,
      accountType: s.accountType,
      storeId: s.storeId || null,
      totalDebits: s.totalDebits.toNumber(),
      totalCredits: s.totalCredits.toNumber(),
      netBalance: s.netBalance.toNumber(),
      currency: s.currency,
      updatedAt: s.updatedAt,
    }));
  }

  /**
   * Validate double-entry accounting invariant & tenant dimensions:
   * - SUM(DEBIT) == SUM(CREDIT)
   * - amount > 0
   * - single currency
   * - storeId required on seller-specific accounts (SELLER_PENDING, SELLER_AVAILABLE, SELLER_FROZEN)
   */
  private validatePosting(dto: PostLedgerTransactionDto) {
    const { entries } = dto;
    const defaultCurrency = dto.currency || 'VND';

    if (!entries || entries.length < 2) {
      throw new BadRequestException('A double-entry transaction must contain at least 2 postings');
    }

    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    const isSellerAccount = (type: LedgerAccountType) =>
      type === LedgerAccountType.SELLER_PENDING ||
      type === LedgerAccountType.SELLER_AVAILABLE ||
      type === LedgerAccountType.SELLER_FROZEN;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const dec = new Decimal(entry.amount);

      if (dec.isNaN() || !dec.isFinite() || dec.lessThanOrEqualTo(0)) {
        throw new BadRequestException(
          `Entry at index ${i} has invalid amount: must be positive number (got ${entry.amount})`,
        );
      }

      const entryCurrency = entry.currency || defaultCurrency;
      if (entryCurrency !== defaultCurrency) {
        throw new BadRequestException(
          `Entry at index ${i} currency mismatch: expected ${defaultCurrency}, got ${entryCurrency}`,
        );
      }

      // Tenant Dimension Validation: Seller accounts MUST have a store dimension
      const effectiveStoreId = entry.storeId || dto.storeId;
      if (isSellerAccount(entry.accountType)) {
        if (!effectiveStoreId || effectiveStoreId.trim() === '') {
          throw new BadRequestException(
            `Entry at index ${i} (${entry.accountType}) requires a valid storeId for multi-vendor accounting isolation`,
          );
        }
      }

      // Multi-store mixing check: If header storeId is set, entries must not belong to a different store
      if (dto.storeId && entry.storeId && entry.storeId !== dto.storeId) {
        throw new BadRequestException(
          `Entry at index ${i} storeId (${entry.storeId}) does not match transaction header storeId (${dto.storeId})`,
        );
      }

      if (entry.direction === LedgerEntryDirection.DEBIT) {
        totalDebit = totalDebit.add(dec);
      } else if (entry.direction === LedgerEntryDirection.CREDIT) {
        totalCredit = totalCredit.add(dec);
      } else {
        throw new BadRequestException(`Entry at index ${i} has invalid direction`);
      }
    }

    if (!totalDebit.equals(totalCredit)) {
      throw new UnprocessableEntityException(
        `Double-entry invariant violation: Total DEBIT (${totalDebit.toNumber()}) !== Total CREDIT (${totalCredit.toNumber()})`,
      );
    }
  }

  /**
   * Helper: Update running account summary with canonical normal balance semantics
   */
  private async updateAccountSummary(
    tx: any,
    accountType: LedgerAccountType,
    storeId: string,
    currency: string,
    direction: LedgerEntryDirection,
    amount: Decimal,
  ) {
    const isDebit = direction === LedgerEntryDirection.DEBIT;
    const debitNormal = isDebitNormalAccount(accountType);

    const summary = await tx.ledgerAccountSummary.findUnique({
      where: {
        accountType_storeId_currency: {
          accountType,
          storeId,
          currency,
        },
      },
    });

    if (!summary) {
      const initialDebits = isDebit ? amount : new Decimal(0);
      const initialCredits = isDebit ? new Decimal(0) : amount;
      const initialNet = debitNormal
        ? initialDebits.sub(initialCredits)
        : initialCredits.sub(initialDebits);

      await tx.ledgerAccountSummary.create({
        data: {
          accountType,
          storeId,
          currency,
          totalDebits: initialDebits,
          totalCredits: initialCredits,
          netBalance: initialNet,
        },
      });
    } else {
      const nextDebits = isDebit ? summary.totalDebits.add(amount) : summary.totalDebits;
      const nextCredits = isDebit ? summary.totalCredits : summary.totalCredits.add(amount);
      const nextNet = debitNormal
        ? nextDebits.sub(nextCredits)
        : nextCredits.sub(nextDebits);

      await tx.ledgerAccountSummary.update({
        where: { id: summary.id },
        data: {
          totalDebits: nextDebits,
          totalCredits: nextCredits,
          netBalance: nextNet,
        },
      });
    }
  }

  private formatTransactionView(tx: LedgerTransaction & { entries: LedgerEntry[] }): LedgerTransactionView {
    return {
      id: tx.id,
      transactionNumber: tx.transactionNumber,
      idempotencyKey: tx.idempotencyKey,
      description: tx.description,
      referenceType: tx.referenceType,
      referenceId: tx.referenceId,
      storeId: tx.storeId,
      currency: tx.currency,
      totalAmount: tx.totalAmount.toNumber(),
      isReversal: tx.isReversal,
      reversalOfTransactionId: (tx as any).reversalOfTransactionId || null,
      reversedByTransactionId: tx.reversedByTransactionId || null,
      reversalReason: tx.reversalReason,
      metadata: tx.metadata as Record<string, unknown> | null,
      postedAt: tx.postedAt,
      createdAt: tx.createdAt,
      entries: (tx.entries || []).map((e) => ({
        id: e.id,
        accountType: e.accountType,
        direction: e.direction,
        amount: e.amount.toNumber(),
        currency: e.currency,
        storeId: e.storeId,
        description: e.description,
        createdAt: e.createdAt,
      })),
    };
  }
}
