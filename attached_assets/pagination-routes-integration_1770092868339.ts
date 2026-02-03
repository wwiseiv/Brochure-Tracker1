/**
 * Deal Pipeline Routes - Paginated Queries
 * =========================================
 * 
 * This file shows how to update your routes.ts to use
 * cursor-based pagination for the deal pipeline.
 * 
 * KEY CHANGES:
 * 1. Replace "load all" with paginated queries
 * 2. Add cursor-based navigation
 * 3. Support both list and Kanban views
 * 4. Add efficient filtering with pagination
 */

import { Router, Request, Response } from 'express';
import { db } from './db';
import { deals } from './schema';
import { eq, and, or, ilike, gte, lte, desc, asc, count, SQL } from 'drizzle-orm';
import {
  paginate,
  paginateByStage,
  decodeCursor,
  normalizeDealParams,
  DealPaginationParams,
  KanbanPaginationParams,
  PaginatedResult,
  KanbanResult,
} from './services/pagination';

const router = Router();

// ============================================
// BEFORE (Load all - SLOW!)
// ============================================

/*
// OLD CODE - Don't do this!

router.get('/api/deals', async (req, res) => {
  const userId = req.user.id;
  
  // Loads ALL deals - slow for high-volume users!
  const allDeals = await db.select()
    .from(deals)
    .where(eq(deals.userId, userId))
    .orderBy(desc(deals.createdAt));
  
  res.json(allDeals);
});
*/

// ============================================
// AFTER (Cursor-based pagination)
// ============================================

/**
 * GET /api/deals
 * 
 * Paginated deal list with filtering and sorting
 * 
 * Query params:
 * - limit: number (1-100, default 20)
 * - cursor: string (pagination cursor)
 * - sortBy: 'createdAt' | 'updatedAt' | 'value' | 'merchantName' | 'stage'
 * - sortOrder: 'asc' | 'desc'
 * - stage: string (filter by stage)
 * - status: string (filter by status)
 * - search: string (search merchant name)
 * - dateFrom, dateTo: ISO date strings
 * - minValue, maxValue: numbers
 */
router.get('/api/deals', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  
  try {
    // Parse and normalize params
    const params = normalizeDealParams({
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      cursor: req.query.cursor as string,
      sortBy: (req.query.sortBy as string) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      stage: req.query.stage as string,
      status: req.query.status as string,
      search: req.query.search as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
      minValue: req.query.minValue ? parseFloat(req.query.minValue as string) : undefined,
      maxValue: req.query.maxValue ? parseFloat(req.query.maxValue as string) : undefined,
      assignedTo: req.query.assignedTo ? parseInt(req.query.assignedTo as string) : undefined,
    });
    
    // Build filter conditions
    const conditions: SQL[] = [eq(deals.userId, userId)];
    
    if (params.stage) {
      conditions.push(eq(deals.stage, params.stage));
    }
    
    if (params.status) {
      conditions.push(eq(deals.status, params.status));
    }
    
    if (params.search) {
      conditions.push(ilike(deals.merchantName, `%${params.search}%`));
    }
    
    if (params.dateFrom) {
      conditions.push(gte(deals.createdAt, new Date(params.dateFrom)));
    }
    
    if (params.dateTo) {
      conditions.push(lte(deals.createdAt, new Date(params.dateTo)));
    }
    
    if (params.minValue !== undefined) {
      conditions.push(gte(deals.value, params.minValue));
    }
    
    if (params.maxValue !== undefined) {
      conditions.push(lte(deals.value, params.maxValue));
    }
    
    if (params.assignedTo) {
      conditions.push(eq(deals.assignedTo, params.assignedTo));
    }
    
    // Determine sort column
    const sortColumnMap: Record<string, any> = {
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
      value: deals.value,
      merchantName: deals.merchantName,
      stage: deals.stage,
      priority: deals.priority,
    };
    
    const sortColumn = sortColumnMap[params.sortBy || 'createdAt'] || deals.createdAt;
    
    // Build base query
    const baseQuery = db.select().from(deals).where(and(...conditions));
    
    // Get sort value function
    const getSortValue = (deal: any) => {
      const field = params.sortBy || 'createdAt';
      return deal[field];
    };
    
    // Execute paginated query
    const result = await paginate({
      query: baseQuery,
      params,
      sortColumn,
      idColumn: deals.id,
      getSortValue,
      includeTotalCount: req.query.includeCount === 'true',
      countQuery: req.query.includeCount === 'true'
        ? db.select({ count: count() }).from(deals).where(and(...conditions))
        : undefined,
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Failed to fetch deals:', error);
    res.status(500).json({
      error: 'Failed to fetch deals',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/deals/kanban
 * 
 * Paginated deals grouped by stage (for Kanban view)
 * Returns limited deals per stage with "load more" capability
 */
router.get('/api/deals/kanban', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  
  try {
    const stages = ['lead', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    
    const params: KanbanPaginationParams = {
      limitPerStage: req.query.limitPerStage 
        ? parseInt(req.query.limitPerStage as string) 
        : 10,
      cursors: req.query.cursors 
        ? JSON.parse(req.query.cursors as string) 
        : {},
      sortBy: (req.query.sortBy as string) || 'updatedAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };
    
    // Build query for each stage
    const queryBuilder = (stage: string) => {
      return db.select()
        .from(deals)
        .where(and(
          eq(deals.userId, userId),
          eq(deals.stage, stage)
        ));
    };
    
    // Get sort column
    const sortColumn = params.sortBy === 'updatedAt' ? deals.updatedAt : deals.createdAt;
    
    const result = await paginateByStage(
      queryBuilder,
      stages,
      params,
      sortColumn,
      deals.id,
      (deal: any) => deal[params.sortBy || 'updatedAt']
    );
    
    // Also get total counts per stage (for badges)
    const stageCounts = await Promise.all(
      stages.map(async (stage) => {
        const [{ count: stageCount }] = await db
          .select({ count: count() })
          .from(deals)
          .where(and(
            eq(deals.userId, userId),
            eq(deals.stage, stage)
          ));
        return { stage, count: stageCount };
      })
    );
    
    res.json({
      ...result,
      stageCounts: Object.fromEntries(
        stageCounts.map(s => [s.stage, s.count])
      ),
    });
    
  } catch (error) {
    console.error('Failed to fetch kanban deals:', error);
    res.status(500).json({
      error: 'Failed to fetch kanban deals',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/deals/stage/:stage
 * 
 * Paginated deals for a single stage (load more for Kanban column)
 */
router.get('/api/deals/stage/:stage', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { stage } = req.params;
  
  try {
    const params = normalizeDealParams({
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      cursor: req.query.cursor as string,
      sortBy: (req.query.sortBy as string) || 'updatedAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    });
    
    const baseQuery = db.select()
      .from(deals)
      .where(and(
        eq(deals.userId, userId),
        eq(deals.stage, stage)
      ));
    
    const sortColumn = params.sortBy === 'updatedAt' ? deals.updatedAt : deals.createdAt;
    
    const result = await paginate({
      query: baseQuery,
      params,
      sortColumn,
      idColumn: deals.id,
      getSortValue: (deal: any) => deal[params.sortBy || 'updatedAt'],
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Failed to fetch stage deals:', error);
    res.status(500).json({
      error: 'Failed to fetch stage deals',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/deals/search
 * 
 * Search deals with pagination
 */
router.get('/api/deals/search', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const query = req.query.q as string;
  
  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }
  
  try {
    const params = normalizeDealParams({
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      cursor: req.query.cursor as string,
      sortBy: 'merchantName',
      sortOrder: 'asc',
    });
    
    const baseQuery = db.select()
      .from(deals)
      .where(and(
        eq(deals.userId, userId),
        or(
          ilike(deals.merchantName, `%${query}%`),
          ilike(deals.contactName, `%${query}%`),
          ilike(deals.notes, `%${query}%`)
        )
      ));
    
    const result = await paginate({
      query: baseQuery,
      params,
      sortColumn: deals.merchantName,
      idColumn: deals.id,
      getSortValue: (deal: any) => deal.merchantName,
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Failed to search deals:', error);
    res.status(500).json({
      error: 'Failed to search deals',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/deals/stats
 * 
 * Get deal statistics (aggregated, not paginated)
 */
router.get('/api/deals/stats', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  
  try {
    // Get counts by stage
    const stageCounts = await db
      .select({
        stage: deals.stage,
        count: count(),
      })
      .from(deals)
      .where(eq(deals.userId, userId))
      .groupBy(deals.stage);
    
    // Get total value by stage
    const stageValues = await db
      .select({
        stage: deals.stage,
        totalValue: sql<number>`SUM(${deals.value})`,
      })
      .from(deals)
      .where(eq(deals.userId, userId))
      .groupBy(deals.stage);
    
    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(deals)
      .where(eq(deals.userId, userId));
    
    res.json({
      totalDeals: total,
      byStage: Object.fromEntries(
        stageCounts.map(s => [s.stage, {
          count: s.count,
          value: stageValues.find(v => v.stage === s.stage)?.totalValue || 0,
        }])
      ),
    });
    
  } catch (error) {
    console.error('Failed to fetch deal stats:', error);
    res.status(500).json({
      error: 'Failed to fetch deal stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================
// MIGRATION HELPER
// ============================================

/**
 * If you have existing code that loads all deals,
 * here's how to migrate:
 * 
 * BEFORE:
 * const { data } = useQuery({
 *   queryKey: ['deals'],
 *   queryFn: () => fetch('/api/deals').then(r => r.json())
 * });
 * // data is Deal[]
 * 
 * AFTER:
 * const { data } = useInfiniteQuery({
 *   queryKey: ['deals'],
 *   queryFn: ({ pageParam }) => 
 *     fetch(`/api/deals?cursor=${pageParam || ''}`).then(r => r.json()),
 *   getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
 * });
 * // data.pages is PaginatedResult<Deal>[]
 * // Flatten: data.pages.flatMap(p => p.items)
 */

export default router;
