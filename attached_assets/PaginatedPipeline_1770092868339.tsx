/**
 * Paginated Pipeline Components
 * ==============================
 * 
 * UI components for paginated deal pipeline views:
 * - InfiniteScrollList: List view with infinite scroll
 * - LoadMoreButton: Manual load more trigger
 * - VirtualizedList: For very large datasets
 * - PaginatedKanban: Kanban with per-column pagination
 * 
 * INSTALLATION:
 *   Copy to: client/src/components/PaginatedPipeline.tsx
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  ChevronDown,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Building,
  Phone,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDeals,
  useKanbanDeals,
  useSearchDeals,
  Deal,
  DealFilters,
  DealSortOptions,
} from '@/hooks/use-paginated-deals';

// ============================================
// INTERSECTION OBSERVER HOOK
// ============================================

function useIntersectionObserver(
  callback: () => void,
  options: { enabled?: boolean; rootMargin?: string } = {}
) {
  const { enabled = true, rootMargin = '100px' } = options;
  const targetRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const target = targetRef.current;
    if (!target || !enabled) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callback();
        }
      },
      { rootMargin }
    );
    
    observer.observe(target);
    
    return () => observer.disconnect();
  }, [callback, enabled, rootMargin]);
  
  return targetRef;
}

// ============================================
// DEAL CARD COMPONENT
// ============================================

interface DealCardProps {
  deal: Deal;
  onClick?: () => void;
  compact?: boolean;
}

export function DealCard({ deal, onClick, compact = false }: DealCardProps) {
  const stageColors: Record<string, string> = {
    lead: 'bg-gray-100 text-gray-800',
    contacted: 'bg-blue-100 text-blue-800',
    qualified: 'bg-yellow-100 text-yellow-800',
    proposal: 'bg-purple-100 text-purple-800',
    negotiation: 'bg-orange-100 text-orange-800',
    closed_won: 'bg-green-100 text-green-800',
    closed_lost: 'bg-red-100 text-red-800',
  };
  
  if (compact) {
    return (
      <div
        className="p-3 bg-white border rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        onClick={onClick}
      >
        <div className="font-medium truncate">{deal.merchantName}</div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-muted-foreground">
            ${deal.value?.toLocaleString() || 0}
          </span>
          <Badge variant="outline" className="text-xs">
            {deal.priority || 'Normal'}
          </Badge>
        </div>
      </div>
    );
  }
  
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{deal.merchantName}</h3>
            <Badge className={cn('mt-1', stageColors[deal.stage] || 'bg-gray-100')}>
              {deal.stage.replace('_', ' ')}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          {deal.contactName && (
            <div className="flex items-center gap-2">
              <Building className="h-3 w-3" />
              <span className="truncate">{deal.contactName}</span>
            </div>
          )}
          {deal.contactPhone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3" />
              <span>{deal.contactPhone}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <DollarSign className="h-3 w-3" />
            <span>${deal.value?.toLocaleString() || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            <span>{new Date(deal.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// DEAL CARD SKELETON
// ============================================

export function DealCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="p-3 bg-white border rounded-lg">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex justify-between mt-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    );
  }
  
  return (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-20 mt-2" />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// LOAD MORE BUTTON
// ============================================

interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading: boolean;
  hasMore: boolean;
  loadedCount: number;
  totalCount?: number;
}

export function LoadMoreButton({
  onClick,
  isLoading,
  hasMore,
  loadedCount,
  totalCount,
}: LoadMoreButtonProps) {
  if (!hasMore) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        {loadedCount > 0 
          ? `Showing all ${loadedCount} deals`
          : 'No deals found'
        }
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center py-4 gap-2">
      <Button
        variant="outline"
        onClick={onClick}
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" />
            Load More
          </>
        )}
      </Button>
      {totalCount !== undefined && (
        <span className="text-xs text-muted-foreground">
          Showing {loadedCount} of {totalCount}
        </span>
      )}
    </div>
  );
}

// ============================================
// INFINITE SCROLL LIST VIEW
// ============================================

interface InfiniteScrollListProps {
  filters?: DealFilters;
  sort?: DealSortOptions;
  onDealClick?: (deal: Deal) => void;
  emptyMessage?: string;
}

export function InfiniteScrollList({
  filters,
  sort,
  onDealClick,
  emptyMessage = 'No deals found',
}: InfiniteScrollListProps) {
  const {
    deals,
    totalCount,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error,
  } = useDeals({ filters, sort });
  
  // Intersection observer for infinite scroll
  const loadMoreRef = useIntersectionObserver(
    useCallback(() => {
      if (hasMore && !isLoadingMore) {
        loadMore();
      }
    }, [hasMore, isLoadingMore, loadMore]),
    { enabled: hasMore && !isLoadingMore }
  );
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <DealCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading deals: {error.message}
      </div>
    );
  }
  
  if (deals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {deals.map((deal) => (
        <DealCard
          key={deal.id}
          deal={deal}
          onClick={() => onDealClick?.(deal)}
        />
      ))}
      
      {/* Infinite scroll trigger */}
      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
        {isLoadingMore && (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>
      
      {/* End message */}
      {!hasMore && deals.length > 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          {totalCount 
            ? `Showing all ${totalCount} deals`
            : `Showing all ${deals.length} deals`
          }
        </div>
      )}
    </div>
  );
}

// ============================================
// PAGINATED KANBAN VIEW
// ============================================

const STAGE_LABELS: Record<string, string> = {
  lead: 'Leads',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Won',
  closed_lost: 'Lost',
};

const STAGE_COLORS: Record<string, string> = {
  lead: 'border-t-gray-400',
  contacted: 'border-t-blue-400',
  qualified: 'border-t-yellow-400',
  proposal: 'border-t-purple-400',
  negotiation: 'border-t-orange-400',
  closed_won: 'border-t-green-400',
  closed_lost: 'border-t-red-400',
};

interface PaginatedKanbanProps {
  onDealClick?: (deal: Deal) => void;
  onDragEnd?: (dealId: number, newStage: string) => void;
}

export function PaginatedKanban({ onDealClick, onDragEnd }: PaginatedKanbanProps) {
  const {
    stages,
    stageCounts,
    getStageDeals,
    stageHasMore,
    loadMore,
    isLoading,
    isLoadingMore,
    loadingStage,
    error,
  } = useKanbanDeals({ limitPerStage: 10 });
  
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Object.keys(STAGE_LABELS).map((stage) => (
          <div key={stage} className="flex-shrink-0 w-72">
            <div className="bg-muted rounded-lg p-4">
              <Skeleton className="h-6 w-24 mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <DealCardSkeleton key={i} compact />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error loading deals: {error.message}
      </div>
    );
  }
  
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Object.entries(STAGE_LABELS).map(([stage, label]) => (
        <KanbanColumn
          key={stage}
          stage={stage}
          label={label}
          deals={getStageDeals(stage)}
          count={stageCounts[stage] || 0}
          hasMore={stageHasMore(stage)}
          isLoading={loadingStage === stage && isLoadingMore}
          onLoadMore={() => loadMore(stage)}
          onDealClick={onDealClick}
        />
      ))}
    </div>
  );
}

interface KanbanColumnProps {
  stage: string;
  label: string;
  deals: Deal[];
  count: number;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  onDealClick?: (deal: Deal) => void;
}

function KanbanColumn({
  stage,
  label,
  deals,
  count,
  hasMore,
  isLoading,
  onLoadMore,
  onDealClick,
}: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-72">
      <div className={cn(
        'bg-muted rounded-lg border-t-4',
        STAGE_COLORS[stage] || 'border-t-gray-400'
      )}>
        {/* Column header */}
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{label}</h3>
            <Badge variant="secondary">{count}</Badge>
          </div>
        </div>
        
        {/* Column content */}
        <ScrollArea className="h-[calc(100vh-250px)]">
          <div className="p-3 space-y-3">
            {deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                compact
                onClick={() => onDealClick?.(deal)}
              />
            ))}
            
            {deals.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No deals
              </div>
            )}
            
            {/* Load more button */}
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={onLoadMore}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Load more
                  </>
                )}
              </Button>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ============================================
// SEARCH WITH PAGINATION
// ============================================

interface DealSearchProps {
  onDealClick?: (deal: Deal) => void;
}

export function DealSearch({ onDealClick }: DealSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const {
    deals,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useSearchDeals(debouncedQuery, { enabled: debouncedQuery.length >= 2 });
  
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search deals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {debouncedQuery.length >= 2 && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <DealCardSkeleton key={i} />
              ))}
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No deals found for "{debouncedQuery}"
            </div>
          ) : (
            <div className="space-y-3">
              {deals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onClick={() => onDealClick?.(deal)}
                />
              ))}
              
              <LoadMoreButton
                onClick={() => loadMore()}
                isLoading={isLoadingMore}
                hasMore={hasMore || false}
                loadedCount={deals.length}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// FILTER BAR
// ============================================

interface FilterBarProps {
  filters: DealFilters;
  sort: DealSortOptions;
  onFiltersChange: (filters: DealFilters) => void;
  onSortChange: (sort: DealSortOptions) => void;
}

export function FilterBar({ filters, sort, onFiltersChange, onSortChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Stage filter */}
      <Select
        value={filters.stage || 'all'}
        onValueChange={(value) => 
          onFiltersChange({ ...filters, stage: value === 'all' ? undefined : value })
        }
      >
        <SelectTrigger className="w-[150px]">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="All stages" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All stages</SelectItem>
          {Object.entries(STAGE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Sort */}
      <Select
        value={`${sort.sortBy}-${sort.sortOrder}`}
        onValueChange={(value) => {
          const [sortBy, sortOrder] = value.split('-') as [any, 'asc' | 'desc'];
          onSortChange({ sortBy, sortOrder });
        }}
      >
        <SelectTrigger className="w-[180px]">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt-desc">Newest first</SelectItem>
          <SelectItem value="createdAt-asc">Oldest first</SelectItem>
          <SelectItem value="updatedAt-desc">Recently updated</SelectItem>
          <SelectItem value="value-desc">Highest value</SelectItem>
          <SelectItem value="value-asc">Lowest value</SelectItem>
          <SelectItem value="merchantName-asc">Name A-Z</SelectItem>
          <SelectItem value="merchantName-desc">Name Z-A</SelectItem>
        </SelectContent>
      </Select>
      
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search merchants..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-10"
        />
      </div>
    </div>
  );
}

// ============================================
// COMPLETE PIPELINE VIEW
// ============================================

interface PipelineViewProps {
  defaultView?: 'list' | 'kanban';
  onDealClick?: (deal: Deal) => void;
}

export function PipelineView({ defaultView = 'kanban', onDealClick }: PipelineViewProps) {
  const [view, setView] = useState<'list' | 'kanban'>(defaultView);
  const [filters, setFilters] = useState<DealFilters>({});
  const [sort, setSort] = useState<DealSortOptions>({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  
  return (
    <div className="space-y-4">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deal Pipeline</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('kanban')}
          >
            Kanban
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
          >
            List
          </Button>
        </div>
      </div>
      
      {/* Filters (list view only) */}
      {view === 'list' && (
        <FilterBar
          filters={filters}
          sort={sort}
          onFiltersChange={setFilters}
          onSortChange={setSort}
        />
      )}
      
      {/* Content */}
      {view === 'kanban' ? (
        <PaginatedKanban onDealClick={onDealClick} />
      ) : (
        <InfiniteScrollList
          filters={filters}
          sort={sort}
          onDealClick={onDealClick}
        />
      )}
    </div>
  );
}

export default PipelineView;
