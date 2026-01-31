import { ObjectStorageService, objectStorageClient } from "../../replit_integrations/object_storage/objectStorage";
import * as XLSX from "xlsx";

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

const GEMINI_EXTRACTION_PROMPT = `You are an expert at extracting data from merchant credit card processing statements.

Analyze the provided statement document(s) and extract the following information. Return ONLY valid JSON with no additional text:

{
  "merchantName": "Business name from statement (string or null)",
  "processorName": "Processor/ISO name like Square, Stripe, First Data, Worldpay, etc. (string or null)",
  "statementPeriod": "Statement month/period (string or null)",
  "totalVolume": "Total monthly processing volume in dollars (number or null)",
  "totalTransactions": "Total number of transactions (number or null)",
  "totalFees": "Total fees charged for the month in dollars (number or null)",
  "merchantType": "retail, restaurant, qsr, supermarket, ecommerce, service, healthcare, or b2b (string or null)",
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

Key extraction rules:
1. Look for "Total Sales", "Net Sales", "Processing Volume" for totalVolume
2. Look for "Total Transactions", "Transaction Count", "# of Transactions" for totalTransactions  
3. Look for "Total Fees", "Net Fees", "Processing Fees" for totalFees
4. Common processors: Square, Stripe, PayPal, Clover, Toast, First Data/Fiserv, TSYS/Global Payments, Worldpay/Vantiv, Heartland, Elavon, Chase Paymentech
5. For card mix, look for Visa/MC/Discover/Amex volume and transaction breakdowns
6. Return null for any fields you cannot confidently extract
7. Numbers should be positive values without currency symbols or commas

IMPORTANT: Return ONLY the JSON object, no markdown, no explanations.`;

export async function extractStatementFromFiles(
  files: Array<{ path: string; mimeType: string; name: string }>
): Promise<ExtractedStatementData> {
  const geminiApiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  const geminiBaseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
  
  if (!geminiApiKey) {
    throw new Error("Gemini API not configured for document extraction");
  }

  const parts: any[] = [];
  const objectStorage = new ObjectStorageService();
  
  for (const file of files) {
    try {
      console.log(`[StatementExtractor] Processing file: ${file.name}, mimeType: ${file.mimeType}, path: ${file.path}`);
      
      if (file.mimeType.includes("spreadsheet") || file.mimeType.includes("excel") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv")) {
        const textContent = await extractExcelAsText(file.path, objectStorage);
        console.log(`[StatementExtractor] Excel content extracted, length: ${textContent.length}`);
        parts.push({ text: `\n--- Excel/CSV Content from ${file.name} ---\n${textContent}\n` });
      } else if (file.mimeType === "application/pdf" || file.name.endsWith(".pdf")) {
        console.log(`[StatementExtractor] Processing PDF: ${file.name}`);
        const base64Data = await getFileAsBase64(file.path, objectStorage);
        console.log(`[StatementExtractor] PDF base64 length: ${base64Data.length}`);
        parts.push({
          inline_data: {
            mime_type: "application/pdf",
            data: base64Data
          }
        });
      } else if (file.mimeType.startsWith("image/")) {
        console.log(`[StatementExtractor] Processing image: ${file.name}`);
        const base64Data = await getFileAsBase64(file.path, objectStorage);
        console.log(`[StatementExtractor] Image base64 length: ${base64Data.length}`);
        parts.push({
          inline_data: {
            mime_type: file.mimeType,
            data: base64Data
          }
        });
      } else {
        console.log(`[StatementExtractor] Unsupported file type: ${file.mimeType}`);
      }
    } catch (error: any) {
      console.error(`[StatementExtractor] Error processing file ${file.name}:`, error?.message || error);
    }
  }

  if (parts.length === 0) {
    throw new Error("No valid files could be processed");
  }

  parts.push({ text: GEMINI_EXTRACTION_PROMPT });

  console.log(`[StatementExtractor] Sending ${parts.length} parts to Gemini for analysis`);
  
  const response = await fetch(`${geminiBaseUrl}/v1beta/models/gemini-1.5-pro:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": geminiApiKey
    },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[StatementExtractor] Gemini API error:", errorText);
    throw new Error("Failed to analyze statement with AI");
  }

  const data = await response.json() as any;
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

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

    return extracted;
  } catch (parseError) {
    console.error("[StatementExtractor] JSON parse error:", parseError, "Response:", responseText);
    return {
      confidence: 0,
      extractionNotes: ["Failed to parse AI response. Please enter data manually."]
    };
  }
}

async function getFileAsBase64(objectPath: string, objectStorage: ObjectStorageService): Promise<string> {
  const { bucketName, objectName } = parseObjectPath(objectPath);
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);
  
  const [buffer] = await file.download();
  return buffer.toString("base64");
}

async function extractExcelAsText(objectPath: string, objectStorage: ObjectStorageService): Promise<string> {
  const { bucketName, objectName } = parseObjectPath(objectPath);
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);
  
  const [buffer] = await file.download();
  
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

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return { bucketName, objectName };
}

export type { ExtractedStatementData };
