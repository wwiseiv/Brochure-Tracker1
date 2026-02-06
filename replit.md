# BrochureTracker

## Overview
BrochureTracker is a mobile-first Progressive Web App (PWA) designed for PCBancard field sales representatives. Its primary purpose is to track video brochure deployments by capturing essential data such as brochure ID (via QR code), GPS location, business details, AI-transcribed voice notes, and scheduling follow-up reminders. This system aims to significantly enhance sales efficiency, ensure timely customer interactions, and provide comprehensive tracking of physical marketing assets. The project's vision is to empower sales teams with advanced AI-driven tools for prospecting, training, proposal generation, and statement analysis, thereby boosting sales productivity and market penetration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript (Vite)
- **UI/UX**: Mobile-first design with 48px touch targets, shadcn/ui (Radix UI primitives), Tailwind CSS (Material Design 3-inspired), Wouter for routing.

### Backend
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API
- **Authentication**: Replit Auth (OpenID Connect, Passport.js)
- **File Uploads**: Presigned URL flow using Google Cloud Storage with Uppy.

### Database
- **ORM**: Drizzle ORM with PostgreSQL.

### Key Features
- **Brochure Management**: Tracking of individual brochures, deployment logging with location, business info, voice notes, and pickup scheduling.
- **Reminder System**: Automated follow-up notifications.
- **CRM & Deal Pipeline**: Comprehensive 14-stage sales pipeline (Prospecting, Active Selling, Closing, Post-Sale phases) with Kanban/list views, deal detail sheets, follow-up tracking, and manager analytics. Integrates with AI tools and e-sign services.
- **User & Team Management**: Multi-tenancy, three-tier RBAC (`master_admin`, `relationship_manager`, `agent`), user impersonation, and team activity feeds.
    - **Admin Emails**: Admin users are configured in `server/rbac.ts` (ADMIN_EMAILS array). Users with these emails are automatically assigned `master_admin` role and full feature access. Current admins: `wwiseiv@icloud.com`, `emma@pcbancard.com`.
- **AI-Powered Sales Tools**:
    - **Voice Note Analysis**: AI-generated summaries and lead scoring from voice notes.
    - **AI Role-Play Coach**: Conversational AI for sales training with voice I/O, performance feedback based on advanced sales psychology (psychographic classification, emotional driver analysis, tonal pattern evaluation, NEPQ integration), and export functionality.
    - **Daily Edge Motivation System**: AI-powered mindset training.
    - **Meeting Analysis**: Recording, transcription, and analysis of sales conversations.
    - **AI Email Drafter & Marketing Materials**: AI-powered email composition and industry-specific flyer generation.
    - **EquipIQ**: AI-powered equipment recommendation system.
    - **Presentation Training**: Interactive modules for sales presentations (8 modules, 24 lessons, 80 quizzes).
    - **Interactive AI Training**: AI-powered sales training with 4 modes: Live Roleplay Simulator (20 merchant personas), Objection Gauntlet (12 rapid-fire objections), Scenario Trainer (situational decision-making), and Delivery Analyzer (AI-powered presentation analysis). All modes feature voice input (Web Speech API dictation) and ElevenLabs TTS playback. Feature-gated via team management permissions.
    - **Proposal Generator**: Generates professional proposals (PDF/Word) by parsing merchant data using AI, with background processing and push notifications.
    - **One-Page Proposal** (Proposal Generator 3rd tab): 7-template library for one-page PDF proposals/flyers. Two modes: Template-Fill (fast, deterministic) and AI-Custom (Claude AI tailored copy with optional website scraping). Supports document upload for savings extraction, EquipIQ integration, and auto-populated contact info. Templates: Exclusive Offer (Standard/QR), Referral Program (Client/Agent), Free Payroll, Business Grade Audit, Video Brochure Flyer. Files: `client/src/components/OnePageProposal.tsx`, `server/one-page-pdf-service.ts`, `server/one-page-ai-service.ts`, templates in `public/one-page-templates/`.
    - **Statement Analyzer**: Analyzes merchant processing statements using AI vision for savings identification, cost analysis, and script generation, with PII redaction.
    - **AI-Powered Prospecting**: Local business discovery using AI with web search, MCC code filtering, pipeline integration, background processing, and push notifications.
    - **AI Help Chatbot**: In-app Claude AI assistant.
    - **Email Digest System**: Personalized, AI-powered daily/weekly email summaries with customizable content and timezone-aware scheduling.
    - **Sales Videos Training Module**: 8 PCBancard Vimeo training videos (Hello, Grow, Next Steps, Trust, In-Store, Mobile, Online, Give Back) with individual ON/OFF permission toggles per video, embedded Vimeo players, watch progress tracking, share functionality (copy link, SMS, email), and automatic badge awards (First Video, Halfway There, Video Master, Speed Learner). Database: `video_watch_progress` table. Files: `client/src/pages/sales-videos-training.tsx`. Permission category: `sales_videos` with 8 feature IDs (`video_hello` through `video_give_back`).
    - **Agent Training Detail View**: Admin/RM page at `/admin/agent/:userId/training` showing comprehensive individual agent training progress across all modules: Sales Videos completion, Presentation Training modules/quizzes, AI Sales Coach sessions/scores, EquipIQ vendor quizzes, Daily Edge streaks, earned badges, and gamification stats. Accessible via GraduationCap icon button in Team Management. Files: `client/src/pages/agent-training-detail.tsx`. API: `GET /api/admin/agent/:userId/training-overview`.
- **Gamification System**: Comprehensive training gamification with dual badge structures, weighted Skill Score, 10-level XP progression (Rookie to Grand Master), and 5-level career ladder (Field Scout to Residual Architect). Daily XP cap 400/day, streak bonuses (25/100/250/500 XP at 3/7/14/30 days), leaderboard, and PDF certificates (9 types: 4 training + 5 ladder). Admin-controllable via 5 separate feature toggles.
    - **Database Tables**: `gamification_profiles` (incl. `skill_score`), `xp_ledger`, `badges_earned`, `certificates`, `gamification_daily_log`, `training_sessions`, `training_messages`, `gauntlet_responses`
    - **Engine**: `server/gamification-engine.ts` (XP awards with updated values, badge progression, Skill Score calculation with weighted components, 5-level progression ladder, streak bonuses, level calculation)
    - **Skill Score**: Weighted 0-100 composite: Roleplay 25%, Objection Handling 25%, Presentation Mastery 30%, Scenario Decision-Making 10%, Consistency 10%. Recalculated on every training session completion.
    - **Progression Ladder**: 5 levels requiring both XP and Skill Score thresholds. Badges immutable once earned, amber warning if Skill Score drops below requirement.
    - **XP Values**: Roleplay 60 base (+0-40 bonus), Gauntlet 15/objection (+50 perfect), Scenario 40 (+20 best), Delivery 80 (+20 all stages), Module 150, EquipIQ 50. Anti-gaming: roleplay requires 6+ turns or 3+ min.
    - **Training Knowledge Base**: `server/training-knowledge-context.ts` — compact PCBancard knowledge extraction (NEPQ framework, dual pricing, objection handling) injected into all AI training prompts.
    - **Session Persistence**: All 4 Interactive Training modes create/complete sessions in `training_sessions`. Roleplay saves messages to `training_messages`, gauntlet saves per-objection responses to `gauntlet_responses`. AI final evaluation on roleplay session end.
    - **Certificates**: `server/certificate-generator.ts` (PDF generation via pdf-lib, 9 certificate types: 4 training + 5 ladder with indigo styling, plus `generateVisualCertificatePDF` using programmatic visual assets)
    - **Visual Asset System**: `server/certificate-asset-generator.ts` — Programmatic SVG → PNG pipeline (@resvg/resvg-js) generating 18 assets: 4 tier medallions (Bronze/Silver/Gold/Platinum, 1024x1024), 8 training badges (512x512), 1 certificate border template (3300x2550), 2 seals (800x800), 3 stage icons (256x256). Output: `public/certificates/` with subdirs `medallions/`, `badges/`, `seals/`, `stages/`, `borders/`. Manifest: `public/certificates/certificate-assets.json`. Admin regeneration via `POST /api/admin/generate-certificate-assets`.
    - **Earned Items Database**: `earned_items` table tracks visual badge/tier/seal/stage awards per user (unique constraint on userId+assetId). `generated_certificates` table tracks PDF certificate records with verification codes, asset references, and status.
    - **Visual Certificate API**: `GET /api/certificates/earned`, `POST /api/certificates/award`, `POST /api/certificates/generate-visual`, `GET /api/certificates/verify/:code`, `GET /api/certificates/manifest`, `GET /api/certificates/generated/:id/download`
    - **Event Hooks**: XP automatically awarded on training session completion (all 4 modes), presentation lesson/quiz, EquipIQ quizzes, Daily Edge views/challenges, streak milestones
    - **API Routes**: `/api/gamification/profile`, `/api/gamification/leaderboard`, `/api/gamification/badges`, `/api/gamification/xp-history`, `/api/gamification/certificates/*`, `/api/gamification/admin/*`, `/api/gamification/skill-score`, `/api/gamification/progression-ladder`, `/api/training/sessions`, `/api/training/sessions/:id/complete`, `/api/training/sessions/:id/messages`, `/api/training/sessions/:id/gauntlet-response`, `/api/training/gauntlet/score`, `/api/training/scenario/feedback`
    - **Frontend**: `/gamification` dashboard (level ring, progression ladder, Skill Score breakdown, badge collection with Visual Badge Wall showing earned/locked states with grayscale+lock overlay, training history, leaderboard, certificates), profile page summary card, team management training column (XP, level, Skill Score, streak)
    - **Permission Keys**: `gamification_xp_tracking`, `gamification_badges`, `gamification_certificates`, `gamification_leaderboard`, `gamification_dashboard`
- **Feedback & Issue Tracking System**: Global floating feedback button (bottom-right FAB) with expandable Sheet form supporting type selection (Feature Suggestion, Bug Report, Help Request), subject, message, and multi-file drag-and-drop upload (images/PDFs up to 10MB each, max 5 files). Files upload immediately to object storage via `/api/uploads/proxy` (images) or `/api/uploads/documents` (PDFs). Admin dashboard at `/admin/feedback` with type/status filters, status management (New/In Progress/Resolved/Closed), attachment viewing, and admin notes. Database: `feedback_submissions` table with `attachments` jsonb array and `admin_notes`. Files: `client/src/components/FeedbackButton.tsx`, `client/src/pages/admin-feedback.tsx`. API: `POST /api/feedback`, `GET /api/admin/feedback`, `PATCH /api/admin/feedback/:id`.
- **Offline Capabilities**: PWA with service worker and IndexedDB for offline data sync.
- **Data Export**: CSV/Excel export for key data.
- **Accessibility**: Dictation support for inputs, TTS playback for AI content.

## External Dependencies

### Database
- **PostgreSQL**

### Authentication
- **Replit Auth**

### Cloud Storage
- **Google Cloud Storage**

### AI/ML
- **xAI Grok-4**: For Prospect Finder (using Responses API with `web_search` tool).
- **Claude AI (Anthropic)**: For proposal generation, compliance analysis, AI Help Chatbot, and as a fallback for Prospect Finder.
- **Gemini AI**: For transcription, summarization, lead scoring, and role-play feedback.
- **OpenAI**: Fallback provider for various AI operations.
- **ElevenLabs TTS**: For AI voice responses.

### Client Libraries
- **html5-qrcode**: QR code scanning.
- **Uppy**: File upload management.