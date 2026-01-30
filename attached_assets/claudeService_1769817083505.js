// Claude AI Service
// Uses Claude API to extract statement data and provide insights

import { processorPatterns } from '../data/interchangeRates.js';

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

/**
 * Extract statement data from parsed text using Claude
 */
export async function extractStatementData(parsedText, apiKey) {
  if (!apiKey) {
    // Try to extract manually without AI
    return extractDataManually(parsedText);
  }

  const prompt = `You are an expert at analyzing merchant processing statements. Extract the following data from this statement text.

STATEMENT TEXT:
${parsedText.substring(0, 15000)}

Extract and return ONLY a JSON object with these fields (use null if not found):

{
  "merchantName": "business name",
  "merchantId": "MID number",
  "statementPeriod": "date range",
  "processor": "processor name",
  
  "totalVolume": 12345.67,
  "totalTransactions": 123,
  "totalFees": 456.78,
  
  "visaVolume": 5000.00,
  "visaTransactions": 50,
  "visaFees": 100.00,
  
  "mastercardVolume": 3500.00,
  "mastercardTransactions": 35,
  "mastercardFees": 70.00,
  
  "discoverVolume": 1000.00,
  "discoverTransactions": 10,
  "discoverFees": 20.00,
  
  "amexVolume": 2000.00,
  "amexTransactions": 20,
  "amexFees": 50.00,
  
  "debitVolume": 1500.00,
  "debitTransactions": 30,
  "debitFees": 15.00,
  
  "interchangeFees": 300.00,
  "assessmentFees": 50.00,
  "processorFees": 100.00,
  
  "monthlyFee": 10.00,
  "pciFee": 19.95,
  "statementFee": 5.00,
  "batchFee": 0.10,
  "otherFees": 25.00,
  
  "effectiveRate": 2.75,
  "averageTicket": 45.50,
  
  "pricingType": "tiered|interchange-plus|flat-rate|unknown",
  "merchantType": "retail|restaurant|ecommerce|service|unknown",
  
  "qualifiedRate": 1.69,
  "midQualifiedRate": 2.19,
  "nonQualifiedRate": 3.19,
  
  "warnings": ["list of concerning items found"],
  "rawNotes": "any other relevant info"
}

Rules:
- Extract EXACT numbers from the statement
- Convert percentages to decimals (2.5% = 2.5)
- For volumes/fees, use the numeric value only
- If you see tiered rates (qualified/mid/non), note the pricing type as "tiered"
- Look for processor names like First Data, TSYS, Worldpay, Square, etc.
- Identify junk fees like PCI fees, regulatory fees, annual fees

Return ONLY the JSON object, no other text.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0].text;
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        data: cleanExtractedData(extracted),
        raw: extracted,
        source: 'ai'
      };
    }
    
    throw new Error('Could not parse AI response');
  } catch (error) {
    console.error('AI extraction failed:', error);
    // Fallback to manual extraction
    return extractDataManually(parsedText);
  }
}

/**
 * Manual extraction using regex patterns (fallback)
 */
function extractDataManually(text) {
  const data = {
    totalVolume: null,
    totalTransactions: null,
    totalFees: null,
    processor: null,
    merchantType: 'retail'
  };

  // Try to find processor name
  const textLower = text.toLowerCase();
  for (const [processor, patterns] of Object.entries(processorPatterns)) {
    if (patterns.some(p => textLower.includes(p))) {
      data.processor = processor;
      break;
    }
  }

  // Common patterns for volume
  const volumePatterns = [
    /total\s*(?:sales|volume|processed)[:\s]*\$?([\d,]+\.?\d*)/i,
    /gross\s*(?:sales|volume)[:\s]*\$?([\d,]+\.?\d*)/i,
    /(?:net|total)\s*(?:deposit|deposited)[:\s]*\$?([\d,]+\.?\d*)/i,
    /sales\s*volume[:\s]*\$?([\d,]+\.?\d*)/i
  ];

  for (const pattern of volumePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.totalVolume = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Common patterns for transactions
  const txnPatterns = [
    /total\s*(?:transactions|items|count)[:\s]*([\d,]+)/i,
    /(?:transaction|item)\s*count[:\s]*([\d,]+)/i,
    /number\s*of\s*(?:transactions|sales)[:\s]*([\d,]+)/i
  ];

  for (const pattern of txnPatterns) {
    const match = text.match(pattern);
    if (match) {
      data.totalTransactions = parseInt(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Common patterns for fees
  const feePatterns = [
    /total\s*(?:fees|charges|deductions)[:\s]*\$?([\d,]+\.?\d*)/i,
    /(?:processing|merchant)\s*fees[:\s]*\$?([\d,]+\.?\d*)/i,
    /total\s*(?:cost|amount\s*due)[:\s]*\$?([\d,]+\.?\d*)/i
  ];

  for (const pattern of feePatterns) {
    const match = text.match(pattern);
    if (match) {
      data.totalFees = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Try to find effective rate
  const ratePattern = /effective\s*rate[:\s]*([\d.]+)\s*%?/i;
  const rateMatch = text.match(ratePattern);
  if (rateMatch) {
    data.effectiveRate = parseFloat(rateMatch[1]);
  }

  // Detect pricing type
  if (textLower.includes('qualified') && textLower.includes('non-qualified')) {
    data.pricingType = 'tiered';
  } else if (textLower.includes('interchange') && textLower.includes('markup')) {
    data.pricingType = 'interchange-plus';
  }

  return {
    success: data.totalVolume !== null || data.totalFees !== null,
    data: cleanExtractedData(data),
    raw: data,
    source: 'manual'
  };
}

/**
 * Clean and validate extracted data
 */
function cleanExtractedData(data) {
  const cleaned = { ...data };
  
  // Ensure numbers are valid
  const numericFields = [
    'totalVolume', 'totalTransactions', 'totalFees',
    'visaVolume', 'visaTransactions', 'visaFees',
    'mastercardVolume', 'mastercardTransactions', 'mastercardFees',
    'discoverVolume', 'discoverTransactions', 'discoverFees',
    'amexVolume', 'amexTransactions', 'amexFees',
    'debitVolume', 'debitTransactions', 'debitFees',
    'interchangeFees', 'assessmentFees', 'processorFees',
    'monthlyFee', 'pciFee', 'statementFee', 'batchFee', 'otherFees',
    'effectiveRate', 'averageTicket',
    'qualifiedRate', 'midQualifiedRate', 'nonQualifiedRate'
  ];

  numericFields.forEach(field => {
    if (cleaned[field] !== null && cleaned[field] !== undefined) {
      const num = parseFloat(cleaned[field]);
      cleaned[field] = isNaN(num) ? null : num;
    }
  });

  // Calculate effective rate if we have volume and fees
  if (cleaned.totalVolume && cleaned.totalFees && !cleaned.effectiveRate) {
    cleaned.effectiveRate = (cleaned.totalFees / cleaned.totalVolume) * 100;
  }

  // Calculate average ticket if we have volume and transactions
  if (cleaned.totalVolume && cleaned.totalTransactions && !cleaned.averageTicket) {
    cleaned.averageTicket = cleaned.totalVolume / cleaned.totalTransactions;
  }

  return cleaned;
}

/**
 * Get AI-powered analysis and recommendations
 */
export async function getAIAnalysis(statementData, calculatedAnalysis, apiKey) {
  if (!apiKey) {
    return null;
  }

  const prompt = `You are an expert merchant services consultant helping a PCBancard sales agent.

MERCHANT DATA:
${JSON.stringify(statementData, null, 2)}

ANALYSIS RESULTS:
${JSON.stringify(calculatedAnalysis, null, 2)}

Provide actionable insights in this format:

### KEY FINDINGS
List 3-5 specific issues with dollar amounts

### SAVINGS OPPORTUNITY
2-3 sentence compelling summary for the agent to use

### RECOMMENDED APPROACH
Should this merchant go with Dual Pricing or Interchange Plus? Why?

### OBJECTIONS TO EXPECT
Based on the data, what objections might this merchant raise?

### CLOSING TIP
One specific tip for winning this deal

Keep response under 500 words. Be specific with numbers.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('AI analysis failed:', error);
    return null;
  }
}
