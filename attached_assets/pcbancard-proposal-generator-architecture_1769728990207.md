# PCBancard Proposal Generator - Replit Architecture v2.0

## Overview

An **agentic workflow** that generates custom merchant processing proposals comparing Dual Pricing vs. Interchange Plus, with terminal/equipment selection from EquipIQ, branded with PCBancard assets, and delivered as a professional PDF or DOCX.

---

## 1. Exact Data Schema from Your Proposals

Based on the Stephanie Cameron DD examples, here's the normalized JSON your parser should emit:

```json
{
  "proposal_meta": {
    "merchant_name": "Stephanie Cameron DD",
    "prepared_date": "2025-09-10T14:45:00",
    "agent_name": "Kevin Swint",
    "agent_title": "PCBancard Account Executive"
  },
  
  "current_state": {
    "total_volume": 16531.97,
    "total_transactions": 117,
    "avg_ticket": 141.30,
    
    "card_breakdown": {
      "visa": {
        "volume": 8038.40,
        "transactions": 70,
        "rate_percent": 5.00,
        "per_tx_fee": 0.37,
        "total_cost": 427.82
      },
      "mastercard": {
        "volume": 4978.97,
        "transactions": 35,
        "rate_percent": 5.00,
        "per_tx_fee": 0.37,
        "total_cost": 261.90
      },
      "discover": {
        "volume": 3514.60,
        "transactions": 6,
        "rate_percent": 5.00,
        "per_tx_fee": 0.37,
        "total_cost": 177.95
      },
      "amex": {
        "volume": 0,
        "transactions": 6,
        "rate_percent": 5.00,
        "per_tx_fee": 0.37,
        "total_cost": 2.22
      }
    },
    
    "fees": {
      "statement_fee": 10.00,
      "pci_non_compliance": 0.00,
      "credit_passthrough": 535.69,
      "other_fees": 0.00,
      "batch_header": 0.00
    },
    
    "total_monthly_cost": 1415.58,
    "effective_rate_percent": 8.56
  },
  
  "option_interchange_plus": {
    "discount_rate_percent": 2.00,
    "per_transaction_fee": 0.15,
    
    "projected_costs": {
      "visa_cost": 171.27,
      "mastercard_cost": 104.83,
      "discover_cost": 71.19,
      "amex_cost": 0.90,
      "transaction_fees": 17.55,
      "on_file_fee": 9.95,
      "credit_passthrough": 535.69,
      "other_fees": 0.00
    },
    
    "total_monthly_cost": 893.83,
    "monthly_savings": 521.75,
    "savings_percent": 59.30,
    "annual_savings": 6260.99
  },
  
  "option_dual_pricing": {
    "merchant_discount_rate": 0.00,
    "per_transaction_fee": 0.00,
    "monthly_program_fee": 64.95,
    
    "projected_costs": {
      "processing_cost": 0.00,
      "dual_pricing_monthly": 64.95,
      "credit_passthrough": 0.00,
      "other_fees": 0.00
    },
    
    "total_monthly_cost": 64.95,
    "monthly_savings": 1350.63,
    "savings_percent": 153.50,
    "annual_savings": 16207.54
  },
  
  "equipment": {
    "selected_terminal": null,
    "terminal_name": null,
    "terminal_image_url": null,
    "terminal_features": [],
    "pricing_model": null
  }
}
```

---

## 2. Agentic Workflow (5-Step Process)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AGENT ORCHESTRATOR                                │
│                                                                          │
│  Step 1: Parse Uploads ──► Step 2: EquipIQ Lookup ──► Step 3: Research  │
│                                      │                                   │
│  Step 4: Claude Composer ◄───────────┘                                  │
│         │                                                                │
│         ▼                                                                │
│  Step 5: Render & Deliver                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step 1: Parse Uploaded Spreadsheets

**Input:** Two Excel/CSV files (Dual Pricing + Interchange Plus proposals)

**Parser Logic:**
```javascript
// Replit pseudocode
async function parseProposalFiles(dpFile, icFile) {
  // Extract key cells from each sheet
  // Both sheets share the same "current state" section
  
  const currentState = extractCurrentState(dpFile); // or icFile - same data
  const dpOption = extractDualPricingOption(dpFile);
  const icOption = extractInterchangePlusOption(icFile);
  
  return {
    current_state: currentState,
    option_dual_pricing: dpOption,
    option_interchange_plus: icOption
  };
}
```

**Cell Mapping (from your PDFs):**

| Data Point | Location in Spreadsheet |
|------------|-------------------------|
| Visa Volume | Row: "VS Interchange", Col: "Volume" |
| Visa Rate | Row: "Discount Rate", Col: "Rate" |
| MC Volume | Row: "MC Interchange", Col: "Volume" |
| Discover Volume | Row: "Discover", Col: "Volume" |
| VS Item Fee | Row: "VS Item Fee", Col: "Transaction Rate" |
| Number of Transactions | Row: "VS Item Fee", Col: "Number of Transactions" |
| Statement Fee | Row: "Statement Fee", Col: "Cost" |
| Credit Pass-through | Row: "Credit Pass-through", Col: "Cost" |
| TOTAL PROCESSING FEES | Row: "TOTAL:", bottom section |
| Monthly Savings | Row: "Estimated Monthly Processing Savings" |
| Yearly Savings | Row: "Estimated Yearly Processing Savings" |

---

### Step 2: EquipIQ Terminal Selection (Agentic)

The agent needs to select the appropriate terminal based on merchant needs.

**Trigger:** After parsing, the agent queries EquipIQ for available terminals.

```javascript
// Agent prompt for terminal selection
const equipmentPrompt = `
You are selecting a terminal for this merchant. Review EquipIQ inventory.

MERCHANT PROFILE:
- Monthly Volume: $${data.current_state.total_volume}
- Transactions: ${data.current_state.total_transactions}
- Average Ticket: $${data.current_state.avg_ticket}
- Program Selected: ${selectedProgram} // Dual Pricing or IC+

REQUIREMENTS:
- For Dual Pricing: Terminal must support dual pricing/surcharge display
- For IC+: Standard terminal acceptable
- Consider volume tier for feature recommendations

Query EquipIQ and return:
{
  "terminal_id": "",
  "terminal_name": "",
  "terminal_image_url": "",
  "terminal_features": [],
  "monthly_cost": null,
  "one_time_cost": null,
  "why_selected": ""
}
`;
```

**EquipIQ Integration Pattern:**
```javascript
// The agent should look at EquipIQ data store in the app
async function selectTerminal(merchantProfile, programType) {
  // Agent reads from EquipIQ equipment catalog
  // Filters by: dual_pricing_compatible, volume_tier, features
  // Returns best match with reasoning
}
```

---

### Step 3: Business Research (Optional but Recommended)

If `website_url` or `business_name` is provided, enrich the proposal.

**Research Agent Prompt:**
```text
SYSTEM:
You are a business research assistant. Return JSON only. Do not fabricate.

USER:
Research this business:
- Business name: {{business_name}}
- Address: {{business_address}}
- Website: {{website_url}}

Return:
{
  "business_description": "1-2 sentences",
  "industry": "",
  "services_products": [],
  "differentiators": [],
  "years_in_business": null,
  "tone_recommendation": "professional|friendly|premium|local",
  "logo_url": null,
  "source_urls": []
}
```

---

### Step 4: Claude Proposal Composer

**This is the main creative step.** Claude generates the proposal blueprint.

```text
SYSTEM:
You are the PCBancard Proposal Composer. Create a customized merchant services proposal.

CRITICAL RULES:
1. Use ONLY numbers from the pricing data JSON. Never invent figures.
2. All savings claims must match the spreadsheet calculations exactly.
3. Frame Dual Pricing as "customer choice" - they can pay cash to avoid fees.
4. Frame Interchange Plus as "reduced rates with full transparency."
5. Include the selected terminal with its features.
6. Always include assumptions and disclosures.
7. Output VALID JSON matching the schema below.

DEVELOPER:
Return a single JSON object. Schema:

{
  "cover": {
    "headline": "Custom Payment Processing Proposal",
    "subheadline": "",
    "prepared_for": "",
    "prepared_by": "",
    "date": ""
  },
  
  "executive_summary": {
    "opening_paragraph": "",
    "key_findings": [],
    "recommendation": ""
  },
  
  "current_situation": {
    "title": "Your Current Processing Costs",
    "narrative": "",
    "table": {
      "headers": ["Card Brand", "Volume", "Current Rate", "Monthly Cost"],
      "rows": []
    },
    "total_monthly": "",
    "effective_rate": ""
  },
  
  "option_dual_pricing": {
    "title": "Option A: Dual Pricing Program",
    "tagline": "",
    "how_it_works": "",
    "benefits": [],
    "costs": {
      "monthly_program_fee": "",
      "processing_cost": "",
      "total_monthly": ""
    },
    "savings": {
      "monthly": "",
      "annual": "",
      "percent": ""
    }
  },
  
  "option_interchange_plus": {
    "title": "Option B: Interchange Plus Pricing",
    "tagline": "",
    "how_it_works": "",
    "benefits": [],
    "costs": {
      "rate": "",
      "per_transaction": "",
      "total_monthly": ""
    },
    "savings": {
      "monthly": "",
      "annual": "",
      "percent": ""
    }
  },
  
  "comparison_table": {
    "headers": ["", "Current", "Dual Pricing", "Interchange Plus"],
    "rows": [
      ["Monthly Cost", "", "", ""],
      ["Annual Cost", "", "", ""],
      ["Monthly Savings", "—", "", ""],
      ["Annual Savings", "—", "", ""]
    ]
  },
  
  "equipment": {
    "title": "Recommended Equipment",
    "terminal_name": "",
    "terminal_image_slot": "terminal_hero",
    "features": [],
    "why_recommended": ""
  },
  
  "next_steps": {
    "title": "Getting Started",
    "steps": [],
    "cta_primary": "",
    "cta_secondary": ""
  },
  
  "assumptions_disclosures": [
    "Savings estimates based on provided processing volume of $X/month.",
    "Actual results may vary based on card mix and transaction patterns.",
    "Dual Pricing program requires customer notification signage.",
    "All rates subject to approval and underwriting."
  ],
  
  "design_tokens": {
    "palette": {
      "primary": "#1E3A5F",
      "secondary": "#4A90A4",
      "accent": "#2ECC71",
      "background": "#FFFFFF",
      "text": "#333333"
    },
    "fonts": {
      "heading": "Arial",
      "body": "Arial"
    }
  },
  
  "image_prompts": [
    {
      "slot": "cover_hero",
      "prompt": "Abstract business growth graphic, upward trending lines, professional blue palette, clean modern design, no text, suitable for financial document cover"
    },
    {
      "slot": "dual_pricing_icon",
      "prompt": "Simple icon representing customer choice, two paths diverging, clean line art, blue and green colors"
    },
    {
      "slot": "terminal_hero",
      "prompt": "Modern payment terminal on clean white background, professional product photography style"
    }
  ]
}

USER:
Create a proposal using this data:

MERCHANT: {{merchant_name}}
AGENT: {{agent_name}}, {{agent_title}}
DATE: {{prepared_date}}

PRICING DATA:
{{normalized_pricing_json}}

EQUIPMENT SELECTED:
{{equipment_json}}

BUSINESS RESEARCH (if available):
{{business_research_json}}

Generate the proposal blueprint now.
```

---

### Step 5: Render & Deliver

**Option A: DOCX Generation (Recommended for Editable Deliverable)**

Using `docx-js` in Node.js:

```javascript
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        ImageRun, Header, Footer, AlignmentType, WidthType, ShadingType,
        BorderStyle, HeadingLevel } = require('docx');
const fs = require('fs');

async function renderProposalDocx(blueprint, pcbancardLogo, terminalImage) {
  
  // PCBancard brand colors
  const PRIMARY = "1E3A5F";
  const ACCENT = "2ECC71";
  
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Arial", size: 24 } }
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 36, bold: true, font: "Arial", color: PRIMARY },
          paragraph: { spacing: { before: 240, after: 120 } }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, font: "Arial", color: PRIMARY },
          paragraph: { spacing: { before: 200, after: 100 } }
        }
      ]
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 }, // US Letter
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new ImageRun({
                  type: "png",
                  data: pcbancardLogo,
                  transformation: { width: 150, height: 50 },
                  altText: { title: "PCBancard", description: "Logo", name: "logo" }
                })
              ]
            })
          ]
        })
      },
      children: buildDocumentSections(blueprint, terminalImage)
    }]
  });
  
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

function buildDocumentSections(blueprint, terminalImage) {
  const sections = [];
  
  // Cover Page
  sections.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      children: [new TextRun(blueprint.cover.headline)]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [new TextRun({ text: blueprint.cover.subheadline, size: 28 })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [new TextRun(`Prepared for: ${blueprint.cover.prepared_for}`)]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun(`Prepared by: ${blueprint.cover.prepared_by}`)]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun(blueprint.cover.date)]
    }),
    new Paragraph({ children: [new PageBreak()] })
  );
  
  // Executive Summary
  sections.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun("Executive Summary")]
    }),
    new Paragraph({
      children: [new TextRun(blueprint.executive_summary.opening_paragraph)]
    })
  );
  
  // Key findings as bullets
  blueprint.executive_summary.key_findings.forEach(finding => {
    sections.push(
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        children: [new TextRun(finding)]
      })
    );
  });
  
  // Comparison Table
  sections.push(buildComparisonTable(blueprint.comparison_table));
  
  // Equipment Section with Image
  if (terminalImage) {
    sections.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun(blueprint.equipment.title)]
      }),
      new Paragraph({
        children: [
          new ImageRun({
            type: "png",
            data: terminalImage,
            transformation: { width: 200, height: 250 },
            altText: { 
              title: blueprint.equipment.terminal_name,
              description: "Payment Terminal",
              name: "terminal"
            }
          })
        ]
      }),
      new Paragraph({
        children: [new TextRun({ 
          text: blueprint.equipment.terminal_name, 
          bold: true,
          size: 28 
        })]
      }),
      new Paragraph({
        children: [new TextRun(blueprint.equipment.why_recommended)]
      })
    );
  }
  
  // Assumptions & Disclosures
  sections.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun("Assumptions & Disclosures")]
    })
  );
  
  blueprint.assumptions_disclosures.forEach(disclosure => {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: disclosure, size: 20, italics: true })]
      })
    );
  });
  
  return sections;
}

function buildComparisonTable(tableData) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };
  
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2340, 2340, 2340, 2340],
    rows: [
      // Header row
      new TableRow({
        children: tableData.headers.map(header => 
          new TableCell({
            borders,
            shading: { fill: "1E3A5F", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: header, bold: true, color: "FFFFFF" })]
              })
            ]
          })
        )
      }),
      // Data rows
      ...tableData.rows.map((row, index) =>
        new TableRow({
          children: row.map(cell =>
            new TableCell({
              borders,
              shading: { 
                fill: index % 2 === 0 ? "F5F5F5" : "FFFFFF", 
                type: ShadingType.CLEAR 
              },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [new TextRun(cell)] })]
            })
          )
        })
      )
    ]
  });
}
```

---

## 3. Image Generation with Gemini (Nano Banana Pro)

When EquipIQ doesn't have an image, or for decorative graphics:

```javascript
async function generateImage(prompt, style = "professional") {
  // Call Gemini Nano Banana Pro
  const response = await fetch('GEMINI_ENDPOINT', {
    method: 'POST',
    body: JSON.stringify({
      prompt: `${prompt}. Style: ${style}, clean, print-ready, no text overlays, suitable for business documents.`,
      aspect_ratio: "16:9",
      style_preset: "corporate"
    })
  });
  
  return response.imageUrl;
}
```

**Default Image Prompts:**
```json
{
  "cover_hero": "Abstract upward trending graph lines with subtle gradient, professional blue palette (#1E3A5F to #4A90A4), clean minimalist design, suitable for financial document cover, no text",
  
  "savings_graphic": "Simple infographic showing money/coins flowing downward into a piggy bank, clean line art, green accent color, white background",
  
  "dual_pricing_concept": "Two parallel paths diverging, one with cash symbol one with card symbol, clean modern iconography, blue and green colors",
  
  "terminal_placeholder": "Modern sleek payment terminal silhouette, professional product shot style, white background, subtle shadow"
}
```

---

## 4. Complete Agentic Flow (Replit Implementation)

```javascript
// main.js - Agentic Orchestrator

class ProposalAgent {
  constructor() {
    this.state = {
      step: 'idle',
      parsedData: null,
      equipment: null,
      research: null,
      blueprint: null,
      finalDocument: null
    };
  }
  
  async generateProposal(inputs) {
    const { dpFile, icFile, merchantInfo, agentInfo, outputFormat } = inputs;
    
    // STEP 1: Parse spreadsheets
    this.state.step = 'parsing';
    this.state.parsedData = await this.parseSpreadsheets(dpFile, icFile);
    console.log('✓ Parsed proposal data');
    
    // STEP 2: Select equipment from EquipIQ
    this.state.step = 'equipment_selection';
    this.state.equipment = await this.selectEquipment(this.state.parsedData);
    console.log(`✓ Selected: ${this.state.equipment.terminal_name}`);
    
    // STEP 3: Business research (optional)
    if (merchantInfo.website_url || merchantInfo.business_name) {
      this.state.step = 'researching';
      this.state.research = await this.researchBusiness(merchantInfo);
      console.log('✓ Business research complete');
    }
    
    // STEP 4: Generate proposal blueprint with Claude
    this.state.step = 'composing';
    this.state.blueprint = await this.composeProposal({
      pricing: this.state.parsedData,
      equipment: this.state.equipment,
      research: this.state.research,
      merchant: merchantInfo,
      agent: agentInfo
    });
    console.log('✓ Proposal blueprint generated');
    
    // STEP 5: Render document
    this.state.step = 'rendering';
    if (outputFormat === 'pdf') {
      this.state.finalDocument = await this.renderPDF(this.state.blueprint);
    } else {
      this.state.finalDocument = await this.renderDOCX(this.state.blueprint);
    }
    console.log(`✓ ${outputFormat.toUpperCase()} generated`);
    
    return {
      document: this.state.finalDocument,
      metadata: {
        merchant: merchantInfo.business_name,
        savings_dp: this.state.parsedData.option_dual_pricing.annual_savings,
        savings_ic: this.state.parsedData.option_interchange_plus.annual_savings,
        equipment: this.state.equipment.terminal_name
      }
    };
  }
  
  async selectEquipment(pricingData) {
    // Agent queries EquipIQ
    // Look at EquipIQ data store in the app
    const equipmentCatalog = await this.loadEquipIQ();
    
    // Selection logic based on:
    // - Volume tier
    // - Dual pricing compatibility requirement
    // - Feature set
    
    const volumeTier = pricingData.current_state.total_volume > 50000 ? 'high' : 
                       pricingData.current_state.total_volume > 10000 ? 'medium' : 'low';
    
    // Filter and rank equipment
    const suitable = equipmentCatalog.filter(eq => 
      eq.dual_pricing_compatible && 
      eq.volume_tier_min <= pricingData.current_state.total_volume
    );
    
    return suitable[0] || { terminal_name: 'To Be Determined', terminal_image_url: null };
  }
  
  async loadEquipIQ() {
    // Read from EquipIQ data store
    // This is where Replit connects to your existing EquipIQ integration
    return fetch('/api/equipiq/terminals').then(r => r.json());
  }
}

// Express endpoint
app.post('/api/generate-proposal', async (req, res) => {
  const agent = new ProposalAgent();
  
  try {
    const result = await agent.generateProposal(req.body);
    
    res.json({
      success: true,
      download_url: result.document.url,
      summary: {
        merchant: result.metadata.merchant,
        dual_pricing_annual_savings: result.metadata.savings_dp,
        interchange_plus_annual_savings: result.metadata.savings_ic,
        recommended_terminal: result.metadata.equipment
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## 5. Form Fields for Agent Interface

```javascript
// What the agent fills out in Replit

const proposalForm = {
  // REQUIRED
  uploads: {
    dual_pricing_spreadsheet: File,     // Your DP proposal export
    interchange_plus_spreadsheet: File  // Your IC+ proposal export
  },
  
  // RECOMMENDED
  agent: {
    first_name: "Kevin",
    last_name: "Swint",
    title: "PCBancard Account Executive",
    phone: "",
    email: ""
  },
  
  // OPTIONAL (enriches proposal)
  merchant: {
    business_name: "Stephanie Cameron DD",
    contact_name: "Stephanie Cameron",
    address: "",
    phone: "",
    email: "",
    website_url: ""  // Triggers research agent
  },
  
  // OUTPUT
  output_format: "pdf" | "docx",
  
  // EQUIPMENT (auto-selected or manual override)
  equipment_override: null | "terminal_id_from_equipiq"
};
```

---

## 6. PCBancard Branding Assets

Store these in Replit's asset folder:

```
/assets/
  pcbancard-logo.png          (header/footer)
  pcbancard-logo-white.png    (for dark backgrounds)
  brand-colors.json           (see below)
```

**brand-colors.json:**
```json
{
  "primary": "#1E3A5F",
  "secondary": "#4A90A4", 
  "accent": "#2ECC71",
  "success": "#27AE60",
  "warning": "#F39C12",
  "text_dark": "#333333",
  "text_light": "#FFFFFF",
  "background": "#FFFFFF",
  "table_header": "#1E3A5F",
  "table_alt_row": "#F5F5F5"
}
```

---

## 7. Sample Output (What Agent Sees After Generation)

```
┌─────────────────────────────────────────────────────────────┐
│  ✓ Proposal Generated Successfully                          │
├─────────────────────────────────────────────────────────────┤
│  Merchant: Stephanie Cameron DD                             │
│  Agent: Kevin Swint                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SAVINGS COMPARISON                                  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  Dual Pricing:      $1,350.63/mo  │  $16,207/yr     │   │
│  │  Interchange Plus:  $521.75/mo    │  $6,261/yr      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Equipment: Clover Flex (Dual Pricing Compatible)           │
│                                                             │
│  [📥 Download PDF]  [📄 Download DOCX]  [📧 Email to Merchant] │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Error Handling & Edge Cases

```javascript
const errorHandlers = {
  // Missing data in spreadsheet
  'MISSING_VOLUME': 'Volume data not found. Check cell B3 in spreadsheet.',
  
  // EquipIQ unavailable
  'EQUIPIQ_OFFLINE': 'Equipment catalog unavailable. Proposal generated with placeholder.',
  
  // Image generation failed
  'IMAGE_GEN_FAILED': 'Using default graphics. Proposal still complete.',
  
  // Invalid savings calculation
  'NEGATIVE_SAVINGS': 'Warning: Current rates appear lower than proposed. Please verify.',
  
  // Claude API error
  'COMPOSER_ERROR': 'Proposal composition failed. Retrying with simplified template.'
};
```

---

## Next Steps for Replit Build

1. **Upload this document** to Replit as the architecture spec
2. **Connect EquipIQ** - Point to your existing equipment data store
3. **Add PCBancard logo** to `/assets/`
4. **Build the parser** - Map your exact spreadsheet format
5. **Test with Stephanie Cameron example** - Validate numbers match exactly
6. **Add more terminals** to EquipIQ with `dual_pricing_compatible` flag

The agent will handle the multi-step orchestration automatically, and Kevin (or any agent) just uploads two spreadsheets and gets a professional, branded proposal back.
