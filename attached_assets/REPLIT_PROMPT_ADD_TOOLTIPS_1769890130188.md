# Replit Prompt: Add Hover Tooltips Site-Wide

## Task

Add tooltip hints to all buttons, icons, and interactive elements throughout the site. Tooltips should appear after hovering for ~0.5-1 second, showing a brief description of what the element does.

---

## Implementation Options

### Option 1: Use a Tooltip Library (Recommended)

Install and use a lightweight tooltip library:

```bash
npm install @radix-ui/react-tooltip
```

Or if you prefer:
```bash
npm install react-tooltip
```

### Option 2: Custom CSS Tooltips

Create a reusable tooltip component with CSS.

---

## Tooltip Component

Create a reusable Tooltip component:

```tsx
// client/src/components/ui/Tooltip.tsx

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
}

export function Tooltip({ 
  children, 
  content, 
  side = 'top',
  delayDuration = 700  // 0.7 second delay
}: TooltipProps) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root delayDuration={delayDuration}>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            className="z-50 px-3 py-1.5 text-sm text-white bg-gray-900 rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95"
            sideOffset={5}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-gray-900" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
```

---

## Alternative: Pure CSS Tooltip

If you don't want a library, use this CSS-only approach:

```tsx
// client/src/components/ui/Tooltip.tsx

import React from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ children, content, position = 'top' }: TooltipProps) {
  return (
    <div className="tooltip-wrapper group relative inline-block">
      {children}
      <div className={`
        tooltip-content
        invisible opacity-0 group-hover:visible group-hover:opacity-100
        transition-opacity delay-700 duration-200
        absolute z-50 px-3 py-1.5 text-sm text-white bg-gray-900 rounded-lg shadow-lg
        whitespace-nowrap
        ${position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' : ''}
        ${position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2' : ''}
        ${position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2' : ''}
        ${position === 'right' ? 'left-full top-1/2 -translate-y-1/2 ml-2' : ''}
      `}>
        {content}
        {/* Arrow */}
        <div className={`
          absolute w-2 h-2 bg-gray-900 rotate-45
          ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' : ''}
          ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' : ''}
          ${position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' : ''}
          ${position === 'right' ? 'right-full top-1/2 -translate-y-1/2 -mr-1' : ''}
        `} />
      </div>
    </div>
  );
}
```

---

## Elements That Need Tooltips

### Home Page (based on screenshot)

| Element | Tooltip Text |
|---------|-------------|
| Scan & Drop button | "Record a new brochure drop at a merchant location" |
| Plan Route button | "Optimize your driving route for today's pickups" |
| View all link | "See all scheduled pickups" |
| Notification bell (top right) | "View notifications" |
| Profile icon (WW) | "Your profile and settings" |
| Activity chart icon | "View your activity stats" |

### Prospect Finder Page

| Element | Tooltip Text |
|---------|-------------|
| AI-Powered badge | "Uses AI to find real local businesses" |
| Location input | "Enter ZIP code to search nearby" |
| Add More button | "Select additional business types" |
| X on business type chips | "Remove this business type" |
| Radius dropdown | "How far to search from the ZIP code" |
| Results dropdown | "Maximum number of businesses to find" |
| Find Prospects button | "Search for businesses matching your criteria" |

### Navigation Bar

| Element | Tooltip Text |
|---------|-------------|
| Home icon | "Go to home screen" |
| Scan icon | "Scan & drop a brochure" |
| E-Sign icon | "Electronic signature documents" |
| Coach icon | "AI sales coaching" |
| Merchants icon | "View your merchants" |
| Profile icon | "Your profile" |

### General Icons/Buttons

| Element | Tooltip Text |
|---------|-------------|
| Back arrow | "Go back" |
| Settings gear | "Settings" |
| Search icon | "Search" |
| Filter icon | "Filter results" |
| Sort icon | "Sort results" |
| Export icon | "Export data" |
| Refresh icon | "Refresh" |
| Edit pencil | "Edit" |
| Delete trash | "Delete" |
| Phone icon | "Call" |
| Email icon | "Send email" |

---

## Usage Examples

### Wrapping a Button

```tsx
// Before
<button onClick={handleScan}>
  <QrCode className="w-5 h-5" />
  Scan & Drop
</button>

// After
<Tooltip content="Record a new brochure drop at a merchant location">
  <button onClick={handleScan}>
    <QrCode className="w-5 h-5" />
    Scan & Drop
  </button>
</Tooltip>
```

### Wrapping an Icon Button

```tsx
// Before
<button onClick={planRoute}>
  <Route className="w-5 h-5" />
</button>

// After
<Tooltip content="Optimize your driving route">
  <button onClick={planRoute}>
    <Route className="w-5 h-5" />
  </button>
</Tooltip>
```

### Wrapping a Link

```tsx
// Before
<Link to="/pickups">View all</Link>

// After
<Tooltip content="See all scheduled pickups">
  <Link to="/pickups">View all</Link>
</Tooltip>
```

---

## Global Tooltip Provider (if using Radix)

Wrap your app with the tooltip provider for better performance:

```tsx
// client/src/App.tsx or main.tsx

import * as TooltipPrimitive from '@radix-ui/react-tooltip';

function App() {
  return (
    <TooltipPrimitive.Provider delayDuration={700}>
      {/* Rest of your app */}
    </TooltipPrimitive.Provider>
  );
}
```

Then simplify the Tooltip component:

```tsx
export function Tooltip({ children, content, side = 'top' }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          className="z-50 px-3 py-1.5 text-sm text-white bg-gray-900 rounded-lg shadow-lg"
          sideOffset={5}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-gray-900" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
```

---

## Styling

Add these styles to your global CSS if using the CSS-only approach:

```css
/* Tooltip animations */
@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tooltip-content {
  animation: tooltipFadeIn 0.2s ease-out;
}

/* Ensure tooltips appear above everything */
.tooltip-wrapper {
  position: relative;
}

/* Mobile: disable hover tooltips (they don't work well on touch) */
@media (hover: none) {
  .tooltip-content {
    display: none !important;
  }
}
```

---

## Implementation Checklist

- [ ] Install tooltip library OR create Tooltip component
- [ ] Add TooltipProvider to App root (if using Radix)
- [ ] Add tooltips to Home page elements
- [ ] Add tooltips to Navigation bar icons
- [ ] Add tooltips to Prospect Finder page
- [ ] Add tooltips to all icon-only buttons site-wide
- [ ] Test on desktop (hover works)
- [ ] Test on mobile (tooltips hidden or tap-to-show)
- [ ] Verify 0.7s delay feels right (adjust if needed)

---

## Quick Implementation

For fastest results, go through each page and wrap interactive elements:

1. **Home.tsx** - Scan & Drop, Plan Route, View all, header icons
2. **Navigation.tsx** - All nav icons
3. **ProspectFinder.tsx** - All form elements and buttons  
4. **Pipeline.tsx** - Action buttons
5. **MerchantDetail.tsx** - Edit, call, email buttons
6. **Any icon-only buttons** - Always need tooltips for accessibility

---

## Expected Result

- User hovers over "Plan Route" button
- After ~0.7 seconds, tooltip appears above: "Optimize your driving route for today's pickups"
- User moves mouse away, tooltip fades out
- On mobile, tooltips are hidden (touch devices don't have hover)
