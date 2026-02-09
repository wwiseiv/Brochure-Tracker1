## ESTIMATES ARE BROKEN — Fix the Complete Estimate Workflow

The Repair Orders page has no way to create or send estimates properly. There's an "Estimate" status filter tab, but it shows nothing because the workflow doesn't guide users to create estimates. We already built a full Digital Estimate Approval Portal (customer-facing) but it's not wired into the app. This needs to be fixed end-to-end.

---

### PROBLEM 1: No "New Estimate" Button

The Repair Orders page has a `+ New RO` button in the top right, but there is NO `+ New Estimate` button. An estimate is different from a repair order in the shop workflow:

- An **Estimate** is what gets sent to the customer for approval BEFORE work begins
- A **Repair Order** is what the shop works from AFTER the customer approves

Add a `+ New Estimate` button next to the existing `+ New RO` button. It should:
- Be styled as a secondary/outline button (so it doesn't compete visually with + New RO)
- Open the same RO creation form BUT automatically set the status to "Estimate"
- Pre-select "Estimate" as the status and maybe even hide irrelevant fields (like payment info — they haven't paid yet)

Alternatively, if the + New RO form already has a status dropdown, you could add a "Save as Estimate" button alongside the regular "Save" button in the form. Either approach works — the point is the user needs a clear, obvious path to create an estimate.

---

### PROBLEM 2: Estimates Need a "Send to Customer" Action

When a Repair Order has the status "Estimate", there needs to be a prominent action to send it to the customer for approval. Inside the estimate detail view, add:

1. A **"Send Estimate"** button (prominent, blue or green, can't miss it)
2. When tapped, show a modal/dialog asking:
   - Send via: **Text (SMS)** / **Email** / **Both**
   - Customer phone number (pre-filled from customer record)
   - Customer email (pre-filled from customer record)
   - Optional message to customer
3. When sent, this should:
   - Generate a **unique public URL** for this estimate (e.g., `https://[app-domain]/approve/[unique-token]`)
   - Send that link via SMS (Twilio) and/or Email (Resend) with a message like: "Hi [Customer Name], your estimate from [Shop Name] for your [Year Make Model] is ready for review. Tap here to view and approve: [link]"
   - Update the estimate status to "Sent" or "Awaiting Approval"
   - Log the send action with timestamp

---

### PROBLEM 3: The Customer-Facing Approval Page

We already designed and built a complete Digital Estimate Approval Portal. Here's exactly what it needs to do when the customer opens that public URL:

**Header Section:**
- Shop name, logo, contact info
- Customer name
- Vehicle: Year, Make, Model
- Estimate number and date

**Line Items — Grouped by Priority:**
- 🔴 **Safety Critical** (red) — items flagged from DVI as urgent
- 🟡 **Recommended** (yellow) — should be done soon
- 🟢 **Maintenance** (green) — routine items

Each line item shows:
- Service name and description
- Labor cost and parts cost broken out
- Total for that line
- An **Approve** / **Decline** toggle for EACH individual line item
- Expandable detail showing tech notes, parts list, and DVI photos if available

**Running Totals:**
- Real-time total that updates as the customer approves/declines individual items
- If dual pricing is enabled: show both cash price and card price with savings highlighted

**AI Service Advisor Chat:**
- A floating chat button (bottom of screen) that opens an AI assistant
- The AI knows the full context of this specific estimate — what services are listed, what's urgent, what can wait
- Customer can ask questions like "Is this brake job really urgent?", "Can the oil change wait another month?", "Why does this cost so much?"
- The AI answers conversationally and honestly, referencing the actual line items
- This is powered by the Claude API — send the estimate context as the system prompt
- **THIS IS THE KEY DIFFERENTIATOR** — no competitor has AI built into the customer approval flow

**Approval Actions:**
- "Approve All" quick button
- "Approve Selected" (only the items they toggled on)
- Customer notes/questions field
- Digital signature pad (finger drawing on mobile)
- Submit button

**After Submission:**
- Success screen with summary of what was approved/declined
- The approval data flows back into PCB Auto and updates the RO:
  - Approved items → status changes to "Approved"
  - Declined items → tracked as "Declined Services" for follow-up
  - Customer signature stored
  - Timestamp logged
- The service advisor gets a notification (in-app + SMS/email) that the customer responded

---

### PROBLEM 4: Estimate Status Workflow

The status flow for estimates should be:

```
Estimate (created) → Sent (link sent to customer) → Approved / Partially Approved / Declined → In Progress (work begins) → Completed → Invoiced → Paid
```

The Repair Orders list should show these statuses with distinct colors:
- **Estimate** — gray/slate (not sent yet)
- **Sent** — blue (awaiting customer response)  
- **Approved** — green (ready to start work)
- **Partially Approved** — yellow/amber (some items approved, some declined)
- **Declined** — red (customer said no to everything)

When the service advisor opens an approved estimate, there should be a clear "Convert to Work Order" or "Start Work" button that moves it into the active workflow.

---

### PROBLEM 5: Sample/Demo Data

The Estimate filter currently shows "No results found" with zero data. For demo purposes, create 3-4 sample estimates with different statuses so the system looks functional when showing to prospects:

1. **Estimate (not sent yet):** Maria Garcia, 2020 Ford F-150, brake pad replacement + oil change, $485.00
2. **Sent (awaiting approval):** David Kim, 2021 Toyota Camry, timing belt + water pump + coolant flush, $1,850.00
3. **Approved:** Rachel Adams, 2019 Honda CR-V, transmission fluid change + cabin air filter + tire rotation, $425.00
4. **Partially Approved:** Mike Johnson, 2022 Chevy Silverado, full brake job approved ($1,200), alignment and tire balance declined ($350), total approved $1,200 of $1,550

---

### WHAT ALREADY EXISTS (Don't Rebuild From Scratch)

Check the codebase for:
- An existing estimate approval page or component (may be at a route like `/approve/[token]` or `/estimate/[id]`)
- Public/unauthenticated route handling for the customer-facing approval URL
- SMS sending via Twilio (this already works for other features)
- Email sending via Resend (this already works)
- Claude API integration for the AI assistant (already exists — reuse the same endpoint)
- The DVI inspection data that should be linked to estimates

Wire these existing pieces together rather than building everything from scratch. The individual parts mostly exist — they just need to be connected into a coherent estimate → send → approve → work order flow.

---

### TEST THE FULL FLOW

After building, test this complete sequence:
1. Tap + New Estimate → create estimate with customer, vehicle, line items
2. Save → estimate appears in Repair Orders list with "Estimate" status
3. Open estimate → tap "Send Estimate" → choose SMS → send
4. Open the public approval URL in an incognito browser (simulating the customer)
5. See all line items, approve some, decline some
6. Open the AI chat, ask "Is this urgent?" — verify it responds with context about this specific estimate
7. Sign and submit
8. Go back to the PCB Auto app → verify the estimate updated to "Partially Approved" with the correct items marked
9. Convert to Work Order → verify it moves to "In Progress"
