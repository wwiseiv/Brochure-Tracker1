# One-Page Proposal Feature — Master Implementation Plan

## Overview

This document outlines the plan to add a "One-Page Proposal" feature as a third tab inside the existing Proposal Generator module of the FSI Suite (BrochureTracker.com). The feature allows field sales agents to quickly generate professional one-page PDF proposals and flyers from pre-designed templates, with dynamic merchant info, financial data, equipment recommendations, and agent contact info.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────┐
│              PROPOSAL GENERATOR PAGE             │
├────────────┬───────────────┬────────────────────┤
│ AI Workflow│ Manual Upload │ One-Page Proposal  │  ← 3 tabs
│ (existing) │  (existing)   │    (NEW)           │
└────────────┴───────────────┴────────────────────┘
                                      │
                              ┌───────┴───────┐
                              │   6-Step      │
                              │   Stepper     │
                              └───────┬───────┘
                                      │
                    ┌─────────────────┼──────────────────┐
                    │                 │                   │
              Step 1-5           Mode Toggle          Step 6
           (Data Collection)   ┌─────┴──────┐      (Generate)
                               │            │           │
                         Template-    AI-Custom    ┌────┴────┐
                         Fill Mode    Mode         │  PDF    │
                               │            │      │ Engine  │
                               │     ┌──────┤      └────┬────┘
                               │     │      │           │
                               │  Website  RAG      Output:
                               │  Scrape  Assembly  - Preview
                               │  (opt)    + AI     - Download
                               │           Call     - Save
                               │            │
                               └─────┬──────┘
                                     │
                              ┌──────┴──────┐
                              │  Template   │
                              │  PDF +      │
                              │  Overlay    │  ← Reuses Marketing
                              │  Engine     │    Materials pattern
                              └─────────────┘
```

---

## Phase Summary

| Phase | Name | What It Delivers | Estimated Complexity |
|-------|------|-----------------|---------------------|
| **0** | Discovery | Audit existing code, document findings, zero code changes | Low |
| **1** | Foundation | 3rd tab + template library + stepper shell + contact info | Medium |
| **2** | Core Engine | PDF generation + doc uploads + number extraction + Equipment IQ | High |
| **3** | AI-Custom | AI-customized copy + website scraping + RAG pipeline | Medium-High |
| **4** | Polish | Help menu + AI assistant + tooltips + mobile + QA + docs | Medium |

---

## Key Design Decisions

### 1. Template Reproduction Strategy
The source templates are Canva-designed PDFs with rich visual layouts (custom fonts, images, brand elements). We are NOT trying to recreate these designs programmatically. Instead:
- **Base template = the original PDF page** (used as a visual background)
- **Dynamic content = text overlaid at specific coordinates** on top of the base
- This means the Canva designs are preserved perfectly; we just replace/overlay the variable text fields (merchant name, savings numbers, equipment, contact info)

### 2. PDF Overlay vs HTML-to-PDF
The approach must match what the app already does in Marketing Materials. Phase 0 will determine which method is used. If it's coordinate-based PDF overlay (pdf-lib), that's what we use. If it's HTML-to-PDF, we adapt accordingly.

### 3. No New Permission Toggle
The feature lives inside Proposal Generator and inherits its existing permission. This is intentional — it reduces admin complexity and matches the organizational model (Proposal Generator = all proposal tools).

### 4. AI-Custom is Enhancement, Not Requirement
Template-Fill is the primary mode. AI-Custom adds value but the feature must be fully functional without it. Every AI path has a Template-Fill fallback.

### 5. Never Fabricate Numbers
This is a hard rule throughout. Financial numbers come from uploaded analysis documents or they don't appear. The AI is never trusted to generate financial figures.

---

## Template Inventory

| # | Template | Category | Key Dynamic Fields |
|---|----------|----------|--------------------|
| 1 | Exclusive Offer (Standard) | proposal | merchant name, dual pricing savings, surcharge savings, equipment name/price, agent contact |
| 2 | Exclusive Offer (QR Code) | proposal | same as #1 + QR code URL |
| 3 | Referral Program (Client-Facing) | referral | merchant name, client savings pitch, referral income pitch, agent contact |
| 4 | Enrolled Agent Referral | referral | headline, client savings, referral basis points, agent contact |
| 5 | Free Payroll 12 Months | payroll | agent contact (most text is static promotional copy) |
| 6 | Business Grade / Marketing Audit | audit | agent contact (most text is static) |
| 7 | Video Brochure / 5-Min Offer | flyer | agent contact (most text is static) |

**Note:** Templates 5-7 have fewer dynamic fields — they're primarily flyers where the main personalization is the agent's contact info. Templates 1-4 have significant dynamic content (merchant name, savings numbers, custom copy).

---

## Integration Points with Existing Systems

| System | Integration Type | Details |
|--------|-----------------|---------|
| Proposal Generator tabs | UI — add 3rd tab | Minimal shared component change |
| Marketing Materials overlay | Utility reuse | Same contact info overlay method |
| Equipment IQ | Data/API | Fetch equipment records for selector |
| User Profile | Data | Pull agent contact info |
| File Upload | Component reuse | Same upload patterns |
| PDF Storage | Storage reuse | Same save/download/preview |
| Feature Permissions | Permission inheritance | Same toggle gates access |
| Help Menu | Content addition | Add feature documentation |
| AI Help Assistant | Knowledge addition | Add feature context |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| PDF coordinate overlay doesn't match templates well | High — ugly output | Start with 1 template, iterate coordinates, then replicate |
| AI-Custom generates too much text for one page | Medium — overflow | Constrain AI prompt, validate output length, truncate if needed |
| Existing tabs break when adding 3rd | High — regression | Phase 0 discovery + isolated code + regression tests |
| Number extraction fails on unusual PDF formats | Medium — missing data | Graceful degradation, generate without numbers |
| Website scraping blocked by merchant site | Low — just a fallback | Already designed as optional, toast notification on failure |
| Template thumbnails look bad | Low — cosmetic | Regenerate at higher resolution |

---

## File Delivery Sequence

**After Phase 0:** Discovery document only (no code)
**After Phase 1:** New components + template assets + minimal tab modification
**After Phase 2:** Generation engine + upload handling + Equipment IQ integration
**After Phase 3:** AI pipeline + scraping service
**After Phase 4:** Help/tooltip/docs updates + all edge cases handled

---

## How to Use These Documents

1. **Start with Phase 0.** Paste the Phase 0 document into Replit and let it investigate.
2. **Review the Phase 0 output.** Check that the findings match your understanding of the codebase. Correct anything wrong before proceeding.
3. **Paste Phase 1** and let it build the foundation. Test the tab, template selector, and stepper before moving on.
4. **Paste Phase 2** after Phase 1 is verified. This is the heaviest phase — expect to iterate on PDF coordinate positioning.
5. **Paste Phase 3** after Phase 2 is solid. AI-Custom mode.
6. **Paste Phase 4** last — polish, documentation, and full QA.

**Between each phase:** Verify the acceptance criteria manually. Don't rush to the next phase if the current one has issues.
