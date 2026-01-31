# BrochureTracker

## Overview
BrochureTracker is a mobile-first Progressive Web App (PWA) designed for PCBancard field sales representatives. Its primary purpose is to streamline the tracking of video brochure deployments. The app enables reps to capture essential deployment data, including brochure ID (via QR code), GPS location, business details, AI-transcribed voice notes, and schedule follow-up reminders. It then notifies reps for timely pickup conversations, enhancing sales efficiency and ensuring comprehensive tracking of physical marketing assets.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite)
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS (Material Design 3-inspired)
- **Forms**: React Hook Form with Zod validation
- **Mobile-first design**: 48px touch targets

### Backend
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API (`/api/*`)
- **Authentication**: Replit Auth (OpenID Connect, Passport.js, connect-pg-simple)
- **File Uploads**: Presigned URL flow using Google Cloud Storage with Uppy
- **AI Integration**: Gemini AI for voice transcription, summaries, lead scoring, and role-play feedback; ElevenLabs TTS for AI voice responses.

### Database
- **ORM**: Drizzle ORM with PostgreSQL
- **Schema**: `shared/schema.ts`
- **Migrations**: Drizzle Kit (`drizzle-kit push`)

### Key Features
- **Brochure Tracking**: Individual brochure tracking by QR code with status (available, deployed, returned, lost) and complete chain of custody history.
- **Drop Management**: Log deployments with location, business info, voice notes, and pickup scheduling.
- **Reminder System**: Follow-up notifications linked to drops.
- **Multi-tenancy**: Organizations for team reporting and management.
- **User Roles**: `master_admin`, `relationship_manager`, `agent` with RBAC.
- **Merchant Profiles**: Comprehensive dossiers with visit history, lead scores, and conversion tracking. Merchants automatically created as "prospects" from first drop.
- **Inventory Management**: Track agent inventory, low-stock alerts, and transfer history.
- **Referral Tracking**: Log and manage merchant referrals.
- **Team Activity Feed**: Real-time activity timeline.
- **AI-Powered Features**:
    - **Voice Note Summaries**: AI-generated summaries with key takeaways and sentiment.
    - **Lead Scoring**: AI-calculated lead quality scores (hot/warm/cold).
    - **AI Role-Play Coach**: Conversational AI for sales training (coaching/role-play modes) with voice input/output, performance feedback, and email reporting. Features difficulty levels (beginner/intermediate/advanced) and 7 detailed personas. Real-time coaching hints during roleplay.
    - **Google Drive Training Integration**: AI coaching pulls custom training materials from Google Drive folder (ID: 1_QYPCqf_VX31noF7II0aCTALvz8v0_a0). Supports recursive subfolder scanning and multiple file types (Google Docs, Sheets, Slides, PDFs, text files, CSV, JSON, Markdown).
    - **Daily Edge Motivation System**: Mindset training based on "The Salesperson's Secret Code" with 5 Destination Beliefs (Fulfilment, Control, Resilience, Influence, Communication). Features daily rotating content (quotes, insights, challenges, iconic stories, journey motivators), streak tracking, belief progress rings, and interactive AI chat. Users can tap "Discuss This with AI Coach" to have conversations about the day's content, get deeper insights, and learn how to apply the principles to real sales situations.
    - **Meeting Recording & Analysis**: Record sales conversations, upload to secure storage, transcribe and analyze audio with Gemini AI for summaries, key takeaways, and sentiment analysis. Recordings automatically emailed for sales coaching repository. Supports offline retry.
    - **AI Email Drafter**: AI-powered email composition.
    - **EquipIQ**: AI-powered equipment recommendation system with conversational advisor, searchable product catalog (6 vendors, 63+ products), and quiz-based training with difficulty levels (beginner/intermediate/advanced).
    - **Presentation Training ("Teach Me the Presentation")**: Interactive 8-module training system teaching the PCBancard Dual Pricing presentation. Features 25 lessons covering persuasion psychology (anchoring, loss aversion, social proof), story proof techniques, objection handling, and closing strategies. Includes voice dictation support, AI Q&A for lesson questions, practice scenarios, quizzes, and progress tracking. Accessible from Coach page via "Teach Me the Presentation" card.
    - **Proposal Generator**: Upload Dual Pricing or Interchange Plus pricing PDFs, parse merchant data (card volumes, rates, fees, savings), select equipment and software from the full EquipIQ catalog (63+ products across 6 vendors), and generate professional branded proposals in PDF or Word format. Features three renderer options: **Claude AI** (recommended - uses Claude to write professional proposal content with beautiful HTML/PDF/DOCX output), **Replit Native** (fast local PDF/DOCX generation), and **Gamma** (AI-designed presentations). Claude Document Generation Service (`server/services/claude-document-generator.ts`) creates executive summaries, current analysis, savings comparisons, equipment recommendations, and next steps with professional formatting. Document Converter (`server/services/document-converter.ts`) uses Puppeteer for PDF and docx library for Word output. Equipment selection supports multi-select with search filtering, category tabs (Hardware/Software), and vendor filtering. Accessible from Coach page via "Proposal Generator" card.
    - **Statement Analyzer**: Analyze merchant processing statements to identify savings opportunities and generate sales talking points. Features include: **multi-file upload support** (PDF, images, Excel/CSV) with **AI-powered data extraction** using Gemini vision, true interchange cost calculation using official card brand rate tables (Visa, Mastercard, Discover, American Express OptBlue), processor markup identification, red flag detection (high effective rates, PCI fees, equipment leases, hidden fees), competitor insights for major processors (Square, Stripe, Clover, Heartland, Worldpay, First Data/Fiserv), and AI-enhanced analysis with Claude for personalized recommendations. **Entry modes**: Upload Statement (AI extracts data from files) or Enter Manually (quick-fill examples available). Generates ready-to-use sales scripts including opening statements, discovery questions, dual pricing pitch, Interchange Plus pitch, objection handlers with expandable responses, value propositions, and closing statements. **Export options**: Copy for Email (plain text format for email/CRM), Export to Excel (.xlsx with multiple sheets: Analysis Summary, Issues Found, Sales Scripts), Save as PDF (print dialog), **Agent Word** (editable Word document with full analysis including issues, talking points, AI insights, and competitor intelligence), and **Merchant Word** (clean editable Word document for sharing with merchants). Accessible from Coach page via "Statement Analyzer" card.
    - **RAG Learning System**: Self-improving statement extraction that learns from past extractions to improve accuracy over time. Features include:
      - **Processor Identification**: Automatically identifies 18+ payment processors (CardConnect, First Data, Stripe, Square, etc.) using regex patterns with confidence scoring.
      - **Few-Shot Learning**: Retrieves similar past extractions (by processor, volume range, effective rate) and includes them in AI prompts as examples to improve accuracy.
      - **User Feedback Loop**: Users can mark extractions as "Looks Good" (positive verification) or "Report Issue" (submit corrections). Corrections are stored and used to improve future extractions.
      - **Fee Dictionary**: Database of 15+ common processing fees with categories, aliases, typical amounts, negotiability flags, and sales talking points.
      - **Privacy-First Design**: Merchant PII (names, addresses, emails, phone numbers, account numbers) is automatically redacted/anonymized before storage.
      - **Database Tables**: `statement_extractions` (stores anonymized extractions), `extraction_corrections` (user feedback), `fee_dictionary` (fee knowledge base).
      - **API Endpoints**: `/api/proposal-intelligence/learning/stats`, `/api/proposal-intelligence/learning/fee/:name`, `/api/proposal-intelligence/learning/extractions/:id/correct`, `/api/proposal-intelligence/learning/extractions/:id/verify`.
    - **AI-Powered Prospecting**: Discover and manage local business prospects using AI-powered web search.
      - **Prospect Finder**: Search for local businesses by ZIP code and business type. Uses Claude AI with web search capability to discover real, operating businesses. Features MCC code-based business type filtering with 100+ approved merchant categories organized by industry (Food & Dining, Retail, Services, Automotive, Healthcare, Entertainment, etc.). Configurable search radius (5-25 miles) and result count (10-100 businesses). Deduplication prevents showing businesses already in agent's pipeline.
      - **Prospect Pipeline**: Track prospects through discovery → contacted → qualified → proposal_sent → negotiating → won/lost stages. Features status tracking, notes, follow-up scheduling, and activity logging.
      - **Claim System**: Agent exclusivity - once a prospect is claimed, other agents cannot claim the same business.
      - **Merchant Conversion**: One-click conversion of qualified prospects to full merchant records.
      - **Database Tables**: `prospects` (business info, status, agent assignment), `prospect_activities` (activity log), `prospect_searches` (search history).
      - **API Endpoints**: `/api/prospects/mcc-codes`, `/api/prospects/search`, `/api/prospects/claim`, `/api/prospects`, `/api/prospects/pipeline`, `/api/prospects/:id`, `/api/prospects/:id/convert`.
      - **Data File**: `server/data/mcc-codes.json` contains all approved Level 1 and Level 2 MCC codes with search terms.
    - **AI Help Chatbot**: Floating chat assistant available on all pages. Uses Claude AI (Replit AI Integrations) to answer questions about any app feature. Features conversation history, quick question suggestions, and minimizable interface.
- **Offline Mode**: Enhanced offline capabilities with IndexedDB for drops and recordings, syncing when online.
- **Data Export**: Export drops, merchants, and referrals to CSV/Excel.
- **Admin & RM Dashboards**: Org-wide stats, team performance, member management.
- **Individual User Permissions**: Per-user feature toggles (leaderboard, coach, EquipIQ, export, etc.) manageable by admins in Team Management.
- **Data Isolation**: Role-based data access - agents see only their own data, managers see team data, admins see all organization data.
- **My Work History**: Centralized view at `/my-work` showing all user's proposals and statement analyses. Features tabbed filtering (All/Proposals/Analyses), search by merchant name, and ability to link work items to merchant records. Linked proposals/analyses appear on merchant detail pages in a dedicated "Proposals & Analyses" section.
- **Team Leaderboard**: Optional leaderboard showing top agents by drops/conversions. Controlled by individual permission (off by default).
- **Access Control**: Proper "Access Denied" pages for restricted routes instead of 404s.
- **PWA Features**: Service worker for offline support.
- **UI/UX**: Bottom navigation, improved back navigation, searchable help page.

## External Dependencies

### Database
- **PostgreSQL**: Primary database.

### Authentication
- **Replit Auth**: OpenID Connect provider.

### Cloud Storage
- **Google Cloud Storage**: For file uploads.

### AI/ML
- **Gemini AI**: For transcription, summarization, lead scoring, and role-play feedback.
- **Claude AI (Anthropic)**: For high-quality proposal generation and compliance analysis via Proposal Intelligence Service.
- **OpenAI**: Fallback provider for AI operations.
- **ElevenLabs TTS**: For AI voice responses in role-play.

### Proposal Intelligence Service (New Architecture)
The Proposal Intelligence Service is a modular, plugin-based AI platform for generating merchant proposals.

**Core Engine** (`server/proposal-intelligence/core/`):
- `orchestrator.ts`: Workflow orchestration (validate → enrich → reason → compile)
- `plugin-manager.ts`: Plugin registration, feature flags, stage execution
- `model-router.ts`: Multi-model AI routing (Claude, Gemini, OpenAI) with automatic fallback
- `types.ts`: Type definitions for ProposalContext, MerchantData, AuditEntry, etc.

**Plugins** (`server/proposal-intelligence/plugins/`):
- `field-validation.ts`: Data integrity validation with confidence scoring
- `web-scraper.ts`: Website scraping for merchant enrichment (description, services, logo)
- `proposal-generator.ts`: AI-powered proposal content generation

**API Endpoints** (`/api/proposal-intelligence/`):
- `POST /generate`: Generate a proposal (requires authentication)
- `GET /status`: Get platform status and available plugins
- `POST /plugins/:id/toggle`: Enable/disable plugins
- `POST /test-model`: Test AI model connectivity

**Design Principles**:
1. Feature Isolation: Every capability is a plugin
2. Model Independence: LLMs are "drivers," not dependencies
3. Governance First: Full audit logging with citations and attribution

### Client Libraries
- **html5-qrcode**: QR code scanning.
- **date-fns**: Date manipulation.
- **Uppy**: File upload management.

### UI Dependencies
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon library.
- **class-variance-authority**: Component variant management.