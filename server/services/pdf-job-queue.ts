/**
 * PDF Processing Job Queue
 * ========================
 * 
 * Handles long-running PDF parsing jobs in the background with:
 * - Job queuing and status tracking
 * - Progress updates via database
 * - Automatic cleanup of completed jobs
 * - Concurrent job limiting
 */

import { RobustPDFParser, PDFParserConfig, ParseProgress, ParseResult } from './robust-pdf-parser';
import { EventEmitter } from 'events';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PDFJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  pdfPath: string;
  extractionPrompt: string;
  config: Partial<PDFParserConfig>;
  progress: ParseProgress | null;
  result: ParseResult | null;
  error: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  userId?: number;
  metadata?: Record<string, any>;
}

export interface QueueConfig {
  /** Maximum concurrent jobs (default: 2) */
  maxConcurrent: number;
  
  /** Time to keep completed jobs in memory (default: 1 hour) */
  completedJobTTL: number;
  
  /** Maximum queue size (default: 100) */
  maxQueueSize: number;
}

const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxConcurrent: 2,
  completedJobTTL: 3600000, // 1 hour
  maxQueueSize: 100,
};

// ============================================
// JOB QUEUE CLASS
// ============================================

export class PDFJobQueue extends EventEmitter {
  private jobs: Map<string, PDFJob> = new Map();
  private queue: string[] = [];
  private activeJobs: Set<string> = new Set();
  private parser: RobustPDFParser;
  private config: QueueConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(
    parser: RobustPDFParser,
    config: Partial<QueueConfig> = {}
  ) {
    super();
    this.parser = parser;
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
    
    // Start cleanup interval
    this.startCleanup();
  }
  
  /**
   * Add a new job to the queue
   */
  async addJob(
    pdfPath: string,
    extractionPrompt: string,
    options: {
      config?: Partial<PDFParserConfig>;
      userId?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<PDFJob> {
    // Check queue size
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error('Job queue is full, please try again later');
    }
    
    // Generate unique ID
    const id = `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create job
    const job: PDFJob = {
      id,
      status: 'queued',
      pdfPath,
      extractionPrompt,
      config: options.config || {},
      progress: null,
      result: null,
      error: null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      userId: options.userId,
      metadata: options.metadata,
    };
    
    this.jobs.set(id, job);
    this.queue.push(id);
    
    this.emit('jobAdded', job);
    
    // Try to process queue
    this.processQueue();
    
    return job;
  }
  
  /**
   * Get job by ID
   */
  getJob(id: string): PDFJob | undefined {
    return this.jobs.get(id);
  }
  
  /**
   * Get all jobs for a user
   */
  getUserJobs(userId: number): PDFJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  /**
   * Cancel a queued job
   */
  cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    
    if (!job) return false;
    
    // Can only cancel queued jobs
    if (job.status !== 'queued') return false;
    
    // Remove from queue
    const queueIndex = this.queue.indexOf(id);
    if (queueIndex > -1) {
      this.queue.splice(queueIndex, 1);
    }
    
    // Update status
    job.status = 'failed';
    job.error = 'Cancelled by user';
    job.completedAt = new Date();
    
    this.emit('jobCancelled', job);
    
    return true;
  }
  
  /**
   * Get queue status
   */
  getStatus(): {
    queuedJobs: number;
    activeJobs: number;
    totalJobs: number;
    queuePosition: (id: string) => number;
  } {
    return {
      queuedJobs: this.queue.length,
      activeJobs: this.activeJobs.size,
      totalJobs: this.jobs.size,
      queuePosition: (id: string) => {
        const index = this.queue.indexOf(id);
        return index === -1 ? -1 : index + 1;
      },
    };
  }
  
  /**
   * Process jobs from queue
   */
  private async processQueue(): Promise<void> {
    // Check if we can process more jobs
    while (
      this.activeJobs.size < this.config.maxConcurrent &&
      this.queue.length > 0
    ) {
      const jobId = this.queue.shift();
      if (!jobId) break;
      
      const job = this.jobs.get(jobId);
      if (!job) continue;
      
      // Start processing
      this.activeJobs.add(jobId);
      this.processJob(job).catch(err => {
        console.error(`Job ${jobId} failed:`, err);
      });
    }
  }
  
  /**
   * Process a single job
   */
  private async processJob(job: PDFJob): Promise<void> {
    try {
      // Update status
      job.status = 'processing';
      job.startedAt = new Date();
      
      this.emit('jobStarted', job);
      
      // Parse PDF with progress tracking
      const result = await this.parser.parse(
        job.pdfPath,
        job.extractionPrompt,
        (progress) => {
          job.progress = progress;
          this.emit('jobProgress', job, progress);
        }
      );
      
      // Update job with result
      job.status = result.success ? 'completed' : 'failed';
      job.result = result;
      job.error = result.success ? null : result.errors.join('; ');
      job.completedAt = new Date();
      
      this.emit(result.success ? 'jobCompleted' : 'jobFailed', job);
      
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();
      
      this.emit('jobFailed', job);
      
    } finally {
      // Remove from active jobs
      this.activeJobs.delete(job.id);
      
      // Process next in queue
      this.processQueue();
    }
  }
  
  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [id, job] of this.jobs) {
        // Remove completed/failed jobs older than TTL
        if (
          (job.status === 'completed' || job.status === 'failed') &&
          job.completedAt &&
          now - job.completedAt.getTime() > this.config.completedJobTTL
        ) {
          this.jobs.delete(id);
        }
      }
    }, 60000); // Check every minute
  }
  
  /**
   * Stop the queue
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ============================================
// DATABASE-BACKED JOB STORAGE (Optional)
// ============================================

/**
 * Interface for database job storage
 */
export interface JobStorage {
  saveJob(job: PDFJob): Promise<void>;
  getJob(id: string): Promise<PDFJob | null>;
  getUserJobs(userId: number): Promise<PDFJob[]>;
  updateJobProgress(id: string, progress: ParseProgress): Promise<void>;
  updateJobResult(id: string, result: ParseResult): Promise<void>;
  deleteJob(id: string): Promise<void>;
}

/**
 * Create storage adapter for Drizzle
 */
export function createDrizzleJobStorage(db: any, table: any): JobStorage {
  return {
    async saveJob(job: PDFJob) {
      await db.insert(table).values({
        id: job.id,
        status: job.status,
        pdfPath: job.pdfPath,
        extractionPrompt: job.extractionPrompt,
        config: JSON.stringify(job.config),
        progress: job.progress ? JSON.stringify(job.progress) : null,
        result: job.result ? JSON.stringify(job.result) : null,
        error: job.error,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        userId: job.userId,
        metadata: job.metadata ? JSON.stringify(job.metadata) : null,
      });
    },
    
    async getJob(id: string) {
      const rows = await db.select().from(table).where({ id }).limit(1);
      if (rows.length === 0) return null;
      
      const row = rows[0];
      return {
        ...row,
        config: JSON.parse(row.config || '{}'),
        progress: row.progress ? JSON.parse(row.progress) : null,
        result: row.result ? JSON.parse(row.result) : null,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      };
    },
    
    async getUserJobs(userId: number) {
      const rows = await db.select().from(table).where({ userId });
      return rows.map((row: any) => ({
        ...row,
        config: JSON.parse(row.config || '{}'),
        progress: row.progress ? JSON.parse(row.progress) : null,
        result: row.result ? JSON.parse(row.result) : null,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      }));
    },
    
    async updateJobProgress(id: string, progress: ParseProgress) {
      await db.update(table).set({
        progress: JSON.stringify(progress),
        status: progress.status === 'failed' ? 'failed' : 'processing',
      }).where({ id });
    },
    
    async updateJobResult(id: string, result: ParseResult) {
      await db.update(table).set({
        result: JSON.stringify(result),
        status: result.success ? 'completed' : 'failed',
        error: result.success ? null : result.errors.join('; '),
        completedAt: new Date(),
      }).where({ id });
    },
    
    async deleteJob(id: string) {
      await db.delete(table).where({ id });
    },
  };
}

export default PDFJobQueue;
