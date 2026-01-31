# BrochureTracker Learning System Architecture
## Self-Improving Statement Analysis via RAG

### The Vision

Every statement processed makes the system smarter. When BrochureTracker sees a new CardConnect statement, it remembers how it successfully extracted data from the last 50 CardConnect statements. When it encounters a new processor format, it finds the most similar formats it's seen before and uses those as examples.

**Result:** Faster, more accurate extraction that improves with every use.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NEW STATEMENT UPLOADED                        │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: IDENTIFY PROCESSOR                                          │
│  • Extract text/visual features                                      │
│  • Search knowledge base for similar statements                      │
│  • Match to known processor (CardConnect, First Data, Clover, etc.) │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: RETRIEVE SIMILAR EXAMPLES                                   │
│  • Vector search: "Find 5 most similar statements"                  │
│  • Pull successful extractions for this processor                   │
│  • Get extraction patterns that worked before                       │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: ENHANCED EXTRACTION                                         │
│  • Send to Claude WITH retrieved examples (few-shot learning)       │
│  • "Here are 5 similar CardConnect statements and their extractions"│
│  • AI uses examples to extract current statement accurately         │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: GENERATE PROPOSAL                                           │
│  • Use extracted data to create proposal                            │
│  • Include industry-specific talking points from knowledge base     │
│  • Customize based on similar merchant profiles                     │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: LEARN & STORE                                               │
│  • Store successful extraction in knowledge base                    │
│  • Update processor patterns                                        │
│  • Record any user corrections                                      │
│  • System gets smarter for next time                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Architecture

### What We Store

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KNOWLEDGE BASE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📁 PROCESSOR PROFILES                                               │
│     • CardConnect, First Data, Clover, Square, Toast, etc.          │
│     • Statement format signatures                                    │
│     • Field locations and patterns                                   │
│     • Common fee structures                                          │
│                                                                      │
│  📁 STATEMENT EXTRACTIONS (anonymized)                               │
│     • Raw text/structure (no PII)                                   │
│     • Extracted fields                                              │
│     • Extraction confidence scores                                  │
│     • Vector embeddings for similarity search                       │
│                                                                      │
│  📁 FEE DICTIONARY                                                   │
│     • Fee name → meaning/category mapping                           │
│     • "NABU FEES" = MasterCard network fee                          │
│     • "PCI NON COMP" = PCI compliance penalty                       │
│     • Industry benchmarks for each fee                              │
│                                                                      │
│  📁 INDUSTRY PROFILES                                                │
│     • Dental: typical rates, volumes, card mix                      │
│     • Restaurant: tip handling, high debit %                        │
│     • Retail: seasonal patterns, average tickets                    │
│     • E-commerce: CNP rates, chargeback patterns                    │
│                                                                      │
│  📁 PROPOSAL TEMPLATES                                               │
│     • Industry-specific talking points                              │
│     • Successful closing phrases                                    │
│     • Objection handlers                                            │
│                                                                      │
│  📁 FEEDBACK & CORRECTIONS                                           │
│     • User corrections to extractions                               │
│     • "AI said $3,307 but correct is $3,207"                       │
│     • Used to improve future extractions                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### PostgreSQL + pgvector (for embeddings)

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Processor profiles
CREATE TABLE processors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,           -- "CardConnect", "First Data"
  aliases TEXT[],                        -- ["CardConnect Direct", "Fiserv CardConnect"]
  format_signature TEXT,                 -- Key text patterns to identify
  field_patterns JSONB,                  -- Where to find specific fields
  common_fees JSONB,                     -- Typical fee structure
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Statement extractions (anonymized)
CREATE TABLE statement_extractions (
  id SERIAL PRIMARY KEY,
  processor_id INTEGER REFERENCES processors(id),
  
  -- Anonymized statement data
  statement_hash VARCHAR(64),            -- Hash of original for dedup
  statement_text TEXT,                   -- Anonymized text (no merchant name/address)
  statement_embedding vector(1536),      -- OpenAI/Claude embedding for similarity
  
  -- Extracted data (anonymized)
  volume_range VARCHAR(20),              -- "50k-100k" not exact amount
  transaction_count INTEGER,
  effective_rate DECIMAL(5,4),
  fee_structure JSONB,                   -- Detailed fee breakdown
  card_mix JSONB,                        -- % by card type
  
  -- Extraction metadata
  extraction_method VARCHAR(50),         -- "claude-pdf", "pdf-parse", "vision"
  extraction_confidence DECIMAL(3,2),    -- 0.00-1.00
  extraction_prompt TEXT,                -- The prompt that worked
  
  -- Learning data
  user_corrections JSONB,                -- Any corrections made
  was_successful BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX ON statement_extractions 
USING ivfflat (statement_embedding vector_cosine_ops);

-- Fee dictionary
CREATE TABLE fee_dictionary (
  id SERIAL PRIMARY KEY,
  fee_name VARCHAR(100),                 -- "NABU FEES"
  fee_aliases TEXT[],                    -- ["NABU", "MC NABU", "MASTERCARD NABU"]
  category VARCHAR(50),                  -- "network", "interchange", "processor", "compliance"
  description TEXT,                      -- Human-readable explanation
  card_brand VARCHAR(20),                -- "mastercard", "visa", "all"
  typical_amount JSONB,                  -- {"type": "per_item", "range": [0.01, 0.03]}
  is_negotiable BOOLEAN,
  sales_talking_point TEXT               -- How to discuss with merchant
);

-- Industry profiles
CREATE TABLE industry_profiles (
  id SERIAL PRIMARY KEY,
  industry_name VARCHAR(100),            -- "Dental", "Restaurant"
  mcc_codes INTEGER[],                   -- [8021, 8011] for dental
  
  -- Typical metrics
  avg_ticket_range JSONB,                -- {"min": 150, "max": 400}
  monthly_volume_range JSONB,
  typical_card_mix JSONB,                -- {"visa": 35, "mc": 25, "amex": 10, "debit": 30}
  typical_effective_rate JSONB,
  
  -- Sales intelligence
  pain_points TEXT[],                    -- ["PCI compliance", "monthly fees"]
  value_propositions TEXT[],
  common_objections JSONB,               -- {"objection": "response"}
  best_solution VARCHAR(50),             -- "dual_pricing" or "interchange_plus"
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Proposal outcomes (for learning what works)
CREATE TABLE proposal_outcomes (
  id SERIAL PRIMARY KEY,
  extraction_id INTEGER REFERENCES statement_extractions(id),
  
  -- Proposal details
  recommended_solution VARCHAR(50),
  projected_savings DECIMAL(10,2),
  
  -- Outcome tracking
  proposal_sent BOOLEAN DEFAULT false,
  proposal_opened BOOLEAN DEFAULT false,
  merchant_signed BOOLEAN DEFAULT false,
  actual_savings DECIMAL(10,2),          -- If they signed, actual vs projected
  
  -- Feedback
  agent_feedback TEXT,
  lost_reason VARCHAR(100),              -- "price", "timing", "competitor"
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- User corrections for continuous learning
CREATE TABLE extraction_corrections (
  id SERIAL PRIMARY KEY,
  extraction_id INTEGER REFERENCES statement_extractions(id),
  field_name VARCHAR(50),                -- "total_fees"
  original_value TEXT,                   -- What AI extracted
  corrected_value TEXT,                  -- What user corrected to
  correction_type VARCHAR(20),           -- "wrong_value", "missing", "extra"
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## RAG Implementation

### 1. Statement Embedding & Storage

```javascript
const { OpenAI } = require('openai');
const { Pool } = require('pg');

const openai = new OpenAI();
const db = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Create embedding for a statement and store it
 */
async function storeStatementExtraction(statementText, extractedData, processorName) {
  // Anonymize the statement (remove merchant name, address, account numbers)
  const anonymizedText = anonymizeStatement(statementText);
  
  // Create embedding for similarity search
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: anonymizedText.substring(0, 8000) // Limit for embedding
  });
  
  const embedding = embeddingResponse.data[0].embedding;
  
  // Find or create processor
  const processor = await findOrCreateProcessor(processorName);
  
  // Store extraction
  const result = await db.query(`
    INSERT INTO statement_extractions (
      processor_id,
      statement_hash,
      statement_text,
      statement_embedding,
      volume_range,
      transaction_count,
      effective_rate,
      fee_structure,
      card_mix,
      extraction_method,
      extraction_confidence
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id
  `, [
    processor.id,
    hashStatement(statementText),
    anonymizedText,
    JSON.stringify(embedding), // pgvector accepts JSON array
    getVolumeRange(extractedData.total_volume),
    extractedData.total_transactions,
    extractedData.effective_rate,
    JSON.stringify(extractedData.fee_breakdown),
    JSON.stringify(extractedData.card_mix),
    'claude-pdf',
    0.95
  ]);
  
  return result.rows[0].id;
}

/**
 * Anonymize statement for storage
 */
function anonymizeStatement(text) {
  return text
    // Remove merchant names (usually after "Prepared for" or at top)
    .replace(/(?:prepared for|merchant name)[:\s]+([^\n]+)/gi, 'MERCHANT_NAME')
    // Remove addresses
    .replace(/\d+\s+[\w\s]+(?:st|street|ave|avenue|rd|road|blvd|dr|drive)[\w\s,]+\d{5}/gi, 'ADDRESS')
    // Remove account/merchant numbers
    .replace(/(?:merchant|account|mid)[#:\s]*\d{10,}/gi, 'MERCHANT_NUMBER')
    // Remove phone numbers
    .replace(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, 'PHONE')
    // Remove email addresses
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, 'EMAIL');
}

/**
 * Get volume range bucket for privacy
 */
function getVolumeRange(volume) {
  if (volume < 10000) return '0-10k';
  if (volume < 25000) return '10k-25k';
  if (volume < 50000) return '25k-50k';
  if (volume < 100000) return '50k-100k';
  if (volume < 250000) return '100k-250k';
  if (volume < 500000) return '250k-500k';
  return '500k+';
}
```

### 2. Similar Statement Retrieval

```javascript
/**
 * Find similar statements for few-shot learning
 */
async function findSimilarStatements(statementText, limit = 5) {
  // Create embedding for the new statement
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: statementText.substring(0, 8000)
  });
  
  const embedding = embeddingResponse.data[0].embedding;
  
  // Vector similarity search
  const result = await db.query(`
    SELECT 
      se.*,
      p.name as processor_name,
      1 - (se.statement_embedding <=> $1) as similarity
    FROM statement_extractions se
    JOIN processors p ON se.processor_id = p.id
    WHERE se.was_successful = true
    ORDER BY se.statement_embedding <=> $1
    LIMIT $2
  `, [JSON.stringify(embedding), limit]);
  
  return result.rows;
}

/**
 * Find statements from same processor
 */
async function findProcessorExamples(processorName, limit = 5) {
  const result = await db.query(`
    SELECT se.*, p.name as processor_name
    FROM statement_extractions se
    JOIN processors p ON se.processor_id = p.id
    WHERE p.name ILIKE $1 OR $1 = ANY(p.aliases)
    AND se.was_successful = true
    ORDER BY se.extraction_confidence DESC, se.created_at DESC
    LIMIT $2
  `, [`%${processorName}%`, limit]);
  
  return result.rows;
}
```

### 3. Enhanced Extraction with RAG

```javascript
/**
 * Extract data using RAG-enhanced prompting
 */
async function extractWithRAG(statementBuffer, statementText) {
  // Step 1: Identify processor
  const processorName = identifyProcessor(statementText);
  console.log('Identified processor:', processorName);
  
  // Step 2: Find similar successful extractions
  const similarStatements = await findSimilarStatements(statementText, 3);
  const processorExamples = await findProcessorExamples(processorName, 2);
  
  // Combine and deduplicate examples
  const examples = [...similarStatements, ...processorExamples]
    .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
    .slice(0, 5);
  
  console.log(`Found ${examples.length} similar examples for few-shot learning`);
  
  // Step 3: Get relevant fee definitions
  const feeDefinitions = await getFeeDefinitions();
  
  // Step 4: Build enhanced prompt with examples
  const enhancedPrompt = buildRAGPrompt(statementText, examples, feeDefinitions);
  
  // Step 5: Extract with Claude
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
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
              data: statementBuffer.toString('base64')
            }
          },
          {
            type: "text",
            text: enhancedPrompt
          }
        ]
      }
    ]
  });
  
  // Step 6: Parse and validate
  const extraction = parseExtraction(response.content[0].text);
  
  // Step 7: Store for future learning
  await storeStatementExtraction(statementText, extraction, processorName);
  
  return extraction;
}

/**
 * Build RAG-enhanced prompt with examples
 */
function buildRAGPrompt(statementText, examples, feeDefinitions) {
  let prompt = `You are an expert payment processing statement analyzer. Extract all data from the attached statement.

`;

  // Add examples if available
  if (examples.length > 0) {
    prompt += `## EXAMPLES OF SUCCESSFUL EXTRACTIONS

Here are examples of similar statements I've successfully extracted before. Use these as reference for format and field locations:

`;
    
    examples.forEach((ex, i) => {
      prompt += `### Example ${i + 1} (${ex.processor_name}, ${ex.volume_range} volume, ${(ex.similarity * 100).toFixed(0)}% similar)

Fee Structure Found:
${JSON.stringify(ex.fee_structure, null, 2)}

Card Mix:
${JSON.stringify(ex.card_mix, null, 2)}

Effective Rate: ${ex.effective_rate}%

---
`;
    });
  }

  // Add fee definitions
  prompt += `## FEE DEFINITIONS

Use these definitions to categorize fees correctly:

`;
  
  Object.entries(feeDefinitions).forEach(([category, fees]) => {
    prompt += `### ${category}\n`;
    fees.forEach(fee => {
      prompt += `- ${fee.fee_name}: ${fee.description}\n`;
    });
    prompt += '\n';
  });

  // Main extraction instructions
  prompt += `## EXTRACTION INSTRUCTIONS

Analyze the attached statement and extract ALL data. Return ONLY valid JSON:

{
  "processor": "string - the processor name",
  "merchant": {
    "name": "string",
    "address": "string", 
    "merchant_number": "string"
  },
  "statement_period": {
    "start": "string",
    "end": "string"
  },
  "summary": {
    "total_volume": number,
    "total_transactions": number,
    "total_fees": number,
    "effective_rate": number,
    "amount_funded": number
  },
  "card_breakdown": [
    {
      "card_type": "string",
      "volume": number,
      "transactions": number,
      "average_ticket": number
    }
  ],
  "fee_breakdown": {
    "interchange": number,
    "assessments": number,
    "processor_markup": number,
    "monthly_fees": number,
    "per_item_fees": number,
    "other_fees": number
  },
  "detailed_fees": [
    {
      "name": "string",
      "category": "string",
      "amount": number,
      "is_negotiable": boolean
    }
  ],
  "issues_found": [
    {
      "issue": "string",
      "severity": "high|medium|low",
      "potential_savings": number
    }
  ]
}`;

  return prompt;
}
```

### 4. Processor Identification

```javascript
/**
 * Identify processor from statement text
 */
function identifyProcessor(text) {
  const processorPatterns = {
    'CardConnect': [/cardconnect/i, /card connect/i, /clover connect/i],
    'First Data': [/first data/i, /fiserv/i, /fdms/i],
    'TSYS': [/tsys/i, /transfirst/i, /cayan/i],
    'Worldpay': [/worldpay/i, /vantiv/i, /fisglobal/i],
    'Square': [/square/i, /squareup/i],
    'Stripe': [/stripe/i],
    'PayPal': [/paypal/i, /braintree/i],
    'Heartland': [/heartland/i, /global payments/i],
    'Elavon': [/elavon/i, /us bank/i],
    'Chase Paymentech': [/chase/i, /paymentech/i],
    'PNC': [/pnc merchant/i],
    'Wells Fargo': [/wells fargo merchant/i],
    'Clover': [/clover network/i],
    'Toast': [/toast/i],
    'Helcim': [/helcim/i],
    'Stax': [/stax/i, /fattmerchant/i],
    'Payment Depot': [/payment depot/i],
    'Dharma': [/dharma/i],
  };
  
  for (const [processor, patterns] of Object.entries(processorPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return processor;
      }
    }
  }
  
  return 'Unknown';
}
```

### 5. Feedback Loop for Learning

```javascript
/**
 * Record user correction for learning
 */
async function recordCorrection(extractionId, fieldName, originalValue, correctedValue) {
  await db.query(`
    INSERT INTO extraction_corrections (
      extraction_id, field_name, original_value, corrected_value, correction_type
    ) VALUES ($1, $2, $3, $4, $5)
  `, [
    extractionId,
    fieldName,
    String(originalValue),
    String(correctedValue),
    originalValue ? 'wrong_value' : 'missing'
  ]);
  
  // Update the extraction record
  await db.query(`
    UPDATE statement_extractions 
    SET user_corrections = COALESCE(user_corrections, '{}'::jsonb) || $2::jsonb
    WHERE id = $1
  `, [
    extractionId,
    JSON.stringify({ [fieldName]: { original: originalValue, corrected: correctedValue } })
  ]);
  
  console.log(`Recorded correction for ${fieldName}: ${originalValue} → ${correctedValue}`);
}

/**
 * API endpoint for corrections
 */
app.post('/api/extraction/:id/correct', async (req, res) => {
  const { id } = req.params;
  const { field, original, corrected } = req.body;
  
  await recordCorrection(id, field, original, corrected);
  
  res.json({ success: true, message: 'Correction recorded for learning' });
});
```

### 6. Industry Intelligence

```javascript
/**
 * Get industry-specific insights
 */
async function getIndustryInsights(mccCode, extractedData) {
  // Find matching industry
  const industry = await db.query(`
    SELECT * FROM industry_profiles
    WHERE $1 = ANY(mcc_codes)
    LIMIT 1
  `, [mccCode]);
  
  if (industry.rows.length === 0) {
    return null;
  }
  
  const profile = industry.rows[0];
  
  // Compare to industry benchmarks
  const insights = {
    industry: profile.industry_name,
    
    rate_comparison: compareToRange(
      extractedData.effective_rate,
      profile.typical_effective_rate
    ),
    
    volume_comparison: compareToRange(
      extractedData.total_volume,
      profile.monthly_volume_range
    ),
    
    card_mix_analysis: analyzeCardMix(
      extractedData.card_breakdown,
      profile.typical_card_mix
    ),
    
    pain_points: profile.pain_points,
    value_propositions: profile.value_propositions,
    recommended_solution: profile.best_solution,
    
    custom_talking_points: generateTalkingPoints(extractedData, profile)
  };
  
  return insights;
}
```

---

## API Endpoints

```javascript
// Statement analysis with RAG
app.post('/api/analyze-statement', upload.single('file'), async (req, res) => {
  const result = await extractWithRAG(req.file.buffer, await extractText(req.file));
  res.json(result);
});

// Get similar statements (for debugging/admin)
app.get('/api/similar-statements', async (req, res) => {
  const { text } = req.query;
  const similar = await findSimilarStatements(text);
  res.json(similar);
});

// Record correction
app.post('/api/extraction/:id/correct', async (req, res) => {
  await recordCorrection(req.params.id, req.body.field, req.body.original, req.body.corrected);
  res.json({ success: true });
});

// Get processor stats
app.get('/api/processors/stats', async (req, res) => {
  const stats = await db.query(`
    SELECT 
      p.name,
      COUNT(se.id) as extraction_count,
      AVG(se.extraction_confidence) as avg_confidence,
      AVG(se.effective_rate) as avg_effective_rate
    FROM processors p
    LEFT JOIN statement_extractions se ON p.id = se.processor_id
    GROUP BY p.id
    ORDER BY extraction_count DESC
  `);
  res.json(stats.rows);
});

// Admin: view learning progress
app.get('/api/admin/learning-stats', async (req, res) => {
  const stats = {
    total_extractions: await db.query('SELECT COUNT(*) FROM statement_extractions'),
    total_corrections: await db.query('SELECT COUNT(*) FROM extraction_corrections'),
    processors_known: await db.query('SELECT COUNT(*) FROM processors'),
    fees_catalogued: await db.query('SELECT COUNT(*) FROM fee_dictionary'),
    avg_confidence: await db.query('SELECT AVG(extraction_confidence) FROM statement_extractions')
  };
  res.json(stats);
});
```

---

## Seed Data: Fee Dictionary

```javascript
const seedFees = [
  // Interchange
  { name: 'INTERCHANGE', category: 'interchange', description: 'Base cost paid to card-issuing bank', negotiable: false },
  
  // Visa Fees
  { name: 'CR DUES AND ASSESS', category: 'assessment', card_brand: 'visa', description: 'Visa credit card assessment fee', negotiable: false },
  { name: 'DB DUES AND ASSESS', category: 'assessment', card_brand: 'visa', description: 'Visa debit card assessment fee', negotiable: false },
  { name: 'ACQR PROCESSOR FEES', category: 'network', card_brand: 'visa', description: 'Visa acquirer processor fee', negotiable: false },
  { name: 'FIXED NETWORK FEE', category: 'network', card_brand: 'visa', description: 'Visa fixed network access fee', negotiable: false },
  { name: 'TRAN INTEGRITY FEE', category: 'network', card_brand: 'visa', description: 'Visa transaction integrity fee for mismatched data', negotiable: false },
  
  // MasterCard Fees  
  { name: 'NABU FEES', category: 'network', card_brand: 'mastercard', description: 'MasterCard Network Access and Brand Usage fee', negotiable: false },
  { name: 'DUES & ASSESSMENTS', category: 'assessment', card_brand: 'mastercard', description: 'MasterCard assessment fee', negotiable: false },
  { name: 'KILOBYTE AUTH FEE', category: 'network', card_brand: 'mastercard', description: 'MasterCard data transmission fee', negotiable: false },
  { name: 'LICENSE RATE', category: 'network', card_brand: 'mastercard', description: 'MasterCard licensing fee', negotiable: false },
  
  // Discover Fees
  { name: 'DSCV AUTH FEE', category: 'network', card_brand: 'discover', description: 'Discover authorization fee', negotiable: false },
  { name: 'DSCV DATA USAGE FEE', category: 'network', card_brand: 'discover', description: 'Discover data usage fee', negotiable: false },
  { name: 'DIGITAL INVESTMENT FEE', category: 'network', card_brand: 'discover', description: 'Discover digital investment fee', negotiable: false },
  
  // Amex Fees
  { name: 'AMEX ACQR TRANSACTION FEE', category: 'network', card_brand: 'amex', description: 'American Express acquirer fee', negotiable: false },
  { name: 'NETWORK FEE', category: 'network', card_brand: 'amex', description: 'Amex network fee', negotiable: false },
  
  // Processor Fees (NEGOTIABLE)
  { name: 'DISC 1', category: 'processor_markup', description: 'Processor discount/markup rate', negotiable: true, talking_point: 'This is pure processor profit - we can eliminate it' },
  { name: 'OTHER ITEM FEES', category: 'processor_markup', description: 'Per-transaction processor fee', negotiable: true },
  { name: 'BATCH HEADER', category: 'processor_fee', description: 'Fee per batch settlement', negotiable: true },
  
  // Monthly Fees (NEGOTIABLE)
  { name: 'PCI NON COMP FEE', category: 'monthly_fee', description: 'PCI non-compliance penalty', negotiable: true, talking_point: 'We include free PCI compliance - this fee disappears' },
  { name: 'REGULATORY PRODUCT', category: 'monthly_fee', description: 'Regulatory compliance fee', negotiable: true },
  { name: 'CARDPOINTE FEE', category: 'monthly_fee', description: 'Gateway/portal access fee', negotiable: true },
  { name: 'DATA BREACH', category: 'monthly_fee', description: 'Data breach insurance fee', negotiable: true },
  { name: 'STATEMENT FEE', category: 'monthly_fee', description: 'Paper statement fee', negotiable: true },
  
  // Gateway Fees
  { name: 'CPU GTWY', category: 'gateway', description: 'Gateway transaction fee', negotiable: true },
  { name: 'AVS CPU-G', category: 'gateway', description: 'Address verification via gateway', negotiable: true },
  { name: 'AVS ECIC-G', category: 'gateway', description: 'Enhanced AVS via gateway', negotiable: true },
];
```

---

## Implementation Phases

### Phase 1: Basic Storage (Week 1)
- Set up PostgreSQL with pgvector
- Create schema
- Store extractions after each analysis
- Basic processor identification

### Phase 2: Similarity Search (Week 2)
- Implement embedding generation
- Vector similarity search
- Retrieve examples for few-shot prompts

### Phase 3: Enhanced Extraction (Week 3)
- Build RAG-enhanced prompts
- Add fee dictionary lookups
- Improve extraction accuracy

### Phase 4: Feedback Loop (Week 4)
- User correction UI
- Store corrections
- Weight recent corrections in future extractions

### Phase 5: Intelligence Layer (Week 5+)
- Industry profiles
- Competitive analysis
- Proposal outcome tracking

---

## Infrastructure Costs

| Service | Purpose | Cost |
|---------|---------|------|
| **Supabase** | PostgreSQL + pgvector | Free tier / $25/mo |
| **OpenAI Embeddings** | text-embedding-3-small | ~$0.02 per 1M tokens |
| **Storage** | Statement archives | ~$5/mo for 10GB |

**Total: ~$30-50/month** to make the system learn from every statement.

---

## The Competitive Moat

After processing 1,000 statements:
- Know 50+ processor formats intimately
- Have 500+ fee pattern examples
- Industry benchmarks from real data
- Extraction accuracy: 95%+ vs 70% for generic AI

After 10,000 statements:
- Most comprehensive processor database in the industry
- Can identify processor from partial text
- Predict savings before full analysis
- **No competitor can replicate without processing 10,000 statements**

This is how you build a defensible AI product.
