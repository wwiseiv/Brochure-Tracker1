# PCBancard Field Sales Platform - Complete Feature Map

This document provides a detailed breakdown of every feature in the platform, organized by category. Use this as your reference for enhancing features stage by stage.

---

## Table of Contents

1. [Core CRM & Pipeline](#1-core-crm--pipeline)
2. [Brochure & Drop Management](#2-brochure--drop-management)
3. [AI-Powered Tools](#3-ai-powered-tools)
4. [Sales Training & Coaching](#4-sales-training--coaching)
5. [Document & E-Signature Management](#5-document--e-signature-management)
6. [Communication Tools](#6-communication-tools)
7. [Team & Organization Management](#7-team--organization-management)
8. [Analytics & Reporting](#8-analytics--reporting)
9. [Mobile & PWA Features](#9-mobile--pwa-features)
10. [System & Settings](#10-system--settings)

---

## 1. Core CRM & Pipeline

### 1.1 Deal Pipeline (14-Stage System)
**Location:** `/pipeline` | **File:** `prospect-pipeline.tsx`

**What it does:**
A full Kanban-style deal tracking system that moves prospects through 14 stages from initial contact to active merchant.

**Pipeline Stages:**
| Stage | Phase | Description |
|-------|-------|-------------|
| prospect | Prospecting | Initial lead, not yet contacted |
| cold_call | Prospecting | First outreach attempt made |
| appointment_set | Active Selling | Meeting scheduled with prospect |
| presentation_made | Active Selling | Sales presentation delivered |
| proposal_sent | Active Selling | Formal proposal sent to prospect |
| statement_analysis | Active Selling | Reviewing their current processing statement |
| negotiating | Closing | Discussing terms and pricing |
| follow_up | Closing | Awaiting response, following up |
| documents_sent | Closing | Application/contract sent for signature |
| documents_signed | Closing | All documents signed |
| sold | Post-Sale | Deal closed successfully |
| installation_scheduled | Post-Sale | Equipment installation scheduled |
| active_merchant | Post-Sale | Fully onboarded and processing |
| dead | - | Lost deal (archived) |

**Features:**
- Drag-and-drop cards between stages
- Temperature badges (Hot/Warm/Cold)
- Estimated commission display
- Follow-up indicators and due dates
- Toggle between Kanban and List views
- Filter by agent, temperature, stage
- Quick actions: call, email, edit, move stage

**Enhancement opportunities:**
- Add custom stages per organization
- Implement weighted pipeline value forecasting
- Add stage duration alerts
- Create automated stage transition rules

---

### 1.2 Merchant CRM
**Location:** `/merchants` | **File:** `merchants.tsx`, `merchant-detail.tsx`

**What it does:**
Comprehensive merchant profiles with complete history, contact info, and all interactions.

**Features:**
- Searchable merchant list with filters
- Detailed merchant profiles including:
  - Business information (name, type, address, phone)
  - Contact person details
  - Visit history (all drops at this location)
  - Meeting recordings
  - Voice notes
  - E-signature requests
  - Linked deals and proposals
  - Lead score (AI-generated)
  - Conversion tracking

**Merchant Data Fields:**
- Business name, type, phone, email
- Address and GPS coordinates
- Owner/contact name
- Website URL
- Notes and tags
- Lead score (0-100)
- Status (active, prospect, churned)

**Enhancement opportunities:**
- Add custom fields per organization
- Implement merchant segmentation
- Add merchant communication preferences
- Create merchant health scores

---

### 1.3 Today's Actions Dashboard
**Location:** `/today` | **File:** `today.tsx`

**What it does:**
A daily action center showing everything that needs attention today.

**Sections:**
- **Follow-ups Due:** Deals requiring follow-up today
- **Appointments:** Scheduled meetings for today
- **Stale Deals:** Deals with no activity for X days
- **Quarterly Check-ins:** Active merchants due for check-in
- **Overdue Items:** Past-due follow-ups and appointments

**Features:**
- Quick action buttons for each item
- One-click call/email
- Mark complete functionality
- Snooze/reschedule options

**Enhancement opportunities:**
- Add priority scoring
- Implement smart scheduling suggestions
- Add travel time estimates between appointments
- Create morning briefing notifications

---

### 1.4 Prospect Finder (AI-Powered)
**Location:** `/prospects/search` | **File:** `prospect-finder.tsx`

**What it does:**
Uses AI (Grok-4 with web search, Claude fallback) to discover local businesses in a target area.

**How it works:**
1. Enter ZIP code and radius
2. Select business types (MCC codes)
3. AI searches the web for matching businesses
4. Returns list with: name, address, phone, website, hours, owner name
5. Claim prospects to add to your pipeline

**Features:**
- Background job processing (can navigate away)
- Push notifications when search completes
- Duplicate detection (skips businesses already in pipeline)
- MCC code filtering (restaurants, retail, medical, etc.)
- "My Searches" history with retry option

**Technical:**
- Uses Grok-4 Responses API with `web_search` tool
- Falls back to Claude if Grok unavailable
- Jobs stored in `prospectSearches` table
- 5-second polling interval for status

**Enhancement opportunities:**
- Add Google Places API integration for richer data
- Implement competitor analysis
- Add business review sentiment analysis
- Create territory mapping

---

### 1.5 Business Card Scanner
**Location:** `/business-card-scanner` | **File:** `business-card-scanner.tsx`

**What it does:**
Scan business cards using camera or upload to extract contact information via AI OCR.

**Features:**
- Camera capture or photo upload
- AI-powered text extraction (Gemini Vision)
- Editable extracted fields
- One-click "Create Prospect" button
- Auto-populates merchant/deal records

**Extracted Fields:**
- Name, title, company
- Phone, email, website
- Address

**Enhancement opportunities:**
- Add LinkedIn profile lookup
- Implement batch scanning
- Add duplicate detection
- Create contact enrichment from web data

---

## 2. Brochure & Drop Management

### 2.1 New Drop Entry
**Location:** `/drops/new` | **File:** `new-drop.tsx`

**What it does:**
Log when you leave a video brochure at a business location.

**Data Captured:**
- Brochure ID (QR scan or manual entry)
- GPS location (auto-captured)
- Business name, type, phone
- Contact name
- Text notes
- Voice notes (with AI transcription)
- Pickup reminder date/time

**Features:**
- QR code scanner for brochure ID
- Auto-generate ID for manual entries
- Voice note recording with real-time transcription
- Business type validation against prohibited list
- Dictation input for notes

**Enhancement opportunities:**
- Add photo capture of storefront
- Implement smart brochure ID suggestions
- Add business lookup by phone/name
- Create drop templates for common scenarios

---

### 2.2 Drop Detail & Follow-up
**Location:** `/drops/:id` | **File:** `drop-detail.tsx`

**What it does:**
Complete view of a single drop with all related information and actions.

**Sections:**
- Business information
- Location map
- Brochure details
- AI-generated summary of notes
- Lead score (AI-calculated)
- Voice recordings with playback
- Email drafter
- Outcome logging

**Outcome Types:**
- Signed (converted to customer)
- Interested - Appointment
- Interested - Later
- Not Interested
- Closed (business closed)
- Not Found (couldn't locate)

**Features:**
- Start follow-up sequence
- Log pickup outcome
- Send follow-up emails
- Link to merchant record
- Edit drop details

**Enhancement opportunities:**
- Add outcome reason codes
- Implement drop scoring algorithm
- Add competitive intelligence capture
- Create outcome analytics

---

### 2.3 Drop History
**Location:** `/drops` (via Dashboard) | **File:** `history.tsx`

**What it does:**
View and filter all historical drops.

**Features:**
- Date range filtering
- Status filtering (pending, picked up, converted, lost)
- Search by business name
- Export to CSV/Excel
- Bulk actions

---

### 2.4 Brochure Inventory Management
**Location:** `/inventory` | **File:** `inventory.tsx`

**What it does:**
Track physical video brochures from house inventory through deployment.

**Features:**
- House inventory (unassigned brochures)
- Agent inventory (brochures assigned to each rep)
- Transfer history
- Bulk registration
- Low stock alerts
- Restock logging

**Brochure Statuses:**
- Available (in house inventory)
- Deployed (left at business)
- Returned (picked up)
- Lost

**Enhancement opportunities:**
- Add barcode scanning for bulk registration
- Implement inventory forecasting
- Add brochure condition tracking
- Create automated reorder triggers

---

### 2.5 Route Planner
**Location:** `/route-planner` | **File:** `route-planner.tsx`

**What it does:**
Optimize daily route for scheduled pickups.

**Features:**
- List of today's scheduled pickups
- Optimized driving order
- Time estimates between stops
- Open in Google Maps
- Mark stops complete

**Enhancement opportunities:**
- Add traffic-aware routing
- Implement appointment scheduling integration
- Add fuel cost estimates
- Create multi-day route planning

---

## 3. AI-Powered Tools

### 3.1 Statement Analyzer
**Location:** `/statement-analyzer` | **File:** `statement-analyzer.tsx`

**What it does:**
Analyze merchant credit card processing statements to identify savings opportunities.

**How it works:**
1. Upload processing statement (PDF/image)
2. AI extracts data using vision models
3. Calculates true interchange costs
4. Identifies excessive fees
5. Generates savings projections
6. Creates sales scripts for presentation

**Output includes:**
- Monthly volume and transaction counts
- Current effective rate
- Fee breakdown (interchange, assessment, markup)
- Red flags (excessive fees, hidden charges)
- Projected savings with PCBancard
- Talking points for sales conversation

**Features:**
- Multi-file upload
- Few-shot learning for better extraction
- Fee dictionary for industry benchmarks
- PII redaction
- Link analysis to deals
- Export results

**Enhancement opportunities:**
- Add processor-specific parsing templates
- Implement savings guarantee calculator
- Add historical trend analysis
- Create competitive processor database

---

### 3.2 Proposal Generator
**Location:** `/proposal-generator` | **File:** `proposal-generator.tsx`

**What it does:**
Generate professional branded proposals using AI and merchant data.

**Process:**
1. Enter agent information
2. Upload merchant statement (or enter data manually)
3. Background PDF parsing extracts merchant data
4. AI generates proposal content
5. Download as PDF or Word document

**Features:**
- Background job queue for PDF parsing
- Push notifications when parsing completes
- Equipment selection from catalog
- Custom pricing configuration
- Claude AI content generation
- Professional branded templates
- Link proposals to deals

**Proposal Sections:**
- Executive summary
- Current processing analysis
- Recommended solution
- Equipment specifications
- Pricing breakdown
- Implementation timeline
- Terms and conditions

**Enhancement opportunities:**
- Add proposal templates library
- Implement e-signature integration
- Add proposal tracking (opened, viewed)
- Create proposal versioning

---

### 3.3 EquipIQ (Equipment Advisor)
**Location:** `/equipiq` | **File:** `equipiq.tsx`

**What it does:**
AI-powered equipment recommendation system for payment processing hardware/software.

**Features:**
- Conversational AI advisor
- Business type matching
- Product catalog browsing
- Feature comparison
- Knowledge quiz for learning
- Recommendation history

**Product Categories:**
- POS terminals
- Payment gateways
- Mobile readers
- Integrated systems
- Software solutions

**Enhancement opportunities:**
- Add pricing calculator
- Implement inventory availability
- Add installation scheduling
- Create equipment comparison tool

---

### 3.4 AI Email Drafter
**Location:** `/email-drafter` | **File:** `email-drafter.tsx`

**What it does:**
Generate professional sales emails using AI.

**Modes:**
1. **Polish Mode:** Improve an existing draft
2. **Generate Mode:** Create new email from scratch

**Email Types:**
- Introduction/cold outreach
- Follow-up after meeting
- Proposal delivery
- Thank you
- Appointment request
- Custom

**Features:**
- Tone selection (professional, friendly, urgent)
- Business context inclusion
- Dictation input
- Text-to-speech playback
- Copy to clipboard

**Enhancement opportunities:**
- Add email templates library
- Implement email scheduling
- Add email tracking integration
- Create A/B testing for subject lines

---

### 3.5 AI Help Chatbot
**Location:** Floating button on all pages

**What it does:**
Claude-powered assistant that answers questions about the app and sales techniques.

**Features:**
- Context-aware responses
- Feature explanations
- Troubleshooting guidance
- Sales tips and best practices

**Enhancement opportunities:**
- Add conversation history
- Implement proactive suggestions
- Add voice input
- Create guided tutorials

---

### 3.6 Marketing Material Generator
**Location:** `/marketing` | **File:** `marketing-materials.tsx`

**What it does:**
Create professional marketing flyers using AI or select from pre-made templates.

**Two Sections:**
1. **Static Templates:** Pre-designed industry-specific flyers (12 templates)
2. **AI Generator:** Custom flyers based on text prompt

**Static Template Industries:**
- Liquor Stores
- Restaurants & Bars
- Pizzerias
- Food Trucks
- Automotive
- Veterinarians
- Salons & Spas
- Rock & Gravel
- B2B Level 2&3
- HotSauce POS
- Merchant Cash Advance
- General

**AI Generation Features:**
- Website analysis for business context
- Rep contact info auto-fill
- Background job processing
- PDF and PNG output
- Email body copy generation
- Download for sharing

**Enhancement opportunities:**
- Add template customization
- Implement brand color matching
- Add QR code generation
- Create social media format exports

---

## 4. Sales Training & Coaching

### 4.1 AI Role-Play Coach (Sales Spark)
**Location:** `/coach` | **File:** `coach.tsx`

**What it does:**
Conversational AI for practicing sales scenarios with voice input/output.

**Scenario Types:**
- Cold call practice
- Objection handling
- Rate presentation
- Closing techniques
- Custom scenarios

**Features:**
- Voice input with transcription
- AI voice responses (ElevenLabs TTS)
- Difficulty levels (Easy, Medium, Hard)
- Merchant personas (friendly, skeptical, busy)
- Session feedback and scoring
- Performance tracking
- Email session reports

**Coaching Modes:**
- Role-play (practice conversations)
- Advice (get tips on scenarios)

**RAG Integration:**
- Pulls from training_documents table
- Uses custom training materials uploaded by admin

**Enhancement opportunities:**
- Add video role-play
- Implement peer feedback
- Add certification tracking
- Create team competitions

---

### 4.2 Daily Edge Motivation System
**Location:** `/daily-edge` (via Coach page)

**What it does:**
Daily mindset training based on "The Salesperson's Secret Code" book.

**Features:**
- Daily content cards
- Streak tracking
- Belief progress tracking
- Interactive AI chat for deeper learning
- 90 days of content

**Belief Categories:**
- Mindset
- Prospecting
- Presenting
- Closing
- Resilience

**Enhancement opportunities:**
- Add audio narration
- Implement team challenges
- Add personal goal setting
- Create custom content upload

---

### 4.3 Presentation Training
**Location:** `/presentation-training` | **File:** `presentation-training.tsx`

**What it does:**
Interactive 8-module training for the PCBancard Dual Pricing presentation.

**Modules:**
1. Opening and rapport building
2. Problem identification
3. Solution presentation
4. Pricing explanation
5. Objection handling
6. Feature demonstration
7. Closing techniques
8. Next steps and paperwork

**Features:**
- Video lessons
- Interactive quizzes
- Practice exercises
- Progress tracking
- Persuasion psychology tips
- Module completion badges

**Enhancement opportunities:**
- Add recorded practice sessions
- Implement manager review
- Add certification exam
- Create refresher courses

---

## 5. Document & E-Signature Management

### 5.1 E-Sign Document Library
**Location:** `/esign/documents` | **File:** `esign-document-library.tsx`

**What it does:**
Manage document templates and packages for e-signature.

**Features:**
- Template library
- Document packages (groups of related docs)
- SignNow integration
- Template field mapping
- Preview documents

**Document Types:**
- Merchant application
- Equipment lease
- Service agreement
- PCI compliance forms
- Bank authorization

**Enhancement opportunities:**
- Add template versioning
- Implement approval workflows
- Add document analytics
- Create conditional fields

---

### 5.2 E-Sign Request Management
**Location:** `/esign/requests/:id` | **File:** `esign-request-detail.tsx`

**What it does:**
Create, send, and track e-signature requests.

**Features:**
- Create requests from templates
- Add multiple signers
- Pre-fill field values
- Send for signature
- Track status (sent, viewed, signed)
- Download signed documents
- Void requests

**Status Flow:**
draft → sent → viewed → signed → completed

**Integration with Pipeline:**
- Auto-updates deal stage when documents signed
- Links signed docs to merchant record

**Enhancement opportunities:**
- Add reminder scheduling
- Implement bulk sending
- Add signing order
- Create mobile signing experience

---

## 6. Communication Tools

### 6.1 Email Digest System
**Location:** Profile settings

**What it does:**
AI-powered daily/weekly email summaries sent to your inbox.

**Configurable Content:**
- Today's appointments
- Follow-ups due
- Stale deals needing attention
- Pipeline summary
- Recent wins celebration
- AI-generated tips
- Quarterly check-in reminders
- Referral updates

**Features:**
- Timezone-aware scheduling
- Custom send time preference
- Toggle content sections
- Test email functionality
- Delivery history

**Technical:**
- Cron job runs every 15 minutes
- Uses Claude claude-sonnet-4-20250514 for content
- Sent via Resend

**Enhancement opportunities:**
- Add SMS digest option
- Implement push notification digest
- Add performance comparisons
- Create team digest for managers

---

### 6.2 Referral Management
**Location:** `/referrals` | **File:** `referrals.tsx`

**What it does:**
Track and manage merchant referrals.

**Features:**
- Log new referrals
- Track referral status
- Send thank you emails
- Referral conversion tracking
- Referrer rewards tracking

**Referral Statuses:**
- Pending (new referral)
- Contacted (reached out)
- Converted (became customer)
- Lost (did not convert)

**Enhancement opportunities:**
- Add referral program tiers
- Implement automated follow-up sequences
- Add referral link generation
- Create referral leaderboard

---

## 7. Team & Organization Management

### 7.1 Team Management
**Location:** `/team-management` | **File:** `team-management.tsx`

**What it does:**
Admin interface for managing organization members.

**Features:**
- Add new team members
- Set roles (Master Admin, Relationship Manager, Agent)
- Assign managers to agents
- Edit member profiles
- Send invitation links
- Remove members
- View pending invitations

**Roles:**
| Role | Permissions |
|------|-------------|
| Master Admin | Full access, all features, all data |
| Relationship Manager | Team data access, some admin features |
| Agent | Own data only, core features |

**Enhancement opportunities:**
- Add role customization
- Implement team hierarchies
- Add onboarding workflows
- Create performance tracking

---

### 7.2 User Permissions
**Location:** Admin Dashboard

**What it does:**
Individual feature toggles per user (beyond role-based access).

**Toggleable Features:**
- View leaderboard
- Access AI Coach
- Access EquipIQ
- Export data
- Record meetings
- Manage referrals
- View Daily Edge
- Access sequences
- Access proposals

**Enhancement opportunities:**
- Add feature usage tracking
- Implement permission templates
- Add temporary access grants
- Create approval workflows

---

### 7.3 Team Pipeline View
**Location:** `/team-pipeline` | **File:** `team-pipeline.tsx`

**What it does:**
Manager view of entire team's pipeline.

**Features:**
- All team deals in one view
- Filter by agent
- Stage distribution
- Recent activity feed
- Quick access to deal details

**Enhancement opportunities:**
- Add team goals and tracking
- Implement deal assignments
- Add coaching opportunities alerts
- Create team competitions

---

### 7.4 Activity Feed
**Location:** `/activity` | **File:** `activity-feed.tsx`

**What it does:**
Chronological feed of team activities.

**Event Types:**
- Drops logged
- Deals created/updated/won/lost
- Proposals generated
- Statements analyzed
- Meetings recorded
- Documents signed

**Features:**
- Filter by event type
- Filter by agent
- Load more pagination
- Event details expansion

**Enhancement opportunities:**
- Add real-time updates
- Implement mentions/notifications
- Add commenting on activities
- Create activity analytics

---

## 8. Analytics & Reporting

### 8.1 Pipeline Analytics
**Location:** `/pipeline-analytics` | **File:** `pipeline-analytics.tsx`

**What it does:**
Performance analytics for sales managers.

**Metrics:**
- Deal counts by stage
- Win/loss rates
- Average time in stage
- Conversion rates stage-to-stage
- Revenue projections
- Agent performance comparison

**Visualizations:**
- Stage funnel
- Time-in-stage chart
- Agent leaderboard
- Trend lines

**Enhancement opportunities:**
- Add custom date ranges
- Implement goal tracking
- Add forecasting models
- Create exportable reports

---

### 8.2 Admin Dashboard
**Location:** `/admin` | **File:** `admin-dashboard.tsx`

**What it does:**
Comprehensive overview for administrators.

**Sections:**
- Key performance stats
- AI training material sync status
- Drop overview (pending, converted, lost)
- Team member stats
- Recent activity
- Low inventory alerts

**Features:**
- Quick filters for drops
- Team member editing
- Export functionality

**Enhancement opportunities:**
- Add customizable widgets
- Implement benchmarking
- Add trend indicators
- Create executive summary export

---

### 8.3 RM Dashboard
**Location:** `/rm-dashboard` | **File:** `rm-dashboard.tsx`

**What it does:**
Relationship Manager overview of their agents.

**Features:**
- Agent performance summary
- Pipeline by agent
- Recent wins
- Coaching opportunities
- Team totals

**Enhancement opportunities:**
- Add 1-on-1 meeting notes
- Implement coaching plans
- Add performance improvement tracking
- Create agent scorecards

---

### 8.4 My Work History
**Location:** `/my-work` | **File:** `my-work.tsx`

**What it does:**
Centralized view of user's proposals and statement analyses.

**Features:**
- Proposal list with status
- Statement analysis list
- Link to deals
- Download outputs
- Delete old items

**Enhancement opportunities:**
- Add search and filters
- Implement favorites
- Add templates from past work
- Create usage statistics

---

### 8.5 Team Leaderboard
**Location:** `/leaderboard` (via Dashboard)

**What it does:**
Optional competitive leaderboard showing top performers.

**Metrics:**
- Deals closed
- Revenue generated
- Drops logged
- Conversion rate

**Features:**
- Time period selection
- Opt-in/opt-out per user
- Celebration animations for top spots

**Enhancement opportunities:**
- Add badges and achievements
- Implement team vs. team
- Add historical performance
- Create prize/reward integration

---

## 9. Mobile & PWA Features

### 9.1 Progressive Web App
**What it does:**
Installable app experience on mobile devices.

**Features:**
- Add to home screen
- Offline capability
- Push notifications
- Full-screen mode

**Push Notification Types:**
- Prospect search completed
- Proposal parsing completed
- Pickup reminders
- Daily digest alerts

---

### 9.2 Offline Mode
**What it does:**
Continue working without internet connection.

**Offline Capabilities:**
- Log new drops (synced when online)
- View cached data
- Record voice notes
- Queue actions for sync

**Technical:**
- IndexedDB for local storage
- Service worker for caching
- Background sync when online

**Enhancement opportunities:**
- Add conflict resolution
- Implement selective sync
- Add offline analytics
- Create sync status indicators

---

### 9.3 Mobile-First UX
**What it does:**
Optimized touch experience for mobile devices.

**Features:**
- 48px touch targets
- Bottom navigation bar
- Swipe gestures (planned)
- Pull-to-refresh (planned)
- iOS Safari optimizations

**Enhancement opportunities:**
- Add haptic feedback
- Implement gesture navigation
- Add shake-to-undo
- Create one-handed mode

---

## 10. System & Settings

### 10.1 User Profile
**Location:** `/profile` | **File:** `profile.tsx`

**What it does:**
Manage personal information and preferences.

**Sections:**
- Personal info (name, email, phone)
- Notification settings
- Email digest preferences
- Push notification management
- Theme preferences

**Enhancement opportunities:**
- Add avatar upload
- Implement signature customization
- Add calendar integration
- Create custom dashboard layouts

---

### 10.2 Follow-up Sequences
**Location:** `/sequences` | **File:** `sequences.tsx`

**What it does:**
Create automated follow-up sequences for drops.

**Features:**
- Define sequence steps
- Set delays between steps
- Choose actions (email, SMS, reminder)
- Assign sequences to drops

**Enhancement opportunities:**
- Add conditional branching
- Implement A/B testing
- Add response detection
- Create sequence analytics

---

### 10.3 Help Center
**Location:** `/help` | **File:** `help.tsx`

**What it does:**
Central hub for user assistance.

**Sections:**
- Getting started guides
- Feature explanations by role
- FAQ
- Feedback form
- Contact support

**Features:**
- Searchable content
- Role-specific guidance
- Video tutorials (planned)

**Enhancement opportunities:**
- Add interactive tutorials
- Implement chatbot integration
- Add knowledge base
- Create user community

---

## Quick Reference: Page Routes

| Route | Page | Primary Function |
|-------|------|------------------|
| `/` | Dashboard | Main overview |
| `/drops` | Drop List | View all drops |
| `/drops/new` | New Drop | Log new drop |
| `/drops/:id` | Drop Detail | View/edit drop |
| `/merchants` | Merchant List | View all merchants |
| `/merchants/:id` | Merchant Detail | View/edit merchant |
| `/pipeline` | Deal Pipeline | Kanban board |
| `/today` | Today View | Daily action center |
| `/prospects/search` | Prospect Finder | AI business search |
| `/business-card-scanner` | Card Scanner | Scan business cards |
| `/statement-analyzer` | Statement Analyzer | Analyze statements |
| `/proposal-generator` | Proposal Generator | Create proposals |
| `/marketing` | Marketing Materials | Flyers and templates |
| `/email-drafter` | Email Drafter | AI email writing |
| `/coach` | Sales Coach | AI role-play |
| `/daily-edge` | Daily Edge | Mindset training |
| `/presentation-training` | Presentation Training | Sales training |
| `/equipiq` | EquipIQ | Equipment advisor |
| `/role-play` | Role Play | Training redirect |
| `/referrals` | Referrals | Manage referrals |
| `/route-planner` | Route Planner | Optimize routes |
| `/inventory` | Inventory | Brochure tracking |
| `/sequences` | Sequences | Follow-up automation |
| `/esign/documents` | E-Sign Library | Document templates |
| `/esign/requests/:id` | E-Sign Request | Manage signatures |
| `/activity` | Activity Feed | Team activities |
| `/team-pipeline` | Team Pipeline | Manager view |
| `/pipeline-analytics` | Analytics | Performance data |
| `/admin` | Admin Dashboard | Admin overview |
| `/team-management` | Team Management | Manage members |
| `/profile` | Profile | User settings |
| `/settings` | Settings | App settings |
| `/help` | Help Center | Documentation |
| `/my-work` | My Work | History of work |
| `/leaderboard` | Leaderboard | Top performers |

---

## Database Tables Overview

| Table | Purpose |
|-------|---------|
| organizations | Multi-tenant organization records |
| organizationMembers | User memberships and roles |
| userPermissions | Individual feature toggles |
| brochures | Video brochure inventory |
| drops | Brochure deployment records |
| merchants | Business/merchant profiles |
| prospects | Discovered business leads |
| prospectSearches | AI search job tracking |
| deals | Sales pipeline deals |
| dealActivities | Deal activity history |
| dealAttachments | Files attached to deals |
| dealFollowUps | Follow-up attempt tracking |
| esignRequests | E-signature requests |
| esignSigners | Signers on requests |
| proposals | Generated proposals |
| statementAnalyses | Statement analysis results |
| marketingMaterials | Generated/static flyers |
| flyerGenerationJobs | AI flyer generation queue |
| meetingRecordings | Recorded meetings |
| reminders | Scheduled reminders |
| sequences | Follow-up sequences |
| sequenceSteps | Steps in sequences |
| roleplaySessions | AI coaching sessions |
| roleplayMessages | Chat messages in sessions |
| dailyEdgeContent | Motivation content |
| dailyEdgeProgress | User progress tracking |
| presentationModules | Training modules |
| presentationProgress | Training progress |
| equipiqVendors | Equipment vendors |
| equipiqProducts | Equipment products |
| equipiqRecommendations | AI recommendations |
| referrals | Merchant referrals |
| activityLog | Team activity events |
| userPreferences | User settings |
| pushSubscriptions | Push notification subs |
| emailDigestHistory | Sent digest tracking |
| invitations | Pending team invites |
| trainingDocuments | AI training materials |

---

## Enhancement Priority Suggestions

### High Priority (Core Sales Flow)
1. Deal Pipeline customization
2. Statement Analyzer accuracy improvements
3. Proposal Generator template library
4. Mobile offline enhancements

### Medium Priority (Productivity)
5. Email integration (Gmail/Outlook)
6. Calendar sync
7. Automated follow-up sequences
8. Territory management

### Lower Priority (Nice to Have)
9. Video conferencing integration
10. Advanced analytics/BI
11. Gamification features
12. Third-party CRM sync

---

*This document should be updated as features are enhanced or added.*
