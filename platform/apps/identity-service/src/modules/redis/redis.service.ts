import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  // ==================== String Operations ====================
  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  // ==================== Session Management ====================
  async setSession(userId: string, sessionData: Record<string, any>, ttlSeconds = 3600): Promise<void> {
    const key = `session:${userId}`;
    await this.redis.setex(key, ttlSeconds, JSON.stringify(sessionData));
  }

  async getSession(userId: string): Promise<Record<string, any> | null> {
    const key = `session:${userId}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(userId: string): Promise<void> {
    const key = `session:${userId}`;
    await this.redis.del(key);
  }

  // ==================== Cache Operations ====================
  async setCache(prefix: string, key: string, value: any, ttlSeconds = 300): Promise<void> {
    const fullKey = `${prefix}:${key}`;
    await this.redis.setex(fullKey, ttlSeconds, JSON.stringify(value));
  }

  async getCache<T>(prefix: string, key: string): Promise<T | null> {
    const fullKey = `${prefix}:${key}`;
    const data = await this.redis.get(fullKey);
    return data ? JSON.parse(data) : null;
  }

  async deleteCache(prefix: string, key: string): Promise<void> {
    const fullKey = `${prefix}:${key}`;
    await this.redis.del(fullKey);
  }

  async clearCachePrefix(prefix: string): Promise<void> {
    const keys = await this.redis.keys(`${prefix}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // ==================== Rate Limiting ====================
  async incrementWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    const multi = this.redis.multi();
    multi.incr(key);
    multi.expire(key, ttlSeconds);
    const results = await multi.exec();
    return results?.[0]?.[1] as number || 0;
  }

  // ==================== Utility ====================
  async ping(): Promise<string> {
    return this.redis.ping();
  }

  async flushdb(): Promise<void> {
    await this.redis.flushdb();
  }
}
