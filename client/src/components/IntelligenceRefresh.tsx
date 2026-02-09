/**
 * Intelligence Refresh Component
 * ==============================
 * 
 * UI component for displaying cache status and manually refreshing
 * merchant intelligence data.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Loader2,
  Zap,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// ============================================
// TYPE DEFINITIONS
// ============================================

type CacheCategory = 
  | 'merchantInfo'
  | 'businessHours'
  | 'reviews'
  | 'competitors'
  | 'pricing'
  | 'socialMedia'
  | 'contactInfo'
  | 'financialEstimates';

interface CacheStatusItem {
  category: CacheCategory;
  isCached: boolean;
  ttlRemaining: number | null;
  ttlRemainingFormatted: string | null;
  lastUpdated: string | null;
  configuredTTL: number;
  configuredTTLFormatted: string;
}

interface CacheStatusResponse {
  merchantId: number;
  cacheStatus: CacheStatusItem[];
  config: {
    defaultTTL: string;
    maxSize: number;
    cleanupInterval: string;
  };
}

// ============================================
// CATEGORY LABELS
// ============================================

const CATEGORY_LABELS: Record<CacheCategory, { label: string; description: string }> = {
  merchantInfo: {
    label: 'Basic Info',
    description: 'Business name, address, type',
  },
  businessHours: {
    label: 'Hours',
    description: 'Operating hours',
  },
  reviews: {
    label: 'Reviews',
    description: 'Ratings and reviews',
  },
  competitors: {
    label: 'Competitors',
    description: 'Nearby competition',
  },
  pricing: {
    label: 'Pricing',
    description: 'Menu/pricing data',
  },
  socialMedia: {
    label: 'Social',
    description: 'Social media presence',
  },
  contactInfo: {
    label: 'Contact',
    description: 'Phone, email, website',
  },
  financialEstimates: {
    label: 'Financials',
    description: 'Volume estimates',
  },
};

// ============================================
// HOOKS
// ============================================

/**
 * Hook to fetch cache status
 */
function useCacheStatus(merchantId: number) {
  return useQuery<CacheStatusResponse>({
    queryKey: ['merchantCacheStatus', merchantId],
    queryFn: async () => {
      const response = await apiRequest(
        'GET',
        `/api/merchants/${merchantId}/intelligence/cache-status`
      );
      return response.json();
    },
    refetchInterval: 30000,
  });
}

/**
 * Hook to refresh intelligence
 */
function useRefreshIntelligence(merchantId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (categories?: CacheCategory[]) => {
      const response = await apiRequest(
        'POST',
        `/api/merchants/${merchantId}/intelligence/refresh`,
        categories ? { categories } : undefined
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchantIntelligence', merchantId] });
      queryClient.invalidateQueries({ queryKey: ['merchantCacheStatus', merchantId] });
    },
  });
}

// ============================================
// COMPONENTS
// ============================================

interface RefreshButtonProps {
  merchantId: number;
  variant?: 'default' | 'compact' | 'icon';
  onRefreshComplete?: () => void;
}

/**
 * Simple refresh button
 */
export function RefreshButton({
  merchantId,
  variant = 'default',
  onRefreshComplete,
}: RefreshButtonProps) {
  const refresh = useRefreshIntelligence(merchantId);
  
  const handleRefresh = async () => {
    await refresh.mutateAsync(undefined);
    onRefreshComplete?.();
  };
  
  if (variant === 'icon') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refresh.isPending}
              data-testid="button-refresh-intelligence"
            >
              <RefreshCw className={`h-4 w-4 ${refresh.isPending ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh Intelligence</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (variant === 'compact') {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={refresh.isPending}
        className="gap-2"
        data-testid="button-refresh-intelligence-compact"
      >
        <RefreshCw className={`h-3 w-3 ${refresh.isPending ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    );
  }
  
  return (
    <Button
      onClick={handleRefresh}
      disabled={refresh.isPending}
      className="gap-2"
      data-testid="button-refresh-intelligence-default"
    >
      <RefreshCw className={`h-4 w-4 ${refresh.isPending ? 'animate-spin' : ''}`} />
      {refresh.isPending ? 'Refreshing...' : 'Refresh Intelligence'}
    </Button>
  );
}

/**
 * Dropdown with selective refresh options
 */
interface SelectiveRefreshDropdownProps {
  merchantId: number;
  onRefreshComplete?: () => void;
}

export function SelectiveRefreshDropdown({
  merchantId,
  onRefreshComplete,
}: SelectiveRefreshDropdownProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<CacheCategory>>(new Set());
  const refresh = useRefreshIntelligence(merchantId);
  const { data: cacheStatus } = useCacheStatus(merchantId);
  
  const handleRefresh = async () => {
    const categories = selectedCategories.size > 0 
      ? Array.from(selectedCategories) 
      : undefined;
    await refresh.mutateAsync(categories);
    setSelectedCategories(new Set());
    onRefreshComplete?.();
  };
  
  const toggleCategory = (category: CacheCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-selective-refresh">
          <RefreshCw className={`h-4 w-4 ${refresh.isPending ? 'animate-spin' : ''}`} />
          Refresh
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Select data to refresh</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => {
          const category = key as CacheCategory;
          const status = cacheStatus?.cacheStatus.find(s => s.category === category);
          
          return (
            <DropdownMenuCheckboxItem
              key={category}
              checked={selectedCategories.has(category)}
              onCheckedChange={() => toggleCategory(category)}
              data-testid={`checkbox-category-${category}`}
            >
              <div className="flex items-center justify-between w-full">
                <span>{label}</span>
                {status && (
                  <span className="text-xs text-muted-foreground">
                    {status.isCached ? status.ttlRemainingFormatted : 'Not cached'}
                  </span>
                )}
              </div>
            </DropdownMenuCheckboxItem>
          );
        })}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={handleRefresh}
          disabled={refresh.isPending}
          className="justify-center"
          data-testid="button-execute-refresh"
        >
          {refresh.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              {selectedCategories.size > 0 
                ? `Refresh ${selectedCategories.size} selected`
                : 'Refresh All'
              }
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Full cache status panel
 */
interface CacheStatusPanelProps {
  merchantId: number;
  showRefreshButton?: boolean;
}

export function CacheStatusPanel({
  merchantId,
  showRefreshButton = true,
}: CacheStatusPanelProps) {
  const { data, isLoading, error } = useCacheStatus(merchantId);
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          Could not load cache status
        </CardContent>
      </Card>
    );
  }
  
  const cachedCount = data.cacheStatus.filter(s => s.isCached).length;
  const totalCount = data.cacheStatus.length;
  const freshnessPercent = (cachedCount / totalCount) * 100;
  
  return (
    <Card data-testid="card-cache-status-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Data Freshness
            </CardTitle>
            <CardDescription>
              {cachedCount} of {totalCount} data sources cached
            </CardDescription>
          </div>
          {showRefreshButton && (
            <SelectiveRefreshDropdown merchantId={merchantId} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cache Coverage</span>
            <span className="font-medium">{Math.round(freshnessPercent)}%</span>
          </div>
          <Progress value={freshnessPercent} />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {data.cacheStatus.map(status => (
            <CacheStatusItem key={status.category} status={status} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Individual cache status item
 */
function CacheStatusItem({ status }: { status: CacheStatusItem }) {
  const { label, description } = CATEGORY_LABELS[status.category];
  
  const ttlProgress = status.ttlRemaining && status.configuredTTL
    ? (status.ttlRemaining / status.configuredTTL) * 100
    : 0;
  
  const isExpiringSoon = ttlProgress > 0 && ttlProgress < 20;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`
              p-2 rounded-lg border text-sm
              ${status.isCached 
                ? isExpiringSoon 
                  ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950' 
                  : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
              }
            `}
            data-testid={`cache-status-${status.category}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{label}</span>
              {status.isCached ? (
                <CheckCircle className={`h-3 w-3 ${isExpiringSoon ? 'text-yellow-500' : 'text-green-500'}`} />
              ) : (
                <AlertCircle className="h-3 w-3 text-gray-400" />
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {status.isCached 
                ? `Expires in ${status.ttlRemainingFormatted}`
                : 'Not cached'
              }
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
            <p className="text-xs">
              TTL: {status.configuredTTLFormatted}
            </p>
            {status.lastUpdated && (
              <p className="text-xs">
                Updated: {new Date(status.lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact inline cache indicator
 */
interface CacheIndicatorProps {
  merchantId: number;
  showRefresh?: boolean;
}

export function CacheIndicator({ merchantId, showRefresh = true }: CacheIndicatorProps) {
  const { data } = useCacheStatus(merchantId);
  
  if (!data) return null;
  
  const cachedCount = data.cacheStatus.filter(s => s.isCached).length;
  const totalCount = data.cacheStatus.length;
  const allCached = cachedCount === totalCount;
  const noneCached = cachedCount === 0;
  
  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge 
              variant="outline" 
              className={`
                ${allCached ? 'text-green-600 border-green-300 dark:text-green-400 dark:border-green-700' : ''}
                ${noneCached ? 'text-gray-500 border-gray-300 dark:text-gray-400 dark:border-gray-600' : ''}
                ${!allCached && !noneCached ? 'text-yellow-600 border-yellow-300 dark:text-yellow-400 dark:border-yellow-700' : ''}
              `}
              data-testid="badge-cache-indicator"
            >
              <Clock className="h-3 w-3 mr-1" />
              {cachedCount}/{totalCount} cached
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Intelligence data cache status</p>
            <p className="text-xs text-muted-foreground">
              {allCached 
                ? 'All data is fresh'
                : noneCached
                  ? 'No cached data - will fetch on load'
                  : 'Some data may be refreshed on load'
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {showRefresh && <RefreshButton merchantId={merchantId} variant="icon" />}
    </div>
  );
}

/**
 * Stale data warning banner
 */
interface StaleDataWarningProps {
  merchantId: number;
  onRefresh?: () => void;
}

export function StaleDataWarning({ merchantId, onRefresh }: StaleDataWarningProps) {
  const { data } = useCacheStatus(merchantId);
  const refresh = useRefreshIntelligence(merchantId);
  
  if (!data) return null;
  
  const criticalCategories: CacheCategory[] = ['reviews', 'pricing', 'financialEstimates'];
  const staleCategories = data.cacheStatus.filter(
    s => criticalCategories.includes(s.category) && !s.isCached
  );
  
  if (staleCategories.length === 0) return null;
  
  const handleRefresh = async () => {
    await refresh.mutateAsync(staleCategories.map(s => s.category));
    onRefresh?.();
  };
  
  return (
    <div 
      className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-center justify-between flex-wrap gap-2"
      data-testid="warning-stale-data"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        <span className="text-sm text-yellow-800 dark:text-yellow-200">
          Some intelligence data may be outdated
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleRefresh}
        disabled={refresh.isPending}
        data-testid="button-refresh-stale"
      >
        <RefreshCw className={`h-3 w-3 mr-1 ${refresh.isPending ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  );
}

export default CacheStatusPanel;
