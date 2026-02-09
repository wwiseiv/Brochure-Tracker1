# PCB Auto — Repair Orders v2: PHASE 3 — Frontend UI Changes

## INSTRUCTIONS

This is Phase 3 of 4. **Phase 1 (database) and Phase 2 (API routes) must be completed first.** All the API endpoints referenced below must already exist and be working.

In this phase, update the React frontend to use the new data fields and add new UI components. **Do NOT break existing pages.** Every current screen must continue to work. Add the new features on top of what exists.

---

## 3A. SERVICE LINE EDITOR — UPDATE EXISTING

Modify the existing service line editor on the RO detail page. Each service line row currently shows description, quantity, price, etc. Add these new elements to each line:

### Line Origin Indicator
Next to the line number, show the origin:
- **Original lines** (`line_origin = 'original'`): Just the line number. No extra indicator.
- **Add-on lines** (`line_origin = 'addon'`): Show an asterisk and a small badge. Example: `"2 *"` with a tiny yellow pill badge that says "ADD-ON" next to it.
- **Inspection lines** (`line_origin = 'inspection'`): Show a small magnifying glass icon or badge that says "DVI".

Use subtle styling — don't make it overwhelming. A small colored left border on the row works well too (yellow for add-on, blue for inspection).

### Parts Pay Type & Labor Pay Type Dropdowns
Add two small dropdown selectors (or segmented button groups) to each line:

```
Parts: [Customer Pay ▼]    Labor: [Customer Pay ▼]
```

- Options for each: "Customer Pay" | "Internal" | "Warranty"
- Default: Customer Pay (pre-selected)
- Styling: Use a compact dropdown or pill-style toggle. Don't make these huge — they should fit within the existing line row layout.
- When "Internal" is selected on either: change the line's background to light yellow (#FFFBEB) or add a yellow left border
- When "Warranty" is selected on either: change the line's background to light blue (#EFF6FF) or add a blue left border

### Conditional Fields (show/hide based on pay type):
- When EITHER pay type is "Internal" or "Warranty", show a **"Retail Value"** input field. This is where the shop records what the retail price would have been for tax purposes. Label it: "Retail Value (for records)" with a small info tooltip explaining why.
- When EITHER pay type is "Warranty", show two additional fields:
  - **Warranty Vendor** — text input (e.g., "NAPA", "CarQuest", "Advance Auto")
  - **Claim Number** — text input (optional)

### Tech Assignment Display
Show who is currently working on this line:
- If a tech is clocked in (`is_active = true` session on this line): Show a small green dot and the tech's employee_number (e.g., "🟢 Tech #104")
- If a tech worked on it but isn't currently clocked in: Show gray text (e.g., "Tech #104 — 1.5 hrs")
- If no tech has worked on this line: Show light gray "Unassigned"
- This is display-only on the advisor's view — techs clock in from the Tech Portal (3C)

### Authorization Status (for add-on lines)
For lines where `line_origin != 'original'`, show the approval status:
- **Pending**: Yellow badge "Pending Approval"
- **Approved**: Green badge "Approved" + small timestamp
- **Declined**: Red badge "Declined"
- **Deferred**: Gray badge "Deferred"

Add a small action button group: [Approve] [Decline] [Defer] that updates the line's approval_status via the existing PATCH endpoint. When "Approve" is clicked, also set `authorization_timestamp` and `authorization_method = 'in_person'`.

### RO Summary Section at Bottom
Update the RO totals area at the bottom of the page. Split into two sections:

**Customer Total** (visible, prominent):
- Only sums lines where BOTH parts_pay_type AND labor_pay_type are 'customer_pay'
- This is what the customer pays. Show parts subtotal, labor subtotal, fees, tax, total.

**Internal/Warranty Summary** (visible to advisor/owner, NOT on customer-facing prints):
- Shows internal charges total and warranty charges total
- Smaller text, maybe in a collapsible accordion: "Internal & Warranty Charges: $XXX.XX"
- This data is for the shop's records and tax documentation only

---

## 3B. ESTIMATES TAB

Add a tab or toggle to the existing Repair Orders list page:

```
┌─────────────────────────────────────────┐
│  [ Repair Orders ]  [ Estimates ]        │
└─────────────────────────────────────────┘
```

- **Repair Orders tab** (default): Calls the existing RO list API with `?type=ro`. Shows only actual repair orders.
- **Estimates tab**: Calls the RO list API with `?type=estimate`. Shows only estimates.

### Estimates List Columns:
- Estimate # (e.g., EST-10001)
- Customer Name
- Vehicle (Year Make Model)
- Date Created
- Total Amount
- Status
- Linked RO # (if converted — clickable link to the RO detail page)

### Estimate Actions:
- **"New Estimate"** button at top — creates a new record with `is_estimate = true`, opens the estimate editor (same as RO editor but with estimate context)
- **"Convert to Repair Order"** button on each estimate row (or on the estimate detail page) — calls POST `/estimates/:id/convert`, shows a confirmation dialog first:
  ```
  Convert Estimate EST-10042 to a Repair Order?
  This will create a new RO with all the service lines from this estimate.
  The estimate will be preserved for records.
  [Cancel] [Convert to RO]
  ```
- After conversion, redirect to the new RO detail page
- Converted estimates should show a "Converted → RO #10042" badge and the convert button should be disabled/hidden

### Estimate Detail Page:
Reuse the existing RO detail page/component but:
- Show "Estimate" in the header instead of "Repair Order"
- Show the estimate number prominently (EST-XXXXX)
- Show the "Convert to Repair Order" button prominently (green, top of page)
- If already converted, show "Converted to RO #XXXXX" as a link instead of the convert button

---

## 3C. TECH PORTAL — NEW PAGE

Create a new page at route `/tech-portal`. This is the technician's daily workboard, designed for shop floor tablets.

### Tech Login Screen:
When navigating to /tech-portal, show a simple login:
```
┌────────────────────────────────────────┐
│                                        │
│         PCB Auto — Tech Portal         │
│                                        │
│    Enter your Employee Number:         │
│    ┌──────────────────────────────┐    │
│    │  [       104          ]      │    │
│    └──────────────────────────────┘    │
│                                        │
│    PIN (optional):                     │
│    ┌──────────────────────────────┐    │
│    │  [       ****         ]      │    │
│    └──────────────────────────────┘    │
│                                        │
│           [ CLOCK IN ]                 │
│                                        │
└────────────────────────────────────────┘
```

Look up the employee by `employee_number` in pcb_employees. If PIN is set, verify it. If no PIN exists, just the employee number is enough. Store the tech's ID in local state/context for the session.

### Main Tech Portal View:

```
┌─────────────────────────────────────────────────────────────┐
│  PCB Auto — Tech Portal            Tech #104     [Log Out]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  CURRENTLY CLOCKED INTO:                               │  │
│  │  ────────────────────────────────────────────────────  │  │
│  │  RO #10042 — 2019 Honda Accord                        │  │
│  │  Line 2: Front Brake Pad & Rotor Replacement          │  │
│  │  ⏱ Started: 2:15 PM  |  Elapsed: 1h 23m              │  │
│  │                                                        │  │
│  │                              [ CLOCK OUT ]             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  MY REPAIR ORDERS:                                           │
│  ────────────────────────────────────────────────────────    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  RO #10042 — 2019 Honda Accord (Silver)               │  │
│  │  Advisor: #201                                         │  │
│  │                                                        │  │
│  │  Line 1: Oil & Filter Change              ✅ Done      │  │
│  │  Line 2: Front Brake Pads & Rotors        ⏱ Working   │  │
│  │  Line 3: Tire Rotation                    ○ Ready      │  │
│  │  Line 4: * Multi-Point Inspection         ○ Ready      │  │
│  │                                    [ CLOCK IN → ]      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  RO #10045 — 2021 Toyota Camry (White)                │  │
│  │  Advisor: #201                                         │  │
│  │                                                        │  │
│  │  Line 1: State Inspection                 ○ Ready      │  │
│  │                                    [ CLOCK IN → ]      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### CRITICAL RULES FOR TECH PORTAL:
1. **NO PRICING ANYWHERE.** No dollar amounts, no hourly rates, no part costs, no totals. The tech sees descriptions, part names, labor descriptions — but zero financial data. This is a firm requirement from the consultant.
2. **Show employee numbers, not names** for advisors and other techs.
3. **Clock In button** on each "Ready" line calls POST `/tech-sessions/clock-in`. If the tech is already clocked into a different line, show a confirmation: "You're currently working on [Line X]. Clock out of that and into this line?" [Cancel] [Switch]
4. **Clock Out button** on the active line calls POST `/tech-sessions/clock-out`.
5. **Line status logic:**
   - ✅ Done = tech has completed sessions on this line and is no longer active
   - ⏱ Working = tech is currently clocked in (is_active = true)
   - ○ Ready = no tech has started this line yet
6. **Auto-refresh** every 30-60 seconds to pick up new RO assignments
7. **Show which ROs this tech has been assigned to.** A tech should see ROs where they have at least one session, OR ROs that have unassigned lines (lines with no tech sessions at all).
8. The asterisk (*) on Line 4 above indicates it's an add-on line — keep that visual indicator here too.

### Add navigation link:
Add "Tech Portal" to the main navigation menu, or as a quick-access link on the dashboard.

---

## 3D. DASHBOARD UPDATES

On the main advisor/owner dashboard, add these new widgets:

### Active Tech Sessions Widget
A card showing who is currently working on what:

```
┌─────────────────────────────────────────────┐
│  🔧 Active Technicians                      │
├─────────────────────────────────────────────┤
│  Tech #104 — RO #10042, Line 2             │
│  Front Brakes  ⏱ 1h 23m                    │
│                                              │
│  Tech #107 — RO #10045, Line 1             │
│  State Inspection  ⏱ 0h 15m                │
│                                              │
│  Tech #112 — Not clocked in                 │
├─────────────────────────────────────────────┤
│  3 techs  |  2 active  |  1 idle            │
└─────────────────────────────────────────────┘
```

Calls GET `/tech-sessions/active` and cross-references with employee list.

### Add-On Metrics Card
Small card showing today's upsell performance:

```
┌──────────────────────────────┐
│  📊 Today's Add-Ons          │
│  Presented: 7                │
│  Approved: 5 (71%)          │
│  Declined: 2                │
└──────────────────────────────┘
```

Query pcb_service_lines where `line_origin IN ('addon', 'inspection')` and `added_at` is today.

### Balance Widget Update
The existing balance/payment widget the consultant likes — add a date range filter:
- Quick buttons: Today | This Week | This Month
- Custom date range picker
- Default to "Today"

---

## 3E. REPORTS PAGES — 3 NEW PAGES

Add three new pages under the existing Reports section in navigation.

### Monthly Summary Report Page (`/reports/monthly-summary`)

```
┌─────────────────────────────────────────────────────────────┐
│  Monthly Summary Report                                      │
│  ─────────────────────────────────────────                   │
│  Date Range: [Feb 1, 2026] to [Feb 28, 2026]  [Generate]   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Total ROs    │  │ Avg RO Value │  │ Total Revenue│      │
│  │    142       │  │   $487.32    │  │  $69,199.44  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Parts Rev    │  │ Labor Rev    │  │ Hours Sold   │      │
│  │ $38,412.00   │  │ $28,650.00   │  │   312.5      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Avg Lines/RO │  │ Avg Add-Ons  │  │ Add-On Rate  │      │
│  │    3.2       │  │    1.4       │  │   68%        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  Internal Charges: $2,340.00  |  Warranty: $1,890.00        │
│                                                              │
│                              [Export to Excel]               │
└─────────────────────────────────────────────────────────────┘
```

Calls GET `/reports/monthly-summary`. Use the existing Excel export function for the export button.

### Advisor Performance Report (`/reports/advisor-performance`)

```
┌─────────────────────────────────────────────────────────────┐
│  Advisor Performance                                         │
│  Date Range: [Feb 1] to [Feb 28]  Advisor: [All ▼] [Go]    │
│                                                              │
│  ┌──────────┬───────┬────────┬──────────┬─────────┬───────┐ │
│  │ Advisor  │ ROs   │ Add-On │ Add-On   │ Revenue │ Avg   │ │
│  │          │       │ Lines  │ Approval │         │ RO $  │ │
│  ├──────────┼───────┼────────┼──────────┼─────────┼───────┤ │
│  │ #201     │  68   │  42    │  78%     │ $34,200 │ $503  │ │
│  │ #202     │  74   │  31    │  58%     │ $34,999 │ $473  │ │
│  ├──────────┼───────┼────────┼──────────┼─────────┼───────┤ │
│  │ TOTAL    │ 142   │  73    │  68%     │ $69,199 │ $487  │ │
│  └──────────┴───────┴────────┴──────────┴─────────┴───────┘ │
│                              [Export to Excel]               │
└─────────────────────────────────────────────────────────────┘
```

Calls GET `/reports/advisor-performance`. The "Add-On Approval" column is the key metric — this is how the owner evaluates advisors.

### Tech Efficiency Report (`/reports/tech-efficiency`)

```
┌─────────────────────────────────────────────────────────────┐
│  Technician Efficiency                                       │
│  Date Range: [Feb 1] to [Feb 28]  Tech: [All ▼]  [Go]      │
│                                                              │
│  ┌──────────┬───────┬─────────┬─────────┬────────┬────────┐ │
│  │ Tech     │ Lines │ Billed  │ Actual  │ Effic. │ Flag   │ │
│  │          │       │ Hours   │ Hours   │ %      │        │ │
│  ├──────────┼───────┼─────────┼─────────┼────────┼────────┤ │
│  │ #104     │  89   │ 168.5   │ 142.0   │ 118.7% │ 🟢     │ │
│  │ #107     │  76   │ 132.0   │ 145.5   │  90.7% │ 🔴     │ │
│  │ #112     │  52   │  84.0   │  62.0   │ 135.5% │ 🟢     │ │
│  ├──────────┼───────┼─────────┼─────────┼────────┼────────┤ │
│  │ TOTAL    │ 217   │ 384.5   │ 349.5   │ 110.0% │        │ │
│  └──────────┴───────┴─────────┴─────────┴────────┴────────┘ │
│                                                              │
│  🟢 = Above 100% (faster than book time)                    │
│  🔴 = Below 100% (slower than book time)                    │
│  Industry benchmark: 125-150% for good techs                │
│                              [Export to Excel]               │
└─────────────────────────────────────────────────────────────┘
```

Calls GET `/reports/tech-efficiency`. Efficiency % = billed hours / actual hours * 100. Above 100% means the tech completes jobs faster than the labor guide book time.

---

## 3F. CAMPAIGN SETTINGS PAGE

Add a new sub-page under Settings: **Settings > Follow-Up Campaigns** (or route `/settings/campaigns`)

```
┌─────────────────────────────────────────────────────────────┐
│  Settings > Follow-Up Campaigns                              │
│  ─────────────────────────────────────────                   │
│                                                              │
│  Declined Repair Follow-Ups                                  │
│  ─────────────────────────                                   │
│                                                              │
│  Enable automated follow-ups:  [  ON  | off ]               │
│                                                              │
│  Send follow-ups after:                                      │
│  [ 3 ] days,  [ 7 ] days,  [ 14 ] days   [+ Add]           │
│                                                              │
│  Send via:  ( ) Email  ( ) SMS  (•) Both                    │
│                                                              │
│  Email Template:                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Hi {customer_name},                                   │   │
│  │                                                       │   │
│  │ During your recent visit, we recommended the          │   │
│  │ following service for your {vehicle_year_make_model}: │   │
│  │                                                       │   │
│  │ • {service_description}                               │   │
│  │                                                       │   │
│  │ This service is important for your vehicle's safety   │   │
│  │ and reliability. Would you like to schedule it?       │   │
│  │                                                       │   │
│  │ Call us at {shop_phone} or reply to this email.       │   │
│  │                                                       │   │
│  │ - {shop_name}                                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Available merge fields:                                     │
│  [customer_name] [vehicle_year_make_model]                   │
│  [service_description] [shop_name] [shop_phone]              │
│                                                              │
│  SMS Template (160 char recommended):                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Hi {customer_name}, {shop_name} here. We recommended │   │
│  │ {service_description} for your                        │   │
│  │ {vehicle_year_make_model}. Ready to schedule? Call    │   │
│  │ {shop_phone}                                          │   │
│  └──────────────────────────────────────────────────────┘   │
│  Characters: 148/160                                         │
│                                                              │
│  [ Send Test Email ]  [ Send Test SMS ]                      │
│                                                              │
│                                      [ Save Settings ]       │
└─────────────────────────────────────────────────────────────┘
```

Calls GET/PUT `/campaign-settings`.

---

## 3G. EMPLOYEE NUMBER SETUP

In the existing Staff/Employee management page, add these fields to the employee form:

- **Employee Number**: Text input, e.g., "104". Should be unique within the tenant. If not manually set, auto-generate sequentially (101, 102, 103...).
- **PIN Code**: 4-6 digit numeric input. Used for quick Tech Portal login. Optional.

Show the employee number in the staff list table as a visible column.

---

## 3H. RO PRINT TEMPLATE (HARD CARD)

Update the existing RO print/PDF template to include:

**Header:**
- Shop name, address, phone (from tenant record)
- RO Number (large, prominent)
- Date/time created
- Advisor name and employee number

**Customer Section:**
- Full name
- Address (street, city, state, zip)
- Phone number
- Email

**Vehicle Section:**
- Year, Make, Model
- VIN (full 17 characters)
- Mileage In (from mileage_in field)
- Color, License Plate

**Service Lines:**
- Line number (with * indicator for add-ons)
- Description
- Single price per line (NOT cash/card split — just the customer price)
- Line total
- Do NOT show internal or warranty lines that have $0 customer cost unless they want to show the work was done

**Totals:**
- Parts subtotal
- Labor subtotal
- Fees/supplies
- Tax
- **Total Due** (only customer_pay amounts)

**Signature Section:**
- "Customer Authorization" header
- Printed line: "I authorize the repairs described above."
- Signature line: _________________________ Date: _________
- If add-on lines exist, a separate section: "Additional Repair Authorization"
- Second signature line for add-on authorizations

**Footer:**
- Terms/disclaimer text (configurable in settings, or a default)
- "Thank you for your business!"

---

## AFTER COMPLETING PHASE 3

1. Walk through every page and verify it renders without errors
2. Create a test estimate, verify the Estimates tab works
3. Convert the estimate to an RO, verify cross-linking
4. Edit an RO's service lines — test all three pay types (Customer Pay, Internal, Warranty)
5. Open the Tech Portal, log in with an employee number, clock in/out of lines
6. Check the dashboard — verify the Active Techs and Add-On Metrics widgets load
7. Open each report page with a date range and verify data displays
8. Print/preview an RO and verify the hard card format
9. Open Campaign Settings page, verify save/load works
10. Verify NO pricing appears in the Tech Portal view
