# Phase 2: Core Engine — PDF Generation, Document Upload, Equipment IQ

## PREREQUISITE
Phase 1 must be complete and verified. The third tab, template library, stepper, and contact info review must all be working.

---

## SCOPE — WHAT THIS PHASE DELIVERS
1. Template-Fill mode PDF generation (deterministic, no AI)
2. Document upload handling (merchant statement, dual pricing analysis, interchange+ analysis)
3. Number extraction from uploaded analysis PDFs
4. Equipment IQ integration (agent picks equipment from existing system)
5. Conditional output logic (no docs, one analysis, both analyses)
6. Save/download/preview of generated PDF

## WHAT THIS PHASE DOES NOT DO
- No AI-Custom mode (Phase 3)
- No website scraping (Phase 3)
- No help menu / tooltip updates (Phase 4)

---

## PRIME DIRECTIVE REMINDER
ADDITIVE ONLY. Do not modify AI Workflow or Manual Upload behavior.

---

## STEP-BY-STEP INSTRUCTIONS

### 2.1 Template-Fill PDF Generation Engine

This is the core of the feature. Build a service/utility that:

1. Takes as input:
   - Selected template (templateId → base template PDF)
   - Merchant name (string)
   - Agent contact info (name, title, phone, email)
   - Equipment selection (name, price/terms — optional)
   - Savings numbers (optional, from uploaded docs)

2. Produces as output:
   - A single-page PDF with dynamic content overlaid on the template

**CRITICAL DECISION: Use the same approach as Marketing Materials contact overlay.**

Based on Phase 0 findings, use the identical method. The most likely approaches:

**If the app uses PDF coordinate overlay (pdf-lib):**
- Load the base template PDF
- Define text placement coordinates for each template's dynamic fields
- Use pdf-lib's `drawText()` to place content at specific x,y positions
- Store coordinate maps per template in the metadata config
- Handle text that might be too long (truncation or font size reduction)

**If the app uses HTML-to-PDF:**
- Create an HTML template for each of the 7 designs
- Use CSS to match the Canva designs as closely as possible
- Inject dynamic values into the HTML
- Render to PDF using the same renderer (puppeteer, html-pdf, etc.)

**If the app uses image background + text overlay:**
- Render each template page as a high-res background image
- Overlay text boxes at defined positions
- Export as PDF

**Coordinate map structure (for PDF overlay approach):**

```javascript
const TEMPLATE_FIELD_POSITIONS = {
  "exclusive-offer-standard": {
    merchantName: { x: 160, y: 720, fontSize: 28, fontFamily: "Helvetica-Bold", maxWidth: 400 },
    dualPricingSavings: { x: 56, y: 465, fontSize: 13, fontFamily: "Helvetica" },
    surchargeSavings: { x: 56, y: 430, fontSize: 13, fontFamily: "Helvetica" },
    equipmentName: { x: 320, y: 465, fontSize: 13, fontFamily: "Helvetica" },
    equipmentPrice: { x: 320, y: 445, fontSize: 13, fontFamily: "Helvetica" },
    agentName: { x: 56, y: 120, fontSize: 18, fontFamily: "Helvetica-Bold" },
    agentTitle: { x: 56, y: 100, fontSize: 11, fontFamily: "Helvetica" },
    agentPhone: { x: 56, y: 85, fontSize: 11, fontFamily: "Helvetica" },
    agentEmail: { x: 56, y: 70, fontSize: 11, fontFamily: "Helvetica" },
  },
  // ... repeat for each template
};
```

**IMPORTANT:** The exact coordinates will need manual tuning. Get them approximately right by measuring the PDF pages, then expect to iterate. Start with the "Exclusive Offer (Standard)" template — Page 1 — and get that working perfectly before doing the other 6.

**Test:** Generate a PDF for the standard template with test merchant name "Test Business LLC" and verify text appears in roughly the right locations.

### 2.2 Document Upload Handling (Step 3)

Wire up the upload UI that was a placeholder in Phase 1:

**Three optional upload slots:**
1. Merchant Statement (PDF, optional)
2. Dual Pricing Analysis (PDF, optional)
3. Interchange Plus Analysis (PDF, optional)

**Requirements:**
- Use the existing upload component and patterns from the app
- PDF-only validation (reject non-PDF files with clear error message)
- File size limit: match whatever the app already enforces (typically 10-25MB)
- Store uploaded files using existing storage patterns (same as Proposal Generator uploads)
- Show file name + remove button after successful upload
- Each slot is independent — any combination is valid

### 2.3 Number Extraction from Analysis PDFs

When an analysis PDF is uploaded, extract key financial numbers:

**Target numbers to find:**
- Annual savings amount (e.g., "$655.44", "$32,177")
- Program type mentioned (Dual Pricing, Surcharge, Traditional, Interchange Plus)
- Monthly processing volume (if stated)
- Effective rate (if stated)

**Extraction approach:**
1. Extract text from uploaded PDF (use pdf-parse, pdf.js, or whatever the project already has)
2. Search for dollar amounts using regex: `/\$[\d,]+\.?\d{0,2}/g`
3. Search for program type keywords near the dollar amounts
4. Return structured data:

```javascript
{
  programType: "Dual Pricing" | "Surcharge" | "Traditional" | "Interchange Plus",
  annualSavings: "$655.44",
  monthlySavings: "$54.62",  // optional
  monthlyVolume: "$12,500",  // optional
  effectiveRate: "2.4%",     // optional
  rawText: "..." // full extracted text for debugging
}
```

**GRACEFUL DEGRADATION — CRITICAL:**
- If extraction finds no numbers → proceed without savings section, use generic template text
- If extraction finds ambiguous numbers → include them but mark as "estimated" in the output
- **NEVER fabricate a number.** If it's not in the uploaded document, don't put it in the output.
- Log extraction results for debugging

### 2.4 Equipment IQ Integration (Step 4)

Wire the Equipment IQ selector into Step 4:

- Use the existing Equipment IQ data source/API identified in Phase 0
- Present available equipment as a selectable list or searchable dropdown
- Show: equipment name, price (if available), short description
- Agent selects one or more pieces of equipment
- Selected equipment feeds into the PDF generation:
  - Equipment name goes into the "Equipment Recommendations" section
  - Equipment price/terms if available

**If no existing picker component exists:**
- Build a simple searchable dropdown or card-select that queries the Equipment IQ API
- Match existing UI patterns

**If Equipment IQ has no data or isn't populated:**
- Allow manual text entry as fallback: "Equipment Name" and "Equipment Price/Terms" text fields
- Show these below the Equipment IQ picker as "Or enter manually"

### 2.5 Conditional Output Logic

The generated PDF content varies based on what was uploaded:

**Scenario A: No analysis docs uploaded**
- Use template with merchant name + equipment + agent contact info
- Savings section shows generic text: "Let us analyze your current processing statement to show your potential savings"
- Or omit the savings numbers entirely and keep the section headers

**Scenario B: Only Dual Pricing analysis uploaded**
- Show Dual Pricing savings: "✅ Dual Pricing Program: $X in annual savings"
- Omit Surcharge and Traditional savings lines (or show as "Available upon request")

**Scenario C: Only Interchange Plus analysis uploaded**
- Show Interchange Plus savings
- Omit Dual Pricing/Surcharge lines

**Scenario D: Both Dual Pricing AND Interchange Plus uploaded**
- Show both with a comparison block:
  - "✅ Dual Pricing Program: $X in annual savings (our top recommendation)"
  - "✅ Interchange Plus Program: $Y in annual savings"
- If one is clearly better, mark it as "(our top recommendation)"

**Scenario E: Merchant statement uploaded (no analysis)**
- Similar to Scenario A but can note: "Based on your statement, we recommend a full savings analysis"

### 2.6 Generate, Preview, Download, Save (Step 6)

Wire up the Generate button:

1. **Generate:** Call the PDF generation service with all collected inputs
2. **Progress:** Show loading/progress indicator during generation
3. **Preview:** Display the generated PDF in-app (use same preview mechanism as existing Proposal Generator)
4. **Download:** Provide download button (same pattern as existing)
5. **Save to merchant record:** If the existing Proposal Generator saves proposals to merchant records, replicate that pattern
   - If not, skip this — just download is fine

**File naming convention:** Match existing patterns, e.g.:
`OnePageProposal_[MerchantName]_[Date]_[TemplateId].pdf`

**Error handling:**
- Generation failure → show error toast with retry option
- Partial data → generate what you can, note what's missing
- Timeout → set reasonable timeout (30 seconds), show error if exceeded

---

## ACCEPTANCE CRITERIA FOR PHASE 2

- [ ] Template-Fill mode generates a real one-page PDF
- [ ] Merchant name appears in the correct location on the generated PDF
- [ ] Agent contact info appears in the correct location (matching template layout)
- [ ] Equipment name/price from Equipment IQ appears in equipment section
- [ ] Document upload works for all three slots (PDF only, size validated)
- [ ] Number extraction correctly pulls savings from analysis PDFs
- [ ] Scenario A (no docs): generic proposal generates correctly
- [ ] Scenario B (dual pricing only): shows dual pricing savings
- [ ] Scenario C (interchange only): shows interchange savings
- [ ] Scenario D (both): shows comparison block
- [ ] Generated PDF can be previewed in-app
- [ ] Generated PDF can be downloaded
- [ ] No fabricated numbers in any scenario
- [ ] Existing AI Workflow still works
- [ ] Existing Manual Upload still works
- [ ] All stepper steps now functional (no more placeholders except AI-Custom mode indicator)

---

## COORDINATE TUNING NOTE

After initial implementation, you will likely need to adjust text coordinates on the PDF overlays. This is expected. Get it working for Template 1 (Exclusive Offer Standard) first, verify with a test generation, then replicate the pattern for the remaining 6 templates. Each template will need its own coordinate map.

If using HTML-to-PDF instead of coordinate overlay, the equivalent work is CSS positioning to match the original Canva designs.

---

## WHEN DONE
Confirm all acceptance criteria. Generate a sample PDF for each of the 7 templates and verify the output looks reasonable. Report any coordinate/positioning issues that need manual adjustment. Then stop and wait for Phase 3 instructions.
