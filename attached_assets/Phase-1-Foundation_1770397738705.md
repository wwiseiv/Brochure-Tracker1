# Phase 1: Foundation — Third Tab + Template Library + Stepper Shell

## PREREQUISITE
You must have completed Phase 0 (Discovery) and have the findings document available. Reference it throughout this phase.

---

## SCOPE — WHAT THIS PHASE DELIVERS
1. A working third tab "One-Page Proposal" in the Proposal Generator segmented control
2. Template library with 7 templates extracted from the source PDF
3. Template selector UI (grid of thumbnail cards)
4. Stepper shell (all 6 steps wired up with navigation, but only Steps 1 and 5 fully functional)
5. Contact info pre-population from logged-in user profile
6. Permission inheritance verified

## WHAT THIS PHASE DOES NOT DO
- No PDF generation yet (that's Phase 2)
- No document upload processing (Phase 2)
- No Equipment IQ integration (Phase 2)
- No AI-Custom mode (Phase 3)
- No help menu / AI assistant / tooltip updates (Phase 4)

---

## PRIME DIRECTIVE
**ADDITIVE ONLY.** Do not modify the behavior of "AI Workflow" or "Manual Upload." The only change to shared components is adding the third tab button to the segmented control.

---

## STEP-BY-STEP INSTRUCTIONS

### 1.1 Add Third Tab to Segmented Control

Using the exact pattern discovered in Phase 0:
- Add a third option to the tab control: **"One-Page Proposal"**
- Icon suggestion: 📋 or use a document/page icon consistent with the existing icon style
- Tab value/key: `one-page-proposal` (or match existing naming convention)
- When selected, render a new component: `OnePageProposal`
- Default selected tab should remain "AI Workflow" (don't change existing default)

**Test:** Load Proposal Generator page. All three tabs visible. Clicking between them works. AI Workflow and Manual Upload behave identically to before.

### 1.2 Extract Templates from Source PDF

The source PDF is a 7-page Canva-designed document already in the project:
`One Page Propsoals, Payroll Offer, Marketing Audit, Video Brochure Flyer.pdf`

For each of the 7 pages:
1. **Split** the PDF into individual single-page PDFs (one per template)
2. **Generate a thumbnail** image (PNG or JPEG, ~400px wide) from each page for the selector UI
3. **Store** each template file and its thumbnail in a consistent location

Recommended tools (use what the project already has installed, or install minimally):
- `pdf-lib` for splitting PDFs
- `pdf-to-img`, `sharp`, or `pdftoppm` (if available) for thumbnails
- If the project uses a different PDF library, use that instead

**Template metadata to create** (as a config file, database seed, or in-code constant — match existing patterns):

```
[
  {
    "templateId": "exclusive-offer-standard",
    "displayName": "Exclusive Offer (Standard)",
    "category": "proposal",
    "description": "Savings breakdown with equipment recommendations and PCBancard features",
    "templateFile": "[path to single-page PDF]",
    "thumbnail": "[path to thumbnail image]",
    "dynamicFields": {
      "merchantName": { "description": "Replaces merchant name in headline" },
      "dualPricingSavings": { "description": "Annual savings from dual pricing", "optional": true },
      "surchargeSavings": { "description": "Annual savings from surcharge program", "optional": true },
      "traditionalSavings": { "description": "Annual savings from traditional program", "optional": true },
      "equipmentName": { "description": "Recommended equipment name", "optional": true },
      "equipmentPrice": { "description": "Equipment price or terms", "optional": true },
      "agentName": { "description": "Agent full name" },
      "agentTitle": { "description": "Agent title line" },
      "agentPhone": { "description": "Agent phone number" },
      "agentEmail": { "description": "Agent email address" }
    }
  },
  {
    "templateId": "exclusive-offer-qr",
    "displayName": "Exclusive Offer (QR Code)",
    "category": "proposal",
    "description": "Savings breakdown with QR code for video offer and agent headshot",
    "dynamicFields": { /* same as above plus qrCodeUrl optional */ }
  },
  {
    "templateId": "referral-merchant-facing",
    "displayName": "Referral Program (Client-Facing)",
    "category": "referral",
    "description": "For enrolled agents — client savings + referral residual income pitch"
  },
  {
    "templateId": "enrolled-agent-referral",
    "displayName": "Enrolled Agent Referral",
    "category": "referral",
    "description": "Headline-focused enrolled agent pitch with dual benefit structure"
  },
  {
    "templateId": "free-payroll-12mo",
    "displayName": "Free Payroll for 12 Months",
    "category": "payroll",
    "description": "PCBancard Payroll & Benefits promotional flyer with testimonial"
  },
  {
    "templateId": "business-grade-audit",
    "displayName": "What's Your Business Grade?",
    "category": "audit",
    "description": "Free digital marketing audit offer — Viv integration"
  },
  {
    "templateId": "video-brochure-5min",
    "displayName": "The Best 5 Minutes",
    "category": "flyer",
    "description": "Video brochure offer flyer with QR code and testimonial"
  }
]
```

**Test:** Thumbnails render correctly. Template metadata is accessible from the app.

### 1.3 Build Template Selector UI (Step 1 of Stepper)

- Grid layout (2 columns on mobile, 3-4 on desktop)
- Each card shows:
  - Thumbnail image
  - Template display name
  - Category badge (small pill/tag)
- Clicking a card selects it (visual highlight — border, checkmark, or similar)
- "Continue" button enabled only when a template is selected
- Match existing app card/grid patterns

### 1.4 Build Stepper Shell

Create a step-by-step wizard with 6 steps. Use the same stepper/wizard pattern already in the app if one exists, otherwise build a simple one:

```
Step 1: Choose Template        ← functional this phase
Step 2: Merchant Info           ← functional this phase (form only, no processing)
Step 3: Upload Docs             ← shell only (UI present, upload disabled with "Coming soon")
Step 4: Choose Equipment        ← shell only (placeholder)
Step 5: Review Contact Info     ← functional this phase
Step 6: Generate PDF            ← shell only (button present but shows "Coming in next update")
```

**Step 2: Merchant Info form fields:**
- Merchant Business Name (text input, required)
- Merchant Website URL (text input, optional, with URL validation)
- Mode toggle: Template-Fill / AI-Custom (radio or segmented mini-control)
  - AI-Custom shows the website URL field more prominently
  - For now, both modes lead to the same flow (AI-Custom logic comes in Phase 3)

**Step 5: Review Contact Info:**
- Pre-populate from logged-in user profile (use same source as Marketing Materials overlay)
- Editable fields: First Name, Last Name, Title, Phone, Email
- If any required field is empty, show inline warning (yellow/orange, not blocking)
- "Title" defaults to "Local Payments Expert and Trusted Business Advisor" if not set

**Stepper navigation:**
- Back/Next buttons on each step
- Step indicator (numbered dots or progress bar)
- Allow jumping back to previous steps
- Mobile-friendly: full-width buttons, adequate touch targets

### 1.5 Verify Permission Inheritance

- Confirm the new tab is NOT accessible when the "Proposal Generator" permission is toggled OFF for a user
- Do NOT create a new permission entry
- If the permission gates at the page/route level → new tab is automatically covered
- If the permission gates at the component level → ensure the OnePageProposal component is inside the same gate
- Test with a non-admin user (e.g., "Emma-Rep" from the team) with Proposal Generator toggled off

---

## ACCEPTANCE CRITERIA FOR PHASE 1

- [ ] Three tabs visible: AI Workflow, Manual Upload, One-Page Proposal
- [ ] AI Workflow works exactly as before
- [ ] Manual Upload works exactly as before
- [ ] Template selector shows 7 template cards with thumbnails
- [ ] Selecting a template highlights it and enables Continue
- [ ] Stepper navigates between all 6 steps (forward and back)
- [ ] Merchant Info form captures name and optional URL
- [ ] Mode toggle (Template-Fill / AI-Custom) is present and functional
- [ ] Contact Info step pre-populates from user profile
- [ ] Contact Info fields are editable with inline warnings for empty required fields
- [ ] Steps 3, 4, 6 show appropriate placeholder/coming-soon state
- [ ] Permission: new tab hidden when Proposal Generator permission is OFF
- [ ] No console errors, no broken routes
- [ ] Mobile-responsive layout

---

## FILES YOU WILL LIKELY CREATE (adjust based on project conventions)
- `OnePageProposal` component (main container for the new tab)
- `TemplateSelector` component (grid of template cards)
- `MerchantInfoForm` component
- `ContactInfoReview` component
- Template metadata config/seed
- Template thumbnail images (generated from PDF)
- Individual template PDF files (split from source)

## FILES YOU WILL LIKELY MODIFY (minimal changes only)
- Proposal Generator page component (add third tab)
- Possibly the tab/segmented control component (if it needs to accept 3 options)

---

## WHEN DONE
List what you built, where each file is located, and confirm all acceptance criteria pass. Then stop and wait for Phase 2 instructions.
