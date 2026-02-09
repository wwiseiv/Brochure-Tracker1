# PCBancard Sales Intelligence Suite

## Overview
The PCBancard Sales Intelligence Suite is a mobile-first Progressive Web App (PWA) designed to enhance sales efficiency for PCBancard field sales representatives. It focuses on tracking physical marketing assets, managing a 14-stage sales pipeline, and providing a comprehensive CRM. The suite integrates advanced AI for prospecting, sales training, proposal generation, statement analysis, and internal communication, aiming to boost sales productivity and market penetration. Additionally, the project includes "PCB Auto," an isolated subsystem for auto repair shop management, covering repair order lifecycles, customer management, and payroll integration.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### PCBancard Sales Intelligence Suite
- **Frontend**: React with TypeScript, mobile-first UI/UX (shadcn/ui, Tailwind CSS), Wouter for routing.
- **Backend**: Express.js with TypeScript, RESTful JSON API.
- **Authentication**: Replit Auth (OpenID Connect, Passport.js).
- **Database**: PostgreSQL with Drizzle ORM.
- **File Uploads**: Presigned URL flow using Google Cloud Storage.
- **Key Features**:
    - **Brochure Management**: Tracking deployments, location logging, business info, voice notes, and pickup scheduling.
    - **CRM & Deal Pipeline**: 14-stage pipeline with Kanban/list views, deal sheets, follow-up tracking.
    - **User & Team Management**: Multi-tenancy, three-tier RBAC, user impersonation.
    - **AI-Powered Sales Tools**: Includes voice note analysis, AI role-play coach, daily motivation, meeting analysis, email drafting, marketing materials generation, equipment recommendation (EquipIQ), presentation training, interactive AI training (roleplay, objection gauntlet, scenario trainer, delivery analyzer with voice I/O), proposal generation (PDF/Word, with AI merchant data parsing), one-page proposal generation (7 templates, AI-Custom option), statement analysis (AI vision for savings), AI-powered prospecting, AI Help Chatbot, and an AI-powered Email Digest System.
    - **Sales Videos Training Module**: Integrated Vimeo training videos with progress tracking.
    - **Gamification System**: Comprehensive training gamification with dual badge structures, weighted Skill Score, XP progression, career ladder, streak bonuses, leaderboards, and PDF certificates.
    - **Feedback & Issue Tracking**: In-app form with file uploads.
    - **Offline Capabilities**: PWA with service worker and IndexedDB.

### PCB Auto — Auto Repair Shop Management Subsystem
- **Architecture**: Isolated subsystem with separate authentication and database.
- **Authentication**: Email/password authentication (bcrypt+JWT).
- **Database**: Separate `auto_` prefixed PostgreSQL tables.
- **Frontend**: Dedicated pages under `/auto/` with a three-breakpoint responsive design.
- **Core Functionality**: Manages repair order lifecycle, customer/vehicle records, Digital Vehicle Inspections (DVI), appointments, payments, and payroll integration.
- **Key Design Decisions**: No storage of sensitive employee financial data, idempotency keys for payroll, encrypted storage of third-party API keys, server-side PDF generation.
- **Key Features**:
    - **Repair Order Management**: Dual pricing engine, public customer approval page, split payment recording, tax configuration.
    - **Canned Services**: Pre-configured service packages with CRUD functionality.
    - **Shop Logo Feature**: Upload and dynamic display on documents.
    - **Schedule Page**: Two-panel layout with mini calendar and bay-based time grid.
    - **Staff Management**: Edit dialog for staff details, roles, and pay.
    - **Customer Communication**: One-tap call/text/email buttons, pre-filled templates, communication log.
    - **DVI Enhancement**: Public inspection reports, DVI PDF generation, "Send to Customer" functionality.
    - **Invoice & Payment System**: Dual pricing payment flow with professional invoice view, tip selection, and printable receipt.
    - **Email Integration**: Backend email service (Resend) for invoices/receipts with PDF attachments.
    - **Help Menu**: In-app help sections.
    - **AI Assistant**: Floating, context-aware chat assistant (Anthropic Claude, ElevenLabs TTS) with voice dictation. Provider lives at AuthenticatedAutoRoutes level in AutoApp.tsx (not in AutoLayout) so chat state persists across page navigations. Messages backed by localStorage.
    - **Parts Lookup & Labor Guide**: Simulated integrations (PartsTech, MOTOR) for adding line items.
    - **QuickBooks Integration**: Simulated integration page for investor demo.
    - **Dual Pricing Compliance**: Full compliance across all customer-facing screens, avoiding "surcharge" terminology.

## External Dependencies

### Database
- PostgreSQL

### Authentication
- Replit Auth (for main suite)

### Cloud Storage
- Google Cloud Storage

### AI/ML
- xAI Grok-4
- Claude AI (Anthropic)
- Gemini AI
- OpenAI
- ElevenLabs TTS

### Client Libraries
- html5-qrcode
- Uppy

### PCB Auto Integrations
- Rollfi (embedded payroll)
- PartsTech (parts lookup)
- FluidPay (payment processing)
- QuickBooks (accounting sync)
- Twilio (SMS notifications)
- MOTOR (labor guide)
- Resend (email service)