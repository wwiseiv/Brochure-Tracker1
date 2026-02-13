# PCBancard Sales Intelligence Suite - File Reconstruction Instructions

## IMPORTANT: Read This First
These instructions tell you EXACTLY where every file goes. The project uses a specific folder structure that must be recreated precisely or the app won't work.

---

## STEP 1: Create the Folder Structure

Before placing any files, create these folders in your new Replit project. Copy and paste this into the Shell:

```bash
mkdir -p server/replit_integrations/object_storage
mkdir -p server/replit_integrations/auth
mkdir -p server/replit_integrations/batch
mkdir -p server/replit_integrations/chat
mkdir -p server/replit_integrations/image
mkdir -p server/assets/logos
mkdir -p server/templates
mkdir -p server/renderers
mkdir -p server/services/email-digest
mkdir -p server/esign
mkdir -p server/proposal-intelligence/core
mkdir -p server/proposal-intelligence/plugins
mkdir -p server/proposal-intelligence/data
mkdir -p server/proposal-intelligence/services
mkdir -p server/data
mkdir -p server/types
mkdir -p shared/models
mkdir -p scripts
mkdir -p script
mkdir -p client/src/assets/images
mkdir -p client/src/components/ui
mkdir -p client/src/contexts
mkdir -p client/src/data
mkdir -p client/src/hooks
mkdir -p client/src/lib
mkdir -p client/src/pages
mkdir -p client/public/marketing/generated
mkdir -p client/public/images/equipiq
mkdir -p client/public/legal
mkdir -p public/certificates/medallions
mkdir -p public/one-page-templates
```

---

## STEP 2: If You Have the .tar.gz Archives

If you were able to download and upload the .tar.gz archive files, just run these commands in the Shell to extract them:

```bash
# Extract Part 1 - Core server code + configs
tar xzf part1_core_source.tar.gz

# Extract Part 2 - Client/frontend source code
tar xzf part2_client_source.tar.gz

# Extract Part 3 - Public assets (icons, legal, certificates)
tar xzf part3_public_small.tar.gz

# Extract Part 4 - Marketing flyer templates
tar xzf part4_marketing_assets.tar.gz

# Extract Part 5 - Product/equipment images
tar xzf part5_image_assets.tar.gz
```

Each archive preserves the full folder paths, so files will land in the right places automatically.

Then skip to STEP 4 for database restoration.

---

## STEP 3: If You Copied Files Without Folders (Manual Placement)

If you had to copy-paste files individually without their folder structure, here is EXACTLY where every file goes. This is organized by archive part.

### PART 1 FILES: Server + Config (from part1_core_source.tar.gz)

#### Root config files (put these in the project root `/`):
```
package.json
tsconfig.json
vite.config.ts
tailwind.config.ts
postcss.config.js
drizzle.config.ts
replit.md
MIGRATION_GUIDE.md
.replit
```

#### server/ (main server files):
```
server/index.ts
server/routes.ts
server/storage.ts
server/db.ts
server/static.ts
server/vite.ts
server/export.ts
server/rbac.ts
server/email.ts
server/cron.ts
server/ai-integrations.ts
server/elevenlabs.ts
server/claude-helper.ts
server/trust-engine.ts
server/gamification-engine.ts
server/permission-middleware.ts
server/coaching-enhancement.ts
server/business-research.ts
server/merchant-scrape.ts
server/underwriting.ts
server/google-drive.ts
server/roleplay-knowledge.ts
server/training-knowledge-context.ts
server/sales-process-knowledge.ts
server/sales-script.ts
server/daily-edge-seed.ts
server/equipiq-seed.ts
server/presentation-seed.ts
server/seed-demo-data.ts
server/seed-roleplay-personas.ts
server/proposal-builder.ts
server/proposal-document.ts
server/proposal-generator.ts
server/proposal-images.ts
server/gamma-renderer.ts
server/one-page-ai-service.ts
server/one-page-pdf-service.ts
server/certificate-generator.ts
server/certificate-asset-generator.ts
server/generate-equipiq-thumbnails.ts
server/update-equipiq-images.ts
```

#### server/assets/logos/:
```
server/assets/logos/pcb_logo_fullcolor.png
server/assets/logos/pcb_logo_light.png
server/assets/logos/pcb_icon_purple.png
```

#### server/templates/:
```
server/templates/one-page-proposal.html
server/templates/proposal-template.html
```

#### server/renderers/:
```
server/renderers/html-renderer.ts
```

#### server/types/:
```
server/types/html-pdf-node.d.ts
```

#### server/data/:
```
server/data/mcc-codes.json
```

#### server/services/:
```
server/services/help-chatbot.ts
server/services/prospect-search.ts
server/services/marketingGenerator.ts
server/services/googleDriveService.ts
server/services/pdfFlyerBuilder.ts
server/services/smart-digest-scheduler.ts
server/services/proposal-image-generator.ts
server/services/proposal-ai-agent.ts
server/services/claude-document-generator.ts
server/services/business-card-scanner.ts
server/services/job-recovery.ts
server/services/document-converter.ts
server/services/document-classifier.ts
server/services/websiteAnalyzer.ts
server/services/merchantIntelligence.ts
server/services/statement-validator.ts
server/services/robust-pdf-parser.ts
server/services/pdf-job-queue.ts
server/services/proposal-parse-service.ts
server/services/cache-service.ts
server/services/duplicate-detection.ts
server/services/pagination.ts
server/services/advice-export-service.ts
```

#### server/services/email-digest/:
```
server/services/email-digest/index.ts
server/services/email-digest/data-gatherer.ts
server/services/email-digest/ai-generator.ts
server/services/email-digest/email-sender.ts
```

#### server/esign/:
```
server/esign/esign-service.ts
server/esign/document-library.ts
server/esign/form-utils.ts
```

#### server/proposal-intelligence/core/:
```
server/proposal-intelligence/core/index.ts
server/proposal-intelligence/core/types.ts
server/proposal-intelligence/core/plugin-manager.ts
server/proposal-intelligence/core/model-router.ts
server/proposal-intelligence/core/orchestrator.ts
```

#### server/proposal-intelligence/plugins/:
```
server/proposal-intelligence/plugins/index.ts
server/proposal-intelligence/plugins/field-validation.ts
server/proposal-intelligence/plugins/proposal-generator.ts
server/proposal-intelligence/plugins/web-scraper.ts
server/proposal-intelligence/plugins/interchange-calculator.ts
```

#### server/proposal-intelligence/data/:
```
server/proposal-intelligence/data/interchange-rates.ts
```

#### server/proposal-intelligence/services/:
```
server/proposal-intelligence/services/ai-analyzer.ts
server/proposal-intelligence/services/talking-points.ts
server/proposal-intelligence/services/learning-service.ts
server/proposal-intelligence/services/statement-analysis.ts
server/proposal-intelligence/services/statement-extractor.ts
```

#### server/proposal-intelligence/:
```
server/proposal-intelligence/index.ts
server/proposal-intelligence/api.ts
```

#### server/replit_integrations/object_storage/:
```
server/replit_integrations/object_storage/index.ts
server/replit_integrations/object_storage/objectStorage.ts
server/replit_integrations/object_storage/objectAcl.ts
server/replit_integrations/object_storage/routes.ts
```

#### server/replit_integrations/auth/:
```
server/replit_integrations/auth/index.ts
server/replit_integrations/auth/routes.ts
server/replit_integrations/auth/replitAuth.ts
server/replit_integrations/auth/storage.ts
```

#### server/replit_integrations/batch/:
```
server/replit_integrations/batch/index.ts
server/replit_integrations/batch/utils.ts
```

#### server/replit_integrations/chat/:
```
server/replit_integrations/chat/index.ts
server/replit_integrations/chat/routes.ts
server/replit_integrations/chat/storage.ts
```

#### server/replit_integrations/image/:
```
server/replit_integrations/image/index.ts
server/replit_integrations/image/routes.ts
server/replit_integrations/image/client.ts
```

#### shared/:
```
shared/schema.ts
shared/permissions.ts
shared/models/auth.ts
shared/models/chat.ts
```

#### scripts/:
```
scripts/generate-one-page-templates.ts
script/build.ts
```

---

### PART 2 FILES: Client Source (from part2_client_source.tar.gz)

#### client/ root:
```
client/index.html
```

#### client/src/ root:
```
client/src/App.tsx
client/src/main.tsx
client/src/index.css
client/src/vite-env.d.ts
client/src/offlineStore.ts
```

#### client/src/assets/:
```
client/src/assets/pcb_icon_purple.png
client/src/assets/pcb_logo_black.png
client/src/assets/pcb_logo_fullcolor.png
client/src/assets/pcb_logo_light.png
client/src/assets/pcb_logo_silver.png
```

#### client/src/assets/images/:
(Any generated images go here)

#### client/src/hooks/:
```
client/src/hooks/use-toast.ts
client/src/hooks/use-upload.ts
client/src/hooks/use-auth.ts
client/src/hooks/use-location-reminders.ts
client/src/hooks/use-offline-sync.ts
client/src/hooks/use-push-notifications.ts
```

#### client/src/lib/:
```
client/src/lib/queryClient.ts
client/src/lib/utils.ts
(any other files in this folder)
```

#### client/src/contexts/:
```
(all .tsx files in this folder)
```

#### client/src/data/:
```
(all .ts files in this folder - training data, persona data, etc.)
```

#### client/src/components/:
```
(all .tsx component files - AppLayout.tsx, BottomNav.tsx, etc.)
```

#### client/src/components/ui/:
```
(all shadcn UI component files - button.tsx, card.tsx, dialog.tsx, etc.)
```

#### client/src/pages/:
```
(all page files - dashboard.tsx, coach.tsx, help.tsx, etc.)
```

**NOTE:** Part 2 has 168 files total. All files under client/src/ maintain their subfolder structure.

---

### PART 3 FILES: Public Assets (from part3_public_small.tar.gz)

#### client/public/ root:
```
client/public/manifest.json
client/public/sw.js
client/public/favicon.png
client/public/icon-192.png
client/public/icon-512.png
client/public/og-image.png
```

#### client/public/legal/:
```
client/public/legal/index.html
client/public/legal/privacy-policy.html
client/public/legal/terms-of-service.html
client/public/legal/cookie-policy.html
client/public/legal/copyright-dmca.html
client/public/legal/refunds-policy.html
client/public/legal/accessibility-statement.html
```

#### public/certificates/medallions/:
```
public/certificates/medallions/tier-bronze-medallion.png
public/certificates/medallions/tier-silver-medallion.png
public/certificates/medallions/tier-gold-medallion.png
public/certificates/medallions/tier-platinum-medallion.png
public/certificates/medallions/tier-diamond-medallion.png
(plus any other medallion/certificate images)
```

#### public/one-page-templates/:
```
(all one-page proposal template files)
```

---

### PART 4 FILES: Marketing Assets (from part4_marketing_assets.tar.gz)

All files go in `client/public/marketing/`:
```
client/public/marketing/pcbancard-intro.png
client/public/marketing/liquor-stores.pdf
client/public/marketing/charity-giveback.jpg
client/public/marketing/cash-advance-detail.png
client/public/marketing/services-programs.png
client/public/marketing/traditional-processing.png
(plus all other marketing PDF and image files)
```

Generated marketing files go in `client/public/marketing/generated/`:
```
client/public/marketing/generated/hero_*.png
client/public/marketing/generated/flyer_*.html
client/public/marketing/generated/flyer_*.pdf
```

---

### PART 5 FILES: Equipment Images (from part5_image_assets.tar.gz)

#### client/public/images/:
```
client/public/images/dejavoo-p1.png
```

#### client/public/images/equipiq/:
```
client/public/images/equipiq/swipesimple-terminal.png
client/public/images/equipiq/swipesimple-register.png
client/public/images/equipiq/swipesimple-card-readers.png
client/public/images/equipiq/tap-to-pay-iphone.png
client/public/images/equipiq/dejavoo-p1.png
client/public/images/equipiq/dejavoo-p3.png
client/public/images/equipiq/dejavoo-p5.png
client/public/images/equipiq/dejavoo-p8.png
client/public/images/equipiq/dejavoo-p12.png
client/public/images/equipiq/dejavoo-p17.png
client/public/images/equipiq/dejavoo-p18.png
client/public/images/equipiq/dejapaypro.png
client/public/images/equipiq/spin.png
client/public/images/equipiq/dejavoo-extra.png
client/public/images/equipiq/pax-a920-pro.png
client/public/images/equipiq/mx-pos-all-in-one.png
client/public/images/equipiq/mx-pos-kiosk.png
client/public/images/equipiq/mx-pos-restaurant.png
client/public/images/equipiq/mx-pos-retail.png
client/public/images/equipiq/mx-pos-salon.png
client/public/images/equipiq/hot-sauce-table-service.png
client/public/images/equipiq/hot-sauce-quick-service.png
client/public/images/equipiq/ipospays-gateway.png
(plus all other equipiq product images)
```

---

## STEP 4: Restore the Database

After all files are in place:

### Option A: Using the .dump file (recommended)
Upload `database_full.dump` to the project, then run in Shell:
```bash
pg_restore --no-owner --no-privileges --clean --if-exists -d $DATABASE_URL database_full.dump
```

### Option B: Using the .sql.gz file
Upload `database_full.sql.gz` to the project, then run in Shell:
```bash
gunzip database_full.sql.gz
psql $DATABASE_URL < database_full.sql
```

### Option C: Fresh database (no existing data)
If you want to start with empty tables:
```bash
npm run db:push
```
This creates all 130 tables from the schema but with no data.

---

## STEP 5: Install Dependencies

Run in Shell:
```bash
npm install
```

This reads package.json and installs all ~120 packages (React, Express, Drizzle, AI SDKs, etc.).

---

## STEP 6: Set Up Secrets

Add these secrets in the new project's Secrets tab:
- `ELEVENLABS_API_KEY` - for text-to-speech
- `GROK_API_KEY` - for xAI Grok AI
- `SIGNNOW_USERNAME` - for e-signature integration

Plus re-configure these Replit integrations:
- Replit Auth (OpenID Connect)
- PostgreSQL Database
- Object Storage
- OpenAI / Anthropic / Gemini (AI integrations)
- Resend (email)
- ElevenLabs
- Google Drive

---

## STEP 7: Start the App

Run in Shell:
```bash
npm run dev
```

The app should start on port 5000 with both the Express API server and Vite frontend dev server.

---

## STEP 8: Publish and Add Domain

1. Click Publish
2. Choose Autoscale or Reserved VM deployment
3. Go to domain settings
4. Link your custom domain (PCBISV.com)
5. Add the DNS records at your domain registrar
6. Wait for DNS propagation (can take up to 48 hours)

---

## Quick Verification Checklist

After setup, verify these work:
- [ ] App loads in browser on port 5000
- [ ] Login works (Replit Auth)
- [ ] Dashboard shows data from database
- [ ] AI features work (Coach, Training, etc.)
- [ ] Images/logos display correctly
- [ ] Marketing flyers load
- [ ] EquipIQ product images show
- [ ] Certificate medallions render

---

## File Count Summary
- **Part 1**: ~130 server/config files
- **Part 2**: 168 client source files
- **Part 3**: ~30 public asset files
- **Part 4**: ~44 marketing files
- **Part 5**: ~62 image files
- **Database**: 130 tables
- **Total**: ~434 source files + database
