import { storage } from "../storage";
import { parseProposalFromStorage } from "../proposal-generator";
import { extractStatementFromFiles } from "../proposal-intelligence/services/statement-extractor";
import { 
  classifyAndRouteDocuments, 
  extractPricingSpreadsheet,
  ClassifiedDocument,
  PricingSpreadsheetData
} from "./document-classifier";
import webpush from "web-push";
import { createPDFParser, ParseProgress } from "./robust-pdf-parser";
import Anthropic from "@anthropic-ai/sdk";
import { ObjectStorageService } from "../replit_integrations/object_storage/objectStorage";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// File size threshold for using robust parser (5MB)
const ROBUST_PARSER_SIZE_THRESHOLD = 5 * 1024 * 1024;

interface MergedExtractionResult {
  merchantName?: string;
  proposalType: "dual_pricing" | "interchange_plus" | "both";
  
  currentState: {
    totalVolume: number;
    totalTransactions: number;
    avgTicket: number;
    cardBreakdown: {
      visa: { volume: number; transactions: number; ratePercent?: number; perTxFee?: number; totalCost?: number };
      mastercard: { volume: number; transactions: number; ratePercent?: number; perTxFee?: number; totalCost?: number };
      discover: { volume: number; transactions: number; ratePercent?: number; perTxFee?: number; totalCost?: number };
      amex: { volume: number; transactions: number; ratePercent?: number; perTxFee?: number; totalCost?: number };
    };
    fees: {
      interchange?: number;
      assessments?: number;
      processorMarkup?: number;
      monthlyFees?: number;
      pciFees?: number;
      otherFees?: number;
      totalFees: number;
    };
    effectiveRatePercent: number;
  };

  optionInterchangePlus?: {
    discountRatePercent: number;
    perTransactionFee: number;
    monthlyFees?: number;
    totalMonthlyCost: number;
    monthlySavings: number;
    annualSavings: number;
  };

  optionDualPricing?: {
    merchantDiscountRate: number;
    perTransactionFee: number;
    monthlyProgramFee: number;
    totalMonthlyCost: number;
    monthlySavings: number;
    annualSavings: number;
  };

  documentTypes: string[];
  extractionWarnings: string[];
  extractionStatus: "success" | "partial" | "needs_review";
  confidence: number;
}

export async function processProposalParseJob(jobId: number): Promise<void> {
  console.log("[ProposalParse] Starting enhanced job:", jobId);

  try {
    const job = await storage.getProposalParseJob(jobId);
    if (!job) {
      console.error("[ProposalParse] Job not found:", jobId);
      return;
    }

    await storage.updateProposalParseJob(jobId, {
      status: "processing",
      startedAt: new Date(),
      progress: 10,
      progressMessage: "Analyzing documents...",
    });

    const files = (job.filePaths || []).map((path, i) => ({
      path,
      mimeType: job.fileMimeTypes?.[i] || "application/pdf",
      name: job.fileNames?.[i] || `file-${i}.pdf`,
    }));

    if (files.length === 0) {
      throw new Error("No files to parse");
    }

    console.log("[ProposalParse] Processing", files.length, "files for job:", jobId);

    await storage.updateProposalParseJob(jobId, {
      progress: 20,
      progressMessage: "Classifying document types...",
    });

    const { classifications, hasStatement, hasPricingSpreadsheet, hasProposal } = 
      await classifyAndRouteDocuments(files);

    console.log("[ProposalParse] Classifications:", classifications.map(c => `${c.name}: ${c.documentType}`));

    let result: MergedExtractionResult;

    if (hasPricingSpreadsheet) {
      await storage.updateProposalParseJob(jobId, {
        progress: 40,
        progressMessage: "Extracting pricing data from spreadsheet...",
      });

      const pricingFiles = classifications.filter(c => c.documentType.startsWith("pricing_spreadsheet"));
      const statementFiles = classifications.filter(c => c.documentType === "processing_statement");
      
      result = await extractAndMergePricingData(pricingFiles, statementFiles, files);
    } else if (hasStatement) {
      await storage.updateProposalParseJob(jobId, {
        progress: 40,
        progressMessage: "Extracting statement data...",
      });

      const statementFileData = classifications
        .filter(c => c.documentType === "processing_statement")
        .map(c => files.find(f => f.path === c.path)!)
        .filter(Boolean);

      // Check if any PDF is large enough to need robust parsing
      const objectStorage = new ObjectStorageService();
      let useRobustParser = false;
      let largePdfPath = "";
      
      for (const file of statementFileData) {
        if (file.mimeType === "application/pdf" || file.name.endsWith(".pdf")) {
          const needsRobust = await shouldUseRobustParser(file.path, objectStorage);
          if (needsRobust) {
            useRobustParser = true;
            largePdfPath = file.path;
            console.log(`[ProposalParse] Large PDF detected (${file.name}), using robust parser`);
            break;
          }
        }
      }

      if (useRobustParser) {
        await storage.updateProposalParseJob(jobId, {
          progress: 45,
          progressMessage: "Processing large document with enhanced parser...",
        });
        result = await processLargePDFWithRobustParser(largePdfPath, jobId, objectStorage);
      } else {
        result = await extractStatementOnly(statementFileData);
      }
    } else if (hasProposal) {
      await storage.updateProposalParseJob(jobId, {
        progress: 40,
        progressMessage: "Parsing proposal document...",
      });

      result = await extractProposalPdf(files);
    } else {
      await storage.updateProposalParseJob(jobId, {
        progress: 40,
        progressMessage: "Attempting intelligent extraction...",
      });

      result = await extractProposalPdf(files);
      result.extractionWarnings.push("Document type could not be determined. Using general extraction.");
    }

    await storage.updateProposalParseJob(jobId, {
      progress: 80,
      progressMessage: "Finalizing results...",
    });

    const extractionWarnings = [...result.extractionWarnings];
    classifications.forEach(c => {
      if (c.confidence < 70) {
        extractionWarnings.push(`${c.name}: Low classification confidence (${c.confidence}%)`);
      }
    });

    const parsedData = {
      ...result,
      classifications: classifications.map(c => ({
        name: c.name,
        type: c.documentType,
        confidence: c.confidence,
        summary: c.summary
      }))
    };

    await storage.updateProposalParseJob(jobId, {
      status: "completed",
      completedAt: new Date(),
      parsedData,
      extractionWarnings: extractionWarnings.length > 0 ? extractionWarnings : null,
      progress: 100,
      progressMessage: "Complete",
    });

    console.log("[ProposalParse] Job completed:", jobId);

    const savingsMessage = result.optionDualPricing?.annualSavings 
      ? `$${result.optionDualPricing.annualSavings.toLocaleString()}/year potential savings`
      : result.optionInterchangePlus?.annualSavings
        ? `$${result.optionInterchangePlus.annualSavings.toLocaleString()}/year potential savings`
        : "Document parsing complete";

    await sendPushNotification(job.agentId, jobId, "success", savingsMessage);

    await storage.updateProposalParseJob(jobId, {
      notificationSent: true,
      notificationSentAt: new Date(),
    });
  } catch (error: any) {
    console.error("[ProposalParse] Job failed:", jobId, error);

    await storage.updateProposalParseJob(jobId, {
      status: "failed",
      errorMessage: error.message || "Unknown error occurred",
      completedAt: new Date(),
      progressMessage: "Failed",
    });

    const job = await storage.getProposalParseJob(jobId);
    if (job) {
      await sendPushNotification(job.agentId, jobId, "error", "Document parsing failed");
    }
  }
}

async function extractAndMergePricingData(
  pricingClassifications: ClassifiedDocument[],
  statementClassifications: ClassifiedDocument[],
  allFiles: Array<{ path: string; mimeType: string; name: string }>
): Promise<MergedExtractionResult> {
  const warnings: string[] = [];
  let pricingData: PricingSpreadsheetData | null = null;
  let statementData: any = null;

  for (const classification of pricingClassifications) {
    const file = allFiles.find(f => f.path === classification.path);
    if (file) {
      try {
        pricingData = await extractPricingSpreadsheet(file);
        console.log("[ProposalParse] Extracted pricing data:", pricingData.proposalType);
        break;
      } catch (e: any) {
        warnings.push(`Failed to extract from ${file.name}: ${e.message}`);
      }
    }
  }

  if (statementClassifications.length > 0) {
    const statementFiles = statementClassifications
      .map(c => allFiles.find(f => f.path === c.path)!)
      .filter(Boolean);
    
    if (statementFiles.length > 0) {
      try {
        statementData = await extractStatementFromFiles(statementFiles);
        console.log("[ProposalParse] Extracted statement data, confidence:", statementData.confidence);
      } catch (e: any) {
        warnings.push(`Failed to extract statement: ${e.message}`);
      }
    }
  }

  // If pricing extraction failed but we have statement data, use that as fallback
  if (!pricingData && !statementData) {
    throw new Error("Could not extract data from any uploaded documents");
  }

  if (!pricingData) {
    // Fall back to statement-only extraction
    warnings.push("Pricing spreadsheet extraction failed. Using statement data only.");
    return await extractStatementOnly(
      statementClassifications.map(c => allFiles.find(f => f.path === c.path)!).filter(Boolean)
    );
  }

  let proposalType: "dual_pricing" | "interchange_plus" | "both" = "interchange_plus";
  if (pricingData.dualPricing && pricingData.interchangePlus) {
    proposalType = "both";
  } else if (pricingData.dualPricing) {
    proposalType = "dual_pricing";
  }

  const totalVolume = pricingData.currentState.totalVolume || statementData?.totalVolume || 0;
  const totalTransactions = pricingData.currentState.totalTransactions || statementData?.totalTransactions || 0;
  const avgTicket = pricingData.currentState.avgTicket || (totalVolume && totalTransactions ? totalVolume / totalTransactions : 0);
  const totalFees = pricingData.currentState.totalFees || statementData?.totalFees || 0;

  const result: MergedExtractionResult = {
    merchantName: pricingData.merchantName || statementData?.merchantName,
    proposalType,
    currentState: {
      totalVolume,
      totalTransactions,
      avgTicket,
      cardBreakdown: {
        visa: pricingData.currentState.cardBreakdown?.visa || statementData?.cardMix?.visa || { volume: 0, transactions: 0 },
        mastercard: pricingData.currentState.cardBreakdown?.mastercard || statementData?.cardMix?.mastercard || { volume: 0, transactions: 0 },
        discover: pricingData.currentState.cardBreakdown?.discover || statementData?.cardMix?.discover || { volume: 0, transactions: 0 },
        amex: pricingData.currentState.cardBreakdown?.amex || statementData?.cardMix?.amex || { volume: 0, transactions: 0 },
      },
      fees: {
        interchange: pricingData.currentState.fees?.interchange || statementData?.fees?.interchange,
        assessments: pricingData.currentState.fees?.assessments || statementData?.fees?.assessments,
        processorMarkup: pricingData.currentState.fees?.processorMarkup || statementData?.fees?.processorMarkup,
        monthlyFees: pricingData.currentState.fees?.monthlyFees || statementData?.fees?.monthlyFees,
        pciFees: pricingData.currentState.fees?.pciFees || statementData?.fees?.pciFees,
        otherFees: pricingData.currentState.fees?.otherFees || statementData?.fees?.otherFees,
        totalFees,
      },
      effectiveRatePercent: pricingData.currentState.effectiveRate || (totalVolume > 0 ? (totalFees / totalVolume) * 100 : 0),
    },
    documentTypes: [
      ...pricingClassifications.map(c => c.documentType),
      ...statementClassifications.map(c => c.documentType)
    ],
    extractionWarnings: [...warnings, ...(pricingData.extractionNotes || [])],
    extractionStatus: pricingData.confidence > 70 ? "success" : "partial",
    confidence: pricingData.confidence,
  };

  if (pricingData.interchangePlus) {
    result.optionInterchangePlus = {
      discountRatePercent: pricingData.interchangePlus.discountRate,
      perTransactionFee: pricingData.interchangePlus.perTransactionFee,
      monthlyFees: pricingData.interchangePlus.monthlyFees,
      totalMonthlyCost: pricingData.interchangePlus.totalMonthlyCost,
      monthlySavings: pricingData.interchangePlus.monthlySavings,
      annualSavings: pricingData.interchangePlus.annualSavings,
    };
  }

  if (pricingData.dualPricing) {
    result.optionDualPricing = {
      merchantDiscountRate: pricingData.dualPricing.merchantRate,
      perTransactionFee: pricingData.dualPricing.perTransactionFee,
      monthlyProgramFee: pricingData.dualPricing.monthlyProgramFee,
      totalMonthlyCost: pricingData.dualPricing.totalMonthlyCost,
      monthlySavings: pricingData.dualPricing.monthlySavings,
      annualSavings: pricingData.dualPricing.annualSavings,
    };
  }

  return result;
}

async function extractStatementOnly(
  files: Array<{ path: string; mimeType: string; name: string }>
): Promise<MergedExtractionResult> {
  const statementData = await extractStatementFromFiles(files);

  const totalVolume = statementData.totalVolume || 0;
  const totalTransactions = statementData.totalTransactions || 0;
  const totalFees = statementData.totalFees || 0;

  return {
    merchantName: statementData.merchantName,
    proposalType: "interchange_plus",
    currentState: {
      totalVolume,
      totalTransactions,
      avgTicket: totalTransactions > 0 ? totalVolume / totalTransactions : 0,
      cardBreakdown: {
        visa: statementData.cardMix?.visa || { volume: 0, transactions: 0 },
        mastercard: statementData.cardMix?.mastercard || { volume: 0, transactions: 0 },
        discover: statementData.cardMix?.discover || { volume: 0, transactions: 0 },
        amex: statementData.cardMix?.amex || { volume: 0, transactions: 0 },
      },
      fees: {
        interchange: statementData.fees?.interchange,
        assessments: statementData.fees?.assessments,
        monthlyFees: statementData.fees?.monthlyFees,
        pciFees: statementData.fees?.pciFees,
        otherFees: statementData.fees?.otherFees,
        totalFees,
      },
      effectiveRatePercent: totalVolume > 0 ? (totalFees / totalVolume) * 100 : 0,
    },
    documentTypes: ["processing_statement"],
    extractionWarnings: statementData.extractionNotes || [],
    extractionStatus: statementData.confidence > 70 ? "success" : "partial",
    confidence: statementData.confidence,
  };
}

async function extractProposalPdf(
  files: Array<{ path: string; mimeType: string; name: string }>
): Promise<MergedExtractionResult> {
  const parsedResult = await parseProposalFromStorage(files);

  return {
    merchantName: parsedResult.merchantName,
    proposalType: parsedResult.proposalType as "dual_pricing" | "interchange_plus" | "both",
    currentState: {
      totalVolume: parsedResult.currentState?.totalVolume || 0,
      totalTransactions: parsedResult.currentState?.totalTransactions || 0,
      avgTicket: parsedResult.currentState?.avgTicket || 0,
      cardBreakdown: parsedResult.currentState?.cardBreakdown || {
        visa: { volume: 0, transactions: 0 },
        mastercard: { volume: 0, transactions: 0 },
        discover: { volume: 0, transactions: 0 },
        amex: { volume: 0, transactions: 0 },
      },
      fees: {
        totalFees: parsedResult.currentState?.totalMonthlyCost || 0,
      },
      effectiveRatePercent: parsedResult.currentState?.effectiveRatePercent || 0,
    },
    optionInterchangePlus: parsedResult.optionInterchangePlus ? {
      discountRatePercent: parsedResult.optionInterchangePlus.discountRatePercent,
      perTransactionFee: parsedResult.optionInterchangePlus.perTransactionFee,
      totalMonthlyCost: parsedResult.optionInterchangePlus.totalMonthlyCost,
      monthlySavings: parsedResult.optionInterchangePlus.monthlySavings,
      annualSavings: parsedResult.optionInterchangePlus.annualSavings,
    } : undefined,
    optionDualPricing: parsedResult.optionDualPricing ? {
      merchantDiscountRate: parsedResult.optionDualPricing.merchantDiscountRate,
      perTransactionFee: parsedResult.optionDualPricing.perTransactionFee,
      monthlyProgramFee: parsedResult.optionDualPricing.monthlyProgramFee,
      totalMonthlyCost: parsedResult.optionDualPricing.totalMonthlyCost,
      monthlySavings: parsedResult.optionDualPricing.monthlySavings,
      annualSavings: parsedResult.optionDualPricing.annualSavings,
    } : undefined,
    documentTypes: ["proposal_pdf"],
    extractionWarnings: parsedResult.extractionWarnings || [],
    extractionStatus: parsedResult.extractionStatus || "success",
    confidence: 80,
  };
}

/**
 * Process a large PDF using the robust parser with chunked processing
 * This is used for PDFs over the size threshold or when standard parsing times out
 */
async function processLargePDFWithRobustParser(
  filePath: string,
  jobId: number,
  objectStorage: ObjectStorageService
): Promise<MergedExtractionResult> {
  const anthropicApiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  const anthropicBaseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  
  if (!anthropicApiKey || !anthropicBaseUrl) {
    throw new Error("Claude API not configured for robust PDF parsing");
  }

  const anthropic = new Anthropic({
    apiKey: anthropicApiKey,
    baseURL: anthropicBaseUrl,
  });

  // Create robust parser with optimized settings for statements
  const parser = createPDFParser({
    perPageTimeout: 45000,      // 45 seconds per page
    maxTotalTimeout: 900000,    // 15 minutes total
    maxRetries: 3,
    maxPages: 30,               // Most statements are under 30 pages
    parallelPages: 1,           // Sequential for stability
    skipFailedPages: true,
  });

  // Download file to temp location
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'robust-parse-'));
  const tempPdfPath = path.join(tempDir, 'document.pdf');
  
  try {
    // Download from object storage using GCS File object
    const file = await objectStorage.getObjectEntityFile(filePath);
    const [fileBuffer] = await file.download();
    fs.writeFileSync(tempPdfPath, fileBuffer);
    console.log(`[RobustParse] Downloaded PDF to temp: ${tempPdfPath}, size: ${fileBuffer.length}`);

    const extractionPrompt = `Extract all merchant processing statement data from this page.
Return ONLY valid JSON with this structure:
{
  "merchantName": "Business name",
  "processorName": "Processor/ISO name",
  "statementPeriod": "Statement period dates",
  "totalVolume": 0,
  "totalTransactions": 0,
  "totalFees": 0,
  "merchantType": "business type",
  "fees": {
    "interchange": 0, "assessments": 0, "monthlyFees": 0, 
    "pciFees": 0, "otherFees": 0
  },
  "cardMix": {
    "visa": { "volume": 0, "transactions": 0 },
    "mastercard": { "volume": 0, "transactions": 0 },
    "discover": { "volume": 0, "transactions": 0 },
    "amex": { "volume": 0, "transactions": 0 }
  },
  "pageType": "summary|detail|fee_breakdown|other"
}
Include only data visible on this specific page. Numbers should be positive without $ or commas.`;

    // Process with progress updates
    const result = await parser.parse(
      tempPdfPath,
      extractionPrompt,
      async (progress: ParseProgress) => {
        // Update job progress
        const percentComplete = Math.round(40 + (progress.percentComplete * 0.5)); // 40-90% range
        await storage.updateProposalParseJob(jobId, {
          progress: percentComplete,
          progressMessage: progress.currentStep,
        });
      }
    );

    console.log(`[RobustParse] Completed: ${result.pageResults.length} pages, success: ${result.success}`);

    // Merge page results into unified extraction
    const mergedData = mergePageResults(result.pageResults);
    
    return {
      merchantName: mergedData.merchantName,
      proposalType: "interchange_plus",
      currentState: {
        totalVolume: mergedData.totalVolume || 0,
        totalTransactions: mergedData.totalTransactions || 0,
        avgTicket: mergedData.totalTransactions > 0 
          ? mergedData.totalVolume / mergedData.totalTransactions : 0,
        cardBreakdown: mergedData.cardMix || {
          visa: { volume: 0, transactions: 0 },
          mastercard: { volume: 0, transactions: 0 },
          discover: { volume: 0, transactions: 0 },
          amex: { volume: 0, transactions: 0 },
        },
        fees: mergedData.fees || { totalFees: mergedData.totalFees || 0 },
        effectiveRatePercent: mergedData.totalVolume > 0 
          ? ((mergedData.totalFees || 0) / mergedData.totalVolume) * 100 : 0,
      },
      documentTypes: ["processing_statement"],
      extractionWarnings: [...result.warnings, ...(result.errors || [])],
      extractionStatus: result.success ? "success" : "partial",
      confidence: result.success ? 85 : 60,
    };

  } finally {
    // Cleanup temp files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn("[RobustParse] Failed to cleanup temp dir:", e);
    }
  }
}

/**
 * Merge data extracted from multiple pages into a unified result
 */
function mergePageResults(pageResults: any[]): any {
  const merged: any = {
    merchantName: null,
    processorName: null,
    totalVolume: 0,
    totalTransactions: 0,
    totalFees: 0,
    fees: {},
    cardMix: {
      visa: { volume: 0, transactions: 0 },
      mastercard: { volume: 0, transactions: 0 },
      discover: { volume: 0, transactions: 0 },
      amex: { volume: 0, transactions: 0 },
    },
  };

  // Track which values we've found to avoid double-counting
  let foundSummaryPage = false;

  for (const page of pageResults) {
    if (!page.success || !page.data) continue;
    
    const data = page.data;
    
    // Take merchant info from first page that has it
    if (!merged.merchantName && data.merchantName) {
      merged.merchantName = data.merchantName;
    }
    if (!merged.processorName && data.processorName) {
      merged.processorName = data.processorName;
    }
    if (!merged.statementPeriod && data.statementPeriod) {
      merged.statementPeriod = data.statementPeriod;
    }
    if (!merged.merchantType && data.merchantType) {
      merged.merchantType = data.merchantType;
    }

    // For summary pages, use their totals directly (only from first summary found)
    if (data.pageType === 'summary' && !foundSummaryPage) {
      if (data.totalVolume > 0) merged.totalVolume = data.totalVolume;
      if (data.totalTransactions > 0) merged.totalTransactions = data.totalTransactions;
      if (data.totalFees > 0) merged.totalFees = data.totalFees;
      foundSummaryPage = true; // Mark that we've used a summary page
    }

    // Merge fee breakdowns
    if (data.fees) {
      for (const [key, value] of Object.entries(data.fees)) {
        if (typeof value === 'number' && value > 0) {
          if (!merged.fees[key] || merged.fees[key] < value) {
            merged.fees[key] = value;
          }
        }
      }
    }

    // Merge card mix (take highest values)
    if (data.cardMix) {
      for (const cardType of ['visa', 'mastercard', 'discover', 'amex']) {
        const cardData = data.cardMix[cardType];
        if (cardData) {
          if (cardData.volume > merged.cardMix[cardType].volume) {
            merged.cardMix[cardType].volume = cardData.volume;
          }
          if (cardData.transactions > merged.cardMix[cardType].transactions) {
            merged.cardMix[cardType].transactions = cardData.transactions;
          }
        }
      }
    }
  }

  // Calculate totalFees from breakdown if not found
  if (merged.totalFees === 0 && Object.keys(merged.fees).length > 0) {
    merged.totalFees = Object.values(merged.fees)
      .filter((v): v is number => typeof v === 'number')
      .reduce((sum, val) => sum + val, 0);
  }
  merged.fees.totalFees = merged.totalFees;

  return merged;
}

/**
 * Check if a file should use the robust parser based on size
 */
async function shouldUseRobustParser(
  filePath: string,
  objectStorage: ObjectStorageService
): Promise<boolean> {
  try {
    // Get file from object storage and check its metadata
    const file = await objectStorage.getObjectEntityFile(filePath);
    const [metadata] = await file.getMetadata();
    const fileSize = parseInt(metadata.size as string) || 0;
    console.log(`[ProposalParse] File size check: ${filePath} = ${fileSize} bytes`);
    return fileSize > ROBUST_PARSER_SIZE_THRESHOLD;
  } catch (e) {
    console.warn("[ProposalParse] Could not check file size:", e);
    return false;
  }
}

async function sendPushNotification(
  agentId: string,
  jobId: number,
  type: "success" | "error",
  message: string
): Promise<void> {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@example.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log("[ProposalParse] VAPID keys not configured, skipping push notification");
    return;
  }

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const subscriptions = await storage.getPushSubscriptionsByUser(agentId);

    const payload = JSON.stringify({
      title: type === "success" ? "Document Analysis Complete" : "Document Analysis Failed",
      body: message,
      data: { jobId, type: "proposal-parse-complete" },
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keysP256dh,
              auth: sub.keysAuth,
            },
          },
          payload
        );
      } catch (pushErr: any) {
        console.error("[ProposalParse] Push notification failed:", pushErr.message);
      }
    }
  } catch (notifyErr: any) {
    console.error("[ProposalParse] Failed to send notifications:", notifyErr.message);
  }
}
