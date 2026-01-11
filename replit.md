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
- **Invitations**: Email invitations for team onboarding with token validation, expiration, and status tracking
- **FeedbackSubmissions**: User feedback and feature requests stored with type (suggestion/help/bug)
- **RoleplaySessions**: AI role-play practice sessions tracking scenario, status, performance score, and AI feedback
- **RoleplayMessages**: Conversation history for role-play sessions (system prompts, user messages, AI responses)
- **BrochureLocations**: Track current custody of individual brochures by QR code (house, relationship_manager, agent)
- **BrochureLocationHistory**: Complete chain of custody history with transfer records (register, assign, return, deploy)

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: Vite builds client to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Scripts**: `npm run dev` for development, `npm run build` for production, `npm run db:push` for database migrations

## Recent Changes

### January 2026 (Advanced Features Release)
- **Data Export** (/history, /merchants, /referrals): Export your data to CSV or Excel (XLSX) format. Available on History page (drops/contacts), Merchants page (merchant profiles), and Referrals page (referral data). Download includes formatted dates, business info, contact details, and all relevant fields for each data type.
- **Standalone Sales Coach** (/coach): Full-page AI coaching experience accessible from bottom navigation bar. Two tabs: "New Session" for starting coaching/roleplay sessions, and "History" for reviewing past sessions. Session history shows date, mode, scenario, and score with expandable conversation transcripts. Users can delete individual sessions or clear all history. Includes voice input/output and performance feedback scoring.
- **Improved Back Navigation**: All pages now use browser history for back buttons instead of always going to home. When you press back, you return to wherever you came from (previous page), not always the dashboard.
- **Bottom Navigation with Coach**: 6-item navigation bar (Home, Scan, Coach, Merchants, History, Profile) optimized for mobile with proper touch targets and spacing.
- **Individual Brochure Tracking** (/inventory): Track each brochure by QR code with complete chain of custody. Three holder types: house inventory (unassigned), relationship manager, and agent. Features include: single/bulk registration, assignment dialogs for transferring brochures between team members, return to house functionality, and full transfer history. Integrated with drop creation - automatically updates custody when brochures are deployed.
- **QR Scan to Register** (/inventory): Scan brochure QR codes directly into inventory using phone camera. Supports continuous scanning mode for rapid entry. "Scan & Assign" feature lets you select a team member first, then scan to register and assign in one step.
- **CSV Import/Export** (/inventory): Bulk import brochure IDs from CSV files or export inventory to spreadsheets. Holder selection funnel allows choosing House, specific RM, or specific Agent for targeted import/export operations.
- **Help Page Search** (/help): Search function at top of help page for filtering help topics in real-time. No more scrolling through the whole page to find what you need.
- **AI Role-Play Coach** (also accessible from drop detail page): Conversational AI training tool with two modes: (1) **Coaching Mode** - ask questions and get advice on sales techniques, what to say, and how to handle objections; (2) **Role-Play Mode** - practice conversations with simulated business owners. Features voice input via microphone (Whisper transcription), auto-play AI voice responses (ElevenLabs TTS), 5 scenario types (cold approach, objection handling, closing, follow-up, general practice), and AI-generated performance feedback with scoring. Knowledge base includes NEPQ methodology, SignaPay scripts, and objection handling guides.
- **Email Invitations** (/admin/team): Admins can invite new team members by email with role selection (Agent, RM, Admin). Invitations expire in 7 days with resend/cancel options.
- **Accept Invite Page** (/accept-invite): Users click email links to join organizations, works for both new and existing users.
- **Feedback Form** (/help): Feature suggestion and help request form that sends emails to support. Form includes type selector (Feature Suggestion, Help Request, Bug Report).
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