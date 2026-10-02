import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

export interface BookMetadata {
  id: string;
  title: string;
  coverImage: string | null;
  price: number;
  authorId: string | null;
  authorName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  status: string;
}

export interface BookListResponse {
  data: BookMetadata[];
}

@Injectable()
export class CatalogClientService {
  private readonly logger = new Logger(CatalogClientService.name);
  private readonly client: AxiosInstance;
  private readonly catalogBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    // Get catalog service URL from environment or default
    this.catalogBaseUrl = this.configService.get('CATALOG_SERVICE_URL', 'http://localhost:3001');

    this.client = axios.create({
      baseURL: this.catalogBaseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get book metadata by book ID
   */
  async getBookMetadata(bookId: string): Promise<BookMetadata | null> {
    try {
      const response = await this.client.get<BookMetadata>(`/api/books/${bookId}/metadata`);
      return response.data;
    } catch (error: any) {
      this.logger.warn(`Failed to fetch book metadata for ${bookId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get multiple books metadata by IDs
   */
  async getBooksMetadata(bookIds: string[]): Promise<Map<string, BookMetadata>> {
    const result = new Map<string, BookMetadata>();

    try {
      const response = await this.client.post<BookListResponse>('/api/books/metadata/batch', {
        ids: bookIds,
      });

      for (const book of response.data.data) {
        result.set(book.id, book);
      }
    } catch (error: any) {
      this.logger.warn(`Failed to batch fetch book metadata: ${error.message}`);
    }

    return result;
  }

  /**
   * Get books by category IDs
   */
  async getBooksByCategories(
    categoryIds: string[],
    limit: number = 20,
    excludeBookIds: string[] = [],
  ): Promise<BookMetadata[]> {
    try {
      const response = await this.client.post<BookListResponse>('/api/books/by-categories', {
        categoryIds,
        limit,
        excludeBookIds,
      });
      return response.data.data;
    } catch (error: any) {
      this.logger.warn(`Failed to fetch books by categories: ${error.message}`);
      return [];
    }
  }

  /**
   * Get books by author IDs
   */
  async getBooksByAuthors(
    authorIds: string[],
    limit: number = 20,
    excludeBookIds: string[] = [],
  ): Promise<BookMetadata[]> {
    try {
      const response = await this.client.post<BookListResponse>('/api/books/by-authors', {
        authorIds,
        limit,
        excludeBookIds,
      });
      return response.data.data;
    } catch (error: any) {
      this.logger.warn(`Failed to fetch books by authors: ${error.message}`);
      return [];
    }
  }

  /**
   * Get popular/bestseller books
   */
  async getPopularBooks(limit: number = 20, excludeBookIds: string[] = []): Promise<BookMetadata[]> {
    try {
      const response = await this.client.post<BookListResponse>('/api/books/popular', {
        limit,
        excludeBookIds,
      });
      return response.data.data;
    } catch (error: any) {
      this.logger.warn(`Failed to fetch popular books: ${error.message}`);
      return [];
    }
  }
}
