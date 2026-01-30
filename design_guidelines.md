# BrochureDrop - Design Guidelines

## Design Approach

**Selected System:** Material Design 3 principles adapted for mobile-first field productivity
**Justification:** Utility-focused app requiring efficiency, clear information hierarchy, and thumb-friendly mobile interactions for field sales representatives working outdoors

**Key Design Principles:**
1. **Mobile-first thumb zones** - Critical actions within easy one-handed reach
2. **High-contrast clarity** - Readable in bright outdoor sunlight
3. **Instant feedback** - Clear status indicators and action confirmations
4. **Minimal friction** - Large touch targets, auto-detection, voice input priority

---

## Typography

**Font Family:** Inter (Google Fonts) - excellent screen readability
- Headlines: Inter Semi-Bold (600)
- Body: Inter Regular (400)
- Labels/Meta: Inter Medium (500)

**Scale:**
- Page Title: text-2xl (24px) font-semibold
- Section Headers: text-lg (18px) font-semibold  
- Card Titles: text-base (16px) font-semibold
- Body Text: text-base (16px) font-normal
- Labels/Meta: text-sm (14px) font-medium
- Small Meta: text-xs (12px) font-medium

---

## Layout System

**Spacing Primitives:** Use Tailwind units of **4, 6, 8, 12, 16** (e.g., p-4, gap-6, mb-8)

**Mobile Layout (default):**
- Screen padding: px-4 py-6
- Card spacing: gap-4 between cards
- Section spacing: mb-8 between sections
- Form field spacing: gap-6

**Container widths:**
- Mobile: Full width with px-4 padding
- Desktop (optional enhancement): max-w-md centered

---

## Component Library

### Dashboard Cards
- White background with subtle shadow (shadow-sm)
- Rounded corners: rounded-lg
- Padding: p-4
- Border-left accent for status (border-l-4):
  - Today's pickups: border-blue-600
  - Overdue: border-red-600
  - Upcoming: border-gray-300

### Primary Action Button (Scan & Drop)
- Full-width on mobile
- Height: h-16 (64px) - extra large for easy thumb access
- Background: bg-blue-600 with gradient overlay
- Text: text-white text-lg font-semibold
- Icon: Large QR code icon (32px)
- Shadow: shadow-lg for prominence

### Secondary Buttons
- Height: h-12 (48px minimum touch target)
- Outline style for secondary actions
- Solid for primary in-context actions

### Status Badges
- Small pills with colored backgrounds
- Examples:
  - Pending: bg-amber-100 text-amber-800
  - Picked Up: bg-green-100 text-green-800
  - Overdue: bg-red-100 text-red-800

### Voice Recording Component
- Prominent red record button (w-16 h-16 circular)
- Live timer display
- Waveform visualization during recording
- Playback controls with clear play/pause states

### Form Inputs
- Height: h-12 (48px)
- Border: border-2 for focus visibility outdoors
- Focus states: ring-2 ring-blue-600
- Dropdowns: Full-width with chevron icon

### Camera Viewfinder (QR Scanner)
- Full-screen modal overlay
- Scanning box overlay with corner guides
- Semi-transparent black background (bg-black/70)
- Close button: top-right, large (w-12 h-12)

### Navigation
- Bottom tab bar (mobile pattern):
  - Home/Dashboard
  - Active Drops
  - History
  - Profile
- Height: h-16 with safe area padding
- Icons: 24px with labels

---

## Interaction Patterns

### Information Hierarchy
**Dashboard view:**
1. Primary action (Scan & Drop) - top, prominent
2. Today's pickups - urgent section with count badge
3. Upcoming/Overdue - collapsible sections

**Drop Detail view:**
1. Business name (heading size)
2. Address with map link button
3. Key metadata (drop date, pickup due) in visual timeline
4. Voice note player with transcript
5. Action buttons (fixed bottom bar)

### Map Integration
- "Open in Maps" button opens native maps app
- Small static map preview in detail view (optional)

### Auto-Detection Feedback
- Shimmer loading states during geocoding
- Success checkmark animations (subtle, fast)
- Editable fields with pencil icon affordance

---

## Accessibility & Field Optimization

- **Touch targets:** Minimum 48px height/width on all interactive elements
- **Contrast ratios:** WCAG AAA where possible (outdoor readability)
- **Loading states:** Skeleton screens, not spinners (better on slow connections)
- **Offline indicators:** Clear banner when offline mode active
- **Error states:** Red text with icon, actionable retry buttons

---

## Animations

**Minimal approach** (battery/performance):
- Page transitions: Simple fade (150ms)
- Button press: Scale 0.98 on active
- Success confirmations: Checkmark fade-in (200ms)
- List updates: Fade new items in
- NO scroll animations, parallax, or decorative motion

---

## Images

**No hero images** - This is a utility app, not marketing
**Where images appear:**
- User avatar (profile icon, top-right)
- Empty states: Simple illustration for "No pickups today"
- Tutorial/onboarding: Optional screenshots showing QR scanning

**Image treatment:**
- Rounded avatars (rounded-full)
- Illustrations: Minimal line-art style, PCBancard purple accent
- Icons: Heroicons library (outline style for navigation, solid for status)

---

## Mobile-First Constraints

- **Single column layouts** throughout (no multi-column on mobile)
- **Bottom action bars** for primary actions in detail views
- **Sticky headers** with back navigation
- **Pull-to-refresh** on dashboard
- **Swipe gestures** for card actions (optional enhancement: swipe to mark complete)