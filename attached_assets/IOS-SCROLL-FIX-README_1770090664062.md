# iOS Safari Scroll Fix Package

## The Problem

iOS Safari has scroll behavior issues in bottom sheets and modals:

| Issue | What Happens |
|-------|--------------|
| **Scroll Chaining** | Scrolling past content boundaries scrolls the body behind |
| **Rubber-banding** | iOS bounce effect bleeds through to background |
| **Body Scroll** | Background content scrolls when sheet is open |
| **Jank** | Scroll feels choppy, not smooth |
| **100vh Bug** | Full height doesn't account for Safari toolbar |

## The Solution

This package provides:

1. **CSS Utilities** - `overscroll-contain`, safe area padding, etc.
2. **Body Scroll Lock Hook** - Properly locks body scroll on iOS
3. **Scroll Containment Hook** - Prevents scroll chaining
4. **Drop-in Wrapper** - Fix existing sheets without rewriting
5. **Optimized Component** - Purpose-built iOS bottom sheet

## Files Included

```
ios-scroll-fix/
├── client/src/
│   ├── hooks/
│   │   └── use-ios-scroll-lock.ts    # Scroll lock & containment hooks
│   ├── components/
│   │   ├── IOSBottomSheet.tsx        # Full replacement component
│   │   └── SheetScrollFix.tsx        # Drop-in wrapper for existing sheets
│   └── styles/
│       └── ios-scroll-fixes.css      # CSS utilities
├── migrations/
│   └── deal-pipeline-migration.tsx   # Migration guide
└── README.md
```

## Installation

### Step 1: Copy Files

```bash
# Copy hooks
cp client/src/hooks/use-ios-scroll-lock.ts your-project/client/src/hooks/

# Copy components
cp client/src/components/IOSBottomSheet.tsx your-project/client/src/components/
cp client/src/components/SheetScrollFix.tsx your-project/client/src/components/

# Copy CSS
cat client/src/styles/ios-scroll-fixes.css >> your-project/client/src/index.css
```

### Step 2: Add CSS Import (if separate file)

```css
/* In your index.css or globals.css */
@import './styles/ios-scroll-fixes.css';
```

## Quick Fix (Minimal Changes)

If you just want to fix existing sheets without much refactoring:

### Option A: CSS Only

Add these classes to your existing `SheetContent`:

```tsx
// BEFORE
<SheetContent className="overflow-y-auto">
  {content}
</SheetContent>

// AFTER
<SheetContent className="overflow-y-auto overscroll-contain ios-bottom-sheet">
  <div className="h-full overflow-y-auto ios-scroll-container">
    {content}
  </div>
</SheetContent>
```

### Option B: Use the Wrapper

```tsx
import { SheetScrollFix } from '@/components/SheetScrollFix';

<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent side="bottom" className="h-[90vh]">
    <SheetScrollFix isOpen={isOpen}>
      {/* Your existing content - no changes needed */}
    </SheetScrollFix>
  </SheetContent>
</Sheet>
```

### Option C: Use the Hook

```tsx
import { useBodyScrollLock } from '@/hooks/use-ios-scroll-lock';

function MySheet({ open, children }) {
  // This is all you need to add
  useBodyScrollLock({ isLocked: open });
  
  return (
    <Sheet open={open}>
      <SheetContent className="ios-bottom-sheet">
        <div className="ios-scroll-container overflow-y-auto h-full">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

## Full Fix (Best Experience)

For the smoothest iOS experience, use the dedicated component:

```tsx
import {
  IOSBottomSheet,
  IOSBottomSheetContent,
  IOSBottomSheetHeader,
  IOSBottomSheetScrollArea,
  IOSBottomSheetFooter,
  IOSBottomSheetTitle,
} from '@/components/IOSBottomSheet';

function DealSheet({ deal, open, onOpenChange }) {
  return (
    <IOSBottomSheet open={open} onOpenChange={onOpenChange}>
      <IOSBottomSheetContent>
        {/* Fixed header - doesn't scroll */}
        <IOSBottomSheetHeader>
          <IOSBottomSheetTitle>{deal.name}</IOSBottomSheetTitle>
        </IOSBottomSheetHeader>
        
        {/* Scrollable content - iOS optimized */}
        <IOSBottomSheetScrollArea>
          <div className="p-4 space-y-4">
            {/* Your content here */}
          </div>
        </IOSBottomSheetScrollArea>
        
        {/* Fixed footer - safe area aware */}
        <IOSBottomSheetFooter>
          <Button>Save</Button>
        </IOSBottomSheetFooter>
      </IOSBottomSheetContent>
    </IOSBottomSheet>
  );
}
```

## API Reference

### useBodyScrollLock

Locks body scroll when modal/sheet is open.

```tsx
import { useBodyScrollLock } from '@/hooks/use-ios-scroll-lock';

useBodyScrollLock({
  isLocked: boolean,      // Whether to lock
  reserveScrollBarGap: boolean  // Prevent layout shift (default: true)
});
```

### useBottomSheetScroll

Comprehensive scroll handling for sheets.

```tsx
import { useBottomSheetScroll } from '@/hooks/use-ios-scroll-lock';

const { scrollRef, isAtTop, isAtBottom, scrollProgress } = useBottomSheetScroll({
  isOpen: boolean,
  onScrollPastTop?: () => void,  // For dismiss gesture
  dismissThreshold?: number,     // Pixels to trigger dismiss
});

// Attach scrollRef to your scrollable container
<div ref={scrollRef}>...</div>
```

### useIOSScrollFix

Simple hook to apply fixes to any element.

```tsx
import { useIOSScrollFix } from '@/components/SheetScrollFix';

function MyComponent() {
  const scrollRef = useIOSScrollFix<HTMLDivElement>();
  
  return <div ref={scrollRef} className="overflow-y-auto">...</div>;
}
```

### SheetScrollFix

Drop-in wrapper component.

```tsx
import { SheetScrollFix } from '@/components/SheetScrollFix';

<SheetScrollFix
  isOpen={boolean}           // For body scroll lock
  header={ReactNode}         // Fixed header (optional)
  footer={ReactNode}         // Fixed footer (optional)
  contentPadding="p-4"       // Padding class
  debug={false}              // Show debug outlines
>
  {children}
</SheetScrollFix>
```

## CSS Classes Reference

| Class | Purpose |
|-------|---------|
| `ios-bottom-sheet` | Apply to sheet container |
| `ios-scroll-container` | Apply to scrollable area |
| `overscroll-contain` | Prevent scroll chaining |
| `pb-safe` | Bottom padding for safe area |
| `pb-safe-min-4` | Bottom padding (min 1rem or safe area) |
| `touch-pan-y` | Allow vertical touch scrolling only |

## Deal Pipeline Specific Fix

For `prospect-pipeline.tsx`:

```tsx
// Find your Sheet that shows deal details
<Sheet open={selectedDeal !== null} onOpenChange={() => setSelectedDeal(null)}>
  <SheetContent side="bottom" className="h-[90vh]">
    {/* Add the wrapper */}
    <SheetScrollFix 
      isOpen={selectedDeal !== null}
      header={
        <SheetHeader>
          <SheetTitle>{selectedDeal?.merchantName}</SheetTitle>
        </SheetHeader>
      }
      footer={
        <div className="flex gap-2">
          <Button>Edit</Button>
          <Button variant="outline">Close</Button>
        </div>
      }
    >
      {/* Your existing content stays the same */}
      <DealStages deal={selectedDeal} />
      <DealInfo deal={selectedDeal} />
      {/* etc */}
    </SheetScrollFix>
  </SheetContent>
</Sheet>
```

## How It Works

### Body Scroll Lock

```
Sheet Opens
    ↓
Save scroll position
    ↓
Apply position: fixed to body
    ↓
Set body top to -scrollPosition
    ↓
[User interacts with sheet]
    ↓
Sheet Closes
    ↓
Remove fixed positioning
    ↓
Restore scroll position
```

### Scroll Containment

```
Touch Move Event
    ↓
Check scroll position
    ↓
┌─────────────────────────────┐
│ At top & scrolling up?      │──→ preventDefault()
│ At bottom & scrolling down? │──→ preventDefault()
│ No scrollable content?      │──→ preventDefault()
│ Otherwise                   │──→ Allow normal scroll
└─────────────────────────────┘
```

## Testing

### On Real iOS Device (Recommended)

1. Connect iPhone to Mac
2. Open Safari on iPhone
3. Open Safari on Mac → Develop → [Your iPhone]
4. Test scroll behavior in sheets

### Testing Checklist

- [ ] Open sheet → scroll to bottom → try scrolling more (body should NOT scroll)
- [ ] Scroll back to top → pull down (body should NOT rubber-band)
- [ ] Fast scroll → should have smooth momentum
- [ ] Close sheet → body should be at original scroll position
- [ ] Rotate device → sheet should adjust properly

### Common Issues

| Problem | Solution |
|---------|----------|
| Body still scrolls | Ensure `useBodyScrollLock` is called with `isLocked: true` |
| No momentum scroll | Add `-webkit-overflow-scrolling: touch` |
| Scroll chaining | Add `overscroll-behavior: contain` |
| Layout shift on open | Enable `reserveScrollBarGap` option |
| 100vh too tall | Use `90vh` or `calc(100vh - env(safe-area-inset-top))` |

## Browser Support

| Browser | Status |
|---------|--------|
| iOS Safari 12+ | ✅ Full support |
| iOS Chrome | ✅ Uses Safari engine |
| iOS Firefox | ✅ Uses Safari engine |
| Android Chrome | ✅ Works (less issues) |
| Desktop Safari | ✅ Works |
| Desktop Chrome | ✅ Works |
| Desktop Firefox | ✅ Works |

## Migration from Partial Fix

If you previously added `overscroll-contain` as a partial fix:

```tsx
// BEFORE (partial fix)
<SheetContent className="overscroll-contain">

// AFTER (complete fix)
<SheetContent className="ios-bottom-sheet flex flex-col">
  <SheetScrollFix isOpen={open}>
    {content}
  </SheetScrollFix>
</SheetContent>
```

The new solution is additive - your existing `overscroll-contain` class will continue to work.

---

*This package eliminates iOS Safari scroll jank in bottom sheets while maintaining smooth native-feeling scroll behavior.*
