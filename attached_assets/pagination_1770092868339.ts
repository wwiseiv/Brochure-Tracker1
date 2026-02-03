/**
 * Cursor-Based Pagination Service
 * ================================
 * 
 * Efficient pagination for large datasets using cursor-based approach.
 * Better than offset pagination for:
 * - Consistent results when data changes
 * - Better performance on large tables
 * - Natural fit for infinite scroll UIs
 * 
 * INSTALLATION:
 *   Copy to: server/services/pagination.ts
 */

import { SQL, sql, and, or, gt, lt, gte, lte, eq, desc, asc } from 'drizzle-orm';
import type { PgSelect } from 'drizzle-orm/pg-core';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PaginationParams {
  /** Number of items per page (default: 20, max: 100) */
  limit?: number;
  
  /** Cursor for fetching next page */
  cursor?: string;
  
  /** Direction: 'next' or 'prev' */
  direction?: 'next' | 'prev';
  
  /** Sort field (default: 'createdAt') */
  sortBy?: string;
  
  /** Sort order (default: 'desc') */
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  /** The data items */
  items: T[];
  
  /** Pagination metadata */
  pagination: {
    /** Cursor for next page (null if no more) */
    nextCursor: string | null;
    
    /** Cursor for previous page (null if at start) */
    prevCursor: string | null;
    
    /** Whether there are more items */
    hasMore: boolean;
    
    /** Whether there are previous items */
    hasPrev: boolean;
    
    /** Number of items returned */
    count: number;
    
    /** Total count (optional - expensive for large tables) */
    totalCount?: number;
  };
}

export interface CursorData {
  /** Primary sort value */
  sortValue: string | number | Date;
  
  /** Secondary sort value (usually ID for uniqueness) */
  id: number;
  
  /** Sort field name */
  sortBy: string;
  
  /** Sort order */
  sortOrder: 'asc' | 'desc';
}

// ============================================
// CURSOR ENCODING/DECODING
// ============================================

/**
 * Encode cursor data to base64 string
 */
export function encodeCursor(data: CursorData): string {
  const json = JSON.stringify({
    v: data.sortValue instanceof Date ? data.sortValue.toISOString() : data.sortValue,
    i: data.id,
    s: data.sortBy,
    o: data.sortOrder,
  });
  return Buffer.from(json).toString('base64url');
}

/**
 * Decode cursor string to cursor data
 */
export function decodeCursor(cursor: string): CursorData | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf-8');
    const data = JSON.parse(json);
    
    return {
      sortValue: data.v,
      id: data.i,
      sortBy: data.s,
      sortOrder: data.o,
    };
  } catch {
    return null;
  }
}

// ============================================
// PAGINATION HELPERS
// ============================================

/**
 * Normalize pagination parameters with defaults and limits
 */
export function normalizePaginationParams(params: PaginationParams): Required<PaginationParams> {
  return {
    limit: Math.min(Math.max(params.limit || 20, 1), 100),
    cursor: params.cursor || '',
    direction: params.direction || 'next',
    sortBy: params.sortBy || 'createdAt',
    sortOrder: params.sortOrder || 'desc',
  };
}

/**
 * Build cursor conditions for Drizzle query
 */
export function buildCursorCondition(
  cursor: CursorData,
  direction: 'next' | 'prev',
  sortColumn: any,
  idColumn: any
): SQL {
  const isDesc = cursor.sortOrder === 'desc';
  const isNext = direction === 'next';
  
  // For descending order going forward: less than cursor
  // For ascending order going forward: greater than cursor
  // Reverse for previous direction
  const compareOp = (isDesc && isNext) || (!isDesc && !isNext) ? lt : gt;
  const compareEqOp = (isDesc && isNext) || (!isDesc && !isNext) ? lte : gte;
  const idCompareOp = (isDesc && isNext) || (!isDesc && !isNext) ? lt : gt;
  
  // Handle different types
  let sortValue: any = cursor.sortValue;
  if (typeof sortValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sortValue)) {
    sortValue = new Date(sortValue);
  }
  
  // Compound condition: (sortValue < cursor.sortValue) OR (sortValue = cursor.sortValue AND id < cursor.id)
  return or(
    compareOp(sortColumn, sortValue),
    and(
      eq(sortColumn, sortValue),
      idCompareOp(idColumn, cursor.id)
    )
  )!;
}

/**
 * Create cursors for result items
 */
export function createCursors<T extends { id: number }>(
  items: T[],
  sortBy: string,
  sortOrder: 'asc' | 'desc',
  getSortValue: (item: T) => string | number | Date
): { first: string | null; last: string | null } {
  if (items.length === 0) {
    return { first: null, last: null };
  }
  
  const first = items[0];
  const last = items[items.length - 1];
  
  return {
    first: encodeCursor({
      sortValue: getSortValue(first),
      id: first.id,
      sortBy,
      sortOrder,
    }),
    last: encodeCursor({
      sortValue: getSortValue(last),
      id: last.id,
      sortBy,
      sortOrder,
    }),
  };
}

// ============================================
// GENERIC PAGINATE FUNCTION
// ============================================

export interface PaginateOptions<T> {
  /** The base query (before pagination) */
  query: any;
  
  /** Pagination parameters */
  params: PaginationParams;
  
  /** The sort column reference */
  sortColumn: any;
  
  /** The ID column reference */
  idColumn: any;
  
  /** Function to get sort value from an item */
  getSortValue: (item: T) => string | number | Date;
  
  /** Whether to include total count (expensive) */
  includeTotalCount?: boolean;
  
  /** Query for total count (if different from main query) */
  countQuery?: any;
}

/**
 * Apply pagination to a Drizzle query
 */
export async function paginate<T extends { id: number }>(
  options: PaginateOptions<T>
): Promise<PaginatedResult<T>> {
  const {
    query,
    params,
    sortColumn,
    idColumn,
    getSortValue,
    includeTotalCount = false,
    countQuery,
  } = options;
  
  const normalized = normalizePaginationParams(params);
  const { limit, cursor, direction, sortBy, sortOrder } = normalized;
  
  // Fetch one extra to determine if there are more
  const fetchLimit = limit + 1;
  
  // Build the query
  let paginatedQuery = query;
  
  // Apply cursor condition if provided
  if (cursor) {
    const cursorData = decodeCursor(cursor);
    if (cursorData) {
      const cursorCondition = buildCursorCondition(
        cursorData,
        direction,
        sortColumn,
        idColumn
      );
      paginatedQuery = paginatedQuery.where(cursorCondition);
    }
  }
  
  // Apply sorting
  const orderDir = sortOrder === 'desc' ? desc : asc;
  paginatedQuery = paginatedQuery
    .orderBy(orderDir(sortColumn), orderDir(idColumn))
    .limit(fetchLimit);
  
  // Execute query
  const results: T[] = await paginatedQuery;
  
  // Determine if there are more results
  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;
  
  // Reverse if fetching previous page
  if (direction === 'prev') {
    items.reverse();
  }
  
  // Create cursors
  const cursors = createCursors(items, sortBy, sortOrder, getSortValue);
  
  // Get total count if requested
  let totalCount: number | undefined;
  if (includeTotalCount && countQuery) {
    const countResult = await countQuery;
    totalCount = countResult[0]?.count || 0;
  }
  
  return {
    items,
    pagination: {
      nextCursor: hasMore ? cursors.last : null,
      prevCursor: cursor ? cursors.first : null,
      hasMore,
      hasPrev: !!cursor,
      count: items.length,
      totalCount,
    },
  };
}

// ============================================
// DEAL-SPECIFIC PAGINATION
// ============================================

export interface DealPaginationParams extends PaginationParams {
  /** Filter by stage */
  stage?: string;
  
  /** Filter by status */
  status?: string;
  
  /** Filter by assigned user */
  assignedTo?: number;
  
  /** Search by merchant name */
  search?: string;
  
  /** Filter by date range */
  dateFrom?: string;
  dateTo?: string;
  
  /** Filter by value range */
  minValue?: number;
  maxValue?: number;
}

export interface DealSortOptions {
  field: 'createdAt' | 'updatedAt' | 'value' | 'merchantName' | 'stage' | 'priority';
  order: 'asc' | 'desc';
}

/**
 * Valid sort fields for deals
 */
export const DEAL_SORT_FIELDS = [
  'createdAt',
  'updatedAt', 
  'value',
  'merchantName',
  'stage',
  'priority',
] as const;

/**
 * Validate and normalize deal pagination params
 */
export function normalizeDealParams(params: DealPaginationParams): DealPaginationParams {
  const normalized = { ...params };
  
  // Validate sort field
  if (normalized.sortBy && !DEAL_SORT_FIELDS.includes(normalized.sortBy as any)) {
    normalized.sortBy = 'createdAt';
  }
  
  // Validate limit
  normalized.limit = Math.min(Math.max(normalized.limit || 20, 1), 100);
  
  return normalized;
}

// ============================================
// STAGE-GROUPED PAGINATION (KANBAN)
// ============================================

export interface KanbanPaginationParams {
  /** Items per stage (default: 10) */
  limitPerStage?: number;
  
  /** Cursors for each stage */
  cursors?: Record<string, string>;
  
  /** Sort within stages */
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface KanbanResult<T> {
  stages: Record<string, {
    items: T[];
    nextCursor: string | null;
    hasMore: boolean;
    totalCount?: number;
  }>;
}

/**
 * Paginate deals grouped by stage (for Kanban view)
 */
export async function paginateByStage<T extends { id: number; stage: string }>(
  queryBuilder: (stage: string) => any,
  stages: string[],
  params: KanbanPaginationParams,
  sortColumn: any,
  idColumn: any,
  getSortValue: (item: T) => string | number | Date
): Promise<KanbanResult<T>> {
  const limitPerStage = Math.min(params.limitPerStage || 10, 50);
  const cursors = params.cursors || {};
  const sortBy = params.sortBy || 'createdAt';
  const sortOrder = params.sortOrder || 'desc';
  
  const results: KanbanResult<T> = { stages: {} };
  
  // Fetch each stage in parallel
  await Promise.all(
    stages.map(async (stage) => {
      const query = queryBuilder(stage);
      const cursor = cursors[stage];
      
      const result = await paginate<T>({
        query,
        params: {
          limit: limitPerStage,
          cursor,
          sortBy,
          sortOrder,
        },
        sortColumn,
        idColumn,
        getSortValue,
      });
      
      results.stages[stage] = {
        items: result.items,
        nextCursor: result.pagination.nextCursor,
        hasMore: result.pagination.hasMore,
      };
    })
  );
  
  return results;
}

// ============================================
// EXPORTS
// ============================================

export default {
  encodeCursor,
  decodeCursor,
  normalizePaginationParams,
  buildCursorCondition,
  createCursors,
  paginate,
  paginateByStage,
  normalizeDealParams,
  DEAL_SORT_FIELDS,
};
