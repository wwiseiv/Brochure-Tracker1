# Replit Prompt: Add AI-Powered Prospecting Section to Home Screen

## Task Overview

Add a new fourth section called **"AI-Powered Prospecting"** to the home screen, positioned after "Business Tools". This section will contain the new Prospect Finder feature and pipeline management tools.

---

## Current Home Screen Structure

The home screen currently has three sections:
1. **Core Field Operations** — Scan & Drop, Today's Pickups, etc.
2. **AI-Powered Training** — Sales coaching, role-play, training modules
3. **Business Tools** — Statement analysis, proposals, equipment

---

## What to Add

### New Section: "AI-Powered Prospecting"

Add this section AFTER "Business Tools" with the following cards:

#### Card 1: Prospect Finder
- **Icon:** `Search` or `MapPin` from lucide-react
- **Title:** "Prospect Finder"
- **Description:** "Discover local businesses ready for better payment processing"
- **Badge:** "AI-Powered" (purple gradient badge, same style as training section)
- **Route:** `/prospects/search`
- **Color accent:** Purple gradient (consistent with AI features)

#### Card 2: My Pipeline
- **Icon:** `TrendingUp` or `Layers` from lucide-react  
- **Title:** "My Pipeline"
- **Description:** "Track and manage your claimed prospects"
- **Badge:** Show count of active prospects (e.g., "12 Active")
- **Route:** `/prospects/pipeline`
- **Color accent:** Blue or teal

---

## Implementation Details

### 1. Section Header Style

Follow the existing pattern for section headers:

```tsx
<div className="mb-4">
  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
    <Sparkles className="w-5 h-5 text-purple-600" />
    AI-Powered Prospecting
  </h2>
  <p className="text-sm text-gray-500 mt-1">
    Find and convert local businesses in your territory
  </p>
</div>
```

### 2. Card Component Structure

Each card should match existing card styles:

```tsx
// Prospect Finder Card
<Link to="/prospects/search">
  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
          <Search className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">Prospect Finder</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
              AI-Powered
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Discover local businesses ready for better rates
          </p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </div>
  </div>
</Link>

// My Pipeline Card
<Link to="/prospects/pipeline">
  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">My Pipeline</h3>
            {pipelineCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 rounded-full">
                {pipelineCount} Active
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Track and manage your claimed prospects
          </p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </div>
  </div>
</Link>
```

### 3. Data Hook for Pipeline Count

Add a simple hook to fetch the active prospect count for the badge:

```tsx
// In the home page component or a custom hook
const { data: pipelineData } = useQuery({
  queryKey: ['/api/prospects/pipeline'],
  enabled: !!user,
});

const pipelineCount = pipelineData?.total || 0;
```

### 4. Import Requirements

Add these imports to the home page:

```tsx
import { Search, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';
```

---

## File to Modify

**File:** `client/src/pages/Home.tsx` (or wherever the home page component lives)

**Location:** Add the new section after the "Business Tools" section, before any footer or bottom navigation.

---

## Visual Layout

```
┌─────────────────────────────────────┐
│         Core Field Operations        │
│  [Scan & Drop] [Today's Pickups]    │
├─────────────────────────────────────┤
│         AI-Powered Training          │
│  [Sales Coach] [Role Play] [...]    │
├─────────────────────────────────────┤
│           Business Tools             │
│  [Statement] [Proposals] [...]      │
├─────────────────────────────────────┤
│      ✨ AI-Powered Prospecting       │  ← NEW SECTION
│  Find and convert local businesses   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ 🔍 Prospect Finder [AI-Powered]│   │
│  │ Discover local businesses     │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ 📈 My Pipeline    [12 Active] │   │
│  │ Track and manage prospects    │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## Routes to Create

These routes should be added to the router configuration:

```tsx
// In your routes configuration
{ path: '/prospects/search', element: <ProspectFinder /> },
{ path: '/prospects/pipeline', element: <ProspectPipeline /> },
{ path: '/prospects/:id', element: <ProspectDetail /> },
```

---

## Complete Section Code Block

Here's the complete section to copy-paste:

```tsx
{/* AI-Powered Prospecting Section */}
<section className="mb-8">
  <div className="mb-4">
    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
      <Sparkles className="w-5 h-5 text-purple-600" />
      AI-Powered Prospecting
    </h2>
    <p className="text-sm text-gray-500 mt-1">
      Find and convert local businesses in your territory
    </p>
  </div>
  
  <div className="space-y-3">
    {/* Prospect Finder Card */}
    <Link to="/prospects/search">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Prospect Finder</h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                  AI-Powered
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Discover local businesses ready for better rates
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </Link>

    {/* My Pipeline Card */}
    <Link to="/prospects/pipeline">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">My Pipeline</h3>
                {pipelineCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 rounded-full">
                    {pipelineCount} Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Track and manage your claimed prospects
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </Link>
  </div>
</section>
```

---

## Testing Checklist

After implementation, verify:

- [ ] New section appears after "Business Tools"
- [ ] Section header shows sparkle icon and "AI-Powered Prospecting" title
- [ ] Prospect Finder card has purple gradient icon and "AI-Powered" badge
- [ ] My Pipeline card has teal gradient icon
- [ ] Pipeline count badge shows correct number (or hides if 0)
- [ ] Both cards are tappable and navigate to correct routes
- [ ] Hover states work on desktop
- [ ] Mobile responsive (cards stack properly)
- [ ] Icons render correctly (lucide-react imported)

---

## Summary

Add a new "AI-Powered Prospecting" section to the home screen with two cards:
1. **Prospect Finder** — AI-powered local business discovery (purple, "AI-Powered" badge)
2. **My Pipeline** — Prospect pipeline management (teal, shows active count)

This section should be placed after "Business Tools" and before any footer content.
