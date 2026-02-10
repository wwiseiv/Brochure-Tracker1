# PCBancard Sales Intelligence Suite - Complete Build Prompt

Build a web application that serves as a comprehensive Sales Intelligence Suite for PCBancard, a payment processing company. This is a mobile-first Progressive Web App (PWA) designed for field sales representatives to track physical marketing assets (video brochures), manage a 14-stage sales pipeline CRM, and leverage AI-powered tools for prospecting, training, proposal generation, statement analysis, and internal communication. The app must support multi-tenant organizations with role-based access control.

---

## 1. PROJECT OVERVIEW

PCBancard sells credit card payment processing services to local businesses. Field sales reps ("agents") physically visit businesses, leave marketing brochures, schedule follow-ups, and close deals. This app digitizes their entire workflow:

- **Brochure Tracking**: QR-coded physical video brochures are tracked from warehouse to agent to merchant location, with GPS logging, voice notes, and pickup scheduling.
- **CRM & Deal Pipeline**: A 14-stage sales pipeline (from "Prospect" through "Active Merchant") with Kanban/list views, deal sheets, follow-up automation, and team visibility.
- **AI Sales Tools**: AI-powered prospecting (find real businesses by ZIP code), proposal generation, statement analysis (analyze competitor processing statements for savings), sales coaching, roleplay training, and email drafting.
- **Team Management**: Multi-tenant organizations with Master Admin > Relationship Manager > Agent hierarchy, user impersonation for debugging, and comprehensive permissions.
- **Gamification**: XP system, badges, skill scores, career ladder, streaks, leaderboards, and PDF certificates to drive training engagement.

---

## 2. TECH STACK

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS 3** with shadcn/ui component library
- **Wouter** for client-side routing
- **TanStack React Query v5** for data fetching
- **Framer Motion** for animations
- **Recharts** for charts/analytics
- **html5-qrcode** for QR code scanning
- **Uppy** with AWS S3 presigned URLs for file uploads
- **react-hook-form** with zod validation
- **Lucide React** icons, **react-icons** for brand logos
- **react-markdown** for rendering AI responses
- **cmdk** for command palette
- **embla-carousel-react** for carousels
- **react-swipeable** for mobile swipe gestures
- **vaul** for mobile drawer sheets
- **jspdf** + **jspdf-autotable** for client-side PDF generation

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** with **Drizzle ORM**
- **Passport.js** with OpenID Connect (Replit Auth)
- **express-session** with connect-pg-simple session store

### AI Services (Multi-Provider)
- **xAI Grok-4** (primary) - with web_search tool for real-time business prospecting via `https://api.x.ai/v1/responses`
- **Anthropic Claude** (via Replit AI Integrations) - proposal writing, sales coaching, roleplay, email drafting, merchant intelligence, marketing content generation
- **Google Gemini** (via Replit AI Integrations) - statement analysis with vision (PDF/image parsing), help chatbot
- **OpenAI** (via Replit AI Integrations) - EquipIQ equipment recommendations, document classification
- **ElevenLabs** - Text-to-speech for "Listen" buttons and speech-to-text for voice dictation

### External Services
- **Google Cloud Storage** - File uploads via presigned URLs (statements, proposals, attachments)
- **Google Drive API** - Training material sync, flyer imports for RAG content
- **Resend** - Transactional email (invitation emails, email digest, advice export)
- **SignNow** - Electronic signature integration for sales documents
- **Web Push** (web-push library with VAPID keys) - Push notifications for completed searches/analyses

### Other Libraries
- **PDFKit** + **pdf-lib** + **pdf-parse** - Server-side PDF generation and parsing
- **docx** - Word document generation for proposals
- **sharp** - Image processing
- **ExcelJS** + **xlsx** - Excel export
- **cheerio** - Web scraping for merchant intelligence
- **handlebars** - Email/document templates
- **mammoth** - Word document parsing

---

## 3. AUTHENTICATION & AUTHORIZATION

### Authentication
- Replit Auth via OpenID Connect (Passport.js)
- Session-based with PostgreSQL session store
- Profile completion flow for new users (first name, last name, email, phone)

### Three-Tier Role-Based Access Control (RBAC)
1. **Master Admin** - Full access, manage organization, create/remove members, impersonate users, view all data across the org
2. **Relationship Manager (RM)** - Manage assigned agents, view team pipeline, approve content
3. **Agent** - Standard field sales rep, manages own drops/deals/merchants

### Agent Stages (within Agent role)
- Trainee, Active, Senior - affects feature visibility through granular permissions

### Permission System
- 30+ granular boolean permissions per user (canCreateDrops, canViewPipeline, canAccessAI, canViewDailyEdge, etc.)
- Permission overrides per user
- Audit logging for all permission changes
- Organization-level feature flags

### Impersonation
- Master Admins can impersonate any user in their org for debugging
- Audit trail for all impersonation sessions
- X-Impersonation-Token header system

---

## 4. DATABASE SCHEMA (87 Tables)

### Core Business Tables
- **organizations** - Multi-tenant orgs with name, settings
- **organization_members** - User-org mapping with role, assignedRmId, status
- **organization_features** - Feature flags per org

### Brochure Tracking
- **brochures** - Individual tracked brochures with qrCode, holderType (house/rm/agent), holderId
- **brochure_locations** - GPS location history for each brochure
- **brochure_location_history** - Transfer history (who had it, when)
- **drops** - Core entity: a brochure deployment at a business location with GPS coords, business info, voice notes, photos, outcome tracking, follow-up dates
- **reminders** - Scheduled pickup/follow-up reminders for drops
- **voice_notes** - Audio recordings attached to merchants (stored as base64 or cloud URLs)

### CRM & Pipeline
- **merchants** - Business contacts with name, address, phone, status, pipeline stage, notes
- **deals** - Full deal tracking with pipeline stage, value, probability, source, assigned agent
- **deal_activities** - Activity log per deal (calls, emails, meetings, notes)
- **deal_attachments** - Files attached to deals
- **pipeline_stage_config** - Customizable pipeline stage definitions per org
- **loss_reasons** - Track why deals were lost
- **prospects** - Discovered businesses from AI prospecting
- **prospect_searches** - Background search job tracking
- **prospect_activities** - Activity log per prospect

### Referrals & Sequences
- **referrals** - Referral tracking with source merchant, referred business, commission, status
- **follow_up_sequences** - Automated follow-up sequence definitions
- **follow_up_steps** - Individual steps in a sequence (email, call, SMS)
- **follow_up_executions** - Execution tracking for automated sequences

### AI & Intelligence
- **ai_summaries** - Cached AI-generated summaries for merchants
- **lead_scores** - AI-calculated lead scores with tier (hot/warm/cold)
- **merchant_intelligence** - Cached web-scraped business intelligence
- **meeting_recordings** - Voice recordings with AI transcription and analysis
- **statement_analysis_jobs** - Background statement analysis jobs
- **statement_extractions** - Extracted data from processing statements

### Proposals
- **proposals** - Generated sales proposals with content, format, status
- **proposal_jobs** - Background proposal generation jobs
- **proposal_parse_jobs** - Background statement parsing jobs for proposal data

### Training & Gamification
- **roleplay_sessions** - AI roleplay training sessions
- **roleplay_messages** - Messages within roleplay sessions
- **roleplay_personas** - AI merchant personas for roleplay (seeded data)
- **daily_edge_content** - 90 daily motivation/mindset training items (seeded)
- **daily_edge_streaks** - User engagement streaks
- **user_daily_edge** - Track which content each user has seen
- **presentation_modules** - Sales presentation training modules (8 modules)
- **presentation_lessons** - Individual lessons within modules (24 lessons)
- **presentation_quizzes** - Quiz questions for each lesson (80 quizzes)
- **presentation_progress** - User progress through lessons
- **presentation_practice_responses** - Practice delivery recordings
- **training_sessions** - Interactive training sessions (roleplay, objection gauntlet, scenario trainer, delivery analyzer)
- **training_messages** - Messages within training sessions
- **training_documents** - Custom training materials synced from Google Drive
- **gamification_profiles** - XP, level, streaks, skill score per user
- **xp_ledger** - Immutable XP earn event log
- **gamification_daily_log** - Daily activity for streak calculation
- **badges_earned** - Badges earned by users (dual badge structure)
- **certificates** - Training completion certificates
- **generated_certificates** - PDF certificate generation tracking
- **video_watch_progress** - Vimeo training video watch tracking
- **user_belief_progress** - Belief system progress tracking

### Marketing
- **marketing_templates** - Marketing flyer templates (industry-specific)
- **marketing_generation_jobs** - Background flyer generation jobs
- **generated_marketing_materials** - AI-generated marketing materials
- **marketing_approved_claims** - Pre-approved marketing claims for compliance
- **marketing_rag_content** - RAG knowledge base for marketing generation
- **marketing_imported_flyers** - Flyers imported from Google Drive
- **hidden_marketing_templates** - User-hidden template preferences

### E-Signature
- **esign_document_templates** - Document template definitions
- **esign_document_packages** - Grouped document packages
- **esign_requests** - Signature request tracking with SignNow integration

### Email & Notifications
- **email_digest_preferences** - User email digest preferences
- **email_digest_history** - Sent digest tracking
- **push_subscriptions** - Web push notification subscriptions

### System
- **user_permissions** - Granular permission overrides
- **permission_audit_log** - Permission change audit trail
- **impersonation_sessions** - User impersonation tracking
- **impersonation_audit_log** - Impersonation activity log
- **activity_events** - System-wide activity feed
- **offline_queue** - Offline-first operation queue
- **invitations** - Organization join invitations
- **feedback_submissions** - User feedback/bug reports
- **user_preferences** - UI preferences (theme, notifications, timezone)
- **fee_dictionary** - Payment processing fee definitions (seeded)
- **extraction_corrections** - User corrections to AI-extracted data
- **equipment_vendors** - EquipIQ vendor data (6 vendors seeded)
- **equipment_products** - EquipIQ product catalog
- **equipment_business_types** - Business type to equipment mappings
- **equipment_quiz_results** - Equipment recommendation quiz results
- **equipment_recommendation_sessions** - Equipment recommendation sessions
- **gauntlet_responses** - Objection gauntlet training responses
- **earned_items** - Earned gamification items

---

## 5. KEY FEATURES & PAGES

### Dashboard (`/`)
- Today's stats: drops made, follow-ups due, deals in pipeline
- Quick action buttons for common tasks
- Activity feed of recent actions
- Pipeline summary chart

### QR Scanner (`/scan`)
- Camera-based QR code scanning using html5-qrcode
- Scans brochure QR codes to create drops or look up brochure status
- Supports continuous scanning mode

### New Drop (`/drops/new`)
- Form to log a brochure deployment at a business
- GPS location capture (automatic)
- Business name, type, contact info
- Voice note recording (via ElevenLabs or browser MediaRecorder)
- Photo upload capability
- Brochure selection from agent's inventory
- Follow-up date scheduling

### Drop Detail (`/drops/:id`)
- Full details of a brochure deployment
- Outcome tracking (pending, picked up, converted, lost)
- Meeting recording with AI analysis
- Notes and follow-up management
- Location map display

### Drop History (`/history`)
- Paginated list of all drops with search/filter
- Export to Excel functionality
- Filter by status, date range, business type

### Merchants CRM (`/merchants`)
- List/grid view of all merchant contacts
- Search and filter capabilities
- Merchant detail view with tabs for: Info, Drops, Voice Notes, Visits, Recordings, Intelligence

### Merchant Detail (`/merchants/:id`)
- Full merchant profile with business info
- AI-powered merchant intelligence (web scraping for business hours, reviews, competitors, contact info)
- Voice note recording and playback
- Visit history
- Meeting recordings with AI transcription
- Deal association

### Deal Pipeline (`/prospects/pipeline`)
- **14-stage Kanban board** with drag-and-drop:
  1. Prospect
  2. Cold Call
  3. Appointment Set
  4. Presentation Made
  5. Proposal Sent
  6. Statement Analysis
  7. Negotiating
  8. Follow Up
  9. Documents Sent
  10. Documents Signed
  11. Sold
  12. Dead
  13. Installation Scheduled
  14. Active Merchant
- List view alternative
- Deal detail sheets with activities, attachments, notes
- Pipeline stage configuration per organization
- Deal value and probability tracking

### Team Pipeline (`/team-pipeline`)
- Manager/Admin view of all team members' pipelines
- Filter by agent, stage, date range

### Pipeline Analytics (`/pipeline-analytics`)
- Charts: Pipeline value by stage, conversion rates, average deal cycle time
- Agent performance comparison
- Win/loss analysis with loss reasons

### AI Prospect Finder (`/prospects/search`)
- ZIP code-based business search using Grok-4 with live web search
- MCC (Merchant Category Code) based business type selection (246 codes)
- Configurable radius (5-50 miles) and result count (5-50)
- Background job processing with progress tracking
- Results include: business name, address, phone, website, Yelp URL, Google Maps URL, review ratings, owner name
- Save to prospect pipeline
- Push notification when search completes

### Business Card Scanner (`/prospects/scan-card`)
- Camera capture of business cards
- AI-powered text extraction (OCR via Gemini vision)
- Auto-populate prospect/merchant fields

### Proposal Generator (`/proposal-generator`)
- **Full Proposals**: Multi-page PDF/Word proposals with AI-generated content
  - Merchant data parsing from uploaded statements
  - Savings calculation (Dual Pricing vs Interchange Plus)
  - AI-written recommendation sections
  - Professional formatting with company branding
- **One-Page Proposals**: 7 pre-built templates + AI-Custom option
  - Templates: Restaurant, Retail, Service Business, Medical/Dental, Gas Station, E-Commerce, Custom
  - Each generates a branded one-page PDF

### Statement Analyzer (`/statement-analyzer`)
- Upload competitor processing statements (PDF/image)
- AI vision analysis using Gemini to extract:
  - Monthly volume, transaction count
  - Effective rate, fees breakdown
  - Equipment details
- Savings calculation comparing current rates to PCBancard pricing
- Background job processing with progress tracking
- Push notification when analysis completes

### Proposal Intelligence System (Backend)
- Plugin architecture with 4 plugins:
  1. **Field Validation** - Validates extracted statement data
  2. **Web Scraper** - Scrapes merchant websites for intelligence
  3. **Interchange Calculator** - Calculates interchange rates from MCC codes
  4. **Proposal Generator** - Generates proposal content with AI
- Learning service with fee dictionary (seeded data)
- Statement extraction with correction tracking

### Sales Coach (`/coach`)
- AI-powered sales advice with daily rotating topics
- Contextual coaching based on current pipeline
- Export advice via email (using Resend)
- Voice input for questions (ElevenLabs STT)
- Listen button for AI responses (ElevenLabs TTS)

### Email Drafter (`/email`)
- AI-assisted email composition for sales outreach
- Templates for follow-up, introduction, proposal delivery
- Tone and length controls

### Interactive Training (`/interactive-training`)
- **AI Roleplay**: Practice sales conversations with AI merchant personas (13 pre-built personas including "Frank the Frustrated," "Maria the Multi-Location Owner," etc.)
- **Objection Gauntlet**: Rapid-fire objection handling practice
- **Scenario Trainer**: Situational sales scenario training
- **Delivery Analyzer**: Record and analyze sales pitch delivery with voice I/O

### Presentation Training (`/presentation-training`)
- 8 training modules with 24 lessons and 80 quiz questions (seeded data)
- Progressive learning path
- Quiz completion tracking
- Practice recording and AI feedback

### Sales Videos Training (`/training/sales-videos`)
- Integrated Vimeo training video library
- Watch progress tracking per user
- Completion status and time tracking

### Sales Process Guide (`/sales-process`)
- Reference guide for the PCBancard sales methodology
- Step-by-step process documentation

### Daily Edge / Motivation (`/today`)
- 90 daily motivation/mindset items (seeded)
- Streak tracking for daily engagement
- Belief system progress
- Daily tips and inspiration

### EquipIQ (`/equipiq`)
- Equipment recommendation engine
- Quiz-based business needs assessment
- 6 vendor catalogs with product images:
  - Clover (Flex, Go, Mini, Station Duo, Station Solo)
  - Dejavoo (P1, P3, P5, P8, P12, P17, P18, Extra)
  - PAX (A35, A60, A77, A80, A920, A920 Pro, D135, D200, D210, E600, E700, E800, IM30, S300, S800, S920)
  - Hot Sauce POS (6 configurations)
  - SwipeSimple (7 products)
  - Valor (7 products)
  - MX POS (5 configurations)
- Business type matching
- Side-by-side product comparison

### Marketing Materials (`/marketing`)
- Industry-specific marketing flyer templates (20+ industries)
- AI-generated custom flyers using Claude
- Personalized flyer generation with agent branding
- RAG-enhanced content from imported Google Drive flyers
- Template management (show/hide)
- Pre-approved marketing claims for compliance

### E-Signature (`/esign`)
- Document template library for sales paperwork
- Document packages (grouped templates)
- SignNow integration for electronic signatures
- Request tracking and status monitoring

### Referrals (`/referrals`)
- Referral tracking from existing merchants
- Commission tracking
- Status management (pending, contacted, converted, lost)
- Thank-you email sending via Resend
- Export to Excel

### Inventory Management (`/inventory`)
- Agent brochure inventory tracking
- Restock requests
- Low-stock threshold alerts
- Transfer history logging

### Route Planner (`/route`)
- Map-based daily route planning
- Visit scheduling
- Drop location visualization

### Activity Feed (`/activity`)
- System-wide activity stream
- Filter by event type, date, user
- Real-time updates

### Follow-Up Sequences (`/sequences`)
- Automated follow-up sequence builder
- Multi-step sequences (email, call reminder, SMS)
- Execution tracking and status

### Gamification Dashboard (`/gamification`)
- **XP System**: Earn XP for completing activities (drops, deals, training, etc.)
- **Leveling**: Progressive level system based on total XP
- **Badges**: Dual badge structure (achievement badges + skill badges)
- **Skill Score**: Weighted composite score across multiple skill areas
- **Career Ladder**: Progression tiers
- **Streaks**: Daily activity streak tracking with bonuses
- **Leaderboard**: Org-wide ranking by XP, skill score
- **PDF Certificates**: Generate completion certificates

### Admin Dashboard (`/admin`)
- Organization management
- User management (add/remove/edit members)
- Role assignment
- Permission management with granular overrides
- Impersonation controls
- Cache management (merchant intelligence cache)
- Feature flag management
- Feedback review (`/admin/feedback`)
- Agent training progress view (`/admin/agent/:userId/training`)

### RM Dashboard (`/manager`)
- Team overview for relationship managers
- Agent performance metrics
- Pipeline oversight

### Profile (`/profile`)
- User profile management
- Preferences (theme, notifications, timezone)
- Notification settings

### Help (`/help`)
- AI-powered help chatbot using Gemini
- Context-aware assistance

### AI Email Digest System (Background Service)
- Smart digest scheduler (runs every 30 minutes)
- Gathers user activity data (drops, deals, training)
- AI-generated personalized digest content
- Sends via Resend email
- User preference controls for frequency and content

### Feedback System
- In-app feedback form
- File attachment support
- Admin review interface
- Bug report, feature suggestion, help request categories

### Offline Support (PWA)
- Service worker with caching strategies
- IndexedDB for offline data storage
- Offline queue for operations made without connectivity
- Sync when back online
- PWA manifest for installability

---

## 6. SEEDED / REFERENCE DATA

The following data must be pre-loaded or seeded on app startup:

1. **MCC Codes** (`server/data/mcc-codes.json`) - 246 Merchant Category Codes with titles, categories, and search terms
2. **Daily Edge Content** - 90 daily motivation items across 6 belief categories
3. **Roleplay Personas** - 13 AI merchant personas for sales practice
4. **Presentation Training** - 8 modules, 24 lessons, 80 quizzes
5. **EquipIQ Vendors** - 6 vendors with product catalogs (60+ products with images)
6. **Fee Dictionary** - Payment processing fee definitions for interchange calculation
7. **Pipeline Stage Config** - Default 14-stage pipeline configuration
8. **Marketing Templates** - 20+ industry-specific flyer templates
9. **E-Sign Document Templates** - Sales document templates and packages

---

## 7. ENVIRONMENT VARIABLES NEEDED

### Required Secrets
- `GROK_API_KEY` - xAI Grok-4 API key for prospect search
- `ELEVENLABS_API_KEY` - ElevenLabs TTS/STT API key
- `SIGNNOW_USERNAME` - SignNow account credentials
- `RESEND_API_KEY` - Resend email service API key (via Replit integration)

### Replit AI Integrations (Auto-configured)
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` / `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` - Claude access
- `AI_INTEGRATIONS_GEMINI_API_KEY` / `AI_INTEGRATIONS_GEMINI_BASE_URL` - Gemini access
- `AI_INTEGRATIONS_OPENAI_API_KEY` / `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI access

### Optional
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` - Web push notifications
- `RESEND_FROM_EMAIL` - Custom from email address
- Cache configuration: `CACHE_DEFAULT_TTL`, `CACHE_MAX_SIZE`, etc.

### Auto-configured by Replit
- `DATABASE_URL` - PostgreSQL connection
- `REPL_IDENTITY` - Replit Auth identity
- `REPLIT_DEPLOYMENT_URL` / `REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS` - Deployment URLs

---

## 8. API STRUCTURE

The app has approximately 354 API endpoints organized by domain:

- `/api/brochures/*` - Brochure management, transfers, location tracking
- `/api/drops/*` - Drop CRUD, reminders, export
- `/api/merchants/*` - Merchant CRUD, voice notes, visits, intelligence
- `/api/deals/*` - Deal pipeline CRUD, activities, attachments
- `/api/prospects/*` - Prospect search, pipeline, activities
- `/api/referrals/*` - Referral CRUD, export, thank-you emails
- `/api/inventory/*` - Inventory management, restock, thresholds
- `/api/organization/*` - Org management, members, consolidation
- `/api/permissions/*` - Permission queries and overrides
- `/api/invitations/*` - Invitation CRUD, accept, resend
- `/api/roleplay/*` - Roleplay sessions, messages, personas
- `/api/training/*` - Training sessions, messages, documents
- `/api/presentation/*` - Presentation training progress, quizzes
- `/api/daily-edge/*` - Daily motivation content, streaks
- `/api/gamification/*` - XP, levels, badges, leaderboard, certificates
- `/api/videos/*` - Video watch progress tracking
- `/api/proposals/*` - Proposal generation, parsing, jobs
- `/api/statement-analysis/*` - Statement analysis jobs, results
- `/api/marketing/*` - Marketing template management, generation
- `/api/esign/*` - E-signature templates, packages, SignNow integration
- `/api/coach/*` - AI coaching and advice
- `/api/tts` / `/api/stt` - Text-to-speech / Speech-to-text
- `/api/email/*` - Email drafting, digest preferences
- `/api/feedback` - Feedback submissions
- `/api/activity/*` - Activity feed
- `/api/admin/*` - Admin operations, cache management
- `/api/upload/*` - File upload presigned URLs
- `/api/push/*` - Push notification subscriptions
- `/api/impersonation/*` - User impersonation
- `/api/me/*` - Current user profile, preferences, role
- `/api/internal/*` - Internal background job endpoints

---

## 9. CRITICAL IMPLEMENTATION DETAILS

### Grok-4 Prospect Search (Most Important AI Feature)
- Uses xAI Responses API (`https://api.x.ai/v1/responses`) with `web_search` tool
- Model: `grok-4`
- Searches Yelp, Google Maps, Facebook, Yellow Pages, local directories
- Returns real, currently operating businesses with comprehensive data
- 90-second timeout per API call
- Falls back to Claude if Grok fails
- Background job processing with setImmediate
- Results include: name, address, city, state, zip, phone, website, email, hours, owner name, Yelp/Google/Facebook URLs, review rating, review count, price range, credit card acceptance, online ordering, categories, neighborhood, source

### Statement Analysis (AI Vision)
- Uses Gemini vision to analyze uploaded PDF/image statements
- Extracts: monthly volume, transaction count, effective rate, fees
- Calculates potential savings comparing current rates to PCBancard pricing
- Proposal Intelligence plugin system processes extracted data

### Multi-Provider AI Strategy
- Grok-4 for real-time web search (prospecting)
- Claude for creative writing (proposals, coaching, emails, roleplay, marketing)
- Gemini for vision tasks (statement analysis, business card scanning, help chatbot)
- OpenAI for structured recommendations (EquipIQ)
- All with appropriate fallback chains

### File Upload Flow
- Client requests presigned URL from backend
- Backend generates Google Cloud Storage presigned URL
- Client uploads directly to GCS via Uppy
- Backend stores the GCS object path for later retrieval

### Merchant Intelligence Cache
- Web scraping via cheerio for business info
- Configurable TTL per data type (business hours, reviews, competitors, etc.)
- Admin-manageable cache clearing
- Background refresh capability

---

## 10. STATIC ASSETS TO INCLUDE

The following static assets must be included with the app (provided in a separate ZIP file):

### Equipment Images (`client/public/images/equipiq/`)
- 60 product images across 6 vendor lines (Clover, Dejavoo, PAX, Hot Sauce, SwipeSimple, Valor, MX POS)

### Marketing Flyer Templates (`client/public/marketing/`)
- 20+ industry-specific marketing flyer images (attorneys, automotive, convenience stores, food trucks, restaurants, salons, veterinarians, etc.)
- Video brochure PDF
- Dual pricing explainer images

### PWA Assets (`client/public/`)
- favicon.png, icon-192.png, icon-512.png, og-image.png
- manifest.json
- sw.js (service worker)
- Legal pages (privacy policy, terms of service, cookie policy, etc.)

### MCC Codes Data (`server/data/mcc-codes.json`)
- 246 merchant category codes with titles, categories, and search terms

---

## 11. MOBILE-FIRST DESIGN REQUIREMENTS

- All pages must be optimized for mobile viewport (360-428px width)
- Bottom navigation bar for primary actions on mobile
- Swipeable cards/sheets for detail views (using vaul drawers)
- Touch-friendly tap targets (minimum 44x44px)
- iOS-specific scroll fixes for bottom sheets
- Pull-to-refresh patterns where appropriate
- Dark mode support
- Responsive grid layouts that adapt to tablet/desktop
- GPS/location permission handling
- Camera permission handling for QR scanner and business card scanner

---

## 12. DEPLOYMENT REQUIREMENTS

- Single Express server serving both API and React frontend
- PostgreSQL database (Replit built-in)
- Environment secrets configured via Replit Secrets
- Google Cloud Storage bucket for file uploads
- Service worker for offline PWA capability
- Background job processing (prospect search, statement analysis, proposal generation)
- Email digest scheduler (runs every 30 minutes)
- Job recovery system for stuck background jobs

---

## 13. DATA MIGRATION NOTES

The following data from the existing production database should be preserved or re-seeded:
- All user accounts and organization memberships
- All drops, merchants, deals, and pipeline data
- Training progress (gamification profiles, XP, badges)
- All AI-generated content (proposals, analyses)
- Marketing materials and templates
- Seeded reference data (MCC codes, personas, training content, fee dictionary, EquipIQ catalog)

---

## 14. IMPORTANT BUSINESS LOGIC

### Brochure Lifecycle
1. Brochures registered with QR codes by admin
2. Assigned to house inventory
3. Transferred to RM, then to Agent
4. Agent deploys at business (creates a "drop")
5. Drop tracked with GPS, notes, photos
6. Follow-up reminders scheduled
7. Outcome tracked (converted to deal, picked up, or lost)

### Deal Pipeline Flow
1. Prospect discovered (AI search, referral, or manual entry)
2. Moves through 14 stages via drag-and-drop or manual update
3. Activities logged at each stage (calls, emails, meetings)
4. Proposals and statements attached to deals
5. E-signature documents sent at closing stages
6. Won deals become "Active Merchant"
7. Lost deals track loss reasons for analytics

### Gamification XP Awards
- Create a drop: 10 XP
- Complete a deal stage: 15 XP
- Win a deal: 50 XP
- Complete a training lesson: 10 XP
- Pass a quiz: 15 XP
- Complete a roleplay session: 20 XP
- Daily Edge streak: 5 XP per day
- Referral converted: 25 XP

### Organization Invitation Flow
1. Admin creates invitation with email and role
2. System sends email via Resend with invite link
3. New user clicks link, authenticates via Replit Auth
4. Completes profile, joins organization
5. Permissions set based on role defaults

---

This prompt covers the complete PCBancard Sales Intelligence Suite. The app should be built incrementally, starting with authentication and core CRM (drops + merchants), then adding pipeline management, AI tools, training/gamification, and administrative features. All seeded data should be loaded on first run.
