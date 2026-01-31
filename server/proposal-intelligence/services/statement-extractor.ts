import { ObjectStorageService } from "../../replit_integrations/object_storage/objectStorage";
import * as XLSX from "xlsx";
import OpenAI from "openai";

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

const EXTRACTION_PROMPT = `You are an expert at extracting data from merchant credit card processing statements. This is a CRITICAL business task - accuracy is essential.

CAREFULLY analyze the provided statement document(s) and extract ALL available data. Return ONLY valid JSON with no additional text:

{
  "merchantName": "Business name from statement header/address block (string or null)",
  "processorName": "Processor/ISO name from header (string or null)",
  "statementPeriod": "Statement period dates like '12/01/25 - 12/31/25' (string or null)",
  "totalVolume": "Total amount submitted/processed in dollars (number or null)",
  "totalTransactions": "Total number of transactions/items (number or null)",
  "totalFees": "Total fees charged in dollars - look for 'Fees Charged' or similar (number or null)",
  "merchantType": "Based on business name: retail, restaurant, dental, healthcare, service, etc. (string or null)",
  "fees": {
    "interchange": "Interchange fees in dollars (number or null)",
    "assessments": "Assessment/network fees in dollars (number or null)",
    "monthlyFees": "Monthly service fees (number or null)",
    "pciFees": "PCI compliance fees (number or null)",
    "statementFees": "Statement fees (number or null)",
    "batchFees": "Batch/transaction fees (number or null)",
    "equipmentFees": "Equipment lease/rental fees (number or null)",
    "otherFees": "Other miscellaneous fees (number or null)"
  },
  "cardMix": {
    "visa": { "volume": 0, "transactions": 0 },
    "mastercard": { "volume": 0, "transactions": 0 },
    "discover": { "volume": 0, "transactions": 0 },
    "amex": { "volume": 0, "transactions": 0 },
    "debit": { "volume": 0, "transactions": 0 }
  },
  "confidence": "0-100 confidence score based on data clarity (number)",
  "extractionNotes": ["List of notes about what was found or issues encountered"]
}

EXTRACTION LOCATIONS - Look carefully in these areas:
1. MERCHANT NAME: Usually in header block with address. Examples: "BRICKWORKS DENTAL", "ABC RESTAURANT LLC"
2. PROCESSOR NAME: Top of statement - CardConnect, First Data, Worldpay, Fiserv, TSYS, Heartland, Elavon, etc.
3. STATEMENT PERIOD: Usually shows "Statement Period: MM/DD/YY - MM/DD/YY"
4. TOTAL VOLUME: Look for "Amounts Submitted", "Total Sales", "Total Amount You Submitted" - the grand total
5. TOTAL TRANSACTIONS: Look for "Items" column total in card breakdown, or "Total Transactions"
6. TOTAL FEES: Look for "Fees Charged" in summary, or "Total Fees" - this is often negative in statement format
7. CARD MIX TABLE: Usually labeled "SUMMARY BY CARD TYPE" with columns for Card Type, Items, Amount
   - Include both credit AND debit for each network (Visa + Visa Debit = total Visa)
   - AMEX may be labeled "AMEXCT043" or similar
   - Discover may be labeled "DCVR ACQ" or similar

CRITICAL RULES:
1. Numbers should be positive values without currency symbols or commas
2. If fees show as negative (like -$3,307.19), convert to positive: 3307.19
3. For card mix, ADD credit + debit together for each network (e.g., MASTERCARD + Mastercard Debit = mastercard total)
4. Look at EVERY page of multi-page statements
5. The "Amount Funded to Your Bank" = Volume - Fees
6. If you see data but aren't 100% certain, extract it and note uncertainty in extractionNotes

Return ONLY the JSON object, no markdown, no code blocks, no explanations.`;

export async function extractStatementFromFiles(
  files: Array<{ path: string; mimeType: string; name: string }>
): Promise<ExtractedStatementData> {
  const openaiApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  
  if (!openaiApiKey || !openaiBaseUrl) {
    throw new Error("OpenAI API not configured for document extraction");
  }

  const openai = new OpenAI({
    apiKey: openaiApiKey,
    baseURL: openaiBaseUrl,
  });

  const objectStorage = new ObjectStorageService();
  const contentParts: OpenAI.ChatCompletionContentPart[] = [];
  
  for (const file of files) {
    try {
      console.log(`[StatementExtractor] Processing file: ${file.name}, mimeType: ${file.mimeType}, path: ${file.path}`);
      
      if (file.mimeType.includes("spreadsheet") || file.mimeType.includes("excel") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv")) {
        const textContent = await extractExcelAsText(file.path, objectStorage);
        console.log(`[StatementExtractor] Excel content extracted, length: ${textContent.length}`);
        contentParts.push({ 
          type: "text", 
          text: `\n--- Excel/CSV Content from ${file.name} ---\n${textContent}\n` 
        });
      } else if (file.mimeType === "application/pdf" || file.name.endsWith(".pdf")) {
        console.log(`[StatementExtractor] Processing PDF: ${file.name}`);
        const base64Data = await getFileAsBase64(file.path, objectStorage);
        console.log(`[StatementExtractor] PDF base64 length: ${base64Data.length}`);
        contentParts.push({
          type: "image_url",
          image_url: {
            url: `data:application/pdf;base64,${base64Data}`,
            detail: "high"
          }
        });
      } else if (file.mimeType.startsWith("image/")) {
        console.log(`[StatementExtractor] Processing image: ${file.name}`);
        const base64Data = await getFileAsBase64(file.path, objectStorage);
        console.log(`[StatementExtractor] Image base64 length: ${base64Data.length}`);
        contentParts.push({
          type: "image_url",
          image_url: {
            url: `data:${file.mimeType};base64,${base64Data}`,
            detail: "high"
          }
        });
      } else {
        console.log(`[StatementExtractor] Unsupported file type: ${file.mimeType}`);
      }
    } catch (error: any) {
      console.error(`[StatementExtractor] Error processing file ${file.name}:`, error?.message || error);
    }
  }

  if (contentParts.length === 0) {
    throw new Error("No valid files could be processed");
  }

  contentParts.push({ type: "text", text: EXTRACTION_PROMPT });

  console.log(`[StatementExtractor] Sending ${contentParts.length} parts to OpenAI for analysis`);
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: contentParts
        }
      ],
      max_tokens: 4096,
      temperature: 0.1
    });

    const responseText = response.choices[0]?.message?.content || "";
    console.log(`[StatementExtractor] OpenAI response length: ${responseText.length}`);

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      
      const extracted = JSON.parse(jsonMatch[0]) as ExtractedStatementData;
      
      if (!extracted.confidence) {
        extracted.confidence = 50;
      }
      if (!extracted.extractionNotes) {
        extracted.extractionNotes = [];
      }

      console.log(`[StatementExtractor] Successfully extracted data with confidence: ${extracted.confidence}`);
      return extracted;
    } catch (parseError) {
      console.error("[StatementExtractor] JSON parse error:", parseError, "Response:", responseText);
      return {
        confidence: 0,
        extractionNotes: ["Failed to parse AI response. Please enter data manually."]
      };
    }
  } catch (error: any) {
    console.error("[StatementExtractor] OpenAI API error:", error?.message || error);
    throw new Error(`AI analysis failed: ${error?.message || "Unknown error"}`);
  }
}

async function getFileAsBase64(objectPath: string, objectStorage: ObjectStorageService): Promise<string> {
  console.log(`[StatementExtractor] getFileAsBase64 called with path: ${objectPath}`);
  
  try {
    const file = await objectStorage.getObjectEntityFile(objectPath);
    console.log(`[StatementExtractor] Got file object for: ${objectPath}`);
    const [buffer] = await file.download();
    console.log(`[StatementExtractor] Downloaded file, buffer size: ${buffer.length}`);
    return buffer.toString("base64");
  } catch (error: any) {
    console.error(`[StatementExtractor] getFileAsBase64 error:`, error?.message || error);
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

export type { ExtractedStatementData };
