# PCB Auto — Digital Vehicle Inspection (DVI) Spec

**Addendum v1.5**
**Applies to:** PCB_Auto_Technical_Architecture_v1.md + all prior addendums
**Date:** February 8, 2026

---

## What This Is

A Digital Vehicle Inspection (DVI) is the modern version of the paper multi-point checklist. The tech walks around and under the car, inspects every system, marks each item as ✅ Good (green), ⚠️ Needs Attention (yellow), or ❌ Immediate (red), takes photos of anything worn or damaged, and the system generates a visual report that gets texted/emailed to the customer.

This is the single most important feature for upselling. A shop that texts a customer a photo of their worn brake pads with a red "Immediate" tag sells that brake job 70%+ of the time. A shop that just says "your brakes are bad" over the phone sells it 20% of the time.

**Competitors:** AutoVitals ($150-300/mo), Tekmetric (built-in), ShopBoss (basic), Shop-Ware (built-in). We match or beat all of them at $0 additional cost because it's baked into PCB Auto.

---

## 1. Schema Updates

The base architecture has `pcb_inspections` and `pcb_inspection_points`. We need to add **templates** (so techs don't build from scratch every time) and enhance the existing tables.

### 1.1 Inspection Templates

```sql
-- ============================================
-- INSPECTION TEMPLATES
-- ============================================
CREATE TABLE pcb_inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,                -- 'Full Multi-Point Inspection'
  description TEXT,                          -- 'Comprehensive 72-point vehicle inspection'
  is_default BOOLEAN DEFAULT FALSE,          -- auto-attached to new ROs?
  is_system BOOLEAN DEFAULT FALSE,           -- PCB Auto provided (not editable by shop)
  vehicle_type VARCHAR(20) DEFAULT 'all'     -- 'all', 'car', 'truck', 'diesel', 'hybrid', 'ev'
    CHECK (vehicle_type IN ('all', 'car', 'truck', 'diesel', 'hybrid', 'ev')),
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pcb_inspection_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES pcb_inspection_templates(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,            -- 'Brakes', 'Tires & Wheels', 'Under Hood'
  item VARCHAR(255) NOT NULL,                -- 'Front Brake Pads'
  description TEXT,                          -- 'Inspect pad thickness, check for uneven wear'
  requires_measurement BOOLEAN DEFAULT FALSE,-- forces tech to enter a value (mm, psi, etc.)
  measurement_unit VARCHAR(20),              -- 'mm', 'psi', '32nds', '%', 'volts'
  measurement_min DECIMAL(10,2),             -- yellow threshold (below = yellow)
  measurement_critical DECIMAL(10,2),        -- red threshold (below = red)
  requires_photo BOOLEAN DEFAULT FALSE,      -- forces photo before marking red
  category_sort INTEGER DEFAULT 0,           -- order within categories
  item_sort INTEGER DEFAULT 0,               -- order within category
  active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_pcb_template_items ON pcb_inspection_template_items(template_id, category_sort, item_sort);
ALTER TABLE pcb_inspection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pcb_inspection_template_items ENABLE ROW LEVEL SECURITY;
```

### 1.2 Enhanced Inspections Table

Replace the minimal base schema:

```sql
-- Drop and recreate (or ALTER — depends on migration strategy)
-- Enhanced pcb_inspections
ALTER TABLE pcb_inspections ADD COLUMN IF NOT EXISTS
  template_id UUID REFERENCES pcb_inspection_templates(id),
  vehicle_id UUID REFERENCES pcb_vehicles(id),
  customer_id UUID REFERENCES pcb_customers(id),
  mileage INTEGER,
  status VARCHAR(20) DEFAULT 'in_progress'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'sent', 'viewed', 'approved')),
  total_points INTEGER DEFAULT 0,
  green_count INTEGER DEFAULT 0,
  yellow_count INTEGER DEFAULT 0,
  red_count INTEGER DEFAULT 0,
  recommended_services_total DECIMAL(10,2) DEFAULT 0,
  share_token VARCHAR(64) UNIQUE,         -- for public customer link
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,                  -- when customer opened the link
  approved_items JSONB DEFAULT '[]',      -- which yellow/red items customer approved
  tech_notes TEXT,                         -- general notes from technician
  reviewed_with_customer BOOLEAN DEFAULT FALSE,  -- advisor checked box after presenting findings
  customer_signature_url TEXT,             -- stored canvas signature image
  customer_signed_at TIMESTAMPTZ,          -- when customer signed
  updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enhanced pcb_inspection_points
ALTER TABLE pcb_inspection_points ADD COLUMN IF NOT EXISTS
  template_item_id UUID REFERENCES pcb_inspection_template_items(id),
  measurement_value DECIMAL(10,2),        -- actual measured value (4.2mm, 32psi)
  measurement_unit VARCHAR(20),
  recommended_service TEXT,               -- 'Replace front brake pads'
  estimated_cost DECIMAL(10,2),           -- quick estimate for this item
  estimated_hours DECIMAL(4,2),           -- labor hours estimate
  urgency VARCHAR(20) DEFAULT 'monitor'
    CHECK (urgency IN ('good', 'monitor', 'soon', 'immediate', 'safety')),
  customer_approved BOOLEAN DEFAULT FALSE,
  photo_descriptions TEXT[],              -- caption for each photo
  created_at TIMESTAMPTZ DEFAULT NOW();
```

### 1.3 Inspection Photos Table

Photos need their own table for proper management (compression, thumbnails, ordering):

```sql
CREATE TABLE pcb_inspection_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  inspection_id UUID NOT NULL REFERENCES pcb_inspections(id) ON DELETE CASCADE,
  inspection_point_id UUID REFERENCES pcb_inspection_points(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,              -- S3/R2 path to original
  thumbnail_url TEXT,                      -- compressed thumbnail for list views
  annotated_url TEXT,                      -- if tech drew arrows/circles on photo
  caption TEXT,                            -- 'Worn brake pad — 2mm remaining'
  sort_order INTEGER DEFAULT 0,
  file_size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pcb_photos_inspection ON pcb_inspection_photos(inspection_id, sort_order);
CREATE INDEX idx_pcb_photos_point ON pcb_inspection_photos(inspection_point_id);
ALTER TABLE pcb_inspection_photos ENABLE ROW LEVEL SECURITY;
```

---

## 2. System Templates (Pre-Built)

Every new shop gets these templates automatically. They can customize or create their own.

### 2.1 Full Multi-Point Inspection (Default — 72 points)

This is the real-world checklist. Every item is something a tech actually checks, each one maps to a potential service line, and the order follows how a tech physically moves around the vehicle: start under hood, move to brakes on the lift, check tires, go underneath, come out and check electrical/interior, then advisory wrap-up.

```
─────────────────────────────────────────────────────────────────
1. SAFETY & ROADWORTHINESS (High Priority — shown first in report)
─────────────────────────────────────────────────────────────────

BRAKES
├── LF brake pad thickness               [measurement: mm, yellow <4, red <2] [photo if yellow/red]
├── RF brake pad thickness               [measurement: mm, yellow <4, red <2] [photo if yellow/red]
├── LR brake pad thickness               [measurement: mm, yellow <4, red <2] [photo if yellow/red]
├── RR brake pad thickness               [measurement: mm, yellow <4, red <2] [photo if yellow/red]
├── Rotor condition (scored/warped/OK)    [photo if red]
├── Brake fluid level & condition         [photo if red]
└── Parking brake operation

STEERING & SUSPENSION
├── Ball joints (upper/lower)             [photo if red]
├── Tie rod ends — inner                  [photo if red]
├── Tie rod ends — outer                  [photo if red]
├── Control arm bushings                  [photo if red]
├── Shocks / struts (leaks, bounce test)  [photo if yellow/red]
└── Steering rack / gearbox leaks         [photo if red]

TIRES & WHEELS
├── LF tread depth                        [measurement: 32nds, yellow <5, red <3] [photo if yellow/red]
├── RF tread depth                        [measurement: 32nds, yellow <5, red <3] [photo if yellow/red]
├── LR tread depth                        [measurement: 32nds, yellow <5, red <3] [photo if yellow/red]
├── RR tread depth                        [measurement: 32nds, yellow <5, red <3] [photo if yellow/red]
├── Uneven wear pattern                   [photo if yellow/red]
├── Sidewall damage / dry rot             [photo if red]
├── Tire pressure set to spec             [measurement: psi]
└── Wheel lug nut torque

─────────────────────────────────────────────────────────────────
2. UNDER HOOD INSPECTION
─────────────────────────────────────────────────────────────────

FLUIDS
├── Engine oil level & condition
├── Coolant level & condition             [photo if red]
├── Transmission fluid level & condition  (if applicable / accessible)
├── Brake fluid level & condition         [photo if red]
├── Power steering fluid                  [photo if red]
└── Windshield washer fluid

ENGINE COMPONENTS
├── Drive belts — cracks / glazing        [photo if yellow/red]
├── Radiator hose — upper                 [photo if red]
├── Radiator hose — lower                 [photo if red]
├── Engine air filter                     [photo if yellow/red]
├── Cabin air filter                      [photo if yellow/red]
├── Battery condition & terminals         [measurement: volts, yellow <12.4, red <12.0] [photo if red]
└── Visible leaks (oil/coolant/PS)        [photo if yellow/red]

─────────────────────────────────────────────────────────────────
3. ELECTRICAL & LIGHTING
─────────────────────────────────────────────────────────────────
├── Headlights — low beam
├── Headlights — high beam
├── Brake lights
├── Turn signals / hazards
├── Reverse lights
├── Interior lights
├── Dashboard warning lights present      [photo if any active]
└── Horn operation

─────────────────────────────────────────────────────────────────
4. EXHAUST & EMISSIONS
─────────────────────────────────────────────────────────────────
├── Exhaust leaks                         [photo if red]
├── Catalytic converter condition         [photo if red]
├── Muffler & hangers                     [photo if red]
├── Check engine light — on / off         [photo if on]
└── Emissions readiness (if applicable)   [measurement: ready/not ready]

─────────────────────────────────────────────────────────────────
5. INTERIOR & CONVENIENCE
─────────────────────────────────────────────────────────────────
├── Seat belts — all positions
├── Wipers — operation & condition        [photo if yellow/red]
├── Washer spray operation
├── HVAC — heater operation
├── HVAC — A/C operation                  [measurement: vent temp °F]
├── Blower motor — all speeds
├── Defroster — front & rear
├── Power windows / locks
└── Mirrors — manual / power

─────────────────────────────────────────────────────────────────
6. UNDER VEHICLE INSPECTION
─────────────────────────────────────────────────────────────────
├── Oil pan & gasket                      [photo if red]
├── Transmission pan & seals              [photo if red]
├── Axle shafts / CV boots               [photo if red]
├── Driveshaft / U-joints                 [photo if red]
├── Differential leaks                    [photo if red]
├── Fuel lines condition                  [photo if red]
├── Brake lines condition                 [photo if red]
└── Frame / subframe damage or rust       [photo if red]

─────────────────────────────────────────────────────────────────
7. MAINTENANCE STATUS (Advisory — drives future appointments)
─────────────────────────────────────────────────────────────────
├── Oil change interval status            [measurement: miles until due]
├── Tire rotation needed
├── Alignment recommended                 [photo if uneven wear found]
├── Brake service recommended
├── Coolant flush / service due           [measurement: miles/months since last]
├── Transmission service due              [measurement: miles/months since last]
├── Spark plugs / ignition service        [measurement: miles since last]
└── Timing belt / chain status            [measurement: miles, red if overdue]

─────────────────────────────────────────────────────────────────
8. CUSTOMER ACKNOWLEDGMENT (completed at delivery)
─────────────────────────────────────────────────────────────────
├── ☐ Inspection reviewed with customer
├── ☐ Photos / videos provided
└── ☐ Customer signature captured
```

**Total: 72 inspection points across 10 categories**

Category counts:
- Brakes: 7
- Steering & Suspension: 6
- Tires & Wheels: 8
- Fluids: 6
- Engine Components: 7
- Electrical & Lighting: 8
- Exhaust & Emissions: 5
- Interior & Convenience: 9
- Under Vehicle: 8
- Maintenance Advisory: 8

**Why this order matters:**
- Safety items first → customer report leads with the most urgent findings
- Under hood second → tech is already there after popping the hood
- Electrical third → quick walk-around before putting it on the lift
- Under vehicle last → tech is already under the car from brakes/suspension
- Maintenance advisory at the end → "everything's fine now, but here's what's coming" — this is the return-visit generator

**Customer acknowledgment section:**
- Digital signature capture (canvas touch signature on tablet/phone)
- "Reviewed with customer" checkbox prevents shops from sending reports without a conversation
- Creates a liability record that the customer was informed of safety findings

### 2.2 Quick Lube Inspection (22 points)

Stripped-down version for oil change / quick service customers. Fast — a good tech completes this in under 5 minutes while the oil is draining. Covers the high-value upsells without bogging down a $39 oil change.

```
─────────────────────────────────────────────────────────────────
FLUIDS (6)
─────────────────────────────────────────────────────────────────
├── Engine oil — drained (note condition: clean / dark / sludgy)
├── Coolant level & condition
├── Transmission fluid (if dipstick accessible)
├── Brake fluid level
├── Power steering fluid level
└── Windshield washer fluid — topped off?

─────────────────────────────────────────────────────────────────
FILTERS (2)
─────────────────────────────────────────────────────────────────
├── Engine air filter                     [photo if yellow/red]
└── Cabin air filter                      [photo if yellow/red]

─────────────────────────────────────────────────────────────────
TIRES (6)
─────────────────────────────────────────────────────────────────
├── LF tread depth                        [measurement: 32nds, yellow <5, red <3]
├── RF tread depth                        [measurement: 32nds, yellow <5, red <3]
├── LR tread depth                        [measurement: 32nds, yellow <5, red <3]
├── RR tread depth                        [measurement: 32nds, yellow <5, red <3]
├── Tire pressure — set to spec           [measurement: psi]
└── Uneven wear / sidewall damage         [photo if yellow/red]

─────────────────────────────────────────────────────────────────
BATTERY & BELTS (3)
─────────────────────────────────────────────────────────────────
├── Battery voltage & terminals           [measurement: volts, yellow <12.4, red <12.0]
├── Serpentine belt condition             [photo if yellow/red]
└── Visible leaks under hood              [photo if red]

─────────────────────────────────────────────────────────────────
QUICK VISUAL (3)
─────────────────────────────────────────────────────────────────
├── Wiper blade condition
├── All exterior lights functional
└── Brake lights functional

─────────────────────────────────────────────────────────────────
ADVISORY (2)
─────────────────────────────────────────────────────────────────
├── Next oil change due at               [measurement: miles]
└── Tire rotation needed?
```

**Why this template sells:** The $39 oil change customer sees photos of their dirty cabin filter and worn tires. They approve a $55 cabin filter and a $189 tire rotation. The ticket goes from $39 to $283 without the customer feeling pressured — they saw the evidence.

### 2.3 Pre-Purchase Inspection (90+ points)

Everything in the Full 72-point inspection PLUS the items a buyer needs before handing over money. This is the template shops charge $150-250 for.

```
─────────────────────────────────────────────────────────────────
INCLUDES: All 72 points from Full Multi-Point Inspection
─────────────────────────────────────────────────────────────────

PLUS THESE ADDITIONAL ITEMS:

─────────────────────────────────────────────────────────────────
DIAGNOSTICS & HISTORY (8)
─────────────────────────────────────────────────────────────────
├── OBD-II scan — stored codes            [photo of scan tool screen]
├── OBD-II scan — pending codes           [photo of scan tool screen]
├── OBD-II freeze frame data              [photo if relevant]
├── VIN verification (matches title)
├── Title status — clean / salvage / rebuilt
├── Odometer consistency check
├── Service history review (if available)
└── Accident / body repair evidence       [photo if found]

─────────────────────────────────────────────────────────────────
BODY & PAINT (6)
─────────────────────────────────────────────────────────────────
├── Paint condition — fading / clear coat  [photo if yellow/red]
├── Panel gaps — even / uneven            [photo if uneven — indicates prior collision]
├── Rust — body panels                     [photo if found]
├── Rust — wheel wells / rocker panels    [photo if found]
├── Glass — all windows & mirrors          [photo if damaged]
└── Door / trunk / hood operation — hinges, latches

─────────────────────────────────────────────────────────────────
DRIVETRAIN DEEP CHECK (5)
─────────────────────────────────────────────────────────────────
├── Engine noise — knock / tick / whine    [note description]
├── Transmission shift quality             [note: smooth / harsh / slipping]
├── Transfer case operation (4WD/AWD)     [if applicable]
├── Clutch engagement point & feel        [if manual]
└── Differential noise under load

─────────────────────────────────────────────────────────────────
TEST DRIVE (6)
─────────────────────────────────────────────────────────────────
├── Cold start behavior
├── Idle quality — smooth / rough / hunting
├── Acceleration — hesitation / misfires
├── Braking — pull left/right / vibration / noise
├── Steering — play / wander / vibration
└── Road noise — wheel bearing / tire noise

─────────────────────────────────────────────────────────────────
BUYER ADVISORY (3)
─────────────────────────────────────────────────────────────────
├── Estimated near-term repairs needed    [dollar estimate]
├── Overall condition rating              [1-10 scale]
└── Technician buy/pass recommendation    [with explanation]
```

**Total: ~90 inspection points**

This template earns the shop $150-250 per inspection AND often converts into a repair customer when the buyer asks the shop to fix what was found.

### 2.4 Seasonal Inspections

**Winter Prep (18 points)**

```
─────────────────────────────────────────────────────────────────
COLD WEATHER CRITICAL
─────────────────────────────────────────────────────────────────
├── Battery voltage & load test           [measurement: volts, yellow <12.4, red <12.0]
├── Battery terminals — corrosion         [photo if red]
├── Coolant concentration / freeze point  [measurement: °F, red if above -20°F]
├── Coolant level
├── Heater output — cabin temp            [measurement: °F at vent]
├── Defroster — front operation
├── Defroster — rear operation
├── Wiper blades — condition & fit
├── Washer fluid — winter formula filled
├── All exterior lights functional
├── Tire tread depth — all 4              [measurement: 32nds, yellow <5, red <3]
├── Tire type — all-season / winter / summer  [note: summer tires in winter = red]
├── Tire pressure — set for cold          [measurement: psi]
├── Drive belt condition                  [photo if yellow/red]
├── Radiator hoses — squeeze test
├── Exhaust system — leaks (CO risk)      [photo if red]
├── Door seals & weatherstripping
└── Emergency kit present (recommended)
```

**Summer Prep (16 points)**

```
─────────────────────────────────────────────────────────────────
HOT WEATHER CRITICAL
─────────────────────────────────────────────────────────────────
├── A/C system — vent temperature         [measurement: °F, yellow >50, red >60]
├── A/C compressor engagement
├── A/C — refrigerant pressure (if gauges avail)
├── Coolant level & condition
├── Coolant concentration                 [measurement: ratio]
├── Radiator — visual for debris/damage   [photo if blocked]
├── Radiator fan operation (elec. fan test)
├── Drive belt condition                  [photo if yellow/red]
├── Radiator hoses — upper & lower
├── Battery voltage                       [measurement: volts] (heat kills batteries too)
├── Tire pressure — adjusted for heat     [measurement: psi]
├── Tire condition — dry rot / bulging    [photo if red]
├── Wiper blades (summer storms)
├── Cabin air filter (pollen season)      [photo if yellow/red]
├── Brake fluid — heat resistance
└── Engine oil — correct weight for temp
```

---

## 3. Inspection Workflow

### 3.1 How It Gets Started

Three ways an inspection starts:

**A) Auto-created with RO (default template)**
When a new RO is created and the shop has a default template, an inspection is automatically created and linked:
```typescript
// On RO creation
if (shop.defaultInspectionTemplate) {
  const inspection = await createInspection({
    repairOrderId: ro.id,
    templateId: shop.defaultInspectionTemplate,
    vehicleId: ro.vehicleId,
    customerId: ro.customerId,
    inspectorId: ro.assignedTechId,
    mileage: ro.mileageIn,
    status: 'not_started',
  });
}
```

**B) Manually started from RO detail**
Service advisor or tech taps "Start Inspection" on an RO and picks a template.

**C) Standalone (no RO yet)**
Tech starts an inspection from the Inspections page. If findings require work, the inspection converts into an RO.

### 3.2 The Tech's Inspection Flow

This is THE critical path. The tech is standing in the bay, phone or tablet in hand (probably greasy), walking around and under the car.

**Step 1: Open inspection → See the checklist**

```
┌──────────────────────────────────────────┐
│ ← Inspection — RO #1001                  │
│ Robert Smith · 2019 Ford F-150 · 42,350  │
│ Template: Full Multi-Point               │
│──────────────────────────────────────────│
│                                          │
│ Progress: ████████░░░░░ 48/72  (67%)    │
│                                          │
│ ▼ UNDER HOOD (10/13 done)                │
│                                          │
│  ✅ Engine oil level          Good       │
│  ✅ Engine oil leak           Good       │
│  ✅ Trans fluid               Good       │
│  ⚠️ Coolant level            Low        │
│     └ 📷 1 photo · "Below min line"     │
│  ✅ Brake fluid               Good       │
│  ✅ Power steering            Good       │
│  ✅ Washer fluid              Good       │
│  ❌ Serpentine belt           Cracked    │
│     └ 📷 2 photos · "Visible cracks"    │
│     └ 💰 Replace: ~$185                 │
│  ○  Radiator hoses                       │
│  ○  Battery terminals                    │
│  ○  Battery load test                    │
│  ○  Air filter                           │
│  ○  Cabin air filter                     │
│                                          │
│ ▶ BRAKES (0/7)                           │
│ ▶ STEERING & SUSPENSION (0/6)            │
│ ▶ TIRES & WHEELS (0/8)                   │
│ ▶ ELECTRICAL & LIGHTING (0/8)            │
│ ▶ EXHAUST & EMISSIONS (0/5)              │
│ ▶ INTERIOR & CONVENIENCE (0/9)           │
│ ▶ UNDER VEHICLE (0/8)                    │
│ ▶ MAINTENANCE ADVISORY (0/8)             │
│                                          │
│ [COMPLETE INSPECTION]                    │
└──────────────────────────────────────────┘
```

**Step 2: Tap an item → Mark condition**

```
┌──────────────────────────────────────────┐
│ ← Radiator hoses                         │
│ Inspect for cracks, bulges, leaks        │
│──────────────────────────────────────────│
│                                          │
│    ┌────────┐  ┌────────┐  ┌────────┐   │
│    │  ✅    │  │  ⚠️    │  │  ❌    │   │
│    │  GOOD  │  │ WATCH  │  │  BAD   │   │
│    │        │  │        │  │        │   │
│    └────────┘  └────────┘  └────────┘   │
│                                          │
│  Notes: [_______________________________]│
│                                          │
│  📷 [TAKE PHOTO]                        │
│                                          │
│  ── If yellow or red: ──────────────── │
│                                          │
│  Recommended service:                    │
│  [Replace upper radiator hose___________]│
│                                          │
│  Estimated cost: [$_85.00___]            │
│  Estimated labor: [_0.5_] hrs            │
│                                          │
│  Urgency:                                │
│  ( ) Monitor  (•) Soon  ( ) Immediate   │
│                                          │
│  [SAVE & NEXT →]                        │
└──────────────────────────────────────────┘
```

**Key UX rules for this screen:**
- The three condition buttons are HUGE (minimum 80px tall) — greasy fingers
- Tapping "Good" instantly saves and advances to next item (one-tap flow)
- Tapping "Watch" or "Bad" expands the detail fields below
- Camera button triggers rear camera immediately (`capture="environment"`)
- "Save & Next" advances to the next unchecked item in the category
- Swipe right = Good (for speed — experienced techs fly through green items)

**Step 3: Take photos**

```
┌──────────────────────────────────────────┐
│ 📷 Serpentine Belt                       │
│──────────────────────────────────────────│
│                                          │
│  ┌──────────────────────────────────┐    │
│  │                                  │    │
│  │     [CAMERA VIEWFINDER]          │    │
│  │                                  │    │
│  │                                  │    │
│  └──────────────────────────────────┘    │
│                                          │
│           [ 📸 CAPTURE ]                │
│                                          │
│  Photos taken (2):                       │
│  ┌──────┐  ┌──────┐  ┌──────┐          │
│  │ img1 │  │ img2 │  │  +   │          │
│  │      │  │      │  │ ADD  │          │
│  └──────┘  └──────┘  └──────┘          │
│                                          │
│  Caption: [Visible cracks on ribs_______]│
│                                          │
│  [✏️ ANNOTATE]   [DONE]                 │
└──────────────────────────────────────────┘
```

**Photo annotation:** After taking a photo, the tech can draw on it — circles around the problem area, arrows pointing to cracks, text labels. This is what sells the service to the customer. Simple canvas overlay with:
- Red circle tool (draw circles)
- Red arrow tool (draw arrows)  
- Text label tool (add text)
- Undo button

Photos are compressed client-side to < 500KB before upload using browser canvas:

```typescript
async function compressPhoto(file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> {
  const img = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  const ratio = Math.min(maxWidth / img.width, 1);
  canvas.width = img.width * ratio;
  canvas.height = img.height * ratio;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise(resolve => canvas.toBlob(resolve!, 'image/jpeg', quality));
}
```

**Step 4: Complete and send**

When all items are checked (or tech manually completes):

```
┌──────────────────────────────────────────┐
│ ✅ Inspection Complete                    │
│──────────────────────────────────────────│
│                                          │
│ Robert Smith · 2019 Ford F-150           │
│ Mileage: 42,350                          │
│                                          │
│ SUMMARY                                  │
│                                          │
│  ✅ 56 Good                        │
│  ⚠️  5 items Need Attention              │
│  ❌  3 items Immediate                   │
│                                          │
│ RECOMMENDED SERVICES         Est. Total  │
│                                          │
│  ❌ Serpentine belt replacement   $185    │
│  ❌ Front brake pads             $289    │
│  ❌ Air filter replacement        $45    │
│  ⚠️ Coolant flush (soon)         $129    │
│  ⚠️ Rear brake pads (monitor)    $249   │
│  ⚠️ Wiper blades (soon)           $35    │
│  ⚠️ Cabin air filter (soon)       $55   │
│  ⚠️ Alignment check (monitor)     $89    │
│                                          │
│  Total recommended:           $1,076     │
│                                          │
│ [📱 TEXT TO CUSTOMER]                    │
│ [✉️ EMAIL TO CUSTOMER]                  │
│ [🔗 COPY LINK]                           │
│ [📋 ADD APPROVED TO RO]                 │
└──────────────────────────────────────────┘
```

---

## 4. Customer-Facing DVI Report (Public Page)

When the customer gets the text/email and taps the link, they see a beautiful, branded report. This is our money page — it sells work.

**URL:** `https://shop.pcbisv.com/inspection/{share_token}`

### 4.1 Customer Report Layout

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│              [SHOP LOGO]                             │
│          Demo Auto Shop                              │
│     123 Main St · Indianapolis, IN 46032            │
│     (317) 555-1234                                   │
│                                                      │
│──────────────────────────────────────────────────────│
│                                                      │
│  VEHICLE INSPECTION REPORT                           │
│  February 8, 2026                                    │
│                                                      │
│  Customer: Robert Smith                              │
│  Vehicle: 2019 Ford F-150 XLT                       │
│  Mileage: 42,350                                     │
│  Technician: Mike Thompson                           │
│                                                      │
│──────────────────────────────────────────────────────│
│                                                      │
│  OVERALL HEALTH                                      │
│                                                      │
│  ████████████████████████████████████░░░░░░░░       │
│  ✅ 56 Good    ⚠️ 5 Watch    ❌ 3 Needs Now        │
│                                                      │
│══════════════════════════════════════════════════════│
│                                                      │
│  ❌ NEEDS IMMEDIATE ATTENTION                        │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ SERPENTINE BELT — Cracked                      │  │
│  │                                                │  │
│  │  ┌──────────────┐  ┌──────────────┐           │  │
│  │  │  [PHOTO 1]   │  │  [PHOTO 2]   │           │  │
│  │  │  ← cracks    │  │  annotated → │           │  │
│  │  └──────────────┘  └──────────────┘           │  │
│  │                                                │  │
│  │  Your belt is showing visible cracks and       │  │
│  │  could break at any time, leaving you          │  │
│  │  stranded. We recommend replacing now.         │  │
│  │                                                │  │
│  │  Estimated cost: $185.00                       │  │
│  │                                                │  │
│  │  [ ✅ APPROVE THIS SERVICE ]                   │  │
│  │                                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ FRONT BRAKE PADS — 2mm remaining               │  │
│  │                                                │  │
│  │  ┌──────────────┐                              │  │
│  │  │  [PHOTO]     │   Minimum safe: 3mm         │  │
│  │  │  worn pads → │   Your vehicle: 2mm ❌      │  │
│  │  └──────────────┘                              │  │
│  │                                                │  │
│  │  Your front brake pads are below the safe      │  │
│  │  minimum. Continued driving risks rotor        │  │
│  │  damage and reduced stopping power.            │  │
│  │                                                │  │
│  │  Estimated cost: $289.00                       │  │
│  │                                                │  │
│  │  [ ✅ APPROVE THIS SERVICE ]                   │  │
│  │                                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ... (Air filter — $45) ...                          │
│                                                      │
│══════════════════════════════════════════════════════│
│                                                      │
│  ⚠️ SHOULD BE ADDRESSED SOON                        │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ COOLANT — Below minimum line                   │  │
│  │  📷 1 photo                                    │  │
│  │  Coolant flush recommended: $129.00            │  │
│  │  [ ✅ APPROVE ]                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ... (more yellow items) ...                         │
│                                                      │
│══════════════════════════════════════════════════════│
│                                                      │
│  ✅ PASSED — NO ACTION NEEDED                       │
│                                                      │
│  Engine oil ✅ | Trans fluid ✅ | Brake fluid ✅    │
│  Power steering ✅ | Washer fluid ✅ | Hoses ✅     │
│  Battery 12.6V ✅ | All 4 tires >5/32 ✅           │
│  Tire pressure ✅ | Steering ✅ | Suspension ✅     │
│  ... (all 56 green items listed compactly) ...      │
│                                                      │
│══════════════════════════════════════════════════════│
│                                                      │
│  SUMMARY OF APPROVED SERVICES                        │
│                                                      │
│  ☑ Serpentine belt replacement        $185.00       │
│  ☑ Front brake pads                   $289.00       │
│  ☐ Air filter                          $45.00       │
│  ☐ Coolant flush                      $129.00       │
│                                                      │
│  Approved total:                      $474.00       │
│                                                      │
│  [ ✅ CONFIRM APPROVED SERVICES ]                   │
│                                                      │
│══════════════════════════════════════════════════════│
│                                                      │
│  SIGN TO ACKNOWLEDGE                                 │
│                                                      │
│  I have reviewed this inspection report and          │
│  understand the findings and recommendations.        │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │                                              │    │
│  │     [TOUCH TO SIGN]                          │    │
│  │                                              │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [ ✅ SUBMIT SIGNATURE ]                             │
│                                                      │
│──────────────────────────────────────────────────────│
│                                                      │
│  Questions? Call us: (317) 555-1234                  │
│  Or reply to the text/email you received.            │
│                                                      │
│  Powered by PCB Auto                                 │
└──────────────────────────────────────────────────────┘
```

### 4.2 Customer Approval Flow

1. Customer receives text: *"Hi Robert, your vehicle inspection is ready. 3 items need attention. View report: https://shop.pcbisv.com/inspection/abc123"*
2. Customer opens link → sees the report above
3. Customer taps "Approve This Service" on items they want done
4. Customer taps "Confirm Approved Services" at the bottom
5. PCB Auto receives the approval:
   - Updates `pcb_inspection_points.customer_approved = TRUE` for each approved item
   - Updates `pcb_inspections.approved_items` JSONB array
   - Fires webhook/notification to service advisor
   - If linked to an RO, approved items can be auto-added as service lines on the RO

### 4.3 Tracking

```sql
-- When customer opens the link
UPDATE pcb_inspections 
SET viewed_at = NOW(), status = 'viewed'
WHERE share_token = $1 AND viewed_at IS NULL;

-- We track this with a simple pixel/JS on the public page
```

The shop can see: "Robert viewed the inspection at 10:32 AM" — which tells the advisor it's time to follow up with a call.

---

## 5. UX by Device

### 5.1 Phone (Tech in the Bay)

This is the PRIMARY device for inspections. The tech is holding their phone while looking at the car.

```
┌──────────────────────────────────┐
│ ← Inspection · RO #1001         │
│ F-150 · 42,350 mi               │
│──────────────────────────────────│
│ ████████░░░░ 48/72 (67%)        │
│──────────────────────────────────│
│                                  │
│ ▼ UNDER HOOD  (8/13)            │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Radiator hoses               │ │
│ │ Inspect for cracks, bulges   │ │
│ │                              │ │
│ │  ┌──────┐ ┌──────┐ ┌──────┐ │ │
│ │  │ ✅   │ │ ⚠️   │ │ ❌   │ │ │
│ │  │ GOOD │ │WATCH │ │ BAD  │ │ │
│ │  │      │ │      │ │      │ │ │
│ │  └──────┘ └──────┘ └──────┘ │ │
│ │                              │ │
│ │  [📷 PHOTO]   [📝 NOTE]     │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Battery terminals            │ │
│ │ Check corrosion, tightness   │ │
│ │                              │ │
│ │  Voltage: [____] V           │ │
│ │                              │ │
│ │  ┌──────┐ ┌──────┐ ┌──────┐ │ │
│ │  │ ✅   │ │ ⚠️   │ │ ❌   │ │ │
│ │  └──────┘ └──────┘ └──────┘ │ │
│ │                              │ │
│ │  [📷 PHOTO]   [📝 NOTE]     │ │
│ └──────────────────────────────┘ │
│                                  │
│ ▶ BRAKES (0/7)                   │
│ ▶ STEERING & SUSPENSION (0/6)   │
│ ▶ TIRES & WHEELS (0/8)          │
│       ... scroll ...             │
│                                  │
│──────────────────────────────────│
│  🏠      📋      📅      👥   ⋯ │
└──────────────────────────────────┘
```

**Phone-specific behaviors:**
- **Inline item cards** — each item is a card you interact with right in the list (no separate detail page for simple items)
- Tapping ✅ on an item instantly collapses the card, marks it green, and scrolls to the next unchecked item
- Tapping ⚠️ or ❌ expands the card to show notes/photo/cost fields
- **Camera opens instantly** — `capture="environment"` triggers rear camera with one tap
- **Swipe gestures:** Swipe right on a card = mark Good. Swipe left = mark Bad. (Power user shortcut for experienced techs)
- Category headers are sticky — always visible as you scroll through items
- Progress bar is sticky at top

**Phone "desktop nudge":** None — phone is THE ideal device for inspections.

### 5.2 Tablet (Shop Floor)

Same as phone but with more room:

```
┌──────────────────────────────────────────────────────────────┐
│ ← Inspection · RO #1001 · Robert Smith · 2019 Ford F-150    │
│──────────────────────────────────────────────────────────────│
│ ████████████░░░░░░░░ 48/72 (67%)                            │
│──────────────────────────────────────────────────────────────│
│                                                              │
│  UNDER HOOD (8/13)                  │  PHOTOS FOR THIS ITEM │
│                                     │                        │
│  ✅ Engine oil level       Good     │  ┌─────┐ ┌─────┐     │
│  ✅ Engine oil leak        Good     │  │     │ │     │     │
│  ✅ Trans fluid            Good     │  │ img │ │ img │     │
│  ⚠️ Coolant level         Low      │  │     │ │     │     │
│  ✅ Brake fluid            Good     │  └─────┘ └─────┘     │
│  ✅ Power steering         Good     │                        │
│  ✅ Washer fluid           Good     │  Caption:              │
│  ❌ Serpentine belt        Cracked  │  "Cracks on 3rd rib"  │
│  ○ [Radiator hoses]  ← selected    │                        │
│    ┌────┐ ┌────┐ ┌────┐           │  [📷 ADD PHOTO]        │
│    │ ✅ │ │ ⚠️ │ │ ❌ │           │  [✏️ ANNOTATE]         │
│    └────┘ └────┘ └────┘           │                        │
│  ○  Battery terminals              │                        │
│  ○  Battery load test              │                        │
│  ○  Air filter                     │                        │
│  ○  Cabin air filter               │                        │
│                                     │                        │
│  BRAKES (0/7)                       │                        │
│  TIRES & WHEELS (0/8)               │                        │
└──────────────────────────────────────────────────────────────┘
```

**Tablet advantage:** Two-panel layout. Checklist on the left, photo viewer on the right. Tech can see photos while marking items without switching screens.

### 5.3 Desktop (Service Advisor Review)

Service advisor reviews completed inspections, edits estimates, and sends to customers:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Inspection — RO #1001 · Robert Smith · 2019 Ford F-150 · 42,350 mi         │
│──────────────────────────────────────────────────────────────────────────────│
│                                                                              │
│  ┌─ CHECKLIST ──────────────────┐  ┌─ RECOMMENDED SERVICES ──────────────┐  │
│  │                              │  │                                      │  │
│  │ ✅ 56 Good                   │  │ ❌ Serpentine belt         $185.00   │  │
│  │ ⚠️ 5 Watch                   │  │ ❌ Front brake pads       $289.00   │  │
│  │ ❌ 3 Immediate               │  │ ❌ Air filter              $45.00   │  │
│  │                              │  │ ⚠️ Coolant flush          $129.00    │  │
│  │ [View Full Checklist ↓]     │  │ ⚠️ Rear brakes (monitor)  $249.00   │  │
│  │                              │  │ ⚠️ Wiper blades            $35.00   │  │
│  │ PHOTOS (8 total)            │  │ ⚠️ Cabin air filter        $55.00   │  │
│  │ ┌────┐┌────┐┌────┐┌────┐  │  │ ⚠️ Alignment check         $89.00   │  │
│  │ │    ││    ││    ││    │  │  │                                      │  │
│  │ └────┘└────┘└────┘└────┘  │  │ Total:                   $1,076.00   │  │
│  │ ┌────┐┌────┐┌────┐┌────┐  │  │                                      │  │
│  │ │    ││    ││    ││    │  │  │ [EDIT ESTIMATES]                      │  │
│  │ └────┘└────┘└────┘└────┘  │  │ [ADD ALL TO RO]                      │  │
│  │                              │  │ [ADD APPROVED ONLY TO RO]           │  │
│  └──────────────────────────────┘  └──────────────────────────────────────┘  │
│                                                                              │
│  ┌─ SEND TO CUSTOMER ────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  [📱 Text Report]   [✉️ Email Report]   [🔗 Copy Link]               │  │
│  │                                                                        │  │
│  │  Preview: "Hi Robert, your vehicle inspection is ready. 3 items need  │  │
│  │  attention. View report: https://shop.pcbisv.com/inspection/abc123"   │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Inspections List Page

The main Inspections nav item shows all inspections.

### 6.1 Desktop

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Inspections                                    [+ New Inspection]            │
│ [All] [In Progress] [Completed] [Sent] [Approved]     🔍 Search...          │
│──────────────────────────────────────────────────────────────────────────────│
│                                                                              │
│ RO#    Customer        Vehicle              Tech      Status     Findings   │
│ ──────────────────────────────────────────────────────────────────────────── │
│ 1001   Robert Smith    2019 Ford F-150      Mike T.   ⚠️ Sent    3❌ 5⚠️   │
│        └ Viewed 10:32 AM · 2 items approved · $474 approved                 │
│ 1002   Maria Johnson   2021 Toyota Camry    Sarah K.  🟡 In Prog  --       │
│        └ 14/22 complete                                                      │
│ 0998   Lisa Chen       2022 BMW X3          Dave R.   ✅ Done    0❌ 2⚠️   │
│        └ Sent 2/5 · Customer approved all · Added to RO                     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Phone

```
┌──────────────────────────────────┐
│ Inspections          [+ New]     │
│ [All] [Active] [Sent] [Done]    │
│──────────────────────────────────│
│                                  │
│ ┌──────────────────────────────┐ │
│ │ RO #1001          ⚠️ Sent   │ │
│ │ Robert Smith · F-150         │ │
│ │ Mike T. · 3❌ 5⚠️           │ │
│ │ Viewed · 2 approved · $474  │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ RO #1002       🟡 In Progress│ │
│ │ Maria Johnson · Camry        │ │
│ │ Sarah K. · 14/22 done        │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ RO #0998          ✅ Done    │ │
│ │ Lisa Chen · BMW X3           │ │
│ │ Dave R. · All approved       │ │
│ └──────────────────────────────┘ │
│                                  │
│──────────────────────────────────│
│  🏠      📋      📅      👥   ⋯ │
└──────────────────────────────────┘
```

---

## 7. API Endpoints

```
── /api/pcbauto/v1/inspections

  GET    /                           List inspections (filter by status, date, tech)
  POST   /                           Create new inspection (from template)
  GET    /:id                        Get inspection with all points and photos
  PUT    /:id                        Update inspection (status, notes)
  DELETE /:id                        Delete inspection (admin only)

  PUT    /:id/points/:pointId        Update a single inspection point (condition, notes, measurement)
  POST   /:id/points/:pointId/photos Upload photo for an inspection point
  DELETE /:id/photos/:photoId        Delete a photo

  POST   /:id/complete               Mark inspection as complete (calculates summary counts)
  POST   /:id/send                   Generate share_token, send to customer via text/email
  GET    /:id/share-url              Get the public URL for the inspection report
  POST   /:id/add-to-ro              Add approved/all recommended services to the linked RO

── /api/pcbauto/v1/inspections/templates

  GET    /                           List templates (system + shop custom)
  POST   /                           Create custom template
  GET    /:id                        Get template with all items
  PUT    /:id                        Update template (name, items, ordering)
  DELETE /:id                        Delete custom template (can't delete system templates)
  POST   /:id/duplicate              Duplicate a template to customize

── /api/pcbauto/v1/inspections/public

  GET    /:token                     Public inspection report (no auth)
  POST   /:token/approve             Customer approves selected items (no auth)
  POST   /:token/signature           Upload customer signature image (no auth, canvas blob)
  GET    /:token/pdf                 Download PDF version of inspection report

── /api/pcbauto/v1/inspections/declined

  GET    /                           List declined items across all inspections (for follow-up)
  GET    /due                        Declined items past their follow-up date (reminder queue)
  POST   /:pointId/remind            Mark as reminder sent (logs to communication table)
  POST   /:pointId/converted         Mark as converted (customer came back for the work)
```

---

## 8. Declined Services Follow-Up (The Return-Visit Generator)

This is where the Maintenance Advisory section of your checklist pays off. When a customer declines a yellow or red item, that item doesn't disappear — it goes into a follow-up queue.

### 8.1 Schema

```sql
-- Declined items are already tracked in pcb_inspection_points where:
-- customer_approved = FALSE AND condition IN ('yellow', 'red')
-- We add follow-up tracking:

ALTER TABLE pcb_inspection_points ADD COLUMN IF NOT EXISTS
  follow_up_days INTEGER,                  -- remind in X days (default: 90 for yellow, 30 for red)
  follow_up_date DATE,                     -- calculated: inspection date + follow_up_days
  follow_up_sent BOOLEAN DEFAULT FALSE,
  follow_up_sent_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT FALSE,         -- customer came back and got the work done
  converted_ro_id UUID REFERENCES pcb_repair_orders(id);  -- the RO that did this work
```

### 8.2 Follow-Up Logic

```typescript
// Default follow-up intervals
const FOLLOW_UP_DAYS = {
  red_safety: 14,     // safety items — follow up in 2 weeks
  red: 30,            // other immediate items — 30 days
  yellow_soon: 60,    // "recommended soon" — 60 days
  yellow_monitor: 90, // "monitor" items — 90 days
  advisory: 90,       // maintenance advisory items — 90 days
};

// Nightly cron job (or daily check on dashboard load)
async function getDueFollowUps(tenantId: string): Promise<DeclinedItem[]> {
  return db.query(`
    SELECT ip.*, i.customer_id, i.vehicle_id, c.first_name, c.phone, c.email,
           v.year, v.make, v.model
    FROM pcb_inspection_points ip
    JOIN pcb_inspections i ON ip.inspection_id = i.id
    JOIN pcb_customers c ON i.customer_id = c.id
    JOIN pcb_vehicles v ON i.vehicle_id = v.id
    WHERE i.tenant_id = $1
      AND ip.customer_approved = FALSE
      AND ip.condition IN ('yellow', 'red')
      AND ip.follow_up_date <= CURRENT_DATE
      AND ip.follow_up_sent = FALSE
      AND ip.converted = FALSE
    ORDER BY ip.follow_up_date ASC
  `, [tenantId]);
}
```

### 8.3 Dashboard Widget

The dashboard shows a "Declined Services Due" card:

```
┌────────────────────────────────────────────┐
│ 📋 DECLINED SERVICES — FOLLOW UP          │
│────────────────────────────────────────────│
│                                            │
│ 🔴 Robert Smith — F-150                   │
│    LF Tire (2/32) — declined Feb 8        │
│    14 days overdue · [📱 Text] [📞 Call]  │
│                                            │
│ 🟡 Maria Johnson — Camry                  │
│    Cabin air filter — declined Jan 15     │
│    Due today · [📱 Text] [📞 Call]        │
│                                            │
│ 🟡 James Park — Civic                     │
│    Brake fluid flush — declined Jan 3     │
│    Due in 5 days · [📱 Text] [📞 Call]    │
│                                            │
│ 5 more items due this week                │
│ [View All Declined Services →]            │
└────────────────────────────────────────────┘
```

### 8.4 Follow-Up Text Template

Pre-filled SMS (uses the Communication Spec's `sms:` link pattern):

```
Hi {firstName}, this is {shopName}. Back in {inspectionMonth} we found 
your {vehicleYear} {vehicleMake} {vehicleModel} needed {serviceName}. 
We wanted to check in — would you like to get that taken care of? 
We have availability this week. Reply or call us at {shopPhone}.
```

### 8.5 Conversion Tracking

When the customer comes back and gets the work done:
1. Advisor creates new RO
2. When adding service lines, system shows: "This vehicle has declined inspection items — add from previous findings?"
3. Advisor selects the matching item
4. System updates `pcb_inspection_points.converted = TRUE` and links to the new RO
5. Reports show: "Declined → Converted" rate as a KPI

**Target KPI:** 30-40% of declined yellow items convert within 90 days. Shops that follow up hit this. Shops that don't follow up see <10%.

---

## 9. Inspection → RO → Estimate → Payment Flow

This is the full money path:

```
1. Tech performs inspection
   └── Marks items green/yellow/red, takes photos, adds cost estimates

2. Advisor reviews inspection
   └── Adjusts estimates if needed, adds shop-rate pricing

3. Report sent to customer (text/email)
   └── Customer views report, sees photos, approves items

4. Approved items added to RO as service lines
   └── "Add Approved to RO" button creates labor + parts lines automatically

5. RO estimate sent for formal approval
   └── Uses the existing estimate approval flow from Communication Spec

6. Tech performs approved work
   └── Updates RO status as work progresses

7. Invoice sent, payment collected
   └── Uses existing invoice/payment flow
```

At each step, the customer sees photos and understands WHY they're paying. That's the entire value proposition of DVI.

---

## 10. Demo Data

Add to the existing demo data from the Scheduling/Demo Data spec:

### Today's Inspections

**Inspection #1 — Robert Smith's F-150 (linked to RO #1001)**
- Template: Full Multi-Point (72 points)
- Status: Sent (sent at 9:50 AM, viewed at 10:32 AM)
- Inspector: Mike T.
- Results: 56 green, 10 yellow, 6 red
- Red items: Serpentine belt ($185), LF brake pad 2mm ($289), RF brake pad 2mm (included in brake job), Air filter ($45), LF tire tread 2/32 ($189/tire), Check engine light on — P0301 misfire ($125 diag)
- Yellow items: Coolant level low ($129 flush), LR brake pad 3.5mm ($249 — soon), Wiper blades ($35), Cabin air filter ($55), Alignment recommended ($89), LR tire tread 4/32 (monitor), Transmission service due at 45k ($189), Steering rack minor seep (monitor)
- Customer approved: Serpentine belt + Front brake pads + Air filter + LF tire ($708)
- Photos: 14 total (2 of belt with annotations, 3 of brake pads LF/RF/rotor, 2 of air filter dirty vs new comparison, 1 of coolant reservoir, 1 of LF tire tread with gauge, 1 of check engine light on dash, 2 of LR brake pads, 1 of cabin filter, 1 of steering rack seep)
- Customer signature: captured at 11:15 AM after phone review with advisor

**Inspection #2 — Maria Johnson's Camry (linked to RO #1002)**
- Template: Quick Lube Inspection (22 points)
- Status: In Progress (Sarah K. performing now)
- Results so far: 14/22 complete, 12 green, 2 yellow (cabin filter dirty, wiper blades streaking)

**Completed Inspection — Lisa Chen's BMW X3 (from Feb 6)**
- Template: Full Multi-Point (72 points)
- Status: Approved → Services added to RO
- Results: 63 green, 8 yellow, 1 red
- Red: Cabin air filter ($75)
- Yellow: Brake fluid flush ($149), Wiper blades ($65), Tire rotation ($49), A/C vent temp 58°F ($149 recharge), Drive belt starting to glaze ($185 — monitor), Power steering fluid dark ($129 flush — monitor), Spark plugs due at 60k ($245 — schedule next visit)
- Customer approved: Cabin filter + Brake fluid + Wipers + Tire rotation ($338) — all added to RO and completed
- Declined for now: A/C, drive belt, PS flush, spark plugs — flagged for follow-up reminder at 90 days

---

## 11. Phase Assignment

| Feature | Phase | Notes |
|---------|-------|-------|
| Inspection templates (system-provided) | Phase 2 | Ship with 6 built-in templates (Full 72pt, Quick Lube 22pt, Pre-Purchase 90pt, Winter 18pt, Summer 16pt) |
| Custom template editor | Phase 3 | Let shops build their own |
| Inspection checklist (tech flow) | Phase 2 | Core DVI functionality — Week 9 |
| Photo capture + compression | Phase 2 | HTML5 camera, client-side resize |
| Photo annotation (draw on photo) | Phase 3 | Canvas overlay — nice to have, big upsell impact |
| Customer-facing report (public page) | Phase 2 | Week 10 |
| Customer approval via report | Phase 2 | Week 10 |
| Customer signature capture | Phase 2 | Canvas touch signature on public page |
| Add approved items to RO | Phase 2 | Week 10 |
| Inspection → RO auto-create | Phase 2 | Week 10 |
| View tracking (customer opened) | Phase 2 | Simple pixel/JS on public page |
| Inspection list page | Phase 2 | Week 9 |
| PDF export of inspection report | Phase 3 | Requires PDF generation |
| Measurement threshold auto-coloring | Phase 2 | Auto-yellow/red based on template thresholds |
| Swipe gestures (Good/Bad) | Phase 3 | Power user feature |
| Declined services follow-up queue | Phase 2 | Dashboard widget + follow-up date tracking |
| Declined services text/call follow-up | Phase 2 | Uses Communication Spec sms/tel links |
| Declined → Converted tracking | Phase 3 | Conversion KPI reporting |
| Automated follow-up reminders | Phase 3+ | Requires Twilio (cron + auto-send) |
| Demo data (inspections) | Phase 1 | Seed with scheduling demo data |

---

## 12. Isolation Guarantee

All tables prefixed `pcb_`, all endpoints under `/api/pcbauto/v1/inspections/`, tenant-isolated via RLS, gated by `portal: 'pcbauto'` JWT claim. Zero impact on PCBISV.com sales suite.
