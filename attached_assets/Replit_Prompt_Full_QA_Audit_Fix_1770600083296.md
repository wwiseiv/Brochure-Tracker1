# REPLIT TASK: Full Application QA Audit & Fix — PCB Auto

## PRIORITY: CRITICAL
## MODE: Autonomous — Test Everything, Fix Everything, Report Back

---

## What You Are Doing

You are performing a **complete quality assurance audit** of the PCB Auto application. You will systematically go through every page, every button, every link, every form, every modal, and every interactive element in the app. If something is broken, doesn't work, goes nowhere, throws an error, or is obviously incomplete — **fix it immediately**. Do not log it and move on. Fix it, then continue testing.

This is not a report. This is a **test-and-fix sweep**. When you are done, the application should have zero obvious broken elements.

---

## How To Test

For EVERY page in the application, do the following:

### 1. Page Load Test
- Does the page load without errors?
- Does the page load without a blank white screen?
- Are there any console errors on load? Fix them.
- Does the page render correctly on desktop width?
- Is there any layout breakage (overlapping elements, text overflow, broken grids)?

### 2. Navigation Test
- Does every link in the sidebar/nav actually go somewhere?
- Does every link go to the CORRECT page (not a 404, not a blank page, not the wrong page)?
- Does the active/selected state highlight correctly on the current page?
- Does the back button work correctly from every page?
- Are there any nav items that are visible but do absolutely nothing when clicked? Either make them work or hide them.

### 3. Button Test
- Click EVERY button on the page. Every single one.
- Does it do something? If a button does nothing when clicked — fix it or remove it.
- "Add" buttons — do they open a form or modal?
- "Save" buttons — do they save data (or at minimum show feedback)?
- "Cancel" buttons — do they close the modal/form?
- "Delete" buttons — do they delete (with confirmation)?
- "Edit" buttons — do they open an edit state?
- "Export" / "Download" buttons — do they produce output?
- Filter/search buttons — do they filter or search?
- If a button is just a placeholder with no handler, either wire it up to do the obvious thing or disable it with a tooltip that says "Coming Soon"

### 4. Form Test
- Does every form field accept input?
- Does the form submit when you fill it out and press save/submit?
- Are required fields marked and validated?
- Do dropdowns populate with options?
- Do date pickers open and allow date selection?
- Do phone/email fields validate format?
- Does the form show success/error feedback after submission?

### 5. Modal/Dialog Test
- Do modals open when triggered?
- Do modals close when you click X, Cancel, or click outside?
- Do modals have proper z-index (not hidden behind other elements)?
- Do modal forms work (see Form Test above)?
- Is the background properly dimmed/overlaid when a modal is open?

### 6. Table/List Test
- Do tables render data (or show an appropriate empty state)?
- Do table headers sort when clicked (if sortable)?
- Do table row actions work (edit, delete, view)?
- Does pagination work if present?
- Does search/filter above the table actually filter the table data?

### 7. Empty State Test
- When there is no data (no customers, no ROs, no vehicles, etc.), does the page show a helpful empty state — NOT a blank white void or a broken table?
- Empty states should have a message and ideally a CTA ("Add your first customer", "Create a repair order", etc.)

### 8. Link Test
- Does every hyperlink go somewhere?
- Do external links open in a new tab?
- Do internal links route correctly?
- Are there any links styled as clickable (underline, blue, pointer cursor) that do nothing? Fix them.

### 9. Status/Badge Test
- Do status badges show correct colors (e.g., green for active/complete, yellow for pending, red for overdue)?
- Do status dropdowns or toggles change the status when clicked?

### 10. Toast/Notification Test
- When an action succeeds, does the user see a success message?
- When an action fails, does the user see an error message?
- If toast/notification system exists, does it work? If not, add basic toast feedback for all save/delete/update actions.

---

## Pages To Test (in this order)

Go through every page in the application. At minimum, test these:

1. **Login / Auth**
   - Can you log in? Does the login form work?
   - Does it redirect to the dashboard after login?
   - Does logout work?

2. **Dashboard**
   - Does it load with stats/widgets?
   - Do dashboard cards link to the correct pages?
   - Are numbers rendering (not "undefined" or "NaN")?

3. **Repair Orders / Estimates**
   - Can you create a new repair order?
   - Can you add line items (labor, parts, fees)?
   - Does the total calculate correctly?
   - Can you change RO status?
   - Does the Kanban board (if present) work with drag and drop?
   - Can you view/edit/delete an existing RO?
   - Does dual pricing show on estimates (cash and card prices)?

4. **Customers**
   - Can you add a new customer?
   - Can you search/filter customers?
   - Can you click into a customer profile?
   - Does the customer profile show their vehicles and history?
   - Can you edit a customer?
   - Can you delete a customer?

5. **Vehicles**
   - Can you add a vehicle to a customer?
   - Does VIN decode work (or at least not error out)?
   - Can you view/edit/delete vehicles?

6. **Scheduling / Calendar**
   - Does the calendar render?
   - Can you create an appointment?
   - Can you click on an existing appointment to view/edit?
   - Do bay rows display correctly?
   - Does drag and drop work (if implemented)?

7. **Inspections (DVI)**
   - Can you start a new inspection?
   - Do the green/yellow/red buttons work?
   - Can you complete and save an inspection?
   - Does the inspection summary render?

8. **Parts Ordering**
   - Does the parts search interface load?
   - Can you search for a part?
   - Can you add a part to an RO?
   - Does markup calculation work?

9. **Payments**
   - Does the payment screen load?
   - Can you process/record a payment?
   - Does dual pricing display correctly?
   - Do payment method options work?

10. **Invoices / Estimates (customer-facing)**
    - If there's a public invoice/estimate URL, does it load?
    - Does the PDF/print view work?

11. **QuickBooks**
    - Does the QuickBooks settings/connection page load?
    - Does the connect button do something (even if it's just showing the flow)?

12. **Reports**
    - Does the reports page load?
    - Do report filters work?
    - Does export/download work?

13. **Settings**
    - Can you access shop settings?
    - Can you update shop info and save?
    - Do all settings sections load?

14. **Staff Management**
    - Can you view the staff list?
    - Can you add a new staff member?
    - Do role/permissions dropdowns work?
    - Can you edit/delete staff?

15. **Communication**
    - Does the communication tab/page load?
    - Can you compose a text/email?
    - Does the communication log render?

16. **AI Assistant**
    - Does the AI assistant panel open?
    - Can you type a message and get a response?
    - Does the close/minimize button work?

17. **Homepage / Marketing Page (public-facing at pcbisv.com)**
    - Does the homepage load?
    - Does the demo video play?
    - Do all CTA buttons work ("Schedule a Demo", "Watch Video", etc.)?
    - Do all navigation links work?
    - Is the page responsive on mobile widths?
    - Do feature cards render correctly?

---

## Fix Rules

When you find a problem, follow these rules:

### Dead Buttons (button does nothing)
- If the intended action is obvious (e.g., "Add Customer" should open a form), **wire it up**
- If the intended action is unclear, **disable the button and add a "Coming Soon" tooltip**
- Do NOT leave clickable buttons that silently do nothing

### Dead Links
- If the link target page exists, **fix the route**
- If the link target page doesn't exist, **either create a placeholder page or remove the link**
- Do NOT leave links that go to 404s or blank pages

### Broken Forms
- If a form field doesn't work, **fix the binding**
- If a form doesn't submit, **wire up the submit handler** (even if it just saves to local state or shows a toast)
- If validation is missing, **add basic validation** (required fields, email format, phone format)

### Console Errors
- Fix ALL console errors that appear during normal use
- Fix ALL TypeScript/compilation errors
- Fix ALL missing import errors
- Fix ALL undefined variable references

### Visual Bugs
- Fix overlapping elements
- Fix text overflow / truncation issues
- Fix broken responsive layouts
- Fix incorrect colors or missing styles
- Fix z-index issues (modals behind content, dropdowns cut off)

### Missing Empty States
- If a page or table renders blank with no data, **add an empty state** with a message and a CTA
- Example: "No customers yet. Click Add Customer to get started."

### Missing Feedback
- If save/delete/update actions have no user feedback, **add toast notifications**
- Success: green toast "Customer saved successfully"
- Error: red toast "Failed to save. Please try again."
- Use whatever toast/notification library is already in the project. If none exists, add a simple one.

---

## What NOT To Do

- ❌ Do NOT refactor or restructure the codebase — just fix what's broken
- ❌ Do NOT change the visual design, brand colors, or layout decisions
- ❌ Do NOT remove features or pages — fix them or add "Coming Soon" states
- ❌ Do NOT add new features that don't exist yet — focus only on fixing what's there
- ❌ Do NOT change the database schema unless absolutely necessary to fix a bug
- ❌ Do NOT break things that are currently working — test after every fix
- ❌ Do NOT skip a page because it "looks fine" — click every button, every link, every form field

---

## When You Are Done

After completing the full sweep, create a summary with:

1. **Pages tested** (list every page you tested)
2. **Issues found** (brief description of each issue)
3. **Issues fixed** (what you did to fix each one)
4. **Issues deferred** (anything you couldn't fix and why — there should be very few of these)
5. **Remaining "Coming Soon" items** (buttons/features you disabled with "Coming Soon" because they need backend work)

---

## Test Priority

If you have to prioritize, fix in this order:
1. Pages that don't load at all (white screen, crash)
2. Navigation links that go nowhere
3. Buttons that do nothing when clicked
4. Forms that don't submit or save
5. Tables that render blank when they should show data
6. Missing error/success feedback
7. Visual/layout bugs
8. Console errors that don't affect visible functionality

---

## Final Reminder

A shop owner is going to click through this app. If they click a button and nothing happens, they leave. If they see a blank page, they leave. If a form doesn't save, they don't come back. Every dead button, every broken link, every silent failure is a lost customer.

**Test everything. Fix everything. Leave nothing broken.**
