import Anthropic from "@anthropic-ai/sdk";
import type { ParsedProposal } from "../proposal-generator";

export interface ClaudeDocumentOptions {
  parsedData: ParsedProposal;
  agentName: string;
  agentTitle: string;
  agentEmail: string;
  agentPhone: string;
  businessName?: string;
  businessAddress?: string;
  businessDescription?: string;
  selectedEquipment?: { name: string; description?: string; price?: string }[];
  includeCompetitorAnalysis?: boolean;
}

export interface GeneratedDocument {
  html: string;
  markdown: string;
  sections: {
    executiveSummary: string;
    currentAnalysis: string;
    savingsComparison: string;
    recommendation: string;
    equipmentRecommendation: string;
    nextSteps: string;
    closingStatement: string;
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2 
  }).format(amount);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export async function generateClaudeDocument(options: ClaudeDocumentOptions): Promise<GeneratedDocument> {
  const anthropicApiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    throw new Error("Anthropic API key not configured");
  }

  const anthropic = new Anthropic({ apiKey: anthropicApiKey });
  const { parsedData, agentName, agentTitle, agentEmail, agentPhone, businessName, businessAddress, businessDescription, selectedEquipment } = options;

  const merchantName = businessName || parsedData.merchantName || "Valued Merchant";
  const totalVolume = parsedData.currentState?.totalVolume || 0;
  const totalTransactions = parsedData.currentState?.totalTransactions || 0;
  const avgTicket = parsedData.currentState?.avgTicket || 0;
  const effectiveRate = parsedData.currentState?.effectiveRatePercent || 0;
  const currentMonthlyCost = parsedData.currentState?.totalMonthlyCost || 0;
  
  const dpSavingsMonthly = parsedData.optionDualPricing?.monthlySavings || 0;
  const dpSavingsAnnual = parsedData.optionDualPricing?.annualSavings || 0;
  const icpSavingsMonthly = parsedData.optionInterchangePlus?.monthlySavings || 0;
  const icpSavingsAnnual = parsedData.optionInterchangePlus?.annualSavings || 0;

  const cardBreakdown = parsedData.currentState?.cardBreakdown || {
    visa: { volume: 0, transactions: 0 },
    mastercard: { volume: 0, transactions: 0 },
    discover: { volume: 0, transactions: 0 },
    amex: { volume: 0, transactions: 0 },
  };

  const equipmentList = selectedEquipment?.map(eq => `- ${eq.name}${eq.price ? ` (${eq.price})` : ''}: ${eq.description || ''}`).join('\n') || '- Professional POS terminal with latest security features';

  const prompt = `You are a professional sales proposal writer for PCBancard, a payment processing company. Generate a compelling, personalized sales proposal document.

MERCHANT DATA:
- Business Name: ${merchantName}
- Address: ${businessAddress || 'Not provided'}
- Business Description: ${businessDescription || 'Local business'}
- Monthly Processing Volume: ${formatCurrency(totalVolume)}
- Monthly Transactions: ${totalTransactions.toLocaleString()}
- Average Ticket: ${formatCurrency(avgTicket)}
- Current Effective Rate: ${formatPercent(effectiveRate)}
- Current Monthly Processing Cost: ${formatCurrency(currentMonthlyCost)}

CARD BREAKDOWN:
- Visa: ${formatCurrency(cardBreakdown.visa.volume)} (${cardBreakdown.visa.transactions} txns)
- Mastercard: ${formatCurrency(cardBreakdown.mastercard.volume)} (${cardBreakdown.mastercard.transactions} txns)
- Discover: ${formatCurrency(cardBreakdown.discover.volume)} (${cardBreakdown.discover.transactions} txns)
- Amex: ${formatCurrency(cardBreakdown.amex.volume)} (${cardBreakdown.amex.transactions} txns)

SAVINGS ANALYSIS:
- Dual Pricing Monthly Savings: ${formatCurrency(dpSavingsMonthly)}
- Dual Pricing Annual Savings: ${formatCurrency(dpSavingsAnnual)}
- Interchange Plus Monthly Savings: ${formatCurrency(icpSavingsMonthly)}
- Interchange Plus Annual Savings: ${formatCurrency(icpSavingsAnnual)}

RECOMMENDED EQUIPMENT:
${equipmentList}

AGENT INFO:
- Name: ${agentName}
- Title: ${agentTitle}
- Email: ${agentEmail}
- Phone: ${agentPhone}

Generate a complete, professional proposal document with the following sections. Use persuasive but professional language. Include specific numbers from the data provided. Make it personal to the merchant.

Return your response in this EXACT JSON format:
{
  "executiveSummary": "A compelling 2-3 paragraph executive summary highlighting the savings opportunity and why PCBancard is the right choice for this specific business",
  "currentAnalysis": "Analysis of their current processing situation, identifying pain points and inefficiencies. Reference their specific rates and volumes.",
  "savingsComparison": "Detailed comparison of Dual Pricing vs Interchange Plus options with specific dollar amounts. Explain what each option means in simple terms.",
  "recommendation": "Your professional recommendation on which option is best for THIS specific merchant and WHY. Be specific and persuasive.",
  "equipmentRecommendation": "Equipment recommendation section explaining what they'll receive and how it benefits their business",
  "nextSteps": "Clear 3-5 step implementation process with timeline (Day 1, Day 2-3, Week 1, etc.)",
  "closingStatement": "A warm, professional closing that creates urgency without being pushy. Include a call to action."
}

Write in a professional but warm tone. Use the merchant's name when appropriate. Focus on VALUE, not just savings. Make them feel like this proposal was crafted specifically for them.`;

  console.log("[ClaudeDocGen] Generating proposal content with Claude...");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = response.content[0].type === "text" ? response.content[0].text : "";
  
  let sections: GeneratedDocument["sections"];
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      sections = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found in response");
    }
  } catch (e) {
    console.error("[ClaudeDocGen] Failed to parse Claude response:", e);
    sections = {
      executiveSummary: `Thank you for the opportunity to present this customized payment processing proposal for ${merchantName}. Based on our analysis of your current processing, we've identified significant savings opportunities that could put ${formatCurrency(dpSavingsAnnual)} back in your pocket annually.`,
      currentAnalysis: `Your current processing volume of ${formatCurrency(totalVolume)} per month at an effective rate of ${formatPercent(effectiveRate)} represents an opportunity for optimization.`,
      savingsComparison: `We're presenting two options: Dual Pricing saves you ${formatCurrency(dpSavingsAnnual)} annually, while Interchange Plus saves ${formatCurrency(icpSavingsAnnual)} annually.`,
      recommendation: `Based on your business profile, we recommend Dual Pricing for maximum savings.`,
      equipmentRecommendation: `We recommend professional-grade payment equipment to ensure reliable processing.`,
      nextSteps: `1. Review and sign this proposal\n2. Equipment delivery (2-3 business days)\n3. Quick training session\n4. Go live and start saving!`,
      closingStatement: `I'm excited about the opportunity to help ${merchantName} save money on payment processing. Please reach out with any questions - I'm here to help!`,
    };
  }

  console.log("[ClaudeDocGen] Successfully generated proposal sections");

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const html = generateProposalHTML({
    merchantName,
    businessAddress: businessAddress || '',
    sections,
    parsedData,
    agentName,
    agentTitle,
    agentEmail,
    agentPhone,
    date: today,
    equipmentList: selectedEquipment || [],
  });

  const markdown = generateProposalMarkdown({
    merchantName,
    businessAddress: businessAddress || '',
    sections,
    parsedData,
    agentName,
    agentTitle,
    agentEmail,
    agentPhone,
    date: today,
  });

  return { html, markdown, sections };
}

interface HTMLGenerationOptions {
  merchantName: string;
  businessAddress: string;
  sections: GeneratedDocument["sections"];
  parsedData: ParsedProposal;
  agentName: string;
  agentTitle: string;
  agentEmail: string;
  agentPhone: string;
  date: string;
  equipmentList: { name: string; description?: string; price?: string }[];
}

function generateProposalHTML(opts: HTMLGenerationOptions): string {
  const { merchantName, businessAddress, sections, parsedData, agentName, agentTitle, agentEmail, agentPhone, date, equipmentList } = opts;

  const totalVolume = parsedData.currentState?.totalVolume || 0;
  const totalTransactions = parsedData.currentState?.totalTransactions || 0;
  const avgTicket = parsedData.currentState?.avgTicket || 0;
  const effectiveRate = parsedData.currentState?.effectiveRatePercent || 0;
  const currentMonthlyCost = parsedData.currentState?.totalMonthlyCost || 0;
  
  const dpSavingsMonthly = parsedData.optionDualPricing?.monthlySavings || 0;
  const dpSavingsAnnual = parsedData.optionDualPricing?.annualSavings || 0;
  const dpMonthlyCost = parsedData.optionDualPricing?.totalMonthlyCost || 0;
  const icpSavingsMonthly = parsedData.optionInterchangePlus?.monthlySavings || 0;
  const icpSavingsAnnual = parsedData.optionInterchangePlus?.annualSavings || 0;
  const icpMonthlyCost = parsedData.optionInterchangePlus?.totalMonthlyCost || 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Processing Proposal - ${merchantName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1a1a2e;
      line-height: 1.6;
      background: #ffffff;
    }
    
    .page {
      width: 8.5in;
      min-height: 11in;
      padding: 0.6in;
      margin: 0 auto;
      background: white;
    }
    
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 10in;
      text-align: center;
    }
    
    .logo-section {
      padding: 40px 0;
    }
    
    .logo-text {
      font-size: 36px;
      font-weight: 800;
      color: #7C5CFC;
      letter-spacing: -1px;
    }
    
    .hero-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 60px 20px;
    }
    
    .hero-title {
      font-size: 42px;
      font-weight: 800;
      color: #7C5CFC;
      margin-bottom: 16px;
      line-height: 1.1;
    }
    
    .hero-subtitle {
      font-size: 24px;
      color: #64748b;
      font-weight: 500;
    }
    
    .hero-merchant {
      font-size: 32px;
      font-weight: 700;
      color: #1a1a2e;
      margin-top: 30px;
    }
    
    .cover-footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      text-align: left;
      padding-top: 40px;
      border-top: 3px solid #7C5CFC;
    }
    
    .cover-footer h4 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    
    .cover-footer p {
      font-size: 14px;
      color: #334155;
      margin: 4px 0;
    }
    
    .cover-footer .name {
      font-size: 18px;
      font-weight: 600;
      color: #7C5CFC;
    }
    
    .section {
      margin-bottom: 32px;
    }
    
    .section-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 3px solid #7C5CFC;
    }
    
    .section-number {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #7C5CFC 0%, #6244c9 100%);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 16px;
      margin-right: 16px;
    }
    
    .section-title {
      font-size: 24px;
      font-weight: 700;
      color: #7C5CFC;
    }
    
    .content-text {
      font-size: 15px;
      color: #334155;
      white-space: pre-line;
    }
    
    .highlight-box {
      background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
      border-radius: 16px;
      padding: 24px 32px;
      margin: 24px 0;
      border-left: 4px solid #7C5CFC;
    }
    
    .savings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin: 24px 0;
    }
    
    .savings-card {
      padding: 28px;
      border-radius: 16px;
      text-align: center;
    }
    
    .savings-card.dual-pricing {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border: 2px solid #10b981;
    }
    
    .savings-card.interchange-plus {
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border: 2px solid #3b82f6;
    }
    
    .savings-card .label {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .savings-card.dual-pricing .label { color: #059669; }
    .savings-card.interchange-plus .label { color: #2563eb; }
    
    .savings-card .amount {
      font-size: 42px;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 4px;
    }
    
    .savings-card.dual-pricing .amount { color: #047857; }
    .savings-card.interchange-plus .amount { color: #1d4ed8; }
    
    .savings-card .period {
      font-size: 14px;
      opacity: 0.8;
    }
    
    .savings-card .monthly {
      font-size: 16px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(0,0,0,0.1);
    }
    
    .recommended-badge {
      display: inline-block;
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      color: #78350f;
      font-size: 10px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 12px;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    
    .data-table thead {
      background: linear-gradient(135deg, #7C5CFC 0%, #6244c9 100%);
      color: white;
    }
    
    .data-table th {
      padding: 14px 20px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .data-table td {
      padding: 14px 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .data-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    
    .data-table .number {
      font-weight: 600;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    
    .data-table .positive { color: #059669; }
    .data-table .negative { color: #dc2626; }
    
    .equipment-card {
      background: #f8fafc;
      border-radius: 16px;
      padding: 24px;
      margin: 16px 0;
      border: 1px solid #e2e8f0;
    }
    
    .equipment-card h4 {
      font-size: 18px;
      color: #7C5CFC;
      margin-bottom: 8px;
    }
    
    .equipment-card p {
      color: #64748b;
      font-size: 14px;
    }
    
    .timeline {
      margin: 24px 0;
    }
    
    .timeline-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-left: 40px;
      position: relative;
    }
    
    .timeline-item::before {
      content: '';
      position: absolute;
      left: 12px;
      top: 24px;
      width: 2px;
      height: calc(100% + 20px);
      background: #e2e8f0;
    }
    
    .timeline-item:last-child::before {
      display: none;
    }
    
    .timeline-dot {
      position: absolute;
      left: 4px;
      top: 4px;
      width: 18px;
      height: 18px;
      background: #7C5CFC;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .timeline-content h4 {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 4px;
    }
    
    .timeline-content p {
      font-size: 14px;
      color: #64748b;
    }
    
    .cta-section {
      background: linear-gradient(135deg, #7C5CFC 0%, #6244c9 100%);
      border-radius: 20px;
      padding: 40px;
      text-align: center;
      color: white;
      margin: 40px 0;
    }
    
    .cta-section h2 {
      font-size: 28px;
      margin-bottom: 16px;
    }
    
    .cta-section p {
      font-size: 16px;
      opacity: 0.9;
      max-width: 500px;
      margin: 0 auto 24px;
    }
    
    .agent-contact {
      background: rgba(255,255,255,0.15);
      border-radius: 12px;
      padding: 20px;
      display: inline-block;
    }
    
    .agent-contact .name {
      font-size: 20px;
      font-weight: 700;
    }
    
    .agent-contact .details {
      font-size: 14px;
      opacity: 0.9;
    }
    
    @media print {
      .page {
        page-break-after: always;
        break-after: page;
      }
      
      .page:last-child {
        page-break-after: avoid;
      }
      
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .section, .highlight-box, .savings-card, .equipment-card, .cta-section {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      h1, h2, h3, h4 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      
      table {
        page-break-inside: avoid !important;
      }
      
      td, th {
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }
    }
  </style>
</head>
<body>

<!-- COVER PAGE -->
<div class="page cover-page">
  <div class="logo-section">
    <div class="logo-text">PCBancard</div>
  </div>
  
  <div class="hero-section">
    <h1 class="hero-title">Payment Processing Proposal</h1>
    <p class="hero-subtitle">Customized savings analysis prepared exclusively for</p>
    <p class="hero-merchant">${merchantName}</p>
  </div>
  
  <div class="cover-footer">
    <div>
      <h4>Prepared For</h4>
      <p class="name">${merchantName}</p>
      ${businessAddress ? `<p>${businessAddress}</p>` : ''}
    </div>
    <div>
      <h4>Prepared By</h4>
      <p class="name">${agentName}</p>
      <p>${agentTitle}</p>
      <p>${agentPhone}</p>
      <p>${agentEmail}</p>
      <p style="margin-top: 12px; color: #94a3b8;">${date}</p>
    </div>
  </div>
</div>

<!-- EXECUTIVE SUMMARY -->
<div class="page">
  <div class="section">
    <div class="section-header">
      <div class="section-number">1</div>
      <h2 class="section-title">Executive Summary</h2>
    </div>
    <div class="highlight-box">
      <p class="content-text">${sections.executiveSummary}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <div class="section-number">2</div>
      <h2 class="section-title">Current Processing Analysis</h2>
    </div>
    <p class="content-text">${sections.currentAnalysis}</p>
    
    <table class="data-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Current Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Monthly Processing Volume</td>
          <td class="number">${formatCurrency(totalVolume)}</td>
        </tr>
        <tr>
          <td>Monthly Transactions</td>
          <td class="number">${totalTransactions.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Average Ticket Size</td>
          <td class="number">${formatCurrency(avgTicket)}</td>
        </tr>
        <tr>
          <td>Current Monthly Fees</td>
          <td class="number negative">${formatCurrency(currentMonthlyCost)}</td>
        </tr>
        <tr>
          <td>Effective Rate</td>
          <td class="number negative">${formatPercent(effectiveRate)}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- SAVINGS COMPARISON -->
<div class="page">
  <div class="section">
    <div class="section-header">
      <div class="section-number">3</div>
      <h2 class="section-title">Savings Comparison</h2>
    </div>
    <p class="content-text">${sections.savingsComparison}</p>
    
    <div class="savings-grid">
      <div class="savings-card dual-pricing">
        <div class="label">Dual Pricing Program</div>
        <div class="amount">${formatCurrency(dpSavingsAnnual)}</div>
        <div class="period">Annual Savings</div>
        <div class="monthly">${formatCurrency(dpSavingsMonthly)}/month</div>
        ${dpSavingsAnnual >= icpSavingsAnnual ? '<div class="recommended-badge">Recommended</div>' : ''}
      </div>
      <div class="savings-card interchange-plus">
        <div class="label">Interchange Plus</div>
        <div class="amount">${formatCurrency(icpSavingsAnnual)}</div>
        <div class="period">Annual Savings</div>
        <div class="monthly">${formatCurrency(icpSavingsMonthly)}/month</div>
        ${icpSavingsAnnual > dpSavingsAnnual ? '<div class="recommended-badge">Recommended</div>' : ''}
      </div>
    </div>
    
    <table class="data-table">
      <thead>
        <tr>
          <th>Option</th>
          <th>Monthly Cost</th>
          <th>Monthly Savings</th>
          <th>Annual Savings</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Current Processor</td>
          <td class="number">${formatCurrency(currentMonthlyCost)}</td>
          <td>—</td>
          <td>—</td>
        </tr>
        <tr>
          <td>Dual Pricing</td>
          <td class="number">${formatCurrency(dpMonthlyCost)}</td>
          <td class="number positive">${formatCurrency(dpSavingsMonthly)}</td>
          <td class="number positive">${formatCurrency(dpSavingsAnnual)}</td>
        </tr>
        <tr>
          <td>Interchange Plus</td>
          <td class="number">${formatCurrency(icpMonthlyCost)}</td>
          <td class="number positive">${formatCurrency(icpSavingsMonthly)}</td>
          <td class="number positive">${formatCurrency(icpSavingsAnnual)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-header">
      <div class="section-number">4</div>
      <h2 class="section-title">Our Recommendation</h2>
    </div>
    <div class="highlight-box">
      <p class="content-text">${sections.recommendation}</p>
    </div>
  </div>
</div>

<!-- EQUIPMENT & NEXT STEPS -->
<div class="page">
  <div class="section">
    <div class="section-header">
      <div class="section-number">5</div>
      <h2 class="section-title">Equipment Recommendation</h2>
    </div>
    <p class="content-text">${sections.equipmentRecommendation}</p>
    
    ${equipmentList.map(eq => `
    <div class="equipment-card">
      <h4>${eq.name}${eq.price ? ` - ${eq.price}` : ''}</h4>
      <p>${eq.description || 'Professional-grade payment processing equipment'}</p>
    </div>
    `).join('')}
  </div>

  <div class="section">
    <div class="section-header">
      <div class="section-number">6</div>
      <h2 class="section-title">Next Steps</h2>
    </div>
    <div class="timeline">
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <h4>Step 1: Review & Approve</h4>
          <p>Review this proposal and let us know your preferred option</p>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <h4>Step 2: Quick Application</h4>
          <p>Complete a simple application (takes about 10 minutes)</p>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <h4>Step 3: Equipment Delivery</h4>
          <p>Receive your equipment within 2-3 business days</p>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <h4>Step 4: Go Live</h4>
          <p>Start processing and saving immediately!</p>
        </div>
      </div>
    </div>
  </div>

  <div class="cta-section">
    <h2>Ready to Start Saving?</h2>
    <p>${sections.closingStatement}</p>
    <div class="agent-contact">
      <div class="name">${agentName}</div>
      <div class="details">${agentPhone} | ${agentEmail}</div>
    </div>
  </div>
</div>

</body>
</html>`;
}

function generateProposalMarkdown(opts: Omit<HTMLGenerationOptions, 'equipmentList'>): string {
  const { merchantName, businessAddress, sections, parsedData, agentName, agentTitle, agentEmail, agentPhone, date } = opts;

  const totalVolume = parsedData.currentState?.totalVolume || 0;
  const totalTransactions = parsedData.currentState?.totalTransactions || 0;
  const avgTicket = parsedData.currentState?.avgTicket || 0;
  const effectiveRate = parsedData.currentState?.effectiveRatePercent || 0;
  const currentMonthlyCost = parsedData.currentState?.totalMonthlyCost || 0;
  
  const dpSavingsMonthly = parsedData.optionDualPricing?.monthlySavings || 0;
  const dpSavingsAnnual = parsedData.optionDualPricing?.annualSavings || 0;
  const icpSavingsMonthly = parsedData.optionInterchangePlus?.monthlySavings || 0;
  const icpSavingsAnnual = parsedData.optionInterchangePlus?.annualSavings || 0;

  return `# Payment Processing Proposal

## Prepared For: ${merchantName}
${businessAddress ? `${businessAddress}\n` : ''}
**Date:** ${date}

**Prepared By:**
${agentName}
${agentTitle}
${agentPhone} | ${agentEmail}

---

## 1. Executive Summary

${sections.executiveSummary}

---

## 2. Current Processing Analysis

${sections.currentAnalysis}

| Metric | Current Value |
|--------|---------------|
| Monthly Processing Volume | ${formatCurrency(totalVolume)} |
| Monthly Transactions | ${totalTransactions.toLocaleString()} |
| Average Ticket Size | ${formatCurrency(avgTicket)} |
| Current Monthly Fees | ${formatCurrency(currentMonthlyCost)} |
| Effective Rate | ${formatPercent(effectiveRate)} |

---

## 3. Savings Comparison

${sections.savingsComparison}

### Dual Pricing Program
- **Annual Savings:** ${formatCurrency(dpSavingsAnnual)}
- **Monthly Savings:** ${formatCurrency(dpSavingsMonthly)}

### Interchange Plus
- **Annual Savings:** ${formatCurrency(icpSavingsAnnual)}
- **Monthly Savings:** ${formatCurrency(icpSavingsMonthly)}

---

## 4. Our Recommendation

${sections.recommendation}

---

## 5. Equipment Recommendation

${sections.equipmentRecommendation}

---

## 6. Next Steps

${sections.nextSteps}

---

## Ready to Start Saving?

${sections.closingStatement}

**Contact:**
${agentName}
${agentPhone} | ${agentEmail}

---

*This proposal is confidential and intended solely for ${merchantName}.*
`;
}
