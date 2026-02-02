import { ObjectStorageService } from "../replit_integrations/object_storage/objectStorage";
import * as XLSX from "xlsx";
import Anthropic from "@anthropic-ai/sdk";

export type DocumentType = 
  | "processing_statement" 
  | "pricing_spreadsheet_interchange" 
  | "pricing_spreadsheet_dual_pricing"
  | "pricing_spreadsheet_mixed"
  | "proposal_pdf"
  | "unknown";

export interface ClassifiedDocument {
  path: string;
  name: string;
  mimeType: string;
  documentType: DocumentType;
  confidence: number;
  summary: string;
}

export interface PricingSpreadsheetData {
  proposalType: "interchange_plus" | "dual_pricing" | "both";
  merchantName?: string;
  currentState: {
    totalVolume: number;
    totalTransactions: number;
    avgTicket: number;
    totalFees: number;
    effectiveRate: number;
    cardBreakdown?: {
      visa?: { volume: number; transactions: number; rate?: number; cost?: number };
      mastercard?: { volume: number; transactions: number; rate?: number; cost?: number };
      discover?: { volume: number; transactions: number; rate?: number; cost?: number };
      amex?: { volume: number; transactions: number; rate?: number; cost?: number };
    };
    fees?: {
      interchange?: number;
      assessments?: number;
      processorMarkup?: number;
      monthlyFees?: number;
      pciFees?: number;
      otherFees?: number;
    };
  };
  interchangePlus?: {
    discountRate: number;
    perTransactionFee: number;
    monthlyFees: number;
    totalMonthlyCost: number;
    monthlySavings: number;
    annualSavings: number;
  };
  dualPricing?: {
    merchantRate: number;
    perTransactionFee: number;
    monthlyProgramFee: number;
    totalMonthlyCost: number;
    monthlySavings: number;
    annualSavings: number;
  };
  extractionNotes: string[];
  confidence: number;
}

const CLASSIFICATION_PROMPT = `Analyze this document and classify it. Return ONLY valid JSON with this structure:
{
  "documentType": "one of: processing_statement, pricing_spreadsheet_interchange, pricing_spreadsheet_dual_pricing, pricing_spreadsheet_mixed, proposal_pdf, unknown",
  "confidence": 85,
  "summary": "Brief description of what this document is",
  "reasoning": "Why you classified it this way"
}

Document Types:
- processing_statement: A monthly merchant processing statement showing actual transaction volumes, fees charged, and card brand breakdowns. Has processor name, statement period, etc.
- pricing_spreadsheet_interchange: A pricing comparison spreadsheet showing proposed Interchange+ (cost-plus) pricing with discount rate + per-transaction fee
- pricing_spreadsheet_dual_pricing: A pricing comparison spreadsheet showing proposed Dual Pricing (zero cost processing) with separate cash/card pricing
- pricing_spreadsheet_mixed: A pricing spreadsheet showing BOTH interchange+ AND dual pricing options
- proposal_pdf: A pre-made proposal document (not a statement or spreadsheet)
- unknown: Cannot determine the document type

Look for key indicators:
- Statements have: processor name, statement period, "charges this period", interchange fees, actual transaction data
- Pricing spreadsheets have: "proposed", "savings", comparison columns, discount rates, per-item fees, calculated totals
- Dual pricing mentions: "zero cost", "dual pricing", "cash discount", "service fee"
- Interchange+ mentions: "interchange plus", "cost plus", "discount rate + per item"`;

const PRICING_EXTRACTION_PROMPT = `Extract ALL pricing and financial data from this document. This is a pricing comparison spreadsheet or proposal.

Return ONLY valid JSON (no markdown, no explanation):
{
  "proposalType": "interchange_plus or dual_pricing or both",
  "merchantName": "Business name if found",
  "currentState": {
    "totalVolume": 50000,
    "totalTransactions": 500,
    "avgTicket": 100,
    "totalFees": 1500,
    "effectiveRate": 3.0,
    "cardBreakdown": {
      "visa": { "volume": 25000, "transactions": 250, "rate": 2.5, "cost": 625 },
      "mastercard": { "volume": 15000, "transactions": 150, "rate": 2.6, "cost": 390 },
      "discover": { "volume": 5000, "transactions": 50, "rate": 2.7, "cost": 135 },
      "amex": { "volume": 5000, "transactions": 50, "rate": 3.5, "cost": 175 }
    },
    "fees": {
      "interchange": 800,
      "assessments": 100,
      "processorMarkup": 400,
      "monthlyFees": 50,
      "pciFees": 30,
      "otherFees": 20
    }
  },
  "interchangePlus": {
    "discountRate": 0.25,
    "perTransactionFee": 0.10,
    "monthlyFees": 50,
    "totalMonthlyCost": 500,
    "monthlySavings": 1000,
    "annualSavings": 12000
  },
  "dualPricing": {
    "merchantRate": 0.00,
    "perTransactionFee": 0.10,
    "monthlyProgramFee": 49.95,
    "totalMonthlyCost": 49.95,
    "monthlySavings": 1450,
    "annualSavings": 17400
  },
  "extractionNotes": ["Notes about what was found/missing"],
  "confidence": 90
}

CRITICAL:
- Extract ACTUAL numbers from the document, not placeholders
- Numbers should be positive values (no $ or commas)
- If only one pricing option is present, only include that section
- effectiveRate = (totalFees / totalVolume) * 100
- Look at ALL pages/sheets`;

export async function classifyDocument(
  file: { path: string; mimeType: string; name: string }
): Promise<ClassifiedDocument> {
  const anthropicApiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  const anthropicBaseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;

  if (!anthropicApiKey || !anthropicBaseUrl) {
    throw new Error("Claude API not configured for document classification");
  }

  const anthropic = new Anthropic({
    apiKey: anthropicApiKey,
    baseURL: anthropicBaseUrl,
  });

  const objectStorage = new ObjectStorageService();

  try {
    const lowerName = file.name.toLowerCase();
    const isSpreadsheet = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls") || lowerName.endsWith(".csv");
    const isPdf = file.mimeType === "application/pdf" || lowerName.endsWith(".pdf");
    const isImage = file.mimeType.startsWith("image/");

    let contentForClassification: any[];

    if (isSpreadsheet) {
      const fileObj = await objectStorage.getObjectEntityFile(file.path);
      const [buffer] = await fileObj.download();
      const workbook = XLSX.read(buffer, { type: "buffer" });
      let textContent = "";
      for (const sheetName of workbook.SheetNames.slice(0, 3)) {
        const sheet = workbook.Sheets[sheetName];
        textContent += `\n=== Sheet: ${sheetName} ===\n`;
        textContent += XLSX.utils.sheet_to_csv(sheet);
      }
      contentForClassification = [
        { type: "text", text: `Document Name: ${file.name}\n\nSpreadsheet Content:\n${textContent.substring(0, 15000)}` },
        { type: "text", text: CLASSIFICATION_PROMPT }
      ];
    } else if (isPdf) {
      const fileObj = await objectStorage.getObjectEntityFile(file.path);
      const [buffer] = await fileObj.download();
      const base64 = buffer.toString("base64");
      contentForClassification = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        { type: "text", text: CLASSIFICATION_PROMPT }
      ];
    } else if (isImage) {
      const fileObj = await objectStorage.getObjectEntityFile(file.path);
      const [buffer] = await fileObj.download();
      const base64 = buffer.toString("base64");
      const mediaType = file.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      contentForClassification = [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        { type: "text", text: CLASSIFICATION_PROMPT }
      ];
    } else {
      return {
        path: file.path,
        name: file.name,
        mimeType: file.mimeType,
        documentType: "unknown",
        confidence: 0,
        summary: "Unsupported file type"
      };
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: contentForClassification }]
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    const cleanJson = responseText.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    return {
      path: file.path,
      name: file.name,
      mimeType: file.mimeType,
      documentType: parsed.documentType || "unknown",
      confidence: parsed.confidence || 0,
      summary: parsed.summary || ""
    };
  } catch (error: any) {
    console.error("[DocumentClassifier] Error classifying:", file.name, error?.message);
    return {
      path: file.path,
      name: file.name,
      mimeType: file.mimeType,
      documentType: "unknown",
      confidence: 0,
      summary: `Classification failed: ${error?.message}`
    };
  }
}

export async function extractPricingSpreadsheet(
  file: { path: string; mimeType: string; name: string }
): Promise<PricingSpreadsheetData> {
  const anthropicApiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  const anthropicBaseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;

  if (!anthropicApiKey || !anthropicBaseUrl) {
    throw new Error("Claude API not configured for pricing extraction");
  }

  const anthropic = new Anthropic({
    apiKey: anthropicApiKey,
    baseURL: anthropicBaseUrl,
  });

  const objectStorage = new ObjectStorageService();

  try {
    const fileObj = await objectStorage.getObjectEntityFile(file.path);
    const [buffer] = await fileObj.download();
    
    const lowerName = file.name.toLowerCase();
    let contentForExtraction: any[];

    if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls") || lowerName.endsWith(".csv")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      let textContent = "";
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        textContent += `\n=== Sheet: ${sheetName} ===\n`;
        textContent += XLSX.utils.sheet_to_csv(sheet);
      }
      contentForExtraction = [
        { type: "text", text: `Document Name: ${file.name}\n\nComplete Spreadsheet Content:\n${textContent}` },
        { type: "text", text: PRICING_EXTRACTION_PROMPT }
      ];
    } else if (file.mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
      const base64 = buffer.toString("base64");
      contentForExtraction = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        { type: "text", text: PRICING_EXTRACTION_PROMPT }
      ];
    } else if (file.mimeType.startsWith("image/")) {
      const base64 = buffer.toString("base64");
      const mediaType = file.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      contentForExtraction = [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        { type: "text", text: PRICING_EXTRACTION_PROMPT }
      ];
    } else {
      throw new Error("Unsupported file type for pricing extraction");
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: contentForExtraction }]
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    const cleanJson = responseText.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    return {
      proposalType: parsed.proposalType || "interchange_plus",
      merchantName: parsed.merchantName,
      currentState: {
        totalVolume: parsed.currentState?.totalVolume || 0,
        totalTransactions: parsed.currentState?.totalTransactions || 0,
        avgTicket: parsed.currentState?.avgTicket || 0,
        totalFees: parsed.currentState?.totalFees || 0,
        effectiveRate: parsed.currentState?.effectiveRate || 0,
        cardBreakdown: parsed.currentState?.cardBreakdown,
        fees: parsed.currentState?.fees
      },
      interchangePlus: parsed.interchangePlus,
      dualPricing: parsed.dualPricing,
      extractionNotes: parsed.extractionNotes || [],
      confidence: parsed.confidence || 0
    };
  } catch (error: any) {
    console.error("[DocumentClassifier] Error extracting pricing:", file.name, error?.message);
    throw new Error(`Failed to extract pricing data: ${error?.message}`);
  }
}

export async function classifyAndRouteDocuments(
  files: Array<{ path: string; mimeType: string; name: string }>
): Promise<{
  classifications: ClassifiedDocument[];
  hasStatement: boolean;
  hasPricingSpreadsheet: boolean;
  hasProposal: boolean;
}> {
  console.log("[DocumentClassifier] Classifying", files.length, "files");

  const classifications: ClassifiedDocument[] = [];

  for (const file of files) {
    const classification = await classifyDocument(file);
    classifications.push(classification);
    console.log(`[DocumentClassifier] ${file.name} -> ${classification.documentType} (${classification.confidence}%)`);
  }

  return {
    classifications,
    hasStatement: classifications.some(c => c.documentType === "processing_statement"),
    hasPricingSpreadsheet: classifications.some(c => 
      c.documentType.startsWith("pricing_spreadsheet")
    ),
    hasProposal: classifications.some(c => c.documentType === "proposal_pdf")
  };
}
