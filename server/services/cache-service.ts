/**
 * Configurable Cache Service
 * ==========================
 * 
 * A flexible caching layer for Merchant Intelligence with:
 * - Configurable TTLs via environment variables
 * - Tiered caching (different TTLs for different data types)
 * - Manual refresh capability
 * - Cache statistics and monitoring
 * - Automatic cleanup of expired entries
 */

import { EventEmitter } from 'events';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Cache configuration loaded from environment variables
 */
export interface CacheConfig {
  /** Default TTL in milliseconds */
  defaultTTL: number;
  
  /** TTL for merchant basic info (name, address, etc.) - changes rarely */
  merchantInfoTTL: number;
  
  /** TTL for business hours - may change seasonally */
  businessHoursTTL: number;
  
  /** TTL for reviews and ratings - changes frequently */
  reviewsTTL: number;
  
  /** TTL for competitive intelligence - changes moderately */
  competitorsTTL: number;
  
  /** TTL for pricing/menu data - changes frequently */
  pricingTTL: number;
  
  /** TTL for social media data - changes very frequently */
  socialMediaTTL: number;
  
  /** TTL for contact info - changes rarely */
  contactInfoTTL: number;
  
  /** TTL for financial estimates - changes with new data */
  financialEstimatesTTL: number;
  
  /** Maximum cache size (number of entries) */
  maxSize: number;
  
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
  
  /** Enable cache statistics */
  enableStats: boolean;
}

/**
 * Load configuration from environment variables with sensible defaults
 */
export function loadCacheConfig(): CacheConfig {
  return {
    // Default: 30 minutes (reduced from 1 hour)
    defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '1800000', 10),
    
    // Merchant basic info: 24 hours (changes rarely)
    merchantInfoTTL: parseInt(process.env.CACHE_MERCHANT_INFO_TTL || '86400000', 10),
    
    // Business hours: 12 hours
    businessHoursTTL: parseInt(process.env.CACHE_BUSINESS_HOURS_TTL || '43200000', 10),
    
    // Reviews: 15 minutes (changes frequently)
    reviewsTTL: parseInt(process.env.CACHE_REVIEWS_TTL || '900000', 10),
    
    // Competitors: 2 hours
    competitorsTTL: parseInt(process.env.CACHE_COMPETITORS_TTL || '7200000', 10),
    
    // Pricing/menu: 30 minutes
    pricingTTL: parseInt(process.env.CACHE_PRICING_TTL || '1800000', 10),
    
    // Social media: 10 minutes (very dynamic)
    socialMediaTTL: parseInt(process.env.CACHE_SOCIAL_MEDIA_TTL || '600000', 10),
    
    // Contact info: 24 hours
    contactInfoTTL: parseInt(process.env.CACHE_CONTACT_INFO_TTL || '86400000', 10),
    
    // Financial estimates: 1 hour
    financialEstimatesTTL: parseInt(process.env.CACHE_FINANCIAL_TTL || '3600000', 10),
    
    // Max 10,000 entries by default
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '10000', 10),
    
    // Cleanup every 5 minutes
    cleanupInterval: parseInt(process.env.CACHE_CLEANUP_INTERVAL || '300000', 10),
    
    // Enable stats by default
    enableStats: process.env.CACHE_ENABLE_STATS !== 'false',
  };
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export type CacheCategory = 
  | 'merchantInfo'
  | 'businessHours'
  | 'reviews'
  | 'competitors'
  | 'pricing'
  | 'socialMedia'
  | 'contactInfo'
  | 'financialEstimates'
  | 'default';

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  category: CacheCategory;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessedAt: number;
  metadata?: Record<string, any>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  evictions: number;
  expirations: number;
  manualRefreshes: number;
  categoryCounts: Record<CacheCategory, number>;
  avgEntryAge: number;
}

export interface CacheOptions {
  /** Override TTL for this specific entry */
  ttl?: number;
  /** Category for tiered TTL */
  category?: CacheCategory;
  /** Additional metadata to store */
  metadata?: Record<string, any>;
  /** Force refresh even if cached */
  forceRefresh?: boolean;
}

// ============================================
// CACHE SERVICE CLASS
// ============================================

export class CacheService extends EventEmitter {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  constructor(config?: Partial<CacheConfig>) {
    super();
    this.config = { ...loadCacheConfig(), ...config };
    this.stats = this.initStats();
    this.startCleanup();
  }
  
  /**
   * Initialize statistics
   */
  private initStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
      evictions: 0,
      expirations: 0,
      manualRefreshes: 0,
      categoryCounts: {
        merchantInfo: 0,
        businessHours: 0,
        reviews: 0,
        competitors: 0,
        pricing: 0,
        socialMedia: 0,
        contactInfo: 0,
        financialEstimates: 0,
        default: 0,
      },
      avgEntryAge: 0,
    };
  }
  
  /**
   * Get TTL for a category
   */
  getTTLForCategory(category: CacheCategory): number {
    const ttlMap: Record<CacheCategory, number> = {
      merchantInfo: this.config.merchantInfoTTL,
      businessHours: this.config.businessHoursTTL,
      reviews: this.config.reviewsTTL,
      competitors: this.config.competitorsTTL,
      pricing: this.config.pricingTTL,
      socialMedia: this.config.socialMediaTTL,
      contactInfo: this.config.contactInfoTTL,
      financialEstimates: this.config.financialEstimatesTTL,
      default: this.config.defaultTTL,
    };
    
    return ttlMap[category] || this.config.defaultTTL;
  }
  
  /**
   * Generate a cache key
   */
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }
  
  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      if (this.config.enableStats) this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      if (this.config.enableStats) {
        this.stats.misses++;
        this.stats.expirations++;
      }
      return null;
    }
    
    // Update access stats
    if (this.config.enableStats) {
      this.stats.hits++;
      entry.accessCount++;
      entry.lastAccessedAt = Date.now();
    }
    
    return entry.value as T;
  }
  
  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const category = options.category || 'default';
    const ttl = options.ttl || this.getTTLForCategory(category);
    const now = Date.now();
    
    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }
    
    // Update category count if new entry
    const isNew = !this.cache.has(key);
    if (isNew && this.config.enableStats) {
      this.stats.categoryCounts[category]++;
    }
    
    const entry: CacheEntry<T> = {
      key,
      value,
      category,
      createdAt: now,
      expiresAt: now + ttl,
      accessCount: 0,
      lastAccessedAt: now,
      metadata: options.metadata,
    };
    
    this.cache.set(key, entry);
    
    if (this.config.enableStats) {
      this.stats.size = this.cache.size;
    }
    
    this.emit('set', { key, category, ttl });
  }
  
  /**
   * Delete a value from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (entry && this.config.enableStats) {
      this.stats.categoryCounts[entry.category]--;
    }
    
    const deleted = this.cache.delete(key);
    
    if (deleted && this.config.enableStats) {
      this.stats.size = this.cache.size;
    }
    
    return deleted;
  }
  
  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Get or set pattern - fetch from cache or execute getter
   */
  async getOrSet<T>(
    key: string,
    getter: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Force refresh bypasses cache
    if (options.forceRefresh) {
      if (this.config.enableStats) this.stats.manualRefreshes++;
      const value = await getter();
      this.set(key, value, options);
      return value;
    }
    
    // Try cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Fetch and cache
    const value = await getter();
    this.set(key, value, options);
    return value;
  }
  
  /**
   * Invalidate all entries for a merchant
   */
  invalidateMerchant(merchantId: string | number): number {
    const prefix = `merchant:${merchantId}`;
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.delete(key);
        count++;
      }
    }
    
    this.emit('invalidate', { merchantId, count });
    return count;
  }
  
  /**
   * Invalidate entries by category
   */
  invalidateCategory(category: CacheCategory): number {
    let count = 0;
    
    for (const [key, entry] of this.cache) {
      if (entry.category === category) {
        this.delete(key);
        count++;
      }
    }
    
    this.emit('invalidateCategory', { category, count });
    return count;
  }
  
  /**
   * Refresh a specific entry (force re-fetch)
   */
  async refresh<T>(
    key: string,
    getter: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    return this.getOrSet(key, getter, { ...options, forceRefresh: true });
  }
  
  /**
   * Get time until expiration for a key
   */
  getTTL(key: string): number | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : null;
  }
  
  /**
   * Get entry metadata
   */
  getMetadata(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    
    if (!entry || Date.now() > entry.expiresAt) {
      return null;
    }
    
    return { ...entry };
  }
  
  /**
   * Get all keys matching a pattern
   */
  keys(pattern?: string): string[] {
    const allKeys = Array.from(this.cache.keys());
    
    if (!pattern) return allKeys;
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return allKeys.filter(key => regex.test(key));
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = this.initStats();
    this.emit('clear');
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    
    // Calculate average entry age
    let totalAge = 0;
    const now = Date.now();
    
    for (const entry of this.cache.values()) {
      totalAge += now - entry.createdAt;
    }
    
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      avgEntryAge: this.cache.size > 0 ? totalAge / this.cache.size : 0,
    };
  }
  
  /**
   * Get configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Restart cleanup if interval changed
    if (updates.cleanupInterval) {
      this.stopCleanup();
      this.startCleanup();
    }
    
    this.emit('configUpdated', this.config);
  }
  
  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldest: CacheEntry | null = null;
    let oldestKey: string | null = null;
    
    for (const [key, entry] of this.cache) {
      if (!oldest || entry.lastAccessedAt < oldest.lastAccessedAt) {
        oldest = entry;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      if (this.config.enableStats) this.stats.evictions++;
    }
  }
  
  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }
  
  /**
   * Stop automatic cleanup
   */
  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
  
  /**
   * Remove all expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;
    
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.delete(key);
        count++;
      }
    }
    
    if (count > 0 && this.config.enableStats) {
      this.stats.expirations += count;
    }
    
    this.emit('cleanup', { removed: count });
    return count;
  }
  
  /**
   * Shutdown the cache service
   */
  shutdown(): void {
    this.stopCleanup();
    this.clear();
    this.emit('shutdown');
  }
}

// ============================================
// MERCHANT INTELLIGENCE CACHE
// ============================================

/**
 * Specialized cache for Merchant Intelligence data
 */
export class MerchantIntelligenceCache extends CacheService {
  /**
   * Cache merchant basic info
   */
  async getMerchantInfo<T>(
    merchantId: string | number,
    getter: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    const key = this.generateKey('merchant', merchantId, 'info');
    return this.getOrSet(key, getter, {
      category: 'merchantInfo',
      forceRefresh,
    });
  }
  
  /**
   * Cache business hours
   */
  async getBusinessHours<T>(
    merchantId: string | number,
    getter: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    const key = this.generateKey('merchant', merchantId, 'hours');
    return this.getOrSet(key, getter, {
      category: 'businessHours',
      forceRefresh,
    });
  }
  
  /**
   * Cache reviews data
   */
  async getReviews<T>(
    merchantId: string | number,
    getter: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    const key = this.generateKey('merchant', merchantId, 'reviews');
    return this.getOrSet(key, getter, {
      category: 'reviews',
      forceRefresh,
    });
  }
  
  /**
   * Cache competitor data
   */
  async getCompetitors<T>(
    merchantId: string | number,
    getter: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    const key = this.generateKey('merchant', merchantId, 'competitors');
    return this.getOrSet(key, getter, {
      category: 'competitors',
      forceRefresh,
    });
  }
  
  /**
   * Cache pricing/menu data
   */
  async getPricing<T>(
    merchantId: string | number,
    getter: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    const key = this.generateKey('merchant', merchantId, 'pricing');
    return this.getOrSet(key, getter, {
      category: 'pricing',
      forceRefresh,
    });
  }
  
  /**
   * Cache social media data
   */
  async getSocialMedia<T>(
    merchantId: string | number,
    getter: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    const key = this.generateKey('merchant', merchantId, 'social');
    return this.getOrSet(key, getter, {
      category: 'socialMedia',
      forceRefresh,
    });
  }
  
  /**
   * Cache contact info
   */
  async getContactInfo<T>(
    merchantId: string | number,
    getter: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    const key = this.generateKey('merchant', merchantId, 'contact');
    return this.getOrSet(key, getter, {
      category: 'contactInfo',
      forceRefresh,
    });
  }
  
  /**
   * Cache financial estimates
   */
  async getFinancialEstimates<T>(
    merchantId: string | number,
    getter: () => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    const key = this.generateKey('merchant', merchantId, 'financial');
    return this.getOrSet(key, getter, {
      category: 'financialEstimates',
      forceRefresh,
    });
  }
  
  /**
   * Get all cached data for a merchant
   */
  getMerchantCacheStatus(merchantId: string | number): {
    category: CacheCategory;
    cached: boolean;
    ttlRemaining: number | null;
    lastUpdated: Date | null;
  }[] {
    const categories: CacheCategory[] = [
      'merchantInfo',
      'businessHours',
      'reviews',
      'competitors',
      'pricing',
      'socialMedia',
      'contactInfo',
      'financialEstimates',
    ];
    
    const keyMap: Record<CacheCategory, string> = {
      merchantInfo: 'info',
      businessHours: 'hours',
      reviews: 'reviews',
      competitors: 'competitors',
      pricing: 'pricing',
      socialMedia: 'social',
      contactInfo: 'contact',
      financialEstimates: 'financial',
      default: '',
    };
    
    return categories.map(category => {
      const key = this.generateKey('merchant', merchantId, keyMap[category]);
      const entry = this.getMetadata(key);
      
      return {
        category,
        cached: !!entry,
        ttlRemaining: entry ? entry.expiresAt - Date.now() : null,
        lastUpdated: entry ? new Date(entry.createdAt) : null,
      };
    });
  }
  
  /**
   * Refresh all data for a merchant
   */
  async refreshMerchant(
    merchantId: string | number,
    getters: {
      merchantInfo?: () => Promise<any>;
      businessHours?: () => Promise<any>;
      reviews?: () => Promise<any>;
      competitors?: () => Promise<any>;
      pricing?: () => Promise<any>;
      socialMedia?: () => Promise<any>;
      contactInfo?: () => Promise<any>;
      financialEstimates?: () => Promise<any>;
    }
  ): Promise<void> {
    const promises: Promise<any>[] = [];
    
    if (getters.merchantInfo) {
      promises.push(this.getMerchantInfo(merchantId, getters.merchantInfo, true));
    }
    if (getters.businessHours) {
      promises.push(this.getBusinessHours(merchantId, getters.businessHours, true));
    }
    if (getters.reviews) {
      promises.push(this.getReviews(merchantId, getters.reviews, true));
    }
    if (getters.competitors) {
      promises.push(this.getCompetitors(merchantId, getters.competitors, true));
    }
    if (getters.pricing) {
      promises.push(this.getPricing(merchantId, getters.pricing, true));
    }
    if (getters.socialMedia) {
      promises.push(this.getSocialMedia(merchantId, getters.socialMedia, true));
    }
    if (getters.contactInfo) {
      promises.push(this.getContactInfo(merchantId, getters.contactInfo, true));
    }
    if (getters.financialEstimates) {
      promises.push(this.getFinancialEstimates(merchantId, getters.financialEstimates, true));
    }
    
    await Promise.all(promises);
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let cacheInstance: MerchantIntelligenceCache | null = null;

/**
 * Get or create the cache singleton
 */
export function getMerchantCache(config?: Partial<CacheConfig>): MerchantIntelligenceCache {
  if (!cacheInstance) {
    cacheInstance = new MerchantIntelligenceCache(config);
  }
  return cacheInstance;
}

/**
 * Reset the cache singleton (for testing)
 */
export function resetMerchantCache(): void {
  if (cacheInstance) {
    cacheInstance.shutdown();
    cacheInstance = null;
  }
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms: number): string {
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`;
  }
  if (ms < 3600000) {
    return `${Math.round(ms / 60000)}m`;
  }
  return `${Math.round(ms / 3600000)}h`;
}

export default MerchantIntelligenceCache;
