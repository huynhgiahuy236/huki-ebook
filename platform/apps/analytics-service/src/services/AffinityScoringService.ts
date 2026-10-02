import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// Event types
export enum EventType {
  // View events (tích lũy vào viewScore)
  PRODUCT_VIEW_LONG = 'PRODUCT_VIEW_LONG',
  READ_SAMPLE = 'READ_SAMPLE',
  SEARCH_QUERY = 'SEARCH_QUERY',
  BOUNCE = 'BOUNCE',
  FOLLOW_AUTHOR = 'FOLLOW_AUTHOR',

  // Purchase events (tích lũy vào purchaseScore)
  PURCHASE_BOOK = 'PURCHASE_BOOK',
  READING_PROGRESS = 'READING_PROGRESS',
  ADD_TO_CART = 'ADD_TO_CART',
  SAVE_WISHLIST = 'SAVE_WISHLIST',
}

// Weight configuration
const VIEW_WEIGHTS: Record<string, number> = {
  [EventType.PRODUCT_VIEW_LONG]: 3,
  [EventType.READ_SAMPLE]: 5,
  [EventType.SEARCH_QUERY]: 2,
  [EventType.BOUNCE]: -1,
  [EventType.FOLLOW_AUTHOR]: 4,
};

const PURCHASE_WEIGHTS: Record<string, number> = {
  [EventType.PURCHASE_BOOK]: 10,
  [EventType.READING_PROGRESS]: 8,
  [EventType.ADD_TO_CART]: 6,
  [EventType.SAVE_WISHLIST]: 5,
};

// Scoring weights for total affinity calculation
const VIEW_WEIGHT_FACTOR = 0.3;
const PURCHASE_WEIGHT_FACTOR = 0.7;

export interface AnalyticsEventData {
  eventType: string;
  userId?: string;
  bookId?: string;
  properties?: Record<string, any>;
}

export interface BookMetadata {
  bookId: string;
  categoryId: string;
  authorId: string;
}

@Injectable()
export class AffinityScoringService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if event type is a view event
   */
  isViewEvent(eventType: string): boolean {
    return eventType in VIEW_WEIGHTS;
  }

  /**
   * Check if event type is a purchase event
   */
  isPurchaseEvent(eventType: string): boolean {
    return eventType in PURCHASE_WEIGHTS;
  }

  /**
   * Get weight for view event
   */
  getViewWeight(eventType: string): number {
    return VIEW_WEIGHTS[eventType] || 0;
  }

  /**
   * Get weight for purchase event
   */
  getPurchaseWeight(eventType: string): number {
    return PURCHASE_WEIGHTS[eventType] || 0;
  }

  /**
   * Calculate total affinity score from view and purchase scores
   */
  calculateTotalScore(viewScore: number, purchaseScore: number): number {
    return viewScore * VIEW_WEIGHT_FACTOR + purchaseScore * PURCHASE_WEIGHT_FACTOR;
  }

  /**
   * Update user category affinity based on an event
   */
  async updateCategoryAffinity(
    userId: string,
    categoryId: string,
    eventType: string,
  ): Promise<void> {
    const isView = this.isViewEvent(eventType);
    const isPurchase = this.isPurchaseEvent(eventType);

    if (!isView && !isPurchase) return;

    const weight = isView
      ? this.getViewWeight(eventType)
      : this.getPurchaseWeight(eventType);

    if (weight === 0) return;

    await this.prisma.userCategoryAffinity.upsert({
      where: {
        unique_user_category: {
          userId: userId,
          categoryId: categoryId,
        },
      },
      update: {
        viewScore: isView ? { increment: weight } : undefined,
        purchaseScore: isPurchase ? { increment: weight } : undefined,
        interactionCount: { increment: 1 },
        lastInteractedAt: new Date(),
      },
      create: {
        userId,
        categoryId,
        viewScore: isView ? weight : 0,
        purchaseScore: isPurchase ? weight : 0,
        totalAffinityScore: Math.abs(weight), // Initial estimate
        interactionCount: 1,
      },
    });

    // Update total affinity score after upsert
    await this.recalculateCategoryTotalScore(userId, categoryId);
  }

  /**
   * Update user author affinity based on an event
   */
  async updateAuthorAffinity(
    userId: string,
    authorId: string,
    eventType: string,
  ): Promise<void> {
    const isView = this.isViewEvent(eventType);
    const isPurchase = this.isPurchaseEvent(eventType);

    if (!isView && !isPurchase) return;

    const weight = isView
      ? this.getViewWeight(eventType)
      : this.getPurchaseWeight(eventType);

    if (weight === 0) return;

    await this.prisma.userAuthorAffinity.upsert({
      where: {
        unique_user_author: {
          userId: userId,
          authorId: authorId,
        },
      },
      update: {
        viewScore: isView ? { increment: weight } : undefined,
        purchaseScore: isPurchase ? { increment: weight } : undefined,
        interactionCount: { increment: 1 },
        lastInteractedAt: new Date(),
      },
      create: {
        userId,
        authorId,
        viewScore: isView ? weight : 0,
        purchaseScore: isPurchase ? weight : 0,
        totalAffinityScore: Math.abs(weight),
        interactionCount: 1,
      },
    });

    await this.recalculateAuthorTotalScore(userId, authorId);
  }

  /**
   * Recalculate total affinity score for a user-category pair
   */
  private async recalculateCategoryTotalScore(
    userId: string,
    categoryId: string,
  ): Promise<void> {
    const affinity = await this.prisma.userCategoryAffinity.findUnique({
      where: {
        unique_user_category: {
          userId: userId,
          categoryId: categoryId,
        },
      },
    });

    if (!affinity) return;

    const totalScore = this.calculateTotalScore(
      affinity.viewScore.toNumber(),
      affinity.purchaseScore.toNumber(),
    );

    await this.prisma.userCategoryAffinity.update({
      where: { id: affinity.id },
      data: { totalAffinityScore: totalScore },
    });
  }

  /**
   * Recalculate total affinity score for a user-author pair
   */
  private async recalculateAuthorTotalScore(
    userId: string,
    authorId: string,
  ): Promise<void> {
    const affinity = await this.prisma.userAuthorAffinity.findUnique({
      where: {
        unique_user_author: {
          userId: userId,
          authorId: authorId,
        },
      },
    });

    if (!affinity) return;

    const totalScore = this.calculateTotalScore(
      affinity.viewScore.toNumber(),
      affinity.purchaseScore.toNumber(),
    );

    await this.prisma.userAuthorAffinity.update({
      where: { id: affinity.id },
      data: { totalAffinityScore: totalScore },
    });
  }

  /**
   * Batch process events and update affinities
   */
  async processEventsBatch(
    events: AnalyticsEventData[],
    getBookMetadata: (bookId: string) => Promise<BookMetadata | null>,
  ): Promise<void> {
    const categoryUpdates: Map<string, { userId: string; categoryId: string; viewDelta: number; purchaseDelta: number }> = new Map();
    const authorUpdates: Map<string, { userId: string; authorId: string; viewDelta: number; purchaseDelta: number }> = new Map();

    for (const event of events) {
      if (!event.userId || !event.bookId) continue;

      const metadata = await getBookMetadata(event.bookId);
      if (!metadata) continue;

      const isView = this.isViewEvent(event.eventType);
      const isPurchase = this.isPurchaseEvent(event.eventType);
      if (!isView && !isPurchase) continue;

      const weight = isView
        ? this.getViewWeight(event.eventType)
        : this.getPurchaseWeight(event.eventType);

      // Category updates
      const categoryKey = `${event.userId}:${metadata.categoryId}`;
      const existingCat = categoryUpdates.get(categoryKey);
      if (existingCat) {
        if (isView) existingCat.viewDelta += weight;
        if (isPurchase) existingCat.purchaseDelta += weight;
      } else {
        categoryUpdates.set(categoryKey, {
          userId: event.userId,
          categoryId: metadata.categoryId,
          viewDelta: isView ? weight : 0,
          purchaseDelta: isPurchase ? weight : 0,
        });
      }

      // Author updates
      if (metadata.authorId) {
        const authorKey = `${event.userId}:${metadata.authorId}`;
        const existingAuth = authorUpdates.get(authorKey);
        if (existingAuth) {
          if (isView) existingAuth.viewDelta += weight;
          if (isPurchase) existingAuth.purchaseDelta += weight;
        } else {
          authorUpdates.set(authorKey, {
            userId: event.userId,
            authorId: metadata.authorId,
            viewDelta: isView ? weight : 0,
            purchaseDelta: isPurchase ? weight : 0,
          });
        }
      }
    }

    // Batch update category affinities
    for (const update of categoryUpdates.values()) {
      if (update.viewDelta === 0 && update.purchaseDelta === 0) continue;

      const affinity = await this.prisma.userCategoryAffinity.findUnique({
        where: {
          unique_user_category: {
            userId: update.userId,
            categoryId: update.categoryId,
          },
        },
      });

      if (affinity) {
        const newViewScore = affinity.viewScore.toNumber() + update.viewDelta;
        const newPurchaseScore = affinity.purchaseScore.toNumber() + update.purchaseDelta;
        const newTotalScore = this.calculateTotalScore(newViewScore, newPurchaseScore);

        await this.prisma.userCategoryAffinity.update({
          where: { id: affinity.id },
          data: {
            viewScore: newViewScore,
            purchaseScore: newPurchaseScore,
            totalAffinityScore: newTotalScore,
            interactionCount: { increment: 1 },
            lastInteractedAt: new Date(),
          },
        });
      } else {
        await this.prisma.userCategoryAffinity.create({
          data: {
            userId: update.userId,
            categoryId: update.categoryId,
            viewScore: Math.max(0, update.viewDelta),
            purchaseScore: Math.max(0, update.purchaseDelta),
            totalAffinityScore: this.calculateTotalScore(
              Math.max(0, update.viewDelta),
              Math.max(0, update.purchaseDelta),
            ),
            interactionCount: 1,
          },
        });
      }
    }

    // Batch update author affinities
    for (const update of authorUpdates.values()) {
      if (update.viewDelta === 0 && update.purchaseDelta === 0) continue;

      const affinity = await this.prisma.userAuthorAffinity.findUnique({
        where: {
          unique_user_author: {
            userId: update.userId,
            authorId: update.authorId,
          },
        },
      });

      if (affinity) {
        const newViewScore = affinity.viewScore.toNumber() + update.viewDelta;
        const newPurchaseScore = affinity.purchaseScore.toNumber() + update.purchaseDelta;
        const newTotalScore = this.calculateTotalScore(newViewScore, newPurchaseScore);

        await this.prisma.userAuthorAffinity.update({
          where: { id: affinity.id },
          data: {
            viewScore: newViewScore,
            purchaseScore: newPurchaseScore,
            totalAffinityScore: newTotalScore,
            interactionCount: { increment: 1 },
            lastInteractedAt: new Date(),
          },
        });
      } else {
        await this.prisma.userAuthorAffinity.create({
          data: {
            userId: update.userId,
            authorId: update.authorId,
            viewScore: Math.max(0, update.viewDelta),
            purchaseScore: Math.max(0, update.purchaseDelta),
            totalAffinityScore: this.calculateTotalScore(
              Math.max(0, update.viewDelta),
              Math.max(0, update.purchaseDelta),
            ),
            interactionCount: 1,
          },
        });
      }
    }
  }

  /**
   * Get top categories for a user
   */
  async getTopCategories(userId: string, limit: number = 3): Promise<string[]> {
    const affinities = await this.prisma.userCategoryAffinity.findMany({
      where: { userId },
      orderBy: { totalAffinityScore: 'desc' },
      take: limit,
    });

    return affinities.map((a) => a.categoryId);
  }

  /**
   * Get top authors for a user
   */
  async getTopAuthors(userId: string, limit: number = 5): Promise<string[]> {
    const affinities = await this.prisma.userAuthorAffinity.findMany({
      where: { userId },
      orderBy: { totalAffinityScore: 'desc' },
      take: limit,
    });

    return affinities.map((a) => a.authorId);
  }

  /**
   * Apply decay factor to old interactions (for cron job)
   * Reduces score by 5% for each month without new interaction
   */
  async applyDecayFactor(months: number = 1, decayPercent: number = 5): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    // Get all affinities that haven't been updated since cutoff
    const oldCategoryAffinities = await this.prisma.userCategoryAffinity.findMany({
      where: {
        lastInteractedAt: { lt: cutoffDate },
      },
    });

    const oldAuthorAffinities = await this.prisma.userAuthorAffinity.findMany({
      where: {
        lastInteractedAt: { lt: cutoffDate },
      },
    });

    let updatedCount = 0;
    const decayFactor = 1 - decayPercent / 100;

    // Update category affinities
    for (const affinity of oldCategoryAffinities) {
      const newViewScore = affinity.viewScore.toNumber() * decayFactor;
      const newPurchaseScore = affinity.purchaseScore.toNumber() * decayFactor;
      const newTotalScore = this.calculateTotalScore(newViewScore, newPurchaseScore);

      await this.prisma.userCategoryAffinity.update({
        where: { id: affinity.id },
        data: {
          viewScore: newViewScore,
          purchaseScore: newPurchaseScore,
          totalAffinityScore: newTotalScore,
        },
      });
      updatedCount++;
    }

    // Update author affinities
    for (const affinity of oldAuthorAffinities) {
      const newViewScore = affinity.viewScore.toNumber() * decayFactor;
      const newPurchaseScore = affinity.purchaseScore.toNumber() * decayFactor;
      const newTotalScore = this.calculateTotalScore(newViewScore, newPurchaseScore);

      await this.prisma.userAuthorAffinity.update({
        where: { id: affinity.id },
        data: {
          viewScore: newViewScore,
          purchaseScore: newPurchaseScore,
          totalAffinityScore: newTotalScore,
        },
      });
      updatedCount++;
    }

    return updatedCount;
  }
}
