/**
 * Proposal Generator Routes - Updated for Robust PDF Parsing
 * ==========================================================
 * 
 * This file shows how to integrate the robust PDF parser
 * into your existing routes.ts.
 * 
 * KEY CHANGES:
 * 1. Async job-based processing for large PDFs
 * 2. Progress polling endpoint
 * 3. Configurable timeouts
 * 4. Graceful error handling
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RobustPDFParser, createPDFParser, PDFParserConfig } from './services/robust-pdf-parser';
import { PDFJobQueue } from './services/pdf-job-queue';

// ============================================
// SETUP
// ============================================

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed'));
      return;
    }
    cb(null, true);
  },
});

// Create parser with custom config
const pdfParser = createPDFParser({
  perPageTimeout: 45000,     // 45 seconds per page
  maxTotalTimeout: 900000,   // 15 minutes total (increased from 120s!)
  maxRetries: 3,
  maxPages: 30,
  parallelPages: 2,
  skipFailedPages: true,
});

// Create job queue
const jobQueue = new PDFJobQueue(pdfParser, {
  maxConcurrent: 2,
  completedJobTTL: 3600000, // 1 hour
});

// ============================================
// EXTRACTION PROMPTS
// ============================================

const STATEMENT_EXTRACTION_PROMPT = `
Analyze this merchant statement page and extract the following information in JSON format:

{
  "merchantInfo": {
    "name": "Business name",
    "processor": "Current processor name",
    "mid": "Merchant ID if visible",
    "statementDate": "Statement date (YYYY-MM-DD)"
  },
  "volumeData": {
    "totalVolume": <number - total processing volume in dollars>,
    "totalTransactions": <number - total transaction count>,
    "avgTicket": <number - average ticket size>,
    "visaVolume": <number>,
    "mastercardVolume": <number>,
    "discoverVolume": <number>,
    "amexVolume": <number>
  },
  "fees": [
    {
      "type": "Fee name/description",
      "amount": <number>,
      "category": "interchange|assessment|markup|monthly|other"
    }
  ],
  "effectiveRate": <number - if calculable, as percentage e.g. 2.5>
}

Extract only what is clearly visible on this page. Use null for missing values.
Focus on accuracy over completeness.
`;

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/proposal/analyze-statement
 * 
 * Synchronous endpoint for small PDFs (< 5 pages)
 * For larger PDFs, use the async job endpoint instead
 */
router.post(
  '/api/proposal/analyze-statement',
  upload.single('statement'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    
    try {
      // Quick parse - suitable for small statements
      const result = await pdfParser.parse(
        filePath,
        STATEMENT_EXTRACTION_PROMPT
      );
      
      if (!result.success) {
        return res.status(422).json({
          error: 'Failed to parse statement',
          details: result.errors,
          warnings: result.warnings,
        });
      }
      
      res.json({
        success: true,
        data: result.data,
        pagesProcessed: result.pagesProcessed,
        pagesFailed: result.pagesFailed,
        warnings: result.warnings,
        processingTime: result.totalProcessingTime,
      });
      
    } catch (error) {
      console.error('Statement analysis error:', error);
      res.status(500).json({
        error: 'Failed to analyze statement',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      // Cleanup uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }
  }
);

/**
 * POST /api/proposal/analyze-statement/async
 * 
 * Async endpoint for large PDFs - returns job ID immediately
 * Poll /api/proposal/jobs/:id for progress
 */
router.post(
  '/api/proposal/analyze-statement/async',
  upload.single('statement'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const userId = (req as any).user?.id;
    
    try {
      // Move file to persistent location (job queue needs it)
      const persistentPath = path.join(
        os.tmpdir(),
        `proposal_${Date.now()}_${req.file.originalname}`
      );
      fs.renameSync(filePath, persistentPath);
      
      // Create async job
      const job = await jobQueue.addJob(
        persistentPath,
        STATEMENT_EXTRACTION_PROMPT,
        {
          userId,
          metadata: {
            originalFilename: req.file.originalname,
            fileSize: req.file.size,
          },
          config: {
            // Custom config from request body if provided
            maxPages: req.body.maxPages ? parseInt(req.body.maxPages) : undefined,
          },
        }
      );
      
      res.status(202).json({
        success: true,
        jobId: job.id,
        status: job.status,
        message: 'Statement analysis started',
        pollUrl: `/api/proposal/jobs/${job.id}`,
      });
      
    } catch (error) {
      console.error('Failed to create analysis job:', error);
      
      // Cleanup
      try {
        fs.unlinkSync(filePath);
      } catch {}
      
      res.status(500).json({
        error: 'Failed to start analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/proposal/jobs/:id
 * 
 * Get job status and progress
 */
router.get('/api/proposal/jobs/:id', async (req: Request, res: Response) => {
  const job = jobQueue.getJob(req.params.id);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  // Build response based on status
  const response: any = {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };
  
  if (job.progress) {
    response.progress = {
      percentComplete: job.progress.percentComplete,
      currentStep: job.progress.currentStep,
      currentPage: job.progress.currentPage,
      totalPages: job.progress.totalPages,
      pagesProcessed: job.progress.pagesProcessed,
      pagesFailed: job.progress.pagesFailed,
      estimatedTimeRemaining: job.progress.estimatedTimeRemaining,
    };
  }
  
  if (job.status === 'completed' && job.result) {
    response.result = {
      success: job.result.success,
      data: job.result.data,
      pagesProcessed: job.result.pagesProcessed,
      pagesFailed: job.result.pagesFailed,
      warnings: job.result.warnings,
      processingTime: job.result.totalProcessingTime,
    };
  }
  
  if (job.status === 'failed') {
    response.error = job.error;
  }
  
  if (job.status === 'queued') {
    const queueStatus = jobQueue.getStatus();
    response.queuePosition = queueStatus.queuePosition(job.id);
  }
  
  res.json(response);
});

/**
 * DELETE /api/proposal/jobs/:id
 * 
 * Cancel a queued job
 */
router.delete('/api/proposal/jobs/:id', async (req: Request, res: Response) => {
  const cancelled = jobQueue.cancelJob(req.params.id);
  
  if (!cancelled) {
    return res.status(400).json({
      error: 'Cannot cancel job',
      message: 'Job is not in queued status or does not exist',
    });
  }
  
  res.json({ success: true, message: 'Job cancelled' });
});

/**
 * GET /api/proposal/jobs
 * 
 * Get all jobs for current user
 */
router.get('/api/proposal/jobs', async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const jobs = jobQueue.getUserJobs(userId);
  
  res.json({
    jobs: jobs.map(job => ({
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      metadata: job.metadata,
      progress: job.progress ? {
        percentComplete: job.progress.percentComplete,
        currentStep: job.progress.currentStep,
      } : null,
    })),
  });
});

/**
 * GET /api/proposal/queue-status
 * 
 * Get overall queue status
 */
router.get('/api/proposal/queue-status', async (req: Request, res: Response) => {
  const status = jobQueue.getStatus();
  
  res.json({
    queuedJobs: status.queuedJobs,
    activeJobs: status.activeJobs,
    totalJobs: status.totalJobs,
  });
});

// ============================================
// SERVER-SENT EVENTS FOR REAL-TIME PROGRESS
// ============================================

/**
 * GET /api/proposal/jobs/:id/stream
 * 
 * Stream job progress via Server-Sent Events
 */
router.get('/api/proposal/jobs/:id/stream', async (req: Request, res: Response) => {
  const jobId = req.params.id;
  const job = jobQueue.getJob(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  // Send initial state
  res.write(`data: ${JSON.stringify({ type: 'status', status: job.status })}\n\n`);
  
  // If already complete, send result and close
  if (job.status === 'completed' || job.status === 'failed') {
    res.write(`data: ${JSON.stringify({
      type: job.status,
      result: job.result,
      error: job.error,
    })}\n\n`);
    res.end();
    return;
  }
  
  // Listen for progress events
  const onProgress = (updatedJob: any, progress: any) => {
    if (updatedJob.id === jobId) {
      res.write(`data: ${JSON.stringify({ type: 'progress', progress })}\n\n`);
    }
  };
  
  const onComplete = (updatedJob: any) => {
    if (updatedJob.id === jobId) {
      res.write(`data: ${JSON.stringify({
        type: 'completed',
        result: updatedJob.result,
      })}\n\n`);
      cleanup();
    }
  };
  
  const onFailed = (updatedJob: any) => {
    if (updatedJob.id === jobId) {
      res.write(`data: ${JSON.stringify({
        type: 'failed',
        error: updatedJob.error,
      })}\n\n`);
      cleanup();
    }
  };
  
  const cleanup = () => {
    jobQueue.off('jobProgress', onProgress);
    jobQueue.off('jobCompleted', onComplete);
    jobQueue.off('jobFailed', onFailed);
    res.end();
  };
  
  jobQueue.on('jobProgress', onProgress);
  jobQueue.on('jobCompleted', onComplete);
  jobQueue.on('jobFailed', onFailed);
  
  // Cleanup on client disconnect
  req.on('close', cleanup);
});

// ============================================
// MIGRATION NOTES
// ============================================

/**
 * MIGRATING FROM OLD IMPLEMENTATION:
 * 
 * 1. Replace your single-timeout parsing:
 * 
 *    BEFORE:
 *    const result = await parseStatementWithTimeout(pdfBuffer, 120000);
 * 
 *    AFTER:
 *    const result = await pdfParser.parse(pdfPath, EXTRACTION_PROMPT);
 * 
 * 2. For large PDFs, use async job endpoint instead:
 * 
 *    BEFORE:
 *    // Client waits up to 120s for response
 *    const result = await fetch('/api/proposal/analyze-statement', { ... });
 * 
 *    AFTER:
 *    // Client gets job ID immediately
 *    const { jobId } = await fetch('/api/proposal/analyze-statement/async', { ... });
 *    // Poll for results
 *    while (true) {
 *      const status = await fetch(`/api/proposal/jobs/${jobId}`);
 *      if (status.status === 'completed') break;
 *      await sleep(2000);
 *    }
 * 
 * 3. Add environment variables:
 * 
 *    PDF_PARSE_PER_PAGE_TIMEOUT=45000
 *    PDF_PARSE_MAX_TOTAL_TIMEOUT=900000
 *    PDF_PARSE_MAX_RETRIES=3
 *    PDF_PARSE_MAX_PAGES=30
 */

export default router;
