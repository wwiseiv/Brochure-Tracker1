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

      result = await extractStatementOnly(statementFileData);
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
