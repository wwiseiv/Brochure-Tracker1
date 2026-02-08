# PCB Auto — Architecture Addendum v1.1 (Rate Remover Parity Patch)

**Applies to:** PCB_Auto_Technical_Architecture_v1.md
**Date:** February 8, 2026
**Purpose:** Merge all Rate Remover feature-parity requirements + gaps identified in the build spec review. Nothing in v1.0 is removed — this is purely additive.

---

## 1. Schema Changes

### 1.1 Tenant Config Additions

```sql
-- Add to tenants table (or ALTER TABLE tenants ADD COLUMN)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS
  pcb_labor_taxable BOOLEAN DEFAULT FALSE,          -- does this shop's state tax labor?
  pcb_parts_tax_rate DECIMAL(5,3) DEFAULT 0.000,    -- parts tax rate (e.g., 7.000 = 7%)
  pcb_labor_tax_rate DECIMAL(5,3) DEFAULT 0.000,    -- labor tax rate (0 if labor not taxed)
  pcb_debit_posture VARCHAR(20) DEFAULT 'signature'  -- 'signature' or 'pin'
    CHECK (pcb_debit_posture IN ('signature', 'pin')),
  pcb_terminal_fee_lock BOOLEAN DEFAULT TRUE,        -- prevent terminal from modifying amount
  pcb_default_parts_markup_pct DECIMAL(5,2) DEFAULT 0.00,
  pcb_shop_supply_method VARCHAR(20) DEFAULT 'none'  -- 'none', 'percentage', 'flat', 'per_line'
    CHECK (pcb_shop_supply_method IN ('none', 'percentage', 'flat', 'per_line'));
```

**Note:** The existing `pcb_tax_rate` field in v1.0 becomes the **parts tax rate** default. We now split into `pcb_parts_tax_rate` and `pcb_labor_tax_rate` with the `pcb_labor_taxable` toggle controlling whether labor tax applies at all.

### 1.2 Service Line Additions (Dual Pricing Flags)

```sql
-- Add to pcb_service_lines table
ALTER TABLE pcb_service_lines ADD COLUMN IF NOT EXISTS
  is_adjustable BOOLEAN DEFAULT TRUE,    -- eligible for card price uplift?
  is_ntnf BOOLEAN DEFAULT FALSE;         -- non-taxable AND not-fee-eligible (overrides both)

-- Updated CHECK constraint for line_type (add 'inspection')
-- line_type IN ('labor', 'part', 'fee', 'discount', 'sublet', 'shop_supply', 'inspection')
```

**Line item pricing logic with new flags:**

| Flag Combo | Taxed? | Card Uplift? | Example |
|-----------|--------|-------------|---------|
| `taxable=true, is_adjustable=true, is_ntnf=false` | Yes | Yes | Brake pads, oil filter, labor |
| `taxable=true, is_adjustable=false, is_ntnf=false` | Yes | **No** | State inspection fee |
| `taxable=false, is_adjustable=true, is_ntnf=false` | No | Yes | Exempt labor in non-labor-tax state |
| `taxable=false, is_adjustable=false, is_ntnf=false` | No | No | Permit fee, disposal fee |
| `is_ntnf=true` (overrides both) | **No** | **No** | Government fees, hazmat disposal |

### 1.3 Repair Order Additions

```sql
-- Add to pcb_repair_orders table
ALTER TABLE pcb_repair_orders ADD COLUMN IF NOT EXISTS
  hide_cash_discount BOOLEAN DEFAULT FALSE,    -- single-price mode (hide dual pricing)
  tax_parts_amount DECIMAL(10,2) DEFAULT 0,    -- tax on parts only
  tax_labor_amount DECIMAL(10,2) DEFAULT 0,    -- tax on labor only (0 if labor not taxed)
  total_adjustable DECIMAL(10,2) DEFAULT 0,    -- sum of adjustable line items
  total_non_adjustable DECIMAL(10,2) DEFAULT 0,-- sum of non-adjustable items
  fee_amount DECIMAL(10,2) DEFAULT 0,          -- calculated card uplift amount
  approval_declined_at TIMESTAMPTZ,
  approval_declined_reason TEXT,
  approval_question TEXT,                       -- customer "Ask Question" from approval page
  approval_question_at TIMESTAMPTZ;
```

### 1.4 Payment Link Table (dedicated, more robust than token-on-RO)

```sql
-- New table: dedicated payment link tracking
CREATE TABLE pcb_payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  repair_order_id UUID NOT NULL REFERENCES pcb_repair_orders(id),
  token VARCHAR(100) NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  is_card_price BOOLEAN DEFAULT TRUE,       -- link charges card price by default
  url TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  delivery_channel VARCHAR(10) CHECK (delivery_channel IN ('sms', 'email', 'manual')),
  delivered_to VARCHAR(255),                 -- phone or email
  delivery_status VARCHAR(20) DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  delivery_sid VARCHAR(100),                 -- Twilio SID or SendGrid ID
  opened_at TIMESTAMPTZ,                     -- customer clicked the link
  completed_at TIMESTAMPTZ,                  -- payment completed
  payment_id UUID REFERENCES pcb_payments(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_pay_links_token ON pcb_payment_links(token);
CREATE INDEX idx_pcb_pay_links_ro ON pcb_payment_links(repair_order_id);

ALTER TABLE pcb_payment_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pcb_payment_links
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
```

### 1.5 Message Templates Table

```sql
CREATE TABLE pcb_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,                -- 'estimate_approval', 'payment_link', etc.
  channel VARCHAR(10) NOT NULL CHECK (channel IN ('sms', 'email')),
  subject VARCHAR(255),                      -- email only
  body TEXT NOT NULL,                         -- supports merge fields: {{customer_name}}, {{vehicle}}, etc.
  is_system BOOLEAN DEFAULT FALSE,           -- system templates can't be deleted
  is_active BOOLEAN DEFAULT TRUE,
  category VARCHAR(50) DEFAULT 'transactional'
    CHECK (category IN ('transactional', 'reminder', 'marketing', 'review')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name, channel)
);

ALTER TABLE pcb_message_templates ENABLE ROW LEVEL SECURITY;
```

**Default system templates (seeded per tenant):**

| Name | Channel | Purpose | Merge Fields |
|------|---------|---------|-------------|
| `estimate_approval` | sms | Send estimate for approval | `{{customer_name}}`, `{{vehicle}}`, `{{total_card}}`, `{{total_cash}}`, `{{approval_link}}` |
| `estimate_approval` | email | Send estimate for approval | Same + `{{shop_name}}`, `{{shop_phone}}`, `{{line_items_html}}` |
| `payment_link` | sms | Send payment link | `{{customer_name}}`, `{{amount}}`, `{{payment_link}}` |
| `payment_link` | email | Send payment link | Same + `{{invoice_html}}` |
| `approval_reminder` | sms | Reminder if not approved in X hours | `{{customer_name}}`, `{{vehicle}}`, `{{approval_link}}` |
| `payment_reminder` | sms | Reminder if not paid in X hours | `{{customer_name}}`, `{{amount}}`, `{{payment_link}}` |
| `service_complete` | sms | Job is done, ready for pickup | `{{customer_name}}`, `{{vehicle}}`, `{{shop_name}}` |
| `thank_you` | email | Post-service thank you + review ask | `{{customer_name}}`, `{{review_link}}` |
| `oil_change_reminder` | sms | Maintenance due | `{{customer_name}}`, `{{vehicle}}`, `{{service_type}}`, `{{booking_link}}` |
| `winback` | email | Inactive customer re-engagement | `{{customer_name}}`, `{{last_service_date}}`, `{{shop_name}}` |

### 1.6 QuickBooks Sync Log Table

```sql
CREATE TABLE pcb_qbo_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type VARCHAR(30) NOT NULL,         -- 'customer', 'invoice', 'payment'
  entity_id UUID NOT NULL,
  qbo_entity_id VARCHAR(50),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('push', 'pull')),
  status VARCHAR(20) NOT NULL CHECK (status IN (
    'pending', 'success', 'failed', 'retrying'
  )),
  attempt_count INTEGER DEFAULT 1,
  error_message TEXT,
  request_payload JSONB,
  response_payload JSONB,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_qbo_sync_tenant ON pcb_qbo_sync_log(tenant_id, created_at DESC);
CREATE INDEX idx_pcb_qbo_sync_status ON pcb_qbo_sync_log(tenant_id, status);

ALTER TABLE pcb_qbo_sync_log ENABLE ROW LEVEL SECURITY;
```

---

## 2. Updated Dual Pricing Engine

Replace section 9.1 in v1.0 with this more precise calculation:

```typescript
// services/dualPricing.ts — UPDATED with adjustable/NTNF logic

interface ServiceLineInput {
  unitPrice: number;          // regular/cash price entered by advisor
  quantity: number;
  lineType: 'labor' | 'part' | 'fee' | 'discount' | 'sublet' | 'shop_supply' | 'inspection';
  taxable: boolean;
  isAdjustable: boolean;      // NEW: eligible for card price uplift?
  isNtnf: boolean;            // NEW: non-taxable AND not-fee-eligible (overrides)
}

interface TenantPricingConfig {
  cashDiscountPct: number;    // e.g., 3.99
  partsTaxRate: number;       // e.g., 7.0
  laborTaxRate: number;       // e.g., 0.0 (labor not taxed in this state)
  laborTaxable: boolean;
  shopState: string;
}

interface DualPriceLineResult {
  cashPrice: number;          // the entered/regular price
  cardPrice: number;          // cash price + uplift (if adjustable)
  taxAmount: number;          // tax on this line (at card price for card, cash price for cash)
  isAdjusted: boolean;        // was uplift applied?
}

interface DualPriceTotals {
  subtotalParts: number;
  subtotalLabor: number;
  subtotalFees: number;
  subtotalDiscounts: number;
  totalAdjustable: number;    // sum of adjustable lines (card prices)
  totalNonAdjustable: number; // sum of non-adjustable lines
  feeAmount: number;          // total card uplift across all adjustable lines
  taxParts: number;
  taxLabor: number;
  taxTotal: number;
  totalCardPrice: number;     // what customer pays by card
  totalCashPrice: number;     // what customer pays by cash
  disclosureText: string;
  hideCashDiscount: boolean;  // if true, only show card price
}

function calculateLineDualPrice(
  line: ServiceLineInput,
  config: TenantPricingConfig
): DualPriceLineResult {
  const cashPrice = line.unitPrice * line.quantity;

  // NTNF overrides everything: no tax, no uplift
  if (line.isNtnf) {
    return { cashPrice, cardPrice: cashPrice, taxAmount: 0, isAdjusted: false };
  }

  // Card price: apply uplift only if adjustable
  let cardPrice = cashPrice;
  if (line.isAdjustable) {
    cardPrice = cashPrice * (1 + config.cashDiscountPct / 100);
    cardPrice = Math.round(cardPrice * 100) / 100;  // round to cents
  }

  // Tax: determine rate based on line type
  let taxRate = 0;
  if (line.taxable) {
    if (line.lineType === 'labor') {
      taxRate = config.laborTaxable ? config.laborTaxRate : 0;
    } else {
      taxRate = config.partsTaxRate;
    }
  }

  // Tax is calculated on the price the customer actually pays
  // Card customer pays tax on card price; cash customer pays tax on cash price
  // We store tax on the CARD price (posted price); cash tax is derived
  const taxAmount = Math.round(cardPrice * (taxRate / 100) * 100) / 100;

  return {
    cashPrice,
    cardPrice,
    taxAmount,
    isAdjusted: line.isAdjustable && config.cashDiscountPct > 0,
  };
}

function calculateROTotals(
  lines: ServiceLineInput[],
  config: TenantPricingConfig,
  hideCashDiscount: boolean
): DualPriceTotals {
  let subtotalParts = 0, subtotalLabor = 0, subtotalFees = 0, subtotalDiscounts = 0;
  let totalAdjustable = 0, totalNonAdjustable = 0, feeAmount = 0;
  let taxParts = 0, taxLabor = 0;

  for (const line of lines) {
    const result = calculateLineDualPrice(line, config);
    const lineTotal = result.cardPrice;  // posted/card price
    const lineCash = result.cashPrice;

    // Categorize subtotals
    switch (line.lineType) {
      case 'part':       subtotalParts += lineTotal; break;
      case 'labor':      subtotalLabor += lineTotal; break;
      case 'discount':   subtotalDiscounts += Math.abs(lineTotal); break;
      default:           subtotalFees += lineTotal; break;
    }

    // Track adjustable vs non-adjustable
    if (result.isAdjusted) {
      totalAdjustable += lineTotal;
      feeAmount += (result.cardPrice - result.cashPrice);
    } else {
      totalNonAdjustable += lineTotal;
    }

    // Tax by category
    if (line.lineType === 'labor') {
      taxLabor += result.taxAmount;
    } else {
      taxParts += result.taxAmount;
    }
  }

  const taxTotal = taxParts + taxLabor;
  const subtotalCard = subtotalParts + subtotalLabor + subtotalFees - subtotalDiscounts;
  const totalCardPrice = Math.round((subtotalCard + taxTotal) * 100) / 100;

  // Cash price: remove the uplift from adjustable items, recalculate tax on cash amounts
  const cashSubtotal = subtotalCard - feeAmount;
  // Recalculate tax on cash prices (slightly lower since base is lower)
  const cashTaxRatio = taxTotal > 0 ? (cashSubtotal / subtotalCard) : 0;
  const cashTax = Math.round(taxTotal * cashTaxRatio * 100) / 100;
  const totalCashPrice = Math.round((cashSubtotal + cashTax) * 100) / 100;

  return {
    subtotalParts: Math.round(subtotalParts * 100) / 100,
    subtotalLabor: Math.round(subtotalLabor * 100) / 100,
    subtotalFees: Math.round(subtotalFees * 100) / 100,
    subtotalDiscounts: Math.round(subtotalDiscounts * 100) / 100,
    totalAdjustable: Math.round(totalAdjustable * 100) / 100,
    totalNonAdjustable: Math.round(totalNonAdjustable * 100) / 100,
    feeAmount: Math.round(feeAmount * 100) / 100,
    taxParts: Math.round(taxParts * 100) / 100,
    taxLabor: Math.round(taxLabor * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    totalCardPrice,
    totalCashPrice,
    disclosureText: generateDisclosure(config.cashDiscountPct, config.shopState),
    hideCashDiscount,
  };
}
```

**Key difference from v1.0:** The fee percentage is now applied **per line item** based on the `isAdjustable` flag, not as a flat percentage of the total. Non-adjustable and NTNF items pass through at their entered price with no uplift. This matches Rate Remover's behavior exactly.

---

## 3. New API Endpoints

Add these to the existing API contract in v1.0 section 5.1:

```
── /customers (additions)
   POST   /import-csv              Import customers from CSV file
   GET    /export-csv              Export customer list as CSV

── /repair-orders/:id (additions)
   PATCH  /:id/hide-discount       Toggle hide_cash_discount on/off
   GET    /:id/profit-loss         P&L breakdown for this RO

── /repair-orders/:id/payment (additions)
   POST   /split                   Record split payment (multiple methods)

── /repair-orders/:id/payment-links (new sub-resource)
   POST   /                        Generate payment link
   GET    /                        List payment links for this RO
   GET    /:linkId                 Get link status + delivery log
   POST   /:linkId/resend          Resend via SMS or email

── /reports (additions)
   GET    /sales-tax               Sales tax collected report (date range, parts vs labor)
   GET    /profit-loss             P&L per job report (date range)
   GET    /tech-productivity       Technician hours flagged vs available
   GET    /approval-rate           Estimate approval conversion rate

── /settings (additions)
   GET    /tax-rules               Get tax configuration (parts rate, labor rate, labor taxable)
   PUT    /tax-rules               Update tax configuration
   GET    /templates               List message templates
   POST   /templates               Create/update message template
   PUT    /templates/:id           Edit template
   DELETE /templates/:id           Delete template (non-system only)
   POST   /terminal/test           Test terminal connectivity
```

### 3.1 Split Payment Flow

```typescript
// POST /api/pcbauto/v1/repair-orders/:id/payment/split
interface SplitPaymentRequest {
  repairOrderId: string;
  payments: Array<{
    method: 'card_present' | 'pay_link' | 'cash' | 'check' | 'ach';
    amount: number;           // in cents
    terminalId?: string;      // for card_present
    idempotencyKey: string;
  }>;
}

// Validation: sum of all payment amounts must equal RO total (card or cash price)
// Each payment creates a separate pcb_payments record
// RO status moves to 'paid' only when sum of captured payments >= total
// Partial payments leave RO in 'invoiced' status with balance_due tracked
```

### 3.2 CSV Import/Export

```typescript
// POST /api/pcbauto/v1/customers/import-csv
// Content-Type: multipart/form-data
// Body: { file: CSV file }
//
// Required CSV columns: first_name, last_name
// Optional columns: email, phone, address_line1, city, state, zip, notes
// Optional vehicle columns: vehicle_vin, vehicle_year, vehicle_make, vehicle_model
//
// Returns: { imported: number, skipped: number, errors: Array<{ row: number, message: string }> }

// GET /api/pcbauto/v1/customers/export-csv
// Query params: ?search=&tags=&created_after=&created_before=
// Returns: CSV file download with all customer + vehicle data
```

---

## 4. Updated Reports (All Phase 1)

### 4.1 P&L Per Job Report

```typescript
// GET /api/pcbauto/v1/reports/profit-loss?start_date=&end_date=&tech_id=&advisor_id=

interface ProfitLossReport {
  summary: {
    totalRevenue: number;       // sum of all paid RO totals
    totalPartsCost: number;     // sum of unit_cost * quantity for part lines
    totalLaborCost: number;     // tech_hours * tech_pay_rate (if tracked)
    totalFees: number;
    grossProfit: number;        // revenue - parts cost - labor cost
    grossMarginPct: number;     // gross profit / revenue * 100
    avgROValue: number;
    roCount: number;
  };
  jobs: Array<{
    roNumber: number;
    customerName: string;
    vehicleDescription: string;
    revenue: number;
    partsCost: number;
    partsRevenue: number;
    laborRevenue: number;
    feesCollected: number;
    grossProfit: number;
    marginPct: number;
    completedAt: string;
    techName: string;
    advisorName: string;
  }>;
}
```

### 4.2 Sales Tax Collected Report

```typescript
// GET /api/pcbauto/v1/reports/sales-tax?start_date=&end_date=

interface SalesTaxReport {
  period: { startDate: string; endDate: string };
  summary: {
    totalTaxablePartsSales: number;
    totalTaxableLaborSales: number;
    partsTaxCollected: number;
    laborTaxCollected: number;
    totalTaxCollected: number;
    partsTaxRate: number;
    laborTaxRate: number;
  };
  byMonth: Array<{
    month: string;              // '2026-01', '2026-02', etc.
    taxablePartsSales: number;
    taxableLaborSales: number;
    partsTax: number;
    laborTax: number;
    totalTax: number;
  }>;
  // For filing: detailed line items if needed
  lineItems: Array<{
    roNumber: number;
    date: string;
    customerName: string;
    taxableAmount: number;
    taxAmount: number;
    taxType: 'parts' | 'labor';
  }>;
}
```

### 4.3 Technician Productivity Report

```typescript
// GET /api/pcbauto/v1/reports/tech-productivity?start_date=&end_date=

interface TechProductivityReport {
  techs: Array<{
    techId: string;
    techName: string;
    hoursAvailable: number;     // working hours in period (configurable)
    hoursFlagged: number;       // labor hours billed on completed ROs
    efficiency: number;         // flagged / available * 100
    roCount: number;
    revenueGenerated: number;
    avgROValue: number;
  }>;
}
```

### 4.4 Approval Conversion Rate Report

```typescript
// GET /api/pcbauto/v1/reports/approval-rate?start_date=&end_date=

interface ApprovalRateReport {
  summary: {
    estimatesSent: number;
    estimatesApproved: number;
    estimatesDeclined: number;
    estimatesPending: number;
    conversionRate: number;     // approved / sent * 100
    avgTimeToApproval: number;  // minutes
    totalEstimateValue: number;
    totalApprovedValue: number;
  };
  byAdvisor: Array<{
    advisorId: string;
    advisorName: string;
    sent: number;
    approved: number;
    conversionRate: number;
    avgApprovedValue: number;
  }>;
  byDayOfWeek: Array<{
    day: string;
    sent: number;
    approved: number;
    conversionRate: number;
  }>;
}
```

---

## 5. Auth Flow Additions

### 5.1 User Onboarding

```
PCBISV Admin creates shop tenant
  → Admin adds first user (owner) with email
  → System sends "Set Up Your Password" email
     (link: shop.pcbisv.com/auth/setup-password?token=xxx)
  → Owner clicks link → sets password → redirected to dashboard
  → Owner can add more users from Settings → Employees
  → Each new user gets same "Set Up Your Password" email
```

### 5.2 New Auth Endpoints

```
── /auth (additions to v1.0)
   POST   /setup-password           Set password from setup token
   POST   /forgot-password          Send password reset email
   POST   /reset-password           Reset password from reset token
   POST   /resend-setup             Resend password setup email (admin action)
```

---

## 6. Customer Approval Page Updates

The public approval page (GET `/public/approve/:token`) needs three actions, not just approve/decline:

```
┌──────────────────────────────────────────────┐
│  [Shop Logo]        ESTIMATE #1234           │
│  Shop Name | Phone | Email                   │
│──────────────────────────────────────────────│
│  Customer: John Smith                        │
│  Vehicle: 2021 Ford Mustang GT               │
│  VIN: 1FA6P8CF...  |  Mileage: 42,350       │
│──────────────────────────────────────────────│
│                                              │
│  Service/Part            Card Price  Cash    │
│  ────────────────────────────────────────    │
│  ☑ Oil Change            $52.00    $50.00    │
│  ☑ Front Brake Pads      $156.00   $150.00   │
│  ☑ Labor - Brakes (1.5h) $208.00   $200.00   │
│  ☐ Cabin Air Filter      $45.00    $43.27    │ ← per-line approve/decline
│  ────────────────────────────────────────    │
│  Subtotal               $416.00    $400.00   │
│  Tax (7%)                $29.12     $28.00   │
│  ────────────────────────────────────────    │
│  CARD TOTAL             $445.12              │
│  CASH TOTAL                        $428.00   │
│                                              │
│  Cash discount disclosure text...            │
│                                              │
│  [APPROVE ✓]  [DECLINE ✗]  [ASK QUESTION ?] │
│                                              │
│  ✍ Sign here: ________________________       │
│                                              │
│  By approving you authorize...               │
└──────────────────────────────────────────────┘
```

**Per-line approval:** Customer can check/uncheck individual lines. Only checked lines move to approved status. Unchecked lines are marked "deferred." This matches the Rate Remover spec where customers can partially approve.

**"Ask Question" flow:** Customer types a question → stored on RO → triggers SMS/email notification to service advisor → advisor sees question in RO timeline → can respond and resend approval.

---

## 7. Feature Parity Matrix

| Feature | Rate Remover | PCB Auto v1.0 | PCB Auto v1.1 (this addendum) | Status |
|---------|-------------|---------------|-------------------------------|--------|
| Dual pricing engine | ✅ | ✅ | ✅ Enhanced (per-line adjustable) | ✅ Parity+ |
| Non-adjustable items | ✅ | ❌ Missing | ✅ `is_adjustable` flag | ✅ Fixed |
| NTNF items | ✅ | ❌ Missing | ✅ `is_ntnf` flag | ✅ Fixed |
| Hide cash discount toggle | ✅ | ❌ Missing | ✅ `hide_cash_discount` on RO | ✅ Fixed |
| Estimate → RO → Invoice | ✅ | ✅ | ✅ | ✅ Parity |
| Unpaid invoice editing | 🔜 Planned | ✅ (status allows edit until paid) | ✅ | ✅ Ahead |
| Digital approvals | ✅ | ✅ | ✅ Enhanced (per-line + Ask Question) | ✅ Parity+ |
| Approval audit trail | ✅ | ✅ | ✅ | ✅ Parity |
| Customer CRM | ✅ | ✅ | ✅ | ✅ Parity |
| CSV import/export | ✅ | ❌ Missing | ✅ Added | ✅ Fixed |
| Vehicle VIN lookup | ✅ | ✅ (NHTSA) | ✅ | ✅ Parity |
| Vehicle plate lookup | ✅ | ✅ (commercial API) | ✅ | ✅ Parity |
| PartsTech integration | ✅ | ✅ (Punchout) | ✅ | ✅ Parity |
| Labor guides | ✅ (MOTOR) | ✅ (adapter, TBD provider) | ✅ | ✅ Parity |
| Scheduling | ✅ | ✅ | ✅ | ✅ Parity |
| Terminal push payment | ✅ | ✅ (FluidPay) | ✅ + fee lock | ✅ Parity+ |
| Pay-by-link | ✅ | ✅ | ✅ + dedicated tracking table | ✅ Parity+ |
| Split payments | 🔜 Planned | ✅ (table supports) | ✅ + explicit API | ✅ Ahead |
| Payment link clipboard copy | ✅ | ❌ Missing (UX gap) | ✅ Frontend spec added | ✅ Fixed |
| QuickBooks sync | ✅ | ✅ | ✅ + sync log table | ✅ Parity+ |
| Sales reporting | ✅ | ✅ | ✅ | ✅ Parity |
| Sales tax reporting | ✅ | ❌ Missing | ✅ Added (parts vs labor split) | ✅ Fixed |
| P&L per job | ❌ Not available | ❌ Missing | ✅ Added | ✅ Ahead |
| Tech productivity | ❌ Not available | ❌ Missing | ✅ Added | ✅ Ahead |
| Approval conversion rate | ❌ Not available | ❌ Missing | ✅ Added | ✅ Ahead |
| Labor taxability config | ❌ Single rate | ❌ Single rate | ✅ Per-shop parts/labor split | ✅ Ahead |
| Debit posture config | ✅ | ❌ Missing | ✅ Added | ✅ Fixed |
| Terminal fee lock | ✅ | ❌ Missing | ✅ Added | ✅ Fixed |
| Password setup emails | ✅ | ❌ Missing | ✅ Auth flow added | ✅ Fixed |
| Message templates | ✅ | ❌ Implicit | ✅ Full template table + merge fields | ✅ Fixed |
| Maintenance reminders | ✅ | ✅ | ✅ | ✅ Parity |
| Winback campaigns | ❌ Not available | ✅ | ✅ | ✅ Ahead |
| DVI (inspections) | ✅ | ✅ | ✅ | ✅ Parity |
| Multi-location | ❌ Single location | ✅ | ✅ | ✅ Ahead |
| PDF invoices | ✅ | ✅ | ✅ | ✅ Parity |
| RBAC roles | ✅ (Admin/Tech) | ✅ (4 roles) | ✅ | ✅ Parity+ |

**Score: 34/34 features at parity or ahead. 0 gaps remaining.**

---

## 8. Updated Phase 1 Build Plan

Phase 1 scope additions (folded into existing 6-week plan):

| Week | Addition from this addendum |
|------|---------------------------|
| 1 | Add new schema fields (adjustable, NTNF, labor_taxable, hide_cash_discount, etc.) to migration |
| 2 | Add CSV import/export to customer CRUD; password setup email flow |
| 3 | Updated dual pricing engine with per-line adjustable/NTNF logic; hide cash discount toggle; per-line approval on approval page |
| 4 | "Ask Question" action on approval page; message templates seeding |
| 5 | Payment link tracking table + clipboard copy UX; split payment API |
| 6 | All 4 reports (P&L per job, sales tax, tech productivity, approval rate); tax rules config screen (parts rate / labor rate / labor taxable toggle) |

**No timeline extension needed.** These additions are incremental — mostly new columns, a few new tables, and UI additions to screens already being built.

---

## 9. Coming-Soon Backlog (Post-MVP, ordered by value)

| Priority | Feature | Phase |
|----------|---------|-------|
| 1 | Two-way SMS conversation thread per customer/job | Phase 2 |
| 2 | Video/photo inspections with customer-facing gallery | Phase 2 |
| 3 | Multiple jobs per estimate / multi-RO bundling | Phase 2 |
| 4 | Advanced reporting (cohorts, filters, custom date comparisons) | Phase 3 |
| 5 | Carfax integration (vehicle history pull) | Phase 3 |
| 6 | Customer support chat widget (in-app) | Phase 3 |
| 7 | Fleet management (multi-vehicle accounts, PO billing) | Phase 3 |
| 8 | ADAS calibration workflow | Future |
| 9 | Multi-language support (Spanish) | Future |
| 10 | White-label / reseller portal | Future |
