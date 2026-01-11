# BrochureDrop

## Overview

BrochureDrop is a mobile-first Progressive Web App (PWA) for field sales representatives to track video brochure deployments. When reps leave physical video brochures at merchant locations, the app captures the brochure ID (via QR code scanning), GPS location, business details, voice notes with AI transcription, and scheduled follow-up reminders. The app then notifies reps when it's time to return for pickup conversations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built with Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for a Material Design 3-inspired mobile-first interface
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API under `/api/*` routes
- **Authentication**: Replit Auth integration with OpenID Connect, Passport.js, and session management via connect-pg-simple
- **File Uploads**: Presigned URL flow using Google Cloud Storage with Uppy on the client

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit with `drizzle-kit push` for schema synchronization

### Key Data Models
- **Brochures**: Track individual video brochures with status (available, deployed, returned, lost)
- **Drops**: Log each brochure deployment with location, business info, voice notes, and pickup scheduling (includes orgId for team reporting)
- **Reminders**: Follow-up notifications linked to drops
- **Organizations**: Company/team containers for multi-tenant support
- **OrganizationMembers**: User memberships with roles (master_admin, relationship_manager, agent) and optional managerId for hierarchy
- **UserPreferences**: Notification settings per user
- **Users/Sessions**: Authentication tables managed by Replit Auth integration
- **Merchants**: Business profiles with visit history, lead scores, and conversion tracking
- **AgentInventory**: Track brochures on hand, deployed counts, and low-stock thresholds per agent
- **InventoryLogs**: History of inventory changes (restock, deploy, return, adjustment)
- **Referrals**: Track merchant referrals with status (pending, contacted, converted, lost)
- **FollowUpSequences**: Multi-step automated follow-up campaigns
- **FollowUpSteps**: Individual steps in a sequence with delay, action type, and content
- **FollowUpExecutions**: Track sequence execution progress per drop
- **ActivityEvents**: Team activity feed (drops, conversions, referrals, restocks, milestones)
- **AiSummaries**: AI-generated summaries of voice notes with key takeaways and sentiment
- **LeadScores**: AI-calculated lead quality scores with tier (hot/warm/cold) and factors
- **OfflineQueue**: Queue for drops created offline, synced when back online

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: Vite builds client to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Scripts**: `npm run dev` for development, `npm run build` for production, `npm run db:push` for database migrations

## Recent Changes

### January 2026 (Advanced Features Release)
- **Pickup Days Selector**: Restricted to 1-5 days (default 3), simplified from previous 1-14 day range
- **Merchant Profiles** (/merchants): Complete merchant dossier system with visit history, notes, and lead tracking
- **Inventory Tracking** (/inventory): Track brochures on hand, restock functionality, and low-stock alerts
- **Referral Tracking** (/referrals): Log and track merchant referrals with status management (pending/contacted/converted/lost)
- **Team Activity Feed** (/activity): Real-time team activity timeline with event filtering and celebratory UI for wins
- **Route Optimizer** (/route): Optimized daily driving routes with Google Maps integration
- **Follow-up Sequences** (/sequences): Multi-step automated follow-up campaigns with customizable steps
- **AI Call Summaries**: Auto-generate summaries from voice notes with key takeaways, sentiment analysis, and hot lead detection
- **Lead Scoring**: AI-calculated lead quality scores (0-100) with hot/warm/cold tier classification
- **Smart Location Reminders**: Geofencing-based notifications when near pending pickup locations
- **Enhanced Offline Mode**: IndexedDB storage for offline drops with automatic sync when back online
- **Updated Help Page**: Comprehensive documentation for all new features

### January 2026 (Initial Release)
- Implemented complete frontend with mobile-first design (48px touch targets)
- Created QR scanner with html5-qrcode library
- Built Dashboard with Today's/Upcoming/Overdue pickup categorization  
- Implemented voice recording with MediaRecorder API
- Added OpenAI Whisper transcription endpoint (/api/transcribe)
- Created service worker for PWA offline support
- Enhanced backend validation with proper Zod enum schemas
- Verified with end-to-end tests: login, drops, outcomes, profile
- Implemented automatic demo data seeding (3 sample drops created on first login for testing without QR codes)
- Built complete management hierarchy: organizations and organization_members tables with role-based relationships, RBAC middleware for access control
- Created Admin Dashboard: org-wide stats, team performance metrics, member management with add/edit/delete functionality
- Added Relationship Manager Dashboard: view assigned agents, team drops overview, agent performance tracking
- Implemented agent edit functionality: agents can modify drop records (business info, notes, pickup dates) and manage notification preferences
- Fixed critical data issues: drops now properly associated with organizations via orgId for accurate team reporting
- Added AI Email Drafter (/email): AI-powered email composition with polish and generate modes using Replit AI Integrations (gpt-5 model)

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable

### Authentication
- **Replit Auth**: OpenID Connect provider at `https://replit.com/oidc`
- **Session Secret**: `SESSION_SECRET` environment variable required

### Cloud Storage
- **Google Cloud Storage**: File uploads via presigned URLs through Replit's sidecar endpoint at `http://127.0.0.1:1106`

### Client Libraries
- **html5-qrcode**: QR code scanning via device camera
- **date-fns**: Date manipulation and formatting
- **Uppy**: File upload management with AWS S3-compatible presigned URL support

### UI Dependencies
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **class-variance-authority**: Component variant management