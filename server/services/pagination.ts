/**
 * Cursor-Based Pagination Service
 * ================================
 * 
 * Efficient pagination for large datasets using cursor-based approach.
 * Better than offset pagination for:
 * - Consistent results when data changes
 * - Better performance on large tables
 * - Natural fit for infinite scroll UIs
 */

import { SQL, sql, and, or, gt, lt, gte, lte, eq, desc, asc, count } from 'drizzle-orm';

export interface PaginationParams {
  limit?: number;
  cursor?: string;
  direction?: 'next' | 'prev';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
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

export interface CursorData {
  sortValue: string | number | Date;
  id: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function encodeCursor(data: CursorData): string {
  const json = JSON.stringify({
    v: data.sortValue instanceof Date ? data.sortValue.toISOString() : data.sortValue,
    i: data.id,
    s: data.sortBy,
    o: data.sortOrder,
  });
  return Buffer.from(json).toString('base64url');
}

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

export function normalizePaginationParams(params: PaginationParams): Required<PaginationParams> {
  return {
    limit: Math.min(Math.max(params.limit || 20, 1), 100),
    cursor: params.cursor || '',
    direction: params.direction || 'next',
    sortBy: params.sortBy || 'createdAt',
    sortOrder: params.sortOrder || 'desc',
  };
}

export function buildCursorCondition(
  cursor: CursorData,
  direction: 'next' | 'prev',
  sortColumn: any,
  idColumn: any
): SQL {
  const isDesc = cursor.sortOrder === 'desc';
  const isNext = direction === 'next';
  
  const compareOp = (isDesc && isNext) || (!isDesc && !isNext) ? lt : gt;
  const idCompareOp = (isDesc && isNext) || (!isDesc && !isNext) ? lt : gt;
  
  let sortValue: any = cursor.sortValue;
  if (typeof sortValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(sortValue)) {
    sortValue = new Date(sortValue);
  }
  
  return or(
    compareOp(sortColumn, sortValue),
    and(
      eq(sortColumn, sortValue),
      idCompareOp(idColumn, cursor.id)
    )
  )!;
}

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

export interface PaginateOptions<T> {
  query: any;
  params: PaginationParams;
  sortColumn: any;
  idColumn: any;
  getSortValue: (item: T) => string | number | Date;
  includeTotalCount?: boolean;
  countQuery?: any;
}

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
  
  const fetchLimit = limit + 1;
  
  let paginatedQuery = query;
  
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
  
  const orderDir = sortOrder === 'desc' ? desc : asc;
  paginatedQuery = paginatedQuery
    .orderBy(orderDir(sortColumn), orderDir(idColumn))
    .limit(fetchLimit);
  
  const results: T[] = await paginatedQuery;
  
  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;
  
  if (direction === 'prev') {
    items.reverse();
  }
  
  const cursors = createCursors(items, sortBy, sortOrder, getSortValue);
  
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

export interface DealPaginationParams extends PaginationParams {
  stage?: string;
  status?: string;
  assignedTo?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  minValue?: number;
  maxValue?: number;
  priority?: string;
  temperature?: string;
}

export const DEAL_SORT_FIELDS = [
  'createdAt',
  'updatedAt', 
  'estimatedMonthlyVolume',
  'businessName',
  'stage',
  'dealProbability',
] as const;

export function normalizeDealParams(params: DealPaginationParams): DealPaginationParams {
  const normalized = { ...params };
  
  if (normalized.sortBy && !DEAL_SORT_FIELDS.includes(normalized.sortBy as any)) {
    normalized.sortBy = 'createdAt';
  }
  
  normalized.limit = Math.min(Math.max(normalized.limit || 20, 1), 100);
  
  return normalized;
}

export interface KanbanPaginationParams {
  limitPerStage?: number;
  cursors?: Record<string, string>;
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
