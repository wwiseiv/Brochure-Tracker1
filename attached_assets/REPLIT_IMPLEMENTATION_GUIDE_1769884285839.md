# PCBancard Prospect Finder - Replit Implementation Guide

## Quick Start Instructions for Replit

This guide provides step-by-step instructions to implement the Prospect Finder feature in your PCBancard Replit application.

---

## Step 1: Database Migration

Run this SQL migration to add the prospect tables:

```sql
-- File: migrations/add_prospect_finder.sql

-- Create prospects table
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id),
  
  -- Business Information
  business_name VARCHAR(255) NOT NULL,
  dba_name VARCHAR(255),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(500),
  
  -- Classification
  mcc_code VARCHAR(4),
  mcc_description VARCHAR(255),
  business_type VARCHAR(100),
  risk_level INTEGER DEFAULT 1,
  
  -- Discovery Metadata
  source VARCHAR(50) DEFAULT 'ai_search',
  ai_confidence_score DECIMAL(3,2),
  search_query TEXT,
  
  -- Pipeline Status
  status VARCHAR(20) DEFAULT 'discovered',
  
  -- Activity Tracking
  last_contact_date TIMESTAMP,
  next_followup_date TIMESTAMP,
  contact_attempts INTEGER DEFAULT 0,
  notes TEXT,
  
  -- Conversion Tracking
  converted_to_merchant_id UUID,
  converted_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Exclusivity constraint
  UNIQUE(business_name, zip_code, agent_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prospects_agent ON prospects(agent_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_zip ON prospects(zip_code);
CREATE INDEX IF NOT EXISTS idx_prospects_mcc ON prospects(mcc_code);

-- Create activity log table
CREATE TABLE IF NOT EXISTS prospect_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospect_activities_prospect ON prospect_activities(prospect_id);

-- Create search history table
CREATE TABLE IF NOT EXISTS prospect_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id),
  zip_code VARCHAR(10) NOT NULL,
  business_types TEXT[],
  radius_miles INTEGER DEFAULT 10,
  results_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Step 2: Add MCC Codes Data File

Copy the complete `mcc-codes.json` file to your project:

```
server/data/mcc-codes.json
```

---

## Step 3: Create AI Search Service

```typescript
// File: server/services/prospectSearch.ts

import Anthropic from '@anthropic-ai/sdk';

// Types
export interface ProspectSearchParams {
  zipCode: string;
  businessTypes: { code: string; name: string; searchTerms: string[] }[];
  radius: number;
  maxResults: number;
  agentId: string;
}

export interface DiscoveredBusiness {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string | null;
  website: string | null;
  businessType: string;
  mccCode: string;
  confidence: number;
}

export interface SearchResult {
  businesses: DiscoveredBusiness[];
  totalFound: number;
  duplicatesSkipped: number;
  searchId: string;
}

// Initialize Anthropic client
const anthropic = new Anthropic();

export async function searchLocalBusinesses(
  params: ProspectSearchParams
): Promise<SearchResult> {
  const { zipCode, businessTypes, radius, maxResults, agentId } = params;
  
  // Build search terms from business types
  const allSearchTerms = businessTypes.flatMap(bt => [bt.name, ...bt.searchTerms]);
  const businessTypeNames = businessTypes.map(bt => bt.name).join(', ');
  
  // Create the prompt for Claude
  const searchPrompt = `You are a business research assistant. Find real, currently operating local businesses matching these criteria:

SEARCH PARAMETERS:
- Location: Within ${radius} miles of ZIP code ${zipCode}
- Business Types: ${businessTypeNames}
- Number of Results Needed: ${maxResults}

REQUIREMENTS:
1. Only return REAL businesses that currently exist
2. Include complete address information
3. Prioritize independent local businesses over national chains
4. Focus on businesses likely to accept card payments
5. Exclude businesses that are permanently closed

For each business found, provide:
- Business Name (official name)
- Full Street Address
- City, State, ZIP
- Phone Number (if available)
- Website (if available)
- Primary Business Type (from the categories I provided)
- Confidence score (0.0-1.0) that this is a real, operating business

Return ONLY a valid JSON array with no additional text:
[
  {
    "name": "Example Business Name",
    "address": "123 Main Street",
    "city": "Carmel",
    "state": "IN",
    "zipCode": "46032",
    "phone": "(317) 555-1234",
    "website": "https://example.com",
    "businessType": "Restaurant",
    "mccCode": "5812",
    "confidence": 0.95
  }
]`;

  try {
    // Call Claude with web search capability
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search'
      }],
      messages: [{ role: 'user', content: searchPrompt }]
    });

    // Extract text content from response
    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Parse JSON from response
    const jsonMatch = textContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No valid JSON found in AI response:', textContent);
      return {
        businesses: [],
        totalFound: 0,
        duplicatesSkipped: 0,
        searchId: generateSearchId()
      };
    }

    const businesses: DiscoveredBusiness[] = JSON.parse(jsonMatch[0]);
    
    // Check for duplicates against existing prospects
    const { deduplicatedBusinesses, duplicatesSkipped } = await deduplicateResults(
      businesses,
      agentId
    );

    return {
      businesses: deduplicatedBusinesses,
      totalFound: businesses.length,
      duplicatesSkipped,
      searchId: generateSearchId()
    };
  } catch (error) {
    console.error('AI search error:', error);
    throw new Error('Failed to search for businesses');
  }
}

// Check for existing prospects
async function deduplicateResults(
  businesses: DiscoveredBusiness[],
  agentId: string
): Promise<{ deduplicatedBusinesses: DiscoveredBusiness[]; duplicatesSkipped: number }> {
  const { db } = await import('../db');
  
  const existingProspects = await db('prospects')
    .select('business_name', 'zip_code')
    .where('agent_id', agentId);
  
  const existingSet = new Set(
    existingProspects.map(p => `${p.business_name.toLowerCase()}|${p.zip_code}`)
  );
  
  const deduplicatedBusinesses: DiscoveredBusiness[] = [];
  let duplicatesSkipped = 0;
  
  for (const business of businesses) {
    const key = `${business.name.toLowerCase()}|${business.zipCode}`;
    if (existingSet.has(key)) {
      duplicatesSkipped++;
    } else {
      deduplicatedBusinesses.push(business);
    }
  }
  
  return { deduplicatedBusinesses, duplicatesSkipped };
}

function generateSearchId(): string {
  return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

---

## Step 4: Create API Routes

```typescript
// File: server/routes/prospects.ts

import { Router } from 'express';
import { searchLocalBusinesses } from '../services/prospectSearch';
import { requireAuth, checkRole } from '../middleware/auth';
import mccCodes from '../data/mcc-codes.json';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/prospects/mcc-codes - Get all MCC codes for UI
router.get('/mcc-codes', (req, res) => {
  res.json({
    categories: mccCodes.categories,
    codes: mccCodes.mccCodes
  });
});

// POST /api/prospects/search - Search for new prospects
router.post('/search', async (req, res) => {
  try {
    const { zipCode, mccCodes: selectedCodes, radius = 10, maxResults = 25 } = req.body;
    const agentId = req.user.id;
    
    // Validate input
    if (!zipCode || !selectedCodes?.length) {
      return res.status(400).json({ error: 'Zip code and at least one business type required' });
    }
    
    // Get full MCC details for selected codes
    const businessTypes = mccCodes.mccCodes
      .filter(mcc => selectedCodes.includes(mcc.code))
      .map(mcc => ({
        code: mcc.code,
        name: mcc.title,
        searchTerms: mcc.searchTerms
      }));
    
    if (!businessTypes.length) {
      return res.status(400).json({ error: 'Invalid MCC codes provided' });
    }
    
    // Perform search
    const results = await searchLocalBusinesses({
      zipCode,
      businessTypes,
      radius: Math.min(radius, 25), // Cap at 25 miles
      maxResults: Math.min(maxResults, 100), // Cap at 100
      agentId
    });
    
    // Log search for analytics
    await req.db('prospect_searches').insert({
      agent_id: agentId,
      zip_code: zipCode,
      business_types: selectedCodes,
      radius_miles: radius,
      results_count: results.totalFound
    });
    
    res.json(results);
  } catch (error) {
    console.error('Prospect search error:', error);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

// POST /api/prospects/claim - Claim a discovered business
router.post('/claim', async (req, res) => {
  try {
    const agentId = req.user.id;
    const { business } = req.body;
    
    // Check if already claimed by another agent
    const existing = await req.db('prospects')
      .where('business_name', 'ilike', business.name)
      .where('zip_code', business.zipCode)
      .first();
    
    if (existing && existing.agent_id !== agentId) {
      return res.status(409).json({ 
        error: 'This business has already been claimed by another agent',
        alreadyClaimed: true
      });
    }
    
    if (existing) {
      return res.json({ prospect: existing, alreadyClaimed: false });
    }
    
    // Create new prospect
    const [prospect] = await req.db('prospects')
      .insert({
        agent_id: agentId,
        business_name: business.name,
        address_line1: business.address,
        city: business.city,
        state: business.state,
        zip_code: business.zipCode,
        phone: business.phone,
        website: business.website,
        mcc_code: business.mccCode,
        mcc_description: business.businessType,
        business_type: business.businessType,
        ai_confidence_score: business.confidence,
        source: 'ai_search',
        status: 'discovered'
      })
      .returning('*');
    
    // Log activity
    await req.db('prospect_activities').insert({
      prospect_id: prospect.id,
      agent_id: agentId,
      activity_type: 'created',
      notes: 'Claimed from AI search'
    });
    
    res.json({ prospect, alreadyClaimed: false });
  } catch (error) {
    console.error('Claim error:', error);
    res.status(500).json({ error: 'Failed to claim prospect' });
  }
});

// GET /api/prospects - Get agent's prospects (with pipeline filtering)
router.get('/', async (req, res) => {
  try {
    const agentId = req.user.id;
    const { status, mccCode, sortBy = 'created_at', sortOrder = 'desc', page = 1, limit = 20 } = req.query;
    
    let query = req.db('prospects').where('agent_id', agentId);
    
    if (status) {
      query = query.where('status', status);
    }
    if (mccCode) {
      query = query.where('mcc_code', mccCode);
    }
    
    const offset = (Number(page) - 1) * Number(limit);
    
    const [prospects, [{ count }]] = await Promise.all([
      query
        .orderBy(String(sortBy), String(sortOrder))
        .limit(Number(limit))
        .offset(offset),
      req.db('prospects')
        .where('agent_id', agentId)
        .count('id as count')
    ]);
    
    res.json({
      prospects,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: Number(count),
        pages: Math.ceil(Number(count) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get prospects error:', error);
    res.status(500).json({ error: 'Failed to fetch prospects' });
  }
});

// GET /api/prospects/pipeline - Get pipeline summary
router.get('/pipeline', async (req, res) => {
  try {
    const agentId = req.user.id;
    
    const pipeline = await req.db('prospects')
      .select('status')
      .count('id as count')
      .where('agent_id', agentId)
      .groupBy('status');
    
    const summary = {
      discovered: 0,
      contacted: 0,
      qualified: 0,
      proposal_sent: 0,
      negotiating: 0,
      won: 0,
      lost: 0,
      disqualified: 0
    };
    
    pipeline.forEach(row => {
      summary[row.status] = Number(row.count);
    });
    
    res.json(summary);
  } catch (error) {
    console.error('Pipeline error:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline' });
  }
});

// PATCH /api/prospects/:id - Update prospect
router.patch('/:id', async (req, res) => {
  try {
    const agentId = req.user.id;
    const { id } = req.params;
    const updates = req.body;
    
    // Verify ownership
    const prospect = await req.db('prospects')
      .where('id', id)
      .where('agent_id', agentId)
      .first();
    
    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }
    
    // Track status changes
    if (updates.status && updates.status !== prospect.status) {
      await req.db('prospect_activities').insert({
        prospect_id: id,
        agent_id: agentId,
        activity_type: 'status_change',
        previous_value: prospect.status,
        new_value: updates.status
      });
    }
    
    // Update prospect
    const [updated] = await req.db('prospects')
      .where('id', id)
      .update({
        ...updates,
        updated_at: new Date()
      })
      .returning('*');
    
    res.json(updated);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: 'Failed to update prospect' });
  }
});

// POST /api/prospects/:id/convert - Convert to merchant
router.post('/:id/convert', async (req, res) => {
  try {
    const agentId = req.user.id;
    const { id } = req.params;
    const additionalData = req.body;
    
    // Verify ownership
    const prospect = await req.db('prospects')
      .where('id', id)
      .where('agent_id', agentId)
      .first();
    
    if (!prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }
    
    if (prospect.converted_to_merchant_id) {
      return res.status(400).json({ error: 'Prospect already converted' });
    }
    
    // Create merchant record (adjust to match your merchants table schema)
    const [merchant] = await req.db('merchants')
      .insert({
        agent_id: agentId,
        business_name: prospect.business_name,
        dba_name: prospect.dba_name,
        address_line1: prospect.address_line1,
        city: prospect.city,
        state: prospect.state,
        zip_code: prospect.zip_code,
        phone: prospect.phone,
        email: prospect.email,
        website: prospect.website,
        mcc_code: prospect.mcc_code,
        ...additionalData,
        source: 'prospect_conversion'
      })
      .returning('*');
    
    // Update prospect
    await req.db('prospects')
      .where('id', id)
      .update({
        converted_to_merchant_id: merchant.id,
        converted_at: new Date(),
        status: 'won',
        updated_at: new Date()
      });
    
    // Log activity
    await req.db('prospect_activities').insert({
      prospect_id: id,
      agent_id: agentId,
      activity_type: 'converted',
      new_value: merchant.id,
      notes: 'Converted to merchant'
    });
    
    res.json({ merchant, prospectId: id });
  } catch (error) {
    console.error('Convert error:', error);
    res.status(500).json({ error: 'Failed to convert prospect' });
  }
});

// DELETE /api/prospects/:id - Release prospect
router.delete('/:id', async (req, res) => {
  try {
    const agentId = req.user.id;
    const { id } = req.params;
    
    const deleted = await req.db('prospects')
      .where('id', id)
      .where('agent_id', agentId)
      .delete();
    
    if (!deleted) {
      return res.status(404).json({ error: 'Prospect not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete prospect' });
  }
});

// GET /api/prospects/export - Export prospects
router.get('/export', async (req, res) => {
  try {
    const agentId = req.user.id;
    const { format = 'csv', status } = req.query;
    
    let query = req.db('prospects').where('agent_id', agentId);
    
    if (status) {
      query = query.whereIn('status', String(status).split(','));
    }
    
    const prospects = await query.orderBy('created_at', 'desc');
    
    if (format === 'csv') {
      const csv = convertToCSV(prospects);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=prospects.csv');
      res.send(csv);
    } else {
      res.json(prospects);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export prospects' });
  }
});

function convertToCSV(data: any[]): string {
  if (!data.length) return '';
  
  const headers = [
    'Business Name', 'DBA', 'Address', 'City', 'State', 'ZIP',
    'Phone', 'Email', 'Website', 'Business Type', 'MCC Code',
    'Status', 'Created', 'Last Contact', 'Notes'
  ];
  
  const rows = data.map(p => [
    p.business_name,
    p.dba_name || '',
    p.address_line1 || '',
    p.city || '',
    p.state || '',
    p.zip_code || '',
    p.phone || '',
    p.email || '',
    p.website || '',
    p.business_type || '',
    p.mcc_code || '',
    p.status,
    p.created_at,
    p.last_contact_date || '',
    p.notes || ''
  ]);
  
  return [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
}

// Admin routes - access all prospects
router.get('/admin/all', checkRole(['admin', 'manager']), async (req, res) => {
  try {
    const { agentId, status, page = 1, limit = 50 } = req.query;
    
    let query = req.db('prospects');
    
    if (agentId) {
      query = query.where('agent_id', agentId);
    }
    if (status) {
      query = query.where('status', status);
    }
    
    const offset = (Number(page) - 1) * Number(limit);
    
    const prospects = await query
      .select('prospects.*', 'users.name as agent_name', 'users.email as agent_email')
      .leftJoin('users', 'prospects.agent_id', 'users.id')
      .orderBy('prospects.created_at', 'desc')
      .limit(Number(limit))
      .offset(offset);
    
    res.json(prospects);
  } catch (error) {
    console.error('Admin prospects error:', error);
    res.status(500).json({ error: 'Failed to fetch prospects' });
  }
});

// Admin analytics
router.get('/admin/analytics', checkRole(['admin', 'manager']), async (req, res) => {
  try {
    const [byAgent, byStatus, byMCC, totals] = await Promise.all([
      req.db('prospects')
        .select('agent_id')
        .select(req.db.raw('count(*) as total'))
        .select(req.db.raw("count(*) filter (where status = 'won') as converted"))
        .groupBy('agent_id'),
      
      req.db('prospects')
        .select('status')
        .count('* as count')
        .groupBy('status'),
      
      req.db('prospects')
        .select('mcc_code', 'mcc_description')
        .count('* as count')
        .groupBy('mcc_code', 'mcc_description')
        .orderBy('count', 'desc')
        .limit(10),
      
      req.db('prospects')
        .select(req.db.raw('count(*) as total'))
        .select(req.db.raw("count(*) filter (where status = 'won') as won"))
        .first()
    ]);
    
    res.json({
      byAgent,
      byStatus,
      byMCC,
      conversionRate: totals.total > 0 ? (totals.won / totals.total * 100).toFixed(1) : 0
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
```

---

## Step 5: Create React Components

### Prospect Finder Component

```tsx
// File: client/src/components/ProspectFinder/ProspectFinder.tsx

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Sparkles, ChevronRight, Check, Phone, MoreHorizontal, Bookmark } from 'lucide-react';
import { useMCCCodes, useProspectSearch, useProspectClaim } from '../../hooks/useProspects';
import './ProspectFinder.css';

interface ProspectFinderProps {
  onSearchComplete?: (results: any) => void;
}

export const ProspectFinder: React.FC<ProspectFinderProps> = ({ onSearchComplete }) => {
  const [zipCode, setZipCode] = useState('');
  const [selectedMCCs, setSelectedMCCs] = useState<string[]>([]);
  const [radius, setRadius] = useState(10);
  const [maxResults, setMaxResults] = useState(25);
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const { categories, codes, loading: loadingCodes } = useMCCCodes();
  const { search, results, loading: searching, error } = useProspectSearch();
  const { claim, claiming } = useProspectClaim();
  
  // Popular categories for quick select
  const popularCategories = ['food', 'retail', 'services', 'automotive'];
  
  const handleSearch = async () => {
    if (!zipCode || !selectedMCCs.length) return;
    
    const searchResults = await search({
      zipCode,
      mccCodes: selectedMCCs,
      radius,
      maxResults
    });
    
    setShowResults(true);
    onSearchComplete?.(searchResults);
  };
  
  const handleClaim = async (business: any) => {
    await claim(business);
  };
  
  const toggleMCC = (code: string) => {
    setSelectedMCCs(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };
  
  const toggleCategory = (categoryId: string) => {
    const categoryCodes = codes
      .filter(c => c.category === categoryId)
      .map(c => c.code);
    
    const allSelected = categoryCodes.every(c => selectedMCCs.includes(c));
    
    if (allSelected) {
      setSelectedMCCs(prev => prev.filter(c => !categoryCodes.includes(c)));
    } else {
      setSelectedMCCs(prev => [...new Set([...prev, ...categoryCodes])]);
    }
  };
  
  const selectedCount = selectedMCCs.length;
  const claimedCount = results?.businesses?.filter((b: any) => b.claimed).length || 0;
  
  return (
    <div className="prospect-finder-card">
      <div className="card-header">
        <div className="card-title-group">
          <h2 className="card-title">
            Find Prospects
            <span className="badge-new">NEW</span>
          </h2>
          <p className="card-subtitle">Discover local businesses to pitch</p>
        </div>
        <div className="ai-badge">
          <Sparkles size={14} />
          AI Powered
        </div>
      </div>
      
      <div className="search-form">
        {/* Zip Code Input */}
        <div className="input-group">
          <label className="input-label">Location</label>
          <div className="input-with-icon">
            <MapPin size={18} />
            <input
              type="text"
              className="input-field"
              placeholder="Enter zip code"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              maxLength={10}
            />
          </div>
        </div>
        
        {/* Business Type Selector */}
        <div className="input-group">
          <label className="input-label">
            Business Type {selectedCount > 0 && `(${selectedCount} selected)`}
          </label>
          <div className="business-type-selector">
            {popularCategories.map(catId => {
              const category = categories.find(c => c.id === catId);
              if (!category) return null;
              
              const categoryCodes = codes.filter(c => c.category === catId);
              const selectedInCategory = categoryCodes.filter(c => 
                selectedMCCs.includes(c.code)
              ).length;
              
              return (
                <button
                  key={catId}
                  type="button"
                  className={`type-chip ${selectedInCategory > 0 ? 'selected' : ''}`}
                  onClick={() => toggleCategory(catId)}
                >
                  {category.name}
                  {selectedInCategory > 0 && ` (${selectedInCategory})`}
                </button>
              );
            })}
            <button
              type="button"
              className="more-types-btn"
              onClick={() => setShowAllTypes(true)}
            >
              + {codes.length - popularCategories.length * 10} More
            </button>
          </div>
        </div>
        
        {/* Options Row */}
        <div className="options-row">
          <div className="input-group">
            <label className="input-label">Radius</label>
            <select
              className="select-field"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            >
              <option value={5}>5 miles</option>
              <option value={10}>10 miles</option>
              <option value={15}>15 miles</option>
              <option value={25}>25 miles</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Results</label>
            <select
              className="select-field"
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
            >
              <option value={10}>10 businesses</option>
              <option value={25}>25 businesses</option>
              <option value={50}>50 businesses</option>
            </select>
          </div>
        </div>
        
        {/* Search Button */}
        <button
          type="button"
          className="search-btn"
          onClick={handleSearch}
          disabled={searching || !zipCode || !selectedMCCs.length}
        >
          {searching ? (
            <>
              <div className="spinner" />
              Searching...
            </>
          ) : (
            <>
              <Search size={20} />
              Find Prospects
            </>
          )}
        </button>
        
        {error && (
          <div className="error-message">{error}</div>
        )}
      </div>
      
      {/* All Types Modal */}
      {showAllTypes && (
        <div className="modal-overlay" onClick={() => setShowAllTypes(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h3 className="sheet-title">Select Business Types</h3>
              <p className="sheet-subtitle">{selectedCount} types selected</p>
            </div>
            <div className="types-grid">
              {categories.map(category => (
                <div key={category.id} className="category-section">
                  <h4 className="category-title">{category.name}</h4>
                  <div className="mcc-list">
                    {codes
                      .filter(c => c.category === category.id)
                      .map(mcc => (
                        <label
                          key={mcc.code}
                          className={`mcc-option ${selectedMCCs.includes(mcc.code) ? 'selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedMCCs.includes(mcc.code)}
                            onChange={() => toggleMCC(mcc.code)}
                          />
                          <span className="mcc-name">{mcc.title}</span>
                          <span className="mcc-code">{mcc.code}</span>
                        </label>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              className="search-btn"
              onClick={() => setShowAllTypes(false)}
            >
              Apply Selection ({selectedCount} types)
            </button>
          </div>
        </div>
      )}
      
      {/* Results Modal */}
      {showResults && results && (
        <div className="modal-overlay" onClick={() => setShowResults(false)}>
          <div className="modal-sheet results-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h3 className="sheet-title">Prospects Found</h3>
              <p className="sheet-subtitle">
                {results.totalFound} found near {zipCode}
                {claimedCount > 0 && (
                  <span className="claimed-count"> • {claimedCount} claimed</span>
                )}
              </p>
            </div>
            <div className="results-list">
              {results.businesses.map((business: any, index: number) => (
                <div
                  key={index}
                  className={`prospect-card ${business.claimed ? 'claimed' : ''}`}
                >
                  <div className="prospect-top">
                    <div>
                      <div className="prospect-name">{business.name}</div>
                      <div className="prospect-category">{business.businessType}</div>
                    </div>
                    <span className={`confidence-badge ${business.confidence < 0.85 ? 'medium' : ''}`}>
                      {Math.round(business.confidence * 100)}%
                    </span>
                  </div>
                  <div className="prospect-address">
                    <MapPin size={14} />
                    {business.address}, {business.city}, {business.state} {business.zipCode}
                  </div>
                  <div className="prospect-actions">
                    {business.claimed ? (
                      <button className="prospect-btn claimed" disabled>
                        <Check size={14} />
                        Claimed
                      </button>
                    ) : (
                      <button
                        className="prospect-btn primary"
                        onClick={() => handleClaim(business)}
                        disabled={claiming}
                      >
                        <Bookmark size={14} />
                        Claim
                      </button>
                    )}
                    {business.phone && (
                      <a
                        href={`tel:${business.phone}`}
                        className="prospect-btn secondary"
                      >
                        <Phone size={14} />
                        Call
                      </a>
                    )}
                    <button className="prospect-btn secondary">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProspectFinder;
```

### Pipeline Preview Component

```tsx
// File: client/src/components/ProspectFinder/PipelinePreview.tsx

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { usePipelineSummary } from '../../hooks/useProspects';
import './PipelinePreview.css';

export const PipelinePreview: React.FC = () => {
  const { pipeline, loading } = usePipelineSummary();
  
  const stages = [
    { key: 'discovered', label: 'New', color: 'default' },
    { key: 'contacted', label: 'Contacted', color: 'hot' },
    { key: 'qualified', label: 'Qualified', color: 'warm' },
    { key: 'proposal_sent', label: 'Proposal', color: 'default' },
    { key: 'won', label: 'Won', color: 'won' }
  ];
  
  if (loading) {
    return <div className="pipeline-preview loading">Loading pipeline...</div>;
  }
  
  return (
    <div className="pipeline-preview">
      <div className="pipeline-header">
        <h3 className="pipeline-title">My Prospect Pipeline</h3>
        <a href="/prospects" className="view-all-link">
          View All
          <ChevronRight size={16} />
        </a>
      </div>
      <div className="pipeline-stages">
        {stages.map(stage => (
          <div key={stage.key} className={`stage-card ${stage.color}`}>
            <div className="stage-count">{pipeline[stage.key] || 0}</div>
            <div className="stage-label">{stage.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelinePreview;
```

---

## Step 6: Create React Hooks

```typescript
// File: client/src/hooks/useProspects.ts

import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

// Fetch MCC codes
export function useMCCCodes() {
  const [categories, setCategories] = useState<any[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    api.get('/prospects/mcc-codes')
      .then(res => {
        setCategories(res.data.categories);
        setCodes(res.data.codes);
      })
      .finally(() => setLoading(false));
  }, []);
  
  return { categories, codes, loading };
}

// Search prospects
export function useProspectSearch() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const search = useCallback(async (params: {
    zipCode: string;
    mccCodes: string[];
    radius: number;
    maxResults: number;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await api.post('/prospects/search', params);
      setResults(res.data);
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Search failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { search, results, loading, error };
}

// Claim prospect
export function useProspectClaim() {
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const claim = useCallback(async (business: any) => {
    setClaiming(true);
    setError(null);
    
    try {
      const res = await api.post('/prospects/claim', { business });
      return res.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to claim');
      return null;
    } finally {
      setClaiming(false);
    }
  }, []);
  
  return { claim, claiming, error };
}

// Get pipeline summary
export function usePipelineSummary() {
  const [pipeline, setPipeline] = useState<any>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    api.get('/prospects/pipeline')
      .then(res => setPipeline(res.data))
      .finally(() => setLoading(false));
  }, []);
  
  const refresh = useCallback(() => {
    api.get('/prospects/pipeline')
      .then(res => setPipeline(res.data));
  }, []);
  
  return { pipeline, loading, refresh };
}

// Get prospects list
export function useProspects(filters?: any) {
  const [prospects, setProspects] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    api.get('/prospects', { params: filters })
      .then(res => {
        setProspects(res.data.prospects);
        setPagination(res.data.pagination);
      })
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);
  
  return { prospects, pagination, loading };
}
```

---

## Step 7: Register Routes

Add to your main Express app:

```typescript
// File: server/index.ts (or app.ts)

import prospectRoutes from './routes/prospects';

// ... other middleware

app.use('/api/prospects', prospectRoutes);
```

---

## Step 8: Add to Home Page

Update your home page to include the new components:

```tsx
// File: client/src/pages/Home.tsx

import { ProspectFinder } from '../components/ProspectFinder/ProspectFinder';
import { PipelinePreview } from '../components/ProspectFinder/PipelinePreview';

export const Home: React.FC = () => {
  return (
    <div className="home-page">
      {/* Existing Scan & Drop */}
      <ScanAndDrop />
      
      {/* NEW: Prospect Finder */}
      <ProspectFinder />
      
      {/* NEW: Pipeline Preview */}
      <PipelinePreview />
      
      {/* Existing Today's Pickups */}
      <TodaysPickups />
      
      {/* Existing Stats */}
      <StatsRow />
    </div>
  );
};
```

---

## Environment Variables Required

Add these to your Replit Secrets:

```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Testing Checklist

1. [ ] Database migration runs successfully
2. [ ] MCC codes load in UI
3. [ ] Search returns results for valid zip code
4. [ ] Claiming marks prospect as owned
5. [ ] Other agents cannot see claimed prospects
6. [ ] Pipeline summary shows correct counts
7. [ ] Admin can see all prospects
8. [ ] Export generates valid CSV
9. [ ] Convert to merchant creates record

---

## Notes for Replit AI Agent

When implementing this feature:

1. **Start with database** - Run the migration first
2. **Add MCC data** - Copy the JSON file
3. **Implement backend** - Routes and services
4. **Build frontend** - Components and hooks
5. **Test integration** - Full flow testing

The AI search uses Claude with web search. If you need to use a different method (Google Places API, Yelp API, etc.), modify the `searchLocalBusinesses` function accordingly.
