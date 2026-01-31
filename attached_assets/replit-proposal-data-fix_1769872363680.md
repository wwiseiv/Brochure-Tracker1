# REPLIT: Fix Proposal Generator Data Flow

## The Problem

The statement analysis WORKS — the Coach page shows:
- Brickworks Dental
- $99,683 volume
- 402 transactions  
- 3.32% rate
- $38,907 annual savings

But the proposal generator shows:
- "Unknown Merchant"
- $0 volume
- 0 transactions
- 0.00% rate

**The data exists but isn't flowing to the proposal.**

---

## Fix 1: Pass Analysis Data to Proposal

Find where the proposal is generated and make sure it receives the analysis data:

```javascript
// When user clicks "Generate Proposal", send the analysis data
async function generateProposal() {
  // Get the analysis data that's already been calculated
  const analysisData = /* wherever you stored it after analysis */;
  
  // CRITICAL: Actually send it to the backend
  const response = await fetch('/api/generate-proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchantName: analysisData.merchant_name || analysisData.merchantName,
      totalVolume: analysisData.total_volume || analysisData.totalVolume,
      totalTransactions: analysisData.total_transactions || analysisData.totalTransactions,
      totalFees: analysisData.total_fees || analysisData.totalFees,
      effectiveRate: analysisData.effective_rate || analysisData.effectiveRate,
      cardBreakdown: analysisData.card_breakdown || analysisData.cardBreakdown,
      
      // Agent info
      agentName: 'William Wise',
      agentPhone: '(317) 331-8472',
      agentEmail: 'wwiseiv@icloud.com'
    })
  });
}
```

---

## Fix 2: Backend Must Use the Data

In the proposal generation endpoint, use the actual data:

```javascript
app.post('/api/generate-proposal', async (req, res) => {
  const data = req.body;
  
  // LOG to see what we received
  console.log('Proposal request data:', JSON.stringify(data, null, 2));
  
  // VALIDATE - don't generate garbage
  if (!data.merchantName || data.merchantName === 'Unknown Merchant') {
    return res.status(400).json({ error: 'Missing merchant name' });
  }
  
  if (!data.totalVolume || data.totalVolume === 0) {
    return res.status(400).json({ error: 'Missing volume data' });
  }
  
  // USE the data in the template
  const proposalData = {
    merchantName: data.merchantName,  // NOT a hardcoded default
    totalVolume: data.totalVolume,    // NOT zero
    totalFees: data.totalFees,
    effectiveRate: data.effectiveRate,
    // etc.
  };
  
  // Generate PDF with real data
  const pdf = await generatePDF(proposalData);
  res.send(pdf);
});
```

---

## Fix 3: PDF Page Breaks

Add this CSS to prevent awkward page breaks:

```css
/* Keep sections together */
.section {
  page-break-inside: avoid;
  break-inside: avoid;
}

/* Force page break before new major section */
.page-break {
  page-break-after: always;
  break-after: page;
}

/* Keep headers with their content */
h2, h3 {
  page-break-after: avoid;
}

/* Keep tables together */
table {
  page-break-inside: avoid;
}

/* Don't truncate text */
td {
  word-wrap: break-word;
  overflow-wrap: break-word;
}
```

---

## Fix 4: Table Text Truncation

The implementation plan table shows "Initial consultati..." instead of full text.

Remove fixed column widths:

```css
/* WRONG - causes truncation */
td { max-width: 150px; overflow: hidden; }

/* RIGHT - let text flow */
td { 
  word-wrap: break-word;
  overflow-wrap: break-word;
}
```

Or use a narrower table with full text:

```html
<table style="width: 100%; table-layout: fixed;">
  <colgroup>
    <col style="width: 8%;">   <!-- Step -->
    <col style="width: 20%;">  <!-- Phase -->
    <col style="width: 57%;">  <!-- Description - most space -->
    <col style="width: 15%;">  <!-- Timeline -->
  </colgroup>
</table>
```

---

## Debug Checklist

1. Add `console.log` in the frontend when generating proposal — is data being sent?
2. Add `console.log` in the backend endpoint — is data being received?
3. Add `console.log` just before PDF generation — is data being used?

The data should flow: Analysis → Frontend State → API Request → Backend → PDF Template

Find where it breaks.

---

## Expected Result

For Brickworks Dental, the proposal should show:

| Field | Current (Broken) | Expected |
|-------|------------------|----------|
| Merchant | Unknown Merchant | Brickworks Dental |
| Volume | $0 | $99,682.53 |
| Transactions | 0 | 402 |
| Fees | $0 | $3,307.19 |
| Rate | 0.00% | 3.32% |
| Annual Savings | — | $38,907 |
