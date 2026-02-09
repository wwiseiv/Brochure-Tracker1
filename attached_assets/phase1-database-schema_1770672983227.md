# PCB Auto — Repair Orders v2: PHASE 1 — Database Schema Changes

## INSTRUCTIONS

This is Phase 1 of 4 in a major Repair Orders update. **This phase is ONLY database schema changes.** Do NOT touch any frontend components, API routes, or UI code in this phase. Just run the schema changes, verify they work, and confirm the app still runs.

**CRITICAL: Do NOT delete or drop any existing tables or columns. Every change here is additive — ALTER TABLE ADD COLUMN or CREATE TABLE. If a column already exists, skip it. If a table already exists, skip it.**

After running all schema changes, start the app and verify it loads without errors. Then confirm all new tables and columns exist by querying the database.

---

## CONTEXT: What This Is About

A consultant with decades of auto repair shop experience reviewed the Repair Orders module and provided detailed feedback. The core changes are:

1. Estimates and Repair Orders must be completely separate with different numbering systems
2. Each RO service line needs independent labor type classification (Customer Pay / Internal / Warranty) for BOTH parts and labor
3. Technicians must clock in/out of specific RO lines, not whole ROs
4. Add-on lines (from inspections) must be tracked separately from original lines for upsell metrics
5. Customer authorization must be documented with timestamps for legal/insurance protection
6. Declined repairs need automated follow-up campaigns
7. Multi-location shops need location-prefixed RO numbers
8. Closing an RO must snapshot all data for immutable reporting

---

## SCHEMA CHANGE 1: Separate Estimates from Repair Orders

Estimates and ROs are NOT the same thing. Estimates are quotes. ROs represent a vehicle physically in the shop. They need separate numbering.

```sql
-- Add estimate fields to repair orders table
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS estimate_number VARCHAR(20);
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS is_estimate BOOLEAN DEFAULT FALSE;
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS converted_from_estimate_id UUID REFERENCES pcb_repair_orders(id);
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS converted_to_ro_id UUID REFERENCES pcb_repair_orders(id);

-- Estimate number sequence per tenant
CREATE TABLE IF NOT EXISTS pcb_estimate_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  current_number INTEGER NOT NULL DEFAULT 10000,
  prefix VARCHAR(10) DEFAULT 'EST-',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Add these to your Drizzle schema file following the same pattern as your existing table definitions.

---

## SCHEMA CHANGE 2: Multi-Location Support & RO Numbering

RO numbers start at 10000 and increment. For multi-location shops, the first digit is the location number: Location 1 = 10001, 10002... Location 2 = 20001, 20002... etc.

```sql
-- Locations table
CREATE TABLE IF NOT EXISTS pcb_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  location_number INTEGER NOT NULL,
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
  current_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, location_id)
);

-- Link ROs to locations
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES pcb_locations(id);
```

---

## SCHEMA CHANGE 3: Labor Type Classification Per Line Item

This is the most important change. Each service line needs TWO labor type fields — one for parts, one for labor. The three types are:

- **customer_pay** — Customer pays (default)
- **internal** — Shop absorbs the cost (fixing their own mistake, eating warranty labor for goodwill). Must still record retail amount for tax purposes.
- **warranty** — Covered by vendor warranty (NAPA, CarQuest, etc.)

```sql
-- Labor type fields on service lines
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS parts_pay_type VARCHAR(20) DEFAULT 'customer_pay'
  CHECK (parts_pay_type IN ('customer_pay', 'internal', 'warranty'));
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS labor_pay_type VARCHAR(20) DEFAULT 'customer_pay'
  CHECK (labor_pay_type IN ('customer_pay', 'internal', 'warranty'));

-- Track retail value even when customer isn't paying (for tax write-offs)
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS retail_value_override DECIMAL(10,2);

-- Warranty tracking
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS warranty_vendor VARCHAR(100);
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS warranty_claim_number VARCHAR(100);
```

**Why TWO fields per line:** A warranty alternator from NAPA means the part is covered (parts_pay_type = 'warranty') but labor is NOT covered (labor_pay_type = 'customer_pay'). If the shop decides to eat the labor as goodwill, they flip labor_pay_type to 'internal' and record the retail labor amount in retail_value_override so they can write it off for taxes.

---

## SCHEMA CHANGE 4: Add-On Line Tracking

Lines added after initial RO creation must be flagged. This tracks service advisor upsell effectiveness.

```sql
-- Add-on and upsell tracking on service lines
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS line_origin VARCHAR(20) DEFAULT 'original'
  CHECK (line_origin IN ('original', 'inspection', 'addon'));
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS added_by_user_id UUID REFERENCES users(id);
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ;

-- Upsell presentation tracking
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS presented_to_customer BOOLEAN DEFAULT FALSE;
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS presented_at TIMESTAMPTZ;
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS presented_by_advisor_id UUID REFERENCES users(id);
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS customer_responded_at TIMESTAMPTZ;
```

**Logic:** Lines created when the RO is first saved = 'original'. Lines added later = 'addon'. Lines generated from DVI inspection = 'inspection'. The approval_status column already exists on pcb_service_lines.

---

## SCHEMA CHANGE 5: Technician Time Tracking Per Line

Techs clock in/out of specific service lines, not whole ROs. Multiple techs can work on the same RO at the same time on different lines.

```sql
-- Employee number and PIN for quick shop floor login
ALTER TABLE pcb_employees ADD COLUMN IF NOT EXISTS employee_number VARCHAR(10);
ALTER TABLE pcb_employees ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10);

-- Tech time sessions per service line
CREATE TABLE IF NOT EXISTS pcb_tech_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  repair_order_id UUID NOT NULL REFERENCES pcb_repair_orders(id),
  service_line_id UUID NOT NULL REFERENCES pcb_service_lines(id) ON DELETE CASCADE,
  tech_employee_id UUID NOT NULL REFERENCES pcb_employees(id),
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  auto_clocked_out BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pcb_tech_sessions_ro ON pcb_tech_sessions(repair_order_id);
CREATE INDEX IF NOT EXISTS idx_pcb_tech_sessions_tech ON pcb_tech_sessions(tech_employee_id, is_active);
CREATE INDEX IF NOT EXISTS idx_pcb_tech_sessions_line ON pcb_tech_sessions(service_line_id);
CREATE INDEX IF NOT EXISTS idx_pcb_tech_sessions_tenant ON pcb_tech_sessions(tenant_id);

-- Advisor assignment on RO
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS advisor_employee_id UUID REFERENCES pcb_employees(id);
```

---

## SCHEMA CHANGE 6: Customer Authorization & Documentation

Every repair authorization must be documented with timestamps for legal and insurance protection.

```sql
-- Authorization tracking per line
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS authorization_method VARCHAR(20)
  CHECK (authorization_method IN ('in_person', 'phone', 'text', 'email', 'portal'));
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS authorization_timestamp TIMESTAMPTZ;
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS authorization_confirmation_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS authorization_confirmation_id VARCHAR(100);

-- RO-level customer signature
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS customer_signature_data TEXT;
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS customer_signature_timestamp TIMESTAMPTZ;
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS customer_signature_ip VARCHAR(45);
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS customer_signature_method VARCHAR(20) DEFAULT 'digital'
  CHECK (customer_signature_method IN ('digital', 'paper', 'verbal'));

-- Mileage snapshot at RO creation
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS mileage_in INTEGER;
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS mileage_out INTEGER;
```

---

## SCHEMA CHANGE 7: Declined Repairs & Follow-Up Campaigns

Declined services are saved for automated follow-up emails/texts.

```sql
-- Declined services tracking
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
  follow_up_response VARCHAR(20),
  follow_up_campaign_id UUID,
  converted_to_ro_id UUID REFERENCES pcb_repair_orders(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pcb_declined_customer ON pcb_declined_services(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_pcb_declined_followup ON pcb_declined_services(tenant_id, follow_up_sent, declined_at);

-- Campaign settings per tenant
CREATE TABLE IF NOT EXISTS pcb_campaign_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) UNIQUE,
  declined_followup_enabled BOOLEAN DEFAULT TRUE,
  declined_followup_days INTEGER[] DEFAULT '{3,7,14}',
  declined_followup_channel VARCHAR(10) DEFAULT 'email'
    CHECK (declined_followup_channel IN ('email', 'sms', 'both')),
  declined_followup_email_template TEXT,
  declined_followup_sms_template TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## SCHEMA CHANGE 8: RO Close Reporting Snapshot

When an RO is closed, all data is frozen into an immutable record for accurate reporting.

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
  total_actual_hours DECIMAL(8,2) DEFAULT 0,

  -- Tech data
  tech_summary JSONB DEFAULT '[]',

  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pcb_snapshots_tenant ON pcb_ro_close_snapshots(tenant_id, closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pcb_snapshots_advisor ON pcb_ro_close_snapshots(tenant_id, advisor_employee_id, closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pcb_snapshots_location ON pcb_ro_close_snapshots(tenant_id, location_id, closed_at DESC);
```

---

## AFTER RUNNING ALL SCHEMA CHANGES

1. **Add all new tables and columns to the Drizzle ORM schema file.** Look at your existing schema file (likely `shared/schema.ts` or `db/schema.ts`) and follow the exact same pattern for defining tables. Every new table and column above needs a corresponding Drizzle definition.

2. **Run `npx drizzle-kit push` or your migration command** to sync the schema.

3. **Auto-create a default location for existing tenants.** Write a one-time script or migration that:
   - For every tenant that has repair orders but no row in pcb_locations, create a Location 1 with `location_number = 1`, `is_primary = true`, and the shop's address from the tenant record
   - Create a corresponding pcb_ro_sequences row with `current_number` set to the highest existing RO number for that tenant

4. **Start the app and verify it loads without errors.** Click through the existing RO pages and confirm nothing is broken. All new columns have defaults so existing data should be unaffected.

5. **Confirm by running this query:**
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN (
  'pcb_repair_orders', 'pcb_service_lines', 'pcb_employees',
  'pcb_estimate_sequences', 'pcb_locations', 'pcb_ro_sequences',
  'pcb_tech_sessions', 'pcb_declined_services', 'pcb_campaign_settings',
  'pcb_ro_close_snapshots'
)
ORDER BY table_name, ordinal_position;
```

Report the output so we can verify everything exists before moving to Phase 2.
