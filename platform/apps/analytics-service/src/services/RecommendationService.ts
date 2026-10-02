import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AffinityScoringService } from './AffinityScoringService';
import { CatalogClientService, BookMetadata } from './CatalogClientService';

export interface RecommendedBook {
  id: string;
  title: string;
  coverImage: string | null;
  price: number;
  authorName: string | null;
  categoryName: string | null;
  score: number;
}

export interface SimilarBook {
  id: string;
  title: string;
  coverImage: string | null;
  price: number;
  authorName: string | null;
  similarityScore: number;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly affinityScoring: AffinityScoringService,
    private readonly catalogClient: CatalogClientService,
  ) {}

  /**
   * Get personalized book recommendations for a user ("For You" section)
   */
  async getForYouRecommendations(
    userId: string,
    limit: number = 20,
    excludeBookIds: string[] = [],
  ): Promise<RecommendedBook[]> {
    // Get user's top categories and authors
    const topCategories = await this.affinityScoring.getTopCategories(userId, 3);
    const topAuthors = await this.affinityScoring.getTopAuthors(userId, 5);

    // If user has no affinity data, fall back to bestsellers
    if (topCategories.length === 0 && topAuthors.length === 0) {
      return this.getColdStartRecommendations(limit, excludeBookIds);
    }

    const recommendations: RecommendedBook[] = [];

    // 1. Get books from top categories (70% of results)
    if (topCategories.length > 0) {
      const categoryBooks = await this.catalogClient.getBooksByCategories(
        topCategories,
        Math.floor(limit * 0.7),
        excludeBookIds,
      );

      for (const book of categoryBooks) {
        if (book.status !== 'PUBLISHED') continue;
        recommendations.push({
          id: book.id,
          title: book.title,
          coverImage: book.coverImage,
          price: book.price,
          authorName: book.authorName,
          categoryName: book.categoryName,
          score: 100, // Base score for category match
        });
      }
    }

    // 2. Get books from followed/top authors (30% of results)
    if (topAuthors.length > 0) {
      const authorBooks = await this.catalogClient.getBooksByAuthors(
        topAuthors,
        Math.floor(limit * 0.3),
        [...excludeBookIds, ...recommendations.map((r) => r.id)],
      );

      for (const book of authorBooks) {
        if (book.status !== 'PUBLISHED') continue;
        recommendations.push({
          id: book.id,
          title: book.title,
          coverImage: book.coverImage,
          price: book.price,
          authorName: book.authorName,
          categoryName: book.categoryName,
          score: 80, // Base score for author match
        });
      }
    }

    // Fill remaining with popular books if needed
    if (recommendations.length < limit) {
      const existingIds = [...excludeBookIds, ...recommendations.map((r) => r.id)];
      const popularBooks = await this.catalogClient.getPopularBooks(
        limit - recommendations.length,
        existingIds,
      );

      for (const book of popularBooks) {
        if (book.status !== 'PUBLISHED') continue;
        recommendations.push({
          id: book.id,
          title: book.title,
          coverImage: book.coverImage,
          price: book.price,
          authorName: book.authorName,
          categoryName: book.categoryName,
          score: 50, // Lower score for popular fallback
        });
      }
    }

    return recommendations.slice(0, limit);
  }

  /**
   * Get recommendations for cold start users (no history)
   */
  private async getColdStartRecommendations(
    limit: number,
    excludeBookIds: string[],
  ): Promise<RecommendedBook[]> {
    // Get popular books as fallback
    const popularBooks = await this.catalogClient.getPopularBooks(limit, excludeBookIds);

    return popularBooks.map((book) => ({
      id: book.id,
      title: book.title,
      coverImage: book.coverImage,
      price: book.price,
      authorName: book.authorName,
      categoryName: book.categoryName,
      score: 0, // No personalization score
    }));
  }

  /**
   * Get similar books based on category and author
   */
  async getSimilarBooks(
    bookId: string,
    _userId?: string,
    limit: number = 10,
    excludeBookIds: string[] = [],
  ): Promise<SimilarBook[]> {
    // Get the target book metadata
    const targetBook = await this.catalogClient.getBookMetadata(bookId);

    if (!targetBook) {
      this.logger.warn(`Book not found: ${bookId}`);
      return [];
    }

    const recommendations: SimilarBook[] = [];
    const allExcludeIds = [bookId, ...excludeBookIds];

    // 1. Same category + same author (highest priority) - 40%
    if (targetBook.categoryId && targetBook.authorId) {
      const categoryBooks = await this.catalogClient.getBooksByCategories(
        [targetBook.categoryId],
        Math.floor(limit * 0.4),
        allExcludeIds,
      );

      for (const book of categoryBooks) {
        if (book.authorId === targetBook.authorId) {
          recommendations.push({
            id: book.id,
            title: book.title,
            coverImage: book.coverImage,
            price: book.price,
            authorName: book.authorName,
            similarityScore: 100,
          });
          allExcludeIds.push(book.id);
        }
      }
    }

    // 2. Same category (different author) - 35%
    if (targetBook.categoryId) {
      const categoryBooks = await this.catalogClient.getBooksByCategories(
        [targetBook.categoryId],
        Math.floor(limit * 0.35),
        allExcludeIds,
      );

      for (const book of categoryBooks) {
        recommendations.push({
          id: book.id,
          title: book.title,
          coverImage: book.coverImage,
          price: book.price,
          authorName: book.authorName,
          similarityScore: 70,
        });
        allExcludeIds.push(book.id);
      }
    }

    // 3. Same author (different category) - 25%
    if (targetBook.authorId) {
      const authorBooks = await this.catalogClient.getBooksByAuthors(
        [targetBook.authorId],
        Math.floor(limit * 0.25),
        allExcludeIds,
      );

      for (const book of authorBooks) {
        recommendations.push({
          id: book.id,
          title: book.title,
          coverImage: book.coverImage,
          price: book.price,
          authorName: book.authorName,
          similarityScore: 50,
        });
      }
    }

    return recommendations.slice(0, limit);
  }

  /**
   * Get user's purchased book IDs (for exclusion from recommendations)
   */
  async getUserPurchasedBookIds(userId: string): Promise<string[]> {
    try {
      const purchases = await this.prisma.domainFactSnapshot.findMany({
        where: {
          factType: 'order',
          bookId: { not: null },
        },
        select: { bookId: true },
        distinct: ['bookId'],
      });

      return purchases
        .map((p) => p.bookId)
        .filter((id): id is string => id !== null);
    } catch (error) {
      this.logger.warn(`Failed to get purchased books for user ${userId}: ${error}`);
      return [];
    }
  }
}
