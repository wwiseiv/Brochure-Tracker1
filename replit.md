# BrochureTracker

## Overview
BrochureTracker is a mobile-first Progressive Web App (PWA) for PCBancard field sales representatives. Its core function is to track video brochure deployments by capturing essential data like brochure ID (via QR code), GPS location, business details, AI-transcribed voice notes, and scheduling follow-up reminders. This enhances sales efficiency by ensuring timely pickup conversations and comprehensive tracking of physical marketing assets. The project aims to empower sales teams with advanced AI tools for prospecting, training, proposal generation, and statement analysis, ultimately driving sales productivity and market penetration.

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
- **Authentication**: Replit Auth (OpenID Connect, Passport.js)
- **File Uploads**: Presigned URL flow using Google Cloud Storage with Uppy

### Database
- **ORM**: Drizzle ORM with PostgreSQL
- **Schema**: `shared/schema.ts`
- **Migrations**: Drizzle Kit

### Key Features
- **Brochure Tracking**: Individual brochure tracking with status and chain of custody.
- **Drop Management**: Log deployments with location, business info, voice notes, and pickup scheduling.
- **Reminder System**: Follow-up notifications.
- **Multi-tenancy & User Roles**: Organizations for team reporting; `master_admin`, `relationship_manager`, `agent` roles with RBAC.
- **Merchant Profiles**: Comprehensive dossiers with visit history, lead scores, and conversion tracking.
- **Inventory Management**: Track agent inventory, low-stock alerts, and transfer history.
- **Referral Tracking**: Log and manage merchant referrals.
- **Team Activity Feed**: Real-time activity timeline.
- **Deal Pipeline/CRM System**: Full 14-stage sales pipeline with comprehensive deal management:
    - **14 Pipeline Stages**: prospect → cold_call → appointment_set → presentation_made → proposal_sent → statement_analysis → negotiating → follow_up → documents_sent → documents_signed → sold → dead → installation_scheduled → active_merchant
    - **Phase Grouping**: Prospecting, Active Selling, Closing, Post-Sale phases with visual grouping
    - **Deal Cards**: Temperature badges (Hot/Warm/Cold), estimated commission, follow-up indicators
    - **Kanban & List Views**: Toggle between board and list views
    - **Deal Detail Sheet**: Business info, contacts, deal info, activity timeline, attachments, follow-up tracker with voice notes
    - **Follow-up Tracking**: Track 1-5 follow-up attempts with outcomes and scheduling
    - **Today View**: Daily action center showing follow-ups due, appointments, stale deals, quarterly check-ins
    - **Manager Views**: Team pipeline view and analytics dashboard (for master_admin and relationship_manager roles)
    - **Pipeline Analytics**: Win rates, conversion by stage, average time in stage, top performers
    - **AI Tool Integration**: Link Statement Analyzer and Proposal Generator outputs to deals
    - **E-Sign Sync**: SignNow status automatically syncs with deal stages
    - **Convert Flows**: Prospect Finder → Deal conversion, Deal → Active Merchant conversion
    - **Quarterly Check-ins**: Scheduled check-ins for active merchants with reminders
- **AI-Powered Features**:
    - **Voice Note Summaries & Lead Scoring**: AI-generated summaries and lead quality scores.
    - **AI Role-Play Coach**: Conversational AI for sales training with voice I/O, performance feedback, and email reporting, supporting various difficulty levels and personas. Integrates with Google Drive for custom training materials.
    - **Daily Edge Motivation System**: Mindset training based on "The Salesperson's Secret Code" with daily content, streak tracking, belief progress, and interactive AI chat.
    - **Meeting Recording & Analysis**: Record, transcribe, and analyze sales conversations for summaries and sentiment.
    - **AI Email Drafter**: AI-powered email composition.
    - **EquipIQ**: AI-powered equipment recommendation system with conversational advisor and product catalog.
    - **Presentation Training ("Teach Me the Presentation")**: Interactive 8-module training for the PCBancard Dual Pricing presentation, including persuasion psychology, objection handling, and closing strategies.
    - **Proposal Generator**: Generate professional branded proposals (PDF/Word) by parsing merchant data from statements, selecting equipment, and using Claude AI for content generation. Features background processing queue for PDF parsing with job status tracking, allowing users to navigate away and return later. Push notifications alert users when parsing is complete.
    - **Statement Analyzer**: Analyze merchant processing statements to identify savings, extract data using AI vision, calculate true interchange costs, detect red flags, and generate sales scripts. Features multi-file upload, few-shot learning for extraction, a fee dictionary, and PII redaction.
    - **AI-Powered Prospecting**: Discover and manage local business prospects using xAI Grok-4 Responses API with web_search tool for real-time business discovery, MCC code filtering, and a pipeline system with claim functionality. Prospect detail Sheet includes voice dictation for notes, scrollable layout optimized for iOS Safari, and a prominent "Convert to Merchant" CTA showing available features (E-Sign, Meeting Recording, Proposals).
        - **Background Processing**: Searches run asynchronously so users can navigate away. The system uses:
            - `prospectSearches` table with status tracking (pending/processing/completed/failed), results storage (JSONB), and error handling
            - Internal processing endpoint with X-Internal-Secret header for fire-and-forget execution
            - Frontend polling (5 second intervals) when pending jobs exist
            - "My Searches" UI section with job list, status badges, view/retry functionality
        - **Push Notifications**: Web Push notifications notify users when searches complete. Uses:
            - VAPID keys for authentication (stored in environment variables)
            - `pushSubscriptions` table for subscriber management
            - Service worker with action buttons ("View Results", "Dismiss")
    - **AI Help Chatbot**: Floating Claude AI assistant for app feature inquiries.
    - **AI-Powered Marketing Materials**: Industry-specific professional flyer templates for sales reps to share with prospects. Features:
        - Template gallery with 12 industry-specific dual pricing flyers (Liquor Stores, Restaurants & Bars, Pizzerias, Food Trucks, Automotive, Veterinarians, Salons & Spas, Rock & Gravel, B2B Level 2&3, HotSauce POS, Merchant Cash Advance, General)
        - Industry filtering and search functionality
        - Rep contact info auto-fill from profile
        - One-click download for flyers
        - Email body copy generator for easy sharing
        - Mobile-first responsive design
    - **Email Digest System**: AI-powered daily/weekly email summaries with:
        - **Timezone-Aware Scheduling**: Cron job runs every 15 minutes, respects user's timezone and preferred send time
        - **Customizable Content**: Toggle appointments, follow-ups, stale deals, pipeline summary, recent wins, AI tips, quarterly check-ins, referrals
        - **Claude AI Generation**: Personalized, motivating email content using Claude claude-sonnet-4-20250514
        - **Resend Integration**: Professional HTML emails with PCBancard branding
        - **Settings UI**: Configure preferences in Profile page with test email functionality
        - **History Tracking**: Full log of sent digests with status and content metrics
- **Offline Mode**: Enhanced offline capabilities with IndexedDB for drops and recordings, syncing when online.
- **Data Export**: Export drops, merchants, and referrals to CSV/Excel.
- **Admin & RM Dashboards**: Org-wide stats and member management.
- **Comprehensive RBAC Permission System**: Feature-level access control with three-tier architecture:
    - **Roles**: `admin` (full access), `manager` (team oversight), `agent` (sales rep)
    - **Agent Stages**: `trainee` (limited features), `active` (standard features), `senior` (advanced features)
    - **Feature Registry**: 30+ features organized by categories (core_crm, sales_training, ai_tools, analytics, team_management) in `shared/permissions.ts`
    - **Permission Resolution**: Admin role → Critical features → Explicit overrides → Agent stage defaults → Role defaults → Deny by default
    - **Feature Overrides**: Individual user feature toggles for granular access control
    - **Organization Features**: Org-level feature disables
    - **Audit Logging**: Full change history for compliance
    - **React Integration**: PermissionContext with hooks (`usePermissions`, `useFeatureAccess`, `useRole`, `useStage`) and guard components (`RequireFeature`, `RequireRole`, `RequireStage`)
- **User Impersonation System**: Secure session-based impersonation for admin/manager oversight:
    - **Session Management**: UUID token-based sessions with 4-hour expiration and automatic cleanup
    - **Hierarchical Permissions**: Admins can impersonate non-admin users; managers can only impersonate their assigned agents
    - **Audit Logging**: Comprehensive logs with sessionId, originalUserId, impersonatedUserId, reason, IP address, user agent, and timestamps
    - **UI Integration**: ImpersonationBanner component shows when impersonating with one-click "End Session"; Eye icon button in Team Management page
    - **React Integration**: ImpersonationContext with hooks (`useImpersonation`) providing startImpersonation, endImpersonation, and session state
    - **API Endpoints**: `/api/impersonation/start`, `/end`, `/validate`, `/available-users`, `/sessions` (admin-only), `/audit-log` (admin-only)
    - **Permission-aware Navigation**: Bottom nav and hamburger menu filter items based on user's effective permissions
- **Data Isolation**: Role-based data access.
- **My Work History**: Centralized view of user's proposals and statement analyses.
- **Team Leaderboard**: Optional leaderboard for top agents.
- **Access Control**: Proper "Access Denied" pages.
- **PWA Features**: Service worker for offline support.
- **UI/UX**: Bottom navigation, improved back navigation, searchable help page.
- **Dictation Support**: DictationInput component provides voice-to-text for major text inputs in Email Drafter, Proposal Generator, and New Drop pages.
- **TTS Playback**: ListenButton component enables ElevenLabs text-to-speech for AI-generated content in Email Drafter, Statement Analyzer, EquipIQ, and Presentation Training.
- **QA Tooling**: QA_CHECKLIST.md provides 30-minute verification workflow for production readiness.

### Proposal Intelligence Service
A modular, plugin-based AI platform for generating merchant proposals.
- **Core Engine**: Orchestrates proposal generation workflow (validate → enrich → reason → compile), manages plugins, routes AI models, and provides core type definitions.
- **Plugins**: Encapsulate specific capabilities like field validation, web scraping for merchant enrichment, and AI-powered proposal content generation.
- **API Endpoints**: `/api/proposal-intelligence/generate` for proposal generation, `/status` for platform status, `/plugins/:id/toggle` for plugin management, and `/test-model` for AI model connectivity.
- **Design Principles**: Feature isolation, model independence, and governance with full audit logging.

## External Dependencies

### Database
- **PostgreSQL**: Primary database.

### Authentication
- **Replit Auth**: OpenID Connect provider.

### Cloud Storage
- **Google Cloud Storage**: For file uploads.

### AI/ML
- **xAI Grok-4**: Primary AI provider for Prospect Finder using Responses API with web_search tool for real-time business discovery.
- **Claude AI (Anthropic)**: Primary for proposal generation, compliance analysis, AI Help Chatbot, and fallback for Prospect Finder (model: claude-sonnet-4-5).
- **Gemini AI**: For transcription, summarization, lead scoring, and role-play feedback.
- **OpenAI**: Fallback provider for AI operations.
- **ElevenLabs TTS**: For AI voice responses in role-play.

### Client Libraries
- **html5-qrcode**: QR code scanning.
- **date-fns**: Date manipulation.
- **Uppy**: File upload management.

### UI Dependencies
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon library.
- **class-variance-authority**: Component variant management.