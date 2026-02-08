# PCB Auto — Architecture Addendum v1.2 (Branding, Support & AI Assistant)

**Applies to:** PCB_Auto_Technical_Architecture_v1.md + Addendum v1.1
**Date:** February 8, 2026
**Purpose:** Add shop-level white-label branding, feature request system, live support (Slack + Google Chat), help center, and in-app AI assistant. All features are PCB Auto-only — zero impact on PCBISV.com sales suite.

---

## 1. Shop-Level White-Label Branding

### 1.1 Concept

Every shop that uses PCB Auto brands it as **their own system**. Customer-facing documents (invoices, estimates, approval pages, payment pages, emails, SMS) carry the shop's logo, name, colors, and contact info — never PCB Auto branding. The shop's admin configures this during onboarding or anytime from Settings.

### 1.2 Schema Additions

```sql
-- Add to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS
  pcb_brand_logo_url TEXT,                    -- shop's uploaded logo (stored in S3/R2)
  pcb_brand_logo_width INTEGER DEFAULT 200,   -- display width in pixels
  pcb_brand_primary_color VARCHAR(7) DEFAULT '#1B3A6B',   -- hex color
  pcb_brand_secondary_color VARCHAR(7) DEFAULT '#D4782F',  -- hex color
  pcb_brand_accent_color VARCHAR(7),
  pcb_brand_font VARCHAR(50) DEFAULT 'Inter',
  pcb_brand_tagline VARCHAR(255),             -- e.g., "Your Trusted Auto Care Since 1998"
  pcb_brand_website VARCHAR(255),
  pcb_brand_footer_text TEXT,                 -- custom footer for invoices/emails
  pcb_brand_show_powered_by BOOLEAN DEFAULT FALSE;  -- opt-in "Powered by PCB Auto"
```

### 1.3 What Gets Branded

| Surface | Shop Logo | Shop Colors | Shop Name/Contact | PCB Auto Logo |
|---------|-----------|-------------|-------------------|---------------|
| PDF/Word Invoices | ✅ Top-left | ✅ Headers, lines | ✅ Full header block | ❌ Never shown |
| PDF/Word Estimates | ✅ Top-left | ✅ Headers, lines | ✅ Full header block | ❌ Never shown |
| Customer Approval Page | ✅ Top-center | ✅ Buttons, accents | ✅ Header + footer | ❌ Never shown |
| Customer Payment Page | ✅ Top-center | ✅ Buttons, accents | ✅ Header + footer | ❌ Never shown |
| DVI Report (customer view) | ✅ Top-left | ✅ Section headers | ✅ Header | ❌ Never shown |
| SMS messages | N/A | N/A | ✅ Shop name in text | ❌ |
| Email messages | ✅ In header | ✅ Button colors | ✅ From name + signature | ❌ |
| PCB Auto dashboard (internal) | ✅ Top-left of sidebar | ✅ Optional theme | ✅ Shop name in header | ✅ Small "Powered by" in footer (opt-in only) |

### 1.4 Logo Upload

```
── /api/pcbauto/v1/settings/branding
   GET    /                         Get current branding config
   PUT    /                         Update branding config (colors, font, tagline, etc.)
   POST   /logo                     Upload shop logo (multipart/form-data)
   DELETE /logo                     Remove shop logo (reverts to shop name text)
   GET    /preview                  Generate preview of branded invoice header
```

**Upload rules:**
- Accepted formats: PNG, JPG, SVG, WebP
- Max file size: 2MB
- Recommended dimensions: 400×150 px (auto-resized if larger)
- Stored in cloud storage (Cloudflare R2 or S3) at path: `tenants/{tenantId}/branding/logo.{ext}`
- Served via CDN URL for fast loading on customer-facing pages

### 1.5 Branding Settings Screen

```
┌──────────────────────────────────────────────────────────┐
│  Settings > Branding                                     │
│──────────────────────────────────────────────────────────│
│                                                          │
│  SHOP LOGO                                               │
│  ┌────────────────────────┐                              │
│  │                        │  [Upload Logo]               │
│  │   [current logo or     │  [Remove Logo]               │
│  │    "drag & drop here"] │                              │
│  │                        │  PNG, JPG, SVG, WebP         │
│  └────────────────────────┘  Max 2MB, 400×150px ideal    │
│                                                          │
│  COLORS                                                  │
│  Primary Color:   [#______] [color picker]               │
│  Secondary Color: [#______] [color picker]               │
│  Accent Color:    [#______] [color picker] (optional)    │
│                                                          │
│  SHOP DETAILS (shown on documents)                       │
│  Shop Name:     [______________________________]         │
│  Tagline:       [______________________________]         │
│  Address:       [______________________________]         │
│  Phone:         [______________________________]         │
│  Email:         [______________________________]         │
│  Website:       [______________________________]         │
│                                                          │
│  INVOICE FOOTER                                          │
│  [___________________________________________________]   │
│  [___________________________________________________]   │
│  e.g., "Thank you for choosing Smith Auto! 90-day        │
│   warranty on all repairs."                              │
│                                                          │
│  ☐ Show "Powered by PCB Auto" in footer (opt-in)        │
│                                                          │
│  [PREVIEW INVOICE]              [SAVE CHANGES]           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 1.6 Invoice/Estimate Header Template

```
┌──────────────────────────────────────────────────────────┐
│  [SHOP LOGO]            INVOICE #1234                    │
│                                                          │
│  Smith's Auto Repair        Date: Feb 8, 2026            │
│  "Your Trusted Auto Care"   Due: Feb 15, 2026            │
│  123 Main St, Suite 4                                    │
│  Indianapolis, IN 46032     BILL TO:                     │
│  (317) 555-1234             John Smith                   │
│  service@smithauto.com      456 Oak Ave                  │
│  smithautorepair.com        Carmel, IN 46033             │
│                             (317) 555-5678               │
│──────────────────────────────────────────────────────────│
│  ... line items ...                                      │
│──────────────────────────────────────────────────────────│
│  Thank you for choosing Smith Auto! 90-day warranty      │
│  on all repairs.                                         │
│                                                          │
│  [Pay Now: https://shop.pcbisv.com/public/pay/xxx]       │
└──────────────────────────────────────────────────────────┘
```

No PCB Auto branding anywhere. The shop owns the entire customer experience.

---

## 2. Feature Request System

### 2.1 Concept

Shop admins can submit feature requests, bug reports, and suggestions directly from within PCB Auto. They can describe what they need, drag-and-drop screenshots/screen recordings, vote on existing requests, and track status. This gives PCBISV product team direct feedback without external tools.

### 2.2 Schema

```sql
CREATE TABLE pcb_feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(20) NOT NULL CHECK (type IN (
    'feature', 'bug', 'improvement', 'question'
  )),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'submitted'
    CHECK (status IN (
      'submitted', 'under_review', 'planned', 'in_progress',
      'completed', 'declined', 'duplicate'
    )),
  admin_response TEXT,                       -- PCBISV team response
  admin_responded_at TIMESTAMPTZ,
  vote_count INTEGER DEFAULT 1,
  category VARCHAR(50),                      -- 'payments', 'estimates', 'scheduling', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pcb_feature_request_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES pcb_feature_requests(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,                    -- cloud storage URL
  file_type VARCHAR(50) NOT NULL,            -- 'image/png', 'image/jpeg', 'video/mp4', etc.
  file_size INTEGER NOT NULL,                -- bytes
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pcb_feature_request_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES pcb_feature_requests(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feature_request_id, user_id)        -- one vote per user
);

CREATE INDEX idx_pcb_fr_tenant ON pcb_feature_requests(tenant_id, created_at DESC);
CREATE INDEX idx_pcb_fr_status ON pcb_feature_requests(status);
CREATE INDEX idx_pcb_fr_votes ON pcb_feature_requests(vote_count DESC);

ALTER TABLE pcb_feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcb_feature_request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcb_feature_request_votes ENABLE ROW LEVEL SECURITY;
```

### 2.3 API Endpoints

```
── /api/pcbauto/v1/feature-requests
   GET    /                         List requests (own shop's + public roadmap items)
   POST   /                         Submit new request
   GET    /:id                      Get request detail + attachments
   PUT    /:id                      Edit own request
   DELETE /:id                      Delete own request
   POST   /:id/vote                 Upvote a request
   DELETE /:id/vote                 Remove upvote
   POST   /:id/attachments          Upload screenshot/file (multipart, drag-and-drop)
   DELETE /:id/attachments/:attId   Remove attachment

── /api/pcbauto/v1/admin/feature-requests   (PCBISV admin only)
   GET    /                         List ALL requests across tenants
   PATCH  /:id/status               Update status
   POST   /:id/respond              Post admin response
```

### 2.4 Feature Request Screen (shop admin view)

```
┌──────────────────────────────────────────────────────────┐
│  Help & Support > Feature Requests                       │
│──────────────────────────────────────────────────────────│
│                                                          │
│  [+ New Request]                          Filter: [All ▾]│
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 🟢 PLANNED  "Add tire inventory tracking"        │    │
│  │ Submitted by you · 12 votes · Jan 15             │    │
│  │ Admin: "Great idea — scheduled for Q2 release"   │    │
│  │ [▲ Voted]                                        │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 🟡 UNDER REVIEW  "Export reports to Excel"       │    │
│  │ Submitted by you · 3 votes · Feb 1               │    │
│  │ 📎 2 screenshots attached                        │    │
│  │ [▲ Vote]                                         │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2.5 New Request Modal (with drag-and-drop)

```
┌──────────────────────────────────────────────────────────┐
│  Submit a Request                              [✕ Close] │
│──────────────────────────────────────────────────────────│
│                                                          │
│  Type:  (•) Feature  ( ) Bug  ( ) Improvement  ( ) Q    │
│                                                          │
│  Category: [Payments ▾]                                  │
│                                                          │
│  Title: [Short description of what you need________]     │
│                                                          │
│  Details:                                                │
│  [___________________________________________________]   │
│  [___________________________________________________]   │
│  [___________________________________________________]   │
│                                                          │
│  Screenshots / Files:                                    │
│  ┌──────────────────────────────────────────────────┐    │
│  │                                                  │    │
│  │     📎 Drag & drop files here                    │    │
│  │        or click to browse                        │    │
│  │                                                  │    │
│  │     PNG, JPG, GIF, MP4 · Max 10MB each          │    │
│  │     Up to 5 files per request                    │    │
│  │                                                  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  [screenshot1.png ✕] [screenshot2.png ✕]                 │
│                                                          │
│  Priority: ( ) Low  (•) Normal  ( ) High  ( ) Critical   │
│                                                          │
│                                    [Cancel] [SUBMIT]     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Upload rules:**
- Accepted: PNG, JPG, GIF, WebP, MP4, MOV, PDF
- Max per file: 10MB
- Max files per request: 5
- Stored in cloud storage at: `tenants/{tenantId}/feature-requests/{requestId}/{filename}`
- Drag-and-drop zone uses HTML5 Drag and Drop API + file input fallback

---

## 3. Live Support System

### 3.1 Concept

Shop users can get live help from the PCBISV support team directly inside PCB Auto. The PCBISV team manages support conversations from either **Slack** or **Google Chat** (configurable at the PCBISV admin level — not per shop). Messages flow bidirectionally in real-time.

### 3.2 Architecture

```
┌──────────────────────┐         ┌──────────────────────┐
│   PCB Auto App       │         │   PCBISV Support     │
│   (Shop User)        │         │   Team               │
│                      │         │                      │
│  ┌────────────────┐  │  WS/API │  ┌────────────────┐  │
│  │ Chat Widget    │──│─────────│──│ Slack Channel   │  │
│  │ (bottom-right) │  │         │  │  OR             │  │
│  │                │  │         │  │ Google Chat     │  │
│  └────────────────┘  │         │  │ Space           │  │
│                      │         │  └────────────────┘  │
└──────────────────────┘         └──────────────────────┘
         │                                │
         ▼                                ▼
┌──────────────────────────────────────────────────────┐
│                PCB Auto Backend                       │
│                                                       │
│  pcb_support_conversations  ←→  Slack/GChat Webhook  │
│  pcb_support_messages       ←→  Slack/GChat API      │
│                                                       │
│  Support Adapter Interface:                           │
│  ┌─────────────────┐  ┌─────────────────┐            │
│  │ SlackAdapter     │  │ GoogleChatAdapter│            │
│  │ (Bot + Webhooks) │  │ (Bot + Webhooks)│            │
│  └─────────────────┘  └─────────────────┘            │
└──────────────────────────────────────────────────────┘
```

### 3.3 Schema

```sql
CREATE TABLE pcb_support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  subject VARCHAR(255),
  status VARCHAR(20) DEFAULT 'open'
    CHECK (status IN ('open', 'waiting_reply', 'resolved', 'closed')),
  priority VARCHAR(20) DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  external_thread_id VARCHAR(255),           -- Slack thread_ts or Google Chat thread name
  external_channel_id VARCHAR(255),          -- Slack channel ID or Google Chat space ID
  assigned_agent VARCHAR(255),               -- support agent name
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pcb_support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES pcb_support_conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'agent', 'system')),
  sender_name VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  attachment_urls TEXT[] DEFAULT '{}',
  external_message_id VARCHAR(255),          -- Slack/GChat message ID
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_support_conv_tenant ON pcb_support_conversations(tenant_id, status);
CREATE INDEX idx_pcb_support_msgs ON pcb_support_messages(conversation_id, created_at);

ALTER TABLE pcb_support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcb_support_messages ENABLE ROW LEVEL SECURITY;
```

### 3.4 Support Chat Widget (in-app)

Floating button in bottom-right corner of every PCB Auto screen. Opens a slide-up chat panel.

```
                                    ┌─────────────────────┐
                                    │ 💬 Support    [─ ✕] │
                                    │─────────────────────│
                                    │                     │
                                    │ [Agent] Hi! How can │
                                    │ I help you today?   │
                                    │              2:30pm │
                                    │                     │
                                    │ [You] I'm having    │
                                    │ trouble connecting   │
                                    │ my terminal          │
                                    │              2:31pm │
                                    │                     │
                                    │ [Agent] Let me walk │
                                    │ you through the     │
                                    │ setup...            │
                                    │              2:32pm │
                                    │                     │
                                    │─────────────────────│
                                    │ [Type a message...] │
                                    │ [📎] [📷]    [Send] │
                                    └─────────────────────┘

                              [💬 Support]  ← floating button
```

**Features:**
- Real-time messaging (WebSocket via Socket.IO, already in stack)
- File/screenshot attachments
- Message history persisted across sessions
- Typing indicators
- Read receipts
- "Leave a message" mode when no agents are online (queued for next available)
- Auto-context: when opening chat, system silently attaches current page, tenant info, and user role so the agent has context

### 3.5 Support Adapter Interface

```typescript
// interfaces/support.ts

interface SupportMessage {
  conversationId: string;
  senderType: 'user' | 'agent' | 'system';
  senderName: string;
  body: string;
  attachmentUrls?: string[];
}

interface SupportAdapter {
  name: string;  // 'slack' or 'google_chat'

  // Create a new thread for a support conversation
  createThread(
    channelId: string,
    shopName: string,
    userName: string,
    subject: string,
    initialMessage: string
  ): Promise<{ threadId: string }>;

  // Send a message to an existing thread
  sendToThread(
    channelId: string,
    threadId: string,
    message: string,
    attachments?: string[]
  ): Promise<{ messageId: string }>;

  // Parse inbound webhook (agent replies from Slack/GChat)
  parseWebhook(
    headers: Record<string, string>,
    body: string
  ): Promise<{
    threadId: string;
    senderName: string;
    message: string;
    attachments?: string[];
  }>;

  // Verify webhook signature
  verifySignature(headers: Record<string, string>, body: string): boolean;
}
```

### 3.6 Slack Adapter

```typescript
// adapters/slack-support.ts

class SlackSupportAdapter implements SupportAdapter {
  name = 'slack';
  private botToken: string;       // xoxb-...
  private signingSecret: string;
  private supportChannelId: string;

  constructor(config: {
    botToken: string;
    signingSecret: string;
    supportChannelId: string;
  }) {
    this.botToken = config.botToken;
    this.signingSecret = config.signingSecret;
    this.supportChannelId = config.supportChannelId;
  }

  async createThread(
    channelId: string,
    shopName: string,
    userName: string,
    subject: string,
    initialMessage: string
  ): Promise<{ threadId: string }> {
    // POST to Slack chat.postMessage API
    // Channel: support channel
    // Text: formatted with shop name, user, subject
    // Returns: ts (timestamp) which serves as thread_ts
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId || this.supportChannelId,
        text: `🔧 *New Support Request*\n*Shop:* ${shopName}\n*User:* ${userName}\n*Subject:* ${subject}\n\n${initialMessage}`,
        unfurl_links: false,
      }),
    });
    const data = await response.json();
    return { threadId: data.ts };
  }

  async sendToThread(
    channelId: string,
    threadId: string,
    message: string,
    attachments?: string[]
  ): Promise<{ messageId: string }> {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId || this.supportChannelId,
        thread_ts: threadId,
        text: message,
      }),
    });
    const data = await response.json();
    return { messageId: data.ts };
  }

  // Inbound: Slack Events API sends webhook when agent replies in thread
  // Webhook endpoint: /api/pcbauto/v1/webhooks/slack/support
}
```

### 3.7 Google Chat Adapter

```typescript
// adapters/gchat-support.ts

class GoogleChatSupportAdapter implements SupportAdapter {
  name = 'google_chat';
  private serviceAccountKey: object;  // Google service account JSON
  private spaceId: string;            // Google Chat space for support

  constructor(config: {
    serviceAccountKey: object;
    spaceId: string;
  }) {
    this.serviceAccountKey = config.serviceAccountKey;
    this.spaceId = config.spaceId;
  }

  async createThread(
    channelId: string,
    shopName: string,
    userName: string,
    subject: string,
    initialMessage: string
  ): Promise<{ threadId: string }> {
    // POST to Google Chat API: spaces/{spaceId}/messages
    // With threadKey to create a new thread
    // Returns: message.thread.name as threadId
    const token = await this.getAccessToken();
    const response = await fetch(
      `https://chat.googleapis.com/v1/spaces/${channelId || this.spaceId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `🔧 *New Support Request*\n*Shop:* ${shopName}\n*User:* ${userName}\n*Subject:* ${subject}\n\n${initialMessage}`,
          thread: { threadKey: `support-${Date.now()}` },
        }),
      }
    );
    const data = await response.json();
    return { threadId: data.thread.name };
  }

  // Inbound: Google Chat App webhook when agent replies in thread
  // Webhook endpoint: /api/pcbauto/v1/webhooks/gchat/support
}
```

### 3.8 PCBISV Admin Config

In the PCBISV admin panel (app.pcbisv.com), NOT visible to shops:

```
Settings > PCB Auto Support Configuration

Support Channel:  (•) Slack  ( ) Google Chat

[Slack Configuration]
Bot Token:           [xoxb-*****________________]
Signing Secret:      [*****_____________________]
Support Channel ID:  [C0123456789_______________]
[Test Connection]

[Google Chat Configuration]
Service Account Key: [Upload JSON ▾]
Space ID:            [spaces/AAAA_______________]
[Test Connection]

Business Hours:
  Mon-Fri: [8:00 AM] to [6:00 PM] [EST ▾]
  Sat:     [9:00 AM] to [1:00 PM]
  Sun:     [Closed]

Auto-reply (outside hours):
  [Thanks for reaching out! Our support team is
   available Mon-Fri 8am-6pm EST. We'll respond
   to your message first thing next business day.]
```

---

## 4. Help Center & Knowledge Base

### 4.1 Concept

A searchable help center built into PCB Auto that shops can access anytime. Articles are authored by the PCBISV team and displayed in-app. No external help desk tool required for v1.

### 4.2 Schema

```sql
CREATE TABLE pcb_help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,                        -- Markdown content
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(50),
  tags TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  helpful_yes INTEGER DEFAULT 0,
  helpful_no INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_help_search ON pcb_help_articles
  USING gin(to_tsvector('english', title || ' ' || body));
CREATE INDEX idx_pcb_help_category ON pcb_help_articles(category, sort_order);
```

### 4.3 Help Menu Structure

Accessible from a **[?] Help** button in the top navigation bar of PCB Auto:

```
┌──────────────────────────────────────────────────────────┐
│  Help Center                                    [✕]      │
│──────────────────────────────────────────────────────────│
│                                                          │
│  🔍 [Search help articles...                        ]    │
│                                                          │
│  QUICK START                                             │
│  ├── Setting up your shop                                │
│  ├── Creating your first estimate                        │
│  ├── Sending an estimate for approval                    │
│  └── Collecting your first payment                       │
│                                                          │
│  CATEGORIES                                              │
│  📋 Estimates & Invoices (12 articles)                   │
│  💳 Payments & Terminals (8 articles)                    │
│  👥 Customers & Vehicles (6 articles)                    │
│  📅 Scheduling (4 articles)                              │
│  🔧 Parts & Labor (5 articles)                           │
│  📊 Reports (7 articles)                                 │
│  ⚙️ Settings & Configuration (9 articles)                │
│  🔗 Integrations (QuickBooks, PartsTech) (5 articles)    │
│                                                          │
│  ──────────────────────────────────────────────          │
│  Can't find what you need?                               │
│  [💬 Chat with Support]  [📝 Submit a Request]           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 4.4 Contextual Help

On key screens, a small **[?]** icon appears next to complex features. Clicking it opens the relevant help article in a slide-over panel without leaving the current page.

| Screen | Contextual Help Trigger |
|--------|------------------------|
| Estimate builder | "How dual pricing works" link next to card/cash totals |
| Approval page | "Understanding customer approvals" |
| Payment screen | "Terminal troubleshooting" + "Payment link FAQ" |
| Tax settings | "Setting up sales tax for your state" |
| QuickBooks connect | "Connecting QuickBooks Online" |
| PartsTech | "Using PartsTech for parts lookup" |
| Reports | "Understanding your P&L report" |

### 4.5 API Endpoints

```
── /api/pcbauto/v1/help
   GET    /articles                 List articles (search, category filter)
   GET    /articles/:slug           Get single article
   POST   /articles/:slug/helpful   Record helpful vote (yes/no)

── /api/pcbauto/v1/admin/help       (PCBISV admin only)
   POST   /articles                 Create article
   PUT    /articles/:id             Update article
   DELETE /articles/:id             Delete article
   GET    /analytics                Help article view counts + ratings
```

---

## 5. In-App AI Assistant

### 5.1 Concept

An AI-powered assistant embedded in PCB Auto that helps shop users with anything they need — answering questions about the app, explaining features, helping draft customer messages, interpreting reports, troubleshooting issues, and guiding workflows. It's contextually aware of the current page and the shop's data.

### 5.2 Implementation

Uses the Anthropic API (Claude) via the PCB Auto backend. The assistant has access to:
- Help center articles (injected as context)
- Current page context (what screen the user is on)
- Shop configuration (tax rules, pricing, etc.)
- General PCB Auto documentation

It does **NOT** have access to:
- Customer PII (no card numbers, no SSNs)
- Payment gateway credentials
- Other tenants' data

### 5.3 Architecture

```
┌─────────────────────┐
│  PCB Auto Frontend   │
│                      │
│  ┌────────────────┐  │     POST /api/pcbauto/v1/assistant/chat
│  │ 🤖 AI Assistant│──│─────────────────────────────────────┐
│  │    Panel       │  │                                     │
│  └────────────────┘  │                                     ▼
└──────────────────────┘                          ┌──────────────────┐
                                                  │  PCB Auto Backend │
                                                  │                  │
                                                  │  Build prompt:   │
                                                  │  • System prompt │
                                                  │  • Help articles │
                                                  │  • Page context  │
                                                  │  • Shop config   │
                                                  │  • Chat history  │
                                                  │                  │
                                                  │  POST to Claude  │
                                                  │  API (streaming) │
                                                  └──────────────────┘
                                                           │
                                                           ▼
                                                  ┌──────────────────┐
                                                  │  Anthropic API   │
                                                  │  (Claude Sonnet) │
                                                  └──────────────────┘
```

### 5.4 Schema

```sql
CREATE TABLE pcb_assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pcb_assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES pcb_assistant_conversations(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  page_context VARCHAR(100),      -- which screen the user was on
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_asst_conv ON pcb_assistant_conversations(tenant_id, user_id, updated_at DESC);
CREATE INDEX idx_pcb_asst_msgs ON pcb_assistant_messages(conversation_id, created_at);

ALTER TABLE pcb_assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcb_assistant_messages ENABLE ROW LEVEL SECURITY;
```

### 5.5 AI Assistant Panel

Accessible via a **[🤖 Assistant]** button next to the Help button, or a keyboard shortcut (Cmd/Ctrl + K):

```
┌──────────────────────────────────────────────────────────┐
│  🤖 PCB Auto Assistant                          [─ ✕]   │
│──────────────────────────────────────────────────────────│
│                                                          │
│  Hi! I'm your PCB Auto assistant. I can help you         │
│  with anything in the app — ask me about features,       │
│  troubleshoot issues, or get guidance on workflows.      │
│                                                          │
│  ┌────────────────────────────────────────────────┐      │
│  │ Quick actions:                                 │      │
│  │ • "How do I set up dual pricing?"              │      │
│  │ • "Help me create an estimate"                 │      │
│  │ • "What does this report mean?"                │      │
│  │ • "Draft a follow-up message for a customer"   │      │
│  │ • "Why was my QuickBooks sync failing?"        │      │
│  └────────────────────────────────────────────────┘      │
│                                                          │
│  [You] How do I change the cash discount percentage?     │
│                                                          │
│  [🤖] To change your cash discount percentage:           │
│                                                          │
│  Go to Settings > Pricing Rules. You'll see the          │
│  "Cash Discount %" field — enter your desired rate       │
│  (most shops use 3.5% to 3.99%). This applies to all    │
│  new estimates. Existing estimates keep their original    │
│  rate.                                                   │
│                                                          │
│  Want me to walk you through it step by step?            │
│                                                          │
│──────────────────────────────────────────────────────────│
│  [Ask anything about PCB Auto...              ]  [Send]  │
└──────────────────────────────────────────────────────────┘
```

### 5.6 AI System Prompt (backend)

```typescript
const ASSISTANT_SYSTEM_PROMPT = `
You are the PCB Auto in-app assistant. PCB Auto is a shop management platform
for auto repair shops. You help shop owners, service advisors, and technicians
use the app effectively.

Your capabilities:
- Explain any PCB Auto feature
- Walk users through workflows step-by-step
- Troubleshoot common issues (terminal connectivity, QuickBooks sync, etc.)
- Help draft customer communications (follow-up texts, estimate notes)
- Explain reports and metrics
- Answer questions about dual pricing compliance

Your rules:
- Be concise and practical — shop workers are busy
- Reference specific screens and buttons by name
- If you don't know something, say so and suggest contacting support
- Never share technical implementation details or API information
- Never access or discuss other shops' data
- Always frame dual pricing as "cash discount" (never "surcharge")

Current context:
- Shop: {shopName}
- User: {userName} ({userRole})
- Current page: {currentPage}
- Shop state: {shopState}
- Dual pricing: {cashDiscountPct}%
`;
```

### 5.7 API Endpoints

```
── /api/pcbauto/v1/assistant
   POST   /chat                     Send message, get streaming response
   GET    /conversations            List past conversations
   GET    /conversations/:id        Get conversation history
   DELETE /conversations/:id        Delete a conversation
```

### 5.8 Usage Limits

To manage Anthropic API costs:
- Rate limit: 20 messages per user per hour
- Message length: 2,000 characters max per message
- Conversation context: last 20 messages included in API call
- Model: Claude Sonnet (fast, cost-effective for support use case)
- Streaming responses for real-time UX

---

## 6. Navigation Updates

The PCB Auto top navigation bar now includes:

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Shop Logo]  Dashboard  ROs  Customers  Schedule  Parts  Reports    │
│              Settings                     [🤖 Assistant] [? Help]   │
│                                           [💬 Support]              │
└──────────────────────────────────────────────────────────────────────┘
```

**Settings sub-navigation gains:**
- Settings > Branding (new — logo, colors, footer)
- Settings > Feature Requests (new)

**Help button opens:** Help center slide-over panel
**Assistant button opens:** AI assistant slide-over panel
**Support button (floating):** Live chat widget (bottom-right)

---

## 7. Isolation Guarantee

All features in this addendum are **PCB Auto-only**:

| Component | PCB Auto (shop.pcbisv.com) | PCBISV Admin (app.pcbisv.com) |
|-----------|---------------------------|-------------------------------|
| Shop branding config | ✅ Shop admin can edit | ✅ Can view/override |
| Feature requests | ✅ Submit + vote | ✅ Manage all + respond |
| Live support chat | ✅ Chat widget | ✅ Slack/GChat config |
| Help center | ✅ Read articles | ✅ Author/edit articles |
| AI assistant | ✅ Chat with assistant | ❌ Not applicable |
| PCBISV sales tools | ❌ Not visible | ✅ Existing functionality unchanged |

**Database isolation:** All new tables are prefixed `pcb_` and scoped by `tenant_id` with RLS. No changes to any existing PCBISV tables.

**Route isolation:** All new endpoints are under `/api/pcbauto/v1/` and require the `portal: 'pcbauto'` JWT claim.

---

## 8. Phase Assignment

| Feature | Phase | Week (within phase) |
|---------|-------|-------------------|
| Shop branding (logo upload, colors, invoice template) | Phase 1 | Week 1 (part of setup) |
| Help center (static articles, search) | Phase 1 | Week 6 (polish) |
| Feature request system | Phase 2 | Week 8 |
| Live support (Slack integration first) | Phase 2 | Week 9 |
| Google Chat adapter | Phase 2 | Week 10 |
| AI assistant | Phase 3 | Week 11 |
| Contextual help triggers on all screens | Phase 3 | Week 12 |
