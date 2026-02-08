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
  description TEXT,                          -- 'Comprehensive 50-point vehicle inspection'
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

### 2.1 Full Multi-Point Inspection (Default — 50 points)

```
UNDER HOOD
├── Engine oil level & condition          [measurement: n/a]
├── Engine oil leak                       [photo if red]
├── Transmission fluid level & condition  [measurement: n/a]
├── Coolant level & condition             [measurement: n/a]
├── Brake fluid level & condition         [measurement: n/a]
├── Power steering fluid                  [measurement: n/a]
├── Windshield washer fluid               [measurement: n/a]
├── Serpentine belt condition              [photo if red]
├── Radiator hoses                        [photo if red]
├── Battery terminal condition            [measurement: volts, yellow <12.4, red <12.0]
├── Battery load test                     [measurement: volts]
├── Air filter condition                  [photo if yellow/red]
└── Cabin air filter condition            [photo if yellow/red]

BRAKES
├── Front brake pad thickness             [measurement: mm, yellow <4, red <2]
├── Rear brake pad thickness              [measurement: mm, yellow <4, red <2]
├── Front rotors condition                [photo if red]
├── Rear rotors/drums condition           [photo if red]
├── Brake lines & hoses                   [photo if red]
├── Parking brake operation               [measurement: n/a]
└── Brake fluid flush due                 [measurement: n/a]

TIRES & WHEELS
├── Front left tire tread depth           [measurement: 32nds, yellow <5, red <3]
├── Front right tire tread depth          [measurement: 32nds, yellow <5, red <3]
├── Rear left tire tread depth            [measurement: 32nds, yellow <5, red <3]
├── Rear right tire tread depth           [measurement: 32nds, yellow <5, red <3]
├── Tire pressure — all 4                 [measurement: psi]
├── Tire wear pattern (uneven?)           [photo if yellow/red]
├── Spare tire condition                  [measurement: n/a]
└── Wheel/lug nut torque                  [measurement: n/a]

STEERING & SUSPENSION
├── Tie rod ends                          [photo if red]
├── Ball joints                           [photo if red]
├── Struts/shocks condition               [photo if red]
├── CV boots/axle condition               [photo if red]
├── Wheel bearings                        [measurement: n/a]
└── Alignment visual check                [measurement: n/a]

EXHAUST
├── Exhaust system condition              [photo if red]
├── Catalytic converter                   [measurement: n/a]
└── Muffler & pipes                       [photo if red]

EXTERIOR
├── Windshield condition                  [photo if red]
├── Wiper blades                          [measurement: n/a]
├── All exterior lights                   [measurement: n/a]
├── Horn operation                        [measurement: n/a]
└── Body/frame condition                  [photo if yellow/red]

INTERIOR
├── Dashboard warning lights              [photo if any active]
├── HVAC operation                        [measurement: n/a]
├── Seat belts                            [measurement: n/a]
└── Instrument cluster operation          [measurement: n/a]

UNDER VEHICLE
├── Oil pan/gasket condition              [photo if red]
├── Transmission pan/gasket               [photo if red]
├── Differential fluid                    [measurement: n/a]
├── Transfer case fluid (4WD/AWD)         [measurement: n/a]
├── Exhaust hangers                       [photo if red]
└── Frame/subframe rust                   [photo if red]
```

### 2.2 Quick Lube Inspection (15 points)

Stripped-down version for oil change customers — fast, covers the basics:

```
FLUIDS: Oil, coolant, brake fluid, power steering, washer fluid, transmission
FILTERS: Engine air, cabin air
TIRES: Tread depth (4 tires), pressure (4 tires)
BATTERY: Voltage test
BELTS: Serpentine belt visual
WIPERS: Wiper blade condition
```

### 2.3 Pre-Purchase Inspection (60+ points)

Extended version for used car buyers — includes everything in the full inspection plus:

```
Additional: OBD-II scan (stored codes), frame measurement, paint depth reading,
suspension travel test, compression test notes, fluid analysis notes,
VIN verification, title/salvage flag
```

### 2.4 Seasonal Inspection (Winter / Summer)

Winter: Battery, coolant concentration, heater, tire condition, wipers, lights
Summer: AC performance, coolant level, belt condition, tire pressure

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
│ Progress: ████████░░░░░ 23/50  (46%)    │
│                                          │
│ ▼ UNDER HOOD (8/13 done)                │
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
│ ▶ BRAKES (0/7 done)                     │
│ ▶ TIRES & WHEELS (0/8 done)             │
│ ▶ STEERING & SUSPENSION (0/6 done)      │
│ ▶ EXHAUST (0/3 done)                    │
│ ▶ EXTERIOR (0/5 done)                   │
│ ▶ INTERIOR (0/4 done)                   │
│ ▶ UNDER VEHICLE (0/6 done)              │
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
│  ✅ 42 items Good                        │
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
│  ✅ 42 Good    ⚠️ 5 Watch    ❌ 3 Needs Now        │
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
│  ... (all 42 green items listed compactly) ...      │
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
│ ████████░░░░ 23/50 (46%)        │
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
│ ▶ TIRES & WHEELS (0/8)           │
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
│ ████████████░░░░░░░░ 23/50 (46%)                            │
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
│  │ ✅ 42 Good                   │  │ ❌ Serpentine belt         $185.00   │  │
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
│        └ 23/50 complete                                                      │
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
│ │ Sarah K. · 23/50 done        │ │
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
  GET    /:token/pdf                 Download PDF version of inspection report
```

---

## 8. Inspection → RO → Estimate → Payment Flow

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

## 9. Demo Data

Add to the existing demo data from the Scheduling/Demo Data spec:

### Today's Inspections

**Inspection #1 — Robert Smith's F-150 (linked to RO #1001)**
- Template: Full Multi-Point
- Status: Sent (sent at 9:50 AM, viewed at 10:32 AM)
- Inspector: Mike T.
- Results: 42 green, 5 yellow, 3 red
- Red items: Serpentine belt ($185), Front brake pads ($289), Air filter ($45)
- Yellow items: Coolant level ($129), Rear brakes ($249), Wipers ($35), Cabin filter ($55), Alignment ($89)
- Customer approved: Serpentine belt + Front brake pads ($474)
- Photos: 8 total (2 of belt, 2 of brake pads, 1 of air filter, 1 of coolant, 1 of rear brakes, 1 of wipers)

**Inspection #2 — Maria Johnson's Camry (linked to RO #1002)**
- Template: Quick Lube Inspection
- Status: In Progress (Sarah K. performing now)
- Results so far: 8/15 complete, all green

**Completed Inspection — Lisa Chen's BMW X3 (from Feb 6)**
- Template: Full Multi-Point
- Status: Approved → Services added to RO
- Results: 45 green, 4 yellow, 1 red
- Red: Cabin air filter ($75)
- Yellow: Brake fluid flush ($149), Wiper blades ($65), Tire rotation ($49)
- Customer approved all ($338) — all added to RO and completed

---

## 10. Phase Assignment

| Feature | Phase | Notes |
|---------|-------|-------|
| Inspection templates (system-provided) | Phase 2 | Ship with 4 built-in templates |
| Custom template editor | Phase 3 | Let shops build their own |
| Inspection checklist (tech flow) | Phase 2 | Core DVI functionality — Week 9 |
| Photo capture + compression | Phase 2 | HTML5 camera, client-side resize |
| Photo annotation (draw on photo) | Phase 3 | Canvas overlay — nice to have |
| Customer-facing report (public page) | Phase 2 | Week 10 |
| Customer approval via report | Phase 2 | Week 10 |
| Add approved items to RO | Phase 2 | Week 10 |
| Inspection → RO auto-create | Phase 2 | Week 10 |
| View tracking (customer opened) | Phase 2 | Simple pixel/JS on public page |
| Inspection list page | Phase 2 | Week 9 |
| PDF export of inspection report | Phase 3 | Requires PDF generation |
| Measurement threshold auto-coloring | Phase 2 | Auto-yellow/red based on template thresholds |
| Swipe gestures (Good/Bad) | Phase 3 | Power user feature |
| Demo data (inspections) | Phase 1 | Seed with scheduling demo data |

---

## 11. Isolation Guarantee

All tables prefixed `pcb_`, all endpoints under `/api/pcbauto/v1/inspections/`, tenant-isolated via RLS, gated by `portal: 'pcbauto'` JWT claim. Zero impact on PCBISV.com sales suite.
