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
- **Database**: Separate set of `auto_` prefixed PostgreSQL tables (27 tables) using integer IDs.
- **Frontend**: Dedicated pages under `/auto/`.
- **Core Functionality**: Manages repair order lifecycle, customer and vehicle records, Digital Vehicle Inspections (DVI), appointments, payments, and integrations for multi-tenant auto repair shops.
- **Key Design Decisions**: No storage of sensitive employee financial data, use of idempotency keys for payroll, encrypted storage of third-party API keys.
- **PDF Generation**: Server-side PDF via pdfkit (`server/auto-pdf.ts`) for estimates, work orders, invoices.
- **Test Credentials**: owner@demo.com / password123 for "Demo Auto Shop".
- **Key Files**: `server/auto-routes.ts` (API), `server/auto-auth.ts` (auth), `server/auto-pdf.ts` (PDFs), `client/src/pages/auto/` (frontend pages), `client/src/hooks/use-auto-auth.ts` (auth hook).
- **Phase 1 Complete**: Dual pricing engine (split tax rates, is_adjustable/is_ntnf per line), public customer approval page (/auto/approve/:token), PDF generation, split payment recording with balance tracking, tax configuration (parts/labor rates, labor taxable toggle), reports (Job P&L, Sales Tax, Tech Productivity, Approval Conversion).
- **Phase 1.1 Complete (Feb 2026)**: Schema v1.1 upgrades (26 tables now), enhanced dual pricing engine with per-line discounts/approval/shop supply auto-calc/balance tracking, canned services (pre-configured service packages with CRUD + apply-to-RO), per-line customer approval workflow (public endpoints for selective line approval/decline), `recalculateROTotals()` reusable helper function.
  - New schema fields: `paidAmount`/`balanceDue`/`discountAmountCash`/`discountAmountCard`/`shopSupplyAmountCash`/`shopSupplyAmountCard` on repair orders; `discountPercent`/`discountAmountCash`/`discountAmountCard`/`approvalStatus`/`approvedAt`/`declinedAt`/`isShopSupply`/`warrantyMonths`/`warrantyMiles` on line items; `preferredContactMethod` on customers; `shopSupplyEnabled`/`shopSupplyRatePct`/`shopSupplyMaxAmount`/`shopSupplyTaxable` on shops.
  - New tables: `auto_canned_services`, `auto_canned_service_items`.
  - New API routes: GET/POST/PATCH/DELETE `/api/auto/canned-services`, POST `/api/auto/repair-orders/:roId/apply-canned-service/:serviceId`, GET `/api/auto/public/estimate/:token/lines`, POST `/api/auto/public/estimate/:token/line-approval`.
- **Shop Logo Feature**: Upload via POST `/api/auto/logo/upload` (multipart FormData), stored in object storage, displayed on Settings page with aspect-ratio preservation, embedded in PDF documents (estimates/invoices/work orders) with automatic format conversion via sharp. Logos are dynamically scaled to fit (max 120x60px on PDF) while preserving proportions.
- **Demo Data (Feb 2026)**: Comprehensive realistic demo data seeded on startup — 4 staff (3 techs + 1 service advisor), 8 customers, 9 vehicles, 10 ROs (3 paid, 7 active), 27 appointments across the week, DVI inspection, activity log. All linked to proper technicians, bays, and customers.
- **Schedule Page Redesign**: Two-panel layout with mini calendar sidebar (dots for days with appointments), technician availability panel, and list/grid view toggle. Default list view shows appointment cards; grid view shows bay-based time grid.
- **Staff Management Enhancement**: Edit dialog for staff members with phone, pay type/rate, PIN, and active toggle. Staff list shows role and pay type badges.
- **Customer Communication (Feb 2026)**: One-tap Call/Text/Email buttons across all customer touchpoints (customer list, customer detail, RO detail, schedule, dashboard). Pre-filled SMS and email templates for estimates, invoices, vehicle ready, appointment reminders, and follow-ups. Desktop SMS fallback with copy-to-clipboard modal. Communication log table (`auto_communication_log`) tracking all initiated communications with history display on customer detail page. "Contact Customer" dropdown on RO detail with context-specific actions (Text Estimate for Approval, Email Invoice, Copy Approval Link).
  - New table: `auto_communication_log` (27th table).
  - New API routes: POST `/api/auto/communication/log`, GET `/api/auto/communication/customer/:customerId`.
  - New files: `client/src/lib/auto-communication.ts` (templates, helpers), `client/src/components/auto/CopyMessageModal.tsx` (desktop SMS fallback).
- **DVI Enhancement (Feb 2026)**: 4 demo inspections with varied statuses (in_progress, sent, completed), enriched list API with vehicle/customer/technician/condition data, customer-facing public inspection report at `/auto/inspect/:token`, DVI PDF generation, and "Send to Customer" functionality.
  - New routes: GET `/api/auto/dvi/public/:token`, GET `/api/auto/dvi/public/:token/pdf`, POST `/api/auto/dvi/inspections/:id/send`.
  - New file: `client/src/pages/auto/AutoPublicInspection.tsx`.
- **Landing Page**: Full professional landing page at /auto/login with hero section, 10 feature cards with generated illustrations (Repair Orders, DVI, Scheduling, Customers, Communication, Payments, PDFs, Approvals, Reports, Staff), login form, and contact footer (hello@pcbancard.com, (888) 537-7332, 420 Boulevard Suite 206, Mountain Lakes, NJ 07046).
- **Responsive Design (Feb 2026)**: Three-breakpoint responsive system across all pages.
  - Phone (<640px): Fixed bottom tab bar (Home, ROs, Schedule, Cust, More), slim top bar (logo only), "More" bottom sheet menu (Inspections, Reports, Settings, Staff, Log Out). All form grids stack single-column. Tables remain scrollable. DesktopNudge banners on Schedule/Reports/RO builder pages.
  - Tablet (640-1024px): Compressed top nav with icon+short labels, no bottom tab bar.
  - Desktop (1024px+): Full top nav with icons and full text labels.
  - Customer phone/email are tappable tel:/mailto: links on mobile. Settings form grids responsive. Schedule has mobile date nav header + week strip.
- **Invoice & Payment System (Feb 2026)**: Full dual pricing payment flow at `/auto/invoice/:roId` with 5 screens: professional invoice view (dual cash/card pricing), surcharge settings, take payment (cash/card with tip selection), processing animation, and printable receipt. "Invoice / Pay" button on RO detail page for completed/invoiced/in_progress ROs.
  - New page: `client/src/pages/auto/AutoInvoice.tsx`.
  - Route: `/auto/invoice/:roId` (authenticated).
- **Resend Email Integration (Feb 2026)**: Backend email service sending invoice/receipt emails with jsPDF-generated PDF attachments via Resend. Professional HTML email templates with dual pricing display, line items, and payment confirmation.
  - New file: `server/auto-email.ts` (PDF generation + email sending).
  - New route: POST `/api/auto/email/invoice` (sends invoice or receipt email with PDF attachment).
  - Dependencies: `jspdf`, `jspdf-autotable`.
- **Help Menu (Feb 2026)**: Accessible from desktop user dropdown and mobile "More" sheet. Dialog with 6 categorized help sections: Invoice & Payments, Dual Pricing, Email, Customer Communication, Repair Orders, and Printing. Includes support contact info.
- **AI Assistant (Feb 2026)**: Floating chat assistant available on all PCB Auto pages. Context-aware responses powered by Anthropic Claude (via Replit AI Integrations). Features: page-specific quick action chips (11 page types), voice dictation via Web Speech API, text-to-speech via ElevenLabs, markdown-rendered responses, conversation persistence across navigation, in-memory session storage (max 20 messages, 24hr TTL).
  - New API routes: POST `/api/auto/assistant/chat` (authenticated, Anthropic Claude), POST `/api/auto/assistant/tts` (authenticated, ElevenLabs).
  - New files: `client/src/components/auto/AutoAssistantProvider.tsx` (context/state), `client/src/components/auto/AutoAssistantChat.tsx` (UI panel).
  - Dependencies: `react-markdown`.

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