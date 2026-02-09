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
    - **AI Assistant**: Floating, context-aware chat assistant (Anthropic Claude, ElevenLabs TTS) with voice dictation. Provider lives at AuthenticatedAutoRoutes level in AutoApp.tsx (not in AutoLayout) so chat state persists across page navigations. Messages backed by localStorage. Navigation keywords in navMap.ts support dashboard cards, settings pages, and all core sections.
    - **Parts Lookup & Labor Guide**: Simulated integrations (PartsTech, MOTOR) for adding line items.
    - **QuickBooks Integration**: Simulated integration page for investor demo.
    - **Dual Pricing Compliance**: Full compliance across all customer-facing screens, avoiding "surcharge" terminology.
    - **Enhanced Dashboard**: Role-based visibility controls with 5 KPI stat cards (Revenue, Cars In Shop, ARO, Approval Rate, Fees Saved), Appointments & Availability widget with bay capacity tracking and staff on duty, Open ROs card with date range filtering, Quick Actions, and Shop Overview. Dashboard card visibility configurable per role (owner/manager/advisor/tech) via `/auto/settings/visibility`.
    - **Bay Configuration**: Per-bay sellable hours tracking for shop capacity management (`/auto/settings/bays`). Total sellable hours used in dashboard bay utilization metrics.
    - **Staff Availability & Time Off**: Weekly schedule management per staff member with day-of-week availability toggles and time ranges. Time off request management with approval status (`/auto/settings/availability`). Feeds into dashboard "Staff On Duty" widget.
    - **Dashboard Visibility Settings**: Role-based toggle grid controlling which dashboard cards are visible to each role (owner/manager/advisor/tech). Owner-only configuration (`/auto/settings/visibility`).
    - **Auto Clock-Out Scheduler**: Automatic clock-out of tech sessions that exceed 12 hours of active time. Runs every 15 minutes, marks expired sessions with autoClockOut flag, calculates final duration. Implemented in `server/auto-routes.ts` registerAutoRoutes function (Feb 9, 2026).
    - **Repair Orders V2 Overhaul** (Feb 2026):
        - **Estimates System**: Separate estimates from ROs with dedicated numbering (EST-10001+), dedicated tab view, and one-click convert-to-RO flow preserving all line items.
        - **Multi-Location Support**: Location CRUD, location-based RO numbering (locationNumber * 10000 + sequence), default location auto-creation. UI at `/auto/settings/locations`.
        - **Per-Line Pay Types**: Parts and labor pay type classification (customer_pay/internal/warranty) per line item for accurate revenue reporting.
        - **Line Origin Tracking**: Track whether lines are original, add-on, or inspection_finding for upsell metrics.
        - **Technician Time Tracking**: Clock-in/out per service line item, one active session per tech enforcement, session history with duration calculations.
        - **Tech Portal**: Dedicated page at `/auto/tech-portal` for technicians. Shows assigned in-progress ROs, line items, clock-in/out buttons, active timer, and session history. CRITICAL: No pricing information visible.
        - **Customer Authorization**: Per-line authorization (verbal/text/email/signature/in_person), batch line presentation, RO-level signature capture with IP logging.
        - **Declined Services & Campaigns**: Automatic recording of declined services on RO close, follow-up campaign settings (email/SMS), declined-to-RO conversion. Settings at `/auto/settings/campaigns`.
        - **RO Close Snapshots**: Immutable snapshot on RO close capturing all metrics (revenue by type, pay type breakdown, billed vs actual hours, tech summary, add-on approval rates) for reporting.
        - **Advanced Analytics**: Three-tab reports page at `/auto/reports-v2` with Monthly Summary (KPIs, revenue breakdown, pay type, add-on metrics), Advisor Performance (per-advisor ROs/revenue/approval rates), Tech Efficiency (sessions, hours, efficiency %). CSV export on all tabs.
        - **Dashboard Active Tech Sessions Widget**: Real-time display of clocked-in technicians with elapsed time.
        - **Employee Number**: Added to staff management for tech portal identification.
    - **RO V2 Enhancements** (Feb 2026 Phase 2):
        - **Tech Portal PIN Login**: Employee number + optional PIN authentication for shop floor tablets via `/api/auto/tech-portal/login`. Separate from main auth flow.
        - **Add-On Auto-Detection**: Lines added >5 minutes after RO creation auto-flagged as 'addon'. DVI-sourced lines flagged as 'inspection'.
        - **Service Line Editor V2**: Pay type dropdowns (Customer Pay/Internal/Warranty) per line for parts and labor. Conditional warranty vendor/claim number fields. Retail value override for internal/warranty tax records. Line origin badges (ADD-ON yellow, DVI blue). Authorization status badges with approve/decline actions. Internal & Warranty summary section.
        - **RO Close Validation**: Pre-close validation endpoint checks for active tech sessions, unsigned ROs, missing mileage, pending add-on lines. Confirmation dialog with warnings. Auto-declines pending add-ons on close.
        - **Quick RO Creation**: Streamlined dialog for rapid RO creation - customer search, vehicle auto-populate, mileage, common service selection. POST to `/api/auto/repair-orders/quick`.
        - **Add-On Metrics Dashboard Card**: Real-time today's add-on/upsell performance (presented, approved, declined, approval rate).
        - **Enhanced Campaign Settings**: Editable follow-up day intervals, channel selection (email/SMS/both), email and SMS template editors with merge field insertion ({customer_name}, {vehicle_year_make_model}, {service_description}, {shop_name}, {shop_phone}), SMS character counter.
        - **Declined Follow-Up Scheduler**: Runs every 4 hours, auto-sends follow-up emails via Resend to customers with declined services based on campaign settings and day intervals.
        - **Line Item Approval Handling**: Declining a line auto-creates declined service record. Approving a line auto-sets authorization timestamp and method.
    - **RO V2 Schema Tables**: autoLocations, autoRoSequences, autoEstimateSequences, autoTechSessions, autoDeclinedServices, autoCampaignSettings, autoRoCloseSnapshots (7 new tables, 37 total auto_ tables).
    - **RO V2 Key API Routes**: /estimates (CRUD + convert), /locations (CRUD), /tech-sessions (clock-in/out/active/history), /repair-orders/:id/authorize-line, /decline-line, /present-lines, /signature, /close, /close/validate, /declined-services, /declined-services/pending-followup, /campaign-settings, /reports/monthly-summary, /reports/advisor-performance, /reports/tech-efficiency, /repair-orders/quick, /tech-portal/login.

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
- Dough Gateway (payment processing - sandbox integration with tokenizer, dual pricing, vault, webhooks). Service files in `server/services/dough-gateway/`. Requires DOUGH_SANDBOX_API_KEY, DOUGH_SANDBOX_PUBLIC_KEY, DOUGH_SANDBOX_PROCESSOR_ID env vars.
- Rollfi (embedded payroll)
- PartsTech (parts lookup)
- FluidPay (payment processing - legacy)
- QuickBooks (accounting sync)
- Twilio (SMS notifications)
- MOTOR (labor guide)
- Resend (email service)