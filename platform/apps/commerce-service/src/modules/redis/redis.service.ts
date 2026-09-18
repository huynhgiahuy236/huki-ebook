import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get<T = string>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(`Redis get failed for key ${key}`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      this.logger.warn(`Redis set failed for key ${key}`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(`Redis del failed for key ${key}`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.warn(`Redis delPattern failed for ${pattern}`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  async keys(pattern: string): Promise<string[]> {
    return this.redis.keys(pattern);
  }

  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }

  async ping(): Promise<string> {
    return this.redis.ping();
  }

  /**
   * Atomic stock reservation via Lua script
   * Checks if available stock >= quantity, and if so decrements it atomically.
   * Returns: 1 if success, 0 if insufficient stock, -1 if key does not exist
   */
  async reserveStockAtomic(bookId: string, quantity: number): Promise<number> {
    const key = `stock:book:${bookId}`;
    const luaScript = `
      local stock = redis.call('GET', KEYS[1])
      if not stock then
        return -1
      end
      local stockNum = tonumber(stock)
      local reqQty = tonumber(ARGV[1])
      if stockNum >= reqQty then
        redis.call('DECRBY', KEYS[1], reqQty)
        return 1
      else
        return 0
      end
    `;
    try {
      const result = await this.redis.eval(luaScript, 1, key, quantity);
      return Number(result);
    } catch (error) {
      this.logger.warn(`reserveStockAtomic failed for ${key}`, error);
      return -1;
    }
  }

  /**
   * Atomic stock release via INCRBY
   */
  async releaseStockAtomic(bookId: string, quantity: number): Promise<number> {
    const key = `stock:book:${bookId}`;
    try {
      const exists = await this.redis.exists(key);
      if (exists) {
        return await this.redis.incrby(key, quantity);
      }
      return 0;
    } catch (error) {
      this.logger.warn(`releaseStockAtomic failed for ${key}`, error);
      return 0;
    }
  }

  /**
   * Synchronize stock cache with DB available stock
   */
  async syncStock(bookId: string, availableStock: number, ttlSeconds = 86400): Promise<void> {
    const key = `stock:book:${bookId}`;
    try {
      await this.redis.setex(key, ttlSeconds, availableStock.toString());
    } catch (error) {
      this.logger.warn(`syncStock failed for ${key}`, error);
    }
  }

  /**
   * Atomic GET and DEL (consume single-use token)
   */
  async getdel<T = string>(key: string): Promise<T | null> {
    const luaScript = `
      local val = redis.call('GET', KEYS[1])
      if val then
        redis.call('DEL', KEYS[1])
      end
      return val
    `;
    try {
      const result = await this.redis.eval(luaScript, 1, key);
      if (!result) return null;
      return JSON.parse(result as string) as T;
    } catch (error) {
      this.logger.warn(`Redis getdel failed for key ${key}`, error);
      return null;
    }
  }

  /**
   * Atomic 2FA OTP verification, attempt increment, and consumption
   */
  async verifyAndConsumeChallengeAtomic(
    key: string,
    inputHash: string,
    maxAttempts = 3,
  ): Promise<{ status: 'SUCCESS' | 'NOT_FOUND' | 'INCORRECT' | 'INVALIDATED'; data?: any; attempts?: number }> {
    const luaScript = `
      local raw = redis.call('GET', KEYS[1])
      if not raw then
        return cjson.encode({ status = 'NOT_FOUND' })
      end
      local data = cjson.decode(raw)
      if data.codeHash == ARGV[1] then
        redis.call('DEL', KEYS[1])
        return cjson.encode({ status = 'SUCCESS', data = data })
      else
        data.attempts = (data.attempts or 0) + 1
        if data.attempts >= tonumber(ARGV[2]) then
          redis.call('DEL', KEYS[1])
          return cjson.encode({ status = 'INVALIDATED', attempts = data.attempts })
        else
          local ttl = redis.call('TTL', KEYS[1])
          if ttl > 0 then
            redis.call('SETEX', KEYS[1], ttl, cjson.encode(data))
          end
          return cjson.encode({ status = 'INCORRECT', attempts = data.attempts })
        end
      end
    `;
    try {
      const result = await this.redis.eval(luaScript, 1, key, inputHash, maxAttempts);
      return JSON.parse(result as string);
    } catch (error) {
      this.logger.warn(`Redis verifyAndConsumeChallengeAtomic failed for key ${key}`, error);
      return { status: 'NOT_FOUND' };
    }
  }
}

