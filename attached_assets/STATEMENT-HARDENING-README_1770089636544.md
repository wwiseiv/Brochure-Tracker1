# Statement Analyzer Hardening Package

## Overview

This package fixes the Statement Analyzer crashes caused by undefined values from incomplete AI extraction. It implements a multi-layer defense:

1. **Server-side validation** - Catches and sanitizes bad data before it reaches the client
2. **Confidence scoring** - Identifies when extraction quality is too low
3. **Manual review fallback** - Routes low-confidence extractions to user verification
4. **Client-side safe access** - Guarantees all rendered values are defined

## Files Included

```
statement-hardening/
├── server/
│   ├── services/
│   │   └── statement-validator.ts    # Core validation logic
│   └── routes-integration.ts         # How to integrate with routes.ts
├── client/
│   └── src/
│       ├── components/
│       │   └── ManualReviewSheet.tsx # UI for manual data review
│       └── hooks/
│           └── use-safe-statement-data.ts # Safe data access hook
└── README.md                         # This file
```

## Installation Steps

### Step 1: Copy Server Files

```bash
# Copy the validator to your services folder
cp server/services/statement-validator.ts your-project/server/services/

# If using TypeScript, you may need to adjust imports
```

### Step 2: Update Database Schema

Add these columns to your `statement_analysis_jobs` table:

```sql
-- Run this migration
ALTER TABLE statement_analysis_jobs 
  ADD COLUMN IF NOT EXISTS confidence INTEGER,
  ADD COLUMN IF NOT EXISTS needs_manual_review BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS review_reasons JSONB,
  ADD COLUMN IF NOT EXISTS validation_result JSONB,
  ADD COLUMN IF NOT EXISTS manually_reviewed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
```

Or if using Drizzle, update `shared/schema.ts`:

```typescript
export const statementAnalysisJobs = pgTable("statement_analysis_jobs", {
  // ... existing fields ...
  
  // NEW FIELDS
  confidence: integer("confidence"),
  needsManualReview: boolean("needs_manual_review").default(false),
  reviewReasons: jsonb("review_reasons"),
  validationResult: jsonb("validation_result"),
  manuallyReviewed: boolean("manually_reviewed").default(false),
  reviewedAt: timestamp("reviewed_at"),
});
```

### Step 3: Integrate Validator in Routes

In your `server/routes.ts`, update the statement processing:

```typescript
// Add import at top
import { validateAndSanitize } from './services/statement-validator';

// In your processStatementAnalysis function:
async function processStatementAnalysis(jobId: number) {
  try {
    // Your existing AI extraction
    const rawExtraction = await extractStatementData(job.files);
    
    // ✅ NEW: Validate and sanitize
    const validationResult = validateAndSanitize(rawExtraction);
    
    if (validationResult.needsManualReview) {
      // Route to manual review
      await storage.updateStatementAnalysisJob(jobId, {
        status: 'needs_review',
        extractedData: validationResult.data,
        confidence: validationResult.confidence.overall,
        reviewReasons: validationResult.reviewReasons,
        validationResult: validationResult,
      });
    } else {
      // Proceed normally with SAFE data
      const savings = await calculateSavings(validationResult.data);
      // ... rest of your logic
    }
  } catch (error) {
    // Error handling
  }
}
```

See `routes-integration.ts` for complete examples.

### Step 4: Copy Client Files

```bash
# Copy components
cp client/src/components/ManualReviewSheet.tsx your-project/client/src/components/

# Copy hooks
cp client/src/hooks/use-safe-statement-data.ts your-project/client/src/hooks/
```

### Step 5: Update Statement Analyzer Page

In `client/src/pages/statement-analyzer.tsx`:

```tsx
// Add imports
import { useSafeStatementData } from '@/hooks/use-safe-statement-data';
import { ManualReviewSheet } from '@/components/ManualReviewSheet';

// In your component:
function StatementAnalyzer() {
  const [showManualReview, setShowManualReview] = useState(false);
  
  // Use the safe data hook
  const {
    safeData,
    safeSavings,
    confidence,
    needsManualReview,
    reviewReasons,
    validationIssues,
    formatted,
    hasData,
  } = useSafeStatementData(analysisResult);
  
  // Show manual review when needed
  useEffect(() => {
    if (needsManualReview && !showManualReview) {
      setShowManualReview(true);
    }
  }, [needsManualReview]);
  
  return (
    <div>
      {/* Your existing UI, but use safeData and formatted values */}
      <div>Volume: {formatted.totalVolume}</div>
      <div>Transactions: {formatted.totalTransactions}</div>
      <div>Effective Rate: {formatted.effectiveRate}</div>
      
      {/* Show confidence indicator */}
      {hasData && (
        <ConfidenceBadge score={confidence.overall} />
      )}
      
      {/* Savings display - always safe */}
      <div>Annual Savings (IC+): {formatted.annualSavingsIC}</div>
      <div>Annual Savings (DP): {formatted.annualSavingsDP}</div>
      
      {/* Manual review sheet */}
      <ManualReviewSheet
        isOpen={showManualReview}
        onClose={() => setShowManualReview(false)}
        jobId={jobId}
        extractedData={safeData}
        confidence={confidence}
        reviewReasons={reviewReasons}
        validationIssues={validationIssues}
        onReviewComplete={(correctedData) => {
          // Refresh your data
          refetch();
        }}
      />
    </div>
  );
}
```

## How It Works

### Validation Flow

```
┌─────────────────┐
│  AI Extraction  │
│  (may be bad)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Validator     │
│  - Null checks  │
│  - Range checks │
│  - Type coercion│
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│ Confidence      │─────▶│  Low Confidence  │
│ Scoring         │      │  Manual Review   │
└────────┬────────┘      └──────────────────┘
         │
         │ High Confidence
         ▼
┌─────────────────┐
│  Safe Data      │
│  (always valid) │
└─────────────────┘
```

### Confidence Scoring

| Score | Meaning | Action |
|-------|---------|--------|
| 80-100% | High confidence | Auto-proceed |
| 60-79% | Medium confidence | Proceed with warnings |
| 0-59% | Low confidence | Manual review required |

Confidence is weighted:
- Volume Data: 50% (most important)
- Fees: 30%
- Merchant Info: 20%

### What Gets Flagged for Manual Review

1. **Missing Critical Data**
   - Total volume not found
   - Transaction count missing
   - Effective rate couldn't be determined

2. **Suspicious Values**
   - Volume < $100/month
   - Effective rate > 5%
   - Avg ticket > $10,000

3. **Data Inconsistencies**
   - Card breakdown doesn't sum to total
   - Fee total doesn't match effective rate

4. **Too Many Warnings**
   - 5+ validation warnings

## Testing

### Test with Bad Data

```typescript
// Test the validator with various bad inputs
import { validateAndSanitize } from './services/statement-validator';

// Completely null
const result1 = validateAndSanitize(null);
console.log(result1.needsManualReview); // true
console.log(result1.data.volumeData.totalVolume); // 0 (safe default)

// Partial data
const result2 = validateAndSanitize({
  merchantInfo: { name: 'Test' },
  // missing volumeData, fees, etc.
});
console.log(result2.needsManualReview); // true
console.log(result2.issues); // lists what's missing

// Good data
const result3 = validateAndSanitize({
  merchantInfo: { name: 'Joe Pizza', processor: 'Square' },
  volumeData: { totalVolume: 50000, totalTransactions: 1200 },
  fees: [{ type: 'Interchange', amount: 750 }],
  effectiveRate: 2.8,
});
console.log(result3.needsManualReview); // false
console.log(result3.confidence.overall); // ~85
```

### Test Frontend Hook

```tsx
// In a test component
const { safeData, formatted } = useSafeStatementData(undefined);

// These will NEVER crash:
console.log(safeData.volumeData.totalVolume); // 0
console.log(safeData.merchantInfo.name); // ''
console.log(formatted.totalVolume); // '$0'
```

## Removing the Old Workarounds

Once integrated, you can remove these from `statement-analyzer.tsx`:

```typescript
// REMOVE: AnalysisErrorBoundary class (lines 69-104)
// REMOVE: getSafeSavings helper (lines 126-144)
// REMOVE: Manual null checks scattered throughout

// KEEP: The ErrorBoundary as a last-resort safety net
// But it should never actually catch errors now
```

## Troubleshooting

### "Cannot find module" Errors

Make sure your TypeScript paths are configured:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Database Migration Fails

Check if columns already exist:

```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'statement_analysis_jobs';
```

### Manual Review Never Shows

1. Check the `status` field is being set to `'needs_review'`
2. Verify frontend is checking `needsManualReview` from the API response
3. Check browser console for errors

## Support

If issues persist, check:
1. Server logs for validation output
2. Network tab for API response structure
3. React DevTools for state values

---

*This package eliminates the root cause of Statement Analyzer crashes while providing a better UX for edge cases.*
