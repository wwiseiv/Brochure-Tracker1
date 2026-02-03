# PCBancard Navigation Audit Tool

## Quick Start

1. **Upload** `audit-navigation.js` to your Replit project root (same level as `/client` folder)

2. **Run** the script in the Replit Shell:
   ```bash
   node audit-navigation.js
   ```

3. **Review** the generated reports:
   - `navigation-audit-report.md` - Full analysis with tables
   - `navigation-fixes.txt` - Copy-paste code snippets

## What It Does

This script scans all your page files (`client/src/pages/*.tsx`) and checks for:

- ✅ Proper HamburgerMenu import and usage
- ⚠️ Pages with only back buttons (users can't reach main menu)
- ❌ Pages completely missing navigation (users get stuck!)

## Expected Output

```
🔍 PCBancard Navigation Audit
==============================

📂 Found 35 page files to analyze...

============================================================
📊 NAVIGATION AUDIT RESULTS
============================================================

✅ Has HamburgerMenu: 12 pages
   • dashboard.tsx
   • equipiq.tsx
   ...

⚠️  Back Button Only: 8 pages
   • merchant-detail.tsx - NEEDS HamburgerMenu added
   ...

❌ Missing Navigation: 5 pages
   • some-page.tsx - CRITICAL: Users can get stuck!
   ...

🚨 ACTION REQUIRED: 13 pages need navigation fixes!
```

## Applying Fixes

Open `navigation-fixes.txt` and for each flagged page:

### Step 1: Add Import
```tsx
import { HamburgerMenu } from "@/components/BottomNav";
```

### Step 2: Update Header
Find your page header and add the HamburgerMenu:

```tsx
// BEFORE
<div className="flex items-center gap-3">
  <h1>Page Title</h1>
</div>

// AFTER
<div className="flex items-center gap-3">
  <HamburgerMenu />
  <h1>Page Title</h1>
</div>
```

### Step 3: Keep Back Button (if needed)
For detail pages, keep both navigation options:

```tsx
<div className="flex items-center gap-3">
  <HamburgerMenu />
  <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
    <ArrowLeft className="h-5 w-5" />
  </Button>
  <h1>Merchant Details</h1>
</div>
```

## Customization

Edit the `CONFIG` section at the top of the script if your paths differ:

```javascript
const CONFIG = {
  pagesDir: './client/src/pages',      // Where your page files live
  componentsDir: './client/src/components',
  outputReport: './navigation-audit-report.md',
  outputFixes: './navigation-fixes.txt',
};
```

Add pages to `EXEMPT_PAGES` if they legitimately don't need navigation:

```javascript
const EXEMPT_PAGES = [
  'login.tsx',
  'register.tsx',
  // Add more here...
];
```

## Re-running After Fixes

After applying fixes, run the audit again to verify:

```bash
node audit-navigation.js
```

You should see the fixed pages move from ❌/⚠️ to ✅

## Questions?

The script is well-commented - open `audit-navigation.js` to see exactly what patterns it's checking for.
