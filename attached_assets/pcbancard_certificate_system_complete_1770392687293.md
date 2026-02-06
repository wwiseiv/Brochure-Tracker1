# PCBancard Certificate & Badge System — Complete Implementation Spec

## OVERVIEW

This system generates professional certificates, badges, medallions, and seals for the PCBancard Field Sales Intelligence Suite. It covers:

1. **Image Asset Generation** — Replit generates all 18 badge/medallion/seal/border images programmatically (SVG → PNG)
2. **Asset Manifest** — A canonical JSON file that is the single source of truth for all image paths and metadata
3. **Earned Items Storage** — How to store what agents have earned
4. **Certificate PDF Generation** — How to assemble and render downloadable certificate PDFs
5. **Data Contracts** — Rigid record shapes so nothing breaks as features expand

**PCBancard Brand Colors (use these EVERYWHERE):**
- Primary Purple/Indigo: `#6366F1`
- Gold/Amber: `#F59E0B`
- Dark Navy: `#1E3A5F`
- Light Purple: `#818CF8`
- Electric Blue: `#3B82F6`
- White: `#FFFFFF`
- Dark Gray: `#1F2937`
- Medium Gray: `#6B7280`

---

## PART 1: IMAGE ASSET GENERATION (Replit-Generated)

### Approach: SVG → PNG Pipeline

Replit should generate all badge/medallion/seal images **programmatically** using SVG, then convert to high-resolution PNG for embedding in PDFs. This is better than pre-made images because:

- Vector-based = pixel-perfect at any size
- Instantly regenerable if brand colors or designs change
- No manual ChatGPT → download → upload workflow
- Consistent quality across all assets

**Tech stack:**
```bash
npm install sharp svgson
# sharp converts SVG → PNG at any resolution
# OR use resvg-js for more accurate SVG rendering:
npm install @resvg/resvg-js
```

**Generation script pattern:**
```typescript
// server/services/certificateAssetGenerator.ts
import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';

function svgToPng(svgString: string, width: number = 1024): Buffer {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: width },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

function generateAndSave(svgString: string, outputPath: string, width: number = 1024): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const png = svgToPng(svgString, width);
  fs.writeFileSync(outputPath, png);
}
```

**Run once on deploy or via admin endpoint:**
```
POST /api/admin/generate-certificate-assets
→ Generates all 18 PNGs into /public/certificates/
```

---

### ASSET 1A: Bronze Tier Medallion

**File:** `medallions/tier-bronze-medallion.png`
**Size:** 1024x1024 PNG (square, medallion centered)
**Purpose:** Centerpiece image on Bronze Tier achievement certificates

**Design spec for SVG generation:**
- Circular medallion, 900px diameter centered in 1024x1024 canvas
- **Outer ring:** 20px wide, dark bronze `#8B6914`, subtle radial gradient lighter at top-left (simulating light source)
- **Laurel wreath border:** Two curved olive branches meeting at the bottom with a small ribbon tie. Leaves are simple elongated ovals. Color: darker bronze `#6B4F12` with `#A07818` highlights
- **Inner field:** Radial gradient from `#CD9B1D` (center, lighter) to `#8B6914` (edge, darker), giving depth
- **Center icon:** Stylized upward arrow or ascending 3-bar chart. Color: `#F5DEB3` (wheat/light gold) with `#6B4F12` shadow/outline for contrast
- **Text "BRONZE":** Along the bottom inner curve, uppercase, letter-spaced, font-weight bold. Color: `#F5DEB3`. Size: ~40px
- **Top accent:** Single 5-pointed star centered at top of inner ring. Color: `#F5DEB3`
- **Beaded border:** A ring of small circles (~5px each, ~80 circles) between the laurel wreath and the outer ring. Color: `#A07818`
- **Drop shadow:** Subtle box-shadow or filter on the entire medallion: `rgba(0,0,0,0.3)` offset 4px down, 8px blur

**Color palette:**
| Element | Hex |
|---------|-----|
| Dark Bronze | `#6B4F12` |
| Medium Bronze | `#8B6914` |
| Bright Bronze | `#CD9B1D` |
| Highlight Bronze | `#A07818` |
| Light Accent | `#F5DEB3` |

---

### ASSET 1B: Silver Tier Medallion

**File:** `medallions/tier-silver-medallion.png`
**Size:** 1024x1024 PNG

**Design spec:** Same structure as Bronze with these differences:
- **More ornate:** Laurel wreath has more leaves (denser), small berries between leaves
- **Color shift:** All bronze tones replaced with silver/steel:

| Element | Hex |
|---------|-----|
| Dark Silver | `#5A5A6E` |
| Medium Silver | `#8A8A9E` |
| Bright Silver | `#C0C0D0` |
| Highlight Silver | `#E8E8F0` |
| Light Accent | `#FFFFFF` |

- **Text "SILVER"** along bottom curve
- **Top accent:** 2-3 small stars in a cluster instead of single star
- **Additional detail:** Fine radial lines (like clock tick marks) emanating from center icon, 36 lines at 10° intervals. Color: `#8A8A9E` at 30% opacity

---

### ASSET 1C: Gold Tier Medallion

**File:** `medallions/tier-gold-medallion.png`
**Size:** 1024x1024 PNG

**Design spec:** Noticeably more elaborate than Silver:
- **Laurel wreath:** Full wreath with detailed leaf veining, berries, and ribbon bow at bottom
- **Guilloche pattern:** Fine interlocking circular lines (like on currency) fill the inner field background behind the center icon. ~100 concentric offset circles. Color: slightly darker than background at 15% opacity
- **Center icon:** Ascending bar chart with a small crown above it. Crown has 3 points.
- **Border:** Double border — outer beaded ring PLUS inner rope-twist ring
- **Text "GOLD"** in serif-style lettering along bottom curve

| Element | Hex |
|---------|-----|
| Dark Gold | `#8B6914` |
| Medium Gold | `#DAA520` |
| Bright Gold | `#FFD700` |
| Highlight Gold | `#FFF2CC` |
| Rich Gold | `#B8860B` |
| Light Accent | `#FFFFF0` |

- **Top accent:** Detailed star with inner facets (looks dimensional), flanked by two smaller stars

---

### ASSET 1D: Platinum Tier Medallion

**File:** `medallions/tier-platinum-medallion.png`
**Size:** 1024x1024 PNG

**Design spec:** The apex — most ornate in the series:
- **Dual laurel wreaths:** Two interlocking wreath rings with ribbon woven between them
- **Finest guilloche:** Museum-quality interlocking curve pattern across entire inner field
- **Center icon:** Shield/crest containing ascending arrow breaking through a horizontal line (ceiling). Small diamond shape at the arrow's apex.
- **Triple border:** Outer scalloped edge → middle rope → inner beaded
- **Text "PLATINUM"** in elegant capitals along bottom curve
- **Brand accent:** Subtle purple enamel inlay effect — small sections of the border or wreath ribbons filled with `#6366F1` (PCBancard purple) to tie it to the brand

| Element | Hex |
|---------|-----|
| Dark Platinum | `#6B6B7B` |
| Medium Platinum | `#A0A0B8` |
| Bright Platinum | `#D4D4E8` |
| Highlight Platinum | `#F0F0FF` |
| Iridescent | `#E8E0F0` |
| Purple Enamel Accent | `#6366F1` |
| Light Accent | `#FFFFFF` |

- **Top accent:** Elaborate crown or eagle emblem, larger and more detailed than Gold tier

---

### ASSETS 2A-2H: Training Module Badges (8 images)

**Universal badge specs:**
- **Size:** 512x512 PNG (smaller than medallions — these are dashboard icons)
- **Shape:** Shield for mastery/expert badges, circle for entry-level badges
- **Border:** 6px stroke, `#6366F1` (purple)
- **Primary fill:** Gradient from `#6366F1` to `#4F46E5`
- **Icon color:** White `#FFFFFF` or Gold `#F59E0B`
- **Style:** Clean vector, subtle inner shadow for depth. NOT photorealistic — think professional merit badge or skill badge.

### Badge 2A: Problem Master
- **Shape:** Shield
- **Icon:** Magnifying glass over a document with a highlighted exclamation mark
- **Accent:** Gold `#F59E0B` glow around the magnifying glass lens

### Badge 2B: Objection Slayer
- **Shape:** Shield
- **Icon:** Lightning bolt cutting diagonally through a speech bubble that has an "X" in it
- **Accent:** Gold `#F59E0B` lightning bolt

### Badge 2C: Script Scholar
- **Shape:** Shield
- **Icon:** Open book with a golden checkmark seal on top
- **Accent:** Gold `#F59E0B` checkmark and book spine

### Badge 2D: Psychology Pro
- **Shape:** Shield
- **Icon:** Side profile of a head with glowing neural pathways/nodes inside
- **Accent:** Electric blue `#3B82F6` pathways, small gold key icon near the temple

### Badge 2E: Role-Play Rookie
- **Shape:** Circle (lighter weight than shield = entry level)
- **Icon:** Two overlapping speech bubbles with a small "5" at bottom
- **Color shift:** Lighter purple `#818CF8` primary instead of dark purple. Silver accents instead of gold.
- **Accent:** Simple ribbon banner at bottom

### Badge 2F: Role-Play Expert
- **Shape:** Shield (upgrade from Rookie's circle)
- **Icon:** Two speech bubbles in dynamic arrangement with gold star overlay and "85+" small text
- **Accent:** More gold than any other training badge. Ornate ribbon banner.

### Badge 2G: Speed Learner
- **Shape:** Lightning bolt outline (unique shape = stands out)
- **Icon:** Clock face with fast-moving hands, small "3" indicator
- **Color shift:** Gold `#F59E0B` as PRIMARY (suggests speed/energy), purple as accent
- **Accent:** Motion lines behind the clock

### Badge 2H: Presentation Master (Capstone)
- **Shape:** Shield — largest and most ornate of all training badges
- **Icon:** Podium/lectern with small laurel wreath crown above it
- **Accent:** 5 gold stars in arc above the crown. Double border. Most gold of any training badge.

---

### ASSET 3A: Certificate Border Template

**File:** `borders/certificate-border-template.png`
**Size:** 3300x2550 PNG (11"x8.5" at 300 DPI — landscape letter)
**Purpose:** Base layer for ALL printable certificates

**Design spec:**
- **Landscape orientation** (wider than tall)
- **Outer border:** Ornate decorative frame, approximately 150px (0.5") thick
  - Fine-line geometric pattern with interleaved straight and curved elements
  - Color: `#6366F1` (purple) for primary lines, `#F59E0B` (gold) for accent filigree
- **Corner ornaments:** Detailed decorative flourishes at all 4 corners. Symmetrical. Approximately 300x300px each.
- **Inner border:** Thin 3px line parallel to outer border, 30px inside it. Creates double-frame effect. Color: `#6366F1`
- **Top center ornament:** Small decorative divider (like a horizontal rule with scrollwork), approximately 400px wide
- **Bottom center ornament:** Matching decorative divider
- **Background watermark:** VERY faint (`opacity: 0.03`) guilloche or geometric repeat pattern across the entire center area. Color: `#6366F1`. Barely visible — adds texture without competing with content.
- **Center area:** 70%+ of the image is CLEAN WHITE. The border is a FRAME, not a filled design.

**CRITICAL:** The center must be empty white space. Text and medallion images are overlaid programmatically by the PDF generator.

---

### ASSET 4A: Certified Partner Seal

**File:** `seals/seal-certified-partner.png`
**Size:** 800x800 PNG

**Design spec:**
- Circular seal, institutional/authoritative feel (like BBB or CPA mark)
- **Outer text ring:** "CERTIFIED PARTNER" along top arc, 5 small stars along bottom arc
- **Middle decorative ring:** Fine rope or beaded pattern
- **Inner circle:** Handshake icon or shield-with-checkmark crest
- **Colors:** `#6366F1` primary, `#F59E0B` gold accents and text, white contrast areas
- **3D embossed effect:** Slight bevel/shadow suggesting stamped metal
- **Must look crisp at small sizes** (business card, 64px avatar overlay)

---

### ASSET 5A: EquipIQ Certification Seal

**File:** `seals/seal-equipiq-certified.png`
**Size:** 800x800 PNG

**Design spec:**
- Circular badge, slightly more modern/tech-forward than Certified Partner seal
- **Center icon:** Stylized payment terminal merged with circuit board pattern or brain
- **Verification checkmark:** Integrated into design, gold color
- **Outer ring:** Clean text space (text overlaid programmatically)
- **Colors:** `#6366F1` primary, `#3B82F6` electric blue for tech elements, `#F59E0B` gold checkmark
- **Style:** Halfway between tech company badge (AWS/Salesforce cert) and traditional seal

---

### ASSETS 6A-6C: Stage Completion Icons (3 images)

**Universal specs:**
- **Size:** 256x256 PNG (small dashboard icons)
- **Shape:** Circle
- **Border:** 4px stroke
- **Style:** Clean, modern. Must be legible at 64px.

### Stage 1: Prospecting Complete
- **Icon:** Door being opened or handshake initiating, with "1" and checkmark
- **Colors:** `#6366F1` primary, gold accent

### Stage 2: Discovery & Presentation Complete
- **Icon:** Magnifying glass over chart/presentation screen, "2" and checkmark
- **Colors:** `#6366F1` primary, gold accent. Slightly more ornate than Stage 1.

### Stage 3: Close & Follow-Up Complete
- **Icon:** Trophy or handshake sealing deal, "3" and checkmark
- **Colors:** Gold `#F59E0B` MORE PROMINENT than other stages (completion/victory feel), purple accent

---

## PART 2: ASSET MANIFEST (Single Source of Truth)

**File:** `/public/certificates/certificate-assets.json`

This file is the ONLY authority for image file locations and metadata. No database record should ever store a raw file path — only an `assetId` that resolves through this manifest.

```json
{
  "version": "1.0.0",
  "generated": "2026-02-06T00:00:00.000Z",
  "basePath": "/public/certificates",
  "assets": {
    "border.master": {
      "file": "borders/certificate-border-template.png",
      "type": "border",
      "displayName": "Master Certificate Border",
      "dimensions": { "width": 3300, "height": 2550 },
      "description": "Base border/frame for all printable certificates"
    },

    "tier.bronze": {
      "file": "medallions/tier-bronze-medallion.png",
      "type": "tier",
      "displayName": "Bronze Tier",
      "tier_level": 1,
      "dimensions": { "width": 1024, "height": 1024 },
      "colors": { "primary": "#CD9B1D", "dark": "#6B4F12", "light": "#F5DEB3" },
      "description": "Bronze level achievement medallion"
    },
    "tier.silver": {
      "file": "medallions/tier-silver-medallion.png",
      "type": "tier",
      "displayName": "Silver Tier",
      "tier_level": 2,
      "dimensions": { "width": 1024, "height": 1024 },
      "colors": { "primary": "#C0C0D0", "dark": "#5A5A6E", "light": "#E8E8F0" },
      "description": "Silver level achievement medallion"
    },
    "tier.gold": {
      "file": "medallions/tier-gold-medallion.png",
      "type": "tier",
      "displayName": "Gold Tier",
      "tier_level": 3,
      "dimensions": { "width": 1024, "height": 1024 },
      "colors": { "primary": "#FFD700", "dark": "#8B6914", "light": "#FFF2CC" },
      "description": "Gold level achievement medallion"
    },
    "tier.platinum": {
      "file": "medallions/tier-platinum-medallion.png",
      "type": "tier",
      "displayName": "Platinum Tier",
      "tier_level": 4,
      "dimensions": { "width": 1024, "height": 1024 },
      "colors": { "primary": "#D4D4E8", "dark": "#6B6B7B", "light": "#F0F0FF", "accent": "#6366F1" },
      "description": "Platinum level achievement medallion — highest tier"
    },

    "badge.problem_master": {
      "file": "badges/badge-problem-master.png",
      "type": "badge",
      "displayName": "Problem Master",
      "moduleId": "module_2",
      "requirement": "Complete Module 2 with 90%+",
      "dimensions": { "width": 512, "height": 512 },
      "shape": "shield",
      "description": "Mastery of identifying business problems in sales conversations"
    },
    "badge.objection_slayer": {
      "file": "badges/badge-objection-slayer.png",
      "type": "badge",
      "displayName": "Objection Slayer",
      "moduleId": "module_4",
      "requirement": "Handle all 4 critical objections in simulator",
      "dimensions": { "width": 512, "height": 512 },
      "shape": "shield",
      "description": "Mastery of handling customer objections"
    },
    "badge.script_scholar": {
      "file": "badges/badge-script-scholar.png",
      "type": "badge",
      "displayName": "Script Scholar",
      "moduleId": "module_scripts",
      "requirement": "100% on script knowledge quiz",
      "dimensions": { "width": 512, "height": 512 },
      "shape": "shield",
      "description": "Perfect knowledge of sales scripts"
    },
    "badge.psychology_pro": {
      "file": "badges/badge-psychology-pro.png",
      "type": "badge",
      "displayName": "Psychology Pro",
      "moduleId": "module_psychology",
      "requirement": "Complete all Deep Dives",
      "dimensions": { "width": 512, "height": 512 },
      "shape": "shield",
      "description": "Mastery of persuasion psychology principles"
    },
    "badge.roleplay_rookie": {
      "file": "badges/badge-roleplay-rookie.png",
      "type": "badge",
      "displayName": "Role-Play Rookie",
      "moduleId": "roleplay",
      "requirement": "Complete 5 simulations",
      "dimensions": { "width": 512, "height": 512 },
      "shape": "circle",
      "description": "Entry-level role-play practice achievement"
    },
    "badge.roleplay_expert": {
      "file": "badges/badge-roleplay-expert.png",
      "type": "badge",
      "displayName": "Role-Play Expert",
      "moduleId": "roleplay",
      "requirement": "Score 85%+ on 10 simulations",
      "dimensions": { "width": 512, "height": 512 },
      "shape": "shield",
      "description": "Advanced role-play mastery achievement"
    },
    "badge.speed_learner": {
      "file": "badges/badge-speed-learner.png",
      "type": "badge",
      "displayName": "Speed Learner",
      "moduleId": "general",
      "requirement": "Complete 3 modules in one day",
      "dimensions": { "width": 512, "height": 512 },
      "shape": "bolt",
      "description": "Rapid skill acquisition achievement"
    },
    "badge.presentation_master": {
      "file": "badges/badge-presentation-master.png",
      "type": "badge",
      "displayName": "Presentation Master",
      "moduleId": "capstone",
      "requirement": "100% overall mastery across all modules",
      "dimensions": { "width": 512, "height": 512 },
      "shape": "shield",
      "description": "Capstone — complete presentation training mastery"
    },

    "seal.certified_partner": {
      "file": "seals/seal-certified-partner.png",
      "type": "seal",
      "displayName": "Certified Partner",
      "dimensions": { "width": 800, "height": 800 },
      "description": "Official PCBancard Certified Partner designation"
    },
    "seal.equipiq_certified": {
      "file": "seals/seal-equipiq-certified.png",
      "type": "seal",
      "displayName": "EquipIQ Certified",
      "dimensions": { "width": 800, "height": 800 },
      "description": "Equipment product knowledge certification"
    },

    "stage.1.prospecting": {
      "file": "stages/stage-1-prospecting.png",
      "type": "stage",
      "displayName": "Prospecting Complete",
      "stageNumber": 1,
      "dimensions": { "width": 256, "height": 256 },
      "description": "Stage 1 role-play completion — prospecting for appointments"
    },
    "stage.2.discovery": {
      "file": "stages/stage-2-discovery.png",
      "type": "stage",
      "displayName": "Discovery & Presentation Complete",
      "stageNumber": 2,
      "dimensions": { "width": 256, "height": 256 },
      "description": "Stage 2 role-play completion — discovery questions and presenting"
    },
    "stage.3.close": {
      "file": "stages/stage-3-close.png",
      "type": "stage",
      "displayName": "Close & Follow-Up Complete",
      "stageNumber": 3,
      "dimensions": { "width": 256, "height": 256 },
      "description": "Stage 3 role-play completion — closing the deal"
    }
  }
}
```

---

## PART 3: DATA CONTRACTS (Rigid Record Shapes)

### 3A: Earned Item Record

Every badge, tier, seal, or stage completion an agent earns. Replit can implement this in Postgres, SQLite, or any storage — the shape must match exactly.

```typescript
// shared/schema.ts (add to existing schema)

export const earnedItems = pgTable("earned_items", {
  id: text("id").primaryKey(),                          // UUID or nanoid
  userId: text("user_id").notNull(),                    // References agent's user record
  type: text("type").notNull(),                         // MUST be: "tier" | "badge" | "seal" | "stage"
  assetId: text("asset_id").notNull(),                  // MUST match a key in certificate-assets.json
  title: text("title").notNull(),                       // Human-readable: "Gold Tier Certified"
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
  metadata: jsonb("metadata").default({}),              // Flexible: { moduleId, attemptId, score, coachVersion, etc. }
});

// Indexes:
// CREATE INDEX idx_earned_items_user ON earned_items(user_id);
// CREATE INDEX idx_earned_items_user_type ON earned_items(user_id, type);
// UNIQUE constraint on (user_id, asset_id) — agent can't earn same badge twice
```

**Field rules (enforce in code):**
- `type` must be one of: `tier`, `badge`, `seal`, `stage` — reject anything else
- `assetId` must exist as a key in `certificate-assets.json` — reject unknown IDs
- `earnedAt` is ISO 8601 datetime
- `metadata` is freeform JSON — can expand without schema changes

**Example records:**
```json
{
  "id": "ei_abc123",
  "userId": "user_456",
  "type": "badge",
  "assetId": "badge.objection_slayer",
  "title": "Objection Slayer",
  "earnedAt": "2026-02-06T15:10:00.000Z",
  "metadata": { "moduleId": "module_4", "score": 95, "attemptId": "att_789" }
}
```

```json
{
  "id": "ei_def456",
  "userId": "user_456",
  "type": "tier",
  "assetId": "tier.gold",
  "title": "Gold Tier Agent",
  "earnedAt": "2026-02-06T16:00:00.000Z",
  "metadata": { "previousTier": "tier.silver", "merchantCount": 42 }
}
```

---

### 3B: Generated Certificate Record

When someone generates a printable certificate PDF, store this:

```typescript
export const generatedCertificates = pgTable("generated_certificates", {
  id: text("id").primaryKey(),                                    // UUID
  userId: text("user_id").notNull(),                              // Agent who earned it
  certificateType: text("certificate_type").notNull(),            // "tier_certificate" | "module_certificate" | "partner_certificate" | "stage_certificate"
  borderId: text("border_id").notNull().default("border.master"), // From manifest
  primaryAssetId: text("primary_asset_id").notNull(),             // The main medallion/badge/seal
  secondaryAssetIds: jsonb("secondary_asset_ids").default([]),    // Optional additional seals
  recipientName: text("recipient_name").notNull(),                // "William Wise"
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  issuedBy: text("issued_by").notNull().default("PCBancard Training Division"),
  verificationCode: text("verification_code").notNull(),          // 8-char unique code
  status: text("status").notNull().default("active"),             // "active" | "revoked"
  pdfPath: text("pdf_path"),                                      // Path to generated PDF file
  metadata: jsonb("metadata").default({}),
});

// Indexes:
// CREATE INDEX idx_certs_user ON generated_certificates(user_id);
// CREATE UNIQUE INDEX idx_certs_verification ON generated_certificates(verification_code);
```

**Verification code generation:**
```typescript
function generateVerificationCode(): string {
  // 8 alphanumeric characters, uppercase
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 (avoid confusion)
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
```

---

## PART 4: CERTIFICATE PDF GENERATION

### The Assembly Pipeline

When an agent earns something and requests a certificate:

```typescript
// server/services/certificateGenerator.ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

// Load the manifest
const manifest = JSON.parse(
  fs.readFileSync('/public/certificates/certificate-assets.json', 'utf-8')
);

function resolveAssetPath(assetId: string): string {
  const asset = manifest.assets[assetId];
  if (!asset) throw new Error(`Unknown assetId: ${assetId}`);
  return path.join(manifest.basePath, asset.file);
}

export async function generateCertificatePdf(params: {
  recipientName: string;
  certificateTitle: string;       // e.g., "Gold Tier Achievement"
  description: string;            // e.g., "demonstrating excellence in field sales..."
  primaryAssetId: string;         // e.g., "tier.gold"
  secondaryAssetIds?: string[];   // e.g., ["seal.certified_partner"]
  issuedBy: string;
  verificationCode: string;
}): Promise<Buffer> {

  // 1. Create PDF (landscape letter: 792 x 612 points)
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([792, 612]);
  const { width, height } = page.getSize();

  // 2. Embed border as background image
  const borderPath = resolveAssetPath('border.master');
  const borderBytes = fs.readFileSync(borderPath);
  const borderImage = await pdfDoc.embedPng(borderBytes);
  page.drawImage(borderImage, {
    x: 0, y: 0,
    width: width,
    height: height,
  });

  // 3. Embed fonts
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // 4. Draw text (all centered)
  const centerX = width / 2;

  // "PCBancard Field Sales Intelligence Suite"
  const headerText = "PCBancard Field Sales Intelligence Suite";
  const headerWidth = helvetica.widthOfTextAtSize(headerText, 11);
  page.drawText(headerText, {
    x: centerX - headerWidth / 2,
    y: height - 95,
    size: 11,
    font: helvetica,
    color: rgb(0.39, 0.4, 0.95), // #6366F1
  });

  // "CERTIFICATE OF ACHIEVEMENT"
  const certTitle = "CERTIFICATE OF ACHIEVEMENT";
  const certTitleWidth = timesRoman.widthOfTextAtSize(certTitle, 22);
  page.drawText(certTitle, {
    x: centerX - certTitleWidth / 2,
    y: height - 130,
    size: 22,
    font: timesRoman,
    color: rgb(0.12, 0.23, 0.37), // #1E3A5F
  });

  // "This certifies that"
  const certifiesText = "This certifies that";
  const certifiesWidth = timesItalic.widthOfTextAtSize(certifiesText, 13);
  page.drawText(certifiesText, {
    x: centerX - certifiesWidth / 2,
    y: height - 165,
    size: 13,
    font: timesItalic,
    color: rgb(0.42, 0.42, 0.42),
  });

  // AGENT NAME (large, prominent)
  const nameWidth = timesRoman.widthOfTextAtSize(params.recipientName, 28);
  page.drawText(params.recipientName, {
    x: centerX - nameWidth / 2,
    y: height - 200,
    size: 28,
    font: timesRoman,
    color: rgb(0.12, 0.23, 0.37), // #1E3A5F
  });

  // Decorative line under name
  page.drawLine({
    start: { x: centerX - 150, y: height - 210 },
    end: { x: centerX + 150, y: height - 210 },
    thickness: 1,
    color: rgb(0.96, 0.62, 0.04), // #F59E0B gold
  });

  // "has successfully achieved"
  const achievedText = "has successfully achieved the designation of";
  const achievedWidth = timesItalic.widthOfTextAtSize(achievedText, 13);
  page.drawText(achievedText, {
    x: centerX - achievedWidth / 2,
    y: height - 235,
    size: 13,
    font: timesItalic,
    color: rgb(0.42, 0.42, 0.42),
  });

  // CERTIFICATE TITLE (e.g., "GOLD TIER AGENT")
  const titleWidth = timesRoman.widthOfTextAtSize(params.certificateTitle, 20);
  page.drawText(params.certificateTitle, {
    x: centerX - titleWidth / 2,
    y: height - 265,
    size: 20,
    font: timesRoman,
    color: rgb(0.96, 0.62, 0.04), // Gold
  });

  // 5. Embed primary medallion/badge image
  const primaryPath = resolveAssetPath(params.primaryAssetId);
  const primaryBytes = fs.readFileSync(primaryPath);
  const primaryImage = await pdfDoc.embedPng(primaryBytes);
  const medalSize = 120;
  page.drawImage(primaryImage, {
    x: centerX - medalSize / 2,
    y: height - 405,
    width: medalSize,
    height: medalSize,
  });

  // 6. Embed secondary seals (if any) — smaller, flanking the primary
  if (params.secondaryAssetIds && params.secondaryAssetIds.length > 0) {
    const sealSize = 60;
    params.secondaryAssetIds.forEach((sealId, index) => {
      const sealPath = resolveAssetPath(sealId);
      const sealBytes = fs.readFileSync(sealPath);
      // Note: in real implementation, embedPng is async — handle accordingly
      // Placed to the right of the main medallion
      // This is simplified — adjust positioning as needed
    });
  }

  // 7. Description line
  const descWidth = helvetica.widthOfTextAtSize(params.description, 10);
  page.drawText(params.description, {
    x: centerX - descWidth / 2,
    y: height - 430,
    size: 10,
    font: helvetica,
    color: rgb(0.42, 0.42, 0.42),
  });

  // 8. Date
  const dateStr = `Awarded: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
  const dateWidth = helvetica.widthOfTextAtSize(dateStr, 10);
  page.drawText(dateStr, {
    x: centerX - dateWidth / 2,
    y: height - 460,
    size: 10,
    font: helvetica,
    color: rgb(0.42, 0.42, 0.42),
  });

  // 9. Signature lines
  // Left signature
  page.drawLine({
    start: { x: 130, y: 95 },
    end: { x: 330, y: 95 },
    thickness: 0.5,
    color: rgb(0.6, 0.6, 0.6),
  });
  const leftSigText = params.issuedBy;
  const leftSigWidth = helvetica.widthOfTextAtSize(leftSigText, 9);
  page.drawText(leftSigText, {
    x: 230 - leftSigWidth / 2,
    y: 80,
    size: 9,
    font: helvetica,
    color: rgb(0.42, 0.42, 0.42),
  });

  // Right signature
  page.drawLine({
    start: { x: 462, y: 95 },
    end: { x: 662, y: 95 },
    thickness: 0.5,
    color: rgb(0.6, 0.6, 0.6),
  });
  page.drawText("Sales Manager", {
    x: 530,
    y: 80,
    size: 9,
    font: helvetica,
    color: rgb(0.42, 0.42, 0.42),
  });

  // 10. Verification code (small, bottom center)
  const verifyText = `Verification: ${params.verificationCode}`;
  const verifyWidth = helvetica.widthOfTextAtSize(verifyText, 7);
  page.drawText(verifyText, {
    x: centerX - verifyWidth / 2,
    y: 50,
    size: 7,
    font: helvetica,
    color: rgb(0.7, 0.7, 0.7),
  });

  // 11. Save
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
```

---

## PART 5: API ENDPOINTS

```typescript
// =============================================
// List agent's earned items
// =============================================
// GET /api/certificates/earned
// Query: ?userId=xxx&type=badge (optional filter)
// Response: { earnedItems: [...] }

// =============================================
// Award an item to an agent (called by training system)
// =============================================
// POST /api/certificates/award
// Body: { userId, type, assetId, title, metadata }
// Response: { earnedItem: { id, ... } }
// NOTE: Check unique constraint on (userId, assetId)

// =============================================
// Generate and download a certificate PDF
// =============================================
// POST /api/certificates/generate
// Body: { userId, primaryAssetId, secondaryAssetIds?, recipientName }
// Response: PDF file download
// Side effect: Creates record in generated_certificates table

// =============================================
// Verify a certificate by code
// =============================================
// GET /api/certificates/verify/:code
// Response: { valid: true, certificate: { recipientName, title, issuedAt, ... } }

// =============================================
// Regenerate all SVG → PNG assets (admin only)
// =============================================
// POST /api/admin/generate-certificate-assets
// Response: { generated: 18, errors: [] }
```

---

## PART 6: FRONTEND INTEGRATION

### Agent Dashboard — Earned Badges Display

```tsx
// Component: BadgeWall — shows all earned and locked badges

<BadgeWall>
  {allBadges.map(badge => {
    const earned = earnedItems.find(e => e.assetId === badge.assetId);
    return (
      <BadgeCard
        key={badge.assetId}
        image={resolveAssetUrl(badge.assetId)}
        name={badge.displayName}
        earned={!!earned}
        earnedDate={earned?.earnedAt}
        locked={!earned}
        requirement={badge.requirement}
        onClick={() => earned && openCertificatePreview(badge.assetId)}
      />
    );
  })}
</BadgeWall>
```

**Locked badges** show as grayscale with a lock icon overlay.
**Earned badges** show in full color with the earned date.
**Click an earned badge** → preview the certificate PDF → option to download.

### Tier Progress Bar

```tsx
// Shows current tier and progress to next tier
<TierProgress
  currentTier="tier.silver"
  nextTier="tier.gold"
  progress={68}  // percentage toward next tier
  currentMerchants={28}
  requiredMerchants={40}  // for Gold
/>
```

---

## PART 7: ASSET GENERATION SCRIPT (Run Once)

Create a single script that generates all 18 assets:

```typescript
// scripts/generate-certificate-assets.ts

import { generateAndSave } from '../server/services/certificateAssetGenerator';

// Import all SVG generator functions
import { generateBronzeMedallion } from './svg/tier-bronze';
import { generateSilverMedallion } from './svg/tier-silver';
import { generateGoldMedallion } from './svg/tier-gold';
import { generatePlatinumMedallion } from './svg/tier-platinum';
import { generateBadge } from './svg/badges';
import { generateSeal } from './svg/seals';
import { generateStageIcon } from './svg/stages';
import { generateBorder } from './svg/border';

const OUTPUT_DIR = './public/certificates';

async function generateAll() {
  console.log('Generating certificate assets...\n');

  // Tier medallions (1024x1024)
  generateAndSave(generateBronzeMedallion(), `${OUTPUT_DIR}/medallions/tier-bronze-medallion.png`, 1024);
  generateAndSave(generateSilverMedallion(), `${OUTPUT_DIR}/medallions/tier-silver-medallion.png`, 1024);
  generateAndSave(generateGoldMedallion(), `${OUTPUT_DIR}/medallions/tier-gold-medallion.png`, 1024);
  generateAndSave(generatePlatinumMedallion(), `${OUTPUT_DIR}/medallions/tier-platinum-medallion.png`, 1024);

  // Training badges (512x512)
  const badges = [
    { id: 'problem_master', icon: 'magnifying-glass-doc', shape: 'shield' },
    { id: 'objection_slayer', icon: 'lightning-speech', shape: 'shield' },
    { id: 'script_scholar', icon: 'book-checkmark', shape: 'shield' },
    { id: 'psychology_pro', icon: 'brain-nodes', shape: 'shield' },
    { id: 'roleplay_rookie', icon: 'speech-bubbles-5', shape: 'circle' },
    { id: 'roleplay_expert', icon: 'speech-bubbles-star', shape: 'shield' },
    { id: 'speed_learner', icon: 'clock-bolt', shape: 'bolt' },
    { id: 'presentation_master', icon: 'podium-crown', shape: 'shield' },
  ];
  for (const badge of badges) {
    generateAndSave(
      generateBadge(badge.id, badge.icon, badge.shape),
      `${OUTPUT_DIR}/badges/badge-${badge.id.replace('_', '-')}.png`,
      512
    );
  }

  // Seals (800x800)
  generateAndSave(generateSeal('certified_partner'), `${OUTPUT_DIR}/seals/seal-certified-partner.png`, 800);
  generateAndSave(generateSeal('equipiq_certified'), `${OUTPUT_DIR}/seals/seal-equipiq-certified.png`, 800);

  // Stage icons (256x256)
  generateAndSave(generateStageIcon(1, 'door-handshake'), `${OUTPUT_DIR}/stages/stage-1-prospecting.png`, 256);
  generateAndSave(generateStageIcon(2, 'magnifying-chart'), `${OUTPUT_DIR}/stages/stage-2-discovery.png`, 256);
  generateAndSave(generateStageIcon(3, 'trophy-handshake'), `${OUTPUT_DIR}/stages/stage-3-close.png`, 256);

  // Certificate border (3300x2550 for 300 DPI print)
  generateAndSave(generateBorder(), `${OUTPUT_DIR}/borders/certificate-border-template.png`, 3300);

  console.log('\n✅ All 18 assets generated successfully.');
}

generateAll().catch(console.error);
```

---

## PART 8: NON-NEGOTIABLE RULES (paste these into Replit)

1. **Never store raw image paths in the database.** Always store `assetId` keys and resolve via `certificate-assets.json`.
2. **The manifest is the single source of truth.** If an asset doesn't exist in the manifest, it doesn't exist.
3. **`type` must be one of:** `tier`, `badge`, `seal`, `stage` — hard-validate, reject anything else.
4. **`assetId` must match a manifest key** — hard-validate on insert.
5. **Unique constraint on `(userId, assetId)`** — an agent can't earn the same badge twice.
6. **Verification codes are unique and use the confusion-free alphabet** (no I/O/0/1).
7. **All SVG → PNG generation runs through one script** (`generate-certificate-assets.ts`). Don't generate images ad-hoc.
8. **Certificate PDFs use `pdf-lib`** (same library as the flyer stamper system). One PDF library across the app.
9. **Border template center is 70% white space.** It's a FRAME, not a filled design.
10. **All images use PCBancard brand colors.** No off-brand colors, no random palettes.

---

## FALLBACK: ChatGPT Image Generation Prompts

If Replit's SVG generation doesn't produce results that look professional enough (SVG has limits on photorealistic effects like metal textures), use these prompts in ChatGPT to generate the medallion images manually, then upload the PNGs to the `/public/certificates/` folder structure.

**The SVGs will work great for:** badges, stage icons, seals, and the certificate border.
**You might prefer ChatGPT-generated PNGs for:** the 4 tier medallions (Bronze, Silver, Gold, Platinum) since those benefit from photorealistic metallic rendering that SVG can't easily replicate.

### ChatGPT Prompt: Bronze Tier Medallion

```
Create a highly detailed, photorealistic bronze medallion seal for a professional sales certification. The medallion should look like an embossed metal coin with a 3D raised effect.

Design: Circular medallion with ornate laurel wreath border, center features a stylized ascending bar chart symbolizing growth, the word "BRONZE" embossed along the bottom inner curve, a single star at the top, realistic bronze patina with copper and amber tones, fine crosshatch engraving, beaded outer border, subtle drop shadow.

Style: Photorealistic 3D render on pure white background, like a military challenge coin or university seal.

Colors: Bronze (#CD9B1D), copper (#8B6914), dark amber (#6B4F12), light wheat highlights (#F5DEB3).

Square format, 1024x1024.
```

### ChatGPT Prompt: Silver Tier Medallion

```
Create a highly detailed, photorealistic silver medallion seal for a professional sales certification. Same family as a bronze medallion but more ornate — more leaf detail in the wreath, 2-3 star cluster at top, fine radial engraving lines, polished silver with brushed steel texture.

Design: Circular medallion, laurel wreath with berries, ascending bar chart center icon with diamond accent, "SILVER" embossed bottom curve, elaborate rope-twist border.

Style: Photorealistic 3D render on pure white background.

Colors: Silver (#C0C0D0), steel (#8A8A9E), dark (#5A5A6E), bright highlights (#E8E8F0).

Square format, 1024x1024.
```

### ChatGPT Prompt: Gold Tier Medallion

```
Create a highly detailed, photorealistic gold medallion seal for a premium professional sales certification. Noticeably more ornate than silver — full wreath with leaf veining and berries, guilloche engraving pattern (currency-style fine lines), ascending bar chart with small crown above it, double border (beaded + rope).

Design: "GOLD" in serif lettering bottom curve, detailed faceted star flanked by smaller stars at top, rich 24-karat gold with mirror polish and matte recessed areas.

Style: Photorealistic 3D render with dramatic lighting emphasizing gold luster. Presidential award quality.

Colors: Rich gold (#FFD700), deep gold (#DAA520), dark gold (#8B6914), warm amber (#B8860B), cream highlights (#FFF2CC).

Square format, 1024x1024.
```

### ChatGPT Prompt: Platinum Tier Medallion

```
Create the most ornate and prestigious photorealistic platinum medallion seal — the apex tier of a professional certification series. Must clearly surpass gold in ornamentation.

Design: Dual interlocking laurel wreaths with woven ribbon, museum-quality guilloche engraving, shield/crest center containing ascending arrow breaking through a ceiling with diamond at apex, "PLATINUM" in elegant capitals, elaborate crown at top, triple border (scalloped + rope + beaded). Small purple enamel inlay accent (#6366F1) in select border sections.

Style: Studio-lit photorealistic 3D render. Head-of-state commendation quality. White/platinum metal with slight cool iridescence.

Colors: Platinum (#D4D4E8), cool silver (#A0A0B8), iridescent (#E8E0F0), dark (#6B6B7B), bright white (#F0F0FF), purple accent (#6366F1).

Square format, 1024x1024.
```

---

## SUMMARY: 18 Total Assets

| # | Asset ID | Type | Size | Best Generated By |
|---|----------|------|------|-------------------|
| 1 | `tier.bronze` | Medallion | 1024² | ChatGPT or SVG |
| 2 | `tier.silver` | Medallion | 1024² | ChatGPT or SVG |
| 3 | `tier.gold` | Medallion | 1024² | ChatGPT or SVG |
| 4 | `tier.platinum` | Medallion | 1024² | ChatGPT or SVG |
| 5 | `badge.problem_master` | Badge | 512² | SVG (Replit) |
| 6 | `badge.objection_slayer` | Badge | 512² | SVG (Replit) |
| 7 | `badge.script_scholar` | Badge | 512² | SVG (Replit) |
| 8 | `badge.psychology_pro` | Badge | 512² | SVG (Replit) |
| 9 | `badge.roleplay_rookie` | Badge | 512² | SVG (Replit) |
| 10 | `badge.roleplay_expert` | Badge | 512² | SVG (Replit) |
| 11 | `badge.speed_learner` | Badge | 512² | SVG (Replit) |
| 12 | `badge.presentation_master` | Badge | 512² | SVG (Replit) |
| 13 | `seal.certified_partner` | Seal | 800² | SVG (Replit) |
| 14 | `seal.equipiq_certified` | Seal | 800² | SVG (Replit) |
| 15 | `stage.1.prospecting` | Stage | 256² | SVG (Replit) |
| 16 | `stage.2.discovery` | Stage | 256² | SVG (Replit) |
| 17 | `stage.3.close` | Stage | 256² | SVG (Replit) |
| 18 | `border.master` | Border | 3300×2550 | SVG (Replit) |
