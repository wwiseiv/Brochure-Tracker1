# PCB Auto — Technical Architecture & Build Guide v1.0

**Product:** PCB Auto — Modular Auto Repair Shop Operating System
**Parent Platform:** PCBISV.com
**Date:** February 8, 2026
**Author:** William Wise / Architecture Team

---

## Table of Contents

1. Scope Summary & Confirmed Decisions
2. Assumptions & Open Questions
3. Architecture & Service Boundaries
4. Data Model / Schema
5. API Contracts & Webhook Catalog
6. UI Screens & Navigation Map
7. MVP Build Plan (Phases & Milestones)
8. Integration Interface Stubs
9. Dual Pricing Compliance Engine
10. Risks & Mitigations

---

## 1. Scope Summary & Confirmed Decisions

### What We're Building

PCB Auto is a multi-tenant, modular shop management SaaS for independent auto repair shops and franchises. It handles the complete money path: **RO → Estimate → Customer Approval → Repair Workflow → Invoice → Get Paid → Bring Customer Back.**

It lives inside the PCBISV codebase as a standalone module with its own subdomain (e.g., `shop.pcbisv.com`), sharing the database and authentication infrastructure but presenting a completely separate merchant-facing experience.

### Confirmed Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Product Name | PCB Auto | Ties to PCBancard roots, professional |
| Backend Stack | Node.js / Express / TypeScript | Match PCBISV, single codebase |
| Frontend Stack | React / TypeScript / Vite / Tailwind CSS | Match PCBISV, dark mode UI |
| Database | PostgreSQL (shared with PCBISV) | Single DB, tenant isolation via RLS |
| Architecture | Same app, same DB, subdomain routing | `shop.pcbisv.com` for merchants, `app.pcbisv.com` for PCBISV admin |
| First Processor | FluidPay | Hosted pages with custom branding, iframe embed, terminal support |
| Processor Dropdown | PCBancard (NMI), SignaPay (NMI/PayHub+), Priority Commerce, CardConnect/CardPointe, FluidPay | PCBISV admin selects at onboarding; shop never sees |
| Pay-by-Link UX | FluidPay hosted page in iframe/modal | Seamless experience, minimal PCI scope (SAQ A) |
| Terminal Hardware | FluidPay-compatible terminals | Single ecosystem for POC |
| Dual Pricing Config | Configurable per shop by PCBISV admin | Range: 3.0%–4.0%, typical 3.5–3.99% |
| Dual Pricing Model | Cash discount (NOT surcharging) | Legal all 50 states, no card network registration |
| SMS/Email Provider | Twilio | SMS + email, industry standard |
| Parts Integration | PartsTech Punchout API (modal embed) | Fastest path, credentials already obtained |
| VIN Decoder | NHTSA vPIC API (free) | No auth required, 130+ attributes per VIN |
| Accounting Sync | QuickBooks Online (OAuth 2.0) | Two-way sync for invoices, payments, customers |
| Invoice Format | PDF + Word with embedded payment links | Professional shop receipts with dual pricing disclosure |
| POC Goal | Internal proof of architecture | Validate tech stack, then polish for shop demos |
| RBAC Roles | Owner/Admin, Service Advisor, Technician, Bookkeeper | Role-based + location-based |
| Logo/Branding | Shield + gear + car, royal blue (#1B3A6B) + orange (#D4782F) | Dark mode primary theme |

---

## 2. Assumptions & Open Questions

### Assumptions (labeled ASSUMPTION)

1. **ASSUMPTION:** FluidPay's hosted payment page supports iframe embedding with custom CSS/branding. **Verification needed:** Review FluidPay developer docs for iframe/embed parameters and CORS policy.
2. **ASSUMPTION:** FluidPay offers terminal integration APIs (push-to-terminal from web app). **Verification needed:** Contact FluidPay sales/dev support for terminal SDK documentation.
3. **ASSUMPTION:** PartsTech Punchout API uses postMessage or callback URL pattern to return selected parts data. **Verification needed:** Complete partner registration and obtain Punchout integration docs.
4. **ASSUMPTION:** PCBISV's existing auth system (JWT-based) can be extended with tenant-scoped tokens that route to the PCB Auto subdomain.
5. **ASSUMPTION:** Replit's PostgreSQL supports Row Level Security policies for multi-tenant isolation.
6. **ASSUMPTION:** MOTOR labor guide data is available via API (not just embedded in other products). **Verification needed:** Contact MOTOR sales for DaaS API pricing and access.

### Open Questions (TBD)

| # | Question | Impact | Owner |
|---|----------|--------|-------|
| 1 | FluidPay iframe embed: do they support `postMessage` callbacks for payment completion? | Determines if we can update RO timeline in real-time | William — contact FluidPay |
| 2 | FluidPay terminal models: which hardware, what SDK, REST or websocket push? | Determines terminal integration architecture | William — contact FluidPay |
| 3 | PartsTech partner registration timeline and Punchout API documentation access? | Blocks Phase 2 parts integration | William — email support@partstech.com |
| 4 | MOTOR labor guide API availability and pricing for small SaaS platform? | Determines if Phase 2 labor guide is MOTOR or manual-only | William — contact MOTOR sales |
| 5 | Do all 5 processor gateways support the `surcharge` or `service_fee` field natively? | Determines per-gateway dual pricing implementation | William — review each gateway's API docs |
| 6 | Twilio phone number provisioning: one number per shop location or shared? | Affects cost model and SMS branding | Architecture team |
| 7 | QuickBooks Online app review timeline for public listing? | Determines if QBO works for POC or needs sandbox-only | William |

---

## 3. Architecture & Service Boundaries

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    INTERNET / DNS                        │
│                                                         │
│  app.pcbisv.com          shop.pcbisv.com              │
│  (PCBISV Admin Portal)       (PCB Auto Merchant Portal)    │
│         │                         │                     │
└─────────┼─────────────────────────┼─────────────────────┘
          │                         │
          ▼                         ▼
┌─────────────────────────────────────────────────────────┐
│              NGINX / REPLIT REVERSE PROXY                │
│         (subdomain routing middleware)                   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                 NODE.JS / EXPRESS APP                    │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  PCBISV Core    │  │  PCB Auto    │  │  Shared       │  │
│  │  Module      │  │  Module      │  │  Services     │  │
│  │              │  │              │  │               │  │
│  │ • Agent CRM  │  │ • Shop Mgmt  │  │ • Auth/JWT    │  │
│  │ • Proposals  │  │ • RO/Est/Inv │  │ • Tenant Mgr  │  │
│  │ • Training   │  │ • Payments   │  │ • File Upload │  │
│  │ • AI Coach   │  │ • Parts      │  │ • Audit Log   │  │
│  │ • Billing    │  │ • Scheduling │  │ • Notifications│ │
│  │              │  │ • Comms      │  │ • Feature Flags│ │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │           INTEGRATION ADAPTER LAYER              │   │
│  │                                                  │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐            │   │
│  │  │FluidPay │ │  NMI    │ │Priority │            │   │
│  │  │Adapter  │ │Adapter  │ │Adapter  │            │   │
│  │  └─────────┘ └─────────┘ └─────────┘            │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐            │   │
│  │  │CardConn │ │PartsTech│ │ Twilio  │            │   │
│  │  │Adapter  │ │Adapter  │ │Adapter  │            │   │
│  │  └─────────┘ └─────────┘ └─────────┘            │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐            │   │
│  │  │  QBO    │ │  NHTSA  │ │ MOTOR   │            │   │
│  │  │Adapter  │ │Adapter  │ │Adapter  │            │   │
│  │  └─────────┘ └─────────┘ └─────────┘            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  POSTGRESQL DATABASE                     │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ PCBISV Tables   │  │ PCB Auto     │  │ Shared       │  │
│  │ (existing)   │  │ Tables       │  │ Tables       │  │
│  │              │  │ (new, prefixed│  │              │  │
│  │              │  │  pcb_*)      │  │ • tenants    │  │
│  │              │  │              │  │ • users      │  │
│  │              │  │              │  │ • roles      │  │
│  │              │  │              │  │ • audit_logs │  │
│  │              │  │              │  │ • features   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│         Row Level Security (tenant_id on all rows)      │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Tenancy Model

**Recommendation: Single database, shared schema, Row Level Security (RLS)**

| Option | Pros | Cons |
|--------|------|------|
| **A) Single DB + RLS (RECOMMENDED)** | Simple ops, shared infrastructure, easy cross-tenant reporting for PCBISV admin, works on Replit's single Postgres instance | Must enforce tenant_id on every query; risk of data leak if RLS misconfigured |
| B) Per-tenant schemas | Stronger isolation, easier per-tenant backup/restore | Complex migrations, connection pooling overhead, harder cross-tenant queries |
| C) Per-tenant databases | Maximum isolation | Operationally expensive, not feasible on Replit, overkill for POC |

**Implementation:** Every PCB Auto table includes `tenant_id UUID NOT NULL REFERENCES tenants(id)`. PostgreSQL RLS policies enforce `current_setting('app.tenant_id') = tenant_id::text` on SELECT/INSERT/UPDATE/DELETE. The Express middleware sets `app.tenant_id` on every request from the JWT token.

### 3.3 Subdomain Routing

```typescript
// middleware/subdomainRouter.ts
export const subdomainRouter = (req: Request, res: Response, next: NextFunction) => {
  const host = req.hostname;

  if (host.startsWith('shop.') || host.startsWith('shop-')) {
    // PCB Auto merchant portal routes
    req.app.set('portal', 'pcbauto');
    return pcbAutoRouter(req, res, next);
  }

  // Default: PCBISV admin portal
  req.app.set('portal', 'fsi');
  return fsiRouter(req, res, next);
};
```

### 3.4 Authentication Flow

```
PCBISV Admin creates shop → generates tenant record + admin user
  → Shop owner receives email with shop.pcbisv.com link
  → Shop owner logs in (same auth system, different UI)
  → JWT contains: { userId, tenantId, role, portal: 'pcbauto' }
  → All API requests scoped by tenantId via RLS
```

### 3.5 Event Model

**Recommendation: Append-only timeline (event sourcing lite)**

Every repair order has an immutable event stream. Events are stored in `pcb_ro_events` and never updated or deleted. The current state of an RO is derived from the latest events (or cached in the RO record for performance).

```typescript
type ROEventType =
  | 'ro_created' | 'estimate_built' | 'estimate_sent'
  | 'line_item_added' | 'line_item_removed' | 'line_item_modified'
  | 'approval_requested' | 'approval_received' | 'approval_declined'
  | 'work_started' | 'tech_assigned' | 'bay_assigned'
  | 'parts_ordered' | 'parts_received' | 'parts_installed'
  | 'inspection_completed' | 'photo_added' | 'note_added'
  | 'invoice_generated' | 'payment_link_sent' | 'payment_received'
  | 'payment_failed' | 'refund_issued' | 'void_processed'
  | 'qbo_synced' | 'status_changed' | 'customer_contacted';
```

---

## 4. Data Model / Schema

### 4.1 Shared Tables (existing PCBISV, extended)

```sql
-- Already exists in PCBISV; extended with PCB Auto fields
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS
  pcb_enabled BOOLEAN DEFAULT FALSE,
  pcb_subdomain VARCHAR(100),
  pcb_processor VARCHAR(50) CHECK (pcb_processor IN (
    'fluidpay', 'nmi_pcbancard', 'nmi_signapay',
    'priority', 'cardconnect'
  )),
  pcb_processor_config JSONB DEFAULT '{}',  -- gateway keys, merchant IDs
  pcb_dual_pricing_pct DECIMAL(4,2) DEFAULT 3.99,
  pcb_dual_pricing_enabled BOOLEAN DEFAULT TRUE,
  pcb_partstech_username VARCHAR(255),
  pcb_partstech_api_key VARCHAR(255),
  pcb_qbo_realm_id VARCHAR(50),
  pcb_qbo_access_token TEXT,
  pcb_qbo_refresh_token TEXT,
  pcb_qbo_token_expires_at TIMESTAMPTZ,
  pcb_twilio_phone VARCHAR(20),
  pcb_shop_name VARCHAR(255),
  pcb_shop_address TEXT,
  pcb_shop_phone VARCHAR(20),
  pcb_shop_email VARCHAR(255),
  pcb_shop_logo_url TEXT,
  pcb_tax_rate DECIMAL(5,3) DEFAULT 0.000,
  pcb_labor_rate DECIMAL(10,2) DEFAULT 125.00,
  pcb_shop_supply_pct DECIMAL(4,2) DEFAULT 0.00,
  pcb_shop_supply_cap DECIMAL(10,2) DEFAULT 0.00;
```

### 4.2 PCB Auto Core Tables

```sql
-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE pcb_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  phone_secondary VARCHAR(20),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state CHAR(2),
  zip VARCHAR(10),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  preferred_contact VARCHAR(10) DEFAULT 'sms'
    CHECK (preferred_contact IN ('sms', 'email', 'phone')),
  qbo_customer_id VARCHAR(50),
  fleet_account BOOLEAN DEFAULT FALSE,
  card_on_file_token VARCHAR(255),   -- vault token, never PAN
  card_on_file_last4 CHAR(4),
  card_on_file_brand VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email),
  UNIQUE(tenant_id, phone)
);

CREATE INDEX idx_pcb_customers_tenant ON pcb_customers(tenant_id);
CREATE INDEX idx_pcb_customers_phone ON pcb_customers(tenant_id, phone);
CREATE INDEX idx_pcb_customers_name ON pcb_customers(tenant_id, last_name, first_name);

-- ============================================
-- VEHICLES
-- ============================================
CREATE TABLE pcb_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL REFERENCES pcb_customers(id) ON DELETE CASCADE,
  vin VARCHAR(17),
  license_plate VARCHAR(15),
  license_state CHAR(2),
  year INTEGER,
  make VARCHAR(100),
  model VARCHAR(100),
  submodel VARCHAR(100),
  engine VARCHAR(100),
  transmission VARCHAR(50),
  drive_type VARCHAR(20),
  color VARCHAR(50),
  mileage_last_known INTEGER,
  mileage_updated_at TIMESTAMPTZ,
  nhtsa_data JSONB DEFAULT '{}',    -- cached VIN decode
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_vehicles_tenant ON pcb_vehicles(tenant_id);
CREATE INDEX idx_pcb_vehicles_vin ON pcb_vehicles(tenant_id, vin);
CREATE INDEX idx_pcb_vehicles_customer ON pcb_vehicles(tenant_id, customer_id);
CREATE INDEX idx_pcb_vehicles_plate ON pcb_vehicles(tenant_id, license_state, license_plate);

-- ============================================
-- EMPLOYEES (techs, advisors, etc.)
-- ============================================
CREATE TABLE pcb_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),  -- links to PCBISV auth system
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN (
    'owner', 'admin', 'service_advisor', 'technician', 'bookkeeper'
  )),
  email VARCHAR(255),
  phone VARCHAR(20),
  labor_rate_override DECIMAL(10,2),  -- NULL = use shop default
  certifications TEXT[] DEFAULT '{}',
  pin VARCHAR(10),                     -- quick clock-in PIN
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BAYS
-- ============================================
CREATE TABLE pcb_bays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  bay_number VARCHAR(10) NOT NULL,
  name VARCHAR(100),
  bay_type VARCHAR(30) DEFAULT 'general'
    CHECK (bay_type IN ('general', 'alignment', 'paint', 'detail', 'inspection')),
  active BOOLEAN DEFAULT TRUE,
  UNIQUE(tenant_id, bay_number)
);

-- ============================================
-- REPAIR ORDERS (the central entity)
-- ============================================
CREATE TYPE pcb_ro_status AS ENUM (
  'estimate',          -- building the estimate
  'sent',              -- estimate sent to customer
  'approved',          -- customer approved (some or all lines)
  'in_progress',       -- work underway
  'waiting_parts',     -- blocked on parts delivery
  'quality_check',     -- tech done, advisor reviewing
  'completed',         -- work done, ready to invoice
  'invoiced',          -- invoice generated
  'paid',              -- payment collected
  'cancelled',         -- cancelled/voided
  'on_hold'            -- parked (customer deferred)
);

CREATE TABLE pcb_repair_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  ro_number SERIAL,
  customer_id UUID NOT NULL REFERENCES pcb_customers(id),
  vehicle_id UUID NOT NULL REFERENCES pcb_vehicles(id),
  assigned_advisor_id UUID REFERENCES pcb_employees(id),
  assigned_tech_id UUID REFERENCES pcb_employees(id),
  bay_id UUID REFERENCES pcb_bays(id),
  status pcb_ro_status DEFAULT 'estimate',
  mileage_in INTEGER,
  mileage_out INTEGER,
  customer_concern TEXT,
  internal_notes TEXT,
  promised_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Calculated totals (updated on line item changes)
  subtotal_parts DECIMAL(10,2) DEFAULT 0,
  subtotal_labor DECIMAL(10,2) DEFAULT 0,
  subtotal_fees DECIMAL(10,2) DEFAULT 0,
  subtotal_discounts DECIMAL(10,2) DEFAULT 0,
  shop_supplies DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_card_price DECIMAL(10,2) DEFAULT 0,
  total_cash_price DECIMAL(10,2) DEFAULT 0,
  cash_discount_pct DECIMAL(4,2),       -- snapshot from tenant config at creation

  -- Approval tracking
  approval_token VARCHAR(100) UNIQUE,    -- secure token for customer approval link
  approval_token_expires_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by_name VARCHAR(255),
  approved_by_ip VARCHAR(50),
  approved_by_device TEXT,
  approval_signature_url TEXT,           -- e-signature image if captured

  -- Payment tracking
  payment_link_token VARCHAR(100) UNIQUE,
  payment_link_expires_at TIMESTAMPTZ,
  payment_method VARCHAR(30) CHECK (payment_method IN (
    'card_present', 'pay_link', 'cash', 'check', 'ach', 'split'
  )),
  payment_gateway_txn_id VARCHAR(255),
  payment_amount DECIMAL(10,2),
  payment_tip DECIMAL(10,2) DEFAULT 0,
  paid_at TIMESTAMPTZ,

  -- Accounting sync
  qbo_invoice_id VARCHAR(50),
  qbo_payment_id VARCHAR(50),
  qbo_synced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_ro_tenant ON pcb_repair_orders(tenant_id);
CREATE INDEX idx_pcb_ro_status ON pcb_repair_orders(tenant_id, status);
CREATE INDEX idx_pcb_ro_customer ON pcb_repair_orders(tenant_id, customer_id);
CREATE INDEX idx_pcb_ro_vehicle ON pcb_repair_orders(tenant_id, vehicle_id);
CREATE INDEX idx_pcb_ro_approval_token ON pcb_repair_orders(approval_token);
CREATE INDEX idx_pcb_ro_payment_token ON pcb_repair_orders(payment_link_token);
CREATE INDEX idx_pcb_ro_created ON pcb_repair_orders(tenant_id, created_at DESC);

-- ============================================
-- SERVICE LINES (parts, labor, fees on an RO)
-- ============================================
CREATE TABLE pcb_service_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  repair_order_id UUID NOT NULL REFERENCES pcb_repair_orders(id) ON DELETE CASCADE,
  line_type VARCHAR(20) NOT NULL CHECK (line_type IN (
    'labor', 'part', 'fee', 'discount', 'sublet', 'shop_supply'
  )),
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_cost DECIMAL(10,2) DEFAULT 0,       -- wholesale / cost basis
  unit_price DECIMAL(10,2) NOT NULL,        -- card price (posted/sticker price)
  labor_hours DECIMAL(5,2),                 -- for labor lines
  labor_rate DECIMAL(10,2),                 -- rate used for this line
  part_number VARCHAR(100),
  part_brand VARCHAR(100),
  supplier VARCHAR(100),
  partstech_order_id VARCHAR(100),
  markup_pct DECIMAL(5,2),                  -- parts markup applied
  taxable BOOLEAN DEFAULT TRUE,
  approval_status VARCHAR(20) DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'declined', 'deferred')),
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_lines_ro ON pcb_service_lines(repair_order_id);
CREATE INDEX idx_pcb_lines_tenant ON pcb_service_lines(tenant_id);

-- ============================================
-- RO EVENT TIMELINE (immutable, append-only)
-- ============================================
CREATE TABLE pcb_ro_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  repair_order_id UUID NOT NULL REFERENCES pcb_repair_orders(id),
  event_type VARCHAR(50) NOT NULL,
  actor_id UUID REFERENCES users(id),       -- who triggered it (NULL for system)
  actor_name VARCHAR(255),
  metadata JSONB DEFAULT '{}',              -- event-specific data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_events_ro ON pcb_ro_events(repair_order_id, created_at);
CREATE INDEX idx_pcb_events_tenant ON pcb_ro_events(tenant_id, created_at DESC);

-- ============================================
-- PAYMENTS (supports split payments)
-- ============================================
CREATE TABLE pcb_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  repair_order_id UUID NOT NULL REFERENCES pcb_repair_orders(id),
  idempotency_key VARCHAR(100) NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  method VARCHAR(30) NOT NULL CHECK (method IN (
    'card_present', 'pay_link', 'cash', 'check', 'ach'
  )),
  processor VARCHAR(50),                    -- fluidpay, nmi_pcbancard, etc.
  gateway_txn_id VARCHAR(255),
  gateway_response JSONB DEFAULT '{}',
  card_brand VARCHAR(20),
  card_last4 CHAR(4),
  auth_code VARCHAR(20),
  is_dual_priced BOOLEAN DEFAULT FALSE,
  card_price DECIMAL(10,2),                 -- amount if paid by card
  cash_price DECIMAL(10,2),                 -- amount if paid by cash
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'authorized', 'captured', 'settled',
                      'declined', 'voided', 'refunded', 'partial_refund')),
  refund_amount DECIMAL(10,2) DEFAULT 0,
  refund_txn_id VARCHAR(255),
  receipt_url TEXT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_payments_ro ON pcb_payments(repair_order_id);
CREATE INDEX idx_pcb_payments_tenant ON pcb_payments(tenant_id, created_at DESC);
CREATE INDEX idx_pcb_payments_idempotency ON pcb_payments(idempotency_key);

-- ============================================
-- APPOINTMENTS / SCHEDULING
-- ============================================
CREATE TABLE pcb_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID REFERENCES pcb_customers(id),
  vehicle_id UUID REFERENCES pcb_vehicles(id),
  repair_order_id UUID REFERENCES pcb_repair_orders(id),
  assigned_tech_id UUID REFERENCES pcb_employees(id),
  bay_id UUID REFERENCES pcb_bays(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'confirmed', 'checked_in',
                      'in_progress', 'completed', 'no_show', 'cancelled')),
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_appointments_tenant ON pcb_appointments(tenant_id, scheduled_start);

-- ============================================
-- DIGITAL VEHICLE INSPECTIONS (DVI)
-- ============================================
CREATE TABLE pcb_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  repair_order_id UUID NOT NULL REFERENCES pcb_repair_orders(id),
  inspector_id UUID REFERENCES pcb_employees(id),
  completed_at TIMESTAMPTZ,
  sent_to_customer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pcb_inspection_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES pcb_inspections(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,       -- 'Brakes', 'Tires', 'Fluids', etc.
  item VARCHAR(255) NOT NULL,           -- 'Front Brake Pads', 'Tire Tread Depth'
  condition VARCHAR(10) NOT NULL
    CHECK (condition IN ('green', 'yellow', 'red')),
  notes TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  measurement VARCHAR(50),              -- '4mm', '32 psi', etc.
  sort_order INTEGER DEFAULT 0
);

-- ============================================
-- PARTS ORDERS (tracking from PartsTech)
-- ============================================
CREATE TABLE pcb_parts_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  repair_order_id UUID NOT NULL REFERENCES pcb_repair_orders(id),
  partstech_order_id VARCHAR(100),
  supplier VARCHAR(255),
  status VARCHAR(20) DEFAULT 'ordered'
    CHECK (status IN ('quoted', 'ordered', 'shipped', 'received',
                      'installed', 'returned', 'cancelled')),
  total_cost DECIMAL(10,2),
  ordered_at TIMESTAMPTZ DEFAULT NOW(),
  received_at TIMESTAMPTZ,
  received_by UUID REFERENCES pcb_employees(id)
);

-- ============================================
-- COMMUNICATION EVENTS
-- ============================================
CREATE TABLE pcb_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  repair_order_id UUID REFERENCES pcb_repair_orders(id),
  customer_id UUID REFERENCES pcb_customers(id),
  channel VARCHAR(10) NOT NULL CHECK (channel IN ('sms', 'email')),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  template_name VARCHAR(100),
  to_address VARCHAR(255) NOT NULL,     -- phone or email
  from_address VARCHAR(255),
  subject VARCHAR(255),                 -- email only
  body TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'failed',
                      'bounced', 'clicked', 'replied', 'opted_out')),
  twilio_sid VARCHAR(100),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_comms_ro ON pcb_communications(repair_order_id);
CREATE INDEX idx_pcb_comms_customer ON pcb_communications(tenant_id, customer_id);

-- ============================================
-- MAINTENANCE REMINDERS
-- ============================================
CREATE TABLE pcb_maintenance_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL REFERENCES pcb_customers(id),
  vehicle_id UUID NOT NULL REFERENCES pcb_vehicles(id),
  service_type VARCHAR(100) NOT NULL,   -- 'Oil Change', 'Tire Rotation', etc.
  due_date DATE,
  due_mileage INTEGER,
  last_service_date DATE,
  last_service_mileage INTEGER,
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'completed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DUAL PRICING STATE RULES (reference data)
-- ============================================
CREATE TABLE pcb_state_pricing_rules (
  state_code CHAR(2) PRIMARY KEY,
  state_name VARCHAR(50) NOT NULL,
  surcharge_allowed BOOLEAN NOT NULL,
  surcharge_cap DECIMAL(4,2),
  cash_discount_allowed BOOLEAN DEFAULT TRUE,
  cash_discount_cap DECIMAL(4,2),
  required_disclosure TEXT,
  special_rules JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOG (immutable, all modules)
-- ============================================
CREATE TABLE pcb_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,     -- 'repair_order', 'payment', 'customer', etc.
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_audit_tenant ON pcb_audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_pcb_audit_entity ON pcb_audit_log(entity_type, entity_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE pcb_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcb_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcb_repair_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcb_service_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcb_ro_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcb_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcb_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcb_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcb_parts_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcb_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcb_maintenance_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcb_audit_log ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (repeat pattern for all tables)
CREATE POLICY tenant_isolation ON pcb_customers
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
```

---

## 5. API Contracts & Webhook Catalog

### 5.1 API Route Structure

All PCB Auto API routes are prefixed with `/api/pcbauto/` and require JWT authentication with `portal: 'pcbauto'` claim.

```
BASE: /api/pcbauto/v1

── /auth
   POST   /login                    Login (returns JWT)
   POST   /logout                   Invalidate session
   GET    /me                       Current user + tenant info

── /customers
   GET    /                         List customers (search, paginate)
   POST   /                         Create customer
   GET    /:id                      Get customer detail + vehicles
   PUT    /:id                      Update customer
   DELETE /:id                      Soft delete

── /vehicles
   GET    /                         List vehicles (by customer or search)
   POST   /                         Create vehicle
   GET    /:id                      Get vehicle detail + service history
   PUT    /:id                      Update vehicle
   POST   /decode-vin              Decode VIN via NHTSA API
   POST   /lookup-plate            Lookup plate → VIN (commercial API)

── /repair-orders
   GET    /                         List ROs (filter by status, date, customer)
   POST   /                         Create RO (returns with estimate status)
   GET    /:id                      Get RO detail (lines, events, payments)
   PUT    /:id                      Update RO metadata
   PATCH  /:id/status              Update RO status
   DELETE /:id                      Cancel/void RO

   ── /:id/lines
      GET    /                      List service lines
      POST   /                      Add line item
      PUT    /:lineId               Update line item
      DELETE /:lineId               Remove line item
      POST   /recalculate           Recalculate totals + dual pricing

   ── /:id/approval
      POST   /send                  Send approval request (SMS + email)
      GET    /status                Check approval status

   ── /:id/invoice
      POST   /generate              Generate PDF/Word invoice
      GET    /download/:format      Download invoice (pdf/docx)
      POST   /send                  Send invoice to customer

   ── /:id/payment
      POST   /create-link           Generate pay-by-link
      POST   /push-terminal         Push payment to terminal
      POST   /record-cash           Record cash/check payment
      POST   /refund                Process refund
      POST   /void                  Void transaction

   ── /:id/events
      GET    /                      Get RO event timeline

   ── /:id/inspection
      POST   /                      Create DVI
      PUT    /:inspId               Update DVI
      POST   /:inspId/send          Send DVI to customer

── /parts
   POST   /search                   Launch PartsTech Punchout
   POST   /import                   Import cart items from PartsTech
   GET    /orders                   List parts orders
   PATCH  /orders/:id/status        Update parts order status

── /scheduling
   GET    /appointments             List appointments (date range)
   POST   /appointments             Create appointment
   PUT    /appointments/:id         Update appointment
   DELETE /appointments/:id         Cancel appointment
   GET    /availability             Get tech/bay availability

── /workflow
   GET    /board                    Get workflow board (all ROs by status)
   PATCH  /assign                   Assign tech/bay to RO

── /communications
   GET    /                         List communication events
   POST   /send-sms                 Send SMS
   POST   /send-email               Send email
   GET    /templates                List message templates
   POST   /templates                Create template

── /reports
   GET    /dashboard                Dashboard summary metrics
   GET    /sales                    Sales report (date range)
   GET    /ar-aging                 Accounts receivable aging
   GET    /tech-productivity        Technician productivity
   GET    /car-count                Car count by period
   GET    /approval-rate            Estimate approval rate

── /settings
   GET    /shop                     Get shop settings
   PUT    /shop                     Update shop settings
   GET    /employees                List employees
   POST   /employees                Add employee
   PUT    /employees/:id            Update employee
   GET    /bays                     List bays
   POST   /bays                     Add bay
   PUT    /bays/:id                 Update bay
   GET    /pricing-rules            Get dual pricing rules
   PUT    /pricing-rules            Update pricing config

── /integrations
   GET    /status                   Integration connection statuses
   POST   /qbo/connect              Initiate QBO OAuth
   GET    /qbo/callback             QBO OAuth callback
   POST   /qbo/sync                 Manual sync trigger
   POST   /qbo/disconnect           Disconnect QBO
   GET    /partstech/status         PartsTech connection status
   PUT    /partstech/config         Update PartsTech credentials

── PUBLIC (no auth required, token-validated)
   GET    /public/approve/:token    Customer approval page
   POST   /public/approve/:token    Submit approval
   GET    /public/pay/:token        Customer payment page
   POST   /public/pay/:token/complete  Payment callback
   GET    /public/invoice/:token    View invoice (read-only)
   GET    /public/inspection/:token View DVI report
```

### 5.2 Public Link Security

```typescript
// Token generation for approval and payment links
interface PublicLinkConfig {
  type: 'approval' | 'payment' | 'invoice' | 'inspection';
  repairOrderId: string;
  expiresIn: number;  // hours (default: 72 for approval, 168 for payment)
}

// Token format: base64url(JSON.stringify({ type, roId, tenantId, exp, nonce }))
// + HMAC-SHA256 signature
// Example: eyJ0eXBlIjoiYXBwcm92YWwiLC...  .  a1b2c3d4e5f6...

// Security measures:
// - Expiration (configurable per link type)
// - One-time use for approvals (consumed on submit)
// - Rate limiting: 10 requests per minute per IP
// - HMAC signature prevents tampering
// - Nonce prevents replay
// - No tenant or customer PII in the token itself
```

### 5.3 Webhook Events (outbound)

PCB Auto can fire webhooks to configured endpoints (for future integrations):

| Event | Payload |
|-------|---------|
| `ro.created` | RO summary |
| `ro.status_changed` | RO id, old_status, new_status |
| `estimate.sent` | RO id, customer, total |
| `estimate.approved` | RO id, approved lines, timestamp |
| `invoice.generated` | RO id, invoice URL |
| `payment.received` | RO id, amount, method, txn_id |
| `payment.failed` | RO id, amount, error |
| `payment.refunded` | RO id, refund amount, txn_id |
| `parts.ordered` | RO id, parts list, supplier |
| `parts.received` | RO id, parts received |
| `appointment.created` | Appointment details |
| `appointment.reminder` | Appointment + customer |
| `maintenance.due` | Customer, vehicle, service type |

---

## 6. UI Screens & Navigation Map

### 6.1 PCB Auto Merchant Portal (shop.pcbisv.com)

**Theme:** Dark mode, royal blue (#1B3A6B) primary, metallic orange (#D4782F) CTAs, Tailwind CSS

```
┌─────────────────────────────────────────────────────┐
│ ┌──────────┐                                        │
│ │ PCB Auto │  Dashboard  ROs  Customers  Schedule   │
│ │  [logo]  │  Parts  Reports  Settings              │
│ └──────────┘                                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│              [ MAIN CONTENT AREA ]                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 6.2 Screen List

**A) Dashboard (Home)**
- Today's stats: car count, revenue, pending approvals, pending payments
- "Fees Saved" metric (dual pricing savings for shop)
- Cash vs. card revenue breakdown (donut chart)
- Upcoming appointments (next 3)
- ROs needing attention (overdue, waiting approval)
- Quick actions: New RO, Quick Customer Search

**B) Repair Orders**
- **Board View** (default): Kanban columns — Estimate → Sent → Approved → In Progress → Waiting Parts → Completed → Invoiced → Paid
- **List View** (toggle): Sortable table with search/filter
- **RO Detail Page:**
  - Header: customer name, vehicle, RO#, status badge
  - **Estimate Builder** (main section):
    - Labor section: add labor lines (description, hours, rate, price)
    - Parts section: add parts (manual or PartsTech Punchout button)
    - Fees/Discounts section
    - Running totals bar (always visible): Parts | Labor | Tax | **Card Total** | **Cash Total**
    - Big orange CTA: "Send for Approval"
  - **Timeline** (right sidebar): append-only event feed
  - **Actions bar**: Send Approval | Generate Invoice | Take Payment | Push to Terminal

**C) Customer Approval Page (public, no auth)**
- Shop logo + branding
- Vehicle info
- Line items with card price and cash price columns
- Per-line approve/decline/defer toggles
- Totals (card vs cash)
- E-signature capture (draw or type name)
- Approve button with consent text
- Compliance disclosure text at bottom

**D) Invoice / Payment Page (public, no auth)**
- Professional invoice layout (matches PDF)
- Shop logo, address, phone
- Customer + vehicle info
- Line items with dual pricing
- Payment summary: Card Total vs Cash Total
- Embedded FluidPay iframe (payment form)
- Receipt confirmation on completion

**E) Customers**
- Customer list with search
- Customer detail: info, vehicles, service history (all ROs), communication log
- Add/edit customer modal
- "Add Vehicle" from customer detail

**F) Vehicles**
- Vehicle list (searchable by VIN, plate, YMM)
- Vehicle detail: specs, mileage history, full service history
- VIN decode button (auto-fill from NHTSA)

**G) Scheduling**
- Calendar view (day/week) with bay rows
- Drag-and-drop appointment management
- Color-coded by status
- Quick-create appointment modal

**H) Workflow Board**
- Full-width Kanban with RO cards
- Cards show: customer, vehicle, advisor, tech, total, age
- Drag to change status
- Click to open RO detail

**I) Parts** (Phase 2)
- PartsTech Punchout launcher
- Active parts orders with status tracking
- Received parts checklist

**J) Reports**
- Dashboard: revenue, car count, avg RO value, approval rate
- Sales report (date range, advisor breakdown)
- A/R aging (unpaid invoices)
- Tech productivity (hours flagged vs. available)
- Cash vs. card payment breakdown
- Fees saved report

**K) Settings**
- Shop profile (name, address, logo, contact)
- Employees (CRUD, role assignment)
- Bays (CRUD)
- Dual pricing configuration
- Tax rates
- Labor rates (by category)
- Parts markup rules
- Message templates
- Integration connections (QBO, PartsTech)

### 6.3 PCBISV Admin Panel Additions

Inside the existing PCBISV admin at app.pcbisv.com:

- **Merchant Onboarding:** "Enable PCB Auto" toggle per tenant
- **Processor Selection:** Dropdown (FluidPay, PCBancard/NMI, SignaPay/NMI, Priority, CardConnect)
- **Gateway Credentials:** API keys, merchant IDs per processor
- **Dual Pricing %:** Set per merchant (3.0–4.0%)
- **Billing:** PCB Auto subscription fee management
- **Launch Button:** "Open PCB Auto Portal" → opens shop.pcbisv.com in new tab

---

## 7. MVP Build Plan

### Phase 1: "Estimate → Approve → Invoice → Get Paid" (POC)

**Duration:** 4–6 weeks
**Goal:** Internal proof of architecture; demonstrate full money path

| Week | Milestone | Deliverables | Acceptance Test |
|------|-----------|-------------|-----------------|
| 1 | **Foundation** | DB schema migration, subdomain routing, PCB Auto auth flow, dark mode shell with navigation, logo integration | Login at shop.pcbisv.com renders PCB Auto dashboard shell |
| 2 | **Customer + Vehicle CRM** | Customer CRUD, Vehicle CRUD, VIN decoder (NHTSA), customer search | Create customer + vehicle via VIN decode in < 30 seconds |
| 3 | **RO + Estimate Builder** | Create RO, add manual labor/parts/fees, dual pricing calculator, running totals, RO detail page | Build complete estimate with 3 labor + 4 parts lines in < 3 minutes; card and cash totals display correctly |
| 4 | **Approval + Communications** | Generate approval token, Twilio SMS/email send, public approval page with e-signature, approval metadata capture, RO timeline events | Send approval via SMS; customer opens link, approves with signature; approval appears in RO timeline with IP/timestamp |
| 5 | **Invoice + Payment** | PDF invoice generation (with dual pricing + payment link), FluidPay hosted page iframe integration, payment confirmation flow, payment recorded in timeline | Generate invoice PDF; customer clicks payment link in invoice; pays via FluidPay; payment event appears in RO timeline |
| 6 | **Polish + Reports** | Dashboard metrics, basic sales/AR reports, audit log viewer, RBAC enforcement, PCBISV admin onboarding flow | Admin creates shop in PCBISV; shop owner logs into PCB Auto; creates RO → sends estimate → customer approves → invoice paid. Full cycle in < 10 minutes |

### Phase 2: "Make Estimates Fast" (4 weeks)

| Week | Milestone | Deliverables |
|------|-----------|-------------|
| 7 | PartsTech Punchout integration | Modal embed, cart import, parts on estimate lines |
| 8 | Workflow board + bay/tech management | Kanban board, drag-and-drop status, tech assignment |
| 9 | Scheduling + DVI | Appointment calendar, basic digital vehicle inspection |
| 10 | Multi-processor support | NMI adapter (PCBancard + SignaPay), Priority adapter, CardConnect adapter |

### Phase 3: "Growth Engine" (4 weeks)

| Week | Milestone | Deliverables |
|------|-----------|-------------|
| 11 | QuickBooks Online sync | OAuth flow, invoice/payment/customer sync |
| 12 | Maintenance reminders + automations | Service reminder engine, automated SMS/email sequences |
| 13 | Terminal push payments | FluidPay terminal API integration, push-to-terminal from RO |
| 14 | Multi-location + reporting | Location selector, consolidated reporting, export |

---

## 8. Integration Interface Stubs

### 8.1 Payment Adapter (gateway-agnostic)

```typescript
// interfaces/payments.ts

interface PaymentCreateRequest {
  tenantId: string;
  repairOrderId: string;
  amount: number;               // in cents
  tipAmount?: number;           // in cents
  currency: string;             // 'USD'
  isDualPriced: boolean;
  cardPrice: number;            // in cents
  cashPrice: number;            // in cents
  customerEmail?: string;
  customerPhone?: string;
  idempotencyKey: string;
  metadata: {
    roNumber: string;
    customerName: string;
    vehicleDescription: string;
    shopName: string;
  };
}

interface PaymentLinkResponse {
  linkUrl: string;              // URL for customer to pay
  linkToken: string;            // internal tracking token
  expiresAt: Date;
  hostedPageId?: string;        // gateway-specific page ID
  embedUrl?: string;            // URL for iframe embed
}

interface TerminalPushRequest {
  tenantId: string;
  repairOrderId: string;
  terminalId: string;           // gateway-assigned terminal ID
  amount: number;               // in cents
  tipEnabled: boolean;
  idempotencyKey: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
  authCode: string;
  cardBrand: string;
  cardLast4: string;
  amount: number;
  status: 'authorized' | 'captured' | 'declined' | 'error';
  errorMessage?: string;
  receiptUrl?: string;
  rawResponse: Record<string, unknown>;
}

interface RefundRequest {
  tenantId: string;
  originalTransactionId: string;
  amount: number;               // in cents (partial refund supported)
  reason: string;
  idempotencyKey: string;
}

interface PaymentAdapter {
  name: string;                 // 'fluidpay', 'nmi', 'priority', 'cardconnect'

  // Pay-by-link
  createPaymentLink(req: PaymentCreateRequest): Promise<PaymentLinkResponse>;

  // Terminal
  pushToTerminal(req: TerminalPushRequest): Promise<PaymentResult>;

  // Direct charge (card-on-file)
  chargeToken(tokenId: string, amount: number, idempotencyKey: string): Promise<PaymentResult>;

  // Refund/void
  refund(req: RefundRequest): Promise<PaymentResult>;
  voidTransaction(transactionId: string, idempotencyKey: string): Promise<PaymentResult>;

  // Webhooks
  parseWebhook(headers: Record<string, string>, body: string): Promise<WebhookEvent>;
  verifyWebhookSignature(headers: Record<string, string>, body: string): boolean;

  // Health
  testConnection(): Promise<{ connected: boolean; message: string }>;
}

// Gateway factory
function createPaymentAdapter(processor: string, config: Record<string, string>): PaymentAdapter {
  switch (processor) {
    case 'fluidpay':       return new FluidPayAdapter(config);
    case 'nmi_pcbancard':  return new NMIAdapter(config);
    case 'nmi_signapay':   return new NMIAdapter(config);
    case 'priority':       return new PriorityAdapter(config);
    case 'cardconnect':    return new CardConnectAdapter(config);
    default: throw new Error(`Unsupported processor: ${processor}`);
  }
}
```

### 8.2 FluidPay Adapter (POC primary)

```typescript
// adapters/fluidpay.ts

class FluidPayAdapter implements PaymentAdapter {
  name = 'fluidpay';
  private apiKey: string;
  private baseUrl = 'https://sandbox.fluidpay.com/api';  // TBD: confirm production URL

  constructor(config: Record<string, string>) {
    this.apiKey = config.apiKey;
    // TBD: FluidPay API base URL (sandbox vs production)
    // TBD: FluidPay merchant ID field name
    // TBD: FluidPay hosted page configuration endpoint
  }

  async createPaymentLink(req: PaymentCreateRequest): Promise<PaymentLinkResponse> {
    // TBD: Exact FluidPay API endpoint for creating hosted payment pages
    // TBD: Parameters for custom branding (logo URL, colors)
    // TBD: Callback/webhook URL configuration
    // TBD: iframe embed URL format

    // PLACEHOLDER implementation:
    const response = await fetch(`${this.baseUrl}/payment-links`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: req.amount,
        currency: req.currency,
        customer_email: req.customerEmail,
        // TBD: map all required fields
        metadata: req.metadata,
        idempotency_key: req.idempotencyKey,
      }),
    });

    const data = await response.json();
    return {
      linkUrl: data.url,            // TBD: actual field name
      linkToken: data.id,           // TBD: actual field name
      expiresAt: new Date(data.expires_at),
      embedUrl: data.embed_url,     // TBD: does FluidPay provide this?
    };
  }

  async pushToTerminal(req: TerminalPushRequest): Promise<PaymentResult> {
    // TBD: FluidPay terminal API endpoint
    // TBD: Terminal registration/pairing process
    // TBD: Push vs. poll model for terminal transactions
    throw new Error('FluidPay terminal integration TBD — awaiting API docs');
  }

  // ... remaining methods follow same TBD pattern
}
```

### 8.3 NMI Adapter (PCBancard + SignaPay)

```typescript
// adapters/nmi.ts

class NMIAdapter implements PaymentAdapter {
  name = 'nmi';
  private securityKey: string;
  private baseUrl = 'https://secure.nmi.com/api/transact.php';

  constructor(config: Record<string, string>) {
    this.securityKey = config.securityKey;
  }

  async createPaymentLink(req: PaymentCreateRequest): Promise<PaymentLinkResponse> {
    // NMI uses Collect.js for hosted fields, not traditional payment links
    // For pay-by-link: generate a PCB Auto hosted page that embeds Collect.js
    // The "link" is our own page: /public/pay/:token
    // Collect.js tokenizes → our backend charges via NMI API

    return {
      linkUrl: `https://shop.pcbisv.com/public/pay/${req.idempotencyKey}`,
      linkToken: req.idempotencyKey,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      embedUrl: undefined, // NMI doesn't provide hosted page embed
    };
  }

  async chargeToken(tokenId: string, amount: number, idempotencyKey: string): Promise<PaymentResult> {
    // NMI Direct Post API
    const params = new URLSearchParams({
      security_key: this.securityKey,
      type: 'sale',
      amount: (amount / 100).toFixed(2),
      payment_token: tokenId,  // from Collect.js
    });

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      body: params,
    });

    const text = await response.text();
    const result = Object.fromEntries(new URLSearchParams(text));

    return {
      success: result.response === '1',
      transactionId: result.transactionid,
      authCode: result.authcode,
      cardBrand: result.cc_type || '',
      cardLast4: result.cc_number?.slice(-4) || '',
      amount: amount,
      status: result.response === '1' ? 'captured' : 'declined',
      errorMessage: result.responsetext,
      rawResponse: result,
    };
  }

  // ... refund, void follow NMI Direct Post patterns
}
```

### 8.4 Parts Adapter (PartsTech)

```typescript
// interfaces/parts.ts

interface VehicleContext {
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
  engine?: string;
}

interface PartSearchResult {
  partNumber: string;
  description: string;
  brand: string;
  supplier: string;
  supplierPartNumber: string;
  listPrice: number;
  costPrice: number;
  coreCharge: number;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock' | 'special_order';
  deliveryEta: string;
  quantity: number;
  imageUrl?: string;
}

interface PartsCartImport {
  items: PartSearchResult[];
  vehicle: VehicleContext;
  partsTechOrderId?: string;
}

interface PartsAdapter {
  name: string;

  // Punchout: returns URL to embed in modal
  launchPunchout(vehicle: VehicleContext, callbackUrl: string): Promise<{
    punchoutUrl: string;
    sessionId: string;
  }>;

  // Process callback from Punchout (selected parts returned)
  parsePunchoutCallback(payload: Record<string, unknown>): Promise<PartsCartImport>;

  // Full API (Phase 2+): direct search
  searchParts?(vehicle: VehicleContext, query: string): Promise<PartSearchResult[]>;

  // Order management
  submitOrder?(items: PartSearchResult[], deliveryInstructions: string): Promise<{
    orderId: string;
    status: string;
    estimatedDelivery: string;
  }>;

  testConnection(): Promise<{ connected: boolean; message: string }>;
}

// PartsTech Punchout implementation
class PartsTechPunchoutAdapter implements PartsAdapter {
  name = 'partstech_punchout';
  private username: string;
  private apiKey: string;

  constructor(config: { username: string; apiKey: string }) {
    this.username = config.username;
    this.apiKey = config.apiKey;
  }

  async launchPunchout(vehicle: VehicleContext, callbackUrl: string): Promise<{
    punchoutUrl: string;
    sessionId: string;
  }> {
    // TBD: Exact Punchout URL format from PartsTech partner docs
    // ASSUMPTION: punchout.partstech.com accepts vehicle context + callback
    const sessionId = crypto.randomUUID();
    const params = new URLSearchParams({
      username: this.username,
      api_key: this.apiKey,
      vin: vehicle.vin || '',
      year: String(vehicle.year || ''),
      make: vehicle.make || '',
      model: vehicle.model || '',
      callback_url: callbackUrl,
      session_id: sessionId,
    });

    return {
      punchoutUrl: `https://punchout.partstech.com/search?${params.toString()}`,
      sessionId,
    };
  }

  async parsePunchoutCallback(payload: Record<string, unknown>): Promise<PartsCartImport> {
    // TBD: Exact callback payload structure from PartsTech
    // ASSUMPTION: Returns array of selected parts with pricing
    throw new Error('Awaiting PartsTech Punchout documentation');
  }
}
```

### 8.5 Messaging Adapter (Twilio)

```typescript
// adapters/twilio.ts

interface SendSMSRequest {
  to: string;                // E.164 format
  body: string;
  from?: string;             // Twilio number (per-tenant)
  mediaUrls?: string[];
}

interface SendEmailRequest {
  to: string;
  from: string;
  fromName: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  replyTo?: string;
}

interface MessagingAdapter {
  sendSMS(req: SendSMSRequest): Promise<{ sid: string; status: string }>;
  sendEmail(req: SendEmailRequest): Promise<{ id: string; status: string }>;
  parseInboundWebhook(body: Record<string, string>): Promise<{
    from: string;
    body: string;
    direction: 'inbound';
  }>;
}

class TwilioAdapter implements MessagingAdapter {
  private accountSid: string;
  private authToken: string;
  private sendgridApiKey: string;  // Twilio SendGrid for email

  constructor(config: {
    accountSid: string;
    authToken: string;
    sendgridApiKey: string;
  }) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.sendgridApiKey = config.sendgridApiKey;
  }

  async sendSMS(req: SendSMSRequest): Promise<{ sid: string; status: string }> {
    const client = require('twilio')(this.accountSid, this.authToken);
    const message = await client.messages.create({
      body: req.body,
      from: req.from,
      to: req.to,
      mediaUrl: req.mediaUrls,
    });
    return { sid: message.sid, status: message.status };
  }

  async sendEmail(req: SendEmailRequest): Promise<{ id: string; status: string }> {
    // Using Twilio SendGrid
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(this.sendgridApiKey);
    const [response] = await sgMail.send({
      to: req.to,
      from: { email: req.from, name: req.fromName },
      subject: req.subject,
      html: req.htmlBody,
      text: req.textBody,
      replyTo: req.replyTo,
    });
    return { id: response.headers['x-message-id'], status: 'sent' };
  }
}
```

### 8.6 Accounting Adapter (QuickBooks Online)

```typescript
// adapters/quickbooks.ts

interface QBOAdapter {
  // OAuth
  getAuthUrl(tenantId: string, redirectUri: string): string;
  exchangeCode(code: string, realmId: string): Promise<QBOTokens>;
  refreshToken(refreshToken: string): Promise<QBOTokens>;

  // Customers
  syncCustomer(customer: PCBCustomer): Promise<{ qboId: string }>;
  findCustomer(email: string): Promise<QBOCustomer | null>;

  // Invoices
  createInvoice(ro: RepairOrder, lines: ServiceLine[]): Promise<{ qboInvoiceId: string }>;
  recordPayment(qboInvoiceId: string, amount: number, method: string): Promise<{ qboPaymentId: string }>;

  // Items (pre-create service items)
  ensureItems(): Promise<void>;  // creates 'Labor', 'Parts', 'Shop Supplies', 'Fees' items

  // Health
  testConnection(): Promise<{ connected: boolean; companyName: string }>;
}

class QuickBooksOnlineAdapter implements QBOAdapter {
  private clientId: string;
  private clientSecret: string;
  private environment: 'sandbox' | 'production';

  // OAuth endpoints
  private authUrl = 'https://appcenter.intuit.com/connect/oauth2';
  private tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

  // API base
  private get apiBase(): string {
    return this.environment === 'sandbox'
      ? 'https://sandbox-quickbooks.api.intuit.com/v3/company'
      : 'https://quickbooks.api.intuit.com/v3/company';
  }

  // Implementation follows standard QBO OAuth 2.0 + REST API patterns
  // Access tokens expire hourly; refresh tokens last 100 days
  // Store tokens in tenant config, auto-refresh on 401
}
```

### 8.7 VIN Decoder (NHTSA — fully implemented, no TBDs)

```typescript
// adapters/nhtsa.ts

interface VINDecodeResult {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  bodyClass: string;
  engineCylinders: string;
  engineHP: string;
  displacementL: string;
  driveType: string;
  transmissionStyle: string;
  fuelType: string;
  doors: string;
  raw: Record<string, string>;
}

async function decodeVIN(vin: string): Promise<VINDecodeResult> {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`;
  const response = await fetch(url);
  const data = await response.json();
  const r = data.Results[0];

  return {
    vin,
    year: parseInt(r.ModelYear),
    make: r.Make,
    model: r.Model,
    trim: r.Trim || '',
    bodyClass: r.BodyClass,
    engineCylinders: r.EngineCylinders,
    engineHP: r.EngineHP,
    displacementL: r.DisplacementL,
    driveType: r.DriveType,
    transmissionStyle: r.TransmissionStyle,
    fuelType: r.FuelTypePrimary,
    doors: r.Doors,
    raw: r,
  };
}
```

---

## 9. Dual Pricing Compliance Engine

### 9.1 Calculation Logic

```typescript
// services/dualPricing.ts

interface DualPriceResult {
  cashPrice: number;        // base price (the "real" price)
  cardPrice: number;        // cash price + non-cash adjustment
  adjustmentAmount: number; // the fee amount
  adjustmentPct: number;    // configured percentage
  disclosureText: string;   // compliance text for invoices
}

function calculateDualPricing(
  subtotal: number,
  taxRate: number,
  cashDiscountPct: number,
  shopState: string
): DualPriceResult {
  // Card price is the POSTED price (sticker price)
  // Cash price is the discount from posted price
  // This is legally a "cash discount" — NOT a surcharge

  const cardSubtotal = subtotal;
  const cashSubtotal = subtotal / (1 + cashDiscountPct / 100);
  const adjustmentAmount = cardSubtotal - cashSubtotal;

  // Tax calculated on the actual price paid
  const cardTax = cardSubtotal * (taxRate / 100);
  const cashTax = cashSubtotal * (taxRate / 100);

  const cardTotal = cardSubtotal + cardTax;
  const cashTotal = cashSubtotal + cashTax;

  return {
    cashPrice: Math.round(cashTotal * 100) / 100,
    cardPrice: Math.round(cardTotal * 100) / 100,
    adjustmentAmount: Math.round(adjustmentAmount * 100) / 100,
    adjustmentPct: cashDiscountPct,
    disclosureText: generateDisclosure(cashDiscountPct, shopState),
  };
}

function generateDisclosure(pct: number, state: string): string {
  // Base disclosure (works in all 50 states for cash discount model)
  let text = `We offer a ${pct}% cash discount off our posted prices. ` +
    `All prices shown are our standard card prices. ` +
    `Cash, check, and ACH payments receive the discounted price.`;

  // State-specific additions
  const stateRules = STATE_SPECIFIC_DISCLOSURES[state];
  if (stateRules?.additionalText) {
    text += ' ' + stateRules.additionalText;
  }

  return text;
}
```

### 9.2 Invoice Dual Pricing Display

Every invoice (PDF + customer-facing page) must show:
- All line items at the **card price** (posted price)
- A "Cash Discount" summary line showing the discount amount
- Clear **Card Total** and **Cash Total**
- Disclosure text at the bottom
- Never use: "surcharge," "service fee," "processing fee," "convenience fee"
- Always use: "cash discount," "cash price," "card price," "posted price"

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| FluidPay iframe doesn't support custom branding or postMessage callbacks | Medium | High — blocks seamless payment UX | Verify before building; fallback to redirect flow or NMI Collect.js |
| FluidPay terminal API undocumented or limited | Medium | Medium — delays Phase 3 terminal push | Build pay-by-link first; terminal is Phase 3; investigate alternative terminal SDKs |
| PartsTech partner registration takes weeks | Medium | Low — parts is Phase 2 | Manual parts entry works for POC; begin registration immediately |
| Replit PostgreSQL doesn't support RLS or has connection limits | Low | High — blocks multi-tenancy | Test RLS on Replit Postgres immediately in Week 1; fallback to application-level tenant filtering |
| MOTOR labor guide API prohibitively expensive or unavailable | High | Medium — no standard labor times | Build manual labor entry with shop-customizable job templates; labor guide is Phase 2+ |
| Dual pricing compliance changes (state law updates) | Low | Medium — legal risk for merchants | Build state rules as a configurable table, not hardcoded; review quarterly |
| Twilio costs exceed budget at scale | Low | Low | Twilio is pay-as-you-go; at POC scale negligible; optimize with batching later |
| QBO app review blocks production use | Medium | Low — QBO is Phase 3 | Use sandbox for POC; begin app registration early |
