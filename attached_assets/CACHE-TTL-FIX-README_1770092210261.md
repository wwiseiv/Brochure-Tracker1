# Merchant Intelligence Cache TTL Fix

## The Problem

The Merchant Intelligence cache has issues:
- **1-hour TTL is hardcoded** - Can't adjust without code changes
- **One size fits all** - Same TTL for data that changes hourly vs. yearly
- **No manual refresh** - Users stuck with stale data
- **No visibility** - No way to see cache status

## The Solution

This package implements a tiered, configurable caching system:

| Feature | Benefit |
|---------|---------|
| **Tiered TTLs** | Different TTLs for different data types |
| **Environment Config** | Change TTLs without code changes |
| **Manual Refresh** | "Refresh Intelligence" button |
| **Cache Status UI** | See what's cached and when it expires |
| **Runtime Updates** | Admin can adjust TTLs on the fly |

## Default TTL Configuration

| Data Type | Old TTL | New TTL | Rationale |
|-----------|---------|---------|-----------|
| Basic Info | 1 hour | 24 hours | Name/address rarely change |
| Business Hours | 1 hour | 12 hours | Changes seasonally |
| **Reviews** | 1 hour | **15 min** | Changes frequently |
| Competitors | 1 hour | 2 hours | Moderate change rate |
| **Pricing** | 1 hour | **30 min** | Can change daily |
| **Social Media** | 1 hour | **10 min** | Very dynamic |
| Contact Info | 1 hour | 24 hours | Rarely changes |
| Financials | 1 hour | 1 hour | Keep as-is |

## Files Included

```
cache-ttl-fix/
├── server/
│   ├── services/
│   │   └── cache-service.ts         # Configurable cache service
│   └── routes-integration.ts        # API endpoint updates
├── client/
│   └── src/components/
│       └── IntelligenceRefresh.tsx  # UI components
└── README.md
```

## Installation

### Step 1: Copy Server Files

```bash
cp server/services/cache-service.ts your-project/server/services/
```

### Step 2: Add Environment Variables

```env
# Default TTL (milliseconds) - 30 minutes
CACHE_DEFAULT_TTL=1800000

# Tiered TTLs by data type
CACHE_MERCHANT_INFO_TTL=86400000     # 24 hours
CACHE_BUSINESS_HOURS_TTL=43200000    # 12 hours
CACHE_REVIEWS_TTL=900000             # 15 minutes
CACHE_COMPETITORS_TTL=7200000        # 2 hours
CACHE_PRICING_TTL=1800000            # 30 minutes
CACHE_SOCIAL_MEDIA_TTL=600000        # 10 minutes
CACHE_CONTACT_INFO_TTL=86400000      # 24 hours
CACHE_FINANCIAL_TTL=3600000          # 1 hour

# Cache limits
CACHE_MAX_SIZE=10000
CACHE_CLEANUP_INTERVAL=300000        # 5 minutes
CACHE_ENABLE_STATS=true
```

### Step 3: Update Your Routes

Replace the hardcoded cache logic:

```typescript
// BEFORE - routes.ts line ~5367
const CACHE_TTL = 3600000; // 1 hour hardcoded!
const cached = memoryCache.get(`merchant_${id}`);

// AFTER
import { getMerchantCache } from './services/cache-service';
const cache = getMerchantCache();

// Each data type uses appropriate TTL automatically
const reviews = await cache.getReviews(merchantId, () => fetchReviews(merchantId));
const pricing = await cache.getPricing(merchantId, () => fetchPricing(merchantId));
```

### Step 4: Add Frontend Components

```bash
cp client/src/components/IntelligenceRefresh.tsx your-project/client/src/components/
```

## API Reference

### Cache Service Methods

```typescript
import { getMerchantCache } from './services/cache-service';

const cache = getMerchantCache();

// Get with appropriate TTL for category
await cache.getMerchantInfo(merchantId, () => fetchData());  // 24h TTL
await cache.getReviews(merchantId, () => fetchData());       // 15m TTL
await cache.getPricing(merchantId, () => fetchData());       // 30m TTL

// Force refresh
await cache.getReviews(merchantId, () => fetchData(), true);

// Invalidate all data for a merchant
cache.invalidateMerchant(merchantId);

// Get cache status
cache.getMerchantCacheStatus(merchantId);

// Get statistics
cache.getStats();

// Update config at runtime
cache.updateConfig({ reviewsTTL: 300000 }); // Change to 5 minutes
```

### New API Endpoints

```
# Get intelligence with cache status
GET /api/merchants/:id/intelligence
GET /api/merchants/:id/intelligence?refresh=true  # Force refresh

# Manual refresh
POST /api/merchants/:id/intelligence/refresh
Body: { "categories": ["reviews", "pricing"] }  # Optional - specific categories

# Cache status
GET /api/merchants/:id/intelligence/cache-status

# Invalidate cache
DELETE /api/merchants/:id/intelligence/cache

# Admin endpoints
GET /api/admin/cache/stats
POST /api/admin/cache/config
POST /api/admin/cache/clear
```

## Frontend Components

### Simple Refresh Button

```tsx
import { RefreshButton } from '@/components/IntelligenceRefresh';

<RefreshButton merchantId={123} />
<RefreshButton merchantId={123} variant="compact" />
<RefreshButton merchantId={123} variant="icon" />
```

### Selective Refresh Dropdown

```tsx
import { SelectiveRefreshDropdown } from '@/components/IntelligenceRefresh';

// Users can choose which data to refresh
<SelectiveRefreshDropdown merchantId={123} />
```

### Full Cache Status Panel

```tsx
import { CacheStatusPanel } from '@/components/IntelligenceRefresh';

// Shows all cache categories with status and TTL
<CacheStatusPanel merchantId={123} />
```

### Inline Cache Indicator

```tsx
import { CacheIndicator } from '@/components/IntelligenceRefresh';

// Compact indicator: "5/8 cached"
<CacheIndicator merchantId={123} />
```

### Stale Data Warning

```tsx
import { StaleDataWarning } from '@/components/IntelligenceRefresh';

// Shows warning when critical data is stale
<StaleDataWarning merchantId={123} onRefresh={() => refetchData()} />
```

## Usage Examples

### In Merchant Detail Page

```tsx
function MerchantIntelligence({ merchantId }) {
  const { data, refetch } = useQuery({
    queryKey: ['merchantIntelligence', merchantId],
    queryFn: () => fetchIntelligence(merchantId),
  });
  
  return (
    <div>
      {/* Header with refresh */}
      <div className="flex justify-between">
        <h2>Intelligence</h2>
        <SelectiveRefreshDropdown 
          merchantId={merchantId}
          onRefreshComplete={refetch}
        />
      </div>
      
      {/* Stale data warning */}
      <StaleDataWarning merchantId={merchantId} onRefresh={refetch} />
      
      {/* Your existing content */}
      <ReviewsSection data={data.reviews} />
      <CompetitorsSection data={data.competitors} />
      
      {/* Cache status (collapsible) */}
      <Collapsible>
        <CollapsibleTrigger>Cache Status</CollapsibleTrigger>
        <CollapsibleContent>
          <CacheStatusPanel merchantId={merchantId} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
```

### In Deal Pipeline Card

```tsx
function DealCard({ deal }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <CardTitle>{deal.merchantName}</CardTitle>
          <CacheIndicator merchantId={deal.merchantId} />
        </div>
      </CardHeader>
      {/* ... */}
    </Card>
  );
}
```

## How Tiered Caching Works

```
Request for Reviews
       ↓
Check cache for "merchant:123:reviews"
       ↓
┌─────────────────────────────────┐
│ Found & TTL > 0?                │
│   → Return cached data          │
│                                 │
│ Not found or expired?           │
│   → Fetch fresh data            │
│   → Cache with REVIEWS_TTL      │
│     (15 minutes)                │
└─────────────────────────────────┘

Request for Basic Info
       ↓
Check cache for "merchant:123:info"
       ↓
┌─────────────────────────────────┐
│ Found & TTL > 0?                │
│   → Return cached data          │
│                                 │
│ Not found or expired?           │
│   → Fetch fresh data            │
│   → Cache with INFO_TTL         │
│     (24 hours)                  │
└─────────────────────────────────┘
```

## Configuration Guide

### For Fast-Changing Businesses (Restaurants, Retail)

```env
CACHE_REVIEWS_TTL=300000         # 5 minutes
CACHE_PRICING_TTL=600000         # 10 minutes
CACHE_SOCIAL_MEDIA_TTL=300000    # 5 minutes
```

### For Stable Businesses (B2B, Professional Services)

```env
CACHE_REVIEWS_TTL=3600000        # 1 hour
CACHE_PRICING_TTL=7200000        # 2 hours
CACHE_SOCIAL_MEDIA_TTL=1800000   # 30 minutes
```

### For High-Traffic Deployments

```env
CACHE_MAX_SIZE=50000             # More entries
CACHE_CLEANUP_INTERVAL=600000    # Less frequent cleanup
```

## Migration from Hardcoded Cache

### Before

```typescript
// routes.ts - around line 5367
const CACHE_TTL = 3600000; // 1 hour - HARDCODED!

async function getMerchantIntelligence(merchantId: number) {
  const cacheKey = `merchant_intel_${merchantId}`;
  
  const cached = memoryCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  const data = await fetchAllMerchantData(merchantId);
  memoryCache.set(cacheKey, data, CACHE_TTL);
  
  return data;
}
```

### After

```typescript
// routes.ts
import { getMerchantCache } from './services/cache-service';

const cache = getMerchantCache();

async function getMerchantIntelligence(merchantId: number, forceRefresh = false) {
  // Each piece of data gets appropriate TTL
  const [info, reviews, pricing] = await Promise.all([
    cache.getMerchantInfo(merchantId, () => fetchInfo(merchantId), forceRefresh),
    cache.getReviews(merchantId, () => fetchReviews(merchantId), forceRefresh),
    cache.getPricing(merchantId, () => fetchPricing(merchantId), forceRefresh),
  ]);
  
  return { info, reviews, pricing };
}
```

## Monitoring & Debugging

### View Cache Stats

```typescript
const stats = cache.getStats();
console.log(stats);
// {
//   hits: 1523,
//   misses: 234,
//   hitRate: 0.867,
//   size: 5432,
//   evictions: 12,
//   categoryCounts: {
//     reviews: 234,
//     pricing: 189,
//     ...
//   }
// }
```

### Listen to Cache Events

```typescript
cache.on('set', ({ key, category, ttl }) => {
  console.log(`Cached ${key} (${category}) for ${ttl}ms`);
});

cache.on('invalidate', ({ merchantId, count }) => {
  console.log(`Invalidated ${count} entries for merchant ${merchantId}`);
});

cache.on('cleanup', ({ removed }) => {
  console.log(`Cleanup removed ${removed} expired entries`);
});
```

## Troubleshooting

### Cache not working

1. Check environment variables are loaded
2. Verify cache service is imported correctly
3. Check for multiple cache instances

### TTL not respected

1. Environment variables use milliseconds, not seconds
2. Check if `forceRefresh` is being passed unintentionally
3. Verify cleanup interval is running

### Memory growing

1. Reduce `CACHE_MAX_SIZE`
2. Lower TTLs for high-volume data
3. Check for memory leaks in your data fetchers

---

*This package transforms a rigid 1-hour cache into a flexible, configurable, user-controllable caching system.*
