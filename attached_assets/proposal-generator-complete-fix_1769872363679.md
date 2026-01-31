# CRITICAL FIX: Proposal Generator — Data Flow & PDF Formatting

## Current State

| Component | Status | Evidence |
|-----------|--------|----------|
| Statement Upload | ✅ Working | File uploads successfully |
| AI Analysis | ✅ Working | Coach page shows correct data |
| Proposal Generator | ❌ BROKEN | Shows "Unknown Merchant", all $0 |
| PDF Formatting | ❌ BROKEN | Truncated tables, bad page breaks |

**The analysis extracts correct data:**
- Brickworks Dental
- $99,682.53 volume
- 402 transactions
- 3.32% effective rate
- $3,307.19 fees
- $38,907 annual savings

**But the proposal shows:**
- "Unknown Merchant"
- $0 volume, 0 transactions
- 0.00% rate
- Generic placeholder text

---

## Problem 1: Data Not Flowing to Proposal

The analysis data exists but isn't being passed to the proposal generator. Find where the proposal is created and trace the data flow.

### Diagnosis

Add this logging to find where data gets lost:

```javascript
// In proposal generation endpoint
app.post('/api/generate-proposal', async (req, res) => {
  console.log('=== PROPOSAL GENERATION DEBUG ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Request body keys:', Object.keys(req.body));
  
  // Check each expected field
  const expectedFields = [
    'merchantName',
    'totalVolume', 
    'totalTransactions',
    'totalFees',
    'effectiveRate',
    'cardBreakdown'
  ];
  
  for (const field of expectedFields) {
    console.log(`${field}:`, req.body[field] || 'MISSING');
  }
  
  // Continue with generation...
});
```

### The Fix

The proposal generator needs to receive the analysis data. There are likely TWO issues:

**Issue A: Frontend not sending data**

The form might be submitting without the analyzed data. Fix:

```javascript
// Frontend - when generating proposal
async function generateProposal() {
  // Get the analysis data (should already be in state)
  const analysisData = getAnalysisData(); // or this.state.analysis, etc.
  
  console.log('Sending to proposal generator:', analysisData);
  
  // Make sure we're actually sending it
  const response = await fetch('/api/generate-proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Merchant info
      merchantName: analysisData.merchant?.name || analysisData.merchantName,
      merchantAddress: analysisData.merchant?.address,
      businessType: analysisData.businessType || 'General Business',
      
      // Financial data
      totalVolume: analysisData.summary?.total_volume || analysisData.totalVolume,
      totalTransactions: analysisData.summary?.total_transactions || analysisData.totalTransactions,
      totalFees: analysisData.summary?.total_fees || analysisData.totalFees,
      effectiveRate: analysisData.summary?.effective_rate_percent || analysisData.effectiveRate,
      
      // Card breakdown
      cardBreakdown: analysisData.card_breakdown || analysisData.cardBreakdown,
      
      // Agent info
      agentName: 'William Wise',
      agentPhone: '(317) 331-8472',
      agentEmail: 'wwiseiv@icloud.com'
    })
  });
}
```

**Issue B: Backend not using the data**

The proposal template might have hardcoded defaults. Fix:

```javascript
// Backend - proposal generation
async function generateProposal(data) {
  // Validate we have real data
  if (!data.merchantName || data.merchantName === 'Unknown Merchant') {
    console.error('WARNING: No merchant name provided');
  }
  
  if (!data.totalVolume || data.totalVolume === 0) {
    console.error('WARNING: No volume data provided');
  }
  
  // Use the ACTUAL data, not defaults
  const proposalData = {
    merchant: {
      name: data.merchantName || 'MISSING - CHECK DATA FLOW',
      address: data.merchantAddress || '',
      businessType: data.businessType || 'General Business'
    },
    current: {
      volume: data.totalVolume || 0,
      transactions: data.totalTransactions || 0,
      fees: data.totalFees || 0,
      effectiveRate: data.effectiveRate || 0
    },
    // ... etc
  };
  
  // DON'T use hardcoded fallbacks like "Unknown Merchant"
  // If data is missing, the proposal should FAIL, not generate garbage
}
```

---

## Problem 2: PDF Formatting Issues

The current PDF has:
- Truncated table text ("Initial consultati..." instead of full text)
- Poor page breaks (content split awkwardly)
- Tables running off the page

### Solution: Use Proper HTML-to-PDF with Page Break Control

```javascript
const puppeteer = require('puppeteer');

async function generateProposalPDF(data) {
  const html = generateProposalHTML(data);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  
  const pdf = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: {
      top: '0.75in',
      bottom: '0.75in',
      left: '0.75in',
      right: '0.75in'
    },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="width: 100%; font-size: 10px; padding: 0 0.75in; display: flex; justify-content: space-between;">
        <span>Confidential Proposal</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `
  });
  
  await browser.close();
  return pdf;
}
```

### HTML Template with Proper Page Breaks

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* ===== BASE STYLES ===== */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #333;
    }
    
    /* ===== PAGE BREAK CONTROL ===== */
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    
    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    .keep-together {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    /* Prevent orphaned headers */
    h1, h2, h3 {
      page-break-after: avoid;
      break-after: avoid;
    }
    
    /* Keep tables together when possible */
    table {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    
    /* ===== SECTION STYLES ===== */
    .section {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 18pt;
      font-weight: 600;
      color: #6366f1;
      margin-bottom: 16px;
      border-bottom: 2px solid #6366f1;
      padding-bottom: 8px;
    }
    
    /* ===== TABLE STYLES ===== */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    
    th {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
    }
    
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    /* ===== IMPORTANT: PREVENT TEXT TRUNCATION ===== */
    td, th {
      word-wrap: break-word;
      overflow-wrap: break-word;
      max-width: none; /* Don't constrain width */
    }
    
    /* ===== METRIC CARDS ===== */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin: 20px 0;
    }
    
    .metric-card {
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
      border: 1px solid #86efac;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    
    .metric-value {
      font-size: 28pt;
      font-weight: 700;
      color: #16a34a;
    }
    
    .metric-label {
      font-size: 10pt;
      color: #666;
      margin-top: 4px;
    }
    
    /* ===== SAVINGS HIGHLIGHT ===== */
    .savings-banner {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      margin: 24px 0;
    }
    
    .savings-amount {
      font-size: 48pt;
      font-weight: 800;
    }
    
    .savings-period {
      font-size: 14pt;
      opacity: 0.9;
    }
    
    /* ===== OPTIONS COMPARISON ===== */
    .options-table {
      width: 100%;
      margin: 20px 0;
    }
    
    .options-table th {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
    }
    
    .recommended {
      background-color: #f0fdf4 !important;
      border: 2px solid #10b981;
    }
    
    .recommended-badge {
      background: #10b981;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 9pt;
      font-weight: 600;
      margin-left: 8px;
    }
  </style>
</head>
<body>

<!-- ===== PAGE 1: COVER ===== -->
<div class="cover-page">
  <img src="{{logoUrl}}" alt="PCBancard" style="height: 60px; margin-bottom: 40px;">
  
  <div style="background: linear-gradient(135deg, #60a5fa, #34d399); height: 200px; border-radius: 16px; margin-bottom: 40px;"></div>
  
  <h1 style="font-size: 32pt; color: #6366f1; margin-bottom: 16px;">Custom Payment Processing Proposal</h1>
  <p style="font-size: 14pt; color: #666;">Prepared exclusively for {{merchantName}}</p>
  
  <div style="margin-top: 60px; border-top: 2px solid #6366f1; padding-top: 24px;">
    <p><strong>Prepared For:</strong></p>
    <p style="font-size: 18pt; font-weight: 600;">{{merchantName}}</p>
    <p>{{merchantAddress}}</p>
    
    <p style="margin-top: 24px;"><strong>Date:</strong> {{date}}</p>
    
    <p style="margin-top: 24px;"><strong>Prepared By:</strong></p>
    <p style="font-size: 14pt; font-weight: 600;">{{agentName}}</p>
    <p>Account Executive</p>
    <p>PCBancard</p>
    <p>{{agentPhone}} | {{agentEmail}}</p>
  </div>
</div>

<div class="page-break"></div>

<!-- ===== PAGE 2: EXECUTIVE SUMMARY ===== -->
<div class="section">
  <h2 class="section-title">Executive Summary</h2>
  
  <!-- Savings Banner - THE BIG NUMBER -->
  <div class="savings-banner">
    <div style="font-size: 12pt; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Maximum Savings Opportunity</div>
    <div class="savings-amount">${{formatNumber annualSavingsDP}}</div>
    <div class="savings-period">per year (${{formatNumber monthlySavingsDP}}/month)</div>
    
    <div style="display: flex; justify-content: center; gap: 40px; margin-top: 24px;">
      <div>
        <div style="font-size: 24pt; font-weight: 700;">{{effectiveRate}}%</div>
        <div style="font-size: 10pt;">Current Rate</div>
      </div>
      <div>
        <div style="font-size: 24pt; font-weight: 700;">{{interchangeRate}}%</div>
        <div style="font-size: 10pt;">True Interchange</div>
      </div>
      <div>
        <div style="font-size: 24pt; font-weight: 700;">0.07%</div>
        <div style="font-size: 10pt;">With Dual Pricing</div>
      </div>
    </div>
  </div>
  
  <p>{{executiveSummary}}</p>
</div>

<div class="section keep-together">
  <h2 class="section-title">Current Processing Snapshot</h2>
  
  <table>
    <thead>
      <tr>
        <th>Metric</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Monthly Processing Volume</td>
        <td><strong>${{formatNumber totalVolume}}</strong></td>
      </tr>
      <tr>
        <td>Monthly Transactions</td>
        <td><strong>{{totalTransactions}}</strong></td>
      </tr>
      <tr>
        <td>Average Ticket Size</td>
        <td><strong>${{formatNumber averageTicket}}</strong></td>
      </tr>
      <tr>
        <td>Current Monthly Fees</td>
        <td><strong>${{formatNumber totalFees}}</strong></td>
      </tr>
      <tr>
        <td>Effective Rate</td>
        <td><strong style="color: #dc2626;">{{effectiveRate}}%</strong></td>
      </tr>
      <tr>
        <td>Annual Processing Cost</td>
        <td><strong>${{formatNumber annualFees}}</strong></td>
      </tr>
    </tbody>
  </table>
</div>

<div class="page-break"></div>

<!-- ===== PAGE 3: OPTIONS COMPARISON ===== -->
<div class="section">
  <h2 class="section-title">Pricing Options Comparison</h2>
  
  <table class="options-table">
    <thead>
      <tr>
        <th>Option</th>
        <th>Monthly Cost</th>
        <th>Effective Rate</th>
        <th>Monthly Savings</th>
        <th>Annual Savings</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Current Processor</td>
        <td>${{formatNumber totalFees}}</td>
        <td>{{effectiveRate}}%</td>
        <td>—</td>
        <td>—</td>
      </tr>
      <tr>
        <td>Interchange Plus<br><small>True cost + 0.20% + $0.10/txn</small></td>
        <td>${{formatNumber monthlyFeesICP}}</td>
        <td>{{effectiveRateICP}}%</td>
        <td style="color: #16a34a; font-weight: 600;">${{formatNumber monthlySavingsICP}}</td>
        <td style="color: #16a34a; font-weight: 600;">${{formatNumber annualSavingsICP}}</td>
      </tr>
      <tr class="recommended">
        <td>
          <strong>Dual Pricing</strong>
          <span class="recommended-badge">RECOMMENDED</span>
          <br><small>Customer pays 3.99% card fee</small>
        </td>
        <td><strong>$64.95</strong></td>
        <td><strong>0.07%</strong></td>
        <td style="color: #16a34a; font-weight: 700; font-size: 14pt;">${{formatNumber monthlySavingsDP}}</td>
        <td style="color: #16a34a; font-weight: 700; font-size: 14pt;">${{formatNumber annualSavingsDP}}</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="section keep-together">
  <h2 class="section-title">Card Volume Breakdown</h2>
  
  <table>
    <thead>
      <tr>
        <th>Card Type</th>
        <th>Volume</th>
        <th>Transactions</th>
        <th>Avg Ticket</th>
        <th>% of Total</th>
      </tr>
    </thead>
    <tbody>
      {{#each cardBreakdown}}
      <tr>
        <td>{{this.card_type}}</td>
        <td>${{formatNumber this.volume}}</td>
        <td>{{this.transactions}}</td>
        <td>${{formatNumber this.average_ticket}}</td>
        <td>{{this.percent}}%</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
</div>

<div class="page-break"></div>

<!-- ===== PAGE 4: RECOMMENDATION ===== -->
<div class="section">
  <h2 class="section-title">Our Recommendation: Dual Pricing</h2>
  
  <p>{{recommendationText}}</p>
  
  <div class="metrics-grid" style="margin-top: 24px;">
    <div class="metric-card">
      <div class="metric-value">${{formatNumber monthlySavingsDP}}</div>
      <div class="metric-label">Monthly Savings</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${{formatNumber annualSavingsDP}}</div>
      <div class="metric-label">Annual Savings</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">0.07%</div>
      <div class="metric-label">New Effective Rate</div>
    </div>
  </div>
  
  <h3 style="margin-top: 24px; color: #6366f1;">Why Dual Pricing?</h3>
  <ol style="margin: 16px 0; padding-left: 24px;">
    <li style="margin-bottom: 12px;"><strong>Maximum Savings:</strong> Reduce your effective rate from {{effectiveRate}}% to just 0.07%</li>
    <li style="margin-bottom: 12px;"><strong>Customer Choice:</strong> Customers can pay cash price or card price—full transparency</li>
    <li style="margin-bottom: 12px;"><strong>Simple Implementation:</strong> We provide all signage, terminal programming, and staff training</li>
    <li style="margin-bottom: 12px;"><strong>Fully Compliant:</strong> Meets all state and card brand regulations</li>
  </ol>
</div>

<div class="section keep-together">
  <h2 class="section-title">Equipment Recommendation</h2>
  
  <div style="display: flex; gap: 24px; align-items: flex-start;">
    <div style="flex: 1;">
      <h3 style="color: #333; margin-bottom: 12px;">{{equipment.name}}</h3>
      <p style="color: #666; margin-bottom: 16px;">{{equipment.description}}</p>
      
      <h4 style="margin-bottom: 8px;">Key Features:</h4>
      <ul style="padding-left: 20px;">
        {{#each equipment.features}}
        <li style="margin-bottom: 4px;">{{this}}</li>
        {{/each}}
      </ul>
      
      <p style="margin-top: 16px; padding: 12px; background: #f0fdf4; border-radius: 8px; color: #16a34a; font-weight: 600;">
        ✓ FREE with Dual Pricing program
      </p>
    </div>
  </div>
</div>

<div class="page-break"></div>

<!-- ===== PAGE 5: IMPLEMENTATION ===== -->
<div class="section">
  <h2 class="section-title">Implementation Plan</h2>
  
  <table>
    <thead>
      <tr>
        <th style="width: 60px;">Step</th>
        <th style="width: 120px;">Phase</th>
        <th>Description</th>
        <th style="width: 80px;">Timeline</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>Consultation</td>
        <td>Initial consultation with {{agentName}} to review proposal and answer questions</td>
        <td>Day 1</td>
      </tr>
      <tr>
        <td>2</td>
        <td>Application</td>
        <td>Complete merchant application (10 minutes) and submit for underwriting</td>
        <td>Day 1</td>
      </tr>
      <tr>
        <td>3</td>
        <td>Approval</td>
        <td>Account approval and terminal programming</td>
        <td>Day 2-3</td>
      </tr>
      <tr>
        <td>4</td>
        <td>Installation</td>
        <td>Equipment delivery, setup, and staff training</td>
        <td>Day 4</td>
      </tr>
      <tr>
        <td>5</td>
        <td>Go Live</td>
        <td>Begin processing with new rates—immediate savings</td>
        <td>Day 5</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="section keep-together">
  <h2 class="section-title">Risk Reversal & Support</h2>
  
  <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <h3 style="color: #b45309; margin-bottom: 12px;">🛡️ 90-Day Risk-Free Guarantee</h3>
    <p>If you're not completely satisfied with your processing solution within the first 90 days, we'll work with you to make it right or help you transition back to your previous processor at no cost.</p>
  </div>
  
  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
    <div style="padding: 16px; background: #f9fafb; border-radius: 8px;">
      <strong>24/7 Support</strong>
      <p style="font-size: 10pt; color: #666;">US-based support team available around the clock</p>
    </div>
    <div style="padding: 16px; background: #f9fafb; border-radius: 8px;">
      <strong>Dedicated Account Manager</strong>
      <p style="font-size: 10pt; color: #666;">Direct line to {{agentName}} for any questions</p>
    </div>
    <div style="padding: 16px; background: #f9fafb; border-radius: 8px;">
      <strong>No Long-Term Contract</strong>
      <p style="font-size: 10pt; color: #666;">Month-to-month agreement, cancel anytime</p>
    </div>
    <div style="padding: 16px; background: #f9fafb; border-radius: 8px;">
      <strong>Next-Day Funding</strong>
      <p style="font-size: 10pt; color: #666;">Get your money faster with next-day deposits</p>
    </div>
  </div>
</div>

<div class="section keep-together">
  <h2 class="section-title">Next Steps</h2>
  
  <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border-radius: 12px; padding: 32px; text-align: center;">
    <p style="font-size: 14pt; margin-bottom: 16px;">Ready to start saving <strong>${{formatNumber annualSavingsDP}}</strong> per year?</p>
    <p style="font-size: 12pt; margin-bottom: 24px;">Contact {{agentName}} today to get started.</p>
    
    <div style="display: flex; justify-content: center; gap: 32px;">
      <div>
        <div style="font-size: 10pt; opacity: 0.8;">Phone</div>
        <div style="font-size: 14pt; font-weight: 600;">{{agentPhone}}</div>
      </div>
      <div>
        <div style="font-size: 10pt; opacity: 0.8;">Email</div>
        <div style="font-size: 14pt; font-weight: 600;">{{agentEmail}}</div>
      </div>
    </div>
  </div>
</div>

<!-- Footer on each page handled by Puppeteer -->

</body>
</html>
```

---

## Problem 3: Data Validation Before Generation

**Never generate a proposal with missing data.** Add validation:

```javascript
function validateProposalData(data) {
  const errors = [];
  
  // Required fields
  if (!data.merchantName || data.merchantName === 'Unknown Merchant') {
    errors.push('Missing merchant name');
  }
  
  if (!data.totalVolume || data.totalVolume === 0) {
    errors.push('Missing or zero volume');
  }
  
  if (!data.totalTransactions || data.totalTransactions === 0) {
    errors.push('Missing or zero transactions');
  }
  
  if (!data.totalFees || data.totalFees === 0) {
    errors.push('Missing or zero fees');
  }
  
  if (!data.effectiveRate || data.effectiveRate === 0) {
    errors.push('Missing effective rate');
  }
  
  if (errors.length > 0) {
    throw new Error(`Cannot generate proposal: ${errors.join(', ')}. Please complete statement analysis first.`);
  }
  
  return true;
}
```

---

## Complete Fix: Connect Analysis to Proposal

Here's the full flow that should work:

```javascript
// 1. Statement Analysis (already working per Coach page)
app.post('/api/analyze-statement', async (req, res) => {
  const result = await analyzeStatement(req.file);
  
  // Store in session or return to frontend
  req.session.analysisData = result;
  
  res.json(result);
});

// 2. Generate Proposal (broken - needs fix)
app.post('/api/generate-proposal', async (req, res) => {
  try {
    // Get data from request OR session
    let data = req.body;
    
    // If body is empty, check session
    if (!data.merchantName && req.session.analysisData) {
      console.log('Using session data');
      data = transformAnalysisToProposal(req.session.analysisData);
    }
    
    // Validate
    validateProposalData(data);
    
    // Calculate savings
    const calculations = calculateSavings(data);
    
    // Merge all data
    const proposalData = {
      ...data,
      ...calculations,
      date: new Date().toLocaleDateString(),
      agentName: data.agentName || 'William Wise',
      agentPhone: data.agentPhone || '(317) 331-8472',
      agentEmail: data.agentEmail || 'wwiseiv@icloud.com'
    };
    
    // Generate PDF
    const pdfBuffer = await generateProposalPDF(proposalData);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="PCBancard_Proposal_${data.merchantName.replace(/\s+/g, '_')}.pdf"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Proposal generation failed:', error);
    res.status(400).json({ error: error.message });
  }
});

// Transform analysis output to proposal input
function transformAnalysisToProposal(analysis) {
  return {
    merchantName: analysis.merchant?.name || analysis.merchantName,
    merchantAddress: analysis.merchant?.address || analysis.merchantAddress,
    businessType: analysis.businessType || 'General Business',
    
    totalVolume: analysis.summary?.total_volume || analysis.totalVolume,
    totalTransactions: analysis.summary?.total_transactions || analysis.totalTransactions,
    totalFees: analysis.summary?.total_fees || analysis.totalFees,
    effectiveRate: analysis.summary?.effective_rate_percent || analysis.effectiveRate,
    
    cardBreakdown: analysis.card_breakdown || analysis.cardBreakdown || []
  };
}

// Calculate savings for both options
function calculateSavings(data) {
  const volume = data.totalVolume;
  const transactions = data.totalTransactions;
  const currentFees = data.totalFees;
  
  // Interchange Plus: IC + 0.20% + $0.10/txn
  const estimatedIC = volume * 0.0159; // ~1.59% average interchange
  const icpMarkup = (volume * 0.002) + (transactions * 0.10);
  const monthlyFeesICP = estimatedIC + icpMarkup;
  const monthlySavingsICP = currentFees - monthlyFeesICP;
  
  // Dual Pricing: flat $64.95/month
  const monthlyFeesDP = 64.95;
  const monthlySavingsDP = currentFees - monthlyFeesDP;
  
  return {
    // Current
    averageTicket: volume / transactions,
    annualFees: currentFees * 12,
    interchangeRate: 1.59,
    
    // Interchange Plus
    monthlyFeesICP: monthlyFeesICP.toFixed(2),
    effectiveRateICP: ((monthlyFeesICP / volume) * 100).toFixed(2),
    monthlySavingsICP: monthlySavingsICP.toFixed(2),
    annualSavingsICP: (monthlySavingsICP * 12).toFixed(2),
    
    // Dual Pricing
    monthlyFeesDP: monthlyFeesDP,
    effectiveRateDP: ((monthlyFeesDP / volume) * 100).toFixed(2),
    monthlySavingsDP: monthlySavingsDP.toFixed(2),
    annualSavingsDP: (monthlySavingsDP * 12).toFixed(2)
  };
}
```

---

## Summary: What's Broken and How to Fix

| Issue | Cause | Fix |
|-------|-------|-----|
| "Unknown Merchant" | Data not passed to proposal | Connect analysis data to proposal generator |
| All $0 values | Same - no data flowing | Store analysis in session or pass via request |
| Truncated table text | Fixed column widths too narrow | Remove width constraints, use `word-wrap: break-word` |
| Bad page breaks | No page break CSS | Add `.page-break` and `.keep-together` classes |
| Generic text | Hardcoded fallbacks | Validate data, fail if missing instead of using defaults |

---

## Quick Replit Prompt

> **The proposal generator is broken. It shows "Unknown Merchant" and $0 even though the statement analysis works (I can see correct data in the Coach page).**
>
> **Fix these issues:**
>
> 1. **Data flow:** The analysis data needs to be passed to the proposal generator. Either store it in session after analysis, or ensure the frontend sends it when requesting a proposal.
>
> 2. **Never use placeholders:** If data is missing, throw an error instead of generating a proposal with "Unknown Merchant" or $0.
>
> 3. **PDF formatting:** Use proper CSS with `page-break-inside: avoid` to keep sections together, and remove fixed column widths that truncate text.
>
> 4. **Validate before generating:** Add validation that checks merchantName, totalVolume, totalFees, effectiveRate before generating.
