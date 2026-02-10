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