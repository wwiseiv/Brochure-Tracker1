# PCB Auto — Responsive Design Spec (Mobile / Tablet / Desktop)

## Philosophy

**Everything works everywhere. Some things work better on bigger screens.**

If a feature is cramped or compromised on mobile, we don't hide it or break it — we show a subtle banner:
> 📱 "This works best on a tablet or desktop. [Dismiss]"

The user can dismiss it and keep working. Never block functionality. Never force a device switch. But be honest about what's optimal.

---

## Global Responsive Framework

### Breakpoints (Tailwind)

```
Phone:    < 640px   (sm)
Tablet:   640–1024px (md)  
Desktop:  > 1024px  (lg)
```

### Global Layout Rules

**Desktop (>1024px):**
- Top navigation bar with all menu items visible
- Sidebar panels (calendar, tech status, filters) alongside main content
- Multi-column layouts, side-by-side panels, full data tables
- Slide-over panels for details (appointment detail, RO detail, customer card)

**Tablet (640–1024px):**
- Top navigation bar (may compress labels to icons + text)
- Sidebars collapse into toggleable drawers
- Tables remain but may horizontally scroll
- Slide-over panels become full-width drawers from right
- Touch targets minimum 44px

**Phone (<640px):**
- Bottom tab bar replaces top navigation
- All layouts become single-column stacked
- Tables become card lists
- Slide-over panels become full-screen overlays
- Touch targets minimum 48px
- Floating action button (FAB) for primary actions

---

## Navigation

### Desktop — Top Navigation Bar (current)
```
┌──────────────────────────────────────────────────────────────────────┐
│ 🔧 PCB Auto  Demo Auto Shop                                        │
│ Dashboard  Customers  Repair Orders  Inspections  Schedule  Reports │
│ Settings                                         🔔  [JS] John ▾   │
└──────────────────────────────────────────────────────────────────────┘
```
All items visible. Active tab highlighted (like Schedule currently is).

### Tablet — Compressed Top Navigation
```
┌──────────────────────────────────────────────────────────────────────┐
│ 🔧 PCB Auto                                                        │
│ 🏠 Dashboard  👥 Customers  📋 ROs  📅 Schedule  📊 Reports  ⚙️   │
│                                                     🔔  [JS] ▾     │
└──────────────────────────────────────────────────────────────────────┘
```
Shorter labels. Inspections moves into a "More" menu or stays as icon-only if space allows. Settings accessible via user avatar dropdown.

### Phone — Bottom Tab Bar
```
┌──────────────────────────────────┐
│ 🔧 PCB Auto          🔔  ☰     │  ← Slim top bar (logo + notifications + hamburger)
│──────────────────────────────────│
│                                  │
│        [ MAIN CONTENT ]          │
│                                  │
│──────────────────────────────────│
│  🏠      📋      📅      👥    ⋯ │  ← Bottom tab bar
│ Home    ROs   Schedule  Cust  More│
└──────────────────────────────────┘
```

**"More" menu** (slides up as a bottom sheet):
- Inspections
- Reports
- Settings
- Help
- Feature Requests

**Why bottom tabs on phone:** Thumb-reachable. Top navigation requires reaching to the top of a 6.5" screen — bad UX for one-handed use in a shop environment (greasy hands, holding a part, etc.).

---

## Screen-by-Screen Responsive Behavior

### 1. Dashboard

| Element | Desktop | Tablet | Phone |
|---------|---------|--------|-------|
| Layout | 3-column grid (stats, today's schedule, recent activity) | 2-column grid | Single column, stacked cards |
| Stat cards | Row of 4–6 cards | Row of 3, wraps to 2 rows | Horizontal scroll strip or 2×2 grid |
| Today's appointments | Full list with bay/tech details | Full list | Compact list (time + customer + service only) |
| Revenue chart | Full-width chart | Full-width chart | Simplified spark line |
| Quick actions | Button row | Button row | FAB with radial menu or stacked buttons |

**Phone "desktop nudge":** None needed — dashboard works well stacked.

### 2. Schedule (Calendar) — THE BIG ONE

**Desktop:**
```
┌──────────────────┬──────────────────────────────────────────┐
│ Mini Calendar     │ List View (default) or Bay Grid (expand) │
│ Tech Sidebar      │                                          │
└──────────────────┴──────────────────────────────────────────┘
```
Full two-panel layout as spec'd in the scheduling redesign doc.

**Tablet:**
```
┌──────────────────────────────────────────────────────────────┐
│ [◀] Feb 8, 2026 [▶]  [Today]  [List | Grid]  [+ Appt]     │
│──────────────────────────────────────────────────────────────│
│ Date picker bar (tap to expand mini calendar as dropdown)    │
│──────────────────────────────────────────────────────────────│
│                                                              │
│ Appointment list (same card format as desktop)               │
│                                                              │
│ Grid view available but horizontally scrollable if >3 bays  │
└──────────────────────────────────────────────────────────────┘
```
- Mini calendar becomes a **date picker bar** at top (shows week strip, tap date to change)
- Tap the date text to expand full month calendar as dropdown overlay
- Tech sidebar becomes a collapsible drawer (swipe from left or tap icon)
- Bay grid view works but scrolls horizontally if more than 2–3 bays

**Phone:**
```
┌──────────────────────────────────┐
│ ◀  Sun, Feb 8  ▶    [+ Appt]   │
│ S  M  T  W  T  F  S            │  ← Horizontal week strip
│         [8]                      │
│──────────────────────────────────│
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 8:00 AM · Bay 1              │ │
│ │ Robert Smith · F-150         │ │
│ │ Brake pads + rotors          │ │
│ │ Mike T. · ● In Progress      │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 8:30 AM · Bay 2              │ │
│ │ Maria Johnson · Camry        │ │
│ │ Oil change + tire rotation   │ │
│ │ Sarah K. · ● In Progress     │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 10:30 AM · Bay 2             │ │
│ │ Lisa Chen · BMW X3           │ │
│ │ 30K mile service             │ │
│ │ Sarah K. · ○ Scheduled       │ │
│ └──────────────────────────────┘ │
│                                  │
│          ... scroll ...          │
│                                  │
│──────────────────────────────────│
│  🏠      📋      📅      👥   ⋯ │
└──────────────────────────────────┘
```
- **No bay grid on phone** — list only. Grid requires too much horizontal space.
- Week strip at top for quick day-switching (swipe left/right)
- Tap date header to open full month calendar as a bottom sheet
- Appointment cards are tappable → opens full detail as full-screen overlay
- FAB [+] for new appointment (bottom-right, above tab bar)

**Phone "desktop nudge":** Show once on first visit:
> 📱 "The bay grid view is available on tablets and desktops for a better scheduling experience. [Got it]"

### 3. Repair Orders

**Desktop:**
- Full table: RO#, Customer, Vehicle, Service, Bay, Tech, Status, Total, Date
- Click row → slide-over panel with full RO detail
- Filters bar across top (status, date range, tech, bay)

**Tablet:**
- Same table but fewer columns visible (hide Bay, Tech — show on tap)
- Same slide-over panel behavior

**Phone:**
```
┌──────────────────────────────────┐
│ Repair Orders        [+ New RO] │
│ [All] [Active] [Completed]      │
│──────────────────────────────────│
│                                  │
│ ┌──────────────────────────────┐ │
│ │ RO #1001        ● In Progress│ │
│ │ Robert Smith · 2019 F-150    │ │
│ │ Brake pads + rotors          │ │
│ │ Bay 1 · Mike T.    $611.47  │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ RO #1000        ✅ Completed │ │
│ │ James Williams · Silverado   │ │
│ │ Water pump + thermostat      │ │
│ │ Paid: $892.15               │ │
│ └──────────────────────────────┘ │
│                                  │
│          ... scroll ...          │
└──────────────────────────────────┘
```
- Table becomes **card list** (no horizontal scroll tables on phone)
- Tap card → full-screen RO detail
- Status filter tabs at top (horizontally scrollable pill buttons)
- Search bar above the list

**RO Detail on Phone:**
Full-screen overlay with sections: Customer info, Vehicle, Line items (labor + parts), Totals, Approval status, Payment, Notes/Photos. Each section is a collapsible accordion.

**Phone "desktop nudge":** None needed — cards work well.

### 4. RO Builder / Estimate Builder

This is the most complex screen — building a repair order with multiple labor lines, parts, customer info, etc.

**Desktop:**
Multi-column: Customer/vehicle on left, line items center, totals right.

**Tablet:**
Single column but full-width inputs. Line item entry works with tap.

**Phone:**
```
┌──────────────────────────────────┐
│ ← New Repair Order              │
│──────────────────────────────────│
│                                  │
│ CUSTOMER                         │
│ [🔍 Search or add new_________] │
│ Robert Smith · (317) 555-0101   │
│                                  │
│ VEHICLE                          │
│ [2019 Ford F-150 XLT         ▾] │
│                                  │
│ ─────────────────────────────── │
│ SERVICES                         │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Front brake pad replacement  │ │
│ │ Labor: 1.5 hrs × $135 = $203│ │
│ │ [Edit] [Remove]              │ │
│ └──────────────────────────────┘ │
│                                  │
│ [+ Add Labor Line]              │
│ [+ Add Parts]                    │
│                                  │
│ ─────────────────────────────── │
│ Subtotal:    $571.47            │
│ Tax (7%):     $40.00            │
│ TOTAL:       $611.47            │
│                                  │
│ [SAVE DRAFT]  [SEND FOR APPROVAL]│
└──────────────────────────────────┘
```
- Single-column stacked layout
- Each line item is an expandable card (tap to edit inline)
- "Add Labor Line" opens a bottom sheet modal with the input fields
- Parts search is a bottom sheet with search bar + results list
- Works, but building a complex 10-line RO on a phone is tedious

**Phone "desktop nudge":**
> 📱 "Building detailed estimates is easier on a tablet or desktop. [Got it]"

### 5. Customers

**Desktop:** Table with search, click row for customer detail side panel.

**Tablet:** Same table, slightly fewer columns.

**Phone:**
```
┌──────────────────────────────────┐
│ Customers            [+ Add]    │
│ [🔍 Search customers________]   │
│──────────────────────────────────│
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Robert Smith                 │ │
│ │ (317) 555-0101               │ │
│ │ 2019 Ford F-150 · 2 visits   │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Maria Johnson                │ │
│ │ (317) 555-0202               │ │
│ │ 2021 Toyota Camry · 3 visits │ │
│ └──────────────────────────────┘ │
│          ... scroll ...          │
└──────────────────────────────────┘
```
- Card list with search bar always visible at top
- Tap card → full-screen customer detail (contact, vehicles, RO history, balance)
- Tap phone number → initiates call directly (huge for mobile use in the field)
- Tap email → opens compose

**Phone "desktop nudge":** None needed — works great on phone.

### 6. Inspections (DVI)

**Desktop:** Grid of inspection templates, click to start. Photo grid view.

**Tablet:** Same — this is actually the IDEAL device for inspections (take photos in the bay).

**Phone:**
- Same card-based list of inspections
- Camera button triggers rear camera directly for photos
- Photo capture uses `capture="environment"` for rear camera
- Inspection checklist is a scrollable form with big tap targets (Pass ✅ / Fail ❌ / N/A ➖)

**Phone "desktop nudge":** None — phone/tablet are actually BETTER for inspections (camera access in the bay).

### 7. Reports

**Desktop:** Full charts + data tables side by side. Date range pickers, filters.

**Tablet:** Charts full-width, tables below. Same interactivity.

**Phone:**
```
┌──────────────────────────────────┐
│ Reports                          │
│ [This Week ▾]                    │
│──────────────────────────────────│
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 💰 Revenue                   │ │
│ │ $4,832.44 this week          │ │
│ │ ▲ 12% vs last week           │ │
│ │ [See details →]              │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 🔧 Repair Orders             │ │
│ │ 18 completed · 4 open        │ │
│ │ Avg ticket: $268.47          │ │
│ │ [See details →]              │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 👨‍🔧 Tech Efficiency          │ │
│ │ Mike: 115% · Sarah: 104%    │ │
│ │ Dave: 92%                    │ │
│ │ [See details →]              │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 🏗️ Bay Utilization           │ │
│ │ Bay 1: 88% · Bay 2: 75%     │ │
│ │ Bay 3: 62%                   │ │
│ │ [See details →]              │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```
- Summary cards with key metrics
- Tap "See details" → full-screen chart + breakdown
- No full data tables on phone — just the headline numbers
- Detailed tables accessible if user scrolls down (horizontal scroll enabled)

**Phone "desktop nudge":**
> 📱 "Detailed reports with charts and tables are best viewed on a desktop. [Got it]"

### 8. Settings

**Desktop:** Left sidebar categories, right panel for form fields.

**Tablet:** Same layout, slightly narrower.

**Phone:**
- Category list (tap to drill into each section)
- Each settings section is a full-screen form
- Standard mobile settings pattern (like iOS Settings app)

**Settings sections on phone:**
```
Shop Information    →
Branding & Logo     →
Bays & Capacity     →
Staff & Roles       →
Payment Settings    →
Tax Configuration   →
Notification Prefs  →
Feature Requests    →
```

Tap any row → slides to that settings form → back arrow to return.

**Phone "desktop nudge":** None — settings work fine on phone.

### 9. Time Clock (PIN Pad)

**All devices:** This is designed for tablet-as-kiosk but must work everywhere.

**Desktop:** PIN pad in a centered card (not full-screen). Status list on the right.

**Tablet (kiosk mode):** Full-screen PIN pad with large buttons (as spec'd in v1.3). Auto-lock after 30 seconds.

**Phone:** Full-screen PIN pad. Large touch targets. Simple and fast.

**Phone "desktop nudge":** None — PIN pad is simple and works great everywhere.

### 10. Payroll

**Desktop:** Full payroll summary table with per-employee breakdown, tax preview, approval flow.

**Tablet:** Same — works well on tablet.

**Phone:**
```
┌──────────────────────────────────┐
│ ← Payroll: Feb 3–16             │
│──────────────────────────────────│
│                                  │
│ 4 employees · Check date: Feb 20│
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Mike Thompson                │ │
│ │ Flat Rate · 94.5 flagged hrs │ │
│ │ Gross: $2,835  Net: $2,063  │ │
│ │ [See breakdown →]           │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Sarah Kim                    │ │
│ │ Hourly · 78.0 hrs            │ │
│ │ Gross: $2,106  Net: $1,430  │ │
│ │ [See breakdown →]           │ │
│ └──────────────────────────────┘ │
│                                  │
│       ... more employees ...     │
│                                  │
│ ─────────────────────────────── │
│ Total Net Pay:     $7,083.71    │
│ Total Employer:   $11,263.00    │
│                                  │
│ [APPROVE & RUN PAYROLL]          │
└──────────────────────────────────┘
```
- Per-employee cards instead of table rows
- Tap card → full tax breakdown on a detail screen
- Approve button at bottom (requires scroll to see all employees first — intentional, forces review)

**Phone "desktop nudge":**
> 📱 "Review the full payroll breakdown on a desktop before approving. [Got it]"

(Still lets them approve on phone — just a gentle nudge.)

---

## The "Desktop Nudge" Banner Component

### Implementation

```tsx
// components/DesktopNudge.tsx

interface DesktopNudgeProps {
  message: string;            // e.g., "Building estimates is easier on a tablet or desktop."
  dismissKey: string;         // localStorage key so it only shows once per feature
}

export function DesktopNudge({ message, dismissKey }: DesktopNudgeProps) {
  const [dismissed, setDismissed] = useState(false);
  const isMobile = useMediaQuery('(max-width: 639px)');

  // Only show on phone, only show once per feature
  useEffect(() => {
    const wasDismissed = localStorage.getItem(`nudge_${dismissKey}`);
    if (wasDismissed) setDismissed(true);
  }, [dismissKey]);

  if (!isMobile || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(`nudge_${dismissKey}`, 'true');
    setDismissed(true);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mx-4 mb-3
                    flex items-center justify-between text-sm text-blue-800">
      <div className="flex items-center gap-2">
        <span>📱</span>
        <span>{message}</span>
      </div>
      <button
        onClick={handleDismiss}
        className="text-blue-600 font-medium ml-3 whitespace-nowrap"
      >
        Got it
      </button>
    </div>
  );
}
```

### Where It Shows

| Screen | Shows Nudge? | Message |
|--------|-------------|---------|
| Dashboard | ❌ | Works great on phone |
| Schedule (list) | ❌ | List view works fine |
| Schedule (grid attempt) | ✅ | "The bay grid view is available on tablets and desktops." |
| Repair Orders (list) | ❌ | Card list works great |
| RO Builder | ✅ | "Building detailed estimates is easier on a tablet or desktop." |
| Customers | ❌ | Works great — tap-to-call is a phone strength |
| Inspections | ❌ | Phone camera is ideal |
| Reports (summary) | ❌ | Summary cards work fine |
| Reports (drill-down) | ✅ | "Detailed reports with charts are best viewed on a desktop." |
| Settings | ❌ | Standard mobile settings pattern |
| Time Clock | ❌ | PIN pad designed for any screen |
| Payroll (review) | ✅ | "Review the full payroll breakdown on a desktop before approving." |
| Payroll (setup wizard) | ✅ | "Payroll setup involves sensitive info — a desktop may be more comfortable." |

**Rules:**
- Nudge shows ONCE per feature per device (uses localStorage)
- Dismissing is permanent (user tapped "Got it")
- Never blocks content — it's a slim banner above the content area
- Never prevents the action — user can always proceed
- Blue/informational tone, never red/warning

---

## Touch Target Sizes

Per Apple HIG and Material Design guidelines:

| Element | Minimum Size | Used On |
|---------|-------------|---------|
| Buttons | 44×44px (tablet), 48×48px (phone) | All interactive buttons |
| Table/list rows | 48px height minimum | All tappable rows |
| Form inputs | 44px height | All text fields, dropdowns |
| Tab bar icons | 48×48px tap area | Bottom navigation |
| Close/dismiss buttons | 44×44px | Modals, panels, banners |
| PIN pad buttons | 64×64px minimum | Time clock screen |

```css
/* Tailwind utility for mobile touch targets */
.touch-target {
  @apply min-h-[44px] min-w-[44px] md:min-h-[40px] md:min-w-[40px];
}
.touch-target-lg {
  @apply min-h-[48px] min-w-[48px];
}
```

---

## PWA Configuration Reminder

From v1.3 — ensure this is implemented so the app works as a home-screen app:

```json
{
  "name": "PCB Auto - Shop Management",
  "short_name": "PCB Auto",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0F172A",
  "theme_color": "#1B3A6B",
  "orientation": "any",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

When added to home screen on iOS/Android:
- No browser chrome (address bar, tabs)
- Launches full-screen in the app's theme color
- Bottom tab bar is always visible (our code, not the browser's)
- Feels native

---

## Testing Checklist

Before any feature ships, verify on all three breakpoints:

```
□ Phone (375px — iPhone SE / small Android)
□ Phone (430px — iPhone 15 Pro Max / large Android)
□ Tablet (768px — iPad Mini / portrait)
□ Tablet (1024px — iPad Pro / landscape)
□ Desktop (1280px — standard laptop)
□ Desktop (1920px — full HD monitor)
```

For each screen, verify:
```
□ No horizontal scroll (except intentional data tables)
□ All text readable without zooming
□ All buttons/links tappable without mis-taps
□ Forms usable (keyboard doesn't cover inputs)
□ Modals/overlays closeable
□ Navigation accessible
□ Data loads and displays correctly
□ Desktop nudge shows only on phone, only once
□ No layout shifts or overlapping elements
```

---

## Summary

| Principle | Implementation |
|-----------|---------------|
| Everything works everywhere | No feature is hidden or disabled on any device |
| Desktop is the power tool | Full layouts, side panels, data tables, multi-column |
| Tablet is the shop floor | Touch-optimized, camera access, kiosk time clock |
| Phone is the field tool | Card lists, summary views, tap-to-call, quick actions |
| Be honest, not blocking | Desktop nudge = soft suggestion, never a wall |
| Once is enough | Nudge dismissed permanently per feature |
