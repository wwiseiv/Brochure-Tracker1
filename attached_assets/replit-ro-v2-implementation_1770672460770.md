# PCB Auto — Repair Orders Module v2 Implementation

## OVERVIEW

This is a major update to the Repair Orders system based on consultant feedback from an industry expert with decades of independent auto repair shop experience. These changes affect the core data model, UI, and business logic. **Read this entire document before writing any code.** The changes are ordered by dependency — Phase 1 must be completed before Phase 2, etc.

**CRITICAL RULE: Do NOT delete or break any existing functionality.** Every change is additive or a modification to existing tables/components. Run the app and verify it still works after each phase before moving to the next.

---

## PHASE 1: DATABASE SCHEMA CHANGES (Do this first)

### 1A. Separate Estimates from Repair Orders

Estimates and Repair Orders are NOT the same thing. They must have completely separate numbering systems. An estimate is a quote — it may or may not become an RO. An RO represents a vehicle physically in the shop.

**Add an `estimate_number` column and sequence to differentiate estimates:**

```sql
-- Add estimate numbering (separate from RO numbers)
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS estimate_number VARCHAR(20);
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS is_estimate BOOLEAN DEFAULT FALSE;
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS converted_from_estimate_id UUID REFERENCES pcb_repair_orders(id);
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS converted_to_ro_id UUID REFERENCES pcb_repair_orders(id);

-- Create estimate number sequence per tenant
CREATE TABLE IF NOT EXISTS pcb_estimate_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  current_number INTEGER NOT NULL DEFAULT 10000,
  prefix VARCHAR(10) DEFAULT 'EST-',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Business rules for estimates vs ROs:**
- Estimates get numbers like EST-10001, EST-10002, etc.
- ROs get numbers like 10001, 10002 (or location-prefixed: 110001, 210001, etc.)
- An estimate can exist without an RO (it's just a quote)
- An estimate can be converted to an RO (link via `converted_from_estimate_id` and `converted_to_ro_id`)
- One estimate can only become one RO
- The estimate record is preserved — it is never deleted or overwritten when converted
- On the Estimates list page, show the estimate number AND any linked RO number for cross-reference
- On the RO detail page, show any linked estimate number for cross-reference

**Update the RO creation flow:**
- When creating a NEW repair order, `is_estimate` = false, generate the next RO number
- When creating a NEW estimate, `is_estimate` = true, generate the next estimate number using the `pcb_estimate_sequences` table
- Add a "Convert to RO" button on estimate detail pages that creates a new RO record, copies all service lines, and links the two records
- The existing RO list page should have a toggle/tab: "Repair Orders" | "Estimates" to filter by `is_estimate`

### 1B. Multi-Location RO Numbering

RO numbers start at 10000. For multi-location shops, the first digit indicates the location:
- Location 1: 10000, 10001, 10002...
- Location 2: 20000, 20001, 20002...
- Location 3: 30000, 30001, 30002...

```sql
-- Add location support
CREATE TABLE IF NOT EXISTS pcb_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  location_number INTEGER NOT NULL,  -- 1, 2, 3, etc.
  name VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state CHAR(2),
  zip VARCHAR(10),
  phone VARCHAR(20),
  is_primary BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, location_number)
);

-- RO number sequence per location
CREATE TABLE IF NOT EXISTS pcb_ro_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  location_id UUID NOT NULL REFERENCES pcb_locations(id),
  current_number INTEGER NOT NULL DEFAULT 0,  -- starts at 0, first RO will be X0001
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, location_id)
);

-- Add location_id to repair orders
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES pcb_locations(id);
```

**RO number generation logic (implement as a server-side function, NOT client-side):**
```
function generateRONumber(locationNumber, currentSequence):
  nextSequence = currentSequence + 1
  roNumber = (locationNumber * 10000) + nextSequence
  return roNumber  // e.g., location 1, sequence 1 = 10001
```

**For single-location shops:** Auto-create Location 1 on tenant setup. The RO numbers will be 10001, 10002, etc.

**If the pcb_locations table doesn't exist yet or has no rows for the tenant, auto-create a default location with `location_number = 1` before generating the first RO.**

### 1C. Labor Type Classification Per Line Item

This is the most important schema change. Each service line needs TWO labor type fields — one for the parts component and one for the labor component. The three labor types are:

- **customer_pay** — Customer is paying for this (the default for everything)
- **internal** — Shop is absorbing the cost internally (e.g., fixing their own mistake, eating warranty labor for customer service). Must still record the retail amount for tax purposes.
- **warranty** — Part or labor is covered under a vendor warranty (NAPA, CarQuest, etc.)

```sql
-- Add labor type fields to service lines
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS parts_pay_type VARCHAR(20) DEFAULT 'customer_pay'
  CHECK (parts_pay_type IN ('customer_pay', 'internal', 'warranty'));
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS labor_pay_type VARCHAR(20) DEFAULT 'customer_pay'
  CHECK (labor_pay_type IN ('customer_pay', 'internal', 'warranty'));

-- Track the retail value even when the customer isn't paying (for tax/accounting)
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS retail_value_override DECIMAL(10,2);
-- When parts_pay_type or labor_pay_type is 'internal', this stores what the retail price WOULD have been

-- Track which warranty program covers this (if warranty type)
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS warranty_vendor VARCHAR(100);
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS warranty_claim_number VARCHAR(100);
```

**How this works in the real world (IMPORTANT — read this to understand the UI):**

**Scenario 1: Normal customer pay repair**
- Customer brings car in for brake job
- Line 1: Brake pads (part) — parts_pay_type = customer_pay, labor_pay_type = customer_pay
- Line 2: Brake rotors (part) — parts_pay_type = customer_pay, labor_pay_type = customer_pay
- Customer pays for everything. Simple.

**Scenario 2: Warranty part, customer pays labor**
- Customer's alternator (bought from NAPA 8 months ago) failed
- Line 1: Alternator replacement
  - parts_pay_type = **warranty** (NAPA covers the part)
  - labor_pay_type = **customer_pay** (customer still pays labor to install it)
  - warranty_vendor = "NAPA"
- The part cost shows $0 to customer, labor shows normal rate

**Scenario 3: Warranty part, shop eats the labor (goodwill)**
- Same alternator scenario, but shop decides to eat the labor as a customer service gesture
- Line 1: Alternator replacement
  - parts_pay_type = **warranty**
  - labor_pay_type = **internal** (shop absorbs this)
  - retail_value_override = the actual retail labor amount (e.g., $185.00)
- Customer pays $0 total
- The $185 labor is recorded as an internal charge for tax write-off purposes

**Scenario 4: Shop screwed up, fixing internally**
- Tech broke a clip during brake job, needs to fix it
- Line added: Replace broken clip
  - parts_pay_type = **internal**
  - labor_pay_type = **internal**
  - retail_value_override = what it would cost if billed to customer
- Customer pays $0 for this line, shop documents the cost for insurance/records

**UI Implementation:**
- On each service line in the RO editor, add a dropdown or button group for **Parts Pay Type** and **Labor Pay Type**
- Default is "Customer Pay" for both — this should be the pre-selected state
- When "Internal" or "Warranty" is selected, show the retail_value_override field so the shop can record the real retail amount
- When "Warranty" is selected, show warranty_vendor and warranty_claim_number fields
- Color-code the line subtly: customer_pay = normal, internal = light yellow background, warranty = light blue background
- The line total on the RO should only reflect what the CUSTOMER is paying
- Internal and warranty amounts should appear in a separate "Internal Charges" or "Non-Customer Charges" summary section at the bottom of the RO, NOT in the customer-facing total

### 1D. Add-On Line Tracking (Upsell System)

Lines added after the initial RO creation must be flagged. This is how the shop measures service advisor effectiveness at presenting inspection findings to customers.

```sql
-- Add-on tracking fields on service lines
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS line_origin VARCHAR(20) DEFAULT 'original'
  CHECK (line_origin IN ('original', 'inspection', 'addon'));
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS added_by_user_id UUID REFERENCES users(id);
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ;

-- Upsell tracking
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS presented_to_customer BOOLEAN DEFAULT FALSE;
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS presented_at TIMESTAMPTZ;
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS presented_by_advisor_id UUID REFERENCES users(id);
-- approval_status already exists on pcb_service_lines ('pending', 'approved', 'declined', 'deferred')
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS customer_responded_at TIMESTAMPTZ;
```

**Logic:**
- When an RO is first created, all lines added during creation get `line_origin = 'original'` and `added_at = NOW()`
- Any line added AFTER the RO is saved for the first time gets `line_origin = 'addon'` automatically
- Lines generated from a DVI inspection result get `line_origin = 'inspection'`
- The `added_by_user_id` records who added the line (tech vs advisor)

**UI:**
- On the RO detail page, add-on lines should show an asterisk (*) or a small colored badge next to the line number
- Use a subtle indicator: `*` prefix on line number, or a small "ADD-ON" tag, or a different left border color
- `inspection` origin lines could show a small inspection icon
- Filter/sort options: show all lines, show only add-ons, show only original

### 1E. Technician Time Tracking Per Line

Technicians must clock in and out of specific RO lines. Multiple techs can work on the same RO simultaneously on different lines.

```sql
-- Employee/tech ID number (add to existing employees table)
ALTER TABLE pcb_employees ADD COLUMN IF NOT EXISTS employee_number VARCHAR(10);
ALTER TABLE pcb_employees ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10);  -- for quick clock in/out on shop floor

-- Technician time sessions per service line
CREATE TABLE IF NOT EXISTS pcb_tech_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  repair_order_id UUID NOT NULL REFERENCES pcb_repair_orders(id),
  service_line_id UUID NOT NULL REFERENCES pcb_service_lines(id) ON DELETE CASCADE,
  tech_employee_id UUID NOT NULL REFERENCES pcb_employees(id),
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  duration_minutes INTEGER,  -- calculated on clock_out, stored for fast reporting
  is_active BOOLEAN DEFAULT TRUE,  -- currently clocked in
  auto_clocked_out BOOLEAN DEFAULT FALSE,  -- flagged if system auto-closed (forgot to clock out)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_tech_sessions_ro ON pcb_tech_sessions(repair_order_id);
CREATE INDEX idx_pcb_tech_sessions_tech ON pcb_tech_sessions(tech_employee_id, is_active);
CREATE INDEX idx_pcb_tech_sessions_line ON pcb_tech_sessions(service_line_id);
CREATE INDEX idx_pcb_tech_sessions_tenant ON pcb_tech_sessions(tenant_id);
```

**Business rules:**
- A tech clocks INTO a specific service line (not the whole RO)
- A tech can only be clocked into ONE line at a time (across all ROs)
- When clocking into a new line, auto-clock-out of the previous line with a confirmation prompt
- Multiple techs CAN be clocked into the SAME line simultaneously (rare but possible)
- If a tech is still clocked in at end of business (configurable, e.g., 7 PM), the system auto-clocks them out and flags `auto_clocked_out = true` so the advisor/owner can review
- `duration_minutes` is calculated as the difference between clock_in and clock_out on save
- On RO close, ALL active sessions must be closed (prompt if any are still open)

**Advisor ID tracking on RO:**
```sql
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS advisor_employee_id UUID REFERENCES pcb_employees(id);
```

This records which advisor created/owns this RO. Required field on RO creation.

### 1F. Customer Authorization & Documentation

```sql
-- Authorization tracking per line (for add-ons that need separate customer approval)
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS authorization_method VARCHAR(20)
  CHECK (authorization_method IN ('in_person', 'phone', 'text', 'email', 'portal'));
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS authorization_timestamp TIMESTAMPTZ;
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS authorization_confirmation_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS authorization_confirmation_id VARCHAR(100);  -- Twilio message SID or email ID

-- RO-level signature
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS customer_signature_data TEXT;  -- base64 signature image
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS customer_signature_timestamp TIMESTAMPTZ;
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS customer_signature_ip VARCHAR(45);
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS customer_signature_method VARCHAR(20) DEFAULT 'digital'
  CHECK (customer_signature_method IN ('digital', 'paper', 'verbal'));

-- Mileage at RO creation (may already exist on vehicle, but need it ON the RO as a snapshot)
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS mileage_in INTEGER;
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS mileage_out INTEGER;
```

### 1G. Declined Repairs & Follow-Up Campaigns

```sql
-- Declined services tracking (denormalized for campaign targeting)
CREATE TABLE IF NOT EXISTS pcb_declined_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL REFERENCES pcb_customers(id),
  vehicle_id UUID NOT NULL REFERENCES pcb_vehicles(id),
  repair_order_id UUID NOT NULL REFERENCES pcb_repair_orders(id),
  service_line_id UUID NOT NULL REFERENCES pcb_service_lines(id),
  service_description TEXT NOT NULL,
  estimated_cost DECIMAL(10,2),
  declined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  follow_up_sent BOOLEAN DEFAULT FALSE,
  follow_up_sent_at TIMESTAMPTZ,
  follow_up_response VARCHAR(20),  -- 'booked', 'declined_again', 'no_response'
  follow_up_campaign_id UUID,
  converted_to_ro_id UUID REFERENCES pcb_repair_orders(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_declined_customer ON pcb_declined_services(tenant_id, customer_id);
CREATE INDEX idx_pcb_declined_followup ON pcb_declined_services(tenant_id, follow_up_sent, declined_at);

-- Campaign settings
CREATE TABLE IF NOT EXISTS pcb_campaign_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  declined_followup_enabled BOOLEAN DEFAULT TRUE,
  declined_followup_days INTEGER[] DEFAULT '{3,7,14}',  -- send follow-ups at 3, 7, and 14 days after decline
  declined_followup_channel VARCHAR(10) DEFAULT 'email'
    CHECK (declined_followup_channel IN ('email', 'sms', 'both')),
  declined_followup_email_template TEXT,
  declined_followup_sms_template TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1H. Reporting Snapshot Table (for RO close)

When an RO is closed, freeze all the data into an immutable reporting record. This ensures reports are accurate even if the original data is later modified.

```sql
CREATE TABLE IF NOT EXISTS pcb_ro_close_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  repair_order_id UUID NOT NULL REFERENCES pcb_repair_orders(id) UNIQUE,
  location_id UUID REFERENCES pcb_locations(id),
  advisor_employee_id UUID REFERENCES pcb_employees(id),
  ro_number VARCHAR(20) NOT NULL,
  customer_id UUID,
  vehicle_id UUID,

  -- Line counts
  total_lines INTEGER NOT NULL DEFAULT 0,
  original_lines INTEGER NOT NULL DEFAULT 0,
  addon_lines INTEGER NOT NULL DEFAULT 0,
  inspection_lines INTEGER NOT NULL DEFAULT 0,
  approved_addon_lines INTEGER NOT NULL DEFAULT 0,
  declined_addon_lines INTEGER NOT NULL DEFAULT 0,

  -- Revenue
  total_parts_revenue DECIMAL(10,2) DEFAULT 0,
  total_labor_revenue DECIMAL(10,2) DEFAULT 0,
  total_fees_revenue DECIMAL(10,2) DEFAULT 0,
  total_sublet_revenue DECIMAL(10,2) DEFAULT 0,
  total_discount DECIMAL(10,2) DEFAULT 0,
  total_customer_pay DECIMAL(10,2) DEFAULT 0,
  total_internal_charges DECIMAL(10,2) DEFAULT 0,
  total_warranty_charges DECIMAL(10,2) DEFAULT 0,

  -- Labor hours
  total_billed_hours DECIMAL(8,2) DEFAULT 0,
  total_actual_hours DECIMAL(8,2) DEFAULT 0,  -- from tech sessions

  -- Tech data (JSON array of tech session summaries)
  tech_summary JSONB DEFAULT '[]',
  -- Format: [{ tech_id, tech_number, lines_worked, billed_hours, actual_hours, efficiency_pct }]

  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_snapshots_tenant ON pcb_ro_close_snapshots(tenant_id, closed_at DESC);
CREATE INDEX idx_pcb_snapshots_advisor ON pcb_ro_close_snapshots(tenant_id, advisor_employee_id, closed_at DESC);
CREATE INDEX idx_pcb_snapshots_location ON pcb_ro_close_snapshots(tenant_id, location_id, closed_at DESC);
```

---

Now run ALL the schema changes above. If any ALTER TABLE fails because the column already exists, that's fine — the `IF NOT EXISTS` should handle it. If a CREATE TABLE fails because the table exists, also fine. Verify all tables and columns exist after running.

---

## PHASE 2: BACKEND API ROUTES

### 2A. Estimate Routes

Add these new API routes (or modify existing ones). Keep existing RO routes working.

```
GET    /api/pcbauto/v1/estimates                -- List all estimates (is_estimate = true)
POST   /api/pcbauto/v1/estimates                -- Create new estimate (auto-generate EST- number)
GET    /api/pcbauto/v1/estimates/:id            -- Get estimate detail
PATCH  /api/pcbauto/v1/estimates/:id            -- Update estimate
POST   /api/pcbauto/v1/estimates/:id/convert    -- Convert estimate to RO
DELETE /api/pcbauto/v1/estimates/:id            -- Delete estimate (only if not converted)
```

**Convert estimate to RO logic:**
1. Create a new pcb_repair_orders record with `is_estimate = false`
2. Generate the next RO number using the location-based sequence
3. Copy all service lines from the estimate to the new RO
4. Set `converted_to_ro_id` on the estimate
5. Set `converted_from_estimate_id` on the new RO
6. Return the new RO

### 2B. Location Routes

```
GET    /api/pcbauto/v1/locations                -- List all locations for tenant
POST   /api/pcbauto/v1/locations                -- Create new location
PATCH  /api/pcbauto/v1/locations/:id            -- Update location
```

On tenant first setup (if no locations exist), auto-create Location 1 with the shop's address.

### 2C. Tech Session Routes

```
POST   /api/pcbauto/v1/tech-sessions/clock-in   -- Clock tech into a service line
POST   /api/pcbauto/v1/tech-sessions/clock-out   -- Clock tech out of current line
GET    /api/pcbauto/v1/tech-sessions/active       -- Get all active sessions (for dashboard)
GET    /api/pcbauto/v1/tech-sessions/ro/:roId     -- Get all sessions for an RO
GET    /api/pcbauto/v1/tech-sessions/tech/:techId -- Get session history for a tech
```

**Clock-in logic:**
1. Check if tech is currently clocked into any line (`is_active = true`)
2. If yes, auto-clock-out of that line first (set clock_out = NOW(), calculate duration_minutes, set is_active = false)
3. Create new session record with clock_in = NOW(), is_active = true
4. Return the new session

**Clock-out logic:**
1. Find the tech's active session (`is_active = true`)
2. Set clock_out = NOW()
3. Calculate duration_minutes = EXTRACT(EPOCH FROM (clock_out - clock_in)) / 60
4. Set is_active = false
5. Return the updated session

### 2D. Authorization Routes

```
POST   /api/pcbauto/v1/repair-orders/:id/authorize-line   -- Record customer authorization for a line
POST   /api/pcbauto/v1/repair-orders/:id/send-authorization -- Send authorization request via SMS/email
POST   /api/pcbauto/v1/repair-orders/:id/signature         -- Save customer signature
```

**Send authorization logic:**
1. Build a message with the line items needing approval, their descriptions and prices
2. Send via Twilio SMS (or Resend email) to the customer's contact on file
3. Include a link to the existing estimate approval portal (if applicable)
4. Record the Twilio message SID as `authorization_confirmation_id`
5. Set `authorization_confirmation_sent = true`
6. Log an event in pcb_ro_events

### 2E. Declined Services Routes

```
POST   /api/pcbauto/v1/declined-services                    -- Record a declined service
GET    /api/pcbauto/v1/declined-services/pending-followup    -- Get services needing follow-up
POST   /api/pcbauto/v1/declined-services/:id/send-followup   -- Send follow-up manually
GET    /api/pcbauto/v1/declined-services/customer/:customerId -- Get all declined services for a customer
```

**When a service line's approval_status is set to 'declined':**
1. Automatically create a pcb_declined_services record
2. Copy the service description, estimated cost, customer_id, vehicle_id
3. The follow-up scheduler (see 2G) handles automated sending

### 2F. RO Close Logic

**When an RO status is changed to 'completed' or 'closed':**
1. Check for any active tech sessions — if found, prompt to close them or auto-close with flag
2. Aggregate all line item data into a pcb_ro_close_snapshots record
3. Calculate: total lines, addon lines, approved/declined counts, revenue by type, labor hours
4. Build tech_summary JSON from pcb_tech_sessions
5. Any lines with approval_status = 'declined' → create pcb_declined_services records
6. Fire an event to pcb_ro_events: event_type = 'ro_closed'
7. If QuickBooks is connected, trigger the QBO sync

### 2G. Follow-Up Campaign Scheduler

Create a background job (or cron-like function) that runs daily (or every few hours):

```
1. Query pcb_campaign_settings for tenants with declined_followup_enabled = true
2. For each tenant, query pcb_declined_services where:
   - follow_up_sent = false
   - declined_at + followup_days[n] <= NOW()
3. For each match, send the appropriate follow-up (email, SMS, or both)
4. Update follow_up_sent = true, follow_up_sent_at = NOW()
5. Log the event
```

Use the existing Twilio and Resend integrations for sending.

**Campaign settings UI** goes in Settings > Campaigns (new settings sub-page):
- Toggle: Enable/disable declined repair follow-ups
- Days input: Comma-separated or multi-input for follow-up intervals (default: 3, 7, 14)
- Channel selector: Email, SMS, or Both
- Template editor: Simple text editor with merge fields: {customer_name}, {vehicle_year_make_model}, {service_description}, {shop_name}, {shop_phone}

### 2H. Reporting Routes

```
GET /api/pcbauto/v1/reports/monthly-summary?start=YYYY-MM-DD&end=YYYY-MM-DD
GET /api/pcbauto/v1/reports/advisor-performance?start=YYYY-MM-DD&end=YYYY-MM-DD&advisor_id=UUID
GET /api/pcbauto/v1/reports/tech-efficiency?start=YYYY-MM-DD&end=YYYY-MM-DD&tech_id=UUID
```

**Monthly summary query** (from pcb_ro_close_snapshots):
```sql
SELECT
  COUNT(*) as total_ros,
  AVG(total_lines) as avg_lines_per_ro,
  AVG(addon_lines) as avg_addon_lines_per_ro,
  SUM(total_billed_hours) as total_hours_sold,
  SUM(total_labor_revenue) as total_labor_revenue,
  SUM(total_parts_revenue) as total_parts_revenue,
  AVG(total_customer_pay) as avg_ro_value,
  SUM(total_customer_pay) as total_revenue,
  SUM(total_internal_charges) as total_internal_charges,
  SUM(total_warranty_charges) as total_warranty_charges,
  CASE WHEN SUM(addon_lines) > 0
    THEN ROUND(SUM(approved_addon_lines)::numeric / SUM(addon_lines) * 100, 1)
    ELSE 0 END as addon_approval_rate
FROM pcb_ro_close_snapshots
WHERE tenant_id = $1
  AND closed_at BETWEEN $2 AND $3;
```

**Advisor performance** — same table, grouped by `advisor_employee_id`.

**Tech efficiency** — aggregate from pcb_tech_sessions joined with pcb_service_lines (for billed_hours):
```sql
SELECT
  t.tech_employee_id,
  e.employee_number,
  e.first_name || ' ' || e.last_name as tech_name,
  COUNT(DISTINCT t.service_line_id) as lines_completed,
  SUM(t.duration_minutes) / 60.0 as actual_hours,
  SUM(sl.labor_hours) as billed_hours,
  CASE WHEN SUM(t.duration_minutes) > 0
    THEN ROUND(SUM(sl.labor_hours) / (SUM(t.duration_minutes) / 60.0) * 100, 1)
    ELSE 0 END as efficiency_pct
FROM pcb_tech_sessions t
JOIN pcb_employees e ON t.tech_employee_id = e.id
JOIN pcb_service_lines sl ON t.service_line_id = sl.id
WHERE t.tenant_id = $1
  AND t.clock_in BETWEEN $2 AND $3
  AND t.clock_out IS NOT NULL
GROUP BY t.tech_employee_id, e.employee_number, e.first_name, e.last_name;
```

---

## PHASE 3: FRONTEND UI CHANGES

### 3A. RO Detail Page — Service Line Updates

Modify the existing RO detail / service line editor to add these elements to each line item:

**For EACH service line row, add:**

1. **Line origin indicator** — Show next to the line number:
   - Original lines: just the number (e.g., "1")
   - Add-on lines: number with asterisk and subtle highlight (e.g., "2 *" with a small yellow "ADD-ON" badge)
   - Inspection lines: number with inspection icon (e.g., "3 🔍")

2. **Parts Pay Type dropdown** — Small dropdown or segmented button:
   - Options: "Customer Pay" | "Internal" | "Warranty"
   - Default: Customer Pay
   - When Internal or Warranty is selected, show the retail_value_override input field
   - When Warranty is selected, show warranty_vendor and warranty_claim_number fields

3. **Labor Pay Type dropdown** — Same as above but for the labor component:
   - Options: "Customer Pay" | "Internal" | "Warranty"
   - Default: Customer Pay
   - Include a toggle/switch to quickly flip labor to Internal (for the warranty-labor-eaten scenario)

4. **Tech assignment indicator** — Show which tech(s) are currently clocked into this line:
   - Small avatar/badge with tech employee_number
   - If no tech assigned, show "Unassigned" in gray
   - If tech is actively clocked in, show a green dot

5. **Authorization status** — For add-on lines:
   - Show approval_status badge: Pending (yellow), Approved (green), Declined (red), Deferred (gray)
   - Show authorization_timestamp if approved

**Color coding for labor types:**
- Customer Pay lines: normal/white background
- Internal lines: light yellow (#FFFBEB) background or left border
- Warranty lines: light blue (#EFF6FF) background or left border

**RO Summary at bottom should show TWO sections:**
1. **Customer Total** — Only customer_pay line items summed
2. **Internal/Warranty Charges** — Summary of internal and warranty amounts (visible to advisor/owner only, NOT on customer-facing documents)

### 3B. Estimates Tab/Page

Add a tab or toggle on the existing RO list page:

```
[Repair Orders]  [Estimates]
```

- Repair Orders tab: shows only records where is_estimate = false
- Estimates tab: shows only records where is_estimate = true
- Estimate rows show: estimate_number, customer name, vehicle, date, total, status
- If an estimate has been converted to an RO, show the linked RO number as a clickable link
- Add a "New Estimate" button that creates a record with is_estimate = true
- On estimate detail page, add a "Convert to Repair Order" button (prominent, e.g., green)

### 3C. Tech Portal View

Create a new page/view accessible from the main navigation: **"Tech Portal"** or accessible at route `/tech-portal`

This is a simplified view for technicians on shop floor tablets:

```
┌─────────────────────────────────────────────────────┐
│  PCB Auto — Tech Portal          [Tech #: 104]  [⏱] │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Currently Clocked Into:                             │
│  ┌──────────────────────────────────────────────┐    │
│  │ RO #10042 — 2019 Honda Accord                │    │
│  │ Line 2: Front Brake Pad Replacement          │    │
│  │ ⏱ Clocked in: 2:15 PM (1h 23m elapsed)      │    │
│  │                           [CLOCK OUT]        │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  My Assigned ROs:                                    │
│  ┌──────────────────────────────────────────────┐    │
│  │ RO #10042 — 2019 Honda Accord                │    │
│  │   Line 1: Oil Change ✅ Complete              │    │
│  │   Line 2: Front Brakes ⏱ In Progress         │    │
│  │   Line 3: Tire Rotation ○ Not Started         │    │
│  │                                               │    │
│  │ RO #10045 — 2021 Toyota Camry                │    │
│  │   Line 1: Vehicle Inspection ○ Not Started    │    │
│  │                         [CLOCK IN]           │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  NO PRICING VISIBLE — techs do not see dollar amounts│
└─────────────────────────────────────────────────────┘
```

**Critical: NO PRICING on this view.** Techs see descriptions, parts lists, labor descriptions — but NO dollar amounts. No unit prices, no totals, no hourly rates. This is explicitly required by the consultant.

**Tech login:** Tech enters their employee_number (and optionally PIN) to access their portal. They only see ROs where they have been assigned to at least one line, or ROs that are unassigned and available.

### 3D. Dashboard Updates

On the main dashboard/advisor view, add:

1. **Active Tech Sessions widget** — Shows who is clocked into what right now:
   ```
   Tech #104 — RO #10042, Line 2 (Front Brakes) — 1h 23m
   Tech #107 — RO #10045, Line 1 (Inspection) — 0h 15m
   Tech #112 — Not clocked in
   ```

2. **Balance widget** — Already exists (consultant says he likes it). Add date range filter: Today | This Week | This Month | Custom Range.

3. **Add-On Metrics card** (small):
   ```
   Today's Add-Ons: 7 presented / 5 approved (71%)
   ```

### 3E. RO Print Template (Hard Card)

The printed/PDF version of the RO must include:
- RO number (prominently displayed)
- Date/time created
- Advisor name and number
- Customer: full name, address, phone number
- Vehicle: year, make, model, VIN, mileage in
- All service lines with descriptions (NO cash/card pricing split — just the single customer price)
- Customer signature line (with date)
- Add-on authorization section (if applicable) with separate signature/date line
- Shop name, address, phone at top
- A disclaimer/terms section at bottom

### 3F. Reports Pages

Add three new report pages under the existing Reports section:

1. **Monthly Summary Report** — Date range picker, shows the aggregated metrics from 2H
2. **Advisor Performance Report** — Date range + advisor filter, shows per-advisor metrics
3. **Tech Efficiency Report** — Date range + tech filter, shows hours billed vs actual, efficiency %

Each report should have an "Export to Excel" button using the existing Excel export functionality.

### 3G. Campaign Settings Page

Under Settings, add a new sub-page: **"Follow-Up Campaigns"**

- Toggle: Enable declined repair follow-ups
- Day intervals: Editable list (default 3, 7, 14 days)
- Channel: Radio buttons — Email | SMS | Both
- Email template: Text area with merge field helper buttons
- SMS template: Text area (160 char warning) with merge field helper buttons
- Test button: Send a test follow-up to the shop owner's email/phone

### 3H. Employee Number Setup

In the existing Staff/Employee management section:
- Add an "Employee Number" field (e.g., 101, 102, 103...)
- Add a "PIN" field (4-6 digits) for quick tech portal login
- Auto-generate employee numbers sequentially if not manually set
- These numbers are what show up on ROs, tech sessions, and reports (not names)

---

## PHASE 4: BUSINESS LOGIC & INTEGRATIONS

### 4A. RO Number Generation

Create a server-side utility function that:
1. Looks up the tenant's location (or default location if single-location)
2. Locks the pcb_ro_sequences row for that location (SELECT ... FOR UPDATE)
3. Increments current_number
4. Returns (location_number * 10000) + current_number
5. This must be atomic — no two ROs should ever get the same number

Same pattern for estimate numbers using pcb_estimate_sequences.

### 4B. Auto Clock-Out Scheduler

Create a background job that runs every hour (or at a configurable time like 7 PM):
1. Find all pcb_tech_sessions where is_active = true and clock_in is more than X hours ago (configurable, default 10 hours)
2. Auto-clock-out: set clock_out = NOW(), duration_minutes, is_active = false, auto_clocked_out = true
3. Log a warning event

### 4C. RO Close Snapshot Generation

When an RO is closed:
1. Query all service lines for the RO
2. Query all tech sessions for the RO
3. Aggregate into a pcb_ro_close_snapshots record
4. Calculate all the metrics (total lines, addon lines, revenue by type, hours, tech summary)
5. Insert the snapshot
6. Process any declined lines into pcb_declined_services
7. This happens in a single database transaction

### 4D. SMS Authorization Confirmation

When an add-on line is approved (either via portal or by advisor marking it approved):
1. If the shop has SMS enabled, send a confirmation text to the customer:
   ```
   [Shop Name]: You authorized the following additional repair on your [Year Make Model]:
   - [Service Description] — $[Amount]
   Authorized at [Timestamp].
   Reply STOP to unsubscribe.
   ```
2. Store the Twilio message SID as authorization_confirmation_id
3. Log the event in pcb_ro_events

---

## IMPORTANT REMINDERS

1. **Do NOT remove cash/card dual pricing from the system** — it still exists for payment processing and reports. Just don't show it on the RO line editor or tech views. The dual pricing calculation happens at payment/invoice time, not on the work order screen.

2. **Do NOT break existing RO functionality** — All existing ROs should continue to work. New columns should have sensible defaults (parts_pay_type = 'customer_pay', labor_pay_type = 'customer_pay', line_origin = 'original').

3. **Every vehicle in the shop MUST have an RO** — Consider adding a warning/modal if someone tries to close all ROs for a day without accounting for all checked-in vehicles. This is an insurance requirement.

4. **Employee numbers, not names** — Wherever possible in operational views (tech portal, RO detail, dashboards), show employee numbers. Names can appear in admin/settings views.

5. **Test the RO close flow thoroughly** — The snapshot generation is the backbone of all reporting. If it breaks or misses data, the owner's reports will be wrong.

6. **Run database migrations before touching frontend code.** Schema must exist before the API routes reference new columns, and API routes must exist before frontend components call them.
