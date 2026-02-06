# Add Sales Video Training Module + Agent Training Detail View to FSI Suite

## READ THIS FIRST

This prompt adds TWO things:

1. **A new "Sales Videos" training section** — 8 PCBancard Vimeo videos that agents watch to learn the sales pitch. Each video gets its own ON/OFF toggle in the existing Feature Permissions panel. Agents can share individual video links and the full presentation page with merchants. Video watch progress is tracked.

2. **An Agent Training Detail view** — A new admin/RM screen where you can click into any individual agent and see EVERYTHING they've completed across ALL training: which videos they've watched, which presentation modules they've completed, quiz scores, role-play sessions, badges earned, and certificates. This does NOT currently exist — admins can only see a high-level stage on the Team Management page.

**CRITICAL: This is 100% additive. Do NOT modify, remove, or break ANY existing features, pages, components, routes, API endpoints, or database tables. Add new ones only.**

---

## DISCOVERY STEP (DO THIS BEFORE ANY CODE)

Read these files first. Do not skip this.

1. **Feature registry** — The file defining all toggleable features (entries with `id`, `name`, `description`, `category`, `routes`, `roleDefaults`, `stageDefaults`, etc.). Likely in `shared/permissions.ts` or `shared/featureConfig.ts`.

2. **Feature Permissions panel component** — The modal/panel UI that renders toggle switches grouped by category headers (CORE CRM, BROCHURE MANAGEMENT, etc.) when admin clicks "Feature Permissions" for a user in Team Management.

3. **Navigation sidebar config** — Where nav items are defined with `featureId` gating.

4. **Router / App.tsx** — Where routes are registered.

5. **Permission hook** — `usePermissions()` or similar, used by components to check feature access.

6. **Database schema** — How training progress is currently stored (if at all). Look for tables related to `training_progress`, `quiz_results`, `user_achievements`, or similar.

7. **Team Management page** — Where admin sees list of users with their roles, stages, and high-level status.

**Match every existing pattern exactly — same TypeScript types, naming conventions, component structure, API patterns, database patterns.**

---

## PART A: SALES VIDEO TRAINING MODULE

### A1. Feature Permission Registry — Add 8 Video Toggles

Add a new category and 8 entries to the feature registry. Place after existing `sales_training` entries.

**New category:**
```typescript
// Add to FeatureCategory type:
| 'sales_videos'

// Add to category labels/display names:
sales_videos: 'SALES VIDEOS'

// Add to category icon map (if one exists):
sales_videos: 'PlayCircle'
```

**8 feature entries** (copy the exact shape of existing entries like `deal_pipeline`):

```typescript
// ═══════════════════════════════════════════════════════════════════════════════
// SALES VIDEOS — PCBancard sales presentation training videos
// ═══════════════════════════════════════════════════════════════════════════════
{
  id: 'video_hello',
  name: 'Hello — Stop Losing to Fees',
  description: 'Core dual pricing value proposition video',
  category: 'sales_videos',
  routes: ['/training/sales-videos'],
  roleDefaults: { admin: true, manager: true, agent: true },
  stageDefaults: { trainee: true, active: true, senior: true },
  icon: 'PlayCircle',
  defaultEnabled: true
},
{
  id: 'video_grow',
  name: 'Grow — Reinvest & Scale',
  description: 'Reinvest fee savings into business growth',
  category: 'sales_videos',
  routes: ['/training/sales-videos'],
  roleDefaults: { admin: true, manager: true, agent: true },
  stageDefaults: { trainee: true, active: true, senior: true },
  icon: 'PlayCircle',
  defaultEnabled: true
},
{
  id: 'video_next_steps',
  name: 'Next Steps — $1K Incentive',
  description: 'Conversion incentive and risk-free switching',
  category: 'sales_videos',
  routes: ['/training/sales-videos'],
  roleDefaults: { admin: true, manager: true, agent: true },
  stageDefaults: { trainee: true, active: true, senior: true },
  icon: 'PlayCircle',
  defaultEnabled: true
},
{
  id: 'video_trust',
  name: 'Trust — Support & Guarantees',
  description: 'US-based support, 60-day policy, BBB A+ rating',
  category: 'sales_videos',
  routes: ['/training/sales-videos'],
  roleDefaults: { admin: true, manager: true, agent: true },
  stageDefaults: { trainee: true, active: true, senior: true },
  icon: 'PlayCircle',
  defaultEnabled: true
},
{
  id: 'video_in_store',
  name: 'In-Store — Brick & Mortar Tools',
  description: 'Smart terminal and POS integration demo',
  category: 'sales_videos',
  routes: ['/training/sales-videos'],
  roleDefaults: { admin: true, manager: true, agent: true },
  stageDefaults: { trainee: true, active: true, senior: true },
  icon: 'PlayCircle',
  defaultEnabled: true
},
{
  id: 'video_mobile',
  name: 'Mobile — Get Paid Anywhere',
  description: 'Mobile payment solutions for field businesses',
  category: 'sales_videos',
  routes: ['/training/sales-videos'],
  roleDefaults: { admin: true, manager: true, agent: true },
  stageDefaults: { trainee: true, active: true, senior: true },
  icon: 'PlayCircle',
  defaultEnabled: true
},
{
  id: 'video_online',
  name: 'Online — Get Paid Virtually',
  description: 'E-commerce, virtual terminal, payment links',
  category: 'sales_videos',
  routes: ['/training/sales-videos'],
  roleDefaults: { admin: true, manager: true, agent: true },
  stageDefaults: { trainee: true, active: true, senior: true },
  icon: 'PlayCircle',
  defaultEnabled: true
},
{
  id: 'video_give_back',
  name: 'Give Back — Business Into Impact',
  description: 'Charitable giving through transactions',
  category: 'sales_videos',
  routes: ['/training/sales-videos'],
  roleDefaults: { admin: true, manager: true, agent: true },
  stageDefaults: { trainee: false, active: true, senior: true },
  icon: 'PlayCircle',
  defaultEnabled: true
}
```

**Note:** `video_give_back` defaults OFF for trainees. All others default ON for everyone.

**CRITICAL:** Only ADD these entries. Do NOT remove or modify any existing entries in the registry.

---

### A2. Feature Permissions Panel — Verify SALES VIDEOS Category Appears

After adding the entries above, the Feature Permissions panel (Team Management → user → Feature Permissions) should show a new **SALES VIDEOS** section with 8 individual toggles.

If categories are hard-coded in a list, add `'sales_videos'` after `'sales_training'`:

```typescript
// Find the category order array and add:
'sales_videos',  // ← after 'sales_training'
```

If there's a category display name map, add:
```typescript
sales_videos: 'SALES VIDEOS',
```

**DO NOT modify any other categories or their entries.**

---

### A3. Navigation — Add Under Sales Training Group

Find the navigation config. In the **Sales Training** group (where Sales Spark, Presentation Training, etc. live), add:

```typescript
{
  id: 'sales-videos',
  label: 'Sales Videos',
  path: '/training/sales-videos',
  icon: <PlayCircle className="w-5 h-5" />,
  featureId: 'video_hello'
}
```

The nav item shows if the user has ANY video feature enabled. The page itself filters which videos to display.

---

### A4. Route — Register the Page

In App.tsx or the router, add the route with the same auth/layout wrapper used by other training pages:

```tsx
<Route path="/training/sales-videos" component={SalesVideosTraining} />
```

---

### A5. Database — Video Watch Tracking

Create a new table to track video watch progress. This feeds into the gamification system and the admin detail view.

```sql
CREATE TABLE IF NOT EXISTS video_watch_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id VARCHAR(50) NOT NULL,           -- e.g. 'video_hello', 'video_grow'
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,                   -- NULL if not finished
  watch_time_seconds INTEGER DEFAULT 0,     -- cumulative seconds watched
  completed BOOLEAN DEFAULT FALSE,
  last_watched_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

CREATE INDEX idx_video_watch_user ON video_watch_progress(user_id);
```

Also create a general training achievements table (if one doesn't already exist):

```sql
CREATE TABLE IF NOT EXISTS training_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,    -- 'badge' or 'certificate'
  achievement_id VARCHAR(100) NOT NULL,     -- e.g. 'video_completion_all', 'presentation_master'
  achievement_name VARCHAR(200) NOT NULL,   -- Display name
  earned_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,                           -- Extra data (score, etc.)
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_achievements_user ON training_achievements(user_id);
```

**DO NOT modify any existing tables.**

---

### A6. API Endpoints — Video Tracking

Add these endpoints to the server. Follow the same pattern as other API routes in the project.

```
GET  /api/training/video-progress          — Get current user's video watch progress
POST /api/training/video-progress/:videoId — Update watch progress (start, update time, complete)
GET  /api/training/video-progress/user/:userId  — Admin: get specific user's video progress
GET  /api/training/achievements            — Get current user's badges/certificates
GET  /api/training/achievements/user/:userId    — Admin: get specific user's achievements
GET  /api/training/overview/user/:userId   — Admin: full training overview for a user
```

**POST body for video progress update:**
```json
{
  "action": "start" | "progress" | "complete",
  "watchTimeSeconds": 45
}
```

**Completion logic:** A video is marked "completed" when the agent clicks the "Mark as Watched" button OR when they've watched 90%+ of the video duration. Both methods work.

---

### A7. Video Badges

Award these badges automatically when conditions are met:

| Badge ID | Name | Icon | Condition |
|----------|------|------|-----------|
| `video_first_watch` | First Video | 🎬 | Complete any 1 video |
| `video_halfway` | Halfway There | 📺 | Complete 4 of 8 videos |
| `video_all_complete` | Video Master | 🏆 | Complete all 8 videos |
| `video_speed_learner` | Speed Learner | ⚡ | Complete all 8 in one day |

Check badge conditions after each video completion. Insert into `training_achievements` when earned.

---

### A8. Create the Sales Videos Training Page

Create: `client/src/pages/SalesVideosTraining.tsx`

This page has THREE sections:

#### Section 1: Page Header with Progress

```
┌──────────────────────────────────────────────────────┐
│ 🎬 Sales Videos                                      │
│ Learn the PCBancard pitch · Share with merchants      │
│                                                       │
│ Progress: ████████░░ 6/8 videos watched               │
│                                                       │
│ 🏆 Badges: [First Video ✓] [Halfway ✓] [Master ○]    │
└──────────────────────────────────────────────────────┘
```

#### Section 2: Shareable Presentation Link

A prominent card linking to the merchant-facing sales page:

```
┌──────────────────────────────────────────────────────┐
│ 📎 Merchant Sales Presentation                        │
│                                                       │
│ Share this link with merchants — it's the full        │
│ PCBancard sales presentation with all videos,         │
│ testimonials, and savings calculator.                  │
│                                                       │
│ https://sales.pcbancard.com                           │
│                                                       │
│ [Copy Link]  [Share via Text]  [Share via Email]      │
└──────────────────────────────────────────────────────┘
```

**Share via Text** opens: `sms:?body=Check out how PCBancard can help your business: https://sales.pcbancard.com`

**Share via Email** opens: `mailto:?subject=See How Much You Could Be Saving&body=Hi, I wanted to share this with you...`

#### Section 3: Video Cards (Expandable with Tracking)

Each of the 8 videos is a card. Only videos the user has permission for are shown.

**Collapsed state:**
```
┌──────────────────────────────────────────────────────┐
│ [1] HELLO                                    ✓ Watched│
│     Stop Losing to Fees                      [Share ↗]│
│     Core dual pricing pitch                    [ ▼ ]  │
└──────────────────────────────────────────────────────┘
```

**Expanded state:**
```
┌──────────────────────────────────────────────────────┐
│ [1] HELLO                                    ✓ Watched│
│     Stop Losing to Fees                      [Share ↗]│
│ ┌──────────────────────────────────────────────────┐ │
│ │                                                  │ │
│ │          [Vimeo Embedded Player 16:9]             │ │
│ │                                                  │ │
│ └──────────────────────────────────────────────────┘ │
│                                                       │
│ Topics: [Fee Analysis] [Dual Pricing] [Profit Prot.]  │
│                                                       │
│ [✓ Mark as Watched]         [Open in Vimeo ↗]        │
└──────────────────────────────────────────────────────┘
```

**When agent clicks "Mark as Watched":**
1. POST to `/api/training/video-progress/video_hello` with `action: "complete"`
2. Button changes to "✓ Watched" (green, disabled)
3. Progress bar updates
4. Check if any badges should be awarded
5. If badge earned, show a toast notification: "🏆 Badge earned: First Video!"

**Share button behavior:**
- Copies the individual Vimeo URL to clipboard
- On mobile: opens native share sheet via `navigator.share()`
- Shows "Copied!" confirmation

---

### A9. Video Data Reference

```typescript
const SALES_VIDEOS = [
  {
    featureId: 'video_hello',
    number: 1,
    label: 'HELLO',
    title: 'Stop Losing to Fees',
    description: 'How merchants lose 3–4% of every sale to hidden processing fees, and how dual pricing eliminates that loss.',
    vimeoId: '1081696337',
    vimeoUrl: 'https://vimeo.com/1081696337',
    color: '#1a237e',
    topics: ['Fee Analysis', 'Dual Pricing', 'Profit Protection']
  },
  {
    featureId: 'video_grow',
    number: 2,
    label: 'GROW',
    title: 'Reinvest & Scale Your Business',
    description: 'What to do with recovered savings — reinvest in marketing, build reserves, expand operations.',
    vimeoId: '1083204964',
    vimeoUrl: 'https://vimeo.com/1083204964',
    color: '#1b5e20',
    topics: ['Growth Strategy', 'Savings Reinvestment', 'Business Scaling']
  },
  {
    featureId: 'video_next_steps',
    number: 3,
    label: 'NEXT STEPS',
    title: 'Unlock Your $1,000 Conversion Incentive',
    description: 'The conversion incentive package: transition support, no long-term contracts, transparent structure.',
    vimeoId: '1083216333',
    vimeoUrl: 'https://vimeo.com/1083216333',
    color: '#b71c1c',
    topics: ['Conversion Incentive', 'Risk-Free Switch', 'No Contracts']
  },
  {
    featureId: 'video_trust',
    number: 4,
    label: 'TRUST',
    title: 'Real Support, Real Guarantees',
    description: 'US-based support, 60-day no-regrets policy, $500 Merchant Assurance, A+ BBB rating.',
    vimeoId: '1083211077',
    vimeoUrl: 'https://vimeo.com/1083211077',
    color: '#4a148c',
    topics: ['Support', 'Guarantees', 'BBB Rating']
  },
  {
    featureId: 'video_in_store',
    number: 5,
    label: 'IN-STORE',
    title: 'Payment Tools for Brick & Mortar',
    description: 'Smart terminals with dual-price display, all payment types, POS integration.',
    vimeoId: '1083221635',
    vimeoUrl: 'https://vimeo.com/1083221635',
    color: '#e65100',
    topics: ['Smart Terminals', 'POS Integration', 'Contactless']
  },
  {
    featureId: 'video_mobile',
    number: 6,
    label: 'MOBILE',
    title: 'Get Paid Anywhere',
    description: 'Smartphone-as-terminal, Bluetooth readers, tablet POS, offline processing.',
    vimeoId: '1083228515',
    vimeoUrl: 'https://vimeo.com/1083228515',
    color: '#00695c',
    topics: ['Mobile Payments', 'Card Readers', 'Offline Mode']
  },
  {
    featureId: 'video_online',
    number: 7,
    label: 'ONLINE',
    title: 'Get Paid Virtually',
    description: 'E-commerce integration, virtual terminal, recurring billing, payment links.',
    vimeoId: '1083232531',
    vimeoUrl: 'https://vimeo.com/1083232531',
    color: '#283593',
    topics: ['E-Commerce', 'Virtual Terminal', 'Payment Links']
  },
  {
    featureId: 'video_give_back',
    number: 8,
    label: 'GIVE BACK',
    title: 'Turn Business Into Impact',
    description: 'Every transaction powers a cause — school fundraisers, nonprofits, local charities.',
    vimeoId: '1083361580',
    vimeoUrl: 'https://vimeo.com/1083361580',
    color: '#c62828',
    topics: ['Charitable Giving', 'Community Impact', 'Social Good']
  }
];
```

---

## PART B: AGENT TRAINING DETAIL VIEW (Admin/RM)

This is the missing piece. Currently, admins can see the agent's stage (Trainee/Active/Senior) on the Team Management page but cannot drill into what an individual agent has actually completed. Build this.

### B1. Route

```
/admin/agent/:userId/training
```

Accessible from Team Management — add a "View Training" button/link on each agent's row or card. Only visible to users with `admin` or `manager` role.

### B2. What This Page Shows

When an admin clicks "View Training" for agent "Emma Torres", they see:

```
┌──────────────────────────────────────────────────────────────┐
│ ← Back to Team Management                                    │
│                                                               │
│ 👤 Emma Torres                                                │
│    Agent · Trainee Stage · Joined Jan 15, 2026                │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ OVERALL TRAINING PROGRESS                                │   │
│ │ ██████████░░░░░░░ 62%                                    │   │
│ │                                                          │   │
│ │ Videos: 5/8  Presentation: 4/8 modules  Coach: 12 sess  │   │
│ │ Quizzes: 85% avg  Role-Plays: 8 completed               │   │
│ └─────────────────────────────────────────────────────────┘   │
│                                                               │
│ 🏆 BADGES EARNED (4 of 12)                                    │
│ [🎬 First Video ✓] [📺 Halfway ✓] [🎯 Problem Master ✓]      │
│ [🎭 Role-Play Rookie ✓] [🏆 Video Master ○] [⚡ Speed ○]     │
│ [📖 Script Scholar ○] [🧠 Psychology Pro ○] ...               │
│                                                               │
│ ═══════════════════════════════════════════════════════════    │
│                                                               │
│ 📹 SALES VIDEOS                              5/8 Complete     │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ ✓ 1. Hello — Stop Losing to Fees    Watched Jan 20      │  │
│ │ ✓ 2. Grow — Reinvest & Scale        Watched Jan 20      │  │
│ │ ✓ 3. Next Steps — $1K Incentive     Watched Jan 21      │  │
│ │ ✓ 4. Trust — Support & Guarantees   Watched Jan 21      │  │
│ │ ✓ 5. In-Store — Brick & Mortar      Watched Jan 22      │  │
│ │ ○ 6. Mobile — Get Paid Anywhere     Not started          │  │
│ │ ○ 7. Online — Get Paid Virtually    Not started          │  │
│ │ 🔒 8. Give Back (disabled for trainee stage)             │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                               │
│ 📚 PRESENTATION TRAINING                     4/8 Modules      │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ ✓ Module 1: Opening & Hook           Quiz: 90%          │  │
│ │ ✓ Module 2: Problem Establishment    Quiz: 85%          │  │
│ │ ✓ Module 3: Solution Introduction    Quiz: 80%          │  │
│ │ ✓ Module 4: Objection Handling       Quiz: 75%          │  │
│ │ ○ Module 5: Story Proof              Not started         │  │
│ │ ○ Module 6: Process Walk-Through     Not started         │  │
│ │ ○ Module 7: Solution Fit             Not started         │  │
│ │ ○ Module 8: Close                    Not started         │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                               │
│ 🎭 AI SALES COACH / ROLE-PLAY                                 │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ 12 sessions completed · Avg score: 72/100                │  │
│ │                                                          │  │
│ │ Recent Sessions:                                         │  │
│ │ Jan 22 · Mike (Auto) · Stage 1 Prospecting  · 78/100    │  │
│ │ Jan 22 · Maria (Restaurant) · Stage 2 Disc. · 65/100    │  │
│ │ Jan 21 · Dr. Patel (Dental) · Stage 1 Prosp · 80/100    │  │
│ │ Jan 20 · Mike (Auto) · Stage 3 Close        · 71/100    │  │
│ │ ...show more                                             │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                               │
│ 📝 EQUIPIQ TRAINING                                           │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Quizzes: 3/6 vendors completed                           │  │
│ │ ✓ Dejavoo  ✓ SwipeSimple  ✓ Valor                       │  │
│ │ ○ MX POS   ○ Clover       ○ iPOSpays                    │  │
│ │ Flashcards reviewed: 45 of 63                            │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                               │
│ 🔥 DAILY EDGE                                                 │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Current streak: 5 days · Longest streak: 12 days         │  │
│ │ Last completed: Today                                    │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### B3. Data Sources

This page aggregates data from multiple sources. Query whatever tables exist for each training module:

| Section | Data Source |
|---------|------------|
| Sales Videos | `video_watch_progress` table (new, from Part A) |
| Presentation Training | Whatever table stores lesson/module completion (look for it) |
| AI Sales Coach | Whatever table stores role-play sessions and scores (look for it) |
| EquipIQ | Whatever table stores quiz/flashcard progress (look for it) |
| Daily Edge | Whatever table stores streak data (look for it) |
| Badges | `training_achievements` table (new, from Part A) |

**If some of these tracking tables don't exist yet**, create them. But check first — the platform has been actively developed and may already track some of this. Use what exists.

**If a training module has no tracking at all**, show the section with "No tracking data available" and a note to the admin. We can add tracking to those modules later.

### B4. API Endpoint

```
GET /api/admin/agent/:userId/training-overview
```

Response:
```json
{
  "user": { "id": 1, "name": "Emma Torres", "role": "agent", "stage": "trainee", "joinedAt": "..." },
  "overallProgress": 62,
  "videos": {
    "completed": 5,
    "total": 8,
    "items": [
      { "videoId": "video_hello", "completed": true, "completedAt": "2026-01-20T...", "watchTimeSeconds": 180 },
      ...
    ]
  },
  "presentationTraining": {
    "modulesCompleted": 4,
    "totalModules": 8,
    "items": [...]
  },
  "salesCoach": {
    "sessionsCompleted": 12,
    "averageScore": 72,
    "recentSessions": [...]
  },
  "equipiq": {
    "vendorsCompleted": 3,
    "totalVendors": 6,
    "flashcardsReviewed": 45,
    "totalFlashcards": 63
  },
  "dailyEdge": {
    "currentStreak": 5,
    "longestStreak": 12,
    "lastCompleted": "2026-02-06"
  },
  "badges": [
    { "id": "video_first_watch", "name": "First Video", "icon": "🎬", "earnedAt": "2026-01-20T..." },
    ...
  ],
  "allBadges": [
    { "id": "video_first_watch", "name": "First Video", "icon": "🎬", "earned": true },
    { "id": "video_master", "name": "Video Master", "icon": "🏆", "earned": false },
    ...
  ]
}
```

### B5. Team Management Integration

On the Team Management page, add a "Training" button/link for each agent. This links to `/admin/agent/:userId/training`.

Find the existing agent row/card component in Team Management and add:

```tsx
<button onClick={() => navigate(`/admin/agent/${user.id}/training`)}>
  View Training
</button>
```

Or add a small training progress indicator on the agent card:
```
Emma Torres · Trainee · Training: 62% ████████░░░
```

Clicking it navigates to the detail view.

---

## PART C: FULL BADGE SYSTEM

Define all badges across the platform. These get awarded automatically as agents complete training activities.

```typescript
const ALL_BADGES = [
  // Video badges
  { id: 'video_first_watch', name: 'First Video', icon: '🎬', description: 'Watch your first sales video', category: 'videos' },
  { id: 'video_halfway', name: 'Halfway There', icon: '📺', description: 'Watch 4 of 8 sales videos', category: 'videos' },
  { id: 'video_all_complete', name: 'Video Master', icon: '🏆', description: 'Watch all 8 sales videos', category: 'videos' },
  { id: 'video_speed_learner', name: 'Speed Learner', icon: '⚡', description: 'Watch all 8 videos in one day', category: 'videos' },

  // Presentation Training badges
  { id: 'presentation_first_module', name: 'First Lesson', icon: '📖', description: 'Complete first presentation module', category: 'presentation' },
  { id: 'presentation_master', name: 'Presentation Master', icon: '🎓', description: 'Complete all 8 presentation modules', category: 'presentation' },
  { id: 'quiz_perfect', name: 'Perfect Score', icon: '💯', description: 'Score 100% on any quiz', category: 'presentation' },

  // Sales Coach badges
  { id: 'roleplay_rookie', name: 'Role-Play Rookie', icon: '🎭', description: 'Complete 5 role-play sessions', category: 'coach' },
  { id: 'roleplay_expert', name: 'Role-Play Expert', icon: '🎭', description: 'Score 85%+ on 10 role-play sessions', category: 'coach' },
  { id: 'objection_slayer', name: 'Objection Slayer', icon: '🛡️', description: 'Handle all critical objections in simulator', category: 'coach' },

  // EquipIQ badges
  { id: 'equipiq_learner', name: 'Equipment Learner', icon: '🔧', description: 'Complete 3 vendor quizzes', category: 'equipiq' },
  { id: 'equipiq_expert', name: 'Equipment Expert', icon: '🔧', description: 'Complete all 6 vendor quizzes', category: 'equipiq' },

  // Daily Edge badges
  { id: 'streak_7', name: 'Week Warrior', icon: '🔥', description: '7-day Daily Edge streak', category: 'daily_edge' },
  { id: 'streak_30', name: 'Month Master', icon: '🔥', description: '30-day Daily Edge streak', category: 'daily_edge' },
];
```

---

## ACCEPTANCE CRITERIA

### Sales Videos Page
- [ ] `/training/sales-videos` page renders with all 8 video cards
- [ ] Only videos the user has permission for are shown
- [ ] Clicking a card expands to show embedded Vimeo player
- [ ] "Mark as Watched" button tracks completion via API
- [ ] Progress bar shows X/8 videos watched
- [ ] Badge notifications appear when earned
- [ ] sales.pcbancard.com share card at top with Copy/Text/Email share buttons
- [ ] Individual video share buttons copy Vimeo URLs
- [ ] Mobile responsive — cards stack, player fills width

### Feature Permissions
- [ ] New "SALES VIDEOS" category appears in Feature Permissions panel
- [ ] 8 individual video toggles, each independently controllable
- [ ] Toggling a video OFF hides it from that agent's page
- [ ] If ALL 8 are OFF, the nav item is hidden
- [ ] **NO existing toggles or categories are modified or broken**

### Agent Training Detail View
- [ ] `/admin/agent/:userId/training` page renders for admin/manager
- [ ] Shows overall progress percentage
- [ ] Shows video completion detail (which videos, when watched)
- [ ] Shows presentation training module completion with quiz scores
- [ ] Shows sales coach session history with scores
- [ ] Shows EquipIQ quiz and flashcard progress
- [ ] Shows Daily Edge streak info
- [ ] Shows all badges (earned and unearned)
- [ ] "View Training" link accessible from Team Management
- [ ] Gracefully handles missing data (shows "No data yet" if module not tracked)

### General
- [ ] All existing features still work — pipeline, coach, proposals, etc.
- [ ] No existing database tables modified
- [ ] No existing routes broken
- [ ] No existing components modified (only new ones added)

---

## FILE SUMMARY

| File | Action | Purpose |
|------|--------|---------|
| Feature registry (`shared/permissions.ts` or similar) | EDIT | Add `sales_videos` category + 8 entries |
| Feature Permissions panel | EDIT (if needed) | Add `sales_videos` to category order |
| Navigation config | EDIT | Add "Sales Videos" nav item |
| Router / App.tsx | EDIT | Add 2 routes: `/training/sales-videos` + `/admin/agent/:userId/training` |
| `SalesVideosTraining.tsx` | **CREATE** | Sales Videos training page |
| `AgentTrainingDetail.tsx` | **CREATE** | Admin view of individual agent progress |
| `server/routes/trainingRoutes.ts` | **CREATE** | API for video tracking + training overview |
| Database migration | **CREATE** | `video_watch_progress` + `training_achievements` tables |
| Team Management page | EDIT | Add "View Training" link per agent |
