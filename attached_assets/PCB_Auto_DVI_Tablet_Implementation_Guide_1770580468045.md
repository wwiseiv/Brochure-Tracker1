# PCB Auto — DVI Tablet Implementation Guide

**For:** Replit developer / AI building the inspection UI
**Priority:** SPEED and SIMPLICITY for a technician on a tablet in the shop
**Date:** February 8, 2026

---

## The Reality Check

A technician doing an inspection is:
- Standing in a shop bay, not sitting at a desk
- Hands are greasy, possibly wearing gloves
- Holding a tablet (iPad or Android) with one hand, tapping with the other
- Walking around and under a vehicle
- Wanting to get through this FAST so they can get back to turning wrenches
- NOT a computer person — they're a mechanic

**Every design decision flows from this.** If the tech has to think, squint, scroll excessively, or tap more than twice to record a finding, the design has failed.

---

## 1. Device & Browser Support

### Works On (test these)
- **iPad** (10th gen, Air, Pro) — Safari, Chrome
- **Android tablets** — Samsung Galaxy Tab, Lenovo Tab — Chrome
- **Any phone** — fallback, not primary
- **Desktop** — for advisor review, not for doing inspections

### Camera Access
Both iPad and Android tablets support the HTML5 camera API. This is all we need:

```html
<!-- This is the ONLY camera code needed -->
<!-- capture="environment" = rear camera (for photographing car parts) -->
<input
  type="file"
  accept="image/*"
  capture="environment"
  id="photo-capture"
  style="display: none"
/>

<!-- Trigger it with a visible button -->
<button onclick="document.getElementById('photo-capture').click()">
  📷 Take Photo
</button>
```

**How it works on each device:**
- **iPad Safari:** Opens the native camera app, rear camera. Tech takes photo, taps "Use Photo," returns to PCB Auto with the image.
- **iPad Chrome:** Same behavior — opens camera picker, takes photo, returns.
- **Android Chrome:** Opens native camera, rear camera. Tech takes photo, taps the check, returns.
- **Desktop:** Opens file picker (for uploading existing photos from advisor's computer).

**No special camera libraries needed.** No WebRTC. No getUserMedia(). The HTML `capture` attribute handles everything across all devices. It's the simplest, most reliable approach.

### Photo Compression (client-side, before upload)

Tablets take 12MP photos (3-5MB each). We compress to ~500KB before uploading to keep it fast on shop WiFi:

```typescript
// utils/compressPhoto.ts
export async function compressPhoto(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.7
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Compression failed'));
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve({ blob, dataUrl });
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}
```

---

## 2. The Inspection Flow (Step by Step)

### Step 0: Start Inspection

Tech gets here from:
- Tapping "Start Inspection" on an RO detail page
- Tapping "New Inspection" from the Inspections list
- Auto-created when a new RO is made (if shop has a default template)

### Step 1: Inspection Header (shows once at top, then collapses)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                              INSPECTION             │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  Robert Smith · (317) 555-0101                              │
│  2019 Ford F-150 XLT · Silver · 42,350 mi                 │
│  RO #1001 · Tech: Mike Thompson                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ██████████████████░░░░░░░░░░░  34 / 72   47%       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ✅ 30   ⚠️ 3   ❌ 1   ○ 38 remaining                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Rules:**
- Header is collapsible — tapping the customer/vehicle area toggles it
- Progress bar and status counts are ALWAYS visible (sticky)
- Progress bar color fills: green portion, yellow portion, red portion, gray remaining

### Step 2: Category List (Main Screen)

This is what the tech sees most of the time. **ONE SCREEN. No page navigation.**

```
┌─────────────────────────────────────────────────────────────┐
│  ██████████░░░░░░░░░░  34/72  47%    ✅30  ⚠️3  ❌1       │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  1. BRAKES                              5 / 7  ✅   │   │
│  │  ████████████████████████████████░░░░░░░░░░         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  2. STEERING & SUSPENSION               0 / 6  ○   │   │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  3. TIRES & WHEELS                      8 / 8  ✅   │   │
│  │  ████████████████████████████████████████████████    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  4. FLUIDS                              3 / 6  🔵   │   │
│  │  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  5. ENGINE COMPONENTS                   0 / 7  ○   │   │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  6. ELECTRICAL & LIGHTING               8 / 8  ✅   │   │
│  │  ████████████████████████████████████████████████    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  (scroll for: 7. Exhaust, 8. Interior, 9. Under Vehicle,  │
│   10. Maintenance Advisory)                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          [ ✅ COMPLETE INSPECTION ]                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Rules:**
- Each category is a BIG card — minimum **72px tall** tap target
- Category shows: name, progress (X/Y), mini progress bar, status icon
- Status icons: ○ not started, 🔵 in progress, ✅ all green, ⚠️ has yellows, ❌ has reds
- Tapping a category card opens the item list for that category
- Complete categories are visually distinct (slightly muted, green border)
- "Complete Inspection" button only activates when all 72 items are checked (or tech manually overrides)

### Step 3: Inside a Category (THE CRITICAL SCREEN)

This is where the tech spends 90% of their time. **Every tap must count.**

```
┌─────────────────────────────────────────────────────────────┐
│  ← Categories          BRAKES                    5 / 7     │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  LF Brake Pad Thickness                             │   │
│  │  Measure pad thickness in mm                        │   │
│  │                                                     │   │
│  │  Measurement: [  4.5  ] mm                          │   │
│  │                                                     │   │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐          │   │
│  │  │         │   │         │   │         │          │   │
│  │  │  ✅     │   │  ⚠️     │   │  ❌     │          │   │
│  │  │  GOOD   │   │  WATCH  │   │  BAD    │          │   │
│  │  │         │   │         │   │         │          │   │
│  │  └─────────┘   └─────────┘   └─────────┘          │   │
│  │                                                     │   │
│  │  Height: 72px each   •   Gap: 12px between         │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  RF Brake Pad Thickness                             │   │
│  │  Measure pad thickness in mm                        │   │
│  │                                                     │   │
│  │  Measurement: [      ] mm                           │   │
│  │                                                     │   │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐          │   │
│  │  │  ✅     │   │  ⚠️     │   │  ❌     │          │   │
│  │  │  GOOD   │   │  WATCH  │   │  BAD    │          │   │
│  │  └─────────┘   └─────────┘   └─────────┘          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ... more items in this category ...                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### THE THREE BUTTONS — Design Specification

These are the most important UI elements in the entire application:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│   │              │  │              │  │              │    │
│   │     ✅       │  │     ⚠️       │  │     ❌       │    │
│   │              │  │              │  │              │    │
│   │    GOOD      │  │    WATCH     │  │     BAD      │    │
│   │              │  │              │  │              │    │
│   └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│   Width: calc((100% - 24px) / 3)   — equal thirds          │
│   Height: 72px minimum (80px preferred on tablets)          │
│   Border-radius: 12px                                       │
│   Font-size: 18px bold for label, 28px for emoji            │
│   Gap between buttons: 12px                                 │
│                                                             │
│   Colors:                                                   │
│   GOOD:   bg #E8F5E9 → active #4CAF50 (green)             │
│   WATCH:  bg #FFF8E1 → active #FF9800 (amber)             │
│   BAD:    bg #FFEBEE → active #F44336 (red)               │
│                                                             │
│   Unselected: light pastel background, dark text            │
│   Selected: solid color background, white text, slight      │
│             scale(1.02) + shadow for tactile feedback       │
│                                                             │
│   Touch feedback: 150ms background color transition         │
│   Haptic: navigator.vibrate(10) on tap (Android)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

```css
/* Exact CSS for the three buttons */
.condition-btn {
  flex: 1;
  min-height: 72px;
  border-radius: 12px;
  border: 2px solid transparent;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: all 150ms ease;
  -webkit-tap-highlight-color: transparent; /* kill iOS blue flash */
  user-select: none;
  touch-action: manipulation; /* prevent double-tap zoom */
}

.condition-btn .emoji { font-size: 28px; }

.condition-btn.good          { background: #E8F5E9; color: #2E7D32; border-color: #C8E6C9; }
.condition-btn.good.active   { background: #4CAF50; color: white; border-color: #4CAF50;
                                box-shadow: 0 2px 8px rgba(76,175,80,0.4); }

.condition-btn.watch         { background: #FFF8E1; color: #E65100; border-color: #FFECB3; }
.condition-btn.watch.active  { background: #FF9800; color: white; border-color: #FF9800;
                                box-shadow: 0 2px 8px rgba(255,152,0,0.4); }

.condition-btn.bad           { background: #FFEBEE; color: #C62828; border-color: #FFCDD2; }
.condition-btn.bad.active    { background: #F44336; color: white; border-color: #F44336;
                                box-shadow: 0 2px 8px rgba(244,67,54,0.4); }
```

### What Happens When Each Button Is Tapped

**Tap GOOD (✅):**
1. Button animates to active state (green fill)
2. Item card collapses to a one-line summary: `✅ LF Brake Pad Thickness — Good`
3. Auto-saves to database
4. Screen auto-scrolls to the next unchecked item
5. **Total time: 1 tap, <1 second**

**Tap WATCH (⚠️):**
1. Button animates to active state (amber fill)
2. Item card EXPANDS to show additional fields:

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  LF Brake Pad Thickness                        ⚠️      │
│  Measurement: [ 3.5 ] mm                               │
│                                                         │
│  ┌──────────────┐  ┌██████████████┐  ┌──────────────┐  │
│  │  ✅ GOOD     │  │  ⚠️ WATCH    │  │  ❌ BAD      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌─ EXPANDED DETAILS ─────────────────────────────────┐ │
│  │                                                     │ │
│  │  📝 Notes:                                          │ │
│  │  ┌─────────────────────────────────────────────┐   │ │
│  │  │ Approaching minimum spec, uneven inner wear │   │ │
│  │  └─────────────────────────────────────────────┘   │ │
│  │                                                     │ │
│  │  📷 Photos:                                         │ │
│  │  ┌────────┐  ┌────────┐  ┌──────────────────┐     │ │
│  │  │  img   │  │  img   │  │  + TAKE PHOTO    │     │ │
│  │  │        │  │        │  │     (72px tall)   │     │ │
│  │  └────────┘  └────────┘  └──────────────────┘     │ │
│  │                                                     │ │
│  │  Recommended service:                               │ │
│  │  ┌─────────────────────────────────────────────┐   │ │
│  │  │ Replace front brake pads                    │   │ │
│  │  └─────────────────────────────────────────────┘   │ │
│  │                                                     │ │
│  │  Estimated cost:  $ [ 289.00 ]                     │ │
│  │                                                     │ │
│  │  Urgency:                                           │ │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐      │ │
│  │  │  MONITOR  │  │   SOON    │  │ IMMEDIATE │      │ │
│  │  └───────────┘  └───────────┘  └───────────┘      │ │
│  │                                                     │ │
│  │  [ 💾 SAVE ]                                       │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Tap BAD (❌):**
Same as WATCH but:
- Urgency defaults to "IMMEDIATE"
- Photo section shows a prompt: "⚠️ Photo required for red items"
- Save button is disabled until at least 1 photo is taken (configurable per shop)

### Smart Defaults That Save Time

```typescript
// When tech enters a measurement, auto-suggest the condition:
function autoSuggestCondition(value: number, templateItem: TemplateItem): Condition {
  if (!templateItem.measurement_critical && !templateItem.measurement_min) return null;

  if (templateItem.measurement_critical && value <= templateItem.measurement_critical) {
    return 'red';   // e.g., brake pad 2mm when critical is 2mm
  }
  if (templateItem.measurement_min && value <= templateItem.measurement_min) {
    return 'yellow'; // e.g., brake pad 3.5mm when min is 4mm
  }
  return 'green';    // above both thresholds
}

// Example: Tech types "3.5" in brake pad measurement field
// System auto-highlights ⚠️ WATCH button (but doesn't select it — tech confirms)
// Tech sees the suggestion and taps it — one tap instead of deciding
```

```typescript
// Auto-fill recommended service text from template
function getDefaultService(templateItem: TemplateItem, condition: string): string {
  const services: Record<string, Record<string, string>> = {
    'LF Brake Pad Thickness': {
      yellow: 'Front brake pads approaching minimum — recommend replacement soon',
      red: 'Front brake pads below safe minimum — replace immediately',
    },
    'Drive Belts': {
      yellow: 'Serpentine belt showing wear — recommend replacement at next service',
      red: 'Serpentine belt cracked — replace immediately to prevent breakdown',
    },
    // ... pre-populated for every template item
  };
  return services[templateItem.item]?.[condition] || '';
}

// Auto-fill estimated cost from shop's labor rate + common part prices
// (These can be customized per shop in Settings > Inspection Defaults)
```

---

## 3. Speed Optimizations

### 3.1 Batch Green Mode ("Everything's Fine" Fast Path)

For categories where most items are green (Electrical, Interior), provide a batch action:

```
┌─────────────────────────────────────────────────────────────┐
│  ← Categories       ELECTRICAL & LIGHTING        0 / 8     │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅ MARK ALL GREEN    (tap items below to override) │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ○ Headlights — low beam                                   │
│  ○ Headlights — high beam                                  │
│  ○ Brake lights                                            │
│  ○ Turn signals / hazards                                  │
│  ○ Reverse lights                                          │
│  ○ Interior lights                                         │
│  ○ Dashboard warning lights                                │
│  ○ Horn operation                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Tech taps "MARK ALL GREEN" → all 8 items turn green in one tap. If one item is actually bad (brake light out), tech taps that specific item to change it to ⚠️ or ❌.

**This turns an 8-tap category into 1-2 taps.**

```typescript
// "Mark All Green" button handler
async function markAllGreen(categoryItems: InspectionPoint[]) {
  const updates = categoryItems
    .filter(item => !item.condition) // only unchecked items
    .map(item => ({
      id: item.id,
      condition: 'green',
      urgency: 'good',
    }));

  await api.batchUpdatePoints(inspectionId, updates);
  // Show brief toast: "8 items marked Good ✅"
  // Show "Undo" button for 5 seconds
}
```

### 3.2 Quick-Tap Item List (Collapsed View)

When a category is opened, items can show in a compact list mode for fast assessment:

```
┌─────────────────────────────────────────────────────────────┐
│  ← Categories          FLUIDS                    0 / 6     │
│─────────────────────────────────────────────────────────────│
│  [ ✅ MARK ALL GREEN ]                                      │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  ┌─────────────────────────────────┬────┬────┬────┐        │
│  │ Engine oil level & condition    │ ✅ │ ⚠️ │ ❌ │        │
│  ├─────────────────────────────────┼────┼────┼────┤        │
│  │ Coolant level & condition       │ ✅ │ ⚠️ │ ❌ │        │
│  ├─────────────────────────────────┼────┼────┼────┤        │
│  │ Transmission fluid              │ ✅ │ ⚠️ │ ❌ │        │
│  ├─────────────────────────────────┼────┼────┼────┤        │
│  │ Brake fluid level               │ ✅ │ ⚠️ │ ❌ │        │
│  ├─────────────────────────────────┼────┼────┼────┤        │
│  │ Power steering fluid            │ ✅ │ ⚠️ │ ❌ │        │
│  ├─────────────────────────────────┼────┼────┼────┤        │
│  │ Windshield washer fluid         │ ✅ │ ⚠️ │ ❌ │        │
│  └─────────────────────────────────┴────┴────┴────┘        │
│                                                             │
│  Each row: 56px tall minimum                                │
│  Tap buttons: 48x48px minimum                               │
│  Tapping ⚠️ or ❌ expands that row for details/photos      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**This is the fastest possible inspection view.** A tech can fly through a 6-item fluids check in 6 taps (one per row) in under 10 seconds. Items that need attention expand inline for notes and photos.

### 3.3 Auto-Save (No Save Button for Green Items)

```typescript
// Every condition tap auto-saves immediately
async function handleConditionTap(pointId: string, condition: 'green' | 'yellow' | 'red') {
  // Optimistic update — show it immediately
  updateLocalState(pointId, condition);

  // Save in background
  try {
    await api.updateInspectionPoint(inspectionId, pointId, { condition });
  } catch (error) {
    // Revert on failure, show toast
    revertLocalState(pointId);
    showToast('Save failed — check connection', 'error');
  }
}

// Yellow/Red items: "Save" button only saves the EXTRA fields (notes, photos, cost)
// The condition itself is already saved the moment they tap
```

### 3.4 Offline Resilience

Shop WiFi can be spotty. Queue saves and sync when reconnected:

```typescript
// Simple offline queue using localStorage
const saveQueue: PendingUpdate[] = [];

async function saveWithRetry(update: PendingUpdate) {
  try {
    await api.save(update);
  } catch {
    saveQueue.push(update);
    localStorage.setItem('pcb_inspection_queue', JSON.stringify(saveQueue));
    showToast('Saved locally — will sync when online', 'info');
  }
}

// On reconnect
window.addEventListener('online', async () => {
  const queue = JSON.parse(localStorage.getItem('pcb_inspection_queue') || '[]');
  for (const update of queue) {
    await api.save(update);
  }
  localStorage.removeItem('pcb_inspection_queue');
  showToast('All changes synced ✅', 'success');
});
```

---

## 4. Photo Handling

### 4.1 Take Photo Flow

```
Tech taps 📷 TAKE PHOTO
    ↓
iPad/Android camera opens (rear camera)
    ↓
Tech takes photo
    ↓
Photo returns to PCB Auto
    ↓
Client-side compression (12MP → ~500KB JPEG)
    ↓
Thumbnail generated (200px wide)
    ↓
Photo displayed immediately in the item card (from local blob URL)
    ↓
Upload happens in background to server
    ↓
Upload complete → replace blob URL with server URL
```

```typescript
// Photo capture handler
async function handlePhotoCapture(event: Event, pointId: string) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  // 1. Show immediately (local preview)
  const localUrl = URL.createObjectURL(file);
  addPhotoToUI(pointId, localUrl, 'uploading');

  // 2. Compress
  const { blob } = await compressPhoto(file, 1200, 0.7);

  // 3. Upload in background
  const formData = new FormData();
  formData.append('photo', blob, `inspection-${pointId}-${Date.now()}.jpg`);

  try {
    const response = await api.uploadPhoto(inspectionId, pointId, formData);
    updatePhotoUrl(pointId, localUrl, response.url);
    updatePhotoStatus(pointId, 'uploaded');
  } catch {
    updatePhotoStatus(pointId, 'failed');
    showToast('Photo saved locally — will upload when online', 'warning');
  }

  // 4. Reset input so same button can be used again
  input.value = '';
}
```

### 4.2 Photo Display in Item Card

```
Photos taken (3):
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐
│          │  │          │  │          │  │                │
│  thumb   │  │  thumb   │  │  thumb   │  │  + ADD MORE    │
│          │  │          │  │          │  │    📷          │
│   [✕]    │  │   [✕]    │  │   [✕]    │  │  (72px tall)   │
└──────────┘  └──────────┘  └──────────┘  └────────────────┘

Thumbnail size: 80x80px (square crop, object-fit: cover)
Delete button: 24x24px "✕" in top-right corner of each thumbnail
"+ ADD MORE" card: same 80px height, dashed border, tap to open camera
```

Tapping a thumbnail opens it full-screen for review (pinch to zoom, swipe to next photo).

### 4.3 Photo Annotation (Phase 3 — but plan the UI now)

After taking a photo, tech can draw on it. Keep it simple — three tools:

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back                    ANNOTATE PHOTO                   │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │                                                     │   │
│  │              [ PHOTO FULL SCREEN ]                  │   │
│  │                                                     │   │
│  │          ← tech draws red circles/arrows here       │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ ⭕ Circle│  │ ➡️ Arrow │  │ Aa Text  │  │ ↩️ Undo  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
│  Color: 🔴 red (default — most visible on car photos)      │
│                                                             │
│  [ CANCEL ]                           [ SAVE ANNOTATION ]  │
└─────────────────────────────────────────────────────────────┘
```

Implementation: HTML5 Canvas overlay on top of the photo image. Touch events draw paths. Save as a separate annotated image (keep original too).

---

## 5. Complete Inspection → Send Report

### 5.1 Completion Screen

When all items are checked (or tech taps "Complete Inspection"):

```
┌─────────────────────────────────────────────────────────────┐
│              ✅ INSPECTION COMPLETE                          │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  Robert Smith · 2019 Ford F-150 · 42,350 mi               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ██████████████████████████████████████▓▓▓▓░░░░░     │   │
│  │ ✅ 56 Good        ⚠️ 10 Watch       ❌ 6 Needs Now │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  FINDINGS THAT NEED ATTENTION:                              │
│                                                             │
│  ❌ Serpentine belt — cracked          ~$185    📷 2       │
│  ❌ LF brake pad — 2mm                ~$289    📷 3       │
│  ❌ RF brake pad — 2mm                (incl)   📷 1       │
│  ❌ Air filter — clogged              ~$45     📷 2       │
│  ❌ LF tire tread — 2/32              ~$189    📷 1       │
│  ❌ Check engine P0301                ~$125    📷 1       │
│  ⚠️ Coolant level — low               ~$129    📷 1       │
│  ⚠️ LR brake pad — 3.5mm              ~$249    📷 1       │
│  ⚠️ Wiper blades — streaking          ~$35     📷 0       │
│  ⚠️ Cabin air filter — dirty          ~$55     📷 1       │
│  ... (6 more yellow items)                                  │
│                                                             │
│  Total recommended:                    ~$1,634              │
│                                                             │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  SEND TO CUSTOMER                                           │
│                                                             │
│  ┌──────────────────────────┐                              │
│  │                          │                              │
│  │  📱 TEXT REPORT          │  Opens Messages app with     │
│  │     (317) 555-0101       │  pre-filled link             │
│  │                          │                              │
│  └──────────────────────────┘                              │
│                                                             │
│  ┌──────────────────────────┐                              │
│  │                          │                              │
│  │  ✉️ EMAIL REPORT         │  Opens Mail app with         │
│  │     rsmith@email.com     │  pre-filled link + summary   │
│  │                          │                              │
│  └──────────────────────────┘                              │
│                                                             │
│  ┌──────────────────────────┐                              │
│  │                          │                              │
│  │  🔗 COPY LINK           │  Copies URL to clipboard     │
│  │                          │                              │
│  └──────────────────────────┘                              │
│                                                             │
│  ┌──────────────────────────┐                              │
│  │                          │                              │
│  │  🖨️ PRINT REPORT        │  Opens browser print dialog  │
│  │                          │  (print-optimized layout)    │
│  │                          │                              │
│  └──────────────────────────┘                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Send via Text (SMS)

Uses the Communication Spec's native `sms:` link approach:

```typescript
function sendInspectionText(customer: Customer, inspectionUrl: string, shopName: string) {
  const message = `Hi ${customer.firstName}, your vehicle inspection is ready. ` +
    `We found items that need attention. View your full report with photos here: ` +
    `${inspectionUrl} — ${shopName}`;

  // iOS and Android handle sms: links differently
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const separator = isIOS ? '&' : '?';
  const smsUrl = `sms:${customer.phone}${separator}body=${encodeURIComponent(message)}`;

  window.location.href = smsUrl;
  // Opens native Messages app with the message pre-filled
  // Advisor just taps Send
}
```

### 5.3 Send via Email

```typescript
function sendInspectionEmail(customer: Customer, inspection: Inspection, shopName: string) {
  const subject = `Vehicle Inspection Report — ${inspection.vehicle.year} ${inspection.vehicle.make} ${inspection.vehicle.model}`;

  const body = `Hi ${customer.firstName},\n\n` +
    `Your vehicle inspection for your ${inspection.vehicle.year} ${inspection.vehicle.make} ` +
    `${inspection.vehicle.model} (${inspection.mileage?.toLocaleString()} miles) is ready.\n\n` +
    `Results: ${inspection.red_count} items need immediate attention, ` +
    `${inspection.yellow_count} items to watch.\n\n` +
    `View your full report with photos:\n${inspection.shareUrl}\n\n` +
    `You can approve recommended services directly from the report.\n\n` +
    `Questions? Call us at ${shop.phone}.\n\n` +
    `${shopName}`;

  const mailtoUrl = `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;
  // Opens native Mail app (or default email client) with everything pre-filled
}
```

### 5.4 Print Report

The customer-facing report page (public URL) has a print-optimized stylesheet:

```css
@media print {
  /* Hide navigation, buttons, interactive elements */
  nav, .btn-approve, .btn-signature, footer { display: none; }

  /* Force white background, black text */
  body { background: white; color: black; }

  /* Show all sections expanded (no collapsed accordions) */
  .category-section { display: block !important; }

  /* Photos print at reasonable size */
  .inspection-photo { max-width: 200px; max-height: 150px; }

  /* Green/Yellow/Red badges print as text + border */
  .badge-green  { border: 2px solid #4CAF50; padding: 2px 8px; }
  .badge-yellow { border: 2px solid #FF9800; padding: 2px 8px; }
  .badge-red    { border: 2px solid #F44336; padding: 2px 8px; }

  /* Page breaks between categories */
  .category-section { page-break-inside: avoid; }

  /* Shop header on first page */
  .shop-header { position: static; }
}
```

The advisor can print from:
1. **The public report page** — open it in a browser, Ctrl+P / ⌘P
2. **The completion screen** — "🖨️ Print Report" opens the public URL in a new tab with `window.print()` auto-triggered
3. **The RO detail page** — "Print Inspection" button

### 5.5 PDF Generation (Phase 3)

For email attachment and archival. Generated server-side:

```
GET /api/pcbauto/v1/inspections/public/:token/pdf
```

Uses the same layout as the print stylesheet but rendered to PDF (Puppeteer or a lightweight HTML-to-PDF library). Returns a downloadable PDF with:
- Shop logo and branding
- Customer and vehicle info
- All findings with photos (inline, compressed)
- Summary of recommended services with costs
- Signature block (if captured)
- Footer: shop contact info, "Powered by PCB Auto"

---

## 6. Layout & Sizing Reference

### Touch Targets (critical for greasy fingers)

| Element | Minimum Size | Recommended |
|---------|-------------|-------------|
| Condition buttons (Good/Watch/Bad) | 72 × 48px | 72 × 72px |
| Quick-tap grid buttons | 48 × 48px | 56 × 56px |
| Take Photo button | 48 × 48px | 56 × 56px |
| Category card (tap to open) | full width × 72px | full width × 80px |
| Navigation buttons | 44 × 44px | 48 × 48px |
| Text input fields | full width × 48px | full width × 52px |
| Photo thumbnail | 80 × 80px | 96 × 96px |

### Typography

| Element | Size | Weight |
|---------|------|--------|
| Category header | 18px | 700 (bold) |
| Item name | 16px | 600 (semibold) |
| Item description | 14px | 400 (normal) |
| Measurement input | 20px | 700 (bold) — big so tech can see from arm's length |
| Condition button label | 18px | 700 (bold) |
| Progress counts | 14px | 600 |
| Notes text area | 16px | 400 |

### Spacing

| Element | Value |
|---------|-------|
| Card padding | 16px |
| Gap between cards | 12px |
| Gap between condition buttons | 12px |
| Section padding | 16px |
| Screen edge padding | 16px (phone), 24px (tablet), 32px (desktop) |

### Landscape vs Portrait (Tablet)

Most techs hold the tablet in **landscape** when at the desk/counter, **portrait** when walking around the car.

- **Portrait:** Single column, items stack vertically. This is the default.
- **Landscape:** Two-column possible. Checklist on left, photo viewer on right. But don't force it — let the layout be single-column with wider cards.

```css
/* Simple responsive behavior */
@media (min-width: 768px) and (orientation: landscape) {
  .inspection-layout {
    display: grid;
    grid-template-columns: 1fr 360px; /* checklist | photo panel */
    gap: 16px;
  }
}

@media (orientation: portrait), (max-width: 767px) {
  .inspection-layout {
    display: flex;
    flex-direction: column;
  }
}
```

---

## 7. Component Checklist for Replit

Build these React components:

```
src/components/inspections/
├── InspectionPage.tsx            — main page, category list
├── CategoryCard.tsx              — single category summary card
├── CategoryDetail.tsx            — expanded view with all items
├── InspectionItem.tsx            — single item with condition buttons
├── InspectionItemCompact.tsx     — quick-tap row view (table mode)
├── ConditionButtons.tsx          — the three ✅⚠️❌ buttons (REUSABLE)
├── ItemDetailExpanded.tsx        — notes, photos, cost, urgency (yellow/red)
├── PhotoCapture.tsx              — camera button + gallery + upload
├── PhotoThumbnail.tsx            — single thumbnail with delete
├── PhotoViewer.tsx               — full-screen photo view (pinch zoom)
├── MeasurementInput.tsx          — numeric input with unit label + auto-suggest
├── UrgencySelector.tsx           — Monitor / Soon / Immediate buttons
├── ProgressBar.tsx               — colored segments (green/yellow/red/gray)
├── CompletionScreen.tsx          — summary + send actions
├── BatchGreenButton.tsx          — "Mark All Green" with undo
├── InspectionHeader.tsx          — customer/vehicle/progress (collapsible)
├── InspectionList.tsx            — list of all inspections (filter/search)
├── InspectionReport.tsx          — public customer-facing report page
├── CustomerApproval.tsx          — approve buttons on report page
├── SignatureCapture.tsx          — canvas touch signature
└── PrintStyles.css               — @media print stylesheet
```

### State Management

```typescript
// Simple approach: React context + useReducer
// No Redux needed — inspections are self-contained

interface InspectionState {
  inspection: Inspection;
  points: Map<string, InspectionPoint>;  // keyed by point ID
  photos: Map<string, Photo[]>;          // keyed by point ID
  saveQueue: PendingUpdate[];            // offline queue
  activeCategory: string | null;
  activePoint: string | null;
}

type InspectionAction =
  | { type: 'SET_CONDITION'; pointId: string; condition: 'green' | 'yellow' | 'red' }
  | { type: 'SET_MEASUREMENT'; pointId: string; value: number }
  | { type: 'ADD_PHOTO'; pointId: string; photo: Photo }
  | { type: 'REMOVE_PHOTO'; pointId: string; photoId: string }
  | { type: 'SET_NOTES'; pointId: string; notes: string }
  | { type: 'SET_COST'; pointId: string; cost: number }
  | { type: 'SET_URGENCY'; pointId: string; urgency: string }
  | { type: 'BATCH_GREEN'; pointIds: string[] }
  | { type: 'OPEN_CATEGORY'; categoryName: string }
  | { type: 'SAVE_SUCCESS'; pointId: string }
  | { type: 'SAVE_FAILURE'; pointId: string; error: string };
```

---

## 8. Performance Budget

| Metric | Target | Why |
|--------|--------|-----|
| First paint | < 1.5s | Tech taps "Start Inspection" and should see the checklist immediately |
| Condition tap → visual feedback | < 100ms | Must feel instant |
| Photo capture → thumbnail visible | < 500ms | Compress + display local blob |
| Photo upload (background) | < 3s on shop WiFi | Don't block the tech |
| Category open → items visible | < 200ms | Already loaded, just show |
| Full inspection data load | < 2s | 72 items + metadata, single API call |
| Offline save → localStorage | < 50ms | Instant |

### Data Loading Strategy

```typescript
// Load EVERYTHING in one API call when inspection opens
// Don't lazy-load categories — it's only 72 items
GET /api/pcbauto/v1/inspections/:id?include=points,photos,template

// Response: ~15KB JSON (without photo URLs it's tiny)
// This means category switching is INSTANT — no API calls, just filter local state
```

---

## 9. Accessibility & Shop Environment

```css
/* High contrast for bright shop environments (fluorescent lighting, sunlight) */
:root {
  --text-primary: #1a1a1a;      /* near-black, not gray */
  --text-secondary: #555555;    /* dark gray, readable in sun */
  --bg-primary: #ffffff;        /* pure white background */
  --bg-card: #f8f9fa;           /* very light gray cards */
  --border: #dee2e6;            /* visible borders */
}

/* Prevent accidental zooming (techs will double-tap by accident) */
* {
  touch-action: manipulation;
}

/* Prevent text selection on buttons (greasy drag = accidental select) */
button, .tap-target {
  user-select: none;
  -webkit-user-select: none;
}

/* Large, clear form inputs */
input, textarea, select {
  font-size: 16px;              /* prevents iOS zoom on focus */
  min-height: 48px;
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 8px;
}

/* Visible focus states (for keyboard/accessibility) */
input:focus, button:focus {
  outline: 3px solid #2196F3;
  outline-offset: 2px;
}

/* Screen stays awake during inspection */
// Request wake lock so the tablet doesn't sleep mid-inspection
if ('wakeLock' in navigator) {
  let wakeLock = await navigator.wakeLock.request('screen');
  // Release when inspection is completed or user navigates away
}
```

---

## Summary: How Fast Is a Full Inspection?

**72-point Full Inspection — Target: 12-15 minutes**

| Step | Time | How |
|------|------|-----|
| Open inspection | 2 sec | One tap from RO detail |
| Electrical (8 items) | 15 sec | "Mark All Green" — 1 tap |
| Interior (9 items) | 20 sec | "Mark All Green" + override 1-2 |
| Fluids (6 items) | 30 sec | Quick-tap through, all green |
| Brakes (7 items) | 3 min | Measurements + 4 photos if worn |
| Tires (8 items) | 2 min | Measurements + photos if worn |
| Steering/Suspension (6 items) | 1 min | Visual check, photos if issues |
| Engine components (7 items) | 2 min | Belt/filter photos |
| Exhaust (5 items) | 30 sec | Quick visual under car |
| Under Vehicle (8 items) | 2 min | Already on the lift |
| Maintenance Advisory (8 items) | 1 min | Quick-tap based on mileage |
| Review + Complete | 30 sec | Scan summary, tap Complete |
| Send to customer | 15 sec | Tap "Text Report," hit Send |
| **Total** | **~13 min** | **vs 20+ min on paper** |

The "Mark All Green" batch action alone saves 3-5 minutes on a typical inspection where 50+ items are green.
