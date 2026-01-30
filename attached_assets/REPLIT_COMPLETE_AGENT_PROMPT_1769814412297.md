# PCBancard Statement Analysis Agent - Complete Prompt

**Instructions:** Copy this ENTIRE prompt into Replit AI to build a statement analysis tool that helps agents identify savings opportunities and provides negotiation talking points.

---

## PROJECT OVERVIEW

Build a web application where PCBancard sales agents can:
1. Upload a merchant's processing statement (PDF)
2. AI extracts and analyzes the data
3. Compares fees against actual interchange costs
4. Calculates savings with PCBancard
5. Generates negotiation talking points

---

## INTERCHANGE REFERENCE DATA

Store these rates in your database for comparison:

```javascript
// interchange-rates.js
export const interchangeRates = {
  // VISA RATES
  visa: {
    retail: {
      debitRegulated: { percent: 0.05, fixed: 0.21, description: 'Durbin-regulated debit' },
      debitUnregulated: { percent: 0.80, fixed: 0.15, description: 'Small bank debit' },
      cpsRetail: { percent: 1.65, fixed: 0.10, description: 'Standard credit card present' },
      rewards1: { percent: 1.65, fixed: 0.10, description: 'Basic rewards' },
      rewards2: { percent: 1.95, fixed: 0.10, description: 'Premium rewards' },
      signaturePreferred: { percent: 2.10, fixed: 0.10, description: 'Signature cards' },
      infinite: { percent: 2.30, fixed: 0.10, description: 'Visa Infinite' },
      commercial: { percent: 2.50, fixed: 0.10, description: 'Business/Corporate' },
      eirf: { percent: 2.70, fixed: 0.10, description: 'Downgrade/Non-qualified' }
    },
    restaurant: {
      cpsRestaurant: { percent: 1.54, fixed: 0.10 },
      debit: { percent: 0.80, fixed: 0.15 }
    },
    ecommerce: {
      basic: { percent: 1.80, fixed: 0.10 },
      rewards: { percent: 2.10, fixed: 0.10 },
      standard: { percent: 2.70, fixed: 0.10 }
    },
    supermarket: {
      cps: { percent: 1.22, fixed: 0.05 },
      debit: { percent: 0.80, fixed: 0.15 }
    }
  },
  
  // MASTERCARD RATES
  mastercard: {
    retail: {
      debitRegulated: { percent: 0.05, fixed: 0.21 },
      debitUnregulated: { percent: 0.80, fixed: 0.15 },
      meritI: { percent: 1.58, fixed: 0.10, description: 'Standard credit' },
      world: { percent: 1.73, fixed: 0.10, description: 'World card' },
      worldElite: { percent: 2.05, fixed: 0.10, description: 'World Elite' },
      commercial: { percent: 2.50, fixed: 0.10 },
      standard: { percent: 2.65, fixed: 0.10, description: 'Downgrade' }
    },
    restaurant: {
      restaurant: { percent: 1.47, fixed: 0.10 },
      qsr: { percent: 1.47, fixed: 0.05 }
    }
  },
  
  // DISCOVER RATES
  discover: {
    retail: {
      retail: { percent: 1.56, fixed: 0.10 },
      rewards: { percent: 1.71, fixed: 0.10 },
      premiumPlus: { percent: 2.15, fixed: 0.10 }
    },
    restaurant: {
      restaurant: { percent: 1.40, fixed: 0.10 }
    },
    supermarket: {
      supermarket: { percent: 1.15, fixed: 0.05 }
    }
  },
  
  // AMERICAN EXPRESS (OptBlue)
  amex: {
    retail: { percent: 2.00, fixed: 0.10 },
    restaurant: { percent: 1.90, fixed: 0.10 },
    ecommerce: { percent: 2.40, fixed: 0.10 }
  },
  
  // ASSESSMENT FEES (charged by card brands on all volume)
  assessments: {
    visa: 0.13,
    mastercard: 0.13,
    discover: 0.13,
    amex: 0.15
  }
};

// Average rates for quick estimation
export const averageRates = {
  debitRegulated: { percent: 0.05, fixed: 0.21 },
  debitUnregulated: { percent: 0.80, fixed: 0.15 },
  creditBasic: { percent: 1.65, fixed: 0.10 },
  creditRewards: { percent: 1.95, fixed: 0.10 },
  creditPremium: { percent: 2.20, fixed: 0.10 },
  commercial: { percent: 2.50, fixed: 0.10 },
  amex: { percent: 2.00, fixed: 0.10 }
};
```

---

## CORE ANALYSIS FUNCTIONS

```javascript
// analysis-engine.js

/**
 * Calculate what interchange SHOULD cost based on card mix
 */
export function calculateTrueInterchange(data) {
  const { volume, transactions, cardMix, merchantType = 'retail' } = data;
  
  let totalInterchange = 0;
  let totalAssessments = 0;
  
  // Default card mix if not provided (typical retail)
  const mix = cardMix || {
    visa: { percent: 40, debitRatio: 0.30 },
    mastercard: { percent: 30, debitRatio: 0.30 },
    discover: { percent: 10, debitRatio: 0.20 },
    amex: { percent: 15, debitRatio: 0 },
    other: { percent: 5, debitRatio: 0.50 }
  };
  
  // Calculate for each brand
  Object.entries(mix).forEach(([brand, brandMix]) => {
    const brandVolume = volume * (brandMix.percent / 100);
    const brandTxns = transactions * (brandMix.percent / 100);
    
    // Split between debit and credit
    const debitVolume = brandVolume * (brandMix.debitRatio || 0);
    const creditVolume = brandVolume - debitVolume;
    const debitTxns = brandTxns * (brandMix.debitRatio || 0);
    const creditTxns = brandTxns - debitTxns;
    
    // Debit interchange (use regulated rate as baseline)
    if (debitVolume > 0) {
      totalInterchange += (debitVolume * 0.05 / 100) + (debitTxns * 0.21);
    }
    
    // Credit interchange (use average rewards rate)
    if (creditVolume > 0) {
      const rate = brand === 'amex' ? 2.00 : 1.85;
      totalInterchange += (creditVolume * rate / 100) + (creditTxns * 0.10);
    }
    
    // Assessments
    const assessRate = interchangeRates.assessments[brand] || 0.13;
    totalAssessments += brandVolume * (assessRate / 100);
  });
  
  return {
    interchange: totalInterchange,
    assessments: totalAssessments,
    wholesaleCost: totalInterchange + totalAssessments,
    wholesaleRate: ((totalInterchange + totalAssessments) / volume) * 100
  };
}

/**
 * Analyze a merchant's statement against true costs
 */
export function analyzeStatement(statementData) {
  const {
    totalVolume,
    totalTransactions,
    totalFees,
    cardMix,
    merchantType
  } = statementData;
  
  // Calculate true interchange
  const trueCosts = calculateTrueInterchange({
    volume: totalVolume,
    transactions: totalTransactions,
    cardMix,
    merchantType
  });
  
  // Current effective rate
  const currentEffectiveRate = (totalFees / totalVolume) * 100;
  
  // Processor markup (what they're adding above wholesale)
  const processorMarkup = totalFees - trueCosts.wholesaleCost;
  const markupRate = (processorMarkup / totalVolume) * 100;
  
  // PCBancard comparison
  const pcbInterchangePlus = {
    cost: trueCosts.wholesaleCost + (totalVolume * 0.20 / 100) + (totalTransactions * 0.10) + 10,
    description: 'Interchange + 0.20% + $0.10/txn + $10 monthly'
  };
  
  const pcbDualPricing = {
    cost: 20, // Just monthly fees
    description: 'Customer pays 3.99% service fee, merchant pays $20/mo'
  };
  
  return {
    summary: {
      monthlyVolume: totalVolume,
      monthlyTransactions: totalTransactions,
      averageTicket: totalVolume / totalTransactions,
      currentTotalFees: totalFees,
      currentEffectiveRate: currentEffectiveRate.toFixed(2)
    },
    
    costAnalysis: {
      trueInterchange: trueCosts.interchange.toFixed(2),
      trueAssessments: trueCosts.assessments.toFixed(2),
      trueWholesale: trueCosts.wholesaleCost.toFixed(2),
      trueWholesaleRate: trueCosts.wholesaleRate.toFixed(2),
      processorMarkup: processorMarkup.toFixed(2),
      processorMarkupRate: markupRate.toFixed(2)
    },
    
    savings: {
      interchangePlus: {
        monthlyCost: pcbInterchangePlus.cost.toFixed(2),
        effectiveRate: ((pcbInterchangePlus.cost / totalVolume) * 100).toFixed(2),
        monthlySavings: (totalFees - pcbInterchangePlus.cost).toFixed(2),
        annualSavings: ((totalFees - pcbInterchangePlus.cost) * 12).toFixed(2)
      },
      dualPricing: {
        monthlyCost: pcbDualPricing.cost.toFixed(2),
        effectiveRate: ((pcbDualPricing.cost / totalVolume) * 100).toFixed(2),
        monthlySavings: (totalFees - pcbDualPricing.cost).toFixed(2),
        annualSavings: ((totalFees - pcbDualPricing.cost) * 12).toFixed(2)
      }
    },
    
    redFlags: identifyRedFlags(statementData, trueCosts, processorMarkup)
  };
}

/**
 * Identify issues and overcharges
 */
function identifyRedFlags(data, trueCosts, markup) {
  const flags = [];
  const effectiveRate = (data.totalFees / data.totalVolume) * 100;
  
  // High effective rate
  if (effectiveRate > 3.0) {
    flags.push({
      severity: 'HIGH',
      issue: 'Extremely high effective rate',
      detail: `${effectiveRate.toFixed(2)}% is well above industry average of 2.5%`,
      savings: ((effectiveRate - 2.5) / 100 * data.totalVolume).toFixed(2)
    });
  } else if (effectiveRate > 2.5) {
    flags.push({
      severity: 'MEDIUM',
      issue: 'Above-average effective rate',
      detail: `${effectiveRate.toFixed(2)}% is higher than typical ${data.merchantType || 'retail'} rate`,
      savings: ((effectiveRate - 2.0) / 100 * data.totalVolume).toFixed(2)
    });
  }
  
  // Excessive markup
  if (markup > trueCosts.wholesaleCost * 0.5) {
    flags.push({
      severity: 'HIGH',
      issue: 'Excessive processor markup',
      detail: `Processor is adding ${((markup / data.totalVolume) * 100).toFixed(2)}% above wholesale cost`,
      savings: (markup * 0.6).toFixed(2)
    });
  }
  
  // Check for common junk fees in the data
  if (data.fees) {
    if (data.fees.pci > 25) {
      flags.push({
        severity: 'MEDIUM',
        issue: 'High PCI compliance fee',
        detail: `$${data.fees.pci} PCI fee is excessive. PCBancard includes PCI compliance.`,
        savings: data.fees.pci.toFixed(2)
      });
    }
    
    if (data.fees.monthly > 25) {
      flags.push({
        severity: 'LOW',
        issue: 'High monthly fee',
        detail: `$${data.fees.monthly} monthly fee could be reduced`,
        savings: (data.fees.monthly - 10).toFixed(2)
      });
    }
    
    if (data.fees.annual > 0) {
      flags.push({
        severity: 'MEDIUM',
        issue: 'Annual fee charged',
        detail: `$${data.fees.annual} annual fee is unnecessary`,
        savings: (data.fees.annual / 12).toFixed(2)
      });
    }
  }
  
  return flags;
}
```

---

## NEGOTIATION TALKING POINTS GENERATOR

```javascript
// talking-points.js

export function generateTalkingPoints(analysis) {
  const { summary, costAnalysis, savings, redFlags } = analysis;
  
  const topSavings = Math.max(
    parseFloat(savings.interchangePlus.annualSavings),
    parseFloat(savings.dualPricing.annualSavings)
  );
  
  const monthlySavings = Math.max(
    parseFloat(savings.interchangePlus.monthlySavings),
    parseFloat(savings.dualPricing.monthlySavings)
  );
  
  return {
    // OPENING STATEMENT
    opening: `
"I've analyzed your processing statement, and I found some significant savings opportunities.

Right now, you're paying an effective rate of ${summary.currentEffectiveRate}% - that's $${summary.currentTotalFees} per month in processing fees.

Based on your volume and card mix, your TRUE interchange cost is only ${costAnalysis.trueWholesaleRate}%. 
That means you're paying ${costAnalysis.processorMarkupRate}% in markup to your current processor.

I can show you how to save $${monthlySavings.toFixed(0)} per month - that's $${topSavings.toFixed(0)} per year."
    `.trim(),
    
    // KEY FACTS TO SHARE
    keyFacts: [
      `Your monthly volume: $${summary.monthlyVolume.toLocaleString()}`,
      `Current effective rate: ${summary.currentEffectiveRate}%`,
      `True interchange cost: ${costAnalysis.trueWholesaleRate}%`,
      `You're overpaying by: $${costAnalysis.processorMarkup}/month`,
      `Annual savings available: $${topSavings.toFixed(0)}`
    ],
    
    // RED FLAG TALKING POINTS
    redFlagScripts: redFlags.map(flag => ({
      issue: flag.issue,
      script: `"I noticed ${flag.detail}. This alone is costing you an extra $${flag.savings} that you could be saving."`
    })),
    
    // DISCOVERY QUESTIONS
    questions: [
      "When did you last have your rates reviewed by your current processor?",
      "Are you aware that interchange rates are set by Visa and Mastercard, not your processor?",
      "Has your processor ever explained the difference between interchange and their markup?",
      "How would you use an extra $" + monthlySavings.toFixed(0) + " per month in your business?",
      "Have you heard about dual pricing, where your customers cover the card processing fee?"
    ],
    
    // OBJECTION HANDLERS
    objections: {
      "I'm under contract": `
"I understand. Here's what I suggest - let's look at your termination clause together. 
Often the savings we provide pay off any termination fee within 2-3 months.
With $${topSavings.toFixed(0)} in annual savings, even a $500 termination fee is worthwhile.
Plus, PCBancard may help cover that fee to earn your business."`,

      "I'm happy with my current processor": `
"I'm glad they've been reliable for you. But being happy doesn't mean you're getting the best deal.
You're currently paying $${costAnalysis.processorMarkup} per month MORE than necessary.
That's real money leaving your business - $${topSavings.toFixed(0)} per year.
Wouldn't you rather keep that money working for you?"`,

      "I don't have time to switch": `
"I completely understand you're busy. That's why we handle everything.
The actual switch takes about 15 minutes of your time.
We do the paperwork, we set up your terminal, we train your staff.
For 15 minutes, you'll save $${topSavings.toFixed(0)} this year. That's a pretty good hourly rate!"`,

      "I need to think about it": `
"Of course, this is an important decision. But while you're thinking, consider this:
Every month you wait costs you $${monthlySavings.toFixed(0)} in unnecessary fees.
By this time next month, that's money you won't get back.
What specific questions can I answer right now to help you decide?"`,

      "Your rates will probably go up later": `
"I understand that concern - a lot of processors do that. Here's how we're different:
PCBancard uses interchange-plus pricing, which means you always pay TRUE interchange plus our small markup.
Interchange is set by Visa and Mastercard, not us. Our markup is locked in your agreement.
The only way your rate changes is if the card brands change interchange - and that happens to everyone equally."`
    },
    
    // VALUE PROPOSITION
    valueProps: [
      "Interchange-plus pricing with complete transparency",
      "No hidden fees or junk fees",
      "Free PCI compliance - no monthly PCI fees",
      "Free terminal with our dual pricing program",
      "24/7 US-based customer support",
      "No long-term contract required",
      "Month-to-month with no cancellation fees"
    ],
    
    // DUAL PRICING PITCH
    dualPricingPitch: `
"Let me tell you about our Dual Pricing program - this is a game-changer for businesses like yours.

With dual pricing, you display TWO prices: a cash price and a card price.
The card price includes a small service fee - typically 3.99%.
When customers pay with a card, THEY cover the processing fee, not you.

Your effective rate drops to nearly ZERO. Instead of paying $${summary.currentTotalFees}/month, 
you'd pay just $20/month in account fees.

That's $${savings.dualPricing.monthlySavings} per month back in YOUR pocket.
$${savings.dualPricing.annualSavings} per year.

And it's 100% legal and compliant when done correctly - we handle all the signage and disclosures."`,
    
    // CLOSING STATEMENT
    closing: `
"Based on everything we've discussed, here's the bottom line:

Switch to PCBancard and you'll save $${topSavings.toFixed(0)} this year.
${parseFloat(savings.dualPricing.annualSavings) > parseFloat(savings.interchangePlus.annualSavings) 
  ? `With our dual pricing program, you could save even more - up to $${savings.dualPricing.annualSavings} annually.` 
  : ''}

I can have you set up and processing within 48 hours.
You keep your same bank account, same business operations - just lower fees.

What questions do you have before we get you started?"`
  };
}
```

---

## AI-POWERED ANALYSIS (Using Claude API)

```javascript
// ai-analyzer.js
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function getAIAnalysis(statementText, extractedData, calculatedAnalysis) {
  const prompt = `You are an expert merchant services consultant analyzing a processing statement for a PCBancard sales agent.

## RAW STATEMENT TEXT (OCR extracted)
${statementText}

## EXTRACTED DATA
${JSON.stringify(extractedData, null, 2)}

## CALCULATED ANALYSIS
${JSON.stringify(calculatedAnalysis, null, 2)}

## YOUR TASK

Provide a detailed analysis including:

1. **STATEMENT SUMMARY**
   - Confirm/correct the extracted data
   - Identify the current processor
   - Note any unusual line items

2. **COST ANALYSIS**
   - Validate the interchange calculations
   - Identify any inflated interchange pass-through
   - Spot any hidden or junk fees

3. **SPECIFIC FINDINGS**
   For each issue found, provide:
   - What you found
   - Why it's a problem
   - How much it's costing the merchant
   - What the agent should say about it

4. **COMPETITIVE INSIGHTS**
   If you can identify the processor:
   - Known issues with this processor
   - Common complaints
   - Contract pitfalls to mention

5. **CUSTOM TALKING POINTS**
   Based on THIS specific merchant's situation:
   - 3 most compelling savings points
   - Predicted objections and responses
   - Personalized closing approach

6. **SAVINGS RECOMMENDATION**
   - Recommend Interchange Plus or Dual Pricing
   - Explain why based on their business type/volume
   - Project realistic savings

Be specific and actionable. The agent will use this in their sales call.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return response.content[0].text;
}
```

---

## SIMPLE REACT UI COMPONENT

```jsx
// StatementAnalyzer.jsx
import React, { useState } from 'react';
import { analyzeStatement } from './analysis-engine';
import { generateTalkingPoints } from './talking-points';
import { getAIAnalysis } from './ai-analyzer';

export default function StatementAnalyzer() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [manualData, setManualData] = useState({
    totalVolume: '',
    totalTransactions: '',
    totalFees: '',
    merchantType: 'retail'
  });

  const handleAnalyze = async () => {
    setLoading(true);
    
    try {
      // If file uploaded, extract text (implement PDF parsing)
      // For now, use manual data
      const data = {
        totalVolume: parseFloat(manualData.totalVolume),
        totalTransactions: parseInt(manualData.totalTransactions),
        totalFees: parseFloat(manualData.totalFees),
        merchantType: manualData.merchantType
      };
      
      // Run analysis
      const analysis = analyzeStatement(data);
      const talkingPoints = generateTalkingPoints(analysis);
      
      // Get AI insights (optional)
      // const aiInsights = await getAIAnalysis('', data, analysis);
      
      setResults({ analysis, talkingPoints });
    } catch (error) {
      console.error('Analysis failed:', error);
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Statement Analysis Tool</h1>
      
      {/* Input Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Enter Statement Data</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Monthly Volume</label>
            <input
              type="number"
              placeholder="$50,000"
              className="w-full border rounded px-3 py-2"
              value={manualData.totalVolume}
              onChange={(e) => setManualData({...manualData, totalVolume: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Monthly Transactions</label>
            <input
              type="number"
              placeholder="500"
              className="w-full border rounded px-3 py-2"
              value={manualData.totalTransactions}
              onChange={(e) => setManualData({...manualData, totalTransactions: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Total Monthly Fees</label>
            <input
              type="number"
              placeholder="$1,250"
              className="w-full border rounded px-3 py-2"
              value={manualData.totalFees}
              onChange={(e) => setManualData({...manualData, totalFees: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Merchant Type</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={manualData.merchantType}
              onChange={(e) => setManualData({...manualData, merchantType: e.target.value})}
            >
              <option value="retail">Retail</option>
              <option value="restaurant">Restaurant</option>
              <option value="ecommerce">E-Commerce</option>
              <option value="service">Service</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded font-medium hover:bg-indigo-700"
        >
          {loading ? 'Analyzing...' : 'Analyze Statement'}
        </button>
      </div>
      
      {/* Results Section */}
      {results && (
        <div className="space-y-6">
          {/* Savings Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-green-800 mb-4">💰 Savings Opportunity</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-700">
                  ${results.analysis.savings.dualPricing.monthlySavings}
                </div>
                <div className="text-sm text-green-600">Monthly Savings</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700">
                  ${results.analysis.savings.dualPricing.annualSavings}
                </div>
                <div className="text-sm text-green-600">Annual Savings</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700">
                  {results.analysis.savings.dualPricing.effectiveRate}%
                </div>
                <div className="text-sm text-green-600">New Rate</div>
              </div>
            </div>
          </div>
          
          {/* Red Flags */}
          {results.analysis.redFlags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-800 mb-4">🚨 Issues Found</h2>
              {results.analysis.redFlags.map((flag, i) => (
                <div key={i} className="mb-3 pb-3 border-b border-red-100 last:border-0">
                  <div className="font-medium text-red-700">{flag.issue}</div>
                  <div className="text-sm text-red-600">{flag.detail}</div>
                  <div className="text-sm font-medium text-red-800">Potential savings: ${flag.savings}</div>
                </div>
              ))}
            </div>
          )}
          
          {/* Talking Points */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">🗣️ Talking Points</h2>
            
            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-2">Opening Statement</h3>
              <div className="bg-gray-50 p-4 rounded text-sm whitespace-pre-wrap">
                {results.talkingPoints.opening}
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-2">Key Questions to Ask</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {results.talkingPoints.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
            
            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-2">Dual Pricing Pitch</h3>
              <div className="bg-indigo-50 p-4 rounded text-sm whitespace-pre-wrap">
                {results.talkingPoints.dualPricingPitch}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Closing Statement</h3>
              <div className="bg-green-50 p-4 rounded text-sm whitespace-pre-wrap">
                {results.talkingPoints.closing}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## QUICK START INSTRUCTIONS

1. Create a new Replit project (React + Vite template)
2. Add your Anthropic API key to Secrets as `ANTHROPIC_API_KEY`
3. Install dependencies: `npm install @anthropic-ai/sdk`
4. Copy the code blocks above into appropriate files
5. Import StatementAnalyzer into App.jsx
6. Run the project

The agent can then:
1. Enter statement data (volume, transactions, fees)
2. Click "Analyze Statement"
3. See savings calculations and red flags
4. Get ready-to-use talking points for their sales call

---

## FUTURE ENHANCEMENTS

- [ ] PDF upload with automatic OCR extraction
- [ ] Statement parsing for specific processors
- [ ] Save analyses to database for follow-up
- [ ] Generate PDF proposals automatically
- [ ] Email results to merchant
- [ ] Track conversion rates by analysis

---

## PROMPT END
