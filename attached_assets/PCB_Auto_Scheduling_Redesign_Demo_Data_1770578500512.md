# PCB Auto — Scheduling Page Redesign + Demo Data Population

## Priority: HIGH — This is the first thing anyone sees when evaluating the app.

---

## Problem 1: The Calendar Takes Over the Entire Screen

The current scheduling page shows a full-screen day grid (7 AM–5 PM × 3 bays) with no context, no mini calendar, and no way to navigate quickly between days. It looks like an empty spreadsheet.

### Fix: Two-Panel Layout with Collapsible Mini Calendar

**Default view (page load):**
```
┌─────────────────────────────────────────────────────────────────────┐
│ 📅 Schedule                                    [+ New Appointment] │
│─────────────────────────────────────────────────────────────────────│
│                                                                     │
│  ┌──────────────────┐   ┌────────────────────────────────────────┐  │
│  │  ◀ February 2026▶│   │  TODAY'S OVERVIEW                     │  │
│  │  Su Mo Tu We Th… │   │                                        │  │
│  │      1  2  3  4… │   │  📊 3 appointments · 2 bays active     │  │
│  │  …7 [8] 9 10 11… │   │                                        │  │
│  │  …14 15 16 17 18…│   │  ┌──────────────────────────────────┐  │  │
│  │  …21 22 23 24 25…│   │  │ 8:00 AM  Bay 1 — Mike T.        │  │  │
│  │  …28              │   │  │ Smith · 2019 F-150 · Brake Job  │  │  │
│  │                   │   │  │ Est: 2.5 hrs   ● In Progress    │  │  │
│  │  TECHNICIANS      │   │  └──────────────────────────────────┘  │  │
│  │  🟢 Mike T.       │   │  ┌──────────────────────────────────┐  │  │
│  │  🟢 Sarah K.      │   │  │ 9:30 AM  Bay 2 — Sarah K.      │  │  │
│  │  🟡 Dave R. (out) │   │  │ Johnson · 2021 Camry · Oil+Tire │  │  │
│  │                   │   │  │ Est: 1.0 hr    ● Scheduled      │  │  │
│  │  [Expand to       │   │  └──────────────────────────────────┘  │  │
│  │   full calendar]  │   │  ┌──────────────────────────────────┐  │  │
│  │                   │   │  │ 1:00 PM  Bay 1 — Mike T.        │  │  │
│  └──────────────────┘   │  │ Garcia · 2020 Civic · Check Eng  │  │  │
│                          │  │ Est: 1.5 hrs   ● Scheduled      │  │  │
│                          │  └──────────────────────────────────┘  │  │
│                          │                                        │  │
│                          │  OPEN SLOTS: Bay 3 all day, Bay 1     │  │
│                          │  open 10:30 AM–1:00 PM + after 2:30   │  │
│                          └────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Key behaviors:**

1. **Mini calendar is always visible** in the left sidebar (~200px wide)
   - Shows current month with dots on days that have appointments
   - Today is highlighted with a filled circle
   - Click any date → right panel updates to show that day's appointments
   - Arrow keys navigate months

2. **Right panel defaults to a LIST VIEW** of today's appointments (not the bay grid)
   - Each appointment is a card showing: time, bay, tech, customer name, vehicle, service, estimated hours, status
   - Cards are clickable → expands to show full appointment details
   - Empty slots are summarized at the bottom ("Bay 3 open all day")

3. **"Expand to full calendar" button** at the bottom of the mini calendar opens the full bay-grid view (the current view you have, but WITH data in it)
   - This should be a toggle, not a page navigation
   - Full grid: Time column × Bay columns with appointment blocks
   - Click an open slot → quick-create appointment modal

4. **Technician sidebar** below the mini calendar shows who's working today
   - 🟢 = clocked in / available
   - 🟡 = on a job / busy
   - ⚫ = off today / not scheduled
   - Shows their assigned bay

### Technical Implementation Notes:

```typescript
// State management for calendar view
const [viewMode, setViewMode] = useState<'list' | 'grid'>('list'); // default to list
const [selectedDate, setSelectedDate] = useState(new Date());

// Mini calendar component (use a lightweight library or build custom)
// react-day-picker or custom grid — NOT a full calendar library like FullCalendar
// We want it small and fast, not a massive dependency
```

### Responsive behavior:
- **Desktop (>1024px):** Side-by-side layout as shown above
- **Tablet (640–1024px):** Mini calendar collapses to a date picker bar at top, list below
- **Phone (<640px):** Date picker bar at top, scrollable appointment list below, no grid view

---

## Problem 2: The Calendar Is Blank — No Demo Data

A blank calendar makes the app look broken or unfinished. Anyone evaluating PCB Auto needs to see a realistic shop day with real-looking appointments, techs, and customers.

### Required: Seed the Demo Account with Realistic Data

**Demo Shop:** "Demo Auto Shop" (already exists — owner: John Smith / owner@demo.com)

### Step 1: Create Demo Staff (via Settings → Staff or database seed)

| Name | Role | Email | Bay | Pay Type | Rate | PIN |
|------|------|-------|-----|----------|------|-----|
| Mike Thompson | Technician | mike@demo.com | Bay 1 | Flat Rate | $30/hr flagged | 1234 |
| Sarah Kim | Technician | sarah@demo.com | Bay 2 | Hourly | $27/hr | 5678 |
| Dave Rodriguez | Technician | dave@demo.com | Bay 3 | Hourly | $25/hr | 9012 |
| Jessica Adams | Service Advisor | jessica@demo.com | — | Salary | $52,000/yr | 3456 |
| John Smith | Owner/Manager | owner@demo.com | — | Salary | — | 0000 |

### Step 2: Create Demo Customers (if not already present)

| Customer | Phone | Email | Vehicle(s) |
|----------|-------|-------|-----------|
| Robert Smith | (317) 555-0101 | rsmith@email.com | 2019 Ford F-150 XLT (1FTEW1EP5KFA12345) |
| Maria Johnson | (317) 555-0202 | mjohnson@email.com | 2021 Toyota Camry SE (4T1G11AK5MU123456) |
| Carlos Garcia | (317) 555-0303 | cgarcia@email.com | 2020 Honda Civic LX (2HGFC2F60LH567890) |
| Lisa Chen | (317) 555-0404 | lchen@email.com | 2022 BMW X3 xDrive30i (5UXTY5C02N9A12345) |
| James Williams | (317) 555-0505 | jwilliams@email.com | 2018 Chevy Silverado 1500 (1GCUYDED8JZ234567) |
| Amy Parker | (317) 555-0606 | aparker@email.com | 2023 Hyundai Tucson SEL (5NMJFDAF7PH890123) |
| David Brown | (317) 555-0707 | dbrown@email.com | 2017 Jeep Grand Cherokee (1C4RJFAG5HC345678) |
| Michelle Torres | (317) 555-0808 | mtorres@email.com | 2020 Nissan Rogue SV (5N1AT2MV0LC456789) |

### Step 3: Create Demo Appointments for Today and This Week

**Today (February 8, 2026):**

| Time | Bay | Tech | Customer | Vehicle | Service | Est. Hours | Status |
|------|-----|------|----------|---------|---------|-----------|--------|
| 8:00 AM | Bay 1 | Mike T. | Robert Smith | 2019 F-150 | Front brake pads + rotors | 2.5 | In Progress |
| 8:30 AM | Bay 2 | Sarah K. | Maria Johnson | 2021 Camry | Oil change + tire rotation | 1.0 | In Progress |
| 10:30 AM | Bay 2 | Sarah K. | Lisa Chen | 2022 BMW X3 | 30K mile service | 2.0 | Scheduled |
| 11:00 AM | Bay 3 | Dave R. | James Williams | 2018 Silverado | Check engine light diagnostic | 1.5 | Scheduled |
| 1:00 PM | Bay 1 | Mike T. | Carlos Garcia | 2020 Civic | AC compressor replacement | 3.0 | Scheduled |
| 2:00 PM | Bay 2 | Sarah K. | Amy Parker | 2023 Tucson | Alignment + new tires (4) | 1.5 | Scheduled |
| 3:00 PM | Bay 3 | Dave R. | David Brown | 2017 Grand Cherokee | Transmission fluid flush | 1.0 | Scheduled |

**Monday Feb 9:**

| Time | Bay | Tech | Customer | Service | Status |
|------|-----|------|----------|---------|--------|
| 8:00 AM | Bay 1 | Mike T. | Michelle Torres | Timing belt replacement | Scheduled |
| 8:00 AM | Bay 2 | Sarah K. | Robert Smith | Follow-up: rear brakes | Scheduled |
| 9:00 AM | Bay 3 | Dave R. | Lisa Chen | BMW oil change (specialty) | Scheduled |
| 10:30 AM | Bay 1 | Mike T. | Amy Parker | Strut replacement (front) | Scheduled |
| 1:00 PM | Bay 2 | Sarah K. | James Williams | Spark plugs + ignition coils | Scheduled |
| 2:00 PM | Bay 3 | Dave R. | Carlos Garcia | State inspection | Scheduled |

**Tuesday Feb 10:**

| Time | Bay | Tech | Customer | Service | Status |
|------|-----|------|----------|---------|--------|
| 8:00 AM | Bay 1 | Mike T. | David Brown | Transfer case service | Scheduled |
| 9:00 AM | Bay 2 | Sarah K. | Maria Johnson | Brake fluid flush | Scheduled |
| 10:00 AM | Bay 3 | Dave R. | Michelle Torres | Battery + alternator test | Scheduled |
| 1:00 PM | Bay 1 | Mike T. | Lisa Chen | BMW brake pads (rear) | Scheduled |
| 2:30 PM | Bay 2 | Sarah K. | Amy Parker | Cabin + engine air filters | Scheduled |

**Scatter a few more across Wed–Fri** with varying density so the mini calendar dots look realistic (some days busy, some light, Friday afternoon mostly open).

### Step 4: Create Demo Repair Orders Linked to Appointments

Each appointment should have a linked RO with:
- Line items (labor + parts with realistic pricing)
- Status matching the appointment status
- At least 2–3 ROs marked as "Completed" from earlier this week with payment recorded

Example RO for Robert Smith's brake job:
```
RO #1001 — Robert Smith — 2019 Ford F-150 XLT
Status: In Progress
Bay: 1 | Tech: Mike Thompson

Labor:
  Front brake pad replacement    1.5 hrs × $135/hr = $202.50
  Front rotor replacement        1.0 hrs × $135/hr = $135.00

Parts:
  Brake pads (front, ceramic)    1 × $89.99
  Rotors (front, pair)           1 × $124.99
  Brake hardware kit             1 × $18.99

Subtotal:  $571.47
Tax (7%):   $40.00
TOTAL:     $611.47

Status: Waiting for customer approval (text sent 9:15 AM)
```

### Step 5: Add a Completed/Paid RO for History

Create 2–3 completed ROs from the past week so the demo has payment history:

```
RO #0998 — Maria Johnson — 2021 Toyota Camry SE
Completed: Feb 5, 2026
Paid: $247.32 (Visa ending 4242)
Service: Oil change + cabin filter + wiper blades

RO #0999 — Carlos Garcia — 2020 Honda Civic LX
Completed: Feb 6, 2026
Paid: $189.50 (Cash)
Service: Tire rotation + alignment check

RO #1000 — James Williams — 2018 Chevy Silverado 1500
Completed: Feb 7, 2026
Paid: $892.15 (Mastercard ending 8910)
Service: Water pump + thermostat replacement
```

---

## Problem 3: Staff Roles Are Too Limited

The "Invite Staff Member" modal shows only Manager, Service Advisor, and Technician. That's a start but needs refinement.

### Updated Role Definitions with Permissions

| Role | Can Create ROs | Can Approve Payments | Can View Reports | Can Manage Staff | Can Run Payroll | Can Edit Settings |
|------|---------------|---------------------|-----------------|-----------------|----------------|------------------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ✅ | ❌ (view only) | ❌ |
| Service Advisor | ✅ | ✅ | Limited (own metrics) | ❌ | ❌ | ❌ |
| Technician | ❌ (can add notes/photos) | ❌ | ❌ (own jobs only) | ❌ | ❌ | ❌ |

### Additional Fields for Staff Creation

The invite modal should also collect (or allow setting later):
- **Default bay assignment** (dropdown: Bay 1, Bay 2, Bay 3, None)
- **Pay type** (Hourly / Flat Rate / Salary) — needed for time clock + payroll
- **Pay rate** ($XX.XX/hr or $/yr) — only visible to Owner
- **Phone number** (for scheduling notifications)
- **PIN** (4-digit, for time clock — auto-generated if not set)

---

## Summary: What Needs to Happen

1. **Redesign the schedule page** — mini calendar sidebar + list view default, full grid on expand
2. **Seed the demo database** with staff, customers, vehicles, appointments, and ROs
3. **Link everything together** — appointments reference customers, vehicles, techs, bays, and ROs
4. **Make it feel alive** — "In Progress" jobs, pending approvals, completed history, payment records
5. **Staff modal enhancement** — add bay assignment, pay type, rate, phone, PIN fields

The goal: someone opens the demo and immediately sees a busy, realistic auto repair shop running on PCB Auto. Not a blank spreadsheet.
