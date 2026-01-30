# BrochureTracker

## Overview
BrochureTracker is a mobile-first Progressive Web App (PWA) designed for PCBancard field sales representatives. Its primary purpose is to streamline the tracking of video brochure deployments. The app enables reps to capture essential deployment data, including brochure ID (via QR code), GPS location, business details, AI-transcribed voice notes, and schedule follow-up reminders. It then notifies reps for timely pickup conversations, enhancing sales efficiency and ensuring comprehensive tracking of physical marketing assets.

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
- **Authentication**: Replit Auth (OpenID Connect, Passport.js, connect-pg-simple)
- **File Uploads**: Presigned URL flow using Google Cloud Storage with Uppy
- **AI Integration**: Gemini AI for voice transcription, summaries, lead scoring, and role-play feedback; ElevenLabs TTS for AI voice responses.

### Database
- **ORM**: Drizzle ORM with PostgreSQL
- **Schema**: `shared/schema.ts`
- **Migrations**: Drizzle Kit (`drizzle-kit push`)

### Key Features
- **Brochure Tracking**: Individual brochure tracking by QR code with status (available, deployed, returned, lost) and complete chain of custody history.
- **Drop Management**: Log deployments with location, business info, voice notes, and pickup scheduling.
- **Reminder System**: Follow-up notifications linked to drops.
- **Multi-tenancy**: Organizations for team reporting and management.
- **User Roles**: `master_admin`, `relationship_manager`, `agent` with RBAC.
- **Merchant Profiles**: Comprehensive dossiers with visit history, lead scores, and conversion tracking. Merchants automatically created as "prospects" from first drop.
- **Inventory Management**: Track agent inventory, low-stock alerts, and transfer history.
- **Referral Tracking**: Log and manage merchant referrals.
- **Team Activity Feed**: Real-time activity timeline.
- **AI-Powered Features**:
    - **Voice Note Summaries**: AI-generated summaries with key takeaways and sentiment.
    - **Lead Scoring**: AI-calculated lead quality scores (hot/warm/cold).
    - **AI Role-Play Coach**: Conversational AI for sales training (coaching/role-play modes) with voice input/output, performance feedback, and email reporting. Features difficulty levels (beginner/intermediate/advanced) and 7 detailed personas. Real-time coaching hints during roleplay.
    - **Google Drive Training Integration**: AI coaching pulls custom training materials from Google Drive folder (ID: 1_QYPCqf_VX31noF7II0aCTALvz8v0_a0). Supports recursive subfolder scanning and multiple file types (Google Docs, Sheets, Slides, PDFs, text files, CSV, JSON, Markdown).
    - **Daily Edge Motivation System**: Mindset training based on "The Salesperson's Secret Code" with 5 Destination Beliefs (Fulfilment, Control, Resilience, Influence, Communication). Features daily rotating content (quotes, insights, challenges, iconic stories, journey motivators), streak tracking, belief progress rings, and interactive AI chat. Users can tap "Discuss This with AI Coach" to have conversations about the day's content, get deeper insights, and learn how to apply the principles to real sales situations.
    - **Meeting Recording & Analysis**: Record sales conversations, upload to secure storage, transcribe and analyze audio with Gemini AI for summaries, key takeaways, and sentiment analysis. Recordings automatically emailed for sales coaching repository. Supports offline retry.
    - **AI Email Drafter**: AI-powered email composition.
    - **EquipIQ**: AI-powered equipment recommendation system with conversational advisor, searchable product catalog (6 vendors, 63+ products), and quiz-based training with difficulty levels (beginner/intermediate/advanced).
    - **Presentation Training ("Teach Me the Presentation")**: Interactive 8-module training system teaching the PCBancard Dual Pricing presentation. Features 25 lessons covering persuasion psychology (anchoring, loss aversion, social proof), story proof techniques, objection handling, and closing strategies. Includes voice dictation support, AI Q&A for lesson questions, practice scenarios, quizzes, and progress tracking. Accessible from Coach page via "Teach Me the Presentation" card.
    - **Proposal Generator**: Upload Dual Pricing or Interchange Plus pricing PDFs, parse merchant data (card volumes, rates, fees, savings), select equipment and software from the full EquipIQ catalog (63+ products across 6 vendors), and generate professional branded proposals in PDF format. Features one-page proposal template matching PCBancard field sales style with: personalized "Exclusive Offer for [Business Name]" header, breakdown of savings (Surcharge/Dual Pricing/Traditional programs), equipment recommendations with pricing, PCBancard value-add features list, agent contact info with photo, and QR code area. Equipment selection supports multi-select with search filtering, category tabs (Hardware/Software), and vendor filtering. Accessible from Coach page via "Proposal Generator" card.
- **Offline Mode**: Enhanced offline capabilities with IndexedDB for drops and recordings, syncing when online.
- **Data Export**: Export drops, merchants, and referrals to CSV/Excel.
- **Admin & RM Dashboards**: Org-wide stats, team performance, member management.
- **Individual User Permissions**: Per-user feature toggles (leaderboard, coach, EquipIQ, export, etc.) manageable by admins in Team Management.
- **Data Isolation**: Role-based data access - agents see only their own data, managers see team data, admins see all organization data.
- **Team Leaderboard**: Optional leaderboard showing top agents by drops/conversions. Controlled by individual permission (off by default).
- **Access Control**: Proper "Access Denied" pages for restricted routes instead of 404s.
- **PWA Features**: Service worker for offline support.
- **UI/UX**: Bottom navigation, improved back navigation, searchable help page.

## External Dependencies

### Database
- **PostgreSQL**: Primary database.

### Authentication
- **Replit Auth**: OpenID Connect provider.

### Cloud Storage
- **Google Cloud Storage**: For file uploads.

### AI/ML
- **Gemini AI**: For transcription, summarization, lead scoring, and role-play feedback.
- **ElevenLabs TTS**: For AI voice responses in role-play.

### Client Libraries
- **html5-qrcode**: QR code scanning.
- **date-fns**: Date manipulation.
- **Uppy**: File upload management.

### UI Dependencies
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon library.
- **class-variance-authority**: Component variant management.