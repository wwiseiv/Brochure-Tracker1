/**
 * Robust PDF Parsing Service
 * ==========================
 * 
 * Handles large and complex PDFs with:
 * - Chunked processing (page by page)
 * - Configurable timeouts
 * - Retry logic with exponential backoff
 * - Progress tracking
 * - Graceful degradation for problematic PDFs
 * - Memory-efficient streaming
 * 
 * INSTALLATION:
 *   Copy to: server/services/robust-pdf-parser.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// ============================================
// CONFIGURATION
// ============================================

export interface PDFParserConfig {
  /** Timeout per page in milliseconds (default: 30000 = 30s) */
  perPageTimeout: number;
  
  /** Maximum total timeout in milliseconds (default: 600000 = 10 min) */
  maxTotalTimeout: number;
  
  /** Maximum retries per page (default: 3) */
  maxRetries: number;
  
  /** Base delay for exponential backoff in ms (default: 1000) */
  retryBaseDelay: number;
  
  /** Maximum pages to process (default: 50) */
  maxPages: number;
  
  /** DPI for PDF to image conversion (default: 150) */
  imageDPI: number;
  
  /** Image quality (1-100, default: 85) */
  imageQuality: number;
  
  /** Maximum image dimension in pixels (default: 2000) */
  maxImageDimension: number;
  
  /** Process pages in parallel (default: 2) */
  parallelPages: number;
  
  /** Skip pages that fail after retries (default: true) */
  skipFailedPages: boolean;
  
  /** Minimum successful pages to consider parse successful (default: 1) */
  minSuccessfulPages: number;
}

const DEFAULT_CONFIG: PDFParserConfig = {
  perPageTimeout: 30000,      // 30 seconds per page
  maxTotalTimeout: 600000,    // 10 minutes total
  maxRetries: 3,
  retryBaseDelay: 1000,
  maxPages: 50,
  imageDPI: 150,
  imageQuality: 85,
  maxImageDimension: 2000,
  parallelPages: 2,
  skipFailedPages: true,
  minSuccessfulPages: 1,
};

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ParseProgress {
  status: 'preparing' | 'converting' | 'analyzing' | 'completed' | 'failed';
  currentPage: number;
  totalPages: number;
  percentComplete: number;
  currentStep: string;
  pagesProcessed: number;
  pagesFailed: number;
  estimatedTimeRemaining: number | null;
  startedAt: Date;
  warnings: string[];
}

export interface PageResult {
  pageNumber: number;
  success: boolean;
  data: any;
  error?: string;
  retryCount: number;
  processingTime: number;
}

export interface ParseResult {
  success: boolean;
  data: any;
  pageResults: PageResult[];
  totalPages: number;
  pagesProcessed: number;
  pagesFailed: number;
  totalProcessingTime: number;
  warnings: string[];
  errors: string[];
}

export type ProgressCallback = (progress: ParseProgress) => void;

// ============================================
// PDF INFO EXTRACTION
// ============================================

interface PDFInfo {
  pageCount: number;
  fileSize: number;
  isEncrypted: boolean;
  hasImages: boolean;
  estimatedComplexity: 'low' | 'medium' | 'high';
}

/**
 * Get PDF metadata without fully processing
 */
async function getPDFInfo(pdfPath: string): Promise<PDFInfo> {
  const stats = fs.statSync(pdfPath);
  const fileSize = stats.size;
  
  try {
    // Use pdfinfo to get page count
    const { stdout } = await execAsync(`pdfinfo "${pdfPath}" 2>/dev/null || echo "Pages: 1"`);
    
    const pagesMatch = stdout.match(/Pages:\s*(\d+)/);
    const pageCount = pagesMatch ? parseInt(pagesMatch[1], 10) : 1;
    
    const encryptedMatch = stdout.match(/Encrypted:\s*yes/i);
    const isEncrypted = !!encryptedMatch;
    
    // Estimate complexity based on file size per page
    const bytesPerPage = fileSize / pageCount;
    let estimatedComplexity: 'low' | 'medium' | 'high' = 'low';
    
    if (bytesPerPage > 500000) {
      estimatedComplexity = 'high';
    } else if (bytesPerPage > 100000) {
      estimatedComplexity = 'medium';
    }
    
    return {
      pageCount,
      fileSize,
      isEncrypted,
      hasImages: bytesPerPage > 50000, // Rough heuristic
      estimatedComplexity,
    };
  } catch (error) {
    // Fallback if pdfinfo not available
    return {
      pageCount: 1,
      fileSize,
      isEncrypted: false,
      hasImages: false,
      estimatedComplexity: 'medium',
    };
  }
}

// ============================================
// PDF TO IMAGE CONVERSION
// ============================================

interface ConvertedPage {
  pageNumber: number;
  imagePath: string;
  width: number;
  height: number;
}

/**
 * Convert a single PDF page to image
 */
async function convertPageToImage(
  pdfPath: string,
  pageNumber: number,
  outputDir: string,
  config: PDFParserConfig
): Promise<ConvertedPage> {
  const outputPath = path.join(outputDir, `page_${pageNumber}.jpg`);
  
  // Use pdftoppm for conversion (part of poppler-utils)
  // Falls back to ImageMagick if pdftoppm not available
  try {
    // Try pdftoppm first (faster, better quality)
    await execAsync(
      `pdftoppm -jpeg -r ${config.imageDPI} -f ${pageNumber} -l ${pageNumber} ` +
      `-scale-to ${config.maxImageDimension} "${pdfPath}" "${outputDir}/page"`,
      { timeout: 30000 }
    );
    
    // pdftoppm names files differently
    const generatedFile = path.join(outputDir, `page-${pageNumber}.jpg`);
    if (fs.existsSync(generatedFile)) {
      fs.renameSync(generatedFile, outputPath);
    }
  } catch {
    // Fallback to ImageMagick convert
    await execAsync(
      `convert -density ${config.imageDPI} "${pdfPath}[${pageNumber - 1}]" ` +
      `-quality ${config.imageQuality} -resize ${config.maxImageDimension}x${config.maxImageDimension}\\> ` +
      `"${outputPath}"`,
      { timeout: 60000 }
    );
  }
  
  // Get image dimensions
  let width = 0, height = 0;
  try {
    const { stdout } = await execAsync(`identify -format "%w %h" "${outputPath}"`);
    const [w, h] = stdout.trim().split(' ').map(Number);
    width = w || 1000;
    height = h || 1400;
  } catch {
    width = 1000;
    height = 1400;
  }
  
  return {
    pageNumber,
    imagePath: outputPath,
    width,
    height,
  };
}

/**
 * Convert multiple PDF pages to images
 */
async function convertPDFToImages(
  pdfPath: string,
  pageNumbers: number[],
  outputDir: string,
  config: PDFParserConfig,
  onProgress?: (converted: number, total: number) => void
): Promise<ConvertedPage[]> {
  const results: ConvertedPage[] = [];
  
  // Process in batches for memory efficiency
  const batchSize = config.parallelPages;
  
  for (let i = 0; i < pageNumbers.length; i += batchSize) {
    const batch = pageNumbers.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(pageNum => 
        convertPageToImage(pdfPath, pageNum, outputDir, config)
          .catch(err => {
            console.warn(`Failed to convert page ${pageNum}:`, err.message);
            return null;
          })
      )
    );
    
    results.push(...batchResults.filter((r): r is ConvertedPage => r !== null));
    
    onProgress?.(results.length, pageNumbers.length);
  }
  
  return results;
}

// ============================================
// AI EXTRACTION WITH RETRY
// ============================================

/**
 * Extract data from a single page with retry logic
 */
async function extractPageDataWithRetry(
  anthropic: Anthropic,
  imagePath: string,
  pageNumber: number,
  totalPages: number,
  extractionPrompt: string,
  config: PDFParserConfig
): Promise<PageResult> {
  const startTime = Date.now();
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Read image as base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Determine media type
      const ext = path.extname(imagePath).toLowerCase();
      const mediaType = ext === '.png' ? 'image/png' : 'image/jpeg';
      
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Page ${pageNumber} timed out after ${config.perPageTimeout}ms`));
        }, config.perPageTimeout);
      });
      
      // Make API call with timeout
      const apiPromise = anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `This is page ${pageNumber} of ${totalPages}.\n\n${extractionPrompt}`,
            },
          ],
        }],
      });
      
      const response = await Promise.race([apiPromise, timeoutPromise]);
      
      // Parse response
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }
      
      // Try to parse as JSON
      let data: any;
      try {
        // Find JSON in response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0]);
        } else {
          data = { rawText: content.text };
        }
      } catch {
        data = { rawText: content.text };
      }
      
      return {
        pageNumber,
        success: true,
        data,
        retryCount: attempt,
        processingTime: Date.now() - startTime,
      };
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors
      if (lastError.message.includes('invalid_api_key') ||
          lastError.message.includes('rate_limit')) {
        break;
      }
      
      // Exponential backoff
      if (attempt < config.maxRetries) {
        const delay = config.retryBaseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return {
    pageNumber,
    success: false,
    data: null,
    error: lastError?.message || 'Unknown error',
    retryCount: config.maxRetries,
    processingTime: Date.now() - startTime,
  };
}

// ============================================
// MAIN PARSER CLASS
// ============================================

export class RobustPDFParser {
  private anthropic: Anthropic;
  private config: PDFParserConfig;
  
  constructor(
    anthropicClient: Anthropic,
    config: Partial<PDFParserConfig> = {}
  ) {
    this.anthropic = anthropicClient;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Parse a PDF file with progress tracking
   */
  async parse(
    pdfPath: string,
    extractionPrompt: string,
    onProgress?: ProgressCallback
  ): Promise<ParseResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Initialize progress
    const progress: ParseProgress = {
      status: 'preparing',
      currentPage: 0,
      totalPages: 0,
      percentComplete: 0,
      currentStep: 'Analyzing PDF...',
      pagesProcessed: 0,
      pagesFailed: 0,
      estimatedTimeRemaining: null,
      startedAt: new Date(),
      warnings: [],
    };
    
    const updateProgress = (updates: Partial<ParseProgress>) => {
      Object.assign(progress, updates);
      progress.warnings = warnings;
      onProgress?.(progress);
    };
    
    // Create temp directory for images
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-parse-'));
    
    try {
      // Step 1: Get PDF info
      updateProgress({ currentStep: 'Reading PDF metadata...' });
      const pdfInfo = await getPDFInfo(pdfPath);
      
      // Validate and adjust
      let pagesToProcess = Math.min(pdfInfo.pageCount, this.config.maxPages);
      
      if (pdfInfo.pageCount > this.config.maxPages) {
        warnings.push(`PDF has ${pdfInfo.pageCount} pages, processing first ${this.config.maxPages} only`);
      }
      
      if (pdfInfo.isEncrypted) {
        throw new Error('PDF is encrypted and cannot be processed');
      }
      
      // Adjust config based on complexity
      if (pdfInfo.estimatedComplexity === 'high') {
        warnings.push('PDF appears complex (high-resolution images), processing may be slower');
      }
      
      updateProgress({
        status: 'converting',
        totalPages: pagesToProcess,
        currentStep: 'Converting PDF pages to images...',
      });
      
      // Step 2: Convert pages to images
      const pageNumbers = Array.from({ length: pagesToProcess }, (_, i) => i + 1);
      
      const convertedPages = await convertPDFToImages(
        pdfPath,
        pageNumbers,
        tempDir,
        this.config,
        (converted, total) => {
          updateProgress({
            currentPage: converted,
            percentComplete: Math.round((converted / total) * 30), // First 30%
            currentStep: `Converting page ${converted} of ${total}...`,
          });
        }
      );
      
      if (convertedPages.length === 0) {
        throw new Error('Failed to convert any PDF pages to images');
      }
      
      if (convertedPages.length < pagesToProcess) {
        warnings.push(`Only ${convertedPages.length} of ${pagesToProcess} pages could be converted`);
      }
      
      // Step 3: Extract data from each page
      updateProgress({
        status: 'analyzing',
        currentStep: 'Extracting data with AI...',
        percentComplete: 30,
      });
      
      const pageResults: PageResult[] = [];
      const pageTimings: number[] = [];
      
      // Process pages with parallelism
      for (let i = 0; i < convertedPages.length; i += this.config.parallelPages) {
        // Check total timeout
        if (Date.now() - startTime > this.config.maxTotalTimeout) {
          warnings.push(`Total timeout reached after processing ${pageResults.length} pages`);
          break;
        }
        
        const batch = convertedPages.slice(i, i + this.config.parallelPages);
        
        const batchResults = await Promise.all(
          batch.map(page =>
            extractPageDataWithRetry(
              this.anthropic,
              page.imagePath,
              page.pageNumber,
              pdfInfo.pageCount,
              extractionPrompt,
              this.config
            )
          )
        );
        
        pageResults.push(...batchResults);
        
        // Track timing for estimates
        batchResults.forEach(r => {
          if (r.success) {
            pageTimings.push(r.processingTime);
          }
        });
        
        // Calculate progress and ETA
        const processed = pageResults.length;
        const remaining = convertedPages.length - processed;
        const avgTime = pageTimings.length > 0
          ? pageTimings.reduce((a, b) => a + b, 0) / pageTimings.length
          : 10000;
        
        updateProgress({
          currentPage: processed,
          pagesProcessed: pageResults.filter(r => r.success).length,
          pagesFailed: pageResults.filter(r => !r.success).length,
          percentComplete: 30 + Math.round((processed / convertedPages.length) * 70),
          currentStep: `Analyzing page ${processed} of ${convertedPages.length}...`,
          estimatedTimeRemaining: Math.round((remaining * avgTime) / 1000 / this.config.parallelPages),
        });
      }
      
      // Step 4: Merge results
      const successfulPages = pageResults.filter(r => r.success);
      const failedPages = pageResults.filter(r => !r.success);
      
      if (successfulPages.length < this.config.minSuccessfulPages) {
        throw new Error(
          `Only ${successfulPages.length} pages processed successfully, ` +
          `minimum ${this.config.minSuccessfulPages} required`
        );
      }
      
      // Merge data from all successful pages
      const mergedData = this.mergePageData(successfulPages);
      
      // Add failed page warnings
      failedPages.forEach(p => {
        errors.push(`Page ${p.pageNumber}: ${p.error}`);
      });
      
      updateProgress({
        status: 'completed',
        percentComplete: 100,
        currentStep: 'Processing complete',
        pagesProcessed: successfulPages.length,
        pagesFailed: failedPages.length,
      });
      
      return {
        success: true,
        data: mergedData,
        pageResults,
        totalPages: pdfInfo.pageCount,
        pagesProcessed: successfulPages.length,
        pagesFailed: failedPages.length,
        totalProcessingTime: Date.now() - startTime,
        warnings,
        errors,
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      updateProgress({
        status: 'failed',
        currentStep: `Error: ${errorMessage}`,
      });
      
      return {
        success: false,
        data: null,
        pageResults: [],
        totalPages: 0,
        pagesProcessed: 0,
        pagesFailed: 0,
        totalProcessingTime: Date.now() - startTime,
        warnings,
        errors: [errorMessage],
      };
      
    } finally {
      // Cleanup temp directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }
  
  /**
   * Merge data extracted from multiple pages
   */
  private mergePageData(pageResults: PageResult[]): any {
    // Sort by page number
    const sorted = [...pageResults].sort((a, b) => a.pageNumber - b.pageNumber);
    
    // Initialize merged structure
    const merged: any = {
      merchantInfo: {},
      volumeData: {},
      fees: [],
      rawText: [],
      pageData: [],
    };
    
    for (const page of sorted) {
      if (!page.data) continue;
      
      // Store raw page data
      merged.pageData.push({
        pageNumber: page.pageNumber,
        data: page.data,
      });
      
      // Merge merchant info (take first non-empty value)
      if (page.data.merchantInfo) {
        merged.merchantInfo = {
          ...page.data.merchantInfo,
          ...merged.merchantInfo,
        };
      }
      if (page.data.merchantName && !merged.merchantInfo.name) {
        merged.merchantInfo.name = page.data.merchantName;
      }
      if (page.data.processor && !merged.merchantInfo.processor) {
        merged.merchantInfo.processor = page.data.processor;
      }
      
      // Merge volume data (take first non-zero values)
      if (page.data.volumeData) {
        for (const [key, value] of Object.entries(page.data.volumeData)) {
          if (value && !merged.volumeData[key]) {
            merged.volumeData[key] = value;
          }
        }
      }
      if (page.data.totalVolume && !merged.volumeData.totalVolume) {
        merged.volumeData.totalVolume = page.data.totalVolume;
      }
      if (page.data.transactionCount && !merged.volumeData.totalTransactions) {
        merged.volumeData.totalTransactions = page.data.transactionCount;
      }
      
      // Merge fees (accumulate all)
      if (Array.isArray(page.data.fees)) {
        merged.fees.push(...page.data.fees);
      }
      
      // Accumulate raw text
      if (page.data.rawText) {
        merged.rawText.push(page.data.rawText);
      }
    }
    
    // Deduplicate fees
    merged.fees = this.deduplicateFees(merged.fees);
    
    // Join raw text
    merged.rawText = merged.rawText.join('\n\n---\n\n');
    
    return merged;
  }
  
  /**
   * Remove duplicate fees
   */
  private deduplicateFees(fees: any[]): any[] {
    const seen = new Map<string, any>();
    
    for (const fee of fees) {
      if (!fee || !fee.type) continue;
      
      const key = `${fee.type.toLowerCase()}-${fee.amount || 0}`;
      
      if (!seen.has(key)) {
        seen.set(key, fee);
      }
    }
    
    return Array.from(seen.values());
  }
}

// ============================================
// CONVENIENCE FUNCTION
// ============================================

/**
 * Create a parser with environment-based configuration
 */
export function createPDFParser(config?: Partial<PDFParserConfig>): RobustPDFParser {
  const anthropic = new Anthropic({
    baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  });
  
  return new RobustPDFParser(anthropic, config);
}

export default RobustPDFParser;
