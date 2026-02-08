# PCB Auto — Intelligent AI Assistant

**For:** Replit AI / Developer
**Date:** February 8, 2026
**Purpose:** Build a context-aware AI assistant that lives on every page of PCB Auto and can guide shop owners, service advisors, and technicians through any process on the platform.

---

## 1. What This Is

A floating chat assistant accessible from every screen in PCB Auto. The merchant taps a button, asks a question or describes what they're trying to do, and the AI walks them through it step-by-step — aware of which page they're on, what RO they're looking at, and what their shop's configuration looks like.

Think of it as a smart employee who memorized the entire user manual and can see the merchant's screen.

---

## 2. UI Component

### 2.1 Floating Trigger Button

A persistent floating button in the bottom-right corner of every page:

```
Position: fixed
Bottom: 24px
Right: 24px
Size: 56px circle (mobile: 52px)
Background: #111827 (matches PCB Auto nav)
Icon: 💬 or a subtle AI sparkle icon ✦
Z-index: 9990 (above everything except modals)
Shadow: 0 4px 20px rgba(0,0,0,0.25)
Badge: Pulse animation on first visit (draws attention once)
```

On hover/tap, expands slightly (scale 1.05) with tooltip: "Need help? Ask me anything"

### 2.2 Chat Panel

Slides in from the bottom-right when triggered:

```
Desktop: 400px wide × 560px tall, anchored bottom-right
Mobile: Full-width, 85vh tall, slides up from bottom (sheet style)
Border-radius: 16px (desktop), 16px 16px 0 0 (mobile)
Background: white
Shadow: 0 12px 48px rgba(0,0,0,0.2)
```

**Panel Layout (top to bottom):**

```
┌──────────────────────────────────┐
│ ✦ PCB Auto Assistant        ✕   │  ← Header (48px, dark bg)
│ Currently on: Repair Orders      │  ← Context indicator (subtle)
├──────────────────────────────────┤
│                                  │
│  👋 Hi! I'm your PCB Auto       │  ← Welcome message
│  assistant. Ask me anything      │
│  about the platform, or pick     │
│  from common questions below.    │
│                                  │
│  ┌──────────────────────────┐   │  ← Quick action chips
│  │ How do I create an RO?   │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ Walk me through an       │   │
│  │ inspection                │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ How does dual pricing    │   │
│  │ work?                    │   │
│  └──────────────────────────┘   │
│                                  │
│  ... conversation messages ...   │
│                                  │
├──────────────────────────────────┤
│ Ask anything...          ➤ Send  │  ← Input bar (pinned bottom)
└──────────────────────────────────┘
```

### 2.3 Quick Action Chips

The quick action chips change based on which page the user is on:

| Current Page | Quick Action Chips |
|---|---|
| Dashboard | "What do my stats mean?" · "How do I create an RO?" · "Show me around" |
| Repair Orders (list/board) | "How do I create an RO?" · "What do the board columns mean?" · "How do I search for an RO?" |
| RO Detail | "How do I add parts?" · "How do I send this estimate?" · "How does dual pricing work?" · "Take payment on this RO" |
| Digital Inspection | "Walk me through an inspection" · "How do photos work?" · "What's the difference between watch and bad?" |
| Scheduling | "How do I add an appointment?" · "How do bays work?" · "Can I drag appointments?" |
| Customers | "How do I add a customer?" · "How do I look up service history?" · "How do I add a vehicle?" |
| Parts | "How do I search PartsTech?" · "How does parts markup work?" · "How do I receive parts?" |
| Settings | "How do I set up dual pricing?" · "How do I add an employee?" · "How do I connect PartsTech?" |
| Reports | "What reports are available?" · "How do I see my daily revenue?" · "What is fees saved?" |
| Payments | "How does cash vs card pricing work?" · "How do I email a receipt?" · "How do I process a refund?" |

### 2.4 Message Bubbles

**User messages:** Right-aligned, dark background (#111827), white text, rounded corners
**Assistant messages:** Left-aligned, light gray background (#f3f4f6), dark text, rounded corners
**Step-by-step guides:** Numbered steps with checkboxes the user can tap to mark as done
**Links:** Inline links that navigate to the relevant page when tapped (e.g., "Go to Settings → Dual Pricing")

### 2.5 Persistence

- Chat history persists within the session (survives page navigation)
- Clears on logout or after 24 hours of inactivity
- Store in React state / context (not localStorage for V1 — keep it simple)

---

## 3. Context Awareness

The assistant knows where the user is and what they're looking at. This context is injected into every API call automatically — the user never has to explain what screen they're on.

### 3.1 Context Object (sent with every message)

```typescript
interface AssistantContext {
  // Page context
  currentPage: string;           // 'dashboard' | 'repair-orders' | 'ro-detail' | 'inspections' | etc.
  currentUrl: string;            // Full URL path
  
  // Entity context (what they're looking at)
  roNumber?: string;             // If on an RO detail page
  roStatus?: string;             // 'estimate' | 'approved' | 'in-progress' | etc.
  customerName?: string;         // If viewing a customer or RO
  vehicleInfo?: string;          // "2019 Ford F-150 XLT" if applicable
  
  // Shop context
  shopName: string;
  userRole: string;              // 'admin' | 'advisor' | 'technician'
  userName: string;
  
  // Configuration context
  dualPricingEnabled: boolean;
  dualPricingRate: number;       // e.g. 3.49
  partsTechConnected: boolean;
  hasEmployees: boolean;         // Whether staff have been added
  hasBays: boolean;              // Whether bays have been configured
}
```

### 3.2 How to Capture Context

```typescript
// In your top-level App or Layout component:

function useAssistantContext(): AssistantContext {
  const location = useLocation();         // React Router
  const { user, shop } = useAuth();       // Your auth context
  const { currentRO } = useROContext();   // If you have an RO context
  
  // Derive page name from URL
  const getPageName = (path: string): string => {
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path === '/repair-orders') return 'repair-orders';
    if (path.startsWith('/repair-orders/')) return 'ro-detail';
    if (path.startsWith('/inspections')) return 'inspections';
    if (path === '/scheduling') return 'scheduling';
    if (path === '/customers') return 'customers';
    if (path.startsWith('/customers/')) return 'customer-detail';
    if (path === '/parts') return 'parts';
    if (path === '/reports') return 'reports';
    if (path === '/settings') return 'settings';
    if (path.startsWith('/settings/')) return 'settings-' + path.split('/').pop();
    return 'unknown';
  };
  
  return {
    currentPage: getPageName(location.pathname),
    currentUrl: location.pathname,
    roNumber: currentRO?.roNumber,
    roStatus: currentRO?.status,
    customerName: currentRO?.customer?.name,
    vehicleInfo: currentRO ? `${currentRO.vehicle.year} ${currentRO.vehicle.make} ${currentRO.vehicle.model}` : undefined,
    shopName: shop?.name || 'Your Shop',
    userRole: user?.role || 'admin',
    userName: user?.firstName || 'there',
    dualPricingEnabled: shop?.dualPricingEnabled ?? true,
    dualPricingRate: shop?.surchargeRate ?? 3.49,
    partsTechConnected: shop?.partsTechConnected ?? false,
    hasEmployees: (shop?.employeeCount || 0) > 1,
    hasBays: (shop?.bayCount || 0) > 0,
  };
}
```

---

## 4. System Prompt (Knowledge Base)

This is the system prompt sent to Claude with every request. It contains the complete knowledge of PCB Auto. This is the brain of the assistant.

```typescript
const SYSTEM_PROMPT = `
You are the PCB Auto Assistant — a helpful, knowledgeable guide built into the PCB Auto shop management platform. You help auto repair shop owners, service advisors, and technicians use every feature of the platform.

## YOUR PERSONALITY
- Talk like a knowledgeable coworker, not a customer support bot
- Be direct and concise — shop people are busy
- Use plain English, no jargon unless it's industry terms they already know
- When walking someone through steps, number them clearly
- If they're on a specific page, reference what they can see right now
- Never say "I'm just an AI" — you're the PCB Auto Assistant, period
- If asked something outside your knowledge (like accounting advice), say "That's outside what I can help with — but I can show you how to run your reports so you can share them with your accountant."

## YOUR CONTEXT
You receive context about:
- What PAGE the user is currently on
- What RO, customer, or vehicle they're looking at (if any)
- Their role (admin, advisor, technician)
- Their shop configuration (dual pricing rate, whether PartsTech is connected, etc.)

Use this context to give specific, relevant answers. For example:
- If they ask "how do I add parts" and they're on an RO detail page, tell them to tap the "Add Parts from PartsTech" button they can see right now
- If they ask "how do I add parts" from the dashboard, tell them to open the RO first, then add parts

## PCB AUTO — COMPLETE FEATURE KNOWLEDGE

### DASHBOARD
The dashboard shows today's key metrics:
- Car count (vehicles in shop today)
- Revenue (today's collected payments)
- Pending approvals (estimates sent but not yet approved by customer)
- Pending payments (work complete, invoice not paid yet)
- Fees saved: how much the shop saved by using dual pricing (cash customers avoid the processing fee, the shop keeps the difference)
- Cash vs card revenue breakdown (donut chart)
- Upcoming appointments (next 3)
- ROs needing attention (overdue or stalled)
- Quick actions: "New RO" and "Quick Customer Search"

### REPAIR ORDERS (ROs)
An RO (Repair Order) is the core of everything. It tracks a single visit for a single vehicle.

**Creating an RO:**
1. Tap "New RO" from the dashboard or the RO page
2. Select or create a customer
3. Select or add a vehicle (can VIN-decode to auto-fill year/make/model/engine)
4. Add service lines — labor, parts, fees
5. The estimate builds in real time with dual pricing totals at the bottom

**RO Board (Kanban view):**
Columns represent status: Estimate → Sent → Approved → In Progress → Waiting Parts → Completed → Invoiced → Paid
- Drag cards between columns to change status
- Click a card to open the full RO detail

**RO List View:**
Toggle from board to list for a sortable, searchable table of all ROs.

**RO Detail Page:**
- Header: customer, vehicle, RO number, status
- Estimate builder: add/edit labor lines, parts lines, fees, discounts
- Running totals bar (always visible): Parts total, Labor total, Tax, Cash Total, Card Total
- Timeline sidebar: every event on this RO in chronological order (created, estimate sent, customer approved, payment received, etc.)
- Action buttons: Send for Approval, Generate Invoice, Take Payment, Email, Print, Text

### DUAL PRICING
Dual pricing shows two prices on every estimate, invoice, and receipt:
- **Cash Price** — the base price (subtotal + tax)
- **Card Price** — the cash price + a credit card surcharge

The surcharge rate is configurable in Settings (default: 3.49%). Legal limit is 4% in most states.

How it works for the customer:
- They see BOTH prices on the estimate
- They choose: pay cash and save, or pay card and pay the listed card price
- The surcharge is always disclosed — on the estimate, the invoice, and the receipt
- This is fully legal and compliant when disclosed properly

How it works for the shop:
- If the customer pays cash: shop collects the cash price, zero processing fees
- If the customer pays card: shop collects the card price, which covers the processing fee
- Either way, the shop nets the same amount — that's the point

**Settings location:** Settings → Dual Pricing
- Adjustable surcharge rate (3.00%–4.00%)
- Quick presets: 3.00%, 3.25%, 3.49%, 3.75%, 3.99%
- Live preview shows how both prices change

### ESTIMATES & APPROVALS
After building an RO estimate:
1. Tap "Send for Approval" — this texts or emails the customer a link
2. Customer opens the link on their phone (no login required)
3. They see the full estimate with dual pricing (cash vs card)
4. They can approve, decline, or defer individual line items
5. They e-sign at the bottom
6. The RO updates to "Approved" status automatically
7. The advisor gets a notification

### DIGITAL VEHICLE INSPECTIONS (DVI)
A DVI is a digital multi-point inspection performed by a technician on a tablet.

**How to do an inspection:**
1. Open the RO for the vehicle
2. Tap "Start Inspection" (or go to the Inspections page)
3. The 72-point checklist appears, organized by category:
   - Engine Bay (10 items)
   - Under Vehicle (12 items)
   - Brakes (8 items)
   - Tires & Wheels (9 items)
   - Electrical (8 items)
   - Fluids (6 items)
   - Interior (7 items)
   - Exterior (6 items)
   - Road Test (6 items)

4. For each item, the tech taps one of three buttons:
   - ✅ GOOD (green) — passes inspection
   - ⚠️ WATCH (yellow) — monitor, may need attention soon
   - ❌ BAD (red) — needs immediate repair

5. For Watch and Bad items, the tech can:
   - Add notes (text)
   - Take a photo (opens the tablet camera)
   - Add estimated repair cost

6. Speed features:
   - "Mark All Green" button — marks all items in a category as Good with one tap
   - Auto-save on every tap — no save button needed
   - Auto-advance to next item after tapping Good
   - Measurement inputs auto-flag (e.g., 3mm brake pads auto-suggest Watch or Bad)

7. When done, tap "Complete Inspection"
8. The system generates a customer-facing report with:
   - Color-coded summary (X green, Y yellow, Z red)
   - Photos of problem areas
   - Estimated costs for recommended repairs
9. Send the report to the customer via text or email — they see a clean, visual report
10. Items marked Bad can be converted to service lines on the RO with one tap

### PARTS ORDERING
PCB Auto integrates with PartsTech for parts search and ordering.

**Using PartsTech from an RO:**
1. Open the RO
2. Tap "Add Parts from PartsTech"
3. PartsTech opens — the vehicle (year/make/model/engine) is already pre-selected
4. Search for the part you need (e.g., "front brake pads")
5. See results from all your connected suppliers (O'Reilly, NAPA, AutoZone, WorldPac, Advance, etc.)
6. See live inventory, wholesale pricing, ratings, warranty info
7. Add parts to cart, adjust quantities
8. Tap "Submit Quote" — parts transfer back to the RO
9. The shop's markup is applied automatically (e.g., your cost $42.99 → customer price $64.49 at 50% markup)

**Parts markup rules (Settings → Parts Markup):**
- Flat percentage (default: 50% — cost × 1.50)
- Tiered by cost range (under $10 = 100%, $10-50 = 60%, $50-200 = 50%, $200+ = 40%)
- Can be overridden per line item on the RO

**Manual parts entry:**
Tap "+ Manual" on the RO to add a part without PartsTech (shop stock, special order, shop supplies). Enter description, part number (optional), qty, your cost, sell price.

**Parts order tracking:**
Each part on an RO has a status: Quoted → Ordered → Shipped → Received → Installed
- When parts are ordered but not received, the RO board auto-moves to "Waiting Parts"
- Use the "Receive Parts" button to mark items received as they come in
- When all parts received, suggests moving RO to "In Progress"

**Connecting PartsTech:**
Go to Settings → Integrations → PartsTech. Enter your PartsTech username and API key (from your PartsTech profile at app.partstech.com).

### SCHEDULING & APPOINTMENTS
- View appointments in a calendar (day or week view) with bay rows
- Create an appointment: select customer, vehicle, date, time, bay, advisor, estimated duration
- Appointments auto-create an RO when checked in
- Color-coded by status (scheduled, checked-in, in-progress, complete)
- Drag and drop to reschedule
- Automatic text reminders sent to customers 24 hours before

### CUSTOMERS
- Search customers by name, phone, email, or vehicle
- Customer detail shows: contact info, all vehicles, full service history (every RO), communication log
- Add a customer: name, phone, email, address
- Add a vehicle to a customer: enter VIN → auto-decodes year/make/model/engine from NHTSA
- Or manually enter year, make, model

### PAYMENTS
**Taking payment on an RO:**
1. Open the completed RO
2. Tap "Take Payment"
3. Choose payment method: Cash or Card
4. The system shows the correct amount:
   - Cash: base total (subtotal + tax)
   - Card: base total + surcharge (clearly disclosed)
5. Optional: add tip
6. Process the payment
7. The customer gets a receipt:
   - Print it at the counter
   - Email it with a PDF invoice attached
   - Text a link to the receipt

**Payment details on receipts:**
- Card payments show: card brand, last 4 digits, authorization code, timestamp
- Cash payments show: amount tendered, timestamp
- Both show: full line item breakdown, dual pricing, surcharge disclosure, tip (if any)

### COMMUNICATION
- Text customers directly from any RO or customer profile
- Email estimates, invoices, and receipts
- Call button (taps to dial on mobile)
- All communication is logged on the RO timeline and the customer profile
- Pre-filled message templates for common messages (estimate ready, vehicle ready, payment reminder)

### REPORTS
- Daily/weekly/monthly revenue
- Car count trends
- Average RO value
- Customer approval rate
- Tech productivity (hours flagged vs hours available)
- Cash vs card payment breakdown
- Parts margin by supplier
- Fees saved (dual pricing savings)
- Accounts receivable aging (unpaid invoices)

### SETTINGS
**Shop Profile:** Name, address, logo, phone, email, website, timezone
**Employees:** Add staff with name, email, role (admin/advisor/technician), assigned bay, pay rate, PIN
**Bays:** Name and number your service bays
**Dual Pricing:** Surcharge rate, enable/disable
**Tax Rates:** State/local tax percentage
**Labor Rates:** Default hourly rate, can set per service category
**Parts Markup:** Default percentage, tiered rules
**Message Templates:** Customize text/email templates
**Integrations:** PartsTech, QuickBooks (future), payment processor

## GUIDED WORKFLOWS

When a user asks "how do I..." or "walk me through...", respond with numbered steps. Reference what's on their current screen when possible. Example format:

"Here's how to create a repair order:

1. Tap **New RO** (you'll see this button in the top-right)
2. Search for the customer or tap **New Customer** to create one
3. Select or add the vehicle — if you have the VIN, enter it and I'll decode the year/make/model for you
4. You're now on the RO detail page — start adding labor and parts
5. When the estimate is ready, tap **Send for Approval** to text or email it to the customer

Want me to walk you through adding parts to this RO?"

## HANDLING THINGS YOU DON'T KNOW
- For technical questions about car repair: "I'm here to help you use PCB Auto — for technical repair questions, check with your team or a repair manual."
- For accounting/legal advice: "I'd recommend checking with your accountant on that — but I can show you how to pull the report you'd need. Want me to walk you through it?"
- For features not yet built: "That feature is coming soon. For now, here's how you can handle it: [workaround]."
- For bugs or errors: "That doesn't sound right. Try refreshing the page first. If it keeps happening, reach out to support and let them know exactly what you were doing when it happened."

## RESPONSE GUIDELINES
- Keep responses under 150 words unless walking through a multi-step process
- Use bold for button names and page names: **New RO**, **Settings → Dual Pricing**
- Use numbered lists for step-by-step instructions
- After answering, offer one relevant follow-up: "Want me to show you how to [related next step]?"
- If the user seems frustrated, acknowledge it: "I get it — let me make this quick."
- Never overwhelm with all features at once — answer what they asked, offer one next step
`;
```

---

## 5. Backend: API Route

```typescript
// server/routes/assistant.ts

import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,  // Store in Replit Secrets
});

// Store conversation history per session (in-memory for V1)
const sessions = new Map<string, Array<{ role: string; content: string }>>();

const MAX_HISTORY = 20;  // Keep last 20 messages for context
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

// POST /api/pcbauto/v1/assistant/chat
router.post('/chat', async (req, res) => {
  try {
    const {
      message,        // User's question
      sessionId,      // Unique per browser session
      context,        // AssistantContext object (page, RO, shop info)
    } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create session history
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, []);
    }
    const history = sessions.get(sessionId)!;

    // Build context injection (prepended to the user message internally)
    const contextBlock = buildContextBlock(context);

    // Add user message to history
    history.push({ role: 'user', content: message });

    // Trim history to last N messages
    while (history.length > MAX_HISTORY) {
      history.shift();
    }

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 800,
      system: SYSTEM_PROMPT + '\n\n' + contextBlock,
      messages: history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const assistantMessage = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Add assistant response to history
    history.push({ role: 'assistant', content: assistantMessage });

    return res.json({
      message: assistantMessage,
      sessionId,
    });

  } catch (err: any) {
    console.error('Assistant error:', err);
    return res.status(500).json({
      message: "Sorry, I'm having trouble right now. Try again in a moment.",
      error: err.message,
    });
  }
});

// Build context block from current page state
function buildContextBlock(context: any): string {
  if (!context) return '';

  let block = `\n## CURRENT USER CONTEXT\n`;
  block += `- User: ${context.userName} (${context.userRole})\n`;
  block += `- Shop: ${context.shopName}\n`;
  block += `- Currently viewing: ${context.currentPage} (${context.currentUrl})\n`;

  if (context.roNumber) {
    block += `- Looking at RO #${context.roNumber} (status: ${context.roStatus})\n`;
  }
  if (context.customerName) {
    block += `- Customer: ${context.customerName}\n`;
  }
  if (context.vehicleInfo) {
    block += `- Vehicle: ${context.vehicleInfo}\n`;
  }

  block += `\n## SHOP CONFIGURATION\n`;
  block += `- Dual pricing: ${context.dualPricingEnabled ? `enabled at ${context.dualPricingRate}%` : 'disabled'}\n`;
  block += `- PartsTech: ${context.partsTechConnected ? 'connected' : 'not connected'}\n`;
  block += `- Staff configured: ${context.hasEmployees ? 'yes' : 'no (only admin so far)'}\n`;
  block += `- Bays configured: ${context.hasBays ? 'yes' : 'no'}\n`;

  return block;
}

export default router;
```

---

## 6. Frontend: React Components

### 6.1 AssistantProvider (Context)

```tsx
// components/assistant/AssistantProvider.tsx

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AssistantContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  messages: Message[];
  sendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
}

const AssistantCtx = createContext<AssistantContextType | null>(null);
export const useAssistant = () => useContext(AssistantCtx)!;

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef(
    `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Gather current context (implement useAssistantContext from Section 3)
      const context = gatherCurrentContext();

      const res = await fetch('/api/pcbauto/v1/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionIdRef.current,
          context,
        }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: `msg_${Date.now()}_reply`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: "Sorry, I couldn't connect right now. Try again in a moment.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AssistantCtx.Provider value={{
      isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false),
      toggle: () => setIsOpen(o => !o), messages, sendMessage, isLoading,
    }}>
      {children}
    </AssistantCtx.Provider>
  );
}

// This function reads current URL + any active RO/customer state
// Adapt to match your actual routing and state management
function gatherCurrentContext() {
  const path = window.location.pathname;
  return {
    currentPage: path,
    currentUrl: path,
    shopName: 'Demo Auto Repair',   // Replace with real shop context
    userRole: 'admin',               // Replace with real user role
    userName: 'William',             // Replace with real user name
    dualPricingEnabled: true,
    dualPricingRate: 3.49,
    partsTechConnected: true,
    hasEmployees: true,
    hasBays: true,
    // RO context — read from your state if on an RO page:
    // roNumber, roStatus, customerName, vehicleInfo
  };
}
```

### 6.2 AssistantChat Component

```tsx
// components/assistant/AssistantChat.tsx

import React, { useState, useRef, useEffect } from 'react';
import { useAssistant } from './AssistantProvider';
import ReactMarkdown from 'react-markdown';  // npm install react-markdown

// Quick action chips per page
const QUICK_ACTIONS: Record<string, string[]> = {
  'dashboard':      ["What do my stats mean?", "How do I create an RO?", "Show me around"],
  'repair-orders':  ["How do I create an RO?", "What do the columns mean?", "How do I search?"],
  'ro-detail':      ["How do I add parts?", "Send this estimate", "How does dual pricing work?"],
  'inspections':    ["Walk me through an inspection", "How do photos work?", "What does Watch mean?"],
  'scheduling':     ["Add an appointment", "How do bays work?", "Can I drag to reschedule?"],
  'customers':      ["Add a customer", "Look up service history", "Add a vehicle"],
  'parts':          ["Search PartsTech", "How does markup work?", "Receive parts"],
  'settings':       ["Set up dual pricing", "Add an employee", "Connect PartsTech"],
  'reports':        ["What reports are available?", "Daily revenue", "What is fees saved?"],
  'default':        ["How do I create an RO?", "Walk me through an inspection", "How does dual pricing work?"],
};

function getPageKey(): string {
  const path = window.location.pathname;
  if (path.includes('repair-orders/')) return 'ro-detail';
  if (path.includes('repair-orders')) return 'repair-orders';
  if (path.includes('inspection')) return 'inspections';
  if (path.includes('schedule') || path.includes('calendar')) return 'scheduling';
  if (path.includes('customer')) return 'customers';
  if (path.includes('part')) return 'parts';
  if (path.includes('setting')) return 'settings';
  if (path.includes('report')) return 'reports';
  if (path === '/' || path.includes('dashboard')) return 'dashboard';
  return 'default';
}

export function AssistantChat() {
  const { isOpen, close, messages, sendMessage, isLoading } = useAssistant();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleChip = (text: string) => {
    sendMessage(text);
  };

  if (!isOpen) return null;

  const pageKey = getPageKey();
  const chips = QUICK_ACTIONS[pageKey] || QUICK_ACTIONS['default'];

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div onClick={close} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9991,
        display: window.innerWidth < 768 ? 'block' : 'none',
      }} />

      {/* Chat panel */}
      <div style={{
        position: 'fixed', bottom: window.innerWidth < 768 ? 0 : 24,
        right: window.innerWidth < 768 ? 0 : 24,
        width: window.innerWidth < 768 ? '100%' : 400,
        height: window.innerWidth < 768 ? '85vh' : 560,
        background: 'white', borderRadius: window.innerWidth < 768 ? '16px 16px 0 0' : 16,
        boxShadow: '0 12px 48px rgba(0,0,0,0.2)', zIndex: 9992,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        animation: 'assistantSlideIn 0.25s ease',
      }}>
        <style>{`
          @keyframes assistantSlideIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '14px 18px', background: '#111827', color: 'white',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <span style={{ fontSize: 18 }}>✦</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>PCB Auto Assistant</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>
              {pageKey === 'ro-detail' ? 'Viewing Repair Order' :
               pageKey.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </div>
          </div>
          <button onClick={close} style={{
            background: 'none', border: 'none', color: 'white',
            fontSize: 20, cursor: 'pointer', padding: 4, opacity: 0.7,
          }}>✕</button>
        </div>

        {/* Messages area */}
        <div ref={scrollRef} style={{
          flex: 1, overflowY: 'auto', padding: 16,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {/* Welcome message if no messages yet */}
          {messages.length === 0 && (
            <div>
              <div style={{
                background: '#f3f4f6', padding: '14px 16px', borderRadius: '4px 14px 14px 14px',
                fontSize: 14, lineHeight: 1.5, color: '#374151',
              }}>
                👋 Hey! I'm your PCB Auto assistant. Ask me anything about the platform, or pick a question below.
              </div>
              {/* Quick action chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                {chips.map(chip => (
                  <button key={chip} onClick={() => handleChip(chip)} style={{
                    padding: '8px 14px', fontSize: 13, fontWeight: 500,
                    background: 'white', border: '1.5px solid #d1d5db', borderRadius: 20,
                    color: '#374151', cursor: 'pointer',
                  }}>
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map(msg => (
            <div key={msg.id} style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
                background: msg.role === 'user' ? '#111827' : '#f3f4f6',
                color: msg.role === 'user' ? 'white' : '#1f2937',
                fontSize: 14, lineHeight: 1.6,
              }}>
                {msg.role === 'assistant' ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p style={{ margin: '0 0 8px' }}>{children}</p>,
                      strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
                      ol: ({ children }) => <ol style={{ margin: '8px 0', paddingLeft: 20 }}>{children}</ol>,
                      li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                      a: ({ href, children }) => (
                        <a href={href} style={{ color: '#3b82f6', textDecoration: 'underline' }}>{children}</a>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div style={{ alignSelf: 'flex-start' }}>
              <div style={{
                padding: '12px 20px', borderRadius: '4px 14px 14px 14px',
                background: '#f3f4f6', display: 'flex', gap: 4,
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#9ca3af',
                    animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
                  }} />
                ))}
              </div>
              <style>{`
                @keyframes bounce {
                  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                  40% { transform: scale(1); opacity: 1; }
                }
              `}</style>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid #e5e7eb',
          display: 'flex', gap: 8, flexShrink: 0, background: 'white',
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            style={{
              flex: 1, padding: '10px 14px', fontSize: 14,
              border: '1.5px solid #d1d5db', borderRadius: 10,
              outline: 'none',
            }}
          />
          <button onClick={handleSend} disabled={!input.trim() || isLoading} style={{
            padding: '10px 16px', background: input.trim() ? '#111827' : '#e5e7eb',
            color: input.trim() ? 'white' : '#9ca3af',
            border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
            cursor: input.trim() ? 'pointer' : 'default',
          }}>
            Send
          </button>
        </div>
      </div>
    </>
  );
}
```

### 6.3 Floating Button Component

```tsx
// components/assistant/AssistantButton.tsx

import { useAssistant } from './AssistantProvider';

export function AssistantButton() {
  const { toggle, isOpen } = useAssistant();

  if (isOpen) return null; // Hide button when panel is open

  return (
    <button
      onClick={toggle}
      aria-label="Open AI Assistant"
      style={{
        position: 'fixed', bottom: 24, right: 24,
        width: 56, height: 56, borderRadius: '50%',
        background: '#111827', color: 'white',
        border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 9990,
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.08)';
        e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.35)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)';
      }}
    >
      ✦
    </button>
  );
}
```

### 6.4 Wire It Up (App Layout)

```tsx
// In your top-level App.tsx or Layout.tsx:

import { AssistantProvider } from './components/assistant/AssistantProvider';
import { AssistantButton } from './components/assistant/AssistantButton';
import { AssistantChat } from './components/assistant/AssistantChat';

function App() {
  return (
    <AssistantProvider>
      {/* ... your existing routes and layout ... */}
      <AssistantButton />
      <AssistantChat />
    </AssistantProvider>
  );
}
```

---

## 7. Route Registration

```typescript
// server/index.ts or server/app.ts

import assistantRoutes from './routes/assistant';

app.use('/api/pcbauto/v1/assistant', assistantRoutes);
```

---

## 8. Environment Variables Required

Add these to Replit Secrets:

```
ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

This is the Anthropic API key. If you already have one from the Field Sales Suite, use the same key.

---

## 9. Dependencies to Install

```bash
npm install @anthropic-ai/sdk react-markdown
```

---

## 10. Behavior Examples

**User is on Dashboard, asks: "What does fees saved mean?"**
> Fees Saved shows how much your shop kept by using dual pricing. When a customer pays cash, you avoid the credit card processing fee entirely — that's money that would have gone to the card processor. For example, if you had $5,000 in cash payments today and your surcharge rate is 3.49%, you saved $174.50 in processing fees. That's real profit straight to your bottom line.
>
> Want me to show you the full Fees Saved report?

**User is on RO Detail, asks: "How do I add parts?"**
> You're on the right screen! Look for the **Add Parts from PartsTech** button below your current line items. Tap it and PartsTech will open with your vehicle already selected — you can search for the exact part you need, see pricing from all your suppliers, and add them to your cart. When you submit, the parts drop right onto this RO with your markup applied.
>
> If you need to add something that's not in PartsTech — like shop supplies or shelf stock — tap the **+ Manual** button instead.

**User is on Settings, asks: "How do I add an employee?"**
> From here in Settings:
>
> 1. Tap **Employees** in the left menu
> 2. Tap **+ Add Employee**
> 3. Fill in their name, email, and phone
> 4. Set their **role** — Admin (full access), Advisor (ROs, estimates, payments), or Technician (inspections, assigned work)
> 5. Assign a **bay** if they're a tech
> 6. Set their **pay rate** and create a **PIN** for clock-in
> 7. Tap **Save**
>
> They'll get an email invite to log in. Want me to explain what each role can access?

---

## 11. Future Enhancements (Phase 2+)

- **Proactive suggestions:** If the user is on a new RO with no parts, after 30 seconds the assistant could gently prompt: "Need help adding parts? I can walk you through PartsTech."
- **Onboarding flow:** First-time users get a guided tour triggered by the assistant: "Welcome to PCB Auto! Let's set up your shop. First, let's configure your dual pricing rate..."
- **Voice input:** Add a microphone button for hands-free questions (useful for techs on tablets with greasy hands)
- **Action execution:** Instead of just telling the user what to click, the assistant could navigate them there: "Let me take you to Settings → Dual Pricing" (triggers programmatic navigation)
- **Search the knowledge base:** If we build a help center, the assistant can search it for longer articles
- **Ticket creation:** If the assistant can't solve the issue, it offers to create a support ticket with the conversation attached
