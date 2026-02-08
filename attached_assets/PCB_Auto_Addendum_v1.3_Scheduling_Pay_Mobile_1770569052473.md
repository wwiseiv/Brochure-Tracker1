# PCB Auto — Architecture Addendum v1.3 (Scheduling, Tech Pay & Mobile UX)

**Applies to:** PCB_Auto_Technical_Architecture_v1.md + Addendums v1.1, v1.2
**Date:** February 8, 2026
**Purpose:** Add interactive scheduling calendar with bay/tech availability, technician time clock and pay tracking, and responsive mobile/tablet UX for shop owners, field service, and technicians.

---

## 1. Scheduling Calendar

### 1.1 Concept

The scheduling page has a **compact calendar widget** that sits in the left sidebar of the page. It defaults to a mini month view. Clicking a date expands the right panel into a detailed **day view** showing bay rows (horizontal lanes) and time slots (columns). Each bay row shows which technician is assigned and what ROs are scheduled. Open slots are clearly visible and clickable to create new appointments.

### 1.2 Calendar Views

**Mini Calendar (always visible, left sidebar):**
```
┌──────────────────────────────┐
│  ◀  February 2026  ▶        │
│  Su Mo Tu We Th Fr Sa       │
│                          1  │
│   2  3  4  5  6  7  8      │
│   9 10 11 12 13 14 15      │
│  16 17 18 19 20 21 22      │
│  23 24 25 26 27 28         │
│                              │
│  ● 3 appointments today     │
│  ● 2 bays available         │
│                              │
│  [+ New Appointment]        │
└──────────────────────────────┘
```

- Dates with appointments show a **dot indicator** (color-coded by load: green = light, yellow = moderate, red = full)
- Clicking any date loads the **day detail view** in the main panel
- Today is highlighted
- Can navigate months with arrows

**Day Detail View (main panel, expands on date click):**
```
┌──────────────────────────────────────────────────────────────────────────┐
│  📅 Monday, February 9, 2026                    [Day] [Week] [List]    │
│──────────────────────────────────────────────────────────────────────────│
│              8AM    9AM    10AM   11AM   12PM   1PM    2PM    3PM   4PM │
│  ┌────────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬────│
│  │Bay 1   │      │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│      │▓▓▓▓▓▓▓▓▓▓▓▓│      │    │
│  │Mike T. │      │ Smith - Brakes   │      │ Jones - Oil  │      │    │
│  ├────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼────│
│  │Bay 2   │▓▓▓▓▓▓▓▓▓▓▓▓│      │      │      │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│    │
│  │Dave R. │ Park - Diag │      │      │      │ Lee - Transmission│    │
│  ├────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼────│
│  │Bay 3   │      │      │      │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│      │    │
│  │Sarah K.│      │      │      │ Garcia - Engine Swap    │      │    │
│  ├────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼────│
│  │Bay 4   │      │      │      │      │      │      │      │      │    │
│  │(open)  │   ← click any open slot to create appointment →       │    │
│  └────────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┴────│
│                                                                         │
│  UNASSIGNED (no bay yet):                                              │
│  ┌─────────────────────────────────────────────┐                       │
│  │ 🔵 10:30 AM - Williams - Tire Rotation      │  [Assign Bay ▾]      │
│  │ 🔵  2:00 PM - Chen - State Inspection       │  [Assign Bay ▾]      │
│  └─────────────────────────────────────────────┘                       │
└──────────────────────────────────────────────────────────────────────────┘
```

**Week View (toggle):**
```
┌──────────────────────────────────────────────────────────────────────────┐
│  📅 Week of Feb 9–13, 2026                      [Day] [Week] [List]    │
│──────────────────────────────────────────────────────────────────────────│
│              Mon        Tue        Wed        Thu        Fri            │
│  Bay 1    │ 3 jobs   │ 2 jobs   │ 4 jobs   │ 1 job    │ 2 jobs       │
│  Bay 2    │ 2 jobs   │ 3 jobs   │ 1 job    │ 3 jobs   │ 4 jobs       │
│  Bay 3    │ 1 job    │ —        │ 2 jobs   │ 2 jobs   │ 1 job        │
│  Bay 4    │ —        │ 1 job    │ —        │ 1 job    │ —            │
│──────────────────────────────────────────────────────────────────────────│
│  Totals:  │ 6        │ 6        │ 7        │ 7        │ 7            │
│  Capacity:│ 75%      │ 75%      │ 88%      │ 88%      │ 88%          │
└──────────────────────────────────────────────────────────────────────────┘
```

- Clicking any cell drills into that day's detail view
- Color-coded by utilization percentage

**List View (toggle):**
Simple sortable table of all appointments for the selected date range.

### 1.3 Appointment Click/Expand Behavior

Clicking an appointment block on the calendar opens an **expandable card** (slide-over panel, not a new page):

```
┌──────────────────────────────────────────────┐
│  Appointment Details                   [✕]   │
│──────────────────────────────────────────────│
│                                              │
│  Customer:  John Smith         📞 Call       │
│  Vehicle:   2021 Ford Mustang GT             │
│  VIN:       1FA6P8CF...                      │
│  Mileage:   42,350                           │
│                                              │
│  Service:   Front brake replacement          │
│  Est. Time: 2.5 hours                        │
│  Bay:       Bay 1                            │
│  Tech:      Mike Thompson                    │
│                                              │
│  Time:      9:00 AM – 11:30 AM               │
│  Status:    🟡 In Progress                   │
│                                              │
│  Linked RO: #1234 [Open RO →]               │
│                                              │
│  [Reschedule]  [Reassign Bay]  [Cancel]      │
└──────────────────────────────────────────────┘
```

### 1.4 Quick-Create Appointment

Clicking an open slot on the day view opens a quick-create modal:

```
┌──────────────────────────────────────────────┐
│  New Appointment               [✕]           │
│──────────────────────────────────────────────│
│                                              │
│  Customer:  [🔍 Search or add new______]     │
│  Vehicle:   [Auto-populated from customer ▾] │
│                                              │
│  Date:      [Feb 9, 2026]  (pre-filled)      │
│  Time:      [9:00 AM ▾] to [11:00 AM ▾]     │
│  Bay:       [Bay 4 ▾]     (pre-filled)       │
│  Tech:      [Assign tech ▾]                  │
│                                              │
│  Service:   [Describe the work_________]     │
│  Est. Hours:[___]                            │
│                                              │
│  ☐ Create RO automatically                   │
│  ☐ Send confirmation SMS to customer         │
│                                              │
│               [Cancel]  [CREATE APPOINTMENT]  │
└──────────────────────────────────────────────┘
```

### 1.5 Tech Availability Sidebar

On the day view, a collapsible right sidebar shows technician status at a glance:

```
┌────────────────────────┐
│  TECHNICIANS TODAY     │
│────────────────────────│
│                        │
│  🟢 Mike T.            │
│  Bay 1 · 2 jobs · 4.5h│
│  Available: 2:00-5:00  │
│                        │
│  🟡 Dave R.            │
│  Bay 2 · 3 jobs · 6.0h│
│  Busy until 4:30       │
│                        │
│  🟢 Sarah K.           │
│  Bay 3 · 1 job · 3.0h │
│  Available: 3:00-5:00  │
│                        │
│  ⚫ Tom L.              │
│  OFF TODAY             │
│                        │
│────────────────────────│
│  Capacity: 75%         │
│  Open slots: 3         │
└────────────────────────┘
```

---

## 2. Technician Time Clock & Pay Tracking

### 2.1 Concept

Shop owners need to track how many hours each tech works (clock in/out), how many hours they flag (billable labor), and calculate pay. This supports both **hourly techs** and **flat-rate techs** (paid per flagged hour, not clock hour — the industry standard).

### 2.2 Schema

```sql
-- ============================================
-- TECHNICIAN PAY CONFIGURATION
-- ============================================
ALTER TABLE pcb_employees ADD COLUMN IF NOT EXISTS
  pay_type VARCHAR(20) DEFAULT 'hourly'
    CHECK (pay_type IN ('hourly', 'flat_rate', 'salary', 'salary_plus_bonus')),
  hourly_rate DECIMAL(10,2),              -- for hourly techs
  flat_rate_per_hour DECIMAL(10,2),       -- for flat-rate techs (paid per flagged hour)
  salary_amount DECIMAL(10,2),            -- for salaried (weekly or biweekly)
  salary_period VARCHAR(20) DEFAULT 'biweekly'
    CHECK (salary_period IN ('weekly', 'biweekly', 'monthly')),
  overtime_eligible BOOLEAN DEFAULT TRUE,
  overtime_multiplier DECIMAL(3,2) DEFAULT 1.50,  -- 1.5x
  overtime_threshold DECIMAL(5,2) DEFAULT 40.00,  -- hours per week before OT
  bonus_per_hour_over DECIMAL(10,2),      -- bonus for flagged hours over X (salary+bonus)
  bonus_threshold DECIMAL(5,2),           -- flagged hours threshold for bonus
  default_schedule JSONB DEFAULT '{}';    -- e.g., {"mon":"8-5","tue":"8-5",...}

-- ============================================
-- TIME CLOCK ENTRIES
-- ============================================
CREATE TABLE pcb_time_clock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  employee_id UUID NOT NULL REFERENCES pcb_employees(id),
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,                  -- NULL = still clocked in
  clock_in_method VARCHAR(20) DEFAULT 'manual'
    CHECK (clock_in_method IN ('manual', 'pin', 'app', 'auto')),
  break_minutes INTEGER DEFAULT 0,        -- lunch/breaks deducted
  total_hours DECIMAL(5,2),               -- calculated on clock_out
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  edited_by UUID REFERENCES users(id),    -- if manually adjusted
  edited_reason TEXT,                      -- reason for manual adjustment
  approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_time_clock_employee ON pcb_time_clock(tenant_id, employee_id, clock_in DESC);
CREATE INDEX idx_pcb_time_clock_date ON pcb_time_clock(tenant_id, clock_in);

ALTER TABLE pcb_time_clock ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON pcb_time_clock
  USING (tenant_id::text = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ============================================
-- FLAGGED HOURS (labor billed on ROs)
-- ============================================
CREATE TABLE pcb_flagged_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  employee_id UUID NOT NULL REFERENCES pcb_employees(id),
  repair_order_id UUID NOT NULL REFERENCES pcb_repair_orders(id),
  service_line_id UUID REFERENCES pcb_service_lines(id),
  hours_flagged DECIMAL(5,2) NOT NULL,     -- labor guide hours billed
  hours_actual DECIMAL(5,2),               -- actual time spent (optional tracking)
  labor_rate DECIMAL(10,2) NOT NULL,       -- shop rate charged to customer
  tech_pay_rate DECIMAL(10,2) NOT NULL,    -- what tech earns for this
  revenue DECIMAL(10,2) NOT NULL,          -- hours_flagged * labor_rate
  tech_cost DECIMAL(10,2) NOT NULL,        -- hours_flagged * tech_pay_rate (flat rate) or actual hours * hourly rate
  profit DECIMAL(10,2) NOT NULL,           -- revenue - tech_cost
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_flagged_employee ON pcb_flagged_hours(tenant_id, employee_id, completed_at DESC);
CREATE INDEX idx_pcb_flagged_ro ON pcb_flagged_hours(repair_order_id);

ALTER TABLE pcb_flagged_hours ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PAYROLL PERIODS (summary per pay period)
-- ============================================
CREATE TABLE pcb_payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  employee_id UUID NOT NULL REFERENCES pcb_employees(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  clock_hours DECIMAL(6,2) DEFAULT 0,         -- total hours on clock
  regular_hours DECIMAL(6,2) DEFAULT 0,       -- clock hours up to OT threshold
  overtime_hours DECIMAL(6,2) DEFAULT 0,      -- clock hours over OT threshold
  flagged_hours DECIMAL(6,2) DEFAULT 0,       -- total labor hours billed
  efficiency DECIMAL(5,1) DEFAULT 0,          -- flagged / clock * 100
  regular_pay DECIMAL(10,2) DEFAULT 0,
  overtime_pay DECIMAL(10,2) DEFAULT 0,
  flat_rate_pay DECIMAL(10,2) DEFAULT 0,      -- flat rate: flagged_hours * flat_rate
  bonus_pay DECIMAL(10,2) DEFAULT 0,
  total_pay DECIMAL(10,2) DEFAULT 0,
  total_revenue_generated DECIMAL(10,2) DEFAULT 0,
  labor_profit DECIMAL(10,2) DEFAULT 0,       -- revenue - total_pay
  status VARCHAR(20) DEFAULT 'open'
    CHECK (status IN ('open', 'pending_approval', 'approved', 'exported')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_payroll_employee ON pcb_payroll_periods(tenant_id, employee_id, period_start DESC);

ALTER TABLE pcb_payroll_periods ENABLE ROW LEVEL SECURITY;
```

### 2.3 Pay Calculation Logic

```typescript
// services/techPay.ts

interface PayCalculation {
  clockHours: number;
  regularHours: number;
  overtimeHours: number;
  flaggedHours: number;
  efficiency: number;           // flagged / clock * 100

  regularPay: number;
  overtimePay: number;
  flatRatePay: number;
  bonusPay: number;
  totalPay: number;

  revenueGenerated: number;     // total labor revenue on completed ROs
  laborProfit: number;          // revenue - totalPay
}

function calculateTechPay(
  employee: PCBEmployee,
  clockEntries: TimeClockEntry[],
  flaggedEntries: FlaggedHours[],
  periodDays: number
): PayCalculation {
  const clockHours = clockEntries.reduce((sum, e) =>
    sum + (e.total_hours || 0) - (e.break_minutes / 60), 0);

  const flaggedHours = flaggedEntries.reduce((sum, e) =>
    sum + e.hours_flagged, 0);

  const revenueGenerated = flaggedEntries.reduce((sum, e) =>
    sum + e.revenue, 0);

  const efficiency = clockHours > 0 ? (flaggedHours / clockHours) * 100 : 0;

  let regularPay = 0, overtimePay = 0, flatRatePay = 0, bonusPay = 0;
  let regularHours = clockHours, overtimeHours = 0;

  switch (employee.pay_type) {
    case 'hourly':
      // Weekly OT: any clock hours over threshold (usually 40) per week
      if (clockHours > employee.overtime_threshold) {
        regularHours = employee.overtime_threshold;
        overtimeHours = clockHours - employee.overtime_threshold;
      }
      regularPay = regularHours * employee.hourly_rate;
      overtimePay = overtimeHours * employee.hourly_rate * employee.overtime_multiplier;
      break;

    case 'flat_rate':
      // Paid per FLAGGED hour, not clock hour
      // Industry standard: tech earns based on what they bill, not how long they're there
      flatRatePay = flaggedHours * employee.flat_rate_per_hour;
      // Some shops guarantee minimum (clock hours * minimum wage)
      break;

    case 'salary':
      regularPay = employee.salary_amount; // per period
      break;

    case 'salary_plus_bonus':
      regularPay = employee.salary_amount;
      if (employee.bonus_threshold && flaggedHours > employee.bonus_threshold) {
        const bonusHours = flaggedHours - employee.bonus_threshold;
        bonusPay = bonusHours * (employee.bonus_per_hour_over || 0);
      }
      break;
  }

  const totalPay = regularPay + overtimePay + flatRatePay + bonusPay;
  const laborProfit = revenueGenerated - totalPay;

  return {
    clockHours: Math.round(clockHours * 100) / 100,
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    flaggedHours: Math.round(flaggedHours * 100) / 100,
    efficiency: Math.round(efficiency * 10) / 10,
    regularPay: Math.round(regularPay * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
    flatRatePay: Math.round(flatRatePay * 100) / 100,
    bonusPay: Math.round(bonusPay * 100) / 100,
    totalPay: Math.round(totalPay * 100) / 100,
    revenueGenerated: Math.round(revenueGenerated * 100) / 100,
    laborProfit: Math.round(laborProfit * 100) / 100,
  };
}
```

### 2.4 API Endpoints

```
── /api/pcbauto/v1/time-clock
   GET    /today                    Today's clock status for all techs
   POST   /clock-in                 Clock in (PIN or user auth)
   POST   /clock-out                Clock out
   GET    /entries                   List entries (date range, employee filter)
   PUT    /entries/:id               Manual adjustment (admin only, requires reason)
   POST   /entries/:id/approve       Approve time entry
   DELETE /entries/:id               Delete entry (admin only)

── /api/pcbauto/v1/flagged-hours
   GET    /                          List flagged hours (date range, employee filter)
   POST   /                          Record flagged hours (auto from RO completion)
   GET    /by-tech                   Summary by technician

── /api/pcbauto/v1/payroll
   GET    /current                   Current open pay period summary
   GET    /periods                   List pay periods
   GET    /periods/:id               Pay period detail (per-tech breakdown)
   POST   /periods/:id/close         Close period and calculate final pay
   POST   /periods/:id/approve       Approve payroll
   GET    /periods/:id/export        Export payroll data (CSV for payroll provider)
```

### 2.5 Time Clock UX

**Tech Clock In/Out (PIN pad — works great on tablets):**
```
┌──────────────────────────────────────┐
│         CLOCK IN / OUT               │
│──────────────────────────────────────│
│                                      │
│  Enter your PIN:                     │
│                                      │
│       ┌─────────────────┐            │
│       │    ● ● ● ●      │            │
│       └─────────────────┘            │
│                                      │
│       ┌─────┬─────┬─────┐           │
│       │  1  │  2  │  3  │           │
│       ├─────┼─────┼─────┤           │
│       │  4  │  5  │  6  │           │
│       ├─────┼─────┼─────┤           │
│       │  7  │  8  │  9  │           │
│       ├─────┼─────┼─────┤           │
│       │  ⌫  │  0  │  ✓  │           │
│       └─────┴─────┴─────┘           │
│                                      │
│  Mike T. — Clocked in 8:02 AM       │
│  Dave R. — Clocked in 7:58 AM       │
│  Sarah K. — Not clocked in          │
│                                      │
└──────────────────────────────────────┘
```

**Shop Owner Payroll Summary Screen:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Payroll: Feb 3–16, 2026                              [Export CSV]      │
│──────────────────────────────────────────────────────────────────────────│
│                                                                         │
│  Tech       Pay Type    Clock Hrs  Flagged  Effic.  Pay        Revenue  │
│  ─────────────────────────────────────────────────────────────────────  │
│  Mike T.    Flat Rate   82.0       94.5     115%    $2,835.00  $14,175  │
│  Dave R.    Hourly      84.5       76.0     90%     $2,282.50  $11,400  │
│  Sarah K.   Hourly      78.0       81.0     104%    $2,106.00  $12,150  │
│  Tom L.     Salary+     80.0       88.5     111%    $2,400.00  $13,275  │
│  ─────────────────────────────────────────────────────────────────────  │
│  TOTALS                 324.5      340.0    105%    $9,623.50  $51,000  │
│                                                                         │
│  Labor Profit: $41,376.50  |  Labor Cost %: 18.9%                      │
│                                                                         │
│  Status: 🟡 Pending Approval          [APPROVE PAYROLL]                │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.6 Bay Profitability Report

```
── /api/pcbauto/v1/reports (addition)
   GET    /bay-profitability         Revenue and utilization per bay

// Response
interface BayProfitabilityReport {
  period: { startDate: string; endDate: string };
  bays: Array<{
    bayId: string;
    bayNumber: string;
    totalHoursAvailable: number;    // operating hours in period
    totalHoursUsed: number;         // hours with active ROs
    utilization: number;            // used / available * 100
    roCount: number;
    totalRevenue: number;
    totalLaborCost: number;
    totalPartsCost: number;
    grossProfit: number;
    profitPerHour: number;          // gross profit / hours used
  }>;
}
```

---

## 3. Mobile & Tablet UX

### 3.1 Strategy

PCB Auto is **desktop-first** for service advisors but must work fully on **tablets** (shop floor) and **phones** (field service, owner on the go). We don't build a separate mobile app — we build a **responsive web app** with progressive web app (PWA) capabilities so it works like a native app when added to the home screen.

### 3.2 Device Breakpoints

```css
/* Tailwind responsive design */
/* Phone:   < 640px  (sm) */
/* Tablet:  640-1024px (md) */
/* Desktop: > 1024px (lg) */
```

| Feature | Desktop (advisor) | Tablet (shop floor) | Phone (owner/field) |
|---------|------------------|--------------------|--------------------|
| Full navigation sidebar | ✅ Always visible | ✅ Collapsible | ❌ Bottom tab bar |
| Estimate builder | ✅ Multi-column | ✅ Single column, scrollable | ✅ Stacked, swipe sections |
| Workflow board | ✅ Full Kanban | ✅ Horizontal scroll Kanban | ✅ Vertical list by status |
| Calendar (day view) | ✅ Bay lanes + time grid | ✅ Simplified bay lanes | ✅ List view default |
| Time clock PIN pad | ✅ Sidebar widget | ✅ Full screen (kiosk mode) | ✅ Full screen |
| Reports | ✅ Charts + tables | ✅ Charts + tables | ✅ Summary cards, drill-down |
| DVI photos | ✅ Grid view | ✅ Camera capture | ✅ Camera capture |
| Customer search | ✅ Type-ahead | ✅ Type-ahead | ✅ Type-ahead |
| Payment actions | ✅ All methods | ✅ All methods | ✅ Pay-link + cash only |
| Support chat | ✅ Slide-over panel | ✅ Slide-over panel | ✅ Full screen overlay |
| AI assistant | ✅ Slide-over panel | ✅ Slide-over panel | ✅ Full screen overlay |

### 3.3 Mobile Navigation (Phone)

Replace sidebar with **bottom tab bar** on screens < 640px:

```
┌──────────────────────────────────┐
│  [Shop Logo]        🔔  👤  ☰   │
│──────────────────────────────────│
│                                  │
│                                  │
│        [ MAIN CONTENT ]          │
│                                  │
│                                  │
│──────────────────────────────────│
│  🏠     📋     📅     💳     ⚙️  │
│ Home   ROs  Schedule Pay   More  │
└──────────────────────────────────┘
```

**"More" menu** expands to: Customers, Vehicles, Parts, Reports, Settings, Help, Feature Requests

### 3.4 Tablet Optimizations (Shop Floor Mode)

Key features optimized for tablet use in the bay area:

**A) Kiosk Time Clock Mode**
A full-screen PIN pad that can be pinned to a wall-mounted tablet:

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│              [SHOP LOGO]                                 │
│          Smith's Auto Repair                             │
│                                                          │
│     ┌─────────────────────────────┐                      │
│     │       ● ● ● ●              │                      │
│     └─────────────────────────────┘                      │
│                                                          │
│     ┌──────┬──────┬──────┐                               │
│     │      │      │      │                               │
│     │  1   │  2   │  3   │         CLOCKED IN:           │
│     │      │      │      │         🟢 Mike T.  8:02 AM   │
│     ├──────┼──────┼──────┤         🟢 Dave R.  7:58 AM   │
│     │      │      │      │         🟢 Sarah K. 8:15 AM   │
│     │  4   │  5   │  6   │                               │
│     │      │      │      │         NOT CLOCKED IN:       │
│     ├──────┼──────┼──────┤         ⚫ Tom L.              │
│     │      │      │      │                               │
│     │  7   │  8   │  9   │                               │
│     │      │      │      │                               │
│     ├──────┼──────┼──────┤                               │
│     │      │      │      │                               │
│     │  ⌫   │  0   │  ✓   │                               │
│     │      │      │      │                               │
│     └──────┴──────┴──────┘                               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- Large touch targets (minimum 48px)
- Auto-locks after 30 seconds of inactivity
- Can be set as default view on a shared shop tablet

**B) Tech Job View (tablet-optimized)**

Technicians see their assigned jobs with big tap targets:

```
┌──────────────────────────────────────────────────────────┐
│  👤 Mike Thompson                    Bay 1    🕐 Clocked │
│──────────────────────────────────────────────────────────│
│                                                          │
│  MY JOBS TODAY                                           │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  🟡 IN PROGRESS                                  │    │
│  │  RO #1234 — Smith — 2021 Ford Mustang GT         │    │
│  │  Front Brake Replacement                         │    │
│  │  Est: 1.5 hrs  |  Started: 9:15 AM               │    │
│  │                                                   │    │
│  │  [📷 Add Photo]  [📝 Add Note]  [✅ Mark Done]    │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  🔵 UP NEXT                                      │    │
│  │  RO #1235 — Jones — 2019 Toyota Camry            │    │
│  │  Oil Change + Tire Rotation                      │    │
│  │  Est: 0.8 hrs  |  Scheduled: 11:00 AM            │    │
│  │                                                   │    │
│  │  [▶ START JOB]                                    │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  ✅ COMPLETED                                     │    │
│  │  RO #1230 — Park — 2020 Honda Civic              │    │
│  │  Diagnostic — Engine light                       │    │
│  │  Flagged: 1.0 hrs  |  Completed: 8:45 AM         │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  Today: 3 jobs · 3.3 hrs flagged · Efficiency: 110%     │
│──────────────────────────────────────────────────────────│
│  🏠     📋     📷     🕐     👤                          │
│ Home   Jobs  Camera  Clock  Profile                      │
└──────────────────────────────────────────────────────────┘
```

**C) Camera Integration (DVI photos)**

On tablets and phones, the "Add Photo" button triggers the device camera directly:

```typescript
// Uses HTML5 capture attribute for direct camera access
<input
  type="file"
  accept="image/*"
  capture="environment"  // rear camera (for under-car shots)
  onChange={handlePhotoCapture}
/>
```

Photos are compressed client-side before upload (target: < 500KB) and tagged with the RO and inspection point they belong to.

### 3.5 Progressive Web App (PWA) Setup

```json
// manifest.json
{
  "name": "PCB Auto - Shop Management",
  "short_name": "PCB Auto",
  "description": "Auto repair shop management",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0F172A",
  "theme_color": "#1B3A6B",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**PWA capabilities:**
- "Add to Home Screen" on iOS and Android — launches like native app
- Offline indicator: when connection drops, show banner "You're offline — changes will sync when reconnected"
- Push notifications (future): appointment reminders, approval received, payment collected
- Camera access for DVI photo capture
- Full-screen mode (no browser chrome)

### 3.6 Field Service Use Cases (Owner on Phone)

A shop owner on the road (wrecker driver, mobile mechanic, multi-location owner) needs:

| Action | Phone UX |
|--------|----------|
| Check today's schedule | Dashboard → today's appointment list |
| See if a payment came in | Push notification + dashboard revenue ticker |
| Approve payroll | Payroll screen → review summary → tap Approve |
| Quick customer lookup | Search bar at top → tap customer → see history |
| Create a quick estimate (roadside) | New RO → add vehicle → add manual lines → send approval |
| Collect payment in the field | RO → Take Payment → generate pay-link → text to customer |
| Check tech status | Dashboard → tech availability sidebar |
| View reports | Reports → summary cards → tap to drill down |
| Respond to support chat | Chat widget → full screen on phone |

---

## 4. Updated Screen List

Add these to v1.0 section 6.2:

| Screen | New? | Desktop | Tablet | Phone |
|--------|------|---------|--------|-------|
| Scheduling Calendar | Enhanced | Full bay/time grid | Simplified grid | List view |
| Time Clock (PIN pad) | **New** | Sidebar widget | Full-screen kiosk | Full-screen |
| Tech Job View | **New** | Part of workflow board | Dedicated view | Dedicated view |
| Payroll Summary | **New** | Full table + export | Full table | Summary cards |
| Bay Profitability | **New** | Chart + table | Chart + table | Summary cards |
| Branding Settings | **New** (v1.2) | Full config | Full config | Simplified |
| Feature Requests | **New** (v1.2) | Full list + submit | Full list + submit | List + submit |

---

## 5. API Additions Summary

```
NEW ENDPOINTS:
  /api/pcbauto/v1/time-clock/*          (6 endpoints — clock in/out, entries, approve)
  /api/pcbauto/v1/flagged-hours/*       (3 endpoints — list, record, by-tech)
  /api/pcbauto/v1/payroll/*             (5 endpoints — periods, close, approve, export)
  /api/pcbauto/v1/reports/bay-profitability
  /api/pcbauto/v1/settings/branding/*   (from v1.2, listed here for completeness)

UPDATED ENDPOINTS:
  /api/pcbauto/v1/scheduling/appointments   — now returns bay/tech availability matrix
  /api/pcbauto/v1/reports/tech-productivity — enhanced with pay data integration
```

---

## 6. Phase Assignment

| Feature | Phase | Rationale |
|---------|-------|-----------|
| Responsive layout + mobile nav | Phase 1 | Must be built from day one, not retrofitted |
| PWA manifest + home screen install | Phase 1 | Zero effort, big perceived value |
| Scheduling calendar (mini + day view) | Phase 1 | Week 4 (with scheduling) |
| Calendar week view | Phase 2 | Enhancement after day view works |
| Time clock (PIN pad) | Phase 2 | Week 7 |
| Tech job view (tablet) | Phase 2 | Week 8 (with workflow board) |
| Kiosk mode (wall tablet) | Phase 2 | Week 8 |
| Flagged hours tracking | Phase 2 | Week 9 |
| Payroll summary + export | Phase 3 | Week 11 |
| Bay profitability report | Phase 3 | Week 12 |
| Camera DVI integration | Phase 2 | Week 9 (with DVI) |
| Push notifications (PWA) | Phase 3 | Week 13 |

---

## 7. Isolation Guarantee

All features in this addendum are **PCB Auto module only**. The time clock, payroll, scheduling calendar, and mobile UX are scoped entirely to shop.pcbisv.com. Zero impact on the existing PCBISV.com sales suite.

All new tables prefixed `pcb_`, all new endpoints under `/api/pcbauto/v1/`, all gated by `portal: 'pcbauto'` JWT claim and tenant_id RLS.
