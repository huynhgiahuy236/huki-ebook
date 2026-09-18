import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { WalletTransactionType, Wallet } from '../../../prisma/generated/client';
import { BookActor } from '../../common/book-auth.guard';

import { WalletTransactionQueryDto } from './dto/wallet.dto';

export interface WalletTransactionRef {
  referenceType?: string;
  referenceId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface WalletView {
  id: string;
  storeId: string;
  ownerUserId: string;
  availableBalance: number;
  pendingBalance: number;
  frozenBalance: number;
  totalBalance: number;
  currency: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransactionView {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  availableBefore: number;
  availableAfter: number;
  pendingBefore: number;
  pendingAfter: number;
  frozenBefore: number;
  frozenAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  metadata?: any;
  createdAt: Date;
}

export interface PaginatedWalletTransactionsView {
  items: WalletTransactionView[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotent get or create wallet for a store/merchant (WAL-001)
   */
  async getOrCreateWallet(storeId: string, ownerUserId: string): Promise<WalletView> {
    const existing = await this.prisma.wallet.findUnique({
      where: { storeId },
    });
    if (existing) {
      return this.formatWalletView(existing);
    }

    try {
      const created = await this.prisma.wallet.create({
        data: {
          storeId,
          ownerUserId,
          availableBalance: new Decimal(0),
          pendingBalance: new Decimal(0),
          frozenBalance: new Decimal(0),
          currency: 'VND',
          version: 1,
        },
      });
      return this.formatWalletView(created);
    } catch (error) {
      // Handle unique constraint race condition
      const fallback = await this.prisma.wallet.findUnique({
        where: { storeId },
      });
      if (fallback) {
        return this.formatWalletView(fallback);
      }
      throw error;
    }
  }

  /**
   * Get wallet for a store with multi-vendor authorization check
   */
  async getWallet(storeId: string, actor: BookActor): Promise<WalletView> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { storeId },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet not found for store ${storeId}`);
    }

    // Multi-tenant isolation: Admin or Store Owner only
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
    if (!isAdmin && wallet.ownerUserId !== actor.sub) {
      throw new ForbiddenException(`Access denied to wallet for store ${storeId}`);
    }

    return this.formatWalletView(wallet);
  }

  /**
   * Get operational transaction history for a store with multi-vendor authorization check
   */
  async getTransactions(
    storeId: string,
    actor: BookActor,
    query: WalletTransactionQueryDto = {},
  ): Promise<PaginatedWalletTransactionsView> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { storeId },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet not found for store ${storeId}`);
    }

    // Multi-tenant isolation: Admin or Store Owner only
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'PLATFORM_ADMIN';
    if (!isAdmin && wallet.ownerUserId !== actor.sub) {
      throw new ForbiddenException(`Access denied to wallet for store ${storeId}`);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({
        where: { walletId: wallet.id },
      }),
    ]);

    return {
      items: items.map((tx) => ({
        id: tx.id,
        walletId: tx.walletId,
        type: tx.type,
        amount: tx.amount.toNumber(),
        availableBefore: tx.availableBefore.toNumber(),
        availableAfter: tx.availableAfter.toNumber(),
        pendingBefore: tx.pendingBefore.toNumber(),
        pendingAfter: tx.pendingAfter.toNumber(),
        frozenBefore: tx.frozenBefore.toNumber(),
        frozenAfter: tx.frozenAfter.toNumber(),
        referenceType: tx.referenceType,
        referenceId: tx.referenceId,
        description: tx.description,
        metadata: tx.metadata,
        createdAt: tx.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Credit available balance (e.g. Escrow settlement release)
   */
  async creditAvailable(
    storeId: string,
    amount: number | Decimal,
    ref: WalletTransactionRef = {},
  ): Promise<WalletView> {
    const decAmount = this.validatePositiveAmount(amount);
    return this.executeTransition(storeId, decAmount, (wallet) => {
      const nextAvailable = wallet.availableBalance.add(decAmount);
      return {
        type: WalletTransactionType.CREDIT_AVAILABLE,
        nextAvailable,
        nextPending: wallet.pendingBalance,
        nextFrozen: wallet.frozenBalance,
      };
    }, ref);
  }

  /**
   * Credit pending balance (e.g. Incoming order payment held in Escrow)
   */
  async creditPending(
    storeId: string,
    amount: number | Decimal,
    ref: WalletTransactionRef = {},
  ): Promise<WalletView> {
    const decAmount = this.validatePositiveAmount(amount);
    return this.executeTransition(storeId, decAmount, (wallet) => {
      const nextPending = wallet.pendingBalance.add(decAmount);
      return {
        type: WalletTransactionType.CREDIT_PENDING,
        nextAvailable: wallet.availableBalance,
        nextPending,
        nextFrozen: wallet.frozenBalance,
      };
    }, ref);
  }

  /**
   * Credit frozen balance (e.g. Direct admin/sanction freeze)
   */
  async creditFrozen(
    storeId: string,
    amount: number | Decimal,
    ref: WalletTransactionRef = {},
  ): Promise<WalletView> {
    const decAmount = this.validatePositiveAmount(amount);
    return this.executeTransition(storeId, decAmount, (wallet) => {
      const nextFrozen = wallet.frozenBalance.add(decAmount);
      return {
        type: WalletTransactionType.CREDIT_FROZEN,
        nextAvailable: wallet.availableBalance,
        nextPending: wallet.pendingBalance,
        nextFrozen,
      };
    }, ref);
  }

  /**
   * Debit available balance (e.g. Withdrawal / Payout request)
   */
  async debitAvailable(
    storeId: string,
    amount: number | Decimal,
    ref: WalletTransactionRef = {},
  ): Promise<WalletView> {
    const decAmount = this.validatePositiveAmount(amount);
    return this.executeTransition(storeId, decAmount, (wallet) => {
      if (wallet.availableBalance.lessThan(decAmount)) {
        throw new BadRequestException(
          `Insufficient available balance: current ${wallet.availableBalance.toNumber()} < requested ${decAmount.toNumber()}`,
        );
      }
      const nextAvailable = wallet.availableBalance.sub(decAmount);
      return {
        type: WalletTransactionType.DEBIT_AVAILABLE,
        nextAvailable,
        nextPending: wallet.pendingBalance,
        nextFrozen: wallet.frozenBalance,
      };
    }, ref);
  }

  /**
   * Debit frozen balance (e.g. Bank payout completion / disbursement)
   */
  async debitFrozen(
    storeId: string,
    amount: number | Decimal,
    ref: WalletTransactionRef = {},
  ): Promise<WalletView> {
    const decAmount = this.validatePositiveAmount(amount);
    return this.executeTransition(storeId, decAmount, (wallet) => {
      if (wallet.frozenBalance.lessThan(decAmount)) {
        throw new BadRequestException(
          `Insufficient frozen balance: current ${wallet.frozenBalance.toNumber()} < requested ${decAmount.toNumber()}`,
        );
      }
      const nextFrozen = wallet.frozenBalance.sub(decAmount);
      return {
        type: WalletTransactionType.DEBIT_FROZEN,
        nextAvailable: wallet.availableBalance,
        nextPending: wallet.pendingBalance,
        nextFrozen,
      };
    }, ref);
  }

  /**
   * Move balance: Pending -> Available (Escrow safety hold period ended)
   */
  async movePendingToAvailable(
    storeId: string,
    amount: number | Decimal,
    ref: WalletTransactionRef = {},
  ): Promise<WalletView> {
    const decAmount = this.validatePositiveAmount(amount);
    return this.executeTransition(storeId, decAmount, (wallet) => {
      if (wallet.pendingBalance.lessThan(decAmount)) {
        throw new BadRequestException(
          `Insufficient pending balance: current ${wallet.pendingBalance.toNumber()} < requested ${decAmount.toNumber()}`,
        );
      }
      const nextPending = wallet.pendingBalance.sub(decAmount);
      const nextAvailable = wallet.availableBalance.add(decAmount);
      return {
        type: WalletTransactionType.MOVE_PENDING_TO_AVAILABLE,
        nextAvailable,
        nextPending,
        nextFrozen: wallet.frozenBalance,
      };
    }, ref);
  }

  /**
   * Move balance: Available -> Frozen (Dispute / Investigation freeze on available funds)
   */
  async moveAvailableToFrozen(
    storeId: string,
    amount: number | Decimal,
    ref: WalletTransactionRef = {},
  ): Promise<WalletView> {
    const decAmount = this.validatePositiveAmount(amount);
    return this.executeTransition(storeId, decAmount, (wallet) => {
      if (wallet.availableBalance.lessThan(decAmount)) {
        throw new BadRequestException(
          `Insufficient available balance: current ${wallet.availableBalance.toNumber()} < requested ${decAmount.toNumber()}`,
        );
      }
      const nextAvailable = wallet.availableBalance.sub(decAmount);
      const nextFrozen = wallet.frozenBalance.add(decAmount);
      return {
        type: WalletTransactionType.MOVE_AVAILABLE_TO_FROZEN,
        nextAvailable,
        nextPending: wallet.pendingBalance,
        nextFrozen,
      };
    }, ref);
  }

  /**
   * Move balance: Frozen -> Available (Dispute resolved in seller favor / unfreezing)
   */
  async moveFrozenToAvailable(
    storeId: string,
    amount: number | Decimal,
    ref: WalletTransactionRef = {},
  ): Promise<WalletView> {
    const decAmount = this.validatePositiveAmount(amount);
    return this.executeTransition(storeId, decAmount, (wallet) => {
      if (wallet.frozenBalance.lessThan(decAmount)) {
        throw new BadRequestException(
          `Insufficient frozen balance: current ${wallet.frozenBalance.toNumber()} < requested ${decAmount.toNumber()}`,
        );
      }
      const nextFrozen = wallet.frozenBalance.sub(decAmount);
      const nextAvailable = wallet.availableBalance.add(decAmount);
      return {
        type: WalletTransactionType.MOVE_FROZEN_TO_AVAILABLE,
        nextAvailable,
        nextPending: wallet.pendingBalance,
        nextFrozen,
      };
    }, ref);
  }

  /**
   * Move balance: Frozen -> Pending (Dispute dismissed back to standard escrow clearance)
   */
  async moveFrozenToPending(
    storeId: string,
    amount: number | Decimal,
    ref: WalletTransactionRef = {},
  ): Promise<WalletView> {
    const decAmount = this.validatePositiveAmount(amount);
    return this.executeTransition(storeId, decAmount, (wallet) => {
      if (wallet.frozenBalance.lessThan(decAmount)) {
        throw new BadRequestException(
          `Insufficient frozen balance: current ${wallet.frozenBalance.toNumber()} < requested ${decAmount.toNumber()}`,
        );
      }
      const nextFrozen = wallet.frozenBalance.sub(decAmount);
      const nextPending = wallet.pendingBalance.add(decAmount);
      return {
        type: WalletTransactionType.MOVE_FROZEN_TO_PENDING,
        nextAvailable: wallet.availableBalance,
        nextPending,
        nextFrozen,
      };
    }, ref);
  }

  /**
   * Move balance: Available -> Frozen within an existing Prisma transaction
   */
  async moveAvailableToFrozenWithTx(
    tx: any,
    storeId: string,
    amount: number | Decimal,
    ref: WalletTransactionRef = {},
  ): Promise<WalletView> {
    const decAmount = this.validatePositiveAmount(amount);
    return this.executeTransitionWithTx(tx, storeId, decAmount, (wallet) => {
      if (wallet.availableBalance.lessThan(decAmount)) {
        throw new BadRequestException(
          `Insufficient available balance: current ${wallet.availableBalance.toNumber()} < requested ${decAmount.toNumber()}`,
        );
      }
      const nextAvailable = wallet.availableBalance.sub(decAmount);
      const nextFrozen = wallet.frozenBalance.add(decAmount);
      return {
        type: WalletTransactionType.MOVE_AVAILABLE_TO_FROZEN,
        nextAvailable,
        nextPending: wallet.pendingBalance,
        nextFrozen,
      };
    }, ref);
  }

  /**
   * Move balance: Frozen -> Available within an existing Prisma transaction
   */
  async moveFrozenToAvailableWithTx(
    tx: any,
    storeId: string,
    amount: number | Decimal,
    ref: WalletTransactionRef = {},
  ): Promise<WalletView> {
    const decAmount = this.validatePositiveAmount(amount);
    return this.executeTransitionWithTx(tx, storeId, decAmount, (wallet) => {
      if (wallet.frozenBalance.lessThan(decAmount)) {
        throw new BadRequestException(
          `Insufficient frozen balance: current ${wallet.frozenBalance.toNumber()} < requested ${decAmount.toNumber()}`,
        );
      }
      const nextFrozen = wallet.frozenBalance.sub(decAmount);
      const nextAvailable = wallet.availableBalance.add(decAmount);
      return {
        type: WalletTransactionType.MOVE_FROZEN_TO_AVAILABLE,
        nextAvailable,
        nextPending: wallet.pendingBalance,
        nextFrozen,
      };
    }, ref);
  }

  /**
   * Debit frozen balance within an existing Prisma transaction (e.g. Bank payout completion)
   */
  async debitFrozenWithTx(
    tx: any,
    storeId: string,
    amount: number | Decimal,
    ref: WalletTransactionRef = {},
  ): Promise<WalletView> {
    const decAmount = this.validatePositiveAmount(amount);
    return this.executeTransitionWithTx(tx, storeId, decAmount, (wallet) => {
      if (wallet.frozenBalance.lessThan(decAmount)) {
        throw new BadRequestException(
          `Insufficient frozen balance: current ${wallet.frozenBalance.toNumber()} < requested ${decAmount.toNumber()}`,
        );
      }
      const nextFrozen = wallet.frozenBalance.sub(decAmount);
      return {
        type: WalletTransactionType.DEBIT_FROZEN,
        nextAvailable: wallet.availableBalance,
        nextPending: wallet.pendingBalance,
        nextFrozen,
      };
    }, ref);
  }

  /**
   * Helper: Atomic mutation execution with WAL-001 invariant checks and transaction audit logging
   */
  /**
   * Helper: Atomic mutation execution within an existing Prisma transaction
   */
  async executeTransitionWithTx(
    tx: any,
    storeId: string,
    amount: Decimal,
    calculate: (wallet: Wallet) => {
      type: WalletTransactionType;
      nextAvailable: Decimal;
      nextPending: Decimal;
      nextFrozen: Decimal;
    },
    ref: WalletTransactionRef,
  ): Promise<WalletView> {
    const wallet = await tx.wallet.findUnique({
      where: { storeId },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet not found for store ${storeId}`);
    }

    const { type, nextAvailable, nextPending, nextFrozen } = calculate(wallet);

    // Invariant: No negative balances
    if (nextAvailable.isNegative() || nextPending.isNegative() || nextFrozen.isNegative()) {
      throw new BadRequestException('Wallet balance cannot become negative (WAL-001 violation)');
    }

    // Optimistic concurrency / atomic update
    const updated = await tx.wallet.update({
      where: {
        storeId,
        version: wallet.version,
      },
      data: {
        availableBalance: nextAvailable,
        pendingBalance: nextPending,
        frozenBalance: nextFrozen,
        version: { increment: 1 },
      },
    });

    // Record immutable audit transaction
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type,
        amount,
        availableBefore: wallet.availableBalance,
        availableAfter: nextAvailable,
        pendingBefore: wallet.pendingBalance,
        pendingAfter: nextPending,
        frozenBefore: wallet.frozenBalance,
        frozenAfter: nextFrozen,
        referenceType: ref.referenceType,
        referenceId: ref.referenceId,
        description: ref.description,
        metadata: ref.metadata as any,
      },
    });

    return this.formatWalletView(updated);
  }

  private async executeTransition(
    storeId: string,
    amount: Decimal,
    calculate: (wallet: Wallet) => {
      type: WalletTransactionType;
      nextAvailable: Decimal;
      nextPending: Decimal;
      nextFrozen: Decimal;
    },
    ref: WalletTransactionRef,
  ): Promise<WalletView> {
    return this.prisma.$transaction(async (tx) => {
      return this.executeTransitionWithTx(tx, storeId, amount, calculate, ref);
    });
  }

  private validatePositiveAmount(amount: number | Decimal): Decimal {
    const dec = new Decimal(amount);
    if (dec.isNaN() || !dec.isFinite() || dec.lessThanOrEqualTo(0)) {
      throw new BadRequestException(`Transaction amount must be a positive number: got ${amount}`);
    }
    return dec;
  }

  private formatWalletView(wallet: Wallet): WalletView {
    const available = wallet.availableBalance.toNumber();
    const pending = wallet.pendingBalance.toNumber();
    const frozen = wallet.frozenBalance.toNumber();
    const total = available + pending + frozen;

    return {
      id: wallet.id,
      storeId: wallet.storeId,
      ownerUserId: wallet.ownerUserId,
      availableBalance: available,
      pendingBalance: pending,
      frozenBalance: frozen,
      totalBalance: total,
      currency: wallet.currency,
      version: wallet.version,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}
