# PCBancard Sales Intelligence Suite

## Overview
The PCBancard Sales Intelligence Suite is a mobile-first Progressive Web App (PWA) designed to empower PCBancard field sales representatives. It focuses on enhancing sales efficiency and tracking physical marketing assets (video brochures) by capturing deployment data, scheduling follow-ups, and providing a comprehensive CRM with a 14-stage sales pipeline. The suite integrates advanced AI-driven tools for prospecting, sales training, proposal generation, statement analysis, and internal communication, aiming to significantly boost sales productivity, market penetration, and overall business intelligence. A separate, isolated subsystem named "PCB Auto" is also part of this project, providing an auto repair shop management solution with its own authentication and database, focusing on repair order lifecycle, customer management, and payroll integration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### PCBancard Sales Intelligence Suite
- **Frontend**: React with TypeScript (Vite), mobile-first UI/UX using shadcn/ui (Radix UI primitives), Tailwind CSS (Material Design 3-inspired), and Wouter for routing.
- **Backend**: Express.js with TypeScript, RESTful JSON API.
- **Authentication**: Replit Auth (OpenID Connect, Passport.js) for the main suite.
- **Database**: PostgreSQL with Drizzle ORM.
- **File Uploads**: Presigned URL flow using Google Cloud Storage with Uppy.
- **Key Features**:
    - **Brochure Management**: Tracking deployments, location logging, business info, voice notes, and pickup scheduling.
    - **CRM & Deal Pipeline**: 14-stage pipeline with Kanban/list views, deal detail sheets, follow-up tracking, and manager analytics.
    - **User & Team Management**: Multi-tenancy, three-tier RBAC (`master_admin`, `relationship_manager`, `agent`), user impersonation.
    - **AI-Powered Sales Tools**: Includes voice note analysis, AI role-play coach, daily motivation, meeting analysis, email drafting, marketing materials generation, equipment recommendation (EquipIQ), presentation training, interactive AI training (roleplay, objection gauntlet, scenario trainer, delivery analyzer with voice I/O), proposal generation (PDF/Word, with AI merchant data parsing), one-page proposal generation (7 templates, AI-Custom option), statement analysis (AI vision for savings), AI-powered prospecting, AI Help Chatbot, and an AI-powered Email Digest System.
    - **Sales Videos Training Module**: Integrated Vimeo training videos with progress tracking and badge awards.
    - **Gamification System**: Comprehensive training gamification with dual badge structures, weighted Skill Score, XP progression (10 levels), 5-level career ladder, streak bonuses, leaderboards, and PDF certificates.
    - **Feedback & Issue Tracking**: In-app form with file uploads and admin management.
    - **Offline Capabilities**: PWA with service worker and IndexedDB.

### PCB Auto — Auto Repair Shop Management Subsystem
- **Architecture**: Completely isolated from the main PCBancard Sales Suite.
- **Authentication**: Separate email/password authentication using bcrypt+JWT.
- **Database**: Separate set of `auto_` prefixed PostgreSQL tables (24 tables) using integer IDs.
- **Frontend**: Dedicated pages under `/auto/`.
- **Core Functionality**: Manages repair order lifecycle, customer and vehicle records, Digital Vehicle Inspections (DVI), appointments, payments, and integrations for multi-tenant auto repair shops.
- **Key Design Decisions**: No storage of sensitive employee financial data, use of idempotency keys for payroll, encrypted storage of third-party API keys.
- **PDF Generation**: Server-side PDF via pdfkit (`server/auto-pdf.ts`) for estimates, work orders, invoices.
- **Test Credentials**: owner@demo.com / password123 for "Demo Auto Shop".
- **Key Files**: `server/auto-routes.ts` (API), `server/auto-auth.ts` (auth), `server/auto-pdf.ts` (PDFs), `client/src/pages/auto/` (frontend pages), `client/src/hooks/use-auto-auth.ts` (auth hook).
- **Phase 1 Complete**: Dual pricing engine (split tax rates, is_adjustable/is_ntnf per line), public customer approval page (/auto/approve/:token), PDF generation, split payment recording with balance tracking, tax configuration (parts/labor rates, labor taxable toggle), reports (Job P&L, Sales Tax, Tech Productivity, Approval Conversion).

## External Dependencies

### Database
- PostgreSQL

### Authentication
- Replit Auth (for main suite)

### Cloud Storage
- Google Cloud Storage

### AI/ML
- xAI Grok-4 (for Prospect Finder)
- Claude AI (Anthropic) (proposal generation, compliance, chatbot, fallback)
- Gemini AI (transcription, summarization, lead scoring, role-play feedback)
- OpenAI (fallback for various AI operations)
- ElevenLabs TTS (AI voice responses)

### Client Libraries
- html5-qrcode (QR code scanning)
- Uppy (file upload management)

### PCB Auto Integrations (Planned/Implemented)
- Rollfi (embedded payroll)
- PartsTech (parts lookup)
- FluidPay (payment processing)
- QuickBooks (accounting sync)
- Twilio (SMS notifications)
- MOTOR (labor guide)