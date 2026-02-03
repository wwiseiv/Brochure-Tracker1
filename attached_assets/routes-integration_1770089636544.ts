/**
 * Statement Analysis Routes - Hardened Version
 * =============================================
 * 
 * This file shows how to integrate the StatementValidator into your routes.ts
 * 
 * INTEGRATION STEPS:
 *   1. Add the import at the top of routes.ts
 *   2. Replace your existing statement analysis processing with this pattern
 *   3. Update your response structure to include confidence/review status
 */

// ============================================
// STEP 1: Add this import to routes.ts
// ============================================

import { validateAndSanitize, ValidationResult } from './services/statement-validator';

// ============================================
// STEP 2: Update your statement analysis endpoint
// ============================================

/**
 * BEFORE (vulnerable to crashes):
 * 
 * app.post("/api/statement-analysis/upload", async (req, res) => {
 *   const job = await storage.createStatementAnalysisJob({ userId, status: 'pending', files });
 *   processStatementAnalysis(job.id);  // Fire and forget
 *   res.json({ jobId: job.id, status: 'processing' });
 * });
 */

/**
 * AFTER (hardened):
 */

// In your processStatementAnalysis function, wrap the AI extraction:

async function processStatementAnalysisHardened(jobId: number) {
  const job = await storage.getStatementAnalysisJob(jobId);
  
  try {
    // Update status to processing
    await storage.updateStatementAnalysisJob(jobId, { 
      status: 'processing',
      currentStep: 'extracting'
    });
    
    // Call your existing AI extraction
    const rawExtraction = await extractStatementData(job.files);
    
    // ✅ NEW: Validate and sanitize the extraction
    const validationResult = validateAndSanitize(rawExtraction);
    
    // Log validation issues for debugging
    if (validationResult.issues.length > 0) {
      console.log(`[Statement ${jobId}] Validation issues:`, validationResult.issues);
    }
    
    // Update status based on validation
    if (validationResult.needsManualReview) {
      await storage.updateStatementAnalysisJob(jobId, {
        status: 'needs_review',
        currentStep: 'awaiting_manual_review',
        extractedData: validationResult.data,           // Sanitized data
        validationResult: validationResult,              // Full validation info
        confidence: validationResult.confidence.overall,
        reviewReasons: validationResult.reviewReasons,
      });
      
      // Optionally notify user or admin
      await notifyManualReviewNeeded(jobId, validationResult.reviewReasons);
      
    } else {
      // Proceed with savings calculation using SAFE data
      const savings = await calculateSavings(validationResult.data);
      const redFlags = identifyRedFlags(validationResult.data);
      
      await storage.updateStatementAnalysisJob(jobId, {
        status: 'completed',
        currentStep: 'done',
        extractedData: validationResult.data,
        validationResult: validationResult,
        confidence: validationResult.confidence.overall,
        savings,
        redFlags,
      });
    }
    
  } catch (error) {
    console.error(`[Statement ${jobId}] Processing error:`, error);
    
    await storage.updateStatementAnalysisJob(jobId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      // Still provide empty but safe defaults
      extractedData: getDefaultSanitizedData(),
    });
  }
}

// ============================================
// STEP 3: Update your job status endpoint
// ============================================

/**
 * GET /api/statement-analysis/jobs/:id
 * 
 * Now returns additional fields for the frontend to handle
 */

app.get("/api/statement-analysis/jobs/:id", async (req, res) => {
  const jobId = parseInt(req.params.id);
  const job = await storage.getStatementAnalysisJob(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  // Build response with validation info
  const response = {
    id: job.id,
    status: job.status,
    currentStep: job.currentStep,
    
    // Always provide safe data (never undefined)
    extractedData: job.extractedData || getDefaultSanitizedData(),
    
    // Validation info for frontend
    confidence: job.confidence || 0,
    needsManualReview: job.status === 'needs_review',
    reviewReasons: job.reviewReasons || [],
    validationIssues: job.validationResult?.issues || [],
    
    // Only include if completed
    ...(job.status === 'completed' && {
      savings: job.savings,
      redFlags: job.redFlags,
    }),
    
    // Error info if failed
    ...(job.status === 'failed' && {
      errorMessage: job.errorMessage,
    }),
  };
  
  res.json(response);
});

// ============================================
// STEP 4: Add manual review submission endpoint
// ============================================

/**
 * POST /api/statement-analysis/jobs/:id/manual-review
 * 
 * Allows user to correct/confirm extracted data
 */

app.post("/api/statement-analysis/jobs/:id/manual-review", async (req, res) => {
  const jobId = parseInt(req.params.id);
  const job = await storage.getStatementAnalysisJob(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  if (job.status !== 'needs_review') {
    return res.status(400).json({ error: 'Job is not awaiting manual review' });
  }
  
  const { correctedData, userConfirmed } = req.body;
  
  // Validate the manually entered data too!
  const manualValidation = validateAndSanitize(correctedData);
  
  // If user explicitly confirmed, we trust their input more
  const finalData = userConfirmed 
    ? { ...manualValidation.data, ...correctedData }
    : manualValidation.data;
  
  // Calculate savings with the corrected data
  const savings = await calculateSavings(finalData);
  const redFlags = identifyRedFlags(finalData);
  
  await storage.updateStatementAnalysisJob(jobId, {
    status: 'completed',
    currentStep: 'done',
    extractedData: finalData,
    manuallyReviewed: true,
    reviewedAt: new Date(),
    savings,
    redFlags,
  });
  
  res.json({ 
    success: true, 
    extractedData: finalData,
    savings,
    redFlags,
  });
});

// ============================================
// HELPER: Get default sanitized data
// ============================================

function getDefaultSanitizedData() {
  return {
    merchantInfo: {
      name: 'Unknown Merchant',
      processor: 'Unknown Processor',
      statementDate: new Date().toISOString().split('T')[0],
      mid: '',
    },
    volumeData: {
      totalVolume: 0,
      totalTransactions: 0,
      avgTicket: 0,
      cardBreakdown: {
        visa: 0,
        mastercard: 0,
        discover: 0,
        amex: 0,
        other: 0,
      },
    },
    fees: [],
    effectiveRate: 0,
  };
}

// ============================================
// HELPER: Notify about manual review
// ============================================

async function notifyManualReviewNeeded(jobId: number, reasons: string[]) {
  // Implement your notification logic here
  // Could be: push notification, email, in-app alert, etc.
  console.log(`[Statement ${jobId}] Manual review needed:`, reasons);
}

// ============================================
// UPDATED SCHEMA (add to shared/schema.ts)
// ============================================

/*
Add these fields to your statementAnalysisJobs table:

  confidence: integer("confidence"),
  needsManualReview: boolean("needs_manual_review").default(false),
  reviewReasons: jsonb("review_reasons"),
  validationResult: jsonb("validation_result"),
  manuallyReviewed: boolean("manually_reviewed").default(false),
  reviewedAt: timestamp("reviewed_at"),

Migration SQL:

ALTER TABLE statement_analysis_jobs 
  ADD COLUMN confidence INTEGER,
  ADD COLUMN needs_manual_review BOOLEAN DEFAULT FALSE,
  ADD COLUMN review_reasons JSONB,
  ADD COLUMN validation_result JSONB,
  ADD COLUMN manually_reviewed BOOLEAN DEFAULT FALSE,
  ADD COLUMN reviewed_at TIMESTAMP;
*/
