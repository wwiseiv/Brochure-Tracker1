/**
 * Paginated Pipeline Components
 * ==============================
 * 
 * UI components for paginated deal pipeline views:
 * - InfiniteScrollList: List view with infinite scroll
 * - LoadMoreButton: Manual load more trigger
 * - PaginatedKanban: Kanban with per-column pagination
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Building,
  Phone,
  DollarSign,
  Calendar,
  Thermometer,
  List,
  LayoutGrid,
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

const STAGE_LABELS: Record<string, string> = {
  prospect: 'Prospects',
  cold_call: 'Cold Call',
  appointment_set: 'Appointment Set',
  presentation_made: 'Presentation Made',
  proposal_sent: 'Proposal Sent',
  statement_analysis: 'Statement Analysis',
  negotiating: 'Negotiating',
  follow_up: 'Follow Up',
  documents_sent: 'Documents Sent',
  documents_signed: 'Docs Signed',
  sold: 'Sold',
  dead: 'Dead',
  installation_scheduled: 'Install Scheduled',
  active_merchant: 'Active Merchant',
};

const STAGE_COLORS: Record<string, string> = {
  prospect: 'border-t-gray-400',
  cold_call: 'border-t-blue-400',
  appointment_set: 'border-t-cyan-400',
  presentation_made: 'border-t-indigo-400',
  proposal_sent: 'border-t-purple-400',
  statement_analysis: 'border-t-violet-400',
  negotiating: 'border-t-yellow-400',
  follow_up: 'border-t-orange-400',
  documents_sent: 'border-t-amber-400',
  documents_signed: 'border-t-lime-400',
  sold: 'border-t-green-400',
  dead: 'border-t-red-400',
  installation_scheduled: 'border-t-teal-400',
  active_merchant: 'border-t-emerald-400',
};

const TEMPERATURE_COLORS: Record<string, string> = {
  hot: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  warm: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  cold: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
};

interface DealCardProps {
  deal: Deal;
  onClick?: () => void;
  compact?: boolean;
}

export function DealCard({ deal, onClick, compact = false }: DealCardProps) {
  const volume = typeof deal.estimatedMonthlyVolume === 'string' 
    ? parseFloat(deal.estimatedMonthlyVolume) 
    : deal.estimatedMonthlyVolume || 0;
  
  if (compact) {
    return (
      <div
        className={cn(
          'p-3 bg-card border rounded-lg shadow-sm cursor-pointer hover-elevate transition-shadow',
        )}
        onClick={onClick}
        data-testid={`card-deal-compact-${deal.id}`}
      >
        <div className="font-medium truncate">{deal.businessName}</div>
        <div className="flex items-center justify-between mt-1 gap-2">
          <span className="text-sm text-muted-foreground">
            ${volume.toLocaleString()}
          </span>
          {deal.temperature && (
            <Badge 
              variant="outline" 
              className={cn('text-xs', TEMPERATURE_COLORS[deal.temperature])}
            >
              {deal.temperature}
            </Badge>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <Card 
      className="cursor-pointer hover-elevate transition-shadow" 
      onClick={onClick}
      data-testid={`card-deal-${deal.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{deal.businessName}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={cn(STAGE_COLORS[deal.currentStage]?.replace('border-t-', 'bg-').replace('-400', '-100') || 'bg-gray-100', 'text-foreground')}>
                {STAGE_LABELS[deal.currentStage] || deal.currentStage}
              </Badge>
              {deal.temperature && (
                <Badge variant="outline" className={cn('text-xs', TEMPERATURE_COLORS[deal.temperature])}>
                  <Thermometer className="h-3 w-3 mr-1" />
                  {deal.temperature}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          {deal.contactName && (
            <div className="flex items-center gap-2">
              <Building className="h-3 w-3" />
              <span className="truncate">{deal.contactName}</span>
            </div>
          )}
          {(deal.contactPhone || deal.businessPhone) && (
            <div className="flex items-center gap-2">
              <Phone className="h-3 w-3" />
              <span>{deal.contactPhone || deal.businessPhone}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <DollarSign className="h-3 w-3" />
            <span>${volume.toLocaleString()}/mo</span>
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

export function DealCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="p-3 bg-card border rounded-lg">
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
      <div className="text-center py-4 text-sm text-muted-foreground" data-testid="text-all-loaded">
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
        data-testid="button-load-more"
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
        <span className="text-xs text-muted-foreground" data-testid="text-showing-count">
          Showing {loadedCount} of {totalCount}
        </span>
      )}
    </div>
  );
}

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
      <div className="space-y-4" data-testid="loading-skeleton">
        {[...Array(5)].map((_, i) => (
          <DealCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8 text-red-500" data-testid="text-error">
        Error loading deals: {error.message}
      </div>
    );
  }
  
  if (deals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground" data-testid="text-empty">
        {emptyMessage}
      </div>
    );
  }
  
  return (
    <div className="space-y-4" data-testid="list-deals">
      {deals.map((deal) => (
        <DealCard
          key={deal.id}
          deal={deal}
          onClick={() => onDealClick?.(deal)}
        />
      ))}
      
      <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
        {isLoadingMore && (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>
      
      {!hasMore && deals.length > 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground" data-testid="text-end-of-list">
          {totalCount 
            ? `Showing all ${totalCount} deals`
            : `Showing all ${deals.length} deals`
          }
        </div>
      )}
    </div>
  );
}

interface PaginatedKanbanProps {
  onDealClick?: (deal: Deal) => void;
}

export function PaginatedKanban({ onDealClick }: PaginatedKanbanProps) {
  const {
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
      <div className="flex gap-4 overflow-x-auto pb-4" data-testid="loading-kanban">
        {Object.keys(STAGE_LABELS).slice(0, 7).map((stage) => (
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
      <div className="text-center py-8 text-red-500" data-testid="text-kanban-error">
        Error loading deals: {error.message}
      </div>
    );
  }
  
  return (
    <div className="flex gap-4 overflow-x-auto pb-4" data-testid="kanban-board">
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
    <div className="flex-shrink-0 w-72" data-testid={`kanban-column-${stage}`}>
      <div className={cn(
        'bg-muted rounded-lg border-t-4',
        STAGE_COLORS[stage] || 'border-t-gray-400'
      )}>
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{label}</h3>
            <Badge variant="secondary" data-testid={`badge-stage-count-${stage}`}>{count}</Badge>
          </div>
        </div>
        
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
            
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={onLoadMore}
                disabled={isLoading}
                data-testid={`button-load-more-${stage}`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Load More
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

interface PipelineSearchProps {
  onResultClick?: (deal: Deal) => void;
}

export function PipelineSearch({ onResultClick }: PipelineSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const { deals, isLoading, hasMore, loadMore, isLoadingMore } = useSearchDeals(debouncedQuery);
  
  return (
    <div className="space-y-4" data-testid="pipeline-search">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search deals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-deals"
        />
      </div>
      
      {debouncedQuery.length >= 2 && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <DealCardSkeleton key={i} />
              ))}
            </div>
          ) : deals.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No deals found for "{debouncedQuery}"
            </div>
          ) : (
            <>
              {deals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onClick={() => onResultClick?.(deal)}
                />
              ))}
              {hasMore && (
                <LoadMoreButton
                  onClick={() => loadMore()}
                  isLoading={isLoadingMore}
                  hasMore={hasMore}
                  loadedCount={deals.length}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface PipelineViewProps {
  defaultView?: 'list' | 'kanban';
  onDealClick?: (deal: Deal) => void;
}

export function PipelineView({ defaultView = 'kanban', onDealClick }: PipelineViewProps) {
  const [view, setView] = useState<'list' | 'kanban'>(defaultView);
  const [filters, setFilters] = useState<DealFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  return (
    <div className="space-y-4" data-testid="pipeline-view">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('kanban')}
            data-testid="button-view-kanban"
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Kanban
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
            data-testid="button-view-list"
          >
            <List className="h-4 w-4 mr-1" />
            List
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>
          
          <Select
            value={filters.temperature || 'all'}
            onValueChange={(value) => setFilters({ ...filters, temperature: value === 'all' ? undefined : value })}
          >
            <SelectTrigger className="w-32" data-testid="select-temperature">
              <SelectValue placeholder="Temperature" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {showFilters && (
        <Card className="p-4" data-testid="filters-panel">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Stage</label>
              <Select
                value={filters.stage || 'all'}
                onValueChange={(value) => setFilters({ ...filters, stage: value === 'all' ? undefined : value })}
              >
                <SelectTrigger data-testid="select-stage">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {Object.entries(STAGE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Search</label>
              <Input
                placeholder="Search deals..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                data-testid="input-filter-search"
              />
            </div>
            
            <div className="flex items-end">
              <Button
                variant="ghost"
                onClick={() => setFilters({})}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {view === 'kanban' ? (
        <PaginatedKanban onDealClick={onDealClick} />
      ) : (
        <InfiniteScrollList
          filters={filters}
          onDealClick={onDealClick}
        />
      )}
    </div>
  );
}

export default PipelineView;
