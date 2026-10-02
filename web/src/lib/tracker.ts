/**
 * HUKI Ebook - User Tracking SDK
 *
 * Client-side tracker for collecting user behavior events.
 * Features:
 * - Session-based tracking for anonymous users
 * - Debounce/throttle to prevent event spam
 * - Batch sending with automatic flush
 * - sendBeacon for guaranteed delivery on page unload
 */

import { v4 as uuidv4 } from 'uuid';

// Event types matching backend
export enum TrackEventType {
  // View events
  PRODUCT_VIEW_LONG = 'PRODUCT_VIEW_LONG',  // Viewed >15s
  READ_SAMPLE = 'READ_SAMPLE',              // Read sample chapters
  SEARCH_QUERY = 'SEARCH_QUERY',            // Searched for books
  BOUNCE = 'BOUNCE',                       // Viewed <3s then left
  FOLLOW_AUTHOR = 'FOLLOW_AUTHOR',          // Followed an author
  FOLLOW_STORE = 'FOLLOW_STORE',            // Followed a publisher/business
  CATEGORY_VIEW = 'CATEGORY_VIEW',          // Visited a category page
  AUTHOR_VIEW = 'AUTHOR_VIEW',              // Visited author page

  // Purchase intent events
  ADD_TO_CART = 'ADD_TO_CART',
  SAVE_WISHLIST = 'SAVE_WISHLIST',

  // Purchase events
  PURCHASE_BOOK = 'PURCHASE_BOOK',
  READING_PROGRESS = 'READING_PROGRESS',
}

export interface TrackEvent {
  sourceEventId: string;
  eventType: TrackEventType;
  userId?: string;
  sessionId: string;
  bookId?: string;
  properties?: Record<string, any>;
  context?: {
    url?: string;
    referrer?: string;
    userAgent?: string;
  };
  createdAt: string;
}

interface TrackerConfig {
  endpoint: string;
  flushIntervalMs: number;
  maxBufferSize: number;
  debounceMs: number;
  throttleMs: number;
}

const DEFAULT_CONFIG: TrackerConfig = {
  endpoint: '/api/analytics/events/batch',
  flushIntervalMs: 3000,
  maxBufferSize: 10,
  debounceMs: 500,
  throttleMs: 5000,
};

class Tracker {
  private buffer: TrackEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private config: TrackerConfig;
  private lastViewTimes: Map<string, number> = new Map();
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(config: Partial<TrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.getOrCreateSessionId();
    this.startFlushTimer();

    // Setup beforeunload handler
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flushBeacon());
    }
  }

  /**
   * Get or create session ID from sessionStorage
   */
  private getOrCreateSessionId(): string {
    if (typeof sessionStorage === 'undefined') {
      return uuidv4();
    }

    let sessionId = sessionStorage.getItem('huki_session_id');
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem('huki_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Set user ID when user logs in
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Clear user ID when user logs out
   */
  clearUserId(): void {
    this.userId = undefined;
  }

  /**
   * Track a generic event
   */
  track(
    eventType: TrackEventType,
    properties?: {
      bookId?: string;
      categoryId?: string;
      authorId?: string;
      searchQuery?: string;
      duration?: number;
      progress?: number;
      [key: string]: any;
    },
  ): void {
    // Apply throttle for book view events
    if (properties?.bookId && this.shouldThrottle(eventType, properties.bookId)) {
      return;
    }

    // Apply debounce for scroll events
    if (eventType === TrackEventType.BOUNCE) {
      this.applyDebounce(eventType, properties);
      return;
    }

    const event = this.createEvent(eventType, properties);
    this.addToBuffer(event);
  }

  /**
   * Check if event should be throttled
   */
  private shouldThrottle(eventType: TrackEventType, identifier: string): boolean {
    const now = Date.now();
    const lastTime = this.lastViewTimes.get(identifier);

    if (lastTime && now - lastTime < this.config.throttleMs) {
      return true;
    }

    this.lastViewTimes.set(identifier, now);
    return false;
  }

  /**
   * Apply debounce for specific events
   */
  private applyDebounce(
    eventType: TrackEventType,
    properties?: Record<string, any>,
  ): void {
    const key = `debounce_${eventType}`;

    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      const event = this.createEvent(eventType, properties);
      this.addToBuffer(event);
      this.debounceTimers.delete(key);
    }, this.config.debounceMs);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Create event object
   */
  private createEvent(
    eventType: TrackEventType,
    properties?: Record<string, any>,
  ): TrackEvent {
    return {
      sourceEventId: uuidv4(),
      eventType,
      userId: this.userId,
      sessionId: this.sessionId,
      bookId: properties?.bookId,
      properties: {
        categoryId: properties?.categoryId,
        authorId: properties?.authorId,
        searchQuery: properties?.searchQuery,
        duration: properties?.duration,
        progress: properties?.progress,
        ...properties,
      },
      context: typeof window !== 'undefined' ? {
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
      } : undefined,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Add event to buffer
   */
  private addToBuffer(event: TrackEvent): void {
    this.buffer.push(event);

    // Flush immediately if buffer is full
    if (this.buffer.length >= this.config.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.config.flushIntervalMs);
  }

  /**
   * Flush buffer to server
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
        keepalive: false, // We'll use sendBeacon for keepalive
      });

      if (!response.ok) {
        // Re-add events on failure
        this.buffer = [...events, ...this.buffer];
        console.warn('[Tracker] Failed to flush events, re-buffered:', events.length);
      }
    } catch (error) {
      // Re-add events on error
      this.buffer = [...events, ...this.buffer];
      console.warn('[Tracker] Error flushing events, re-buffered:', events.length);
    }
  }

  /**
   * Flush using sendBeacon (for page unload)
   */
  private flushBeacon(): void {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    const data = JSON.stringify({ events });

    // Use sendBeacon for guaranteed delivery
    if (typeof navigator.sendBeacon !== 'undefined') {
      navigator.sendBeacon(this.config.endpoint, data);
    } else {
      // Fallback for older browsers
      fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true,
      }).catch(() => {
        // Silent fail on unload
      });
    }
  }

  /**
   * Stop the tracker (cleanup)
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Final flush
    this.flush();
  }

  /**
   * Get current buffer size
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// Singleton instance
let trackerInstance: Tracker | null = null;

export function getTracker(): Tracker {
  if (!trackerInstance) {
    trackerInstance = new Tracker();
  }
  return trackerInstance;
}

/**
 * Initialize tracker with user ID (call after login)
 */
export function initTracker(userId?: string): Tracker {
  const tracker = getTracker();
  if (userId) {
    tracker.setUserId(userId);
  }
  return tracker;
}

/**
 * Convenience methods for common tracking scenarios
 */
export const trackEvent = {
  /**
   * Track book view with duration
   */
  bookView: (bookId: string, categoryId?: string, duration?: number) => {
    const tracker = getTracker();
    const eventType = duration && duration > 15
      ? TrackEventType.PRODUCT_VIEW_LONG
      : (duration !== undefined && duration < 3 ? TrackEventType.BOUNCE : TrackEventType.PRODUCT_VIEW_LONG);

    tracker.track(eventType, { bookId, categoryId, duration });
  },

  /**
   * Track sample reading
   */
  readSample: (bookId: string, categoryId?: string) => {
    getTracker().track(TrackEventType.READ_SAMPLE, { bookId, categoryId });
  },

  /**
   * Track search query
   */
  searchQuery: (query: string, categoryId?: string) => {
    getTracker().track(TrackEventType.SEARCH_QUERY, { searchQuery: query, categoryId });
  },

  /**
   * Track add to cart
   */
  addToCart: (bookId: string, categoryId?: string) => {
    getTracker().track(TrackEventType.ADD_TO_CART, { bookId, categoryId });
  },

  /**
   * Track add to wishlist
   */
  addToWishlist: (bookId: string, categoryId?: string) => {
    getTracker().track(TrackEventType.SAVE_WISHLIST, { bookId, categoryId });
  },

  /**
   * Track purchase
   */
  purchase: (bookId: string, categoryId?: string) => {
    getTracker().track(TrackEventType.PURCHASE_BOOK, { bookId, categoryId });
  },

  /**
   * Track reading progress
   */
  readingProgress: (bookId: string, progress: number, categoryId?: string) => {
    getTracker().track(TrackEventType.READING_PROGRESS, { bookId, progress, categoryId });
  },

  /**
   * Track author follow
   */
  followAuthor: (authorId: string, categoryId?: string) => {
    getTracker().track(TrackEventType.FOLLOW_AUTHOR, { authorId, categoryId });
  },

  /**
   * Track store/publisher follow
   */
  followStore: (storeId: string, categoryId?: string) => {
    getTracker().track(TrackEventType.FOLLOW_STORE, { storeId, categoryId });
  },

  /**
   * Track category page view
   */
  categoryView: (categoryId: string) => {
    getTracker().track(TrackEventType.CATEGORY_VIEW, { categoryId });
  },

  /**
   * Track author page view
   */
  authorView: (authorId: string, categoryId?: string) => {
    getTracker().track(TrackEventType.AUTHOR_VIEW, { authorId, categoryId });
  },
};
