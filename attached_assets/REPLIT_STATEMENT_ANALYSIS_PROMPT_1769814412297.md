# Replit AI Prompt: Merchant Statement Analysis Agent

Copy this entire prompt into Replit to build an AI-powered statement analysis tool for PCBancard agents.

---

## PROMPT START

You are building a **Merchant Statement Analysis Agent** for PCBancard. This tool allows sales agents to upload a merchant's current processing statement, and the AI will:

1. Extract and parse statement data
2. Analyze fees against actual interchange costs
3. Identify overcharges and hidden fees
4. Calculate potential savings
5. Generate negotiation talking points for the agent

---

## SYSTEM ARCHITECTURE

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Agent Uploads  │────▶│  PDF Parser /    │────▶│  AI Analysis    │
│  Statement PDF  │     │  OCR Extraction  │     │  Engine         │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                        ┌──────────────────┐              │
                        │  Interchange     │◀─────────────┘
                        │  Reference Data  │
                        └──────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Analysis Report │
                        │  + Negotiation   │
                        │  Talking Points  │
                        └──────────────────┘
```

---

## CORE FEATURES TO BUILD

### 1. Statement Upload & Parsing
- Accept PDF uploads (and images via OCR)
- Extract key data points from various processor formats
- Handle statements from: First Data/Fiserv, TSYS, Worldpay, Heartland, Square, Stripe, Clover, etc.

### 2. Data Extraction Targets
Extract these fields from every statement:

```javascript
const statementData = {
  // Processor Info
  processorName: '',
  statementPeriod: { start: '', end: '' },
  merchantName: '',
  merchantId: '',
  
  // Volume Summary
  totalVolume: 0,
  totalTransactions: 0,
  averageTicket: 0,
  
  // Card Mix Breakdown
  cardMix: {
    visa: { volume: 0, transactions: 0, fees: 0 },
    mastercard: { volume: 0, transactions: 0, fees: 0 },
    discover: { volume: 0, transactions: 0, fees: 0 },
    amex: { volume: 0, transactions: 0, fees: 0 },
    debit: { volume: 0, transactions: 0, fees: 0 },
    pinDebit: { volume: 0, transactions: 0, fees: 0 }
  },
  
  // Fee Categories
  fees: {
    interchange: 0,
    assessments: 0,
    processorMarkup: 0,
    monthlyFees: 0,
    pciFees: 0,
    equipmentFees: 0,
    otherFees: 0,
    totalFees: 0
  },
  
  // Qualification Levels (if shown)
  qualificationBreakdown: {
    qualified: { volume: 0, rate: 0 },
    midQualified: { volume: 0, rate: 0 },
    nonQualified: { volume: 0, rate: 0 }
  },
  
  // Calculated Metrics
  effectiveRate: 0,
  perTransactionAverage: 0
};
```

### 3. Interchange Reference Database
Store actual interchange rates for comparison:

```javascript
const interchangeRates = {
  visa: {
    retail: {
      debitRegulated: { percent: 0.05, fixed: 0.21 },
      debitUnregulated: { percent: 0.80, fixed: 0.15 },
      cpsRetail: { percent: 1.65, fixed: 0.10 },
      rewards1: { percent: 1.65, fixed: 0.10 },
      rewards2: { percent: 1.95, fixed: 0.10 },
      signaturePreferred: { percent: 2.10, fixed: 0.10 },
      infinite: { percent: 2.30, fixed: 0.10 },
      commercial: { percent: 2.50, fixed: 0.10 },
      eirf: { percent: 2.70, fixed: 0.10 } // Downgrade
    },
    restaurant: {
      cpsRestaurant: { percent: 1.54, fixed: 0.10 },
      debit: { percent: 0.80, fixed: 0.15 }
    },
    ecommerce: {
      basic: { percent: 1.80, fixed: 0.10 },
      preferred: { percent: 1.95, fixed: 0.10 },
      standard: { percent: 2.70, fixed: 0.10 }
    }
  },
  mastercard: {
    retail: {
      debitRegulated: { percent: 0.05, fixed: 0.21 },
      debitUnregulated: { percent: 0.80, fixed: 0.15 },
      meritI: { percent: 1.58, fixed: 0.10 },
      world: { percent: 1.73, fixed: 0.10 },
      worldElite: { percent: 2.05, fixed: 0.10 },
      commercial: { percent: 2.50, fixed: 0.10 }
    },
    restaurant: {
      restaurant: { percent: 1.47, fixed: 0.10 },
      qsr: { percent: 1.47, fixed: 0.05 }
    }
  },
  discover: {
    retail: {
      retail: { percent: 1.56, fixed: 0.10 },
      rewards: { percent: 1.71, fixed: 0.10 },
      premiumPlus: { percent: 2.15, fixed: 0.10 }
    },
    restaurant: {
      restaurant: { percent: 1.40, fixed: 0.10 }
    }
  },
  amex: {
    optblue: {
      retail: { percent: 2.00, fixed: 0.10 },
      restaurant: { percent: 1.90, fixed: 0.10 },
      ecommerce: { percent: 2.40, fixed: 0.10 }
    }
  },
  assessments: {
    visa: 0.13,
    mastercard: 0.13,
    discover: 0.13,
    amex: 0.15
  }
};
```

---

## ANALYSIS ENGINE

### Calculate True Interchange Cost

```javascript
function calculateTrueInterchange(statementData, merchantType = 'retail') {
  const { cardMix, totalVolume, totalTransactions } = statementData;
  
  let trueInterchangeCost = 0;
  let trueAssessmentCost = 0;
  
  // Calculate for each card brand
  Object.entries(cardMix).forEach(([brand, data]) => {
    if (data.volume > 0) {
      // Get appropriate interchange rate based on merchant type
      const rates = getInterchangeRate(brand, merchantType, data.avgTicket);
      
      // Interchange = (Volume × Percent) + (Transactions × Fixed Fee)
      const interchangeFee = (data.volume * rates.percent / 100) + 
                            (data.transactions * rates.fixed);
      
      // Assessment fees
      const assessmentFee = data.volume * (interchangeRates.assessments[brand] || 0.13) / 100;
      
      trueInterchangeCost += interchangeFee;
      trueAssessmentCost += assessmentFee;
    }
  });
  
  return {
    trueInterchange: trueInterchangeCost,
    trueAssessments: trueAssessmentCost,
    trueWholesaleCost: trueInterchangeCost + trueAssessmentCost,
    trueWholesaleRate: ((trueInterchangeCost + trueAssessmentCost) / totalVolume) * 100
  };
}
```

### Identify Markup and Overcharges

```javascript
function analyzeMarkup(statementData, trueCosts) {
  const { fees, totalVolume } = statementData;
  
  // Calculate processor markup
  const statedInterchange = fees.interchange || 0;
  const processorMarkup = fees.totalFees - trueCosts.trueWholesaleCost;
  const markupRate = (processorMarkup / totalVolume) * 100;
  
  // Identify specific overcharges
  const overcharges = [];
  
  // Check if interchange is inflated
  if (statedInterchange > trueCosts.trueInterchange * 1.05) {
    overcharges.push({
      type: 'INFLATED_INTERCHANGE',
      description: 'Interchange fees appear higher than actual cost',
      amount: statedInterchange - trueCosts.trueInterchange,
      severity: 'HIGH'
    });
  }
  
  // Check for excessive monthly fees
  if (fees.monthlyFees > 50) {
    overcharges.push({
      type: 'HIGH_MONTHLY_FEES',
      description: `Monthly fees of $${fees.monthlyFees} exceed industry standard`,
      amount: fees.monthlyFees - 25, // $25 is reasonable
      severity: 'MEDIUM'
    });
  }
  
  // Check for PCI non-compliance fees
  if (fees.pciFees > 20) {
    overcharges.push({
      type: 'PCI_FEES',
      description: 'PCI compliance fees are excessive or include non-compliance penalty',
      amount: fees.pciFees,
      severity: 'MEDIUM'
    });
  }
  
  // Check effective rate vs industry standard
  const effectiveRate = statementData.effectiveRate;
  const industryAverage = 2.5; // Typical retail rate
  
  if (effectiveRate > industryAverage + 0.5) {
    overcharges.push({
      type: 'HIGH_EFFECTIVE_RATE',
      description: `Effective rate of ${effectiveRate.toFixed(2)}% is significantly above industry average`,
      amount: ((effectiveRate - industryAverage) / 100) * totalVolume,
      severity: 'HIGH'
    });
  }
  
  return {
    processorMarkup,
    markupRate,
    overcharges,
    totalOverchargeAmount: overcharges.reduce((sum, o) => sum + o.amount, 0)
  };
}
```

### Detect Hidden Fees

```javascript
function detectHiddenFees(statementData) {
  const hiddenFees = [];
  const { fees } = statementData;
  
  // Common hidden fees to look for
  const feePatterns = [
    { name: 'Annual Fee', threshold: 0, typical: 0 },
    { name: 'Statement Fee', threshold: 10, typical: 5 },
    { name: 'Batch Fee', threshold: 0.30, typical: 0.10, perItem: true },
    { name: 'Transaction Fee', threshold: 0.15, typical: 0.05, perItem: true },
    { name: 'Gateway Fee', threshold: 25, typical: 10 },
    { name: 'IRS Reporting Fee', threshold: 5, typical: 0 },
    { name: 'Regulatory Fee', threshold: 10, typical: 0 },
    { name: 'Account Maintenance', threshold: 15, typical: 0 },
    { name: 'Minimum Processing Fee', threshold: 25, typical: 0 },
    { name: 'Early Termination Fee', threshold: 0, typical: 0, warning: true },
    { name: 'Equipment Lease', threshold: 50, typical: 0, warning: true }
  ];
  
  // Analyze 'other fees' line items
  if (fees.otherFees > 50) {
    hiddenFees.push({
      type: 'UNEXPLAINED_FEES',
      description: 'Statement contains unexplained "other" fees',
      amount: fees.otherFees,
      recommendation: 'Request itemized breakdown of all fees'
    });
  }
  
  return hiddenFees;
}
```

---

## AI ANALYSIS PROMPT

When analyzing a statement, use this prompt structure with Claude API:

```javascript
async function analyzeStatementWithAI(extractedData, trueCosts, markupAnalysis) {
  const prompt = `You are a merchant services pricing expert analyzing a processing statement for a PCBancard sales agent.

## EXTRACTED STATEMENT DATA
${JSON.stringify(extractedData, null, 2)}

## TRUE INTERCHANGE COSTS (Calculated)
${JSON.stringify(trueCosts, null, 2)}

## MARKUP ANALYSIS
${JSON.stringify(markupAnalysis, null, 2)}

## YOUR TASK

Analyze this merchant's statement and provide:

### 1. EXECUTIVE SUMMARY
- Current effective rate vs what it should be
- Total monthly overcharge amount
- Annual savings potential with PCBancard

### 2. FEE BREAKDOWN ANALYSIS
For each fee category, explain:
- What the merchant is paying
- What they SHOULD be paying (interchange + reasonable markup)
- The variance/overcharge amount

### 3. RED FLAGS IDENTIFIED
List specific issues like:
- Inflated interchange pass-through
- Excessive per-transaction fees
- Hidden fees or junk fees
- Tiered pricing manipulation
- Downgrade exploitation

### 4. NEGOTIATION TALKING POINTS
Provide specific scripts the agent can use:
- Opening statement about findings
- Key questions to ask the merchant
- Objection handlers for common responses
- Closing statements to win the deal

### 5. PCBancard SAVINGS PROPOSAL
Calculate and present:
- Monthly savings with PCBancard dual pricing
- Annual savings projection
- Effective rate with PCBancard vs current processor

### 6. COMPETITIVE INTELLIGENCE
If processor is identified, note:
- Known issues with this processor
- Common complaints from merchants
- Contract gotchas to mention

Format your response as a structured report the agent can reference during their sales call.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return response.content[0].text;
}
```

---

## NEGOTIATION TALKING POINTS GENERATOR

```javascript
function generateTalkingPoints(analysis) {
  const { 
    effectiveRate, 
    trueCosts, 
    markupAnalysis, 
    monthlyVolume,
    annualSavings 
  } = analysis;
  
  return {
    opening: `
"I've completed an analysis of your processing statement, and I found some significant opportunities for savings. 
You're currently paying an effective rate of ${effectiveRate.toFixed(2)}%, but based on your card mix and volume, 
your true interchange cost is only ${trueCosts.trueWholesaleRate.toFixed(2)}%. 

That means you're paying approximately ${markupAnalysis.markupRate.toFixed(2)}% in markup - 
that's $${markupAnalysis.processorMarkup.toFixed(2)} per month that could stay in your pocket."
    `,
    
    keyFindings: [
      `Your current processor is charging you $${markupAnalysis.processorMarkup.toFixed(2)} per month above actual interchange cost`,
      `You're paying ${effectiveRate.toFixed(2)}% when you should be paying closer to ${(trueCosts.trueWholesaleRate + 0.30).toFixed(2)}%`,
      `Annual savings opportunity: $${annualSavings.toFixed(2)}`
    ],
    
    questions: [
      "When was the last time your processor did a rate review with you?",
      "Are you aware that interchange rates are set by Visa and Mastercard, not your processor?",
      "Did you know that with dual pricing, you could eliminate processing fees entirely?",
      "How would an extra $${(annualSavings / 12).toFixed(0)} per month impact your business?"
    ],
    
    objectionHandlers: {
      "I'm locked in a contract": `
"I understand. Let me ask - do you know the exact terms of your early termination clause? 
Often, the savings we provide can offset any termination fee within just a few months. 
Plus, we may be able to help cover that fee as part of your onboarding."
      `,
      
      "I'm happy with my current processor": `
"I'm glad they've been treating you well. But here's the thing - being happy doesn't mean you're getting the best deal. 
Based on this analysis, you're paying $${markupAnalysis.processorMarkup.toFixed(2)} more than necessary every single month. 
That's $${annualSavings.toFixed(2)} per year. Wouldn't you rather keep that money in your business?"
      `,
      
      "I don't have time to switch": `
"I completely understand you're busy running your business. That's exactly why we handle everything. 
The switch takes about 15 minutes of your time - we do all the paperwork, program the terminal, and train your staff. 
And for those 15 minutes, you'll save $${annualSavings.toFixed(2)} this year."
      `,
      
      "I need to think about it": `
"Absolutely, this is an important decision. While you're thinking, consider this: 
every month you wait costs you $${markupAnalysis.processorMarkup.toFixed(2)} in unnecessary fees. 
What questions do you have that I can answer right now to help you make this decision?"
      `
    },
    
    closing: `
"Based on everything we've discussed, switching to PCBancard will save you $${annualSavings.toFixed(2)} annually. 
We offer transparent interchange-plus pricing with no hidden fees, and our dual pricing program can 
reduce your effective rate to near zero. 

I can have you set up and processing within 48 hours. What questions do you have before we get started?"
    `
  };
}
```

---

## SAVINGS CALCULATOR

```javascript
function calculatePCBancardSavings(statementData, merchantType = 'retail') {
  const { totalVolume, totalTransactions, fees } = statementData;
  
  // PCBancard pricing (example)
  const pcbPricing = {
    // Interchange Plus model
    interchangePlus: {
      markup: 0.20, // 0.20% over interchange
      perTransaction: 0.10,
      monthlyFee: 10,
      pciFee: 0, // Included
      batchFee: 0
    },
    // Dual Pricing model
    dualPricing: {
      serviceFee: 3.99, // % charged to card users
      effectiveMerchantCost: 0, // Merchant pays nothing
      monthlyFee: 10,
      portalFee: 10
    }
  };
  
  // Calculate true interchange
  const trueCosts = calculateTrueInterchange(statementData, merchantType);
  
  // Interchange Plus savings
  const icPlusCost = trueCosts.trueWholesaleCost + 
                     (totalVolume * pcbPricing.interchangePlus.markup / 100) +
                     (totalTransactions * pcbPricing.interchangePlus.perTransaction) +
                     pcbPricing.interchangePlus.monthlyFee;
  
  const icPlusSavings = fees.totalFees - icPlusCost;
  
  // Dual Pricing savings (merchant pays almost nothing)
  const dualPricingCost = pcbPricing.dualPricing.monthlyFee + 
                          pcbPricing.dualPricing.portalFee;
  
  const dualPricingSavings = fees.totalFees - dualPricingCost;
  
  return {
    currentMonthlyCost: fees.totalFees,
    currentEffectiveRate: (fees.totalFees / totalVolume) * 100,
    
    interchangePlus: {
      monthlyCost: icPlusCost,
      effectiveRate: (icPlusCost / totalVolume) * 100,
      monthlySavings: icPlusSavings,
      annualSavings: icPlusSavings * 12
    },
    
    dualPricing: {
      monthlyCost: dualPricingCost,
      effectiveRate: (dualPricingCost / totalVolume) * 100,
      monthlySavings: dualPricingSavings,
      annualSavings: dualPricingSavings * 12,
      note: 'Customer pays 3.99% service fee for card transactions'
    },
    
    recommendation: dualPricingSavings > icPlusSavings ? 'DUAL_PRICING' : 'INTERCHANGE_PLUS'
  };
}
```

---

## USER INTERFACE REQUIREMENTS

### Upload Screen
```
┌────────────────────────────────────────────────────────────┐
│  📄 Upload Merchant Statement                              │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │         Drag & Drop Statement PDF Here               │  │
│  │                   or click to browse                 │  │
│  │                                                      │  │
│  │         Supported: PDF, JPG, PNG                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Merchant Type: [Retail ▼]                                 │
│                                                            │
│  [ Analyze Statement ]                                     │
└────────────────────────────────────────────────────────────┘
```

### Analysis Results Screen
```
┌────────────────────────────────────────────────────────────┐
│  📊 Statement Analysis Results                             │
│  Bob's Marine - January 2025                               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  💰 SAVINGS SUMMARY                                        │
│  ┌────────────┬────────────┬────────────┐                  │
│  │ Current    │ PCBancard  │ Savings    │                  │
│  │ $1,247/mo  │ $847/mo    │ $400/mo    │                  │
│  │ 2.49%      │ 1.69%      │ $4,800/yr  │                  │
│  └────────────┴────────────┴────────────┘                  │
│                                                            │
│  🚨 RED FLAGS FOUND: 4                                     │
│  • Inflated interchange (+$127/mo)                         │
│  • Excessive PCI fee ($34.95 vs $0)                        │
│  • Hidden regulatory fee ($15/mo)                          │
│  • High effective rate (2.49% vs 1.85% expected)           │
│                                                            │
│  📋 DETAILED BREAKDOWN                   [Expand All]      │
│  ├─ Interchange Analysis                                   │
│  ├─ Fee Comparison                                         │
│  ├─ Card Mix Analysis                                      │
│  └─ Downgrade Analysis                                     │
│                                                            │
│  🗣️ NEGOTIATION SCRIPTS                  [Copy All]        │
│  ├─ Opening Statement                                      │
│  ├─ Key Talking Points                                     │
│  ├─ Objection Handlers                                     │
│  └─ Closing Script                                         │
│                                                            │
│  [ Generate Proposal PDF ]  [ Send to Merchant ]           │
└────────────────────────────────────────────────────────────┘
```

---

## PROCESSOR-SPECIFIC PARSING

Different processors format statements differently. Include parsers for:

### Common Processor Formats

```javascript
const processorParsers = {
  'firstdata': parseFirstDataStatement,
  'fiserv': parseFiservStatement,
  'tsys': parseTSYSStatement,
  'worldpay': parseWorldpayStatement,
  'heartland': parseHeartlandStatement,
  'square': parseSquareStatement,
  'stripe': parseStripeStatement,
  'clover': parseCloverStatement,
  'paypal': parsePayPalStatement,
  'toast': parseToastStatement
};

// Pattern matching to identify processor
function identifyProcessor(statementText) {
  const patterns = {
    'firstdata': /first data|fiserv|clover network/i,
    'tsys': /tsys|transfirst|cayan/i,
    'worldpay': /worldpay|vantiv|fifth third/i,
    'heartland': /heartland|global payments/i,
    'square': /square|sq\s/i,
    'stripe': /stripe/i,
    'clover': /clover/i
  };
  
  for (const [processor, pattern] of Object.entries(patterns)) {
    if (pattern.test(statementText)) {
      return processor;
    }
  }
  
  return 'generic';
}
```

---

## ERROR HANDLING

```javascript
function handleParsingErrors(error, statementData) {
  const suggestions = [];
  
  if (!statementData.totalVolume) {
    suggestions.push({
      field: 'totalVolume',
      message: 'Could not extract total volume. Please enter manually.',
      inputType: 'currency'
    });
  }
  
  if (!statementData.totalTransactions) {
    suggestions.push({
      field: 'totalTransactions',
      message: 'Could not extract transaction count. Please enter manually.',
      inputType: 'number'
    });
  }
  
  if (!statementData.fees.totalFees) {
    suggestions.push({
      field: 'totalFees',
      message: 'Could not extract total fees. Please enter manually.',
      inputType: 'currency'
    });
  }
  
  return {
    partialData: statementData,
    needsManualInput: suggestions,
    canProceed: suggestions.length < 3
  };
}
```

---

## OUTPUT: ANALYSIS REPORT STRUCTURE

```javascript
const analysisReport = {
  // Header
  merchantName: 'Bob\'s Marine',
  statementPeriod: 'January 2025',
  processorIdentified: 'First Data',
  analysisDate: new Date(),
  
  // Executive Summary
  summary: {
    currentEffectiveRate: 2.49,
    expectedEffectiveRate: 1.85,
    variance: 0.64,
    monthlyOvercharge: 320,
    annualSavingsOpportunity: 3840
  },
  
  // Detailed Analysis
  interchange: {
    statedOnStatement: 892.50,
    actualCalculated: 765.00,
    inflationAmount: 127.50,
    inflationPercent: 16.6
  },
  
  // Fee Analysis
  fees: {
    legitimate: [
      { name: 'Interchange', amount: 765, status: 'FAIR' },
      { name: 'Assessments', amount: 65, status: 'FAIR' }
    ],
    questionable: [
      { name: 'Monthly Fee', amount: 25, status: 'HIGH', suggestion: 'Should be $10' },
      { name: 'PCI Fee', amount: 34.95, status: 'EXCESSIVE', suggestion: 'PCBancard includes free' }
    ],
    junk: [
      { name: 'Regulatory Fee', amount: 15, status: 'JUNK', suggestion: 'No such requirement' },
      { name: 'Account Maintenance', amount: 12.50, status: 'JUNK', suggestion: 'Duplicate of monthly fee' }
    ]
  },
  
  // Savings Projection
  pcbancardProjection: {
    interchangePlus: {
      monthlyFees: 847,
      effectiveRate: 1.69,
      monthlySavings: 400,
      annualSavings: 4800
    },
    dualPricing: {
      monthlyFees: 20,
      effectiveRate: 0.04,
      monthlySavings: 1227,
      annualSavings: 14724
    }
  },
  
  // Talking Points
  talkingPoints: {
    opening: '...',
    keyPoints: ['...'],
    objectionHandlers: { ... },
    closing: '...'
  },
  
  // Recommended Actions
  recommendations: [
    'Switch to PCBancard dual pricing for maximum savings',
    'Eliminate junk fees immediately',
    'Request early termination fee waiver or buyout'
  ]
};
```

---

## IMPLEMENTATION CHECKLIST

Build the following components:

- [ ] PDF upload and extraction (use pdf-parse or similar)
- [ ] OCR fallback for image-based statements (use Tesseract.js)
- [ ] Interchange rate database with all card brands
- [ ] Analysis engine with variance calculations
- [ ] AI integration for natural language insights
- [ ] Talking points generator
- [ ] Savings calculator (IC+ and Dual Pricing)
- [ ] Report generator (PDF export)
- [ ] User interface with upload and results display
- [ ] Database to store analyses for follow-up

---

## API ENDPOINTS

```javascript
// POST /api/statement/upload
// Upload and parse a statement
// Returns: extractedData, parsingConfidence, needsManualInput

// POST /api/statement/analyze
// Run full analysis on extracted data
// Returns: analysisReport with all sections

// POST /api/statement/generate-proposal
// Generate PCBancard proposal based on analysis
// Returns: PDF proposal document

// GET /api/statement/:id/talking-points
// Get negotiation scripts for saved analysis
// Returns: talkingPoints object
```

---

## PROMPT END
