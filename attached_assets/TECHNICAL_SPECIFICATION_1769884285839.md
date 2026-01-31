# PCBancard Prospect Finder - Technical Specification

## Overview

The Prospect Finder is a comprehensive AI-powered prospecting system that enables sales agents to discover, qualify, and manage local business prospects directly from their mobile devices. This feature transforms cold calling into intelligent, data-driven prospecting by leveraging AI to find businesses matching approved merchant categories.

---

## Feature Summary

### Core Capabilities
1. **AI-Powered Business Discovery** - Search local businesses by zip code and business type
2. **MCC-Based Filtering** - Only show businesses matching approved Level 1 and Level 2 merchant categories
3. **Prospect Pipeline Management** - Track prospects through discovery → contacted → qualified → converted stages
4. **Agent Exclusivity** - Prospects claimed by an agent are invisible to other agents
5. **CRM Integration** - Create merchant records directly from qualified prospects
6. **Export Functionality** - Download prospect lists as CSV/Excel

---

## Architecture

### Data Flow
```
Agent Input (Zip + Business Type + List Size)
         ↓
    AI Search Engine (Gemini/Perplexity via Replit)
         ↓
    Business Data Retrieval
         ↓
    Deduplication Check (against existing prospects/merchants)
         ↓
    Results Display with Claim Option
         ↓
    Prospect Record Creation (exclusive to agent)
         ↓
    Pipeline Stage Management
         ↓
    Convert to Merchant Record
```

### Database Schema

#### New Tables Required

```sql
-- Prospect Pipeline Table
CREATE TABLE prospects (
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
  risk_level INTEGER DEFAULT 1, -- 1 = Level 1 (Low), 2 = Level 2 (Moderate)
  
  -- Discovery Metadata
  source VARCHAR(50) DEFAULT 'ai_search', -- 'ai_search', 'manual', 'import'
  ai_confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  search_query TEXT, -- Original search parameters
  
  -- Pipeline Status
  status VARCHAR(20) DEFAULT 'discovered',
  -- Status values: 'discovered', 'contacted', 'qualified', 'proposal_sent', 'negotiating', 'won', 'lost', 'disqualified'
  
  -- Activity Tracking
  last_contact_date TIMESTAMP,
  next_followup_date TIMESTAMP,
  contact_attempts INTEGER DEFAULT 0,
  notes TEXT,
  
  -- Conversion Tracking
  converted_to_merchant_id UUID REFERENCES merchants(id),
  converted_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Exclusivity Index
  UNIQUE(business_name, zip_code, agent_id)
);

-- Prospect Activity Log
CREATE TABLE prospect_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id),
  
  activity_type VARCHAR(50) NOT NULL,
  -- Types: 'created', 'status_change', 'note_added', 'contact_logged', 'followup_scheduled', 'converted'
  
  previous_value TEXT,
  new_value TEXT,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Search History (for analytics and preventing duplicate searches)
CREATE TABLE prospect_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id),
  
  zip_code VARCHAR(10) NOT NULL,
  business_types TEXT[], -- Array of MCC codes searched
  radius_miles INTEGER DEFAULT 10,
  results_count INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_prospects_agent ON prospects(agent_id);
CREATE INDEX idx_prospects_status ON prospects(status);
CREATE INDEX idx_prospects_zip ON prospects(zip_code);
CREATE INDEX idx_prospects_mcc ON prospects(mcc_code);
CREATE INDEX idx_prospect_activities_prospect ON prospect_activities(prospect_id);
CREATE INDEX idx_prospect_searches_agent ON prospect_searches(agent_id);
```

---

## API Endpoints

### Prospect Discovery

```typescript
// Search for new prospects
POST /api/prospects/search
Body: {
  zipCode: string,
  businessTypes: string[], // Array of MCC codes
  radius: number, // Miles (5, 10, 15, 25)
  maxResults: number // 10, 25, 50, 100
}
Response: {
  prospects: ProspectResult[],
  totalFound: number,
  duplicatesSkipped: number
}

// Claim a prospect (make exclusive to agent)
POST /api/prospects/claim
Body: {
  businessName: string,
  address: string,
  zipCode: string,
  phone: string,
  website: string,
  mccCode: string,
  aiData: object // Raw AI response data
}
Response: {
  prospect: Prospect,
  alreadyClaimed: boolean
}
```

### Prospect Management

```typescript
// Get agent's prospect pipeline
GET /api/prospects
Query: {
  status?: string,
  mccCode?: string,
  sortBy?: 'created_at' | 'next_followup_date' | 'business_name',
  sortOrder?: 'asc' | 'desc',
  page?: number,
  limit?: number
}

// Update prospect
PATCH /api/prospects/:id
Body: {
  status?: string,
  notes?: string,
  next_followup_date?: string,
  phone?: string,
  email?: string,
  contact_attempts?: number
}

// Convert prospect to merchant
POST /api/prospects/:id/convert
Body: {
  // Any additional merchant data needed
}
Response: {
  merchant: Merchant,
  prospect: Prospect // Updated with converted_to_merchant_id
}

// Delete/Release prospect (makes available to other agents)
DELETE /api/prospects/:id

// Export prospects
GET /api/prospects/export
Query: {
  format: 'csv' | 'xlsx',
  status?: string[],
  dateRange?: { start: string, end: string }
}
```

### Admin/Manager Endpoints

```typescript
// Get all prospects (manager/admin only)
GET /api/admin/prospects
Query: {
  agentId?: string,
  status?: string,
  // ... same filters as agent endpoint
}

// Get prospecting analytics
GET /api/admin/prospects/analytics
Response: {
  byAgent: { agentId: string, claimed: number, converted: number }[],
  byStatus: { status: string, count: number }[],
  byMCC: { mccCode: string, count: number }[],
  conversionRate: number
}
```

---

## AI Integration

### Recommended: Replit AI with Web Search

Replit provides access to AI models that can perform web searches. The implementation should:

```typescript
// server/services/prospectAI.ts

import Anthropic from '@anthropic-ai/sdk';

interface ProspectSearchParams {
  zipCode: string;
  businessTypes: { code: string; name: string }[];
  maxResults: number;
  radius: number;
}

interface BusinessResult {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  website: string;
  businessType: string;
  mccCode: string;
  confidence: number;
}

export async function searchProspects(params: ProspectSearchParams): Promise<BusinessResult[]> {
  const anthropic = new Anthropic();
  
  const businessTypeNames = params.businessTypes.map(bt => bt.name).join(', ');
  
  const prompt = `Search for real local businesses matching these criteria:

Location: ${params.zipCode} area (within ${params.radius} miles)
Business Types: ${businessTypeNames}
Number of Results Needed: ${params.maxResults}

For each business found, provide:
1. Business Name
2. Full Address (street, city, state, zip)
3. Phone Number
4. Website (if available)
5. Primary Business Type from the list provided
6. Confidence score (0.0-1.0) that this business matches the category

Return results as a JSON array. Focus on finding real, currently operating businesses.
Exclude franchises of major national chains unless specifically requested.
Prioritize local independent businesses.

Format your response as valid JSON only:
[
  {
    "name": "Business Name",
    "address": "123 Main St",
    "city": "City",
    "state": "ST",
    "zipCode": "12345",
    "phone": "(555) 123-4567",
    "website": "https://example.com",
    "businessType": "Type from list",
    "mccCode": "1234",
    "confidence": 0.95
  }
]`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    tools: [{
      type: 'web_search_20250305',
      name: 'web_search'
    }],
    messages: [{ role: 'user', content: prompt }]
  });

  // Parse the response and extract business data
  const textContent = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');
  
  // Extract JSON from response
  const jsonMatch = textContent.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in AI response');
  }
  
  return JSON.parse(jsonMatch[0]);
}
```

### Alternative: Google Places API (if available)

```typescript
// Fallback using Google Places API
export async function searchWithGooglePlaces(params: ProspectSearchParams) {
  const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  
  // Convert MCC codes to Google Places types
  const placeTypes = mapMCCToGoogleTypes(params.businessTypes);
  
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
    `location=${await getLatLngFromZip(params.zipCode)}` +
    `&radius=${params.radius * 1609}` + // Convert miles to meters
    `&type=${placeTypes.join('|')}` +
    `&key=${API_KEY}`
  );
  
  return response.json();
}
```

---

## MCC Code Reference Data

The system includes a complete reference of approved MCC codes. Store this in a JSON file:

```typescript
// server/data/mccCodes.ts

export interface MCCCode {
  code: string;
  title: string;
  description: string;
  level: 1 | 2; // Risk level
  category: string; // Grouping for UI
  searchTerms: string[]; // Additional terms for AI search
}

export const MCC_CODES: MCCCode[] = [
  // Level 1 - Low Risk (See MCC_CODES.json for complete list)
  {
    code: '5812',
    title: 'Eating Places and Restaurants',
    description: 'Full-service restaurants, diners, and casual dining establishments',
    level: 1,
    category: 'Food & Dining',
    searchTerms: ['restaurant', 'diner', 'cafe', 'eatery', 'bistro']
  },
  // ... complete list in separate JSON file
];

export const MCC_CATEGORIES = [
  { id: 'food', name: 'Food & Dining', icon: 'utensils' },
  { id: 'retail', name: 'Retail Stores', icon: 'shopping-bag' },
  { id: 'services', name: 'Professional Services', icon: 'briefcase' },
  { id: 'automotive', name: 'Automotive', icon: 'car' },
  { id: 'healthcare', name: 'Healthcare', icon: 'heart-pulse' },
  { id: 'entertainment', name: 'Entertainment & Recreation', icon: 'ticket' },
  { id: 'home', name: 'Home & Garden', icon: 'home' },
  { id: 'personal', name: 'Personal Services', icon: 'user' },
  { id: 'education', name: 'Education', icon: 'graduation-cap' },
  { id: 'other', name: 'Other Services', icon: 'grid' }
];
```

---

## Frontend Components

### Component Hierarchy

```
HomePage
├── ScanAndDropBar (existing)
├── ProspectFinderCard (NEW)
│   ├── QuickSearchForm
│   │   ├── ZipCodeInput
│   │   ├── BusinessTypeSelector
│   │   ├── RadiusSelector
│   │   └── ResultsCountSelector
│   └── RecentSearches
├── ProspectPipelinePreview (NEW)
│   ├── PipelineStageCards
│   └── UpcomingFollowups
└── TodaysPickups (existing)

ProspectSearchResultsPage (NEW)
├── SearchResultsList
│   └── ProspectCard
│       ├── BusinessInfo
│       ├── ClaimButton
│       └── QuickActions
├── FilterBar
└── BulkClaimButton

ProspectPipelinePage (NEW)
├── PipelineKanban
│   └── PipelineColumn
│       └── ProspectCard (draggable)
├── ProspectListView
└── ExportButton

ProspectDetailPage (NEW)
├── BusinessInfoSection
├── ContactSection
├── ActivityTimeline
├── NotesSection
└── ConvertToMerchantButton
```

---

## Security & Access Control

### Role-Based Access

```typescript
// Middleware for prospect access
export function checkProspectAccess(req, res, next) {
  const { user } = req;
  const { prospectId } = req.params;
  
  // Admins and managers can access all prospects
  if (user.role === 'admin' || user.role === 'manager') {
    return next();
  }
  
  // Agents can only access their own prospects
  const prospect = await Prospect.findById(prospectId);
  if (prospect.agentId !== user.id) {
    return res.status(403).json({ 
      error: 'You do not have access to this prospect' 
    });
  }
  
  next();
}
```

### Data Isolation

```typescript
// Query modifier for agent-level access
export function scopeToAgent(query, user) {
  if (user.role === 'admin' || user.role === 'manager') {
    return query; // No modification
  }
  return query.where('agent_id', user.id);
}

// Check if prospect is already claimed
export async function isProspectAvailable(businessName, zipCode, agentId) {
  const existing = await db('prospects')
    .where('business_name', 'ilike', businessName)
    .where('zip_code', zipCode)
    .whereNot('agent_id', agentId)
    .first();
  
  return !existing;
}
```

---

## Performance Considerations

### Caching Strategy

```typescript
// Cache MCC codes (rarely changes)
const MCC_CACHE_TTL = 86400; // 24 hours

// Cache search results temporarily (avoid duplicate API calls)
const SEARCH_CACHE_TTL = 3600; // 1 hour

// Redis keys
const CACHE_KEYS = {
  mccCodes: 'mcc:codes:all',
  searchResults: (zip, types) => `search:${zip}:${types.sort().join(',')}`,
  agentPipeline: (agentId) => `pipeline:${agentId}`
};
```

### Pagination

All list endpoints must support pagination to prevent performance issues:

```typescript
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
```

---

## Error Handling

```typescript
// Custom error types
export class ProspectNotFoundError extends Error {
  constructor(id: string) {
    super(`Prospect with ID ${id} not found`);
    this.name = 'ProspectNotFoundError';
  }
}

export class ProspectAlreadyClaimedError extends Error {
  constructor(businessName: string) {
    super(`"${businessName}" has already been claimed by another agent`);
    this.name = 'ProspectAlreadyClaimedError';
  }
}

export class AISearchError extends Error {
  constructor(message: string) {
    super(`AI search failed: ${message}`);
    this.name = 'AISearchError';
  }
}
```

---

## Testing Requirements

### Unit Tests
- MCC code lookup functions
- Deduplication logic
- Access control middleware
- Data transformation utilities

### Integration Tests
- Full search → claim → convert flow
- Role-based access verification
- Export functionality

### E2E Tests
- Complete prospect discovery workflow
- Pipeline stage transitions
- Mobile responsiveness

---

## Deployment Checklist

- [ ] Database migrations applied
- [ ] Environment variables configured (AI API keys)
- [ ] Redis cache configured
- [ ] API rate limiting enabled
- [ ] Error monitoring configured
- [ ] Analytics tracking implemented
- [ ] Mobile PWA manifest updated
- [ ] Search indexing configured

