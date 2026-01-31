import { ObjectStorageService } from "../../replit_integrations/object_storage/objectStorage";
import * as XLSX from "xlsx";
import Anthropic from "@anthropic-ai/sdk";
import {
  identifyProcessor,
  findSimilarExtractions,
  storeExtraction,
  buildFewShotPrompt
} from "./learning-service";

interface ExtractedStatementData {
  merchantName?: string;
  processorName?: string;
  statementPeriod?: string;
  totalVolume?: number;
  totalTransactions?: number;
  totalFees?: number;
  merchantType?: string;
  fees?: {
    interchange?: number;
    assessments?: number;
    monthlyFees?: number;
    pciFees?: number;
    statementFees?: number;
    batchFees?: number;
    equipmentFees?: number;
    otherFees?: number;
  };
  cardMix?: {
    visa?: { volume: number; transactions: number };
    mastercard?: { volume: number; transactions: number };
    discover?: { volume: number; transactions: number };
    amex?: { volume: number; transactions: number };
    debit?: { volume: number; transactions: number };
  };
  confidence: number;
  extractionNotes: string[];
}

const EXTRACTION_PROMPT = `Analyze this merchant processing statement and extract all data.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "merchantName": "Business name from statement header",
  "processorName": "Processor/ISO name (CardConnect, First Data, etc.)",
  "statementPeriod": "Statement period dates like '12/01/25 - 12/31/25'",
  "totalVolume": 99682.53,
  "totalTransactions": 402,
  "totalFees": 3307.19,
  "merchantType": "dental/retail/restaurant/healthcare/service/etc",
  "fees": {
    "interchange": 1509.27,
    "assessments": 128.13,
    "monthlyFees": 49.95,
    "pciFees": 99.00,
    "statementFees": 0,
    "batchFees": 3.75,
    "equipmentFees": 0,
    "otherFees": 21.90
  },
  "cardMix": {
    "visa": { "volume": 66135.27, "transactions": 265 },
    "mastercard": { "volume": 22676.96, "transactions": 99 },
    "discover": { "volume": 4662.54, "transactions": 21 },
    "amex": { "volume": 6207.76, "transactions": 17 },
    "debit": { "volume": 36389.19, "transactions": 186 }
  },
  "confidence": 95,
  "extractionNotes": ["Notes about extraction"]
}

CRITICAL RULES:
1. Numbers should be positive values without $ or commas
2. If fees show as negative (like -$3,307.19), convert to positive: 3307.19
3. For card mix, ADD credit + debit together (e.g., VISA + Visa Debit = visa total)
4. Look at EVERY page of the statement
5. "Amount Funded to Bank" = Volume - Fees`;

export async function extractStatementFromFiles(
  files: Array<{ path: string; mimeType: string; name: string }>
): Promise<ExtractedStatementData> {
  const anthropicApiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  const anthropicBaseUrl = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
  
  if (!anthropicApiKey || !anthropicBaseUrl) {
    throw new Error("Claude API not configured for document extraction");
  }

  const anthropic = new Anthropic({
    apiKey: anthropicApiKey,
    baseURL: anthropicBaseUrl,
  });

  const objectStorage = new ObjectStorageService();
  
  for (const file of files) {
    try {
      console.log(`[StatementExtractor] Processing file: ${file.name}, mimeType: ${file.mimeType}, path: ${file.path}`);
      
      if (file.mimeType.includes("spreadsheet") || file.mimeType.includes("excel") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv")) {
        const textContent = await extractExcelAsText(file.path, objectStorage);
        console.log(`[StatementExtractor] Excel content extracted, length: ${textContent.length}`);
        return await analyzeTextWithClaude(anthropic, textContent, file.name);
        
      } else if (file.mimeType === "application/pdf" || file.name.endsWith(".pdf")) {
        console.log(`[StatementExtractor] Processing PDF with Claude native support: ${file.name}`);
        const buffer = await getFileBuffer(file.path, objectStorage);
        console.log(`[StatementExtractor] PDF buffer size: ${buffer.length}`);
        return await analyzePDFWithClaude(anthropic, buffer);
        
      } else if (file.mimeType.startsWith("image/")) {
        console.log(`[StatementExtractor] Processing image: ${file.name}`);
        const buffer = await getFileBuffer(file.path, objectStorage);
        const base64Data = buffer.toString("base64");
        console.log(`[StatementExtractor] Image base64 length: ${base64Data.length}`);
        return await analyzeImageWithClaude(anthropic, base64Data, file.mimeType);
        
      } else {
        console.log(`[StatementExtractor] Unsupported file type: ${file.mimeType}`);
      }
    } catch (error: any) {
      console.error(`[StatementExtractor] Error processing file ${file.name}:`, error?.message || error);
      throw error;
    }
  }

  throw new Error("No valid files could be processed");
}

async function analyzePDFWithClaude(anthropic: Anthropic, buffer: Buffer): Promise<ExtractedStatementData> {
  console.log(`[StatementExtractor] Analyzing PDF with Claude, buffer size: ${buffer.length}`);
  
  const base64 = buffer.toString("base64");
  console.log(`[StatementExtractor] PDF base64 length: ${base64.length}`);
  
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64
              }
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT
            }
          ]
        }
      ]
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    console.log(`[StatementExtractor] Claude response length: ${responseText.length}`);
    
    return parseExtractedData(responseText);
  } catch (error: any) {
    console.error("[StatementExtractor] Claude PDF analysis error:", error?.message || error);
    throw new Error(`PDF analysis failed: ${error?.message || "Unknown error"}`);
  }
}

async function analyzeImageWithClaude(anthropic: Anthropic, base64Data: string, mimeType: string): Promise<ExtractedStatementData> {
  console.log(`[StatementExtractor] Analyzing image with Claude, base64 length: ${base64Data.length}`);
  
  const mediaType = mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data
              }
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT
            }
          ]
        }
      ]
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    console.log(`[StatementExtractor] Claude image response length: ${responseText.length}`);
    
    return parseExtractedData(responseText);
  } catch (error: any) {
    console.error("[StatementExtractor] Claude image analysis error:", error?.message || error);
    throw new Error(`Image analysis failed: ${error?.message || "Unknown error"}`);
  }
}

async function analyzeTextWithClaude(anthropic: Anthropic, text: string, filename: string): Promise<ExtractedStatementData> {
  console.log(`[StatementExtractor] Analyzing text with Claude, length: ${text.length}`);
  
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `This is spreadsheet data from file "${filename}":\n\n${text}\n\n${EXTRACTION_PROMPT}`
        }
      ]
    });

    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    console.log(`[StatementExtractor] Claude text response length: ${responseText.length}`);
    
    return parseExtractedData(responseText);
  } catch (error: any) {
    console.error("[StatementExtractor] Claude text analysis error:", error?.message || error);
    throw new Error(`Text analysis failed: ${error?.message || "Unknown error"}`);
  }
}

function parseExtractedData(responseText: string): ExtractedStatementData {
  try {
    // Remove markdown code blocks if present
    let jsonStr = responseText;
    const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1];
    } else {
      const rawMatch = responseText.match(/\{[\s\S]*\}/);
      if (rawMatch) {
        jsonStr = rawMatch[0];
      }
    }
    
    const extracted = JSON.parse(jsonStr) as ExtractedStatementData;
    
    if (!extracted.confidence) {
      extracted.confidence = 50;
    }
    if (!extracted.extractionNotes) {
      extracted.extractionNotes = [];
    }

    console.log(`[StatementExtractor] Successfully extracted data with confidence: ${extracted.confidence}`);
    return extracted;
  } catch (parseError) {
    console.error("[StatementExtractor] JSON parse error:", parseError, "Response:", responseText.substring(0, 500));
    return {
      confidence: 0,
      extractionNotes: ["Failed to parse AI response. Please enter data manually."]
    };
  }
}

async function getFileBuffer(objectPath: string, objectStorage: ObjectStorageService): Promise<Buffer> {
  console.log(`[StatementExtractor] getFileBuffer called with path: ${objectPath}`);
  
  try {
    const file = await objectStorage.getObjectEntityFile(objectPath);
    console.log(`[StatementExtractor] Got file object for: ${objectPath}`);
    const [buffer] = await file.download();
    console.log(`[StatementExtractor] Downloaded file, buffer size: ${buffer.length}`);
    return buffer;
  } catch (error: any) {
    console.error(`[StatementExtractor] getFileBuffer error:`, error?.message || error);
    throw error;
  }
}

async function extractExcelAsText(objectPath: string, objectStorage: ObjectStorageService): Promise<string> {
  console.log(`[StatementExtractor] extractExcelAsText called with path: ${objectPath}`);
  
  const file = await objectStorage.getObjectEntityFile(objectPath);
  const [buffer] = await file.download();
  console.log(`[StatementExtractor] Excel downloaded, buffer size: ${buffer.length}`);
  
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    let textContent = "";
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      textContent += `\n=== Sheet: ${sheetName} ===\n`;
      textContent += XLSX.utils.sheet_to_csv(sheet);
    }
    
    return textContent;
  } catch (error) {
    console.error("[StatementExtractor] Excel parsing error:", error);
    return "Unable to parse Excel file";
  }
}

export interface ExtractedStatementDataWithLearning extends ExtractedStatementData {
  extractionId?: number;
  processorIdentified?: string;
  processorConfidence?: number;
  usedExamples?: number;
}

export async function extractStatementWithLearning(
  files: Array<{ path: string; mimeType: string; name: string }>,
  orgId?: number
): Promise<ExtractedStatementDataWithLearning> {
  const extractedData = await extractStatementFromFiles(files);
  
  if (extractedData.confidence < 20) {
    return extractedData;
  }

  const processorResult = identifyProcessor(extractedData.processorName || '');
  console.log(`[StatementExtractor] Identified processor: ${processorResult.name} (${(processorResult.confidence * 100).toFixed(0)}%)`);

  try {
    const storedExtraction = await storeExtraction({
      processorName: processorResult.name,
      processorConfidence: processorResult.confidence,
      extractedData: {
        merchantName: extractedData.merchantName,
        totalVolume: extractedData.totalVolume || 0,
        totalTransactions: extractedData.totalTransactions || 0,
        totalFees: extractedData.totalFees || 0,
        effectiveRate: extractedData.totalVolume && extractedData.totalFees 
          ? (extractedData.totalFees / extractedData.totalVolume) * 100 
          : 0,
        cardMix: extractedData.cardMix,
        feeBreakdown: extractedData.fees as Record<string, number> | undefined
      },
      extractionMethod: 'claude-vision',
      extractionConfidence: extractedData.confidence / 100,
      orgId
    });

    return {
      ...extractedData,
      extractionId: storedExtraction.id,
      processorIdentified: processorResult.name,
      processorConfidence: processorResult.confidence
    };
  } catch (error) {
    console.error('[StatementExtractor] Failed to store extraction:', error);
    return {
      ...extractedData,
      processorIdentified: processorResult.name,
      processorConfidence: processorResult.confidence
    };
  }
}

export async function getEnhancedPrompt(processorName: string): Promise<string> {
  if (!processorName || processorName === 'Unknown') {
    return EXTRACTION_PROMPT;
  }

  try {
    const examples = await findSimilarExtractions(processorName, 3);
    if (examples.length === 0) {
      return EXTRACTION_PROMPT;
    }

    const fewShotSection = buildFewShotPrompt(examples, processorName);
    console.log(`[StatementExtractor] Enhanced prompt with ${examples.length} examples for ${processorName}`);
    
    return `${fewShotSection}\n\n${EXTRACTION_PROMPT}`;
  } catch (error) {
    console.error('[StatementExtractor] Failed to get enhanced prompt:', error);
    return EXTRACTION_PROMPT;
  }
}

export async function getLearningSuggestions(processorName: string): Promise<{
  exampleCount: number;
  avgEffectiveRate?: number;
  commonFees?: string[];
}> {
  try {
    const examples = await findSimilarExtractions(processorName, 10);
    if (examples.length === 0) {
      return { exampleCount: 0 };
    }

    const effectiveRates = examples
      .map(e => e.effectiveRate)
      .filter((r): r is number => r !== null && r !== undefined);
    
    const avgRate = effectiveRates.length > 0 
      ? effectiveRates.reduce((a, b) => a + b, 0) / effectiveRates.length 
      : undefined;

    return {
      exampleCount: examples.length,
      avgEffectiveRate: avgRate
    };
  } catch (error) {
    console.error('[StatementExtractor] Failed to get learning suggestions:', error);
    return { exampleCount: 0 };
  }
}

export type { ExtractedStatementData };
