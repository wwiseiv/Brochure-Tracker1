import { db } from "../../db";
import { 
  statementExtractions, 
  extractionCorrections, 
  feeDictionary,
  InsertStatementExtraction,
  InsertExtractionCorrection,
  InsertFeeDictionary,
  StatementExtraction,
  FeeDictionary
} from "@shared/schema";
import { eq, desc, and, sql, ilike } from "drizzle-orm";
import crypto from "crypto";

const PROCESSOR_PATTERNS: Record<string, RegExp> = {
  'CardConnect': /cardconnect|card\s*connect/i,
  'First Data': /first\s*data|fdms|fd[0-9]/i,
  'Fiserv': /fiserv/i,
  'TSYS': /tsys|transfirst|trans\s*first/i,
  'Worldpay': /worldpay/i,
  'Vantiv': /vantiv/i,
  'Square': /square\s*(inc|payments)?/i,
  'Stripe': /stripe/i,
  'Heartland': /heartland/i,
  'Elavon': /elavon/i,
  'Clover': /clover/i,
  'Toast': /toast/i,
  'Global Payments': /global\s*payments/i,
  'Chase Paymentech': /chase\s*paymentech|paymentech/i,
  'Wells Fargo': /wells\s*fargo/i,
  'PNC Merchant Services': /pnc\s*merchant/i,
  'Gravity Payments': /gravity\s*payments/i,
  'PayPal': /paypal/i,
};

export function identifyProcessor(text: string): { name: string; confidence: number } {
  const normalizedText = text.toLowerCase();
  
  for (const [name, pattern] of Object.entries(PROCESSOR_PATTERNS)) {
    if (pattern.test(normalizedText)) {
      const matches = normalizedText.match(pattern);
      const confidence = matches ? Math.min(0.95, 0.7 + (matches[0].length / 50)) : 0.7;
      return { name, confidence };
    }
  }
  
  return { name: 'Unknown', confidence: 0.1 };
}

export function anonymizeStatementText(text: string): string {
  return text
    .replace(/merchant[:\s]+[^\n]+/gi, 'MERCHANT: [REDACTED]')
    .replace(/dba[:\s]+[^\n]+/gi, 'DBA: [REDACTED]')
    .replace(/\b\d{10,}\b/g, '[ACCOUNT_NUMBER]')
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_NUMBER]')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE]')
    .replace(/\b\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|blvd|boulevard|way|court|ct|circle|cir)\b/gi, '[ADDRESS]');
}

export function hashStatement(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function getVolumeRange(volume: number): string {
  if (volume < 10000) return '0-10k';
  if (volume < 25000) return '10k-25k';
  if (volume < 50000) return '25k-50k';
  if (volume < 100000) return '50k-100k';
  if (volume < 250000) return '100k-250k';
  if (volume < 500000) return '250k-500k';
  if (volume < 1000000) return '500k-1M';
  return '1M+';
}

export function anonymizeExtractedData(data: Record<string, any>): Record<string, any> {
  const sensitiveFields = ['merchantName', 'businessName', 'ownerName', 'email', 'phone', 'address'];
  const anonymized = { ...data };
  
  for (const field of sensitiveFields) {
    if (anonymized[field]) {
      anonymized[field] = '[REDACTED]';
    }
  }
  
  return anonymized;
}

export async function storeExtraction(
  extractionData: {
    processorName: string;
    processorConfidence?: number;
    statementText?: string;
    extractedData: {
      merchantName?: string;
      totalVolume: number;
      totalTransactions: number;
      totalFees: number;
      effectiveRate: number;
      cardMix?: any;
      feeBreakdown?: Record<string, number>;
    };
    extractionMethod?: string;
    extractionConfidence?: number;
    extractionPrompt?: string;
    orgId?: number;
  }
): Promise<StatementExtraction> {
  const anonymizedText = extractionData.statementText 
    ? anonymizeStatementText(extractionData.statementText) 
    : null;
  
  const statementHash = extractionData.statementText 
    ? hashStatement(extractionData.statementText)
    : null;

  const anonymizedExtractedData = anonymizeExtractedData(extractionData.extractedData);

  const insertData: InsertStatementExtraction = {
    orgId: extractionData.orgId,
    processorName: extractionData.processorName,
    processorConfidence: extractionData.processorConfidence,
    statementHash,
    anonymizedText,
    volumeRange: getVolumeRange(extractionData.extractedData.totalVolume),
    transactionCount: extractionData.extractedData.totalTransactions,
    effectiveRate: extractionData.extractedData.effectiveRate,
    extractedData: anonymizedExtractedData,
    extractionMethod: extractionData.extractionMethod || 'gemini-vision',
    extractionConfidence: extractionData.extractionConfidence,
    extractionPrompt: extractionData.extractionPrompt,
    wasSuccessful: true,
    userCorrected: false,
  };

  const [result] = await db.insert(statementExtractions).values(insertData as any).returning();
  console.log(`[LearningService] Stored extraction #${result.id} for ${extractionData.processorName}`);
  return result;
}

export async function findSimilarExtractions(
  processorName: string,
  limit: number = 5
): Promise<StatementExtraction[]> {
  const results = await db
    .select()
    .from(statementExtractions)
    .where(
      and(
        eq(statementExtractions.processorName, processorName),
        eq(statementExtractions.wasSuccessful, true)
      )
    )
    .orderBy(desc(statementExtractions.createdAt))
    .limit(limit);

  console.log(`[LearningService] Found ${results.length} similar extractions for ${processorName}`);
  return results;
}

export async function getAllExtractions(limit: number = 100): Promise<StatementExtraction[]> {
  return db
    .select()
    .from(statementExtractions)
    .orderBy(desc(statementExtractions.createdAt))
    .limit(limit);
}

export async function getExtractionStats(): Promise<{
  totalExtractions: number;
  byProcessor: { processorName: string; count: number; avgEffectiveRate: number }[];
  recentExtractions: number;
}> {
  const byProcessor = await db
    .select({
      processorName: statementExtractions.processorName,
      count: sql<number>`count(*)::int`,
      avgEffectiveRate: sql<number>`avg(${statementExtractions.effectiveRate})::float`,
    })
    .from(statementExtractions)
    .groupBy(statementExtractions.processorName)
    .orderBy(sql`count(*) DESC`);

  const totalResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(statementExtractions);

  const recentResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(statementExtractions)
    .where(sql`${statementExtractions.createdAt} > NOW() - INTERVAL '7 days'`);

  return {
    totalExtractions: totalResult[0]?.count || 0,
    byProcessor,
    recentExtractions: recentResult[0]?.count || 0,
  };
}

interface CorrectionInput {
  extractionId: number;
  fieldName: string;
  originalValue: string;
  correctedValue: string;
  userId?: string;
  orgId?: number;
  isPositiveFeedback?: boolean;
}

export async function recordCorrection(
  correction: CorrectionInput
): Promise<void> {
  const { isPositiveFeedback, ...correctionData } = correction;
  
  await db.insert(extractionCorrections).values(correctionData as any);
  
  if (!isPositiveFeedback) {
    await db
      .update(statementExtractions)
      .set({ userCorrected: true })
      .where(eq(statementExtractions.id, correctionData.extractionId));
    
    console.log(`[LearningService] Recorded correction for extraction #${correctionData.extractionId}`);
  } else {
    console.log(`[LearningService] Recorded verification for extraction #${correctionData.extractionId}`);
  }
}

export async function getFeeDictionary(): Promise<FeeDictionary[]> {
  return db.select().from(feeDictionary).orderBy(feeDictionary.category, feeDictionary.feeName);
}

export async function lookupFee(feeName: string): Promise<FeeDictionary | null> {
  const normalizedName = feeName.toUpperCase().trim();
  
  const exactMatch = await db
    .select()
    .from(feeDictionary)
    .where(ilike(feeDictionary.feeName, normalizedName))
    .limit(1);

  if (exactMatch.length > 0) {
    return exactMatch[0];
  }

  const aliasMatch = await db
    .select()
    .from(feeDictionary)
    .where(sql`${normalizedName} = ANY(${feeDictionary.feeAliases})`)
    .limit(1);

  return aliasMatch[0] || null;
}

export async function addFee(fee: InsertFeeDictionary): Promise<FeeDictionary> {
  const [result] = await db.insert(feeDictionary).values(fee as any).returning();
  return result;
}

export function buildFewShotPrompt(
  examples: StatementExtraction[],
  processorName: string
): string {
  if (examples.length === 0) {
    return '';
  }

  let prompt = `\n## EXAMPLES FROM PAST ${processorName.toUpperCase()} STATEMENTS\n\n`;
  prompt += `I've successfully extracted these similar statements before. Use them as reference for field locations and formats:\n\n`;

  examples.forEach((ex, i) => {
    if (ex.extractedData) {
      prompt += `**Example ${i + 1}:**\n`;
      prompt += `- Volume: $${ex.extractedData.totalVolume?.toLocaleString() || 'N/A'}\n`;
      prompt += `- Transactions: ${ex.extractedData.totalTransactions?.toLocaleString() || 'N/A'}\n`;
      prompt += `- Total Fees: $${ex.extractedData.totalFees?.toLocaleString() || 'N/A'}\n`;
      prompt += `- Effective Rate: ${ex.extractedData.effectiveRate?.toFixed(2) || 'N/A'}%\n`;
      
      if (ex.extractedData.cardMix) {
        prompt += `- Card Mix: ${JSON.stringify(ex.extractedData.cardMix)}\n`;
      }
      if (ex.extractedData.feeBreakdown) {
        prompt += `- Fee Breakdown: ${JSON.stringify(ex.extractedData.feeBreakdown)}\n`;
      }
      prompt += '\n';
    }
  });

  return prompt;
}

export async function seedFeeDictionary(): Promise<void> {
  const existingFees = await db.select({ id: feeDictionary.id }).from(feeDictionary).limit(1);
  if (existingFees.length > 0) {
    console.log('[LearningService] Fee dictionary already seeded');
    return;
  }

  const fees: InsertFeeDictionary[] = [
    {
      feeName: 'INTERCHANGE',
      feeAliases: ['IC', 'INT', 'INTERCHANGE FEES'],
      category: 'interchange',
      description: 'Base cost paid to the card-issuing bank. This is the wholesale cost of processing.',
      isNegotiable: false,
      salesTalkingPoint: 'This is the true cost - we pass this through at cost with no markup.'
    },
    {
      feeName: 'ASSESSMENTS',
      feeAliases: ['ASSESSMENT', 'NETWORK ASSESSMENTS', 'BRAND FEES'],
      category: 'assessment',
      description: 'Fees paid directly to card networks (Visa, Mastercard, etc.).',
      isNegotiable: false,
      salesTalkingPoint: 'These are network fees - everyone pays the same rate.'
    },
    {
      feeName: 'NABU FEES',
      feeAliases: ['NABU', 'MC NABU', 'MASTERCARD NABU', 'NETWORK ACCESS BRAND USAGE'],
      category: 'network',
      description: 'MasterCard Network Access and Brand Usage fee.',
      cardBrand: 'mastercard',
      typicalAmountType: 'per_item',
      typicalAmountMin: 0.0155,
      typicalAmountMax: 0.0195,
      isNegotiable: false,
      salesTalkingPoint: 'This is a MasterCard network fee - everyone pays it.'
    },
    {
      feeName: 'APF',
      feeAliases: ['ACQUIRER PROCESSING FEE', 'VISA APF'],
      category: 'network',
      description: 'Visa Acquirer Processing Fee charged per transaction.',
      cardBrand: 'visa',
      typicalAmountType: 'per_item',
      typicalAmountMin: 0.0195,
      typicalAmountMax: 0.0235,
      isNegotiable: false,
      salesTalkingPoint: 'This is a Visa network fee that everyone pays.'
    },
    {
      feeName: 'DISC 1',
      feeAliases: ['DISCOUNT RATE', 'DISC RATE', 'QUALIFIED RATE'],
      category: 'markup',
      description: 'Processor discount/markup rate. This is negotiable processor profit.',
      isNegotiable: true,
      salesTalkingPoint: 'This is pure processor markup - we can eliminate this with our pricing.'
    },
    {
      feeName: 'PCI NON COMP FEE',
      feeAliases: ['PCI FEE', 'PCI NON-COMPLIANCE', 'NON COMP FEE', 'PCI PENALTY'],
      category: 'compliance',
      description: 'Monthly penalty for not completing PCI compliance questionnaire.',
      typicalAmountType: 'monthly',
      typicalAmountMin: 19.95,
      typicalAmountMax: 99.95,
      isNegotiable: true,
      salesTalkingPoint: 'We help you get compliant for FREE and eliminate this fee entirely.'
    },
    {
      feeName: 'STATEMENT FEE',
      feeAliases: ['STMNT FEE', 'MONTHLY STATEMENT'],
      category: 'monthly',
      description: 'Monthly fee for receiving a processing statement.',
      typicalAmountType: 'monthly',
      typicalAmountMin: 5.00,
      typicalAmountMax: 15.00,
      isNegotiable: true,
      salesTalkingPoint: 'This is a junk fee - we never charge statement fees.'
    },
    {
      feeName: 'BATCH HEADER',
      feeAliases: ['BATCH FEE', 'BATCH SETTLEMENT', 'SETTLEMENT FEE'],
      category: 'processor',
      description: 'Fee charged each time you settle/batch your transactions.',
      typicalAmountType: 'per_batch',
      typicalAmountMin: 0.10,
      typicalAmountMax: 0.35,
      isNegotiable: true,
      salesTalkingPoint: 'Many processors charge this - we include it in our flat rate.'
    },
    {
      feeName: 'ANNUAL FEE',
      feeAliases: ['YEARLY FEE', 'MEMBERSHIP FEE', 'ACCOUNT FEE'],
      category: 'monthly',
      description: 'Yearly account maintenance fee, often hidden.',
      typicalAmountType: 'annual',
      typicalAmountMin: 49.00,
      typicalAmountMax: 199.00,
      isNegotiable: true,
      salesTalkingPoint: 'This is a junk fee - we have NO annual fees ever.'
    },
    {
      feeName: 'EQUIPMENT LEASE',
      feeAliases: ['TERMINAL LEASE', 'POS LEASE', 'EQUIPMENT RENTAL'],
      category: 'equipment',
      description: 'Monthly terminal lease payment. Often overpriced and locked in.',
      typicalAmountType: 'monthly',
      typicalAmountMin: 19.95,
      typicalAmountMax: 149.00,
      isNegotiable: true,
      salesTalkingPoint: 'Equipment leases are a MAJOR red flag. We provide FREE terminals.'
    },
    {
      feeName: 'AMEX OPT BLUE',
      feeAliases: ['AMEX OPTBLUE', 'AMERICAN EXPRESS OPTBLUE'],
      category: 'interchange',
      description: 'American Express OptBlue program interchange rates.',
      cardBrand: 'amex',
      isNegotiable: false,
      salesTalkingPoint: 'Amex OptBlue gives you competitive Amex rates through your processor.'
    },
    {
      feeName: 'REGULATORY FEE',
      feeAliases: ['REG FEE', 'REGULATORY COMPLIANCE'],
      category: 'monthly',
      description: 'Vague compliance fee with no clear purpose.',
      typicalAmountType: 'monthly',
      typicalAmountMin: 4.95,
      typicalAmountMax: 14.95,
      isNegotiable: true,
      salesTalkingPoint: 'This is a made-up junk fee - we never charge regulatory fees.'
    },
    {
      feeName: 'NETWORK FEE',
      feeAliases: ['NWK FEE', 'NETWORK ACCESS'],
      category: 'network',
      description: 'Generic network access fee.',
      isNegotiable: false,
      salesTalkingPoint: 'Network fees are pass-through - make sure you are not being overcharged.'
    },
    {
      feeName: 'MIN DISCOUNT',
      feeAliases: ['MINIMUM DISCOUNT', 'MONTHLY MINIMUM'],
      category: 'monthly',
      description: 'Minimum monthly processing fee if volume is below threshold.',
      typicalAmountType: 'monthly',
      typicalAmountMin: 15.00,
      typicalAmountMax: 50.00,
      isNegotiable: true,
      salesTalkingPoint: 'Monthly minimums hurt small businesses - we have NO monthly minimums.'
    },
    {
      feeName: 'DEBIT NETWORK',
      feeAliases: ['PIN DEBIT', 'DEBIT ACCESS', 'DEBIT NETWORK FEE'],
      category: 'network',
      description: 'Fees for PIN debit network access (STAR, PULSE, NYCE, etc.).',
      cardBrand: 'debit',
      isNegotiable: false,
      salesTalkingPoint: 'Debit network fees are pass-through at true cost.'
    },
  ];

  await db.insert(feeDictionary).values(fees as any);
  console.log(`[LearningService] Seeded ${fees.length} fee dictionary entries`);
}
