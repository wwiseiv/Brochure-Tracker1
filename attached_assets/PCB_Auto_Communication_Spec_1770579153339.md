# PCB Auto — Customer Communication Spec (Call / Text / Email)

## Philosophy

The shop owner's phone, tablet, or desktop already has a dialer, a messaging app, and an email client. We don't need to build any of that. We just need to make it **one tap** from anywhere a customer appears in PCB Auto — and pre-fill the message with the right context so the owner isn't typing from scratch.

Third-party services (Twilio for SMS automation, SendGrid for transactional email) come later. Right now: use the device.

---

## How It Works Technically

### Call
```html
<a href="tel:+13175550101">📞 Call</a>
```
- **Phone:** Opens native dialer with number pre-filled, user taps green button to call
- **Tablet:** Opens FaceTime / phone app (iPad) or "no phone app" prompt (some tablets)
- **Desktop:** Opens Skype, FaceTime, or system default; some browsers prompt "open in app?"

### Text (SMS)
```html
<!-- iOS uses & for body, Android uses ? — we handle both -->
<a href="sms:+13175550101&body=Hi Robert, this is Demo Auto Shop...">💬 Text</a>
```
```typescript
// Cross-platform SMS link builder
function buildSmsLink(phone: string, body: string): string {
  const encoded = encodeURIComponent(body);
  // iOS uses &body=, Android uses ?body=
  // Using & works on both modern iOS and Android
  return `sms:${phone}&body=${encoded}`;
}
```
- **Phone:** Opens native Messages app with number and pre-filled text. User just hits Send.
- **Tablet:** Opens Messages app (iPad) or prompts to open messaging app
- **Desktop:** May not work well — show "Copy message" fallback button instead

### Email
```html
<a href="mailto:rsmith@email.com?subject=Invoice from Demo Auto Shop — RO %231001&body=...">
  ✉️ Email
</a>
```
```typescript
function buildEmailLink(
  to: string,
  subject: string,
  body: string,
  cc?: string
): string {
  const params = new URLSearchParams();
  params.set('subject', subject);
  params.set('body', body);
  if (cc) params.set('cc', cc);
  return `mailto:${to}?${params.toString()}`;
}
```
- **Phone:** Opens default mail app (Gmail, Apple Mail, Outlook) with to/subject/body pre-filled
- **Tablet:** Same
- **Desktop:** Opens default email client

**Email with invoice attachment:** `mailto:` links cannot attach files. So for invoice emails we use a **different approach** — generate a shareable invoice link (hosted on PCB Auto) and include it in the email body. The customer taps the link → sees the invoice → can pay online.

---

## Where Communication Actions Appear

Every place a customer shows up in the app should have quick-action buttons. Here's every touchpoint:

### 1. Customer Card / Detail Screen

```
┌──────────────────────────────────────────────────┐
│ Robert Smith                                      │
│ (317) 555-0101 · rsmith@email.com                │
│                                                    │
│  [📞 Call]   [💬 Text]   [✉️ Email]              │
│                                                    │
│ Vehicles:                                          │
│   2019 Ford F-150 XLT                             │
│                                                    │
│ Recent Activity:                                   │
│   RO #1001 — Brake pads + rotors — In Progress   │
│   RO #0998 — Oil change — Completed Feb 5         │
└──────────────────────────────────────────────────┘
```

Call/Text/Email buttons are always in the same position, always visible.

### 2. Customer List (Quick Actions)

**Desktop/Tablet:**
```
│ Robert Smith  (317) 555-0101  rsmith@email.com  2019 F-150  │ 📞  💬  ✉️ │
│ Maria Johnson (317) 555-0202  mjohnson@email.com 2021 Camry │ 📞  💬  ✉️ │
```
Icon buttons at the end of each row.

**Phone:**
```
┌──────────────────────────────────────┐
│ Robert Smith                         │
│ 2019 F-150 · 2 visits               │
│                                      │
│  📞 Call    💬 Text    ✉️ Email      │
└──────────────────────────────────────┘
```
Action buttons at the bottom of each customer card.

### 3. Repair Order Detail

```
┌──────────────────────────────────────────────────────────────┐
│ RO #1001                               Status: In Progress  │
│──────────────────────────────────────────────────────────────│
│                                                              │
│ Customer: Robert Smith                                       │
│ (317) 555-0101 · rsmith@email.com                           │
│  [📞 Call]   [💬 Text]   [✉️ Email]                         │
│                                                              │
│ Vehicle: 2019 Ford F-150 XLT                                │
│ ...line items...                                             │
│                                                              │
│ Total: $611.47                                               │
│                                                              │
│ ──────────────── ACTIONS ──────────────────                  │
│                                                              │
│ [📱 Text Estimate for Approval]                              │
│ [✉️ Email Invoice]                                           │
│ [🔗 Copy Payment Link]                                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Two tiers of communication here:
- **Quick contact** (top): Just call/text/email the customer about anything
- **RO-specific actions** (bottom): Pre-built messages for estimate approval, invoice delivery, payment collection

### 4. Appointment Detail (Calendar)

```
┌──────────────────────────────────────────────┐
│ Appointment Details                    [✕]   │
│──────────────────────────────────────────────│
│ Robert Smith    [📞 Call]  [💬 Text]         │
│ 2019 Ford F-150 · Front brake replacement    │
│ 8:00 AM — Bay 1 — Mike T.                    │
│                                              │
│ [💬 Send Reminder Text]                      │
│ [📋 Open RO #1001 →]                         │
└──────────────────────────────────────────────┘
```

### 5. Dashboard — Today's Appointments

Each appointment card in the dashboard gets a small 📞 icon:
```
│ 8:00 AM  Robert Smith · F-150 · Brakes  📞 💬 │
```
Tap the icon → initiates call or text immediately. No extra screens.

### 6. Workflow Board (Kanban Cards)

```
┌─────────────────────┐
│ ● In Progress       │
│ Robert Smith        │
│ F-150 · Brakes      │
│ Bay 1 · Mike T.     │
│ $611.47             │
│ 📞 💬 ✉️            │
└─────────────────────┘
```

---

## Pre-Built Message Templates

When the user taps Text or Email, the message should be pre-filled with relevant context. They can edit before sending — we just save them time.

### Text Templates

```typescript
const SMS_TEMPLATES = {

  // Generic check-in
  general: (shop: string, customer: string) =>
    `Hi ${customer.split(' ')[0]}, this is ${shop}. Just reaching out — ` +
    `let us know if you need anything!`,

  // Appointment reminder
  appointmentReminder: (shop: string, customer: string, date: string, time: string, service: string) =>
    `Hi ${customer.split(' ')[0]}, this is ${shop}. ` +
    `Reminder: your ${service} appointment is ${date} at ${time}. ` +
    `Reply YES to confirm or call us to reschedule.`,

  // Estimate ready for approval
  estimateApproval: (shop: string, customer: string, roNumber: string, total: string, approvalUrl: string) =>
    `Hi ${customer.split(' ')[0]}, your estimate from ${shop} is ready. ` +
    `RO #${roNumber} — Total: ${total}. ` +
    `Review and approve here: ${approvalUrl}`,

  // Vehicle ready for pickup
  vehicleReady: (shop: string, customer: string, vehicle: string) =>
    `Hi ${customer.split(' ')[0]}, your ${vehicle} is ready for pickup at ${shop}! ` +
    `We're open until 5:30 PM today.`,

  // Payment request
  paymentRequest: (shop: string, customer: string, total: string, paymentUrl: string) =>
    `Hi ${customer.split(' ')[0]}, your invoice from ${shop} is ${total}. ` +
    `Pay securely here: ${paymentUrl}`,

  // Follow-up after service
  followUp: (shop: string, customer: string, service: string) =>
    `Hi ${customer.split(' ')[0]}, this is ${shop}. ` +
    `Just checking in — how's everything running after your ${service}? ` +
    `Let us know if you have any questions!`,
};
```

### Email Templates

```typescript
const EMAIL_TEMPLATES = {

  estimateApproval: (shop: string, customer: string, ro: RepairOrder, approvalUrl: string) => ({
    subject: `Estimate from ${shop} — RO #${ro.number}`,
    body:
      `Hi ${customer.split(' ')[0]},\n\n` +
      `Here is your estimate from ${shop}:\n\n` +
      `Vehicle: ${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}\n` +
      `Services:\n` +
      ro.lineItems.map(li => `  - ${li.description}: $${li.total.toFixed(2)}`).join('\n') + '\n\n' +
      `Estimated Total: $${ro.total.toFixed(2)}\n\n` +
      `Review and approve your estimate here:\n` +
      `${approvalUrl}\n\n` +
      `If you have any questions, reply to this email or call us at ${ro.shopPhone}.\n\n` +
      `Thank you,\n${shop}`
  }),

  invoice: (shop: string, customer: string, ro: RepairOrder, invoiceUrl: string) => ({
    subject: `Invoice from ${shop} — RO #${ro.number} — $${ro.total.toFixed(2)}`,
    body:
      `Hi ${customer.split(' ')[0]},\n\n` +
      `Here is your invoice from ${shop}:\n\n` +
      `Vehicle: ${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}\n` +
      `Total: $${ro.total.toFixed(2)}\n\n` +
      `View your full invoice and pay online:\n` +
      `${invoiceUrl}\n\n` +
      `Thank you for choosing ${shop}!\n\n` +
      `${shop}\n${ro.shopPhone}`
  }),

  vehicleReady: (shop: string, customer: string, ro: RepairOrder) => ({
    subject: `Your ${ro.vehicle.year} ${ro.vehicle.make} is ready — ${shop}`,
    body:
      `Hi ${customer.split(' ')[0]},\n\n` +
      `Great news — your ${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model} ` +
      `is ready for pickup!\n\n` +
      `Services completed:\n` +
      ro.lineItems.map(li => `  - ${li.description}`).join('\n') + '\n\n' +
      `Total: $${ro.total.toFixed(2)}\n\n` +
      `We're open today until 5:30 PM. See you soon!\n\n` +
      `${shop}\n${ro.shopPhone}`
  }),

  appointmentConfirmation: (shop: string, customer: string, appt: Appointment) => ({
    subject: `Appointment Confirmed — ${shop} — ${appt.date}`,
    body:
      `Hi ${customer.split(' ')[0]},\n\n` +
      `Your appointment at ${shop} is confirmed:\n\n` +
      `Date: ${appt.date}\n` +
      `Time: ${appt.time}\n` +
      `Vehicle: ${appt.vehicle}\n` +
      `Service: ${appt.service}\n\n` +
      `If you need to reschedule, call us at ${appt.shopPhone} or reply to this email.\n\n` +
      `See you then!\n${shop}`
  }),
};
```

---

## Invoice / Estimate Sharing (The Attachment Problem)

`mailto:` links can't attach files. Here's how we handle it:

### Approach: Shareable Invoice URL

Every RO generates a **public invoice page** at a unique URL:

```
https://shop.pcbisv.com/invoice/{unique_token}
```

This page shows:
- Shop branding (logo, colors — from the white-label settings in v1.2)
- Customer name and vehicle
- All line items (labor + parts)
- Subtotal, tax, total
- Status (estimate pending approval / invoice due / paid)
- **[Approve Estimate]** button (if estimate)
- **[Pay Now]** button (if invoice, links to payment page)
- **[Download PDF]** button

The token is a random UUID — not guessable but not authenticated. This is the same pattern Stripe, Square, and every other invoice tool uses.

### How It Flows

**Sending an estimate for approval:**
1. Service advisor finishes the estimate in PCB Auto
2. Taps **[📱 Text Estimate for Approval]**
3. Device opens Messages app with pre-filled text:
   > "Hi Robert, your estimate from Demo Auto Shop is ready. RO #1001 — Total: $611.47. Review and approve here: https://shop.pcbisv.com/invoice/abc123..."
4. Advisor hits Send
5. Customer taps link → sees estimate → taps **[Approve]**
6. PCB Auto updates RO status to "Approved" → tech gets notified

**Sending an invoice after completion:**
1. RO is marked complete
2. Owner taps **[✉️ Email Invoice]**
3. Device opens email client with pre-filled subject/body including the invoice URL
4. Customer opens email → taps link → views invoice → taps **[Pay Now]**
5. Payment processed through PCBancard → RO marked as Paid

**Sending a payment link:**
1. Owner taps **[🔗 Copy Payment Link]**
2. Link copied to clipboard
3. Owner pastes it anywhere — text, email, Facebook message, whatever

### Invoice/Estimate Page (Public)

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│              [SHOP LOGO]                                 │
│          Demo Auto Shop                                  │
│     123 Main St · Indianapolis, IN 46032                │
│     (317) 555-1234                                       │
│                                                          │
│──────────────────────────────────────────────────────────│
│                                                          │
│  ESTIMATE                          RO #1001              │
│  Date: February 8, 2026                                  │
│                                                          │
│  Customer: Robert Smith                                  │
│  Vehicle: 2019 Ford F-150 XLT                           │
│  Mileage: 42,350                                         │
│                                                          │
│──────────────────────────────────────────────────────────│
│                                                          │
│  Front brake pad replacement                             │
│    Labor: 1.5 hrs × $135.00              $202.50        │
│                                                          │
│  Front rotor replacement                                 │
│    Labor: 1.0 hrs × $135.00              $135.00        │
│                                                          │
│  Brake pads — ceramic (front)             $89.99        │
│  Rotors — front pair                     $124.99        │
│  Brake hardware kit                       $18.99        │
│                                                          │
│──────────────────────────────────────────────────────────│
│                                                          │
│                          Subtotal:       $571.47        │
│                          Tax (7%):        $40.00        │
│                          ────────────────────────       │
│                          TOTAL:          $611.47        │
│                                                          │
│──────────────────────────────────────────────────────────│
│                                                          │
│          [✅ APPROVE ESTIMATE]                           │
│                                                          │
│          [📄 Download PDF]                               │
│                                                          │
│  Questions? Call (317) 555-1234 or reply to the          │
│  text/email you received.                                │
│                                                          │
│──────────────────────────────────────────────────────────│
│  Powered by PCB Auto (if shop opted in)                  │
└──────────────────────────────────────────────────────────┘
```

After approval, the same URL changes to show the invoice with a **[Pay Now]** button instead.

---

## Quick Action Menus

### On RO Detail — Communication Actions Dropdown

Instead of cluttering the screen with 6+ buttons, group communication into a dropdown:

**Desktop/Tablet:**
```
[📨 Contact Customer ▾]
  ├── 📞 Call Robert
  ├── 💬 Text Robert
  ├── ✉️ Email Robert
  ├── ──────────────
  ├── 📱 Text Estimate for Approval
  ├── ✉️ Email Invoice
  ├── 🔗 Copy Invoice Link
  └── 🔗 Copy Payment Link
```

**Phone — Bottom Sheet:**
Tap the "Contact" button → slides up a bottom sheet with all options as large tappable rows:
```
┌──────────────────────────────────┐
│ Contact Robert Smith             │
│──────────────────────────────────│
│                                  │
│  📞  Call (317) 555-0101        │
│  💬  Text (317) 555-0101       │
│  ✉️  Email rsmith@email.com    │
│                                  │
│  ─────────────────────────────  │
│                                  │
│  📱  Text Estimate for Approval │
│  ✉️  Email Invoice              │
│  🔗  Copy Invoice Link          │
│  🔗  Copy Payment Link          │
│                                  │
│  [Cancel]                        │
└──────────────────────────────────┘
```

---

## Communication Log (Lightweight — No Third Party Needed)

We can't see what the user actually sent (it goes through their native app). But we CAN log that they initiated communication:

```sql
CREATE TABLE pcb_communication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL REFERENCES pcb_customers(id),
  repair_order_id UUID REFERENCES pcb_repair_orders(id),
  
  channel VARCHAR(10) NOT NULL 
    CHECK (channel IN ('call', 'sms', 'email', 'link_copy')),
  direction VARCHAR(10) DEFAULT 'outbound'
    CHECK (direction IN ('outbound', 'inbound')),  -- inbound = future (when we add Twilio)
  
  template_used VARCHAR(50),           -- 'estimate_approval', 'vehicle_ready', etc.
  recipient_phone VARCHAR(20),
  recipient_email VARCHAR(255),
  subject TEXT,                         -- for emails
  body_preview TEXT,                    -- first 200 chars of pre-filled message
  
  invoice_url TEXT,                     -- if an invoice/estimate link was included
  
  initiated_by UUID REFERENCES users(id),  -- which staff member
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Future: when Twilio/SendGrid is added, these get populated
  external_id VARCHAR(100),            -- Twilio SID, SendGrid message ID
  delivery_status VARCHAR(20),         -- 'sent', 'delivered', 'failed', 'opened'
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_comm_customer ON pcb_communication_log(tenant_id, customer_id, initiated_at DESC);
CREATE INDEX idx_pcb_comm_ro ON pcb_communication_log(repair_order_id);

ALTER TABLE pcb_communication_log ENABLE ROW LEVEL SECURITY;
```

### Logging the action:

```typescript
// When user taps any communication button
async function logCommunication(data: {
  tenantId: string;
  customerId: string;
  repairOrderId?: string;
  channel: 'call' | 'sms' | 'email' | 'link_copy';
  templateUsed?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  subject?: string;
  bodyPreview?: string;
  invoiceUrl?: string;
  initiatedBy: string;
}) {
  await db.query(
    `INSERT INTO pcb_communication_log 
     (tenant_id, customer_id, repair_order_id, channel, template_used,
      recipient_phone, recipient_email, subject, body_preview, invoice_url, initiated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [data.tenantId, data.customerId, data.repairOrderId, data.channel,
     data.templateUsed, data.recipientPhone, data.recipientEmail,
     data.subject, data.bodyPreview?.substring(0, 200), data.invoiceUrl,
     data.initiatedBy]
  );
}

// Example: user taps "Text Estimate for Approval"
function handleTextEstimate(customer: Customer, ro: RepairOrder) {
  const body = SMS_TEMPLATES.estimateApproval(
    shop.name, customer.name, ro.number,
    `$${ro.total.toFixed(2)}`, ro.approvalUrl
  );
  
  // Log first (before opening native app)
  logCommunication({
    tenantId: shop.tenantId,
    customerId: customer.id,
    repairOrderId: ro.id,
    channel: 'sms',
    templateUsed: 'estimate_approval',
    recipientPhone: customer.phone,
    bodyPreview: body,
    invoiceUrl: ro.approvalUrl,
    initiatedBy: currentUser.id,
  });
  
  // Then open native SMS
  window.location.href = buildSmsLink(customer.phone, body);
}
```

### What this gives us now:

On the customer detail screen, under "Recent Activity":
```
Communication History:
  📞 Called — Feb 8, 9:45 AM (by Jessica)
  📱 Texted estimate for approval — Feb 8, 9:50 AM (by Jessica)
  ✉️ Emailed invoice — Feb 8, 2:15 PM (by John)
```

### What this gives us later (when Twilio/SendGrid are added):

The same table gets `delivery_status` populated automatically:
```
  📱 Texted estimate — Delivered ✓ — Opened ✓ — Feb 8, 9:50 AM
  ✉️ Emailed invoice — Delivered ✓ — Not opened — Feb 8, 2:15 PM
```

Zero schema changes needed. The log is future-proof.

---

## Desktop Fallback for SMS

`sms:` links don't work reliably on desktop (no Messages app on most Windows/Linux machines). Handle gracefully:

```typescript
function handleTextAction(phone: string, body: string) {
  const isMobileOrTablet = /iPhone|iPad|Android/i.test(navigator.userAgent);
  
  if (isMobileOrTablet) {
    // Native SMS
    window.location.href = buildSmsLink(phone, body);
  } else {
    // Desktop fallback: show a modal with the message + copy button
    showCopyMessageModal({
      title: 'Text Message',
      phone: phone,
      message: body,
      instructions: 'Copy this message and send it from your phone or a messaging app.',
    });
  }
}
```

**Desktop fallback modal:**
```
┌──────────────────────────────────────────────────┐
│ 💬 Text Message                            [✕]   │
│──────────────────────────────────────────────────│
│                                                    │
│ To: (317) 555-0101                                │
│                                                    │
│ ┌──────────────────────────────────────────────┐  │
│ │ Hi Robert, your estimate from Demo Auto     │  │
│ │ Shop is ready. RO #1001 — Total: $611.47.   │  │
│ │ Review and approve here:                     │  │
│ │ https://shop.pcbisv.com/invoice/abc123...    │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│          [📋 Copy Message]   [Cancel]             │
│                                                    │
└──────────────────────────────────────────────────┘
```

---

## API Endpoints

```
── /api/pcbauto/v1/communication

  POST   /log                    Log a communication event (call/text/email initiated)
  GET    /customer/:id/history   Get communication history for a customer
  GET    /ro/:id/history         Get communication history for an RO

── /api/pcbauto/v1/invoices

  GET    /ro/:id/share-url       Get or generate the public invoice/estimate URL
  GET    /public/:token          Public invoice page (no auth required)
  POST   /public/:token/approve  Customer approves estimate (no auth required)
  GET    /public/:token/pdf      Download invoice as PDF
```

---

## Phase Assignment

| Feature | Phase | Notes |
|---------|-------|-------|
| Call/Text/Email buttons everywhere | Phase 1 | Just `tel:` / `sms:` / `mailto:` links — trivial |
| Pre-filled message templates | Phase 1 | Template strings, no backend needed |
| Public invoice/estimate URL | Phase 1 | Critical for estimate approval flow |
| Approve estimate via link | Phase 1 | Core workflow |
| Communication log (table + logging) | Phase 1 | Log the action when button is tapped |
| Desktop SMS fallback (copy modal) | Phase 1 | Simple UX polish |
| Invoice PDF generation | Phase 2 | Requires PDF library |
| Pay Now via invoice link | Phase 2 | Requires payment integration |
| Communication history on customer card | Phase 2 | Read from log table |
| Twilio SMS automation | Phase 3+ | Replace native SMS with API-sent messages |
| SendGrid email automation | Phase 3+ | Replace mailto with API-sent emails |
| Delivery tracking (sent/delivered/opened) | Phase 3+ | Requires Twilio/SendGrid webhooks |
| Automated reminders (24hr before appt) | Phase 3+ | Cron job + Twilio |
