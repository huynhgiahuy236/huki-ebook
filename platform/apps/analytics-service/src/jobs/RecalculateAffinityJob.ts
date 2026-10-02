import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AffinityScoringService } from '../services/AffinityScoringService';

@Injectable()
export class RecalculateAffinityJob {
  private readonly logger = new Logger(RecalculateAffinityJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly affinityScoring: AffinityScoringService,
  ) {}

  /**
   * Daily job to recalculate affinity scores and apply decay
   * Runs at 3:00 AM every day
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleRecalculateAffinity(): Promise<void> {
    this.logger.log('Starting daily affinity recalculation...');
    const startTime = Date.now();

    try {
      // Apply decay factor for old interactions
      const decayedCount = await this.affinityScoring.applyDecayFactor(1, 5);
      this.logger.log(`Applied decay to ${decayedCount} affinity records`);

      // Recalculate total scores for all affinities
      const recalculatedCount = await this.recalculateAllAffinityScores();
      this.logger.log(`Recalculated scores for ${recalculatedCount} affinity records`);

      const duration = Date.now() - startTime;
      this.logger.log(`Affinity recalculation completed in ${duration}ms`);
    } catch (error: any) {
      this.logger.error(`Affinity recalculation failed: ${error?.message || error}`, error?.stack);
    }
  }

  /**
   * Recalculate total affinity scores for all user affinities
   */
  private async recalculateAllAffinityScores(): Promise<number> {
    let totalUpdated = 0;

    // Recalculate category affinities
    const categoryAffinities = await this.prisma.userCategoryAffinity.findMany({
      select: {
        id: true,
        viewScore: true,
        purchaseScore: true,
      },
    });

    for (const affinity of categoryAffinities) {
      const newTotalScore = this.affinityScoring.calculateTotalScore(
        affinity.viewScore.toNumber(),
        affinity.purchaseScore.toNumber(),
      );

      await this.prisma.userCategoryAffinity.update({
        where: { id: affinity.id },
        data: { totalAffinityScore: newTotalScore },
      });
      totalUpdated++;
    }

    // Recalculate author affinities
    const authorAffinities = await this.prisma.userAuthorAffinity.findMany({
      select: {
        id: true,
        viewScore: true,
        purchaseScore: true,
      },
    });

    for (const affinity of authorAffinities) {
      const newTotalScore = this.affinityScoring.calculateTotalScore(
        affinity.viewScore.toNumber(),
        affinity.purchaseScore.toNumber(),
      );

      await this.prisma.userAuthorAffinity.update({
        where: { id: affinity.id },
        data: { totalAffinityScore: newTotalScore },
      });
      totalUpdated++;
    }

    return totalUpdated;
  }

  /**
   * Manual trigger for recalculation (for admin use)
   */
  async triggerManualRecalculation(): Promise<{ updatedCount: number; duration: number }> {
    const startTime = Date.now();
    const count = await this.recalculateAllAffinityScores();
    const duration = Date.now() - startTime;

    return { updatedCount: count, duration };
  }

  /**
   * Manual trigger for decay application (for admin use)
   */
  async triggerManualDecay(months: number = 1, decayPercent: number = 5): Promise<number> {
    return this.affinityScoring.applyDecayFactor(months, decayPercent);
  }
}
