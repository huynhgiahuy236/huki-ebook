import { Injectable, Inject, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const CART_CACHE_PREFIX = 'cart:';
const CART_CACHE_TTL = 3600; // 1 hour

export interface CachedCart {
  id: string;
  userId: string;
  items: CachedCartItem[];
  updatedAt: string;
}

export interface CachedCartItem {
  id: string;
  bookId: string;
  format: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  book: {
    id: string;
    storeId: string;
    title: string;
    slug: string;
    coverUrl: string | null;
    status: string;
  };
}

@Injectable()
export class CartCacheService {
  private readonly logger = new Logger(CartCacheService.name);

  constructor(private readonly redis: RedisService) {}

  private getKey(userId: string): string {
    return `${CART_CACHE_PREFIX}${userId}`;
  }

  async get(userId: string): Promise<CachedCart | null> {
    try {
      const cached = await this.redis.get(this.getKey(userId));
      if (cached) {
        return JSON.parse(cached) as CachedCart;
      }
    } catch (error) {
      this.logger.warn(`Failed to get cart cache for ${userId}`, error);
    }
    return null;
  }

  async set(userId: string, cart: CachedCart): Promise<void> {
    try {
      await this.redis.set(
        this.getKey(userId),
        JSON.stringify(cart),
        CART_CACHE_TTL,
      );
    } catch (error) {
      this.logger.warn(`Failed to set cart cache for ${userId}`, error);
    }
  }

  async invalidate(userId: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(userId));
    } catch (error) {
      this.logger.warn(`Failed to invalidate cart cache for ${userId}`, error);
    }
  }

  async touch(userId: string): Promise<void> {
    try {
      const key = this.getKey(userId);
      const cached = await this.redis.get(key);
      if (cached) {
        const cart = JSON.parse(cached) as CachedCart;
        cart.updatedAt = new Date().toISOString();
        await this.redis.set(key, JSON.stringify(cart), CART_CACHE_TTL);
      }
    } catch (error) {
      this.logger.warn(`Failed to touch cart cache for ${userId}`, error);
    }
  }
}
