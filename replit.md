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
- **AI-Powered Features**:
    - **Voice Note Summaries & Lead Scoring**: AI-generated summaries and lead quality scores.
    - **AI Role-Play Coach**: Conversational AI for sales training with voice I/O, performance feedback, and email reporting, supporting various difficulty levels and personas. Integrates with Google Drive for custom training materials.
    - **Daily Edge Motivation System**: Mindset training based on "The Salesperson's Secret Code" with daily content, streak tracking, belief progress, and interactive AI chat.
    - **Meeting Recording & Analysis**: Record, transcribe, and analyze sales conversations for summaries and sentiment.
    - **AI Email Drafter**: AI-powered email composition.
    - **EquipIQ**: AI-powered equipment recommendation system with conversational advisor and product catalog.
    - **Presentation Training ("Teach Me the Presentation")**: Interactive 8-module training for the PCBancard Dual Pricing presentation, including persuasion psychology, objection handling, and closing strategies.
    - **Proposal Generator**: Generate professional branded proposals (PDF/Word) by parsing merchant data from statements, selecting equipment, and using Claude AI for content generation.
    - **Statement Analyzer**: Analyze merchant processing statements to identify savings, extract data using AI vision, calculate true interchange costs, detect red flags, and generate sales scripts. Features multi-file upload, few-shot learning for extraction, a fee dictionary, and PII redaction.
    - **AI-Powered Prospecting**: Discover and manage local business prospects using AI web search, MCC code filtering, and a pipeline system with claim functionality.
    - **AI Help Chatbot**: Floating Claude AI assistant for app feature inquiries.
- **Offline Mode**: Enhanced offline capabilities with IndexedDB for drops and recordings, syncing when online.
- **Data Export**: Export drops, merchants, and referrals to CSV/Excel.
- **Admin & RM Dashboards**: Org-wide stats and member management.
- **Individual User Permissions**: Per-user feature toggles.
- **Data Isolation**: Role-based data access.
- **My Work History**: Centralized view of user's proposals and statement analyses.
- **Team Leaderboard**: Optional leaderboard for top agents.
- **Access Control**: Proper "Access Denied" pages.
- **PWA Features**: Service worker for offline support.
- **UI/UX**: Bottom navigation, improved back navigation, searchable help page.

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
- **Gemini AI**: For transcription, summarization, lead scoring, and role-play feedback.
- **Claude AI (Anthropic)**: For high-quality proposal generation, compliance analysis, and AI Help Chatbot.
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