/**
 * Prospect Finder Routes - Duplicate Detection Integration
 * =========================================================
 * 
 * This file shows how to integrate fuzzy duplicate detection
 * into your existing prospect finder routes.
 * 
 * KEY CHANGES:
 * 1. Check for duplicates before adding new prospects
 * 2. Return potential matches for user review
 * 3. Add endpoint to scan existing list for duplicates
 */

import { Router, Request, Response } from 'express';
import { 
  DuplicateDetector, 
  getDuplicateDetector,
  DuplicateCheckResult,
  Prospect,
} from './services/duplicate-detection';
import { db } from './db';
import { prospects } from './schema';
import { eq, and, or, ilike } from 'drizzle-orm';

const router = Router();

// Get duplicate detector instance
const duplicateDetector = getDuplicateDetector({
  duplicateThreshold: 0.75,
  potentialDuplicateThreshold: 0.6,
  phoneMatchIsDuplicate: true,
});

// ============================================
// BEFORE (Exact match only)
// ============================================

/*
// OLD CODE - Only checked exact name match

router.post('/api/prospects', async (req, res) => {
  const { businessName, phone, address } = req.body;
  
  // Only exact match - misses "Joe's Pizza" vs "Joes Pizza LLC"!
  const existing = await db.select()
    .from(prospects)
    .where(eq(prospects.businessName, businessName))
    .limit(1);
  
  if (existing.length > 0) {
    return res.status(409).json({ error: 'Prospect already exists' });
  }
  
  // ... create prospect
});
*/

// ============================================
// AFTER (Fuzzy duplicate detection)
// ============================================

/**
 * POST /api/prospects
 * 
 * Create a new prospect with duplicate checking
 */
router.post('/api/prospects', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { 
    businessName, 
    phone, 
    address, 
    city, 
    state, 
    zip, 
    website, 
    email,
    skipDuplicateCheck,
    acknowledgedDuplicateId,
  } = req.body;
  
  if (!businessName) {
    return res.status(400).json({ error: 'Business name is required' });
  }
  
  try {
    // Skip duplicate check if user already acknowledged
    if (!skipDuplicateCheck) {
      // Get existing prospects for this user
      const existingProspects = await db.select()
        .from(prospects)
        .where(eq(prospects.userId, userId));
      
      // Check for duplicates
      const newProspect: Prospect = {
        businessName,
        phone,
        address,
        city,
        state,
        zip,
        website,
        email,
      };
      
      const duplicateCheck = duplicateDetector.checkDuplicate(
        newProspect,
        existingProspects
      );
      
      // If duplicates found, return them for user review
      if (duplicateCheck.isPotentialDuplicate) {
        return res.status(409).json({
          error: 'potential_duplicate',
          message: 'This prospect may already exist',
          duplicateCheck: {
            isDuplicate: duplicateCheck.isDuplicate,
            isPotentialDuplicate: duplicateCheck.isPotentialDuplicate,
            highestScore: duplicateCheck.highestScore,
            matches: duplicateCheck.matches.map(m => ({
              id: m.prospect.id,
              businessName: m.prospect.businessName,
              phone: m.prospect.phone,
              address: m.prospect.address,
              city: m.prospect.city,
              state: m.prospect.state,
              score: m.score,
              confidence: m.confidence,
              reasons: m.reasons,
              matchDetails: m.matchDetails,
            })),
          },
          // Provide options for user
          actions: {
            createAnyway: '/api/prospects?skipDuplicateCheck=true',
            viewExisting: duplicateCheck.matches[0]?.prospect.id 
              ? `/api/prospects/${duplicateCheck.matches[0].prospect.id}`
              : null,
          },
        });
      }
    }
    
    // No duplicates or user acknowledged - create the prospect
    const [created] = await db.insert(prospects).values({
      userId,
      businessName,
      phone,
      address,
      city,
      state,
      zip,
      website,
      email,
      acknowledgedDuplicateOf: acknowledgedDuplicateId || null,
      createdAt: new Date(),
    }).returning();
    
    res.status(201).json({
      success: true,
      prospect: created,
    });
    
  } catch (error) {
    console.error('Failed to create prospect:', error);
    res.status(500).json({
      error: 'Failed to create prospect',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/prospects/check-duplicate
 * 
 * Check if a prospect is a duplicate without creating it
 */
router.post('/api/prospects/check-duplicate', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { businessName, phone, address, city, state, zip, website, email } = req.body;
  
  if (!businessName) {
    return res.status(400).json({ error: 'Business name is required' });
  }
  
  try {
    const existingProspects = await db.select()
      .from(prospects)
      .where(eq(prospects.userId, userId));
    
    const newProspect: Prospect = {
      businessName,
      phone,
      address,
      city,
      state,
      zip,
      website,
      email,
    };
    
    const result = duplicateDetector.checkDuplicate(newProspect, existingProspects);
    
    res.json({
      ...result,
      matches: result.matches.map(m => ({
        id: m.prospect.id,
        businessName: m.prospect.businessName,
        phone: m.prospect.phone,
        address: m.prospect.address,
        city: m.prospect.city,
        state: m.prospect.state,
        score: m.score,
        confidence: m.confidence,
        reasons: m.reasons,
        matchDetails: m.matchDetails,
      })),
    });
    
  } catch (error) {
    console.error('Failed to check duplicate:', error);
    res.status(500).json({
      error: 'Failed to check duplicate',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/prospects/scan-duplicates
 * 
 * Scan entire prospect list for duplicates
 */
router.post('/api/prospects/scan-duplicates', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { threshold } = req.body;
  
  try {
    const allProspects = await db.select()
      .from(prospects)
      .where(eq(prospects.userId, userId));
    
    // Temporarily adjust threshold if provided
    const originalConfig = duplicateDetector.getConfig();
    if (threshold) {
      duplicateDetector.updateConfig({ 
        potentialDuplicateThreshold: threshold 
      });
    }
    
    const duplicates = duplicateDetector.findDuplicatesInList(allProspects);
    
    // Restore original config
    if (threshold) {
      duplicateDetector.updateConfig(originalConfig);
    }
    
    // Group duplicates for easier handling
    const groups = groupDuplicates(duplicates);
    
    res.json({
      totalProspects: allProspects.length,
      duplicatePairs: duplicates.length,
      duplicateGroups: groups.length,
      groups: groups.map(group => ({
        prospects: group.map(p => ({
          id: p.id,
          businessName: p.businessName,
          phone: p.phone,
          address: p.address,
          city: p.city,
          state: p.state,
        })),
      })),
      pairs: duplicates.slice(0, 50).map(d => ({
        prospect1: {
          id: d.prospect1.id,
          businessName: d.prospect1.businessName,
          phone: d.prospect1.phone,
        },
        prospect2: {
          id: d.prospect2.id,
          businessName: d.prospect2.businessName,
          phone: d.prospect2.phone,
        },
        score: d.score,
        reasons: d.reasons,
      })),
    });
    
  } catch (error) {
    console.error('Failed to scan duplicates:', error);
    res.status(500).json({
      error: 'Failed to scan duplicates',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/prospects/merge
 * 
 * Merge duplicate prospects
 */
router.post('/api/prospects/merge', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { keepId, mergeIds } = req.body;
  
  if (!keepId || !mergeIds || !Array.isArray(mergeIds)) {
    return res.status(400).json({ 
      error: 'keepId and mergeIds array are required' 
    });
  }
  
  try {
    // Verify ownership
    const prospectToKeep = await db.select()
      .from(prospects)
      .where(and(
        eq(prospects.id, keepId),
        eq(prospects.userId, userId)
      ))
      .limit(1);
    
    if (prospectToKeep.length === 0) {
      return res.status(404).json({ error: 'Prospect to keep not found' });
    }
    
    // Get prospects to merge
    const prospectsToMerge = await db.select()
      .from(prospects)
      .where(and(
        eq(prospects.userId, userId),
        or(...mergeIds.map((id: number) => eq(prospects.id, id)))
      ));
    
    // Merge data - fill in missing fields from merged prospects
    const kept = prospectToKeep[0];
    const updates: Record<string, any> = {};
    
    for (const merge of prospectsToMerge) {
      // Fill in any missing data from merged records
      if (!kept.phone && merge.phone) updates.phone = merge.phone;
      if (!kept.email && merge.email) updates.email = merge.email;
      if (!kept.website && merge.website) updates.website = merge.website;
      if (!kept.address && merge.address) {
        updates.address = merge.address;
        updates.city = merge.city;
        updates.state = merge.state;
        updates.zip = merge.zip;
      }
      // Add notes about merge
      updates.notes = [
        kept.notes || '',
        `Merged from: ${merge.businessName} (ID: ${merge.id})`,
      ].filter(Boolean).join('\n');
    }
    
    // Update the kept prospect
    if (Object.keys(updates).length > 0) {
      await db.update(prospects)
        .set(updates)
        .where(eq(prospects.id, keepId));
    }
    
    // Delete merged prospects
    for (const id of mergeIds) {
      await db.delete(prospects)
        .where(and(
          eq(prospects.id, id),
          eq(prospects.userId, userId)
        ));
    }
    
    res.json({
      success: true,
      keptId: keepId,
      mergedCount: mergeIds.length,
      fieldsUpdated: Object.keys(updates),
    });
    
  } catch (error) {
    console.error('Failed to merge prospects:', error);
    res.status(500).json({
      error: 'Failed to merge prospects',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/prospects/duplicate-config
 * 
 * Get current duplicate detection configuration
 */
router.get('/api/prospects/duplicate-config', async (req: Request, res: Response) => {
  const config = duplicateDetector.getConfig();
  
  res.json({
    config,
    thresholdExplanation: {
      duplicateThreshold: 'Score at or above this is considered a definite duplicate',
      potentialDuplicateThreshold: 'Score at or above this triggers a warning',
    },
    weightExplanation: {
      nameWeight: 'How much business name similarity matters',
      phoneWeight: 'How much phone number match matters',
      addressWeight: 'How much address similarity matters',
      domainWeight: 'How much website/email domain match matters',
    },
  });
});

/**
 * PUT /api/prospects/duplicate-config
 * 
 * Update duplicate detection configuration (admin)
 */
router.put('/api/prospects/duplicate-config', async (req: Request, res: Response) => {
  // Add admin check here
  
  const updates = req.body;
  
  // Validate
  const allowedKeys = [
    'duplicateThreshold',
    'potentialDuplicateThreshold',
    'nameWeight',
    'phoneWeight',
    'addressWeight',
    'domainWeight',
    'minNameSimilarity',
    'phoneMatchIsDuplicate',
  ];
  
  const validUpdates: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedKeys.includes(key)) {
      if (typeof value === 'number' && value >= 0 && value <= 1) {
        validUpdates[key] = value;
      } else if (typeof value === 'boolean') {
        validUpdates[key] = value;
      }
    }
  }
  
  if (Object.keys(validUpdates).length === 0) {
    return res.status(400).json({ error: 'No valid configuration updates' });
  }
  
  duplicateDetector.updateConfig(validUpdates);
  
  res.json({
    success: true,
    updated: validUpdates,
    newConfig: duplicateDetector.getConfig(),
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Group duplicate pairs into clusters
 */
function groupDuplicates(
  pairs: Array<{ prospect1: Prospect; prospect2: Prospect; score: number }>
): Prospect[][] {
  const groups: Map<number, Set<number>> = new Map();
  
  for (const pair of pairs) {
    const id1 = pair.prospect1.id!;
    const id2 = pair.prospect2.id!;
    
    // Find existing groups containing either prospect
    let group1 = findGroup(groups, id1);
    let group2 = findGroup(groups, id2);
    
    if (group1 && group2) {
      // Merge groups
      if (group1 !== group2) {
        for (const id of groups.get(group2)!) {
          groups.get(group1)!.add(id);
        }
        groups.delete(group2);
      }
    } else if (group1) {
      groups.get(group1)!.add(id2);
    } else if (group2) {
      groups.get(group2)!.add(id1);
    } else {
      // Create new group
      groups.set(id1, new Set([id1, id2]));
    }
  }
  
  // Convert to arrays of prospects
  const prospectMap = new Map<number, Prospect>();
  for (const pair of pairs) {
    if (pair.prospect1.id) prospectMap.set(pair.prospect1.id, pair.prospect1);
    if (pair.prospect2.id) prospectMap.set(pair.prospect2.id, pair.prospect2);
  }
  
  return Array.from(groups.values()).map(idSet =>
    Array.from(idSet).map(id => prospectMap.get(id)!).filter(Boolean)
  );
}

function findGroup(groups: Map<number, Set<number>>, id: number): number | null {
  for (const [groupId, members] of groups) {
    if (members.has(id)) return groupId;
  }
  return null;
}

// ============================================
// IMPORT INTEGRATION
// ============================================

/**
 * POST /api/prospects/import
 * 
 * Import prospects with duplicate checking
 */
router.post('/api/prospects/import', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { prospects: importProspects, skipDuplicates } = req.body;
  
  if (!Array.isArray(importProspects)) {
    return res.status(400).json({ error: 'prospects array is required' });
  }
  
  try {
    // Get existing prospects
    const existing = await db.select()
      .from(prospects)
      .where(eq(prospects.userId, userId));
    
    // Check all for duplicates
    const results = duplicateDetector.batchCheckDuplicates(importProspects, existing);
    
    const created: any[] = [];
    const skipped: any[] = [];
    const duplicates: any[] = [];
    
    for (const prospect of importProspects) {
      const key = prospect.id ?? prospect.businessName;
      const check = results.get(key);
      
      if (check?.isPotentialDuplicate) {
        if (skipDuplicates) {
          skipped.push({
            prospect,
            matchedWith: check.matches[0]?.prospect.businessName,
            score: check.highestScore,
          });
        } else {
          duplicates.push({
            prospect,
            matches: check.matches.slice(0, 3).map(m => ({
              id: m.prospect.id,
              businessName: m.prospect.businessName,
              score: m.score,
              reasons: m.reasons,
            })),
          });
        }
      } else {
        // Create the prospect
        const [newProspect] = await db.insert(prospects).values({
          userId,
          ...prospect,
          createdAt: new Date(),
        }).returning();
        
        created.push(newProspect);
        
        // Add to existing list for subsequent checks
        existing.push(newProspect);
      }
    }
    
    res.json({
      success: true,
      summary: {
        total: importProspects.length,
        created: created.length,
        skipped: skipped.length,
        duplicatesFound: duplicates.length,
      },
      created: created.map(p => ({ id: p.id, businessName: p.businessName })),
      skipped,
      duplicates,
    });
    
  } catch (error) {
    console.error('Failed to import prospects:', error);
    res.status(500).json({
      error: 'Failed to import prospects',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
