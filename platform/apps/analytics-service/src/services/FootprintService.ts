import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FootprintDeletionResult {
  deletedEvents: number;
  deletedCategoryAffinities: number;
  deletedAuthorAffinities: number;
  deletedAt: Date;
}

@Injectable()
export class FootprintService {
  private readonly logger = new Logger(FootprintService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Delete all footprint data for a user (GDPR compliance)
   */
  async deleteUserFootprint(userId: string): Promise<FootprintDeletionResult> {
    this.logger.log(`Deleting footprint data for user: ${userId}`);

    const results = await this.prisma.$transaction(async (tx) => {
      // 1. Delete all analytics events for this user
      const deletedEvents = await tx.analyticsEvent.deleteMany({
        where: { userId },
      });

      // 2. Delete category affinities
      const deletedCategoryAffinities = await tx.userCategoryAffinity.deleteMany({
        where: { userId },
      });

      // 3. Delete author affinities
      const deletedAuthorAffinities = await tx.userAuthorAffinity.deleteMany({
        where: { userId },
      });

      return {
        deletedEvents: deletedEvents.count,
        deletedCategoryAffinities: deletedCategoryAffinities.count,
        deletedAuthorAffinities: deletedAuthorAffinities.count,
        deletedAt: new Date(),
      };
    });

    this.logger.log(
      `Deleted footprint for user ${userId}: ` +
        `${results.deletedEvents} events, ` +
        `${results.deletedCategoryAffinities} category affinities, ` +
        `${results.deletedAuthorAffinities} author affinities`,
    );

    return results;
  }

  /**
   * Get footprint summary for a user
   */
  async getFootprintSummary(userId: string): Promise<{
    totalEvents: number;
    categoryAffinities: number;
    authorAffinities: number;
    topCategories: { categoryId: string; score: number }[];
    topAuthors: { authorId: string; score: number }[];
  }> {
    const [eventsCount, categoryAffinities, authorAffinities] = await Promise.all([
      this.prisma.analyticsEvent.count({ where: { userId } }),
      this.prisma.userCategoryAffinity.count({ where: { userId } }),
      this.prisma.userAuthorAffinity.count({ where: { userId } }),
    ]);

    const [topCategories, topAuthors] = await Promise.all([
      this.prisma.userCategoryAffinity.findMany({
        where: { userId },
        orderBy: { totalAffinityScore: 'desc' },
        take: 5,
        select: { categoryId: true, totalAffinityScore: true },
      }),
      this.prisma.userAuthorAffinity.findMany({
        where: { userId },
        orderBy: { totalAffinityScore: 'desc' },
        take: 5,
        select: { authorId: true, totalAffinityScore: true },
      }),
    ]);

    return {
      totalEvents: eventsCount,
      categoryAffinities,
      authorAffinities,
      topCategories: topCategories.map((c) => ({
        categoryId: c.categoryId,
        score: c.totalAffinityScore.toNumber(),
      })),
      topAuthors: topAuthors.map((a) => ({
        authorId: a.authorId,
        score: a.totalAffinityScore.toNumber(),
      })),
    };
  }

  /**
   * Export user footprint data (GDPR right to access)
   */
  async exportUserFootprint(userId: string): Promise<{
    events: any[];
    categoryAffinities: any[];
    authorAffinities: any[];
    exportedAt: Date;
  }> {
    const [events, categoryAffinities, authorAffinities] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userCategoryAffinity.findMany({
        where: { userId },
      }),
      this.prisma.userAuthorAffinity.findMany({
        where: { userId },
      }),
    ]);

    return {
      events,
      categoryAffinities,
      authorAffinities,
      exportedAt: new Date(),
    };
  }
}
