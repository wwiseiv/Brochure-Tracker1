# PCBancard Field Sales Platform - Comprehensive System Documentation

**Version:** 2.1 | **Last Updated:** February 3, 2026 | **For:** Claude Opus 4.5 Analysis

This document provides exhaustive technical details, step-by-step workflows, AI model specifications, code references, and known issues for the entire PCBancard platform.

> **Recent Updates (v2.1):** Fixed mobile scrolling issues, implemented smart email digest scheduling, added cursor-based pagination, configurable cache system, and fuzzy duplicate detection.

---

## Table of Contents

1. [Known Issues & Bugs](#1-known-issues--bugs)
2. [AI Models & Services Reference](#2-ai-models--services-reference)
3. [Marketing Flyer Generation - Step by Step](#3-marketing-flyer-generation---step-by-step)
4. [Statement Analysis - Complete Workflow](#4-statement-analysis---complete-workflow)
5. [Proposal Generator - Detailed Process](#5-proposal-generator---detailed-process)
6. [Complete Feature List](#6-complete-feature-list)
7. [Code Architecture Overview](#7-code-architecture-overview)
8. [API Endpoints Reference](#8-api-endpoints-reference)
9. [Version 2.1 Changelog](#9-version-21-changelog-february-3-2026)

---

## 1. Known Issues & Bugs

### 1.1 Critical Issues

#### Navigation Inconsistency
**Status:** Partially Fixed
**Location:** Various page headers
**Issue:** Some main pages lack the HamburgerMenu button, causing users to get stuck
**Fixed Pages:** EquipIQ, E-Sign Document Library
**Potentially Affected:** Some sub-pages still use back buttons that may not navigate correctly

```typescript
// Pattern that should be used in all main pages:
import { HamburgerMenu } from "@/components/BottomNav";

// In header:
<div className="flex items-center gap-3">
  <HamburgerMenu />
  <h1>Page Title</h1>
</div>
```

#### Statement Analyzer - Undefined Value Crashes
**Status:** Mitigated with ErrorBoundary
**Location:** `client/src/pages/statement-analyzer.tsx`
**Issue:** When AI extraction fails to get all fields, the UI crashes trying to render undefined values
**Workaround:** Added `AnalysisErrorBoundary` component and `getSafeSavings()` helper

```typescript
// Current mitigation (lines 69-104):
class AnalysisErrorBoundary extends Component<...> {
  // Catches rendering errors from undefined values
}

// Safe access pattern (lines 126-144):
const getSafeSavings = (analysis: any) => {
  if (!analysis?.savings) return DEFAULT_SAVINGS;
  return {
    interchangePlus: {
      monthlyCost: analysis.savings.interchangePlus?.monthlyCost ?? 0,
      // ... more safe access
    }
  };
};
```

### 1.2 UI/UX Issues

#### Voice Recording Browser Compatibility
**Location:** Multiple components using MediaRecorder
**Issue:** Some browsers don't support all audio formats
**Files:** `RoleplayCoach.tsx`, `new-drop.tsx`, `DealMeetingRecorder.tsx`

```typescript
// Current format detection (RoleplayCoach.tsx lines 342-359):
let ext = "m4a"; // Default
const blobType = audioBlob.type.toLowerCase();
if (blobType.includes("webm")) ext = "webm";
else if (blobType.includes("mp4")) ext = "m4a";
// etc.
```

#### Mobile Safari Scroll Issues
**Status:** ✅ FIXED
**Location:** Deal Pipeline sheets, Hamburger menu, Prospect Finder sheets
**Issue:** iOS Safari scroll issues due to `vh` units not accounting for dynamic viewport
**Solution:** 
- Changed all `vh` units to `dvh` (dynamic viewport height)
- Added `min-h-0` to flex containers for proper scroll behavior
- Added `env(safe-area-inset-bottom)` padding to account for bottom nav and iOS safe areas
- Fixed Help page by wrapping with PermissionProvider

```typescript
// Example fix in BottomNav.tsx:
<SheetContent side="left" className="w-[280px] p-0 flex flex-col" 
  style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-bottom, 0px))' }}>
  <ScrollArea className="flex-1 min-h-0">
    <div style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}>
```

#### Proposal Generator - PDF Parsing Timeouts
**Location:** `server/services/proposal-parse-service.ts`
**Issue:** Large or complex PDFs can timeout during parsing
**Current Timeout:** 120 seconds

### 1.3 Data Issues

#### Merchant Intelligence Cache
**Status:** ✅ FIXED - Now Configurable
**Location:** `server/services/cache-service.ts`
**Solution:** Implemented a configurable cache service with admin controls

```typescript
// New cache service with configurable TTL:
const cacheConfig = await storage.getCacheConfiguration('merchant_intelligence');
const ttlMs = (cacheConfig?.ttlMinutes || 60) * 60 * 1000;

// Admin API endpoints:
// GET /api/admin/cache/config - View cache settings
// PATCH /api/admin/cache/config/:key - Update TTL
// POST /api/admin/cache/invalidate/:key - Force refresh
```

#### Prospect Finder - Duplicate Detection
**Status:** ✅ FIXED - Fuzzy Matching Implemented
**Location:** `server/services/duplicate-detection.ts`
**Solution:** Implemented fuzzy duplicate detection using Levenshtein distance and normalized matching

```typescript
// Fuzzy matching with configurable threshold:
function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeBusinessName(str1);
  const normalized2 = normalizeBusinessName(str2);
  return 1 - (levenshteinDistance(normalized1, normalized2) / Math.max(normalized1.length, normalized2.length));
}

// Checks: exact match, fuzzy name (>85% similarity), phone match, address match
```

### 1.4 Performance Issues

#### Large Pipeline Queries
**Status:** ✅ FIXED - Cursor-Based Pagination Implemented
**Location:** `server/services/pagination.ts`
**Solution:** Implemented efficient cursor-based pagination with proper schema field mapping

```typescript
// New pagination service:
interface PaginationParams {
  cursor?: string;  // Base64url encoded cursor
  limit?: number;   // Default: 50, Max: 100
  sortBy?: 'stage' | 'updatedAt' | 'businessName';
  sortOrder?: 'asc' | 'desc';
}

// API usage:
// GET /api/deals?cursor=xxx&limit=50&sortBy=stage
// Response includes: { deals: [...], nextCursor: 'yyy', hasMore: true }
```

#### Email Digest Processing
**Status:** ✅ FIXED - Smart Scheduling Implemented
**Location:** `server/services/smart-digest-scheduler.ts`
**Solution:** Replaced fixed 15-minute cron with adaptive EventEmitter-based scheduler

```typescript
// Smart digest scheduler features:
- Adaptive timing (1-30 min based on user preferences)
- Immediate digest option (threshold-based, e.g., 5+ notifications)
- Pause/resume functionality with pausedUntil timestamp
- Business hours enforcement for immediate digests (8 AM - 8 PM)
- Timezone-aware scheduling per user

// New API endpoints:
// POST /api/email-digest/pause - Pause digests for N days
// POST /api/email-digest/resume - Resume paused digests
// GET /api/email-digest/stats - Scheduler statistics
```

---

## 2. AI Models & Services Reference

### 2.1 Model Summary Table

| Service | Model | Provider | Purpose |
|---------|-------|----------|---------|
| Prospect Finder (Primary) | `grok-4` | xAI | Web search for businesses |
| Prospect Finder (Fallback) | `claude-sonnet-4-5` | Anthropic | Backup business search |
| Statement Analysis | `claude-sonnet-4-5` | Anthropic | Extract data from statements |
| Proposal Generation | `claude-sonnet-4-5` | Anthropic | Generate proposal content |
| Meeting Summaries | `gpt-4.1-mini` | OpenAI | Summarize recordings |
| Voice Transcription | `gemini-2.5-flash` | Google | Audio to text |
| Role-Play Coach | `claude-sonnet-4-5` | Anthropic | Sales training conversations |
| Help Chatbot | `claude-sonnet-4-5` | Anthropic | App assistance |
| Marketing Copy | `claude-sonnet-4-5` | Anthropic | Flyer text generation |
| Marketing Images | `gpt-image-1` | OpenAI | Hero image generation |
| Business Card OCR | `claude-sonnet-4-5` | Anthropic | Extract contact info |
| Document Classification | `claude-sonnet-4-5` | Anthropic | Identify document types |
| Website Scraping | `claude-sonnet-4-5` | Anthropic | Extract business intel |
| Proposal Images | `imagen-3.0-generate-002` | Google | Proposal cover images |

### 2.2 AI Integration Configuration

**Environment Variables Required:**

```bash
# Anthropic (Claude)
AI_INTEGRATIONS_ANTHROPIC_API_KEY=
AI_INTEGRATIONS_ANTHROPIC_BASE_URL=

# OpenAI (GPT, DALL-E, Whisper)
AI_INTEGRATIONS_OPENAI_API_KEY=
AI_INTEGRATIONS_OPENAI_BASE_URL=

# Google (Gemini)
AI_INTEGRATIONS_GEMINI_API_KEY=
AI_INTEGRATIONS_GEMINI_BASE_URL=

# xAI (Grok)
GROK_API_KEY=
```

### 2.3 AI Client Initialization Code

```typescript
// server/services/marketingGenerator.ts (lines 14-36):
function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
    if (!baseURL || !apiKey) {
      throw new Error('Anthropic AI Integration not configured');
    }
    anthropicClient = new Anthropic({ baseURL, apiKey });
  }
  return anthropicClient;
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    if (!baseURL || !apiKey) {
      throw new Error('OpenAI AI Integration not configured');
    }
    openaiClient = new OpenAI({ baseURL, apiKey });
  }
  return openaiClient;
}
```

### 2.4 Prospect Search AI Implementation

```typescript
// server/services/prospect-search.ts (key sections):

// Primary: Grok-4 with web_search tool
const response = await fetch("https://api.x.ai/v1/responses", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.GROK_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "grok-4",
    tools: [{ type: "web_search" }],
    input: prompt,
  }),
});

// Fallback: Claude with structured output
const anthropic = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
});
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 4096,
  messages: [{ role: "user", content: prompt }],
});
```

---

## 3. Marketing Flyer Generation - Step by Step

### 3.1 User Flow

1. **Navigate to Marketing Materials** (`/marketing`)
2. **Choose Method:**
   - **Static Templates:** Pre-made industry flyers (immediate download)
   - **AI Generator:** Custom flyer from prompt

### 3.2 Static Template Download

**Location:** `client/src/pages/marketing-materials.tsx`

```typescript
// Available templates (lines 111-160):
const STATIC_TEMPLATES: MarketingTemplateData[] = [
  { id: 1, name: "Liquor Stores Dual Pricing", industry: "liquor_stores", 
    thumbnailUrl: "/marketing/liquor-stores.png", pdfUrl: "/marketing/liquor-stores.pdf" },
  { id: 2, name: "Restaurants & Bars", industry: "restaurants_bars", ... },
  // ... 26 total templates
];
```

**Download Process:**
1. Click template card
2. Sheet opens with preview
3. Click "Download" button
4. PDF downloads directly from `/marketing/[template].pdf`

### 3.3 AI Flyer Generation - Complete Flow

**Step 1: User Input**
```typescript
// Frontend sends to POST /api/marketing/generate
const input = {
  prompt: "Create a flyer for Joe's Pizza in Brooklyn",
  industry: "pizzerias",
  repName: "John Smith",
  repPhone: "(555) 123-4567",
  repEmail: "john@pcbancard.com",
  businessWebsite: "https://joespizza.com" // Optional
};
```

**Step 2: Job Creation (server/routes.ts)**
```typescript
// Creates pending job in database
const job = await db.insert(marketingGenerationJobs).values({
  userId,
  prompt: input.prompt,
  industry: input.industry,
  status: 'pending',
}).returning();
```

**Step 3: Background Processing (server/services/marketingGenerator.ts)**

```typescript
// Step 3a: Website Analysis (if URL provided)
if (businessWebsite) {
  const businessInfo = await analyzeBusinessWebsite(businessWebsite);
  // Extracts: name, type, services, unique selling points, owner name
}

// Step 3b: Generate Copy with Claude (lines 88-140):
async function generateFlyerContent(prompt: string, industry?: string): Promise<FlyerContent> {
  const approvedClaims = await getApprovedClaims();
  
  const systemPrompt = `You are an expert marketing copywriter for PCBancard...
    APPROVED CLAIMS YOU CAN USE:
    ${approvedClaims.map(c => `- ${c}`).join('\n')}
    
    BRAND GUIDELINES:
    - Professional but approachable tone
    - Focus on savings and simplicity
    - Avoid aggressive sales language`;
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
    system: systemPrompt,
  });
  
  // Parse JSON response
  return JSON.parse(response.content[0].text);
}

// Step 3c: Generate Hero Image with DALL-E (lines 200-250):
async function generateHeroImage(content: FlyerContent, industry: string): Promise<string> {
  const imagePrompt = `Professional marketing photo for ${industry} business...`;
  
  const response = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: imagePrompt,
    n: 1,
    size: "1024x1024",
  });
  
  return response.data[0].url;
}

// Step 3d: Build PDF (server/services/pdfFlyerBuilder.ts):
async function buildFlyerPDF(content: FlyerContent, heroImageUrl: string, repInfo: RepInfo): Promise<Buffer> {
  // Uses PDFKit to create professional flyer
  // Returns PDF buffer
}
```

**Step 4: Polling for Completion**
```typescript
// Frontend polls GET /api/marketing/jobs/:jobId every 3 seconds
// Returns: { status: 'completed', finalFlyerUrl: '/api/marketing/download/123' }
```

### 3.4 Marketing Template Schema

```typescript
// shared/schema.ts
export const marketingGenerationJobs = pgTable("marketing_generation_jobs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  prompt: text("prompt").notNull(),
  industry: text("industry"),
  status: text("status").default("pending"),
  generatedContent: jsonb("generated_content"),
  heroImageUrl: text("hero_image_url"),
  finalFlyerUrl: text("final_flyer_url"),
  errorMessage: text("error_message"),
  savedToLibrary: boolean("saved_to_library").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## 4. Statement Analysis - Complete Workflow

### 4.1 Two Analysis Methods

**Method A: AI Vision Analysis (Automated)**
- Upload PDF/image
- AI extracts all data automatically
- Best for clear, standard statements

**Method B: Manual Entry**
- Enter data in form fields
- AI still calculates savings
- Best for poor quality scans or complex statements

### 4.2 AI Vision Analysis Flow

**Step 1: File Upload**

```typescript
// client/src/pages/statement-analyzer.tsx (lines 400-500):
// Supports: PDF, PNG, JPG, Excel
const handleFileUpload = async (files: FileList) => {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  
  // POST /api/statement-analysis/upload
  const response = await apiRequest("POST", "/api/statement-analysis/upload", formData);
};
```

**Step 2: Background Processing**

```typescript
// server/routes.ts - Statement Analysis endpoints:

// Creates job in database
app.post("/api/statement-analysis/upload", async (req, res) => {
  const job = await storage.createStatementAnalysisJob({
    userId,
    status: 'pending',
    files: uploadedFileUrls,
  });
  
  // Fire and forget background processing
  processStatementAnalysis(job.id);
  
  res.json({ jobId: job.id, status: 'processing' });
});
```

**Step 3: AI Extraction (server/proposal-intelligence/services/statement-analysis.ts)**

```typescript
async function extractStatementData(fileUrls: string[]): Promise<StatementData> {
  const anthropic = getAnthropicClient();
  
  // Convert files to base64 for vision API
  const images = await Promise.all(fileUrls.map(convertToBase64));
  
  // Few-shot learning with examples
  const fewShotExamples = await getFewShotExamples();
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `Extract all processing data from this statement...
            
            EXTRACT THESE FIELDS:
            - Monthly volume (total card sales)
            - Transaction count
            - Visa/MC/Discover/Amex breakdown
            - Current processor name
            - Effective rate
            - All fees: interchange, assessment, markup, statement, PCI, etc.
            
            ${fewShotExamples}
            
            Return as JSON.`
        },
        ...images.map(img => ({
          type: "image",
          source: { type: "base64", media_type: "image/png", data: img }
        }))
      ]
    }]
  });
  
  return JSON.parse(response.content[0].text);
}
```

**Step 4: Fee Identification & Red Flags**

```typescript
// server/services/fee-dictionary.ts
const feeDictionary = {
  "interchange": { category: "pass-through", typical: "1.5-3%" },
  "assessment": { category: "pass-through", typical: "0.13-0.15%" },
  "markup": { category: "processor", typical: "0.2-0.5%", redFlag: "> 1%" },
  "statement_fee": { category: "fixed", typical: "$10-25", redFlag: "> $50" },
  "pci_fee": { category: "fixed", typical: "$0-10", redFlag: "> $25" },
  "batch_fee": { category: "per-transaction", typical: "$0.10-0.25" },
  // ... more fees
};

function identifyRedFlags(extractedData: StatementData): RedFlag[] {
  const flags = [];
  
  if (extractedData.effectiveRate > 4.0) {
    flags.push({
      severity: "high",
      message: "Effective rate over 4% - significantly above industry average",
      potentialSavings: calculateOvercharge(extractedData)
    });
  }
  
  // Check each fee against dictionary
  for (const fee of extractedData.fees) {
    const dictEntry = feeDictionary[fee.type];
    if (dictEntry?.redFlag && fee.amount > parseRedFlag(dictEntry.redFlag)) {
      flags.push({
        severity: "medium",
        message: `${fee.type} of ${fee.amount} exceeds typical range`,
        typical: dictEntry.typical
      });
    }
  }
  
  return flags;
}
```

**Step 5: Savings Calculation**

```typescript
// server/proposal-intelligence/services/interchange-calculator.ts
function calculateSavings(data: StatementData, pricingConfig: PricingConfig): SavingsResult {
  const currentTotalCost = data.fees.reduce((sum, f) => sum + f.amount, 0);
  
  // Interchange-Plus Scenario
  const icPlusCost = calculateInterchangePlus(data, pricingConfig);
  
  // Dual Pricing Scenario
  const dualPricingCost = calculateDualPricing(data, pricingConfig);
  
  return {
    interchangePlus: {
      monthlyCost: icPlusCost,
      monthlySavings: currentTotalCost - icPlusCost,
      annualSavings: (currentTotalCost - icPlusCost) * 12,
      effectiveRate: (icPlusCost / data.totalVolume) * 100
    },
    dualPricing: {
      monthlyCost: dualPricingCost,
      monthlySavings: currentTotalCost - dualPricingCost,
      annualSavings: (currentTotalCost - dualPricingCost) * 12,
      effectiveRate: (dualPricingCost / data.totalVolume) * 100
    }
  };
}
```

### 4.3 Manual Entry Method

```typescript
// client/src/pages/statement-analyzer.tsx - Manual Entry Form

const manualEntrySchema = z.object({
  merchantName: z.string().min(1),
  monthlyVolume: z.number().positive(),
  transactionCount: z.number().positive(),
  currentProcessor: z.string().optional(),
  visaVolume: z.number().optional(),
  mastercardVolume: z.number().optional(),
  discoverVolume: z.number().optional(),
  amexVolume: z.number().optional(),
  interchangeFees: z.number().optional(),
  assessmentFees: z.number().optional(),
  markupFees: z.number().optional(),
  statementFee: z.number().optional(),
  pciFee: z.number().optional(),
  otherFees: z.number().optional(),
});

// Submit to same analysis endpoint with flag
const handleManualSubmit = async (data: ManualEntryData) => {
  await apiRequest("POST", "/api/statement-analysis/manual", {
    ...data,
    isManualEntry: true
  });
};
```

### 4.4 Statement Analysis Output

```typescript
interface StatementAnalysisResult {
  merchantInfo: {
    name: string;
    processor: string;
    statementDate: string;
  };
  volumeData: {
    totalVolume: number;
    totalTransactions: number;
    avgTicket: number;
    cardBreakdown: CardBreakdown;
  };
  feeAnalysis: {
    currentCosts: FeeBreakdown;
    redFlags: RedFlag[];
    complianceIssues: string[];
  };
  savings: {
    interchangePlus: SavingsScenario;
    dualPricing: SavingsScenario;
  };
  salesScript: {
    opener: string;
    keyPoints: string[];
    objectionHandlers: ObjectionHandler[];
    closingStatement: string;
  };
}
```

---

## 5. Proposal Generator - Detailed Process

### 5.1 Complete Workflow

**Step 1: Enter Agent Information**

```typescript
// client/src/pages/proposal-generator.tsx (lines 500-600):
interface SalespersonInfo {
  name: string;
  title: string;
  phone: string;
  email: string;
  photoUrl?: string;
}
```

**Step 2: Upload or Enter Merchant Data**

Three options:
1. **Upload Statement PDF** - Background parsing extracts data
2. **Link from Statement Analysis** - Use existing analysis
3. **Manual Entry** - Fill in all fields

**Step 3: PDF Parsing (Background Job)**

```typescript
// server/services/proposal-parse-service.ts
export async function parseProposalPDF(fileUrl: string): Promise<ParsedData> {
  // Convert PDF to images
  const images = await pdfToImages(fileUrl);
  
  // Extract text with Claude Vision
  const anthropic = getAnthropicClient();
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8192,
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `Extract merchant processing data from this statement...
            
            REQUIRED DATA:
            - Merchant name and DBA
            - Monthly processing volume
            - Transaction count by card brand
            - Current fee structure
            - Contract end date (if visible)
            
            Return structured JSON.`
        },
        ...images.map(img => ({
          type: "image",
          source: { type: "base64", media_type: "image/png", data: img }
        }))
      ]
    }]
  });
  
  return JSON.parse(response.content[0].text);
}
```

**Step 4: Equipment Selection**

```typescript
// Query equipment from EquipIQ database
const { data: equipment } = useQuery({
  queryKey: ['/api/equipiq/products'],
});

// User selects equipment for proposal
interface SelectedEquipment {
  productId: number;
  name: string;
  model: string;
  priceRange: string;
  features: string[];
}
```

**Step 5: Pricing Configuration**

```typescript
// client/src/components/PricingConfiguration.tsx
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  interchangePlus: {
    basisPoints: 30,        // 0.30%
    perTransactionFee: 0.10,
    monthlyFee: 9.95,
  },
  dualPricing: {
    monthlyFee: 64.95,
    surchargePercent: 4.0,
  }
};
```

**Step 6: AI Content Generation**

```typescript
// server/services/claude-document-generator.ts
export async function generateProposalContent(data: ProposalInput): Promise<ProposalContent> {
  const anthropic = getAnthropicClient();
  
  const prompt = `Generate a professional merchant services proposal...
    
    MERCHANT: ${data.merchantName}
    CURRENT VOLUME: $${data.monthlyVolume}/month
    CURRENT COSTS: $${data.currentMonthlyCosts}/month
    
    PROPOSED SOLUTION: ${data.proposalType}
    PROJECTED SAVINGS: $${data.projectedSavings}/month
    
    EQUIPMENT: ${data.selectedEquipment?.name || 'Standard terminal'}
    
    Generate these sections:
    1. Executive Summary (2-3 sentences)
    2. Current State Analysis (bullet points)
    3. Recommended Solution (detailed explanation)
    4. Equipment Specifications
    5. Pricing Breakdown Table
    6. Implementation Timeline
    7. Why Choose PCBancard
    8. Next Steps
    
    Use professional, consultative tone. Focus on value and ROI.`;
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }]
  });
  
  return parseProposalContent(response.content[0].text);
}
```

**Step 7: PDF Generation**

```typescript
// server/proposal-builder.ts
export async function buildProposalPDF(content: ProposalContent, config: ProposalConfig): Promise<Buffer> {
  // Use PDFKit or Puppeteer to generate branded PDF
  
  // Add cover page with merchant name
  // Add executive summary
  // Add current vs proposed comparison tables
  // Add equipment specs with images
  // Add pricing tables
  // Add terms and signature blocks
  
  return pdfBuffer;
}
```

### 5.2 Proposal Database Schema

```typescript
// shared/schema.ts
export const proposals = pgTable("proposals", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  merchantName: text("merchant_name").notNull(),
  proposalType: text("proposal_type").notNull(), // dual_pricing, interchange_plus, both
  status: text("status").default("draft"),
  parsedData: jsonb("parsed_data"),
  generatedContent: jsonb("generated_content"),
  selectedEquipment: jsonb("selected_equipment"),
  pricingConfig: jsonb("pricing_config"),
  pdfUrl: text("pdf_url"),
  dealId: integer("deal_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const proposalJobs = pgTable("proposal_jobs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  status: text("status").default("pending"), // pending, processing, completed, failed
  currentStep: text("current_step"),
  steps: jsonb("steps"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## 6. Complete Feature List

### 6.1 Core CRM & Pipeline

| Feature | Route | File | Description |
|---------|-------|------|-------------|
| Deal Pipeline | `/prospects/pipeline` | `prospect-pipeline.tsx` | 14-stage Kanban board |
| Merchant CRM | `/merchants` | `merchants.tsx` | Customer database |
| Merchant Detail | `/merchants/:id` | `merchant-detail.tsx` | Full merchant profile |
| Today's Actions | `/today` | `today.tsx` | Daily task center |
| Prospect Finder | `/prospects/search` | `prospect-finder.tsx` | AI business discovery |
| Business Card Scanner | `/business-card-scanner` | `business-card-scanner.tsx` | OCR contact capture |

### 6.2 Brochure & Drop Management

| Feature | Route | File | Description |
|---------|-------|------|-------------|
| New Drop | `/drops/new` | `new-drop.tsx` | Log brochure deployment |
| Drop Detail | `/drops/:id` | `drop-detail.tsx` | Drop management |
| Drop History | `/history` | `history.tsx` | Historical drops |
| Brochure Inventory | `/inventory` | `inventory.tsx` | Track brochures |
| Route Planner | `/route` | `route-planner.tsx` | Optimize pickups |
| QR Scanner | `/scan` | `scan.tsx` | Scan brochure QR codes |

### 6.3 AI-Powered Tools

| Feature | Route | File | AI Models Used |
|---------|-------|------|----------------|
| Statement Analyzer | `/statement-analyzer` | `statement-analyzer.tsx` | Claude (vision), Claude (analysis) |
| Proposal Generator | `/proposal-generator` | `proposal-generator.tsx` | Claude (parsing), Claude (content) |
| EquipIQ | `/equipiq` | `equipiq.tsx` | Claude (recommendations) |
| Email Drafter | `/email` | `email-drafter.tsx` | Claude (generation) |
| Marketing Generator | `/marketing` | `marketing-materials.tsx` | Claude (copy), DALL-E (images) |
| Help Chatbot | Floating button | `HelpChatbot.tsx` | Claude (conversation) |

### 6.4 Sales Training & Coaching

| Feature | Route | File | Description |
|---------|-------|------|-------------|
| Role-Play Coach | `/coach` | `coach.tsx` | AI sales practice |
| Context-Aware Role-Play | Via deals | `RoleplayCoach.tsx` | Merchant-specific training |
| Presentation Training | `/presentation-training` | `presentation-training.tsx` | 8-module course |
| Daily Edge | Dashboard widget | Multiple | Mindset training |

### 6.5 Document & E-Signature

| Feature | Route | File | Description |
|---------|-------|------|-------------|
| E-Sign Library | `/esign` | `esign-document-library.tsx` | Document templates |
| E-Sign Request | `/esign/:id` | `esign-request-detail.tsx` | Track signatures |
| Meeting Recorder | Via deals | `DealMeetingRecorder.tsx` | Record & transcribe |

### 6.6 Team & Organization

| Feature | Route | File | Description |
|---------|-------|------|-------------|
| Team Pipeline | `/team-pipeline` | `team-pipeline.tsx` | Manager view |
| Pipeline Analytics | `/pipeline-analytics` | `pipeline-analytics.tsx` | Performance metrics |
| Admin Dashboard | `/admin` | `admin-dashboard.tsx` | Org management |
| RM Dashboard | `/rm-dashboard` | `rm-dashboard.tsx` | Relationship manager view |
| Activity Feed | `/activity` | `activity-feed.tsx` | Team activity timeline |

### 6.7 Additional Features

| Feature | Route | File | Description |
|---------|-------|------|-------------|
| Profile | `/profile` | `profile.tsx` | User settings |
| Referrals | `/referrals` | `referrals.tsx` | Track referrals |
| My Work | `/my-work` | `my-work.tsx` | Personal proposals/analyses |
| Help | `/help` | `help.tsx` | Searchable documentation |

---

## 7. Code Architecture Overview

### 7.1 Directory Structure

```
/
├── client/
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   ├── BottomNav.tsx  # Navigation + HamburgerMenu
│   │   │   ├── RoleplayCoach.tsx
│   │   │   ├── DealMeetingRecorder.tsx
│   │   │   └── ...
│   │   ├── pages/             # Route components
│   │   │   ├── dashboard.tsx
│   │   │   ├── prospect-pipeline.tsx
│   │   │   ├── statement-analyzer.tsx
│   │   │   └── ...
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── use-auth.ts
│   │   │   ├── use-toast.ts
│   │   │   └── use-push-notifications.ts
│   │   └── lib/               # Utilities
│   │       └── queryClient.ts
├── server/
│   ├── routes.ts              # All API endpoints (~12,000 lines)
│   ├── storage.ts             # Database operations (~2,700 lines)
│   ├── db.ts                  # Drizzle connection
│   ├── services/              # Business logic
│   │   ├── marketingGenerator.ts
│   │   ├── merchantIntelligence.ts
│   │   ├── prospect-search.ts
│   │   ├── proposal-parse-service.ts
│   │   └── ...
│   └── proposal-intelligence/  # Proposal system
│       ├── api.ts
│       ├── core/
│       └── services/
├── shared/
│   ├── schema.ts              # Database schema
│   └── permissions.ts         # RBAC definitions
└── public/
    └── marketing/             # Static flyer assets
```

### 7.2 Key Code Patterns

**API Request Pattern (Frontend):**
```typescript
// client/src/lib/queryClient.ts
export async function apiRequest(method: string, url: string, body?: any) {
  const options: RequestInit = {
    method,
    credentials: 'include',
    headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  };
  return fetch(url, options);
}

// Usage in components:
const mutation = useMutation({
  mutationFn: async (data) => {
    const res = await apiRequest("POST", "/api/endpoint", data);
    return res.json();
  }
});
```

**Storage Pattern (Backend):**
```typescript
// server/storage.ts
class DatabaseStorage implements IStorage {
  async getDeals(userId: string, filters?: DealFilters): Promise<Deal[]> {
    let query = db.select().from(deals).where(eq(deals.orgId, userId));
    if (filters?.stage) {
      query = query.where(eq(deals.currentStage, filters.stage));
    }
    return query.orderBy(desc(deals.updatedAt));
  }
}
```

**Background Job Pattern:**
```typescript
// Create job, return immediately, process in background
app.post("/api/long-running-task", async (req, res) => {
  const job = await storage.createJob({ status: 'pending' });
  res.json({ jobId: job.id, status: 'processing' });
  
  // Fire and forget
  processJobInBackground(job.id);
});

// Frontend polls for completion
app.get("/api/jobs/:id", async (req, res) => {
  const job = await storage.getJob(parseInt(req.params.id));
  res.json(job);
});
```

---

## 8. API Endpoints Reference

### 8.1 Statement Analysis

```
POST /api/statement-analysis/upload
  Body: FormData with files
  Response: { jobId, status: 'processing' }

GET /api/statement-analysis/jobs/:id
  Response: { status, extractedData, savings, redFlags }

POST /api/statement-analysis/manual
  Body: ManualEntryData
  Response: { analysisId, savings }
```

### 8.2 Proposal Generator

```
POST /api/proposals/create
  Body: { merchantName, proposalType, dealId? }
  Response: { proposalId }

POST /api/proposals/:id/parse-statement
  Body: FormData with PDF
  Response: { jobId, status }

POST /api/proposals/:id/generate
  Body: { selectedEquipment, pricingConfig }
  Response: { status, pdfUrl }

GET /api/proposals/:id
  Response: Full proposal object
```

### 8.3 Marketing Materials

```
GET /api/marketing/templates
  Response: { templates: MarketingTemplate[] }

POST /api/marketing/generate
  Body: { prompt, industry, repInfo, businessWebsite? }
  Response: { jobId, status }

GET /api/marketing/jobs/:id
  Response: { status, content, heroImageUrl, finalFlyerUrl }
```

### 8.4 Merchant Intelligence

```
GET /api/merchant-intelligence?dealId=X
  Response: { intelligence: MerchantIntelligence | null }

POST /api/merchant-intelligence/generate
  Body: { dealId?, merchantId?, dropId? }
  Response: { intelligence, status: 'processing' | 'cached' }
```

### 8.5 Role-Play Coach

```
POST /api/roleplay/sessions
  Body: { scenario, mode, difficulty, dealId?, merchantId? }
  Response: { sessionId, hasIntelligence }

POST /api/roleplay/sessions/:id/message
  Body: { message }
  Response: { messageId, response }

POST /api/roleplay/sessions/:id/end
  Response: { feedback: SessionFeedback }
```

---

## 9. Version 2.1 Changelog (February 3, 2026)

### 9.1 Mobile Scrolling Fixes
- **Problem:** Hamburger menu and deal sheets wouldn't scroll to bottom on iOS Safari
- **Solution:** 
  - Replaced `vh` units with `dvh` (dynamic viewport height)
  - Added `min-h-0` to flex containers for proper overflow behavior
  - Added `env(safe-area-inset-bottom)` padding for iOS safe areas
  - Wrapped Help page with PermissionProvider to fix runtime error
- **Files Changed:** `client/src/components/BottomNav.tsx`, `client/src/pages/prospect-pipeline.tsx`, `client/src/pages/prospect-finder.tsx`, `client/src/App.tsx`

### 9.2 Smart Email Digest Scheduler
- **Problem:** Fixed 15-minute cron inefficient for varying user preferences
- **Solution:** EventEmitter-based adaptive scheduler with:
  - Immediate digest option (threshold-based during business hours)
  - Pause/resume functionality
  - Timezone-aware scheduling
  - 1-30 minute adaptive intervals
- **New Files:** `server/services/smart-digest-scheduler.ts`
- **New Schema Columns:** `pausedUntil`, `immediateDigestEnabled`, `immediateThreshold`, `businessHoursStart`, `businessHoursEnd`, `lastImmediateSentAt`

### 9.3 Cursor-Based Pagination
- **Problem:** Loading all deals caused performance issues for high-volume users
- **Solution:** Implemented cursor-based pagination with:
  - Base64url encoded cursors
  - Configurable sort options (stage, updatedAt, businessName)
  - Proper schema field mapping for numeric filtering
- **New Files:** `server/services/pagination.ts`

### 9.4 Configurable Cache System
- **Problem:** 1-hour hardcoded cache TTL for Merchant Intelligence
- **Solution:** Admin-configurable cache service with:
  - Per-feature TTL configuration
  - Cache invalidation API
  - Admin dashboard integration
- **New Files:** `server/services/cache-service.ts`

### 9.5 Fuzzy Duplicate Detection
- **Problem:** Prospect Finder only detected exact name matches
- **Solution:** Implemented fuzzy matching using:
  - Levenshtein distance algorithm
  - Business name normalization
  - 85% similarity threshold
  - Phone and address matching
- **New Files:** `server/services/duplicate-detection.ts`

---

## Appendix A: Enhancement Opportunities

1. ~~**Statement Analyzer:** Add processor-specific parsing templates for better accuracy~~ (Still pending)
2. ~~**Proposal Generator:** Add e-signature integration to send proposals directly~~ (Still pending)
3. ~~**Prospect Finder:** Add Google Places API for richer business data~~ (Still pending)
4. ~~**Role-Play Coach:** Add voice cloning for realistic merchant voices~~ (Still pending)
5. ~~**Marketing Generator:** Add A/B testing for flyer effectiveness~~ (Still pending)
6. ~~**Pipeline:** Add weighted pipeline forecasting~~ (Still pending)
7. ~~**Email Digest:** Add personalization based on user performance data~~ (Partially done with smart scheduling)

---

*This document should be updated whenever significant features are added or modified.*
*Last updated: February 3, 2026*
