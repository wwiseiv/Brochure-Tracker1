# PDF Parsing Timeout Fix Package

## The Problem

The Proposal Generator's PDF parsing times out on large or complex statements:
- Current 120-second timeout is insufficient for 10+ page documents
- Complex PDFs (high-resolution, many images) take longer to process
- No progress feedback leaves users uncertain if it's working
- Single failures abort the entire process

## The Solution

This package implements robust PDF parsing with:

| Feature | Benefit |
|---------|---------|
| **Chunked Processing** | Process page-by-page, not all at once |
| **Configurable Timeouts** | 45s per page, 15 min total (adjustable) |
| **Retry Logic** | Exponential backoff on failures |
| **Progress Tracking** | Real-time updates on processing status |
| **Graceful Degradation** | Continue even if some pages fail |
| **Background Jobs** | Long-running jobs don't block requests |

## Files Included

```
pdf-timeout-fix/
├── server/
│   ├── services/
│   │   ├── robust-pdf-parser.ts      # Main parsing service
│   │   └── pdf-job-queue.ts          # Background job processor
│   └── routes-integration.ts          # API endpoint updates
├── client/
│   └── src/components/
│       └── PDFProcessingProgress.tsx  # Progress UI component
└── README.md
```

## Installation

### Step 1: Install Dependencies

```bash
# PDF to image conversion (pick one)
# Option A: Poppler (recommended - faster, better quality)
apt-get install poppler-utils

# Option B: ImageMagick (fallback)
apt-get install imagemagick

# Option C: For Node.js only environments, consider pdf2pic
npm install pdf2pic
```

### Step 2: Copy Server Files

```bash
cp server/services/robust-pdf-parser.ts your-project/server/services/
cp server/services/pdf-job-queue.ts your-project/server/services/
```

### Step 3: Update Routes

See `routes-integration.ts` for complete examples. Key changes:

```typescript
import { createPDFParser } from './services/robust-pdf-parser';
import { PDFJobQueue } from './services/pdf-job-queue';

// Create parser with increased timeouts
const pdfParser = createPDFParser({
  perPageTimeout: 45000,     // 45s per page (was 120s total!)
  maxTotalTimeout: 900000,   // 15 minutes total
  maxRetries: 3,
  skipFailedPages: true,
});

// Create job queue for async processing
const jobQueue = new PDFJobQueue(pdfParser);
```

### Step 4: Add Frontend Component

```bash
cp client/src/components/PDFProcessingProgress.tsx your-project/client/src/components/
```

### Step 5: (Optional) Add Database Table for Jobs

```sql
CREATE TABLE pdf_parse_jobs (
  id VARCHAR(50) PRIMARY KEY,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  pdf_path TEXT NOT NULL,
  extraction_prompt TEXT NOT NULL,
  config JSONB,
  progress JSONB,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  user_id INTEGER,
  metadata JSONB
);
```

## Configuration Reference

```typescript
interface PDFParserConfig {
  // Timeouts
  perPageTimeout: number;      // Default: 30000 (30s)
  maxTotalTimeout: number;     // Default: 600000 (10 min)
  
  // Retry settings
  maxRetries: number;          // Default: 3
  retryBaseDelay: number;      // Default: 1000 (1s)
  
  // Processing limits
  maxPages: number;            // Default: 50
  parallelPages: number;       // Default: 2
  
  // Image conversion
  imageDPI: number;            // Default: 150
  imageQuality: number;        // Default: 85
  maxImageDimension: number;   // Default: 2000
  
  // Error handling
  skipFailedPages: boolean;    // Default: true
  minSuccessfulPages: number;  // Default: 1
}
```

### Recommended Settings by PDF Type

| PDF Type | perPageTimeout | imageDPI | parallelPages |
|----------|---------------|----------|---------------|
| Text-only statements | 20000 | 100 | 3 |
| Standard statements | 30000 | 150 | 2 |
| Image-heavy statements | 45000 | 150 | 1 |
| Scanned documents | 60000 | 200 | 1 |

## API Endpoints

### Synchronous (Small PDFs)

```
POST /api/proposal/analyze-statement
Content-Type: multipart/form-data

Body: { statement: <PDF file> }

Response: {
  success: boolean,
  data: { ... extracted data ... },
  pagesProcessed: number,
  warnings: string[]
}
```

### Asynchronous (Large PDFs)

```
POST /api/proposal/analyze-statement/async
Content-Type: multipart/form-data

Body: { statement: <PDF file> }

Response: {
  jobId: "pdf_123456_abc",
  status: "queued",
  pollUrl: "/api/proposal/jobs/pdf_123456_abc"
}
```

### Poll Job Status

```
GET /api/proposal/jobs/:id

Response: {
  id: "pdf_123456_abc",
  status: "processing",
  progress: {
    percentComplete: 45,
    currentStep: "Analyzing page 5 of 12...",
    currentPage: 5,
    totalPages: 12,
    pagesProcessed: 4,
    pagesFailed: 0,
    estimatedTimeRemaining: 120
  }
}
```

### Stream Progress (SSE)

```
GET /api/proposal/jobs/:id/stream

Event stream:
data: {"type":"progress","progress":{...}}
data: {"type":"completed","result":{...}}
```

## Frontend Usage

### Basic Progress Display

```tsx
import { PDFProcessingProgress } from '@/components/PDFProcessingProgress';

function ProposalGenerator() {
  const [jobId, setJobId] = useState<string | null>(null);
  
  return (
    <PDFProcessingProgress
      jobId={jobId}
      onComplete={(result) => {
        console.log('Extracted data:', result.data);
        setJobId(null);
      }}
      onError={(error) => {
        console.error('Processing failed:', error);
      }}
      useSSE  // Use Server-Sent Events for real-time updates
    />
  );
}
```

### Full Upload Flow

```tsx
import { PDFUploadWithProgress } from '@/components/PDFProcessingProgress';

function StatementUploader() {
  return (
    <PDFUploadWithProgress
      onUploadComplete={(result) => {
        // result.data contains extracted statement info
        createProposal(result.data);
      }}
      maxFileSize={50 * 1024 * 1024}  // 50MB
    />
  );
}
```

## How It Works

### Processing Flow

```
┌─────────────────┐
│  Upload PDF     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Analyze PDF    │ ← Get page count, complexity
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Convert Pages  │ ← PDF → JPEG (pdftoppm)
│  (In Batches)   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│ Page 1│ │ Page 2│  ← Parallel processing
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Claude │ │Claude │  ← AI extraction with retry
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│  Merge Results  │ ← Combine data from all pages
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Return Data    │
└─────────────────┘
```

### Retry Logic

```
Attempt 1 fails
    ↓
Wait 1 second
    ↓
Attempt 2 fails
    ↓
Wait 2 seconds
    ↓
Attempt 3 fails
    ↓
Wait 4 seconds
    ↓
Attempt 4 fails
    ↓
Mark page as failed, continue to next page
```

### Data Merging

Pages are processed independently, then merged:

```typescript
// Page 1 data
{ merchantInfo: { name: "Joe's Pizza" } }

// Page 2 data
{ volumeData: { totalVolume: 50000 } }

// Page 3 data
{ fees: [{ type: "Interchange", amount: 500 }] }

// Merged result
{
  merchantInfo: { name: "Joe's Pizza" },
  volumeData: { totalVolume: 50000 },
  fees: [{ type: "Interchange", amount: 500 }]
}
```

## Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Timeout** | 120s total | 45s/page, 15min total |
| **Large PDFs** | ❌ Timeout | ✅ Processed in chunks |
| **Progress** | ❌ None | ✅ Real-time updates |
| **Failures** | ❌ Abort all | ✅ Skip and continue |
| **User Feedback** | ❌ Waiting... | ✅ "Page 5 of 12 (42%)" |
| **Retries** | ❌ None | ✅ 3 attempts per page |

## Troubleshooting

### "pdftoppm: command not found"

Install poppler-utils:
```bash
# Ubuntu/Debian
apt-get install poppler-utils

# macOS
brew install poppler

# Or use ImageMagick fallback
apt-get install imagemagick
```

### Processing is slow

1. Reduce `imageDPI` to 100 for text-heavy documents
2. Increase `parallelPages` if you have resources
3. Set `maxPages` to limit processing scope

### Some pages always fail

1. Check if PDF is encrypted
2. Try increasing `perPageTimeout`
3. Check Claude API rate limits
4. Verify image conversion is working

### Memory issues with large PDFs

1. Reduce `parallelPages` to 1
2. Process fewer pages at once
3. Reduce `maxImageDimension`

## Environment Variables

```env
# Timeouts
PDF_PARSE_PER_PAGE_TIMEOUT=45000
PDF_PARSE_MAX_TOTAL_TIMEOUT=900000

# Retry settings
PDF_PARSE_MAX_RETRIES=3

# Processing
PDF_PARSE_MAX_PAGES=30
PDF_PARSE_PARALLEL_PAGES=2

# Image conversion
PDF_PARSE_IMAGE_DPI=150
PDF_PARSE_IMAGE_QUALITY=85
```

## Migration from Old Code

```typescript
// BEFORE - Single timeout, no progress
const result = await parseStatement(pdfBuffer, {
  timeout: 120000  // 2 minutes - often not enough!
});

// AFTER - Robust processing with progress
const result = await pdfParser.parse(
  pdfPath,
  extractionPrompt,
  (progress) => {
    console.log(`${progress.percentComplete}% - ${progress.currentStep}`);
  }
);
```

---

*This package transforms PDF parsing from a fragile 2-minute operation to a robust 15-minute capable process with full visibility into progress.*
