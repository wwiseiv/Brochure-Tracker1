/**
 * Merchant Intelligence Routes - Cache Integration
 * =================================================
 * 
 * This file shows how to integrate the configurable cache
 * into your routes.ts for Merchant Intelligence endpoints.
 * 
 * KEY CHANGES:
 * 1. Replace hardcoded 1-hour TTL with configurable tiered caching
 * 2. Add manual "Refresh Intelligence" endpoint
 * 3. Add cache status endpoint for debugging
 */

import { Router, Request, Response } from 'express';
import { getMerchantCache, CacheCategory } from './services/cache-service';

const router = Router();

// Get cache instance
const cache = getMerchantCache();

// ============================================
// BEFORE (Hardcoded 1-hour cache)
// ============================================

/*
// This was the old approach - DON'T USE

const CACHE_TTL = 3600000; // 1 hour hardcoded!

async function getMerchantIntelligence(merchantId: number) {
  const cacheKey = `merchant_intel_${merchantId}`;
  
  // Check cache
  const cached = memoryCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Fetch fresh data
  const data = await fetchMerchantData(merchantId);
  
  // Cache for 1 hour (hardcoded!)
  memoryCache.set(cacheKey, data, CACHE_TTL);
  
  return data;
}
*/

// ============================================
// AFTER (Configurable tiered caching)
// ============================================

/**
 * GET /api/merchants/:id/intelligence
 * 
 * Get merchant intelligence data with smart caching
 */
router.get('/api/merchants/:id/intelligence', async (req: Request, res: Response) => {
  const merchantId = parseInt(req.params.id, 10);
  const forceRefresh = req.query.refresh === 'true';
  
  try {
    // Each data type uses its own TTL
    const [
      merchantInfo,
      businessHours,
      reviews,
      competitors,
      pricing,
      socialMedia,
      contactInfo,
      financialEstimates,
    ] = await Promise.all([
      // Basic info - 24 hour TTL
      cache.getMerchantInfo(
        merchantId,
        () => fetchMerchantBasicInfo(merchantId),
        forceRefresh
      ),
      
      // Business hours - 12 hour TTL
      cache.getBusinessHours(
        merchantId,
        () => fetchBusinessHours(merchantId),
        forceRefresh
      ),
      
      // Reviews - 15 minute TTL (changes frequently)
      cache.getReviews(
        merchantId,
        () => fetchReviews(merchantId),
        forceRefresh
      ),
      
      // Competitors - 2 hour TTL
      cache.getCompetitors(
        merchantId,
        () => fetchCompetitorData(merchantId),
        forceRefresh
      ),
      
      // Pricing - 30 minute TTL
      cache.getPricing(
        merchantId,
        () => fetchPricingData(merchantId),
        forceRefresh
      ),
      
      // Social media - 10 minute TTL (very dynamic)
      cache.getSocialMedia(
        merchantId,
        () => fetchSocialMediaData(merchantId),
        forceRefresh
      ),
      
      // Contact info - 24 hour TTL
      cache.getContactInfo(
        merchantId,
        () => fetchContactInfo(merchantId),
        forceRefresh
      ),
      
      // Financial estimates - 1 hour TTL
      cache.getFinancialEstimates(
        merchantId,
        () => calculateFinancialEstimates(merchantId),
        forceRefresh
      ),
    ]);
    
    // Get cache status for each category
    const cacheStatus = cache.getMerchantCacheStatus(merchantId);
    
    res.json({
      merchantId,
      data: {
        merchantInfo,
        businessHours,
        reviews,
        competitors,
        pricing,
        socialMedia,
        contactInfo,
        financialEstimates,
      },
      meta: {
        // Tell frontend how fresh each piece of data is
        cacheStatus: cacheStatus.map(s => ({
          category: s.category,
          cached: s.cached,
          expiresIn: s.ttlRemaining ? Math.round(s.ttlRemaining / 1000) : null,
          lastUpdated: s.lastUpdated?.toISOString() || null,
        })),
        refreshedAt: new Date().toISOString(),
        wasForceRefreshed: forceRefresh,
      },
    });
    
  } catch (error) {
    console.error('Failed to fetch merchant intelligence:', error);
    res.status(500).json({
      error: 'Failed to fetch merchant intelligence',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/merchants/:id/intelligence/refresh
 * 
 * Force refresh all intelligence data for a merchant
 */
router.post('/api/merchants/:id/intelligence/refresh', async (req: Request, res: Response) => {
  const merchantId = parseInt(req.params.id, 10);
  const categories = req.body.categories as CacheCategory[] | undefined;
  
  try {
    // If specific categories requested, only refresh those
    if (categories && Array.isArray(categories)) {
      const results: Record<string, any> = {};
      
      for (const category of categories) {
        switch (category) {
          case 'merchantInfo':
            results.merchantInfo = await cache.getMerchantInfo(
              merchantId, 
              () => fetchMerchantBasicInfo(merchantId),
              true
            );
            break;
          case 'reviews':
            results.reviews = await cache.getReviews(
              merchantId,
              () => fetchReviews(merchantId),
              true
            );
            break;
          case 'pricing':
            results.pricing = await cache.getPricing(
              merchantId,
              () => fetchPricingData(merchantId),
              true
            );
            break;
          case 'socialMedia':
            results.socialMedia = await cache.getSocialMedia(
              merchantId,
              () => fetchSocialMediaData(merchantId),
              true
            );
            break;
          // Add other categories...
        }
      }
      
      return res.json({
        success: true,
        refreshed: categories,
        data: results,
        refreshedAt: new Date().toISOString(),
      });
    }
    
    // Refresh all categories
    await cache.refreshMerchant(merchantId, {
      merchantInfo: () => fetchMerchantBasicInfo(merchantId),
      businessHours: () => fetchBusinessHours(merchantId),
      reviews: () => fetchReviews(merchantId),
      competitors: () => fetchCompetitorData(merchantId),
      pricing: () => fetchPricingData(merchantId),
      socialMedia: () => fetchSocialMediaData(merchantId),
      contactInfo: () => fetchContactInfo(merchantId),
      financialEstimates: () => calculateFinancialEstimates(merchantId),
    });
    
    res.json({
      success: true,
      refreshed: 'all',
      refreshedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Failed to refresh merchant intelligence:', error);
    res.status(500).json({
      error: 'Failed to refresh intelligence',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/merchants/:id/intelligence/cache-status
 * 
 * Get cache status for a merchant (debugging/monitoring)
 */
router.get('/api/merchants/:id/intelligence/cache-status', async (req: Request, res: Response) => {
  const merchantId = parseInt(req.params.id, 10);
  
  const cacheStatus = cache.getMerchantCacheStatus(merchantId);
  const config = cache.getConfig();
  
  res.json({
    merchantId,
    cacheStatus: cacheStatus.map(s => ({
      category: s.category,
      isCached: s.cached,
      ttlRemaining: s.ttlRemaining,
      ttlRemainingFormatted: s.ttlRemaining 
        ? formatDuration(s.ttlRemaining)
        : null,
      lastUpdated: s.lastUpdated?.toISOString() || null,
      configuredTTL: cache.getTTLForCategory(s.category),
      configuredTTLFormatted: formatDuration(cache.getTTLForCategory(s.category)),
    })),
    config: {
      defaultTTL: formatDuration(config.defaultTTL),
      maxSize: config.maxSize,
      cleanupInterval: formatDuration(config.cleanupInterval),
    },
  });
});

/**
 * DELETE /api/merchants/:id/intelligence/cache
 * 
 * Invalidate all cached data for a merchant
 */
router.delete('/api/merchants/:id/intelligence/cache', async (req: Request, res: Response) => {
  const merchantId = parseInt(req.params.id, 10);
  
  const invalidated = cache.invalidateMerchant(merchantId);
  
  res.json({
    success: true,
    invalidatedEntries: invalidated,
  });
});

/**
 * GET /api/admin/cache/stats
 * 
 * Get overall cache statistics (admin only)
 */
router.get('/api/admin/cache/stats', async (req: Request, res: Response) => {
  // Add admin auth check here
  
  const stats = cache.getStats();
  
  res.json({
    stats: {
      ...stats,
      hitRatePercent: (stats.hitRate * 100).toFixed(2) + '%',
      avgEntryAgeFormatted: formatDuration(stats.avgEntryAge),
    },
    config: cache.getConfig(),
  });
});

/**
 * POST /api/admin/cache/config
 * 
 * Update cache configuration at runtime (admin only)
 */
router.post('/api/admin/cache/config', async (req: Request, res: Response) => {
  // Add admin auth check here
  
  const updates = req.body;
  
  // Validate updates
  const allowedKeys = [
    'defaultTTL',
    'merchantInfoTTL',
    'businessHoursTTL',
    'reviewsTTL',
    'competitorsTTL',
    'pricingTTL',
    'socialMediaTTL',
    'contactInfoTTL',
    'financialEstimatesTTL',
  ];
  
  const validUpdates: Record<string, number> = {};
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedKeys.includes(key) && typeof value === 'number' && value > 0) {
      validUpdates[key] = value;
    }
  }
  
  if (Object.keys(validUpdates).length === 0) {
    return res.status(400).json({ error: 'No valid configuration updates provided' });
  }
  
  cache.updateConfig(validUpdates);
  
  res.json({
    success: true,
    updated: validUpdates,
    newConfig: cache.getConfig(),
  });
});

/**
 * POST /api/admin/cache/clear
 * 
 * Clear entire cache (admin only)
 */
router.post('/api/admin/cache/clear', async (req: Request, res: Response) => {
  // Add admin auth check here
  
  cache.clear();
  
  res.json({ success: true, message: 'Cache cleared' });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDuration(ms: number): string {
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`;
  }
  if (ms < 3600000) {
    return `${Math.round(ms / 60000)}m`;
  }
  return `${Math.round(ms / 3600000)}h`;
}

// ============================================
// PLACEHOLDER DATA FETCHERS
// (Replace with your actual implementations)
// ============================================

async function fetchMerchantBasicInfo(merchantId: number) {
  // Your existing implementation
  return { name: 'Example Merchant', address: '123 Main St' };
}

async function fetchBusinessHours(merchantId: number) {
  // Your existing implementation
  return { monday: '9am-5pm', tuesday: '9am-5pm' };
}

async function fetchReviews(merchantId: number) {
  // Your existing implementation
  return { rating: 4.5, count: 120 };
}

async function fetchCompetitorData(merchantId: number) {
  // Your existing implementation
  return { competitors: [] };
}

async function fetchPricingData(merchantId: number) {
  // Your existing implementation
  return { avgTicket: 45 };
}

async function fetchSocialMediaData(merchantId: number) {
  // Your existing implementation
  return { facebook: null, instagram: null };
}

async function fetchContactInfo(merchantId: number) {
  // Your existing implementation
  return { phone: '555-1234', email: null };
}

async function calculateFinancialEstimates(merchantId: number) {
  // Your existing implementation
  return { estimatedVolume: 50000 };
}

// ============================================
// MIGRATION NOTES
// ============================================

/**
 * MIGRATING FROM OLD IMPLEMENTATION:
 * 
 * 1. Find your existing cache logic (likely in routes.ts around line 5367):
 * 
 *    // OLD CODE
 *    const CACHE_TTL = 3600000; // 1 hour
 *    const cached = cache.get(`merchant_${id}`);
 *    if (cached) return cached;
 *    // ... fetch data ...
 *    cache.set(`merchant_${id}`, data, CACHE_TTL);
 * 
 * 2. Replace with the new pattern:
 * 
 *    // NEW CODE
 *    import { getMerchantCache } from './services/cache-service';
 *    const cache = getMerchantCache();
 *    
 *    const data = await cache.getMerchantInfo(id, () => fetchData(id));
 * 
 * 3. Add environment variables for customization:
 * 
 *    CACHE_DEFAULT_TTL=1800000
 *    CACHE_REVIEWS_TTL=900000
 *    CACHE_SOCIAL_MEDIA_TTL=600000
 */

export default router;
