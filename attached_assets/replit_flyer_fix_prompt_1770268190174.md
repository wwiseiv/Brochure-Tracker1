# CRITICAL FIX: AI Custom Flyer Generator — AUDIT, DIAGNOSE, AND FIX

## YOUR MISSION

The "Create with AI" custom flyer generator on the Marketing Materials page is broken. It has been broken through multiple attempts to fix it. Your job is to:

1. **AUDIT** the entire flyer generation pipeline end-to-end — every file, every function, every API call
2. **DIAGNOSE** exactly where and why it fails
3. **FIX IT** so it reliably produces a beautiful, professional one-page PDF marketing flyer

**DO NOT start coding until you have completed the audit. Read everything first.**

---

## STEP 1: FULL AUDIT (DO THIS FIRST — NO EXCEPTIONS)

Search the entire codebase and read every file related to flyer generation. Specifically:

### Frontend:
- Find the "Create Custom Flyer" modal component (the one with Industry dropdown, description textarea, Business Website field, and contact info fields: Your Name, Your Phone, Your Email)
- Find the Marketing Materials page component (`marketing-materials.tsx` or similar)
- Trace what happens when the user clicks "Generate" / "Create with AI"
- Find where the generated flyer is displayed, previewed, or downloaded
- Check what API endpoint the frontend calls and what payload it sends

### Backend/API:
- Find the API route that handles flyer generation requests
- Find the generation service/function (likely `marketingGenerator.ts`, `pdfFlyerBuilder.ts`, or similar)
- Find any AI integration code (OpenAI, Claude, Gemini/Nano Banana Pro API calls)
- Find where the output PDF file is saved on disk
- Find how the PDF file is served back to the frontend

### Assets:
- Find where the existing 20+ pre-built flyer templates/PDFs are stored
- Find where company logos (PC Bancard logo, payment network logos) are stored
- Find any hero images or stock photos used in templates

### Document what you find:
- List every file involved in the pipeline
- List every environment variable / API key used
- List which AI models are configured
- Note any TODO comments, error handling gaps, or dead code

---

## STEP 2: DIAGNOSE THE FAILURE

After your audit, answer these questions:

1. When the user clicks Generate, does the API endpoint actually get called? Check for 404 on the route itself.
2. Does the generation function actually execute, or does it error silently?
3. If using an AI image generation API (OpenAI DALL-E, Gemini Imagen, etc.) — is the API key valid? Is the model name correct? Is the response being parsed correctly?
4. If using an LLM for copy generation — is that call succeeding?
5. Is the PDF actually being created on disk? Check the file path.
6. Is the file path where the PDF is saved the same path the frontend tries to fetch? (This has been a known mismatch issue)
7. Is there a static file serving route configured to serve files from the output directory?
8. Are there any unhandled promise rejections or try/catch blocks that swallow errors?

---

## STEP 3: FIX IT — ARCHITECTURE REQUIREMENTS

The flyer generator MUST use this multi-step pipeline:

### Step A: AI Content Generation (The Copywriter)
Use whatever LLM is already configured in the project (Claude, OpenAI GPT, or Gemini). The LLM generates:
- **Headline** (e.g., "Pay $0 to Process Credit Cards")
- **Subheadline** tailored to the specific industry
- **3-5 benefit bullet points** specific to that business type
- **Call-to-action text**
- **Industry-specific messaging hooks**

The prompt to the LLM should reference the user's input:
- Selected industry (from dropdown)
- Custom description (from textarea)
- Business website (if provided — optionally fetch and analyze it)

### Step B: Hero Image Generation (The Artist)
Use whatever image generation API is available (OpenAI DALL-E 3, Gemini Imagen, etc.).
- Generate ONLY a hero/banner image relevant to the industry (e.g., a pizzeria kitchen, a veterinary clinic, an auto shop)
- The image should be 800x400px landscape, photorealistic style
- NO text in the image — text goes in the PDF via code
- If image generation fails, use a fallback: a solid gradient background or a pre-stored stock image per industry category

**CRITICAL: Image generation is the most failure-prone step. The flyer MUST still generate successfully even if the image API fails. Always have a fallback.**

### Step C: PDF Assembly (The Layout Designer)
Use PDFKit (already installed) to programmatically build the PDF. This is CODE, not AI — every element is precisely positioned.

**Required PDF Layout (single page, letter size 8.5" x 11"):**

```
┌─────────────────────────────────────────┐
│  [PC Bancard Logo - top left]           │
│  [Industry badge - top right]           │
├─────────────────────────────────────────┤
│                                         │
│  [HERO IMAGE - full width banner]       │
│  [with semi-transparent dark overlay]   │
│                                         │
│  ══ HEADLINE TEXT (large, bold, white   │
│     overlaid on hero image) ══          │
│  ── Subheadline (smaller, white) ──     │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  ✓ Benefit point 1                      │
│  ✓ Benefit point 2                      │
│  ✓ Benefit point 3                      │
│  ✓ Benefit point 4                      │
│                                         │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │  CALL TO ACTION BOX             │    │
│  │  "Contact us today!"            │    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  AGENT CONTACT CARD             │    │
│  │  [Agent Full Name]              │    │
│  │  [Phone Number]                 │    │
│  │  [Email Address]                │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  [Visa] [MC] [Amex] [Discover] logos    │
│  "Powered by PC Bancard"               │
└─────────────────────────────────────────┘
```

### Step D: Save and Serve
- Save the PDF to a directory that is served by Express static middleware (e.g., `uploads/flyers/` or `public/generated/`)
- Return the correct URL to the frontend
- The frontend should be able to:
  - Preview the PDF (open in new tab)
  - Download the PDF

---

## STEP 4: CONTACT INFO REQUIREMENTS

The flyer MUST include the agent's contact information prominently. This comes from the "Create Custom Flyer" modal form fields:

- **Your Name** → Display as the agent's name on the flyer (e.g., "William Wise")
- **Your Phone** → Display formatted phone number (e.g., "(317) 331-8472")
- **Your Email** → Display email address (e.g., "wwiseiv@icloud.com")

These fields are already in the frontend form. Make sure the backend receives them in the API payload and passes them to the PDF builder.

---

## STEP 5: ERROR HANDLING & RELIABILITY

The #1 problem has been silent failures. Fix this:

1. **Wrap every async operation in try/catch with meaningful error messages logged to console**
2. **If image generation fails → fall back to gradient background, DO NOT fail the entire flyer**
3. **If LLM copy generation fails → fall back to generic industry-appropriate copy, DO NOT fail the entire flyer**
4. **Verify the PDF file exists on disk before returning success to the frontend**
5. **Return proper error messages to the frontend if generation truly fails — not a fake "Completed" status**
6. **Add console.log statements at every major step:**
   - "Starting flyer generation for industry: [X]"
   - "LLM copy generation complete"
   - "Image generation complete" (or "Image generation failed, using fallback")
   - "PDF assembly starting"
   - "PDF saved to: [path]"
   - "Flyer generation complete, serving from: [url]"

---

## STEP 6: VALIDATION CHECKLIST

Before you consider this done, verify ALL of the following:

- [ ] User can open "Create Custom Flyer" modal
- [ ] User can select an industry from dropdown
- [ ] User can type a description
- [ ] User can optionally enter a business website
- [ ] Contact info (name, phone, email) is pre-populated or entered
- [ ] Clicking Generate triggers the API call (verify in network tab / server logs)
- [ ] Server logs show each step completing (LLM, image, PDF assembly)
- [ ] A PDF file is actually created on disk (verify the file exists)
- [ ] The PDF URL returned to frontend is accessible (no 404)
- [ ] Preview opens the PDF in a new tab and it renders correctly
- [ ] Download saves a proper .pdf file
- [ ] The PDF contains: logo, hero image, headline, benefits, contact info, payment logos
- [ ] The agent's name, phone, and email appear correctly on the flyer
- [ ] If you disconnect the image API key, the flyer STILL generates (with fallback)
- [ ] If you disconnect the LLM API key, the flyer STILL generates (with generic copy)

---

## IMPORTANT NOTES

- **DO NOT rebuild from scratch.** Audit what exists, fix what's broken, improve what's weak.
- **DO NOT use Playwright or HTML-to-screenshot approaches.** PDFKit builds the PDF directly.
- **DO NOT rely solely on image generation for the flyer.** The image is ONE element. The rest is programmatic.
- **The existing 20+ template flyers in the system should inform the STYLE and MESSAGING of AI-generated content.** If there's a RAG system or template reference system, make sure it's connected. If not, at minimum use the industry categories from those templates to guide the LLM prompt.
- **Test with a real generation after every significant change.** Don't make 10 changes then test once.
