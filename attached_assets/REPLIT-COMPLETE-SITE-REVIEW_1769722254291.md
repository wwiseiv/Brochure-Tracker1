# Complete Site Review Prompt for Replit

Copy everything below this line and paste into Replit Agent:

---

You are performing a **complete site review** of this application. Your job is to go through every page, every component, and every interaction to find mistakes, fix bugs, and polish the experience until it works perfectly on both mobile and desktop.

## CRITICAL RULES

✅ **DO:**
- Fix bugs, errors, and broken functionality
- Improve UI/UX consistency and polish
- Ensure perfect mobile responsiveness
- Optimize performance
- Fix typos and improve copy
- Add missing hover/focus/active states
- Improve error handling and user feedback

❌ **DO NOT:**
- Add new features or pages
- Change the core architecture
- Restructure the database
- Change how existing features work
- Remove any existing functionality

**Think like a user.** Go through every screen and ask: "Does this make sense? Is this easy to use? Does it feel polished and professional?"

---

## STEP 1: FULL SITE WALKTHROUGH

Open every page and screen in the application. For each one, check:

### Visual Inspection
- Does anything look broken or misaligned?
- Is the spacing consistent?
- Do colors and fonts match the rest of the site?
- Are images loading properly?
- Is there any placeholder text that was never replaced?

### Functionality Check
- Do all buttons work?
- Do all links go to the right place?
- Do forms submit correctly?
- Does data load and display properly?
- Do error states display when they should?

### Mobile Check (resize to 375px width)
- Does the layout adapt properly?
- Can you tap all buttons easily?
- Is text readable without zooming?
- Does navigation work?
- Is there any horizontal scrolling? (there shouldn't be)

**Document every issue you find before fixing anything.**

---

## STEP 2: MOBILE RESPONSIVENESS DEEP DIVE

This is critical. Test every page at these exact widths:
- **375px** (iPhone SE/mini)
- **390px** (iPhone 14)
- **768px** (iPad portrait)
- **1024px** (iPad landscape / small laptop)
- **1440px** (desktop)

### Must Fix:
1. **No horizontal scroll** - Content must not overflow the screen width
2. **Touch targets** - All buttons/links must be at least 44x44 pixels
3. **Readable text** - Minimum 16px font size for body text
4. **Form inputs** - Must be 16px or larger (prevents iOS auto-zoom)
5. **Thumb-friendly** - Important actions should be reachable with thumbs
6. **Stacking** - Multi-column layouts should stack on mobile
7. **Navigation** - Must be fully usable on mobile (hamburger menu, etc.)
8. **Images** - Must scale down, never overflow
9. **Modals/Popups** - Must be scrollable and closeable on mobile
10. **Safe areas** - Content shouldn't be hidden by notches or home indicators

### CSS Patterns to Apply Where Needed:

```css
/* Prevent overflow */
* {
  box-sizing: border-box;
}

html, body {
  overflow-x: hidden;
}

/* Responsive images */
img {
  max-width: 100%;
  height: auto;
}

/* Prevent iOS zoom on input focus */
input, select, textarea {
  font-size: 16px;
}

/* Minimum touch target */
button, a, [role="button"] {
  min-height: 44px;
}

/* Mobile-first media query pattern */
@media (min-width: 768px) {
  /* Tablet and up styles */
}

@media (min-width: 1024px) {
  /* Desktop styles */
}
```

---

## STEP 3: UI/UX POLISH

### Consistency Check
Go through the entire site and ensure:

**Colors**
- [ ] Same colors used consistently for same purposes
- [ ] Primary action buttons all use the same color
- [ ] Text colors are consistent
- [ ] Background colors are consistent

**Typography**
- [ ] Same fonts throughout
- [ ] Heading sizes follow a clear hierarchy
- [ ] Line heights are comfortable to read
- [ ] Text alignment is intentional

**Spacing**
- [ ] Consistent padding inside components
- [ ] Consistent margins between sections
- [ ] Adequate white space (not cramped)

**Components**
- [ ] All buttons look like they belong together
- [ ] All cards have the same style
- [ ] All forms have the same input styling
- [ ] All modals/dialogs are styled consistently

### Interaction States
Every interactive element needs:

- [ ] **Default state** - How it looks normally
- [ ] **Hover state** - Mouse is over it (desktop)
- [ ] **Focus state** - Keyboard navigation (accessibility)
- [ ] **Active state** - Being clicked/pressed
- [ ] **Disabled state** - When not interactive
- [ ] **Loading state** - When waiting for something

### User Feedback
Check that the app communicates clearly:

- [ ] Loading spinners/skeletons during data fetches
- [ ] Success messages after completed actions
- [ ] Error messages that explain what went wrong
- [ ] Empty states that guide users ("No items yet. Add your first one!")
- [ ] Confirmation before destructive actions
- [ ] Progress indicators for multi-step processes

### Micro-interactions
Small touches that make it feel polished:

- [ ] Smooth transitions between states (0.2s ease)
- [ ] Subtle hover effects on clickable items
- [ ] Button press feedback
- [ ] Smooth page/component transitions

---

## STEP 4: CODE QUALITY

Review the codebase for issues:

### Bugs & Errors
- [ ] Fix all console errors
- [ ] Fix all console warnings
- [ ] Handle all edge cases (empty data, long text, etc.)
- [ ] Add try/catch around async operations
- [ ] Handle API failures gracefully

### Clean Up
- [ ] Remove all console.log statements
- [ ] Remove commented-out code
- [ ] Remove unused imports
- [ ] Remove unused variables
- [ ] Remove unused files
- [ ] Fix all TODO comments or remove them

### Performance
- [ ] Add loading="lazy" to images below the fold
- [ ] Debounce search/filter inputs (300ms)
- [ ] Don't fetch data unnecessarily
- [ ] Large lists should have pagination or virtual scrolling

---

## STEP 5: CROSS-BROWSER TESTING

Verify the site works in:
- [ ] Chrome (desktop)
- [ ] Chrome (mobile/DevTools)
- [ ] Safari (if possible)
- [ ] Firefox (desktop)

Common issues to watch for:
- Flexbox/Grid differences
- Date formatting differences  
- Scroll behavior differences
- Font rendering differences

---

## STEP 6: FINAL CHECKLIST

Before marking complete, verify:

### Desktop Experience
- [ ] All pages load without errors
- [ ] All navigation works
- [ ] All forms work
- [ ] All data displays correctly
- [ ] Hover states work throughout
- [ ] Keyboard navigation works (Tab key)

### Mobile Experience
- [ ] All pages are fully usable
- [ ] No horizontal scrolling anywhere
- [ ] All touch targets are adequate
- [ ] Text is readable
- [ ] Navigation is accessible
- [ ] Forms are easy to fill out
- [ ] Modals/popups work correctly

### Overall Polish
- [ ] No placeholder text remaining
- [ ] No typos in user-facing text
- [ ] No broken images
- [ ] No console errors
- [ ] Professional, consistent appearance

---

## HOW TO REPORT

After completing each step, report in this format:

```
## Step X Complete

### Issues Found & Fixed:
1. [Page/Component] - [Issue] - ✅ Fixed
2. [Page/Component] - [Issue] - ✅ Fixed
3. [Page/Component] - [Issue] - ✅ Fixed

### Files Modified:
- path/to/file1.jsx
- path/to/file2.css

### Before/After:
[Describe the improvement]

### Remaining Concerns:
[Anything you couldn't fix or need input on]
```

---

## START NOW

Begin with **Step 1: Full Site Walkthrough**. 

Open every page in the application and document all issues you find. List them out before making any fixes so I can see the full picture of what needs attention.

What issues do you find?
