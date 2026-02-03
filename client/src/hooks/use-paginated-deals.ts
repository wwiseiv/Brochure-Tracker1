/**
 * Pagination Hooks for Deal Pipeline
 * ===================================
 * 
 * React Query hooks for cursor-based pagination with:
 * - Infinite scroll support
 * - Load more functionality
 * - Kanban view pagination
 * - Optimistic updates
 */

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface Deal {
  id: number;
  businessName: string;
  stage: string;
  status?: string;
  estimatedMonthlyVolume?: number;
  estimatedCommission?: number;
  contactName?: string;
  contactPhone?: string;
  businessPhone?: string;
  businessEmail?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  agentId?: string;
  temperature?: string;
  dealProbability?: number;
  nextFollowUpDate?: string;
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
    hasPrev: boolean;
    count: number;
    totalCount?: number;
  };
}

export interface KanbanResponse {
  stages: Record<string, {
    items: Deal[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
  stageCounts: Record<string, number>;
}

export interface DealFilters {
  stage?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  minValue?: number;
  maxValue?: number;
  assignedTo?: string;
  temperature?: string;
  priority?: string;
}

export interface DealSortOptions {
  sortBy: 'createdAt' | 'updatedAt' | 'estimatedMonthlyVolume' | 'businessName' | 'stage';
  sortOrder: 'asc' | 'desc';
}

export interface UseDealsOptions {
  filters?: DealFilters;
  sort?: DealSortOptions;
  limit?: number;
  enabled?: boolean;
}

export function useDeals(options: UseDealsOptions = {}) {
  const {
    filters = {},
    sort = { sortBy: 'createdAt', sortOrder: 'desc' },
    limit = 20,
    enabled = true,
  } = options;
  
  const buildQueryString = useCallback((cursor?: string) => {
    const params = new URLSearchParams();
    
    params.set('limit', String(limit));
    params.set('sortBy', sort.sortBy);
    params.set('sortOrder', sort.sortOrder);
    
    if (cursor) params.set('cursor', cursor);
    if (filters.stage) params.set('stage', filters.stage);
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.minValue !== undefined) params.set('minValue', String(filters.minValue));
    if (filters.maxValue !== undefined) params.set('maxValue', String(filters.maxValue));
    if (filters.assignedTo) params.set('assignedTo', filters.assignedTo);
    if (filters.temperature) params.set('temperature', filters.temperature);
    if (filters.priority) params.set('priority', filters.priority);
    
    return params.toString();
  }, [filters, sort, limit]);
  
  const query = useInfiniteQuery<PaginatedResponse<Deal>>({
    queryKey: ['deals', 'paginated', 'list', filters, sort, limit],
    queryFn: async ({ pageParam }) => {
      const queryString = buildQueryString(pageParam as string | undefined);
      const response = await apiRequest('GET', `/api/deals/paginated?${queryString}`);
      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor || undefined,
    getPreviousPageParam: (firstPage) => firstPage.pagination.prevCursor || undefined,
    initialPageParam: undefined,
    enabled,
  });
  
  const deals = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap(page => page.items);
  }, [query.data]);
  
  const totalCount = query.data?.pages[0]?.pagination.totalCount;
  
  return {
    deals,
    totalCount,
    isLoading: query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}

export interface UseKanbanDealsOptions {
  limitPerStage?: number;
  sort?: DealSortOptions;
  enabled?: boolean;
}

export function useKanbanDeals(options: UseKanbanDealsOptions = {}) {
  const {
    limitPerStage = 10,
    sort = { sortBy: 'updatedAt', sortOrder: 'desc' },
    enabled = true,
  } = options;
  
  const queryClient = useQueryClient();
  
  const query = useQuery<KanbanResponse>({
    queryKey: ['deals', 'paginated', 'kanban', limitPerStage, sort],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limitPerStage', String(limitPerStage));
      params.set('sortBy', sort.sortBy);
      params.set('sortOrder', sort.sortOrder);
      
      const response = await apiRequest('GET', `/api/deals/kanban?${params}`);
      return response.json();
    },
    enabled,
  });
  
  const loadMoreForStage = useMutation({
    mutationFn: async ({ stage, cursor }: { stage: string; cursor: string }) => {
      const params = new URLSearchParams();
      params.set('limit', String(limitPerStage));
      params.set('cursor', cursor);
      params.set('sortBy', sort.sortBy);
      params.set('sortOrder', sort.sortOrder);
      
      const response = await apiRequest('GET', `/api/deals/stage/${stage}?${params}`);
      return { stage, data: await response.json() as PaginatedResponse<Deal> };
    },
    onSuccess: ({ stage, data }) => {
      queryClient.setQueryData<KanbanResponse>(
        ['deals', 'paginated', 'kanban', limitPerStage, sort],
        (old) => {
          if (!old) return old;
          
          return {
            ...old,
            stages: {
              ...old.stages,
              [stage]: {
                items: [...old.stages[stage].items, ...data.items],
                nextCursor: data.pagination.nextCursor,
                hasMore: data.pagination.hasMore,
              },
            },
          };
        }
      );
    },
  });
  
  const getStageDeals = useCallback((stage: string) => {
    return query.data?.stages[stage]?.items || [];
  }, [query.data]);
  
  const stageHasMore = useCallback((stage: string) => {
    return query.data?.stages[stage]?.hasMore || false;
  }, [query.data]);
  
  const getStageCursor = useCallback((stage: string) => {
    return query.data?.stages[stage]?.nextCursor || null;
  }, [query.data]);
  
  const loadMore = useCallback((stage: string) => {
    const cursor = getStageCursor(stage);
    if (cursor && !loadMoreForStage.isPending) {
      loadMoreForStage.mutate({ stage, cursor });
    }
  }, [getStageCursor, loadMoreForStage]);
  
  return {
    data: query.data,
    stages: query.data?.stages || {},
    stageCounts: query.data?.stageCounts || {},
    getStageDeals,
    stageHasMore,
    loadMore,
    isLoading: query.isLoading,
    isLoadingMore: loadMoreForStage.isPending,
    loadingStage: loadMoreForStage.variables?.stage,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useStageDeals(stage: string, options: { limit?: number; enabled?: boolean } = {}) {
  const { limit = 20, enabled = true } = options;
  
  const query = useInfiniteQuery<PaginatedResponse<Deal>>({
    queryKey: ['deals', 'paginated', 'stage', stage, limit],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (pageParam) params.set('cursor', pageParam as string);
      
      const response = await apiRequest('GET', `/api/deals/stage/${stage}?${params}`);
      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor || undefined,
    initialPageParam: undefined,
    enabled: enabled && !!stage,
  });
  
  const deals = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap(page => page.items);
  }, [query.data]);
  
  return {
    deals,
    isLoading: query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useSearchDeals(searchQuery: string, options: { limit?: number; enabled?: boolean } = {}) {
  const { limit = 20, enabled = true } = options;
  
  const query = useInfiniteQuery<PaginatedResponse<Deal>>({
    queryKey: ['deals', 'paginated', 'search', searchQuery, limit],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('q', searchQuery);
      params.set('limit', String(limit));
      if (pageParam) params.set('cursor', pageParam as string);
      
      const response = await apiRequest('GET', `/api/deals/search?${params}`);
      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor || undefined,
    initialPageParam: undefined,
    enabled: enabled && searchQuery.length >= 2,
  });
  
  const deals = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flatMap(page => page.items);
  }, [query.data]);
  
  return {
    deals,
    isLoading: query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    hasMore: query.hasNextPage,
    loadMore: query.fetchNextPage,
    error: query.error,
  };
}

export function useDealStats() {
  return useQuery({
    queryKey: ['deals', 'stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/deals/stats');
      return response.json();
    },
  });
}

export function useUpdateDealStage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ dealId, newStage }: { dealId: number; newStage: string }) => {
      const response = await apiRequest('PATCH', `/api/deals/${dealId}/stage`, {
        stage: newStage,
      });
      return response.json();
    },
    onMutate: async ({ dealId, newStage }) => {
      await queryClient.cancelQueries({ queryKey: ['deals'] });
      
      const previousKanban = queryClient.getQueryData(['deals', 'paginated', 'kanban']);
      
      queryClient.setQueriesData<KanbanResponse>(
        { queryKey: ['deals', 'paginated', 'kanban'] },
        (old) => {
          if (!old) return old;
          
          let movedDeal: Deal | undefined;
          const newStages = { ...old.stages };
          
          for (const [stage, stageData] of Object.entries(newStages)) {
            const dealIndex = stageData.items.findIndex(d => d.id === dealId);
            if (dealIndex !== -1) {
              movedDeal = { ...stageData.items[dealIndex], stage: newStage };
              newStages[stage] = {
                ...stageData,
                items: stageData.items.filter(d => d.id !== dealId),
              };
              break;
            }
          }
          
          if (movedDeal && newStages[newStage]) {
            newStages[newStage] = {
              ...newStages[newStage],
              items: [movedDeal, ...newStages[newStage].items],
            };
          }
          
          return { ...old, stages: newStages };
        }
      );
      
      return { previousKanban };
    },
    onError: (err, variables, context) => {
      if (context?.previousKanban) {
        queryClient.setQueryData(['deals', 'paginated', 'kanban'], context.previousKanban);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export default useDeals;
