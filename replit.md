# PCBancard Sales Intelligence Suite

## Overview
The PCBancard Sales Intelligence Suite is a mobile-first Progressive Web App (PWA) designed to enhance sales efficiency for PCBancard field sales representatives. It focuses on tracking physical marketing assets, managing a 14-stage sales pipeline, and providing a comprehensive CRM. The suite integrates advanced AI for prospecting, sales training, proposal generation, statement analysis, and internal communication, aiming to boost sales productivity and market penetration.

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
    - **Trust-Based Scoring System**: Hidden trust scores (0-100) with mood indicators (Guarded/Warming/Engaged), two-pass AI evaluation, adaptive difficulty based on last 5 sessions, and deception toolkit (6 types: polite_lie, time_trap, honesty_test, red_herring, gatekeeper_test, competitor_bluff). Integrated into both Interactive Training and Coach Practice Role-Play. DB tables: trust_assessments, trust_session_summaries, agent_trust_profiles. Module: server/trust-engine.ts. 36 merchant personas (20 original + 16 vertical-based across medical, gas station, e-commerce, professional services, hotel, auto body, grocery, franchise).
    - **Sales Videos Training Module**: Integrated Vimeo training videos with progress tracking.
    - **Gamification System**: Comprehensive training gamification with dual badge structures, weighted Skill Score, XP progression, career ladder, streak bonuses, leaderboards, and PDF certificates.
    - **Feedback & Issue Tracking**: In-app form with file uploads.
    - **Offline Capabilities**: PWA with service worker and IndexedDB.

## External Dependencies

### Database
- PostgreSQL

### Authentication
- Replit Auth

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

### Email
- Resend (email service)

## Recent Changes (Feb 13, 2026)

### Comprehensive 9-Phase Audit Completed
- **Phase 1**: Full codebase inventory - 38 routes, 302 API endpoints, 10,512 files mapped
- **Phase 2-3**: Navigation audit - added 5 orphaned routes to BottomNav/AppLayout with feature permission gating (inventory, sequences, sales-process, scan-card, drops/new)
- **Phase 4**: ~60+ tooltip improvements across 9 key pages (dashboard, coach, interactive-training, proposal-generator, statement-analyzer, gamification, equipiq, esign, BottomNav)
- **Phase 5**: Help Center expanded with 7 new sections (Gamification, Trust Scoring, Email Digest, Meeting Recorder, Sales Videos, Impersonation) + 5 new FAQs + fixed persona count to 36
- **Phase 6**: AI Help Chatbot knowledge base expanded from ~186 to ~356 lines with 16 new knowledge sections covering all features
- **Phase 7**: Fixed 22 LSP TypeScript errors in routes.ts, added missing try/catch in background job processor
- **Known pre-existing issues**: 81 Drizzle ORM boolean default type inference errors in schema.ts, 9 insert overload type issues in storage.ts (don't affect runtime)