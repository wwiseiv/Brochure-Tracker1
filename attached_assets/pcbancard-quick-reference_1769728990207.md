# PCBancard Proposal Generator - Quick Reference

## Data Extracted from Your Example Proposals

### Stephanie Cameron DD - Current State (Both Files Share This)
| Metric | Value |
|--------|-------|
| Total Volume | $16,531.97 |
| Total Transactions | 117 |
| Visa Volume | $8,038.40 (70 txns) |
| MasterCard Volume | $4,978.97 (35 txns) |
| Discover Volume | $3,514.60 (6 txns) |
| Current Rate | 5.00% |
| Current Per-Txn Fee | $0.37 |
| Statement Fee | $10.00 |
| Credit Pass-through | $535.69 |
| **TOTAL MONTHLY COST** | **$1,415.58** |

### Interchange Plus Option
| Metric | Value |
|--------|-------|
| Proposed Rate | 2.00% |
| Per-Txn Fee | $0.15 |
| On-File Fee | $9.95 |
| **TOTAL MONTHLY** | **$893.83** |
| Monthly Savings | $521.75 (59.30%) |
| Annual Savings | $6,260.99 |

### Dual Pricing Option
| Metric | Value |
|--------|-------|
| Merchant Rate | 0.00% |
| Per-Txn Fee | $0.00 |
| Monthly Program Fee | $64.95 |
| **TOTAL MONTHLY** | **$64.95** |
| Monthly Savings | $1,350.63 (153.50%) |
| Annual Savings | $16,207.54 |

---

## Replit Implementation Checklist

### ☐ Step 1: Spreadsheet Parser
```javascript
// Key cells to extract (adjust row/col based on your actual export)
const CELL_MAP = {
  visa_volume: 'C4',
  visa_rate: 'D4',
  mc_volume: 'C8',
  discover_volume: 'C12',
  vs_txn_fee: 'B17',
  vs_txn_count: 'C17',
  statement_fee: 'B23',
  credit_passthrough: 'B25',
  total_current: 'B28',
  total_proposed: 'E28',
  monthly_savings: 'E30',
  yearly_savings: 'E32'
};
```

### ☐ Step 2: EquipIQ Integration
```javascript
// Tell Replit: "Look at EquipIQ for terminal selection"
// Agent needs these fields from EquipIQ:
const terminalFields = {
  id: 'terminal_id',
  name: 'terminal_name',
  image_url: 'image_path',
  dual_pricing_compatible: true/false,
  features: ['NFC', 'EMV', 'PIN Debit'],
  monthly_cost: null,  // if applicable
  one_time_cost: null  // if free terminal program
};
```

### ☐ Step 3: PCBancard Assets
- Upload `pcbancard-logo.png` to `/assets/`
- Colors: Primary `#1E3A5F`, Accent `#2ECC71`

### ☐ Step 4: Document Generation
- Use `docx` npm package for DOCX
- Use `pdfkit` or `reportlab` for PDF
- Both should produce identical content

### ☐ Step 5: Agent Output
Return to agent:
- Download link for PDF/DOCX
- Summary card with savings numbers
- Option to email directly to merchant

---

## Agentic Workflow Sequence

```
[Agent Uploads 2 Spreadsheets]
           ↓
[1. Parse → Extract Numbers]
           ↓
[2. EquipIQ → Select Terminal]
           ↓
[3. Research → Enrich (Optional)]
           ↓
[4. Claude → Generate Blueprint]
           ↓
[5. Render → PDF or DOCX]
           ↓
[Return to Agent with Download Link]
```

---

## Tell Replit This

> "Build an agentic proposal generator that:
> 1. Accepts two spreadsheet uploads (Dual Pricing + Interchange Plus)
> 2. Parses them into a normalized JSON (see cell mapping above)
> 3. Queries EquipIQ for terminal selection based on merchant volume
> 4. Uses Claude Opus 4.5 to compose a customized proposal blueprint
> 5. Optionally generates images with Gemini Nano Banana Pro
> 6. Renders a branded PDF or DOCX with PCBancard logo
> 7. Returns the document to the agent for merchant presentation
>
> The data structure comes from PCBancard proposal exports.
> EquipIQ data is already in the app.
> All proposals must include both Dual Pricing AND Interchange Plus options."

---

## Sample API Response

```json
{
  "success": true,
  "download_url": "/outputs/proposals/stephanie-cameron-dd-2025-09-10.pdf",
  "summary": {
    "merchant": "Stephanie Cameron DD",
    "current_monthly_cost": 1415.58,
    "dual_pricing": {
      "monthly_cost": 64.95,
      "monthly_savings": 1350.63,
      "annual_savings": 16207.54
    },
    "interchange_plus": {
      "monthly_cost": 893.83,
      "monthly_savings": 521.75,
      "annual_savings": 6260.99
    },
    "recommended_terminal": "Clover Flex"
  }
}
```
