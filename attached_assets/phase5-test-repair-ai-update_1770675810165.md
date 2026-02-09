# PCB Auto — Full System Test, Repair & AI Help Navigation Update

## WHAT THIS PROMPT DOES

We just completed a MAJOR update to the Repair Orders module (Phases 1-4). This prompt tells you to:

1. **Test every new feature** we just built and fix anything that's broken
2. **Test every EXISTING feature** to make sure we didn't break anything
3. **Update the AI Help Assistant and AI Navigation system** to include all the new pages, features, and routes
4. **Update the Help suggestions** so they're contextually relevant on every page
5. **Fix every broken link, dead route, missing import, and rendering error** you find

**Do NOT skip any section. Do NOT move on to the next section until the current one passes. Fix problems as you find them.**

---

## PART 1: DATABASE VERIFICATION

Before testing anything, verify the database schema is correct. Run this query and confirm ALL these tables exist:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'pcb_repair_orders',
  'pcb_service_lines',
  'pcb_employees',
  'pcb_customers',
  'pcb_vehicles',
  'pcb_estimate_sequences',
  'pcb_locations',
  'pcb_ro_sequences',
  'pcb_tech_sessions',
  'pcb_declined_services',
  'pcb_campaign_settings',
  'pcb_ro_close_snapshots',
  'pcb_ro_events',
  'pcb_payments',
  'pcb_inspections',
  'pcb_inspection_templates'
)
ORDER BY table_name;
```

If ANY table is missing, check the Drizzle schema file and run the migration. Do NOT proceed until all tables exist.

Then verify the NEW columns on existing tables:

```sql
-- Check pcb_repair_orders has all new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'pcb_repair_orders'
AND column_name IN (
  'estimate_number', 'is_estimate', 'converted_from_estimate_id', 'converted_to_ro_id',
  'location_id', 'advisor_employee_id',
  'customer_signature_data', 'customer_signature_timestamp', 'customer_signature_ip', 'customer_signature_method',
  'mileage_in', 'mileage_out'
);

-- Check pcb_service_lines has all new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'pcb_service_lines'
AND column_name IN (
  'parts_pay_type', 'labor_pay_type', 'retail_value_override',
  'warranty_vendor', 'warranty_claim_number',
  'line_origin', 'added_by_user_id', 'added_at',
  'presented_to_customer', 'presented_at', 'presented_by_advisor_id', 'customer_responded_at',
  'authorization_method', 'authorization_timestamp', 'authorization_confirmation_sent', 'authorization_confirmation_id'
);

-- Check pcb_employees has new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'pcb_employees'
AND column_name IN ('employee_number', 'pin_code');
```

If ANY column is missing, add it to the Drizzle schema and push the migration. Fix before proceeding.

---

## PART 2: API ROUTE TESTING

Test every API route below. For each one, make a real HTTP request (use fetch, curl, or Drizzle Studio). If the route returns an error, crashes, or returns unexpected data — FIX IT before moving on.

### Existing Routes (must still work):
```
GET    /api/pcbauto/v1/repair-orders           — List ROs (should default to is_estimate=false)
POST   /api/pcbauto/v1/repair-orders           — Create RO
GET    /api/pcbauto/v1/repair-orders/:id       — Get single RO with service lines
PATCH  /api/pcbauto/v1/repair-orders/:id       — Update RO
GET    /api/pcbauto/v1/customers               — List customers
POST   /api/pcbauto/v1/customers               — Create customer
GET    /api/pcbauto/v1/vehicles                — List vehicles
GET    /api/pcbauto/v1/inspections             — List inspections
GET    /api/pcbauto/v1/schedule                — Get schedule
GET    /api/pcbauto/v1/reports/*               — All existing report routes
GET    /api/pcbauto/v1/settings/*              — All settings routes
```

### New Routes (must exist and work):
```
GET    /api/pcbauto/v1/estimates               — List estimates only
POST   /api/pcbauto/v1/estimates               — Create estimate with EST- number
GET    /api/pcbauto/v1/estimates/:id           — Get estimate detail
PATCH  /api/pcbauto/v1/estimates/:id           — Update estimate
POST   /api/pcbauto/v1/estimates/:id/convert   — Convert estimate to RO
DELETE /api/pcbauto/v1/estimates/:id           — Delete unconverted estimate

GET    /api/pcbauto/v1/locations               — List locations
POST   /api/pcbauto/v1/locations               — Create location

POST   /api/pcbauto/v1/tech-sessions/clock-in  — Clock tech into a line
POST   /api/pcbauto/v1/tech-sessions/clock-out — Clock tech out
GET    /api/pcbauto/v1/tech-sessions/active    — Get all active sessions
GET    /api/pcbauto/v1/tech-sessions/ro/:roId  — Sessions for an RO
GET    /api/pcbauto/v1/tech-sessions/tech/:id  — Sessions for a tech

POST   /api/pcbauto/v1/repair-orders/:id/authorize-addon    — Record line authorization
POST   /api/pcbauto/v1/repair-orders/:id/send-authorization — Send auth SMS
POST   /api/pcbauto/v1/repair-orders/:id/signature          — Save customer signature

GET    /api/pcbauto/v1/declined-services                     — List declined services
GET    /api/pcbauto/v1/declined-services/pending-followup    — Pending follow-ups
GET    /api/pcbauto/v1/declined-services/customer/:id        — By customer
POST   /api/pcbauto/v1/declined-services/:id/send-followup   — Manual follow-up

GET    /api/pcbauto/v1/campaign-settings       — Get campaign settings
PUT    /api/pcbauto/v1/campaign-settings       — Update campaign settings

GET    /api/pcbauto/v1/reports/monthly-summary          — Monthly summary
GET    /api/pcbauto/v1/reports/advisor-performance       — Advisor metrics
GET    /api/pcbauto/v1/reports/tech-efficiency            — Tech efficiency
```

**For each route that doesn't exist yet: CREATE IT.** Follow the patterns established in the existing routes file. Check the Drizzle schema for the correct table/column names.

**For each route that exists but returns errors: FIX IT.** Common issues:
- Column name mismatches between the route code and the Drizzle schema
- Missing `.where()` clauses for tenant_id filtering
- Missing error handling (try/catch around db queries)
- Incorrect JOIN conditions

### Functional Tests (do these manually):

**Test 1: Create an Estimate**
- POST to create a new estimate
- Verify it gets an EST- prefixed number (e.g., EST-10001)
- Verify `is_estimate = true` in the database
- Verify it appears in GET /estimates but NOT in GET /repair-orders

**Test 2: Convert Estimate to RO**
- POST to /estimates/:id/convert
- Verify a NEW RO record is created with `is_estimate = false`
- Verify it gets a location-based number (e.g., 10001)
- Verify all service lines were copied to the new RO
- Verify the estimate's `converted_to_ro_id` is set
- Verify the RO's `converted_from_estimate_id` is set

**Test 3: Tech Clock In/Out**
- POST clock-in for a tech on a specific service line
- Verify a pcb_tech_sessions record exists with `is_active = true`
- POST clock-in for the SAME tech on a DIFFERENT line
- Verify the first session was auto-closed (is_active = false, clock_out set, duration calculated)
- POST clock-out
- Verify the session is closed and duration_minutes is calculated correctly

**Test 4: RO Close Snapshot**
- Create an RO with 3 service lines (mix of customer_pay, internal, warranty pay types)
- Clock a tech in and out of at least one line
- Change the RO status to completed/closed
- Verify a pcb_ro_close_snapshots record was created
- Verify the snapshot totals are correct (line counts, revenue, hours)

**Test 5: Service Line Pay Types**
- Update a service line's parts_pay_type to 'warranty'
- Update the same line's labor_pay_type to 'customer_pay'
- Verify both fields saved correctly
- Set labor_pay_type to 'internal' and set retail_value_override
- Verify the retail_value_override is stored

---

## PART 3: FRONTEND PAGE TESTING

Open every page in the app and verify it renders without errors. Open the browser console (F12) and check for JavaScript errors. Fix any errors you find.

### Pages to Test:

**Dashboard** (`/dashboard` or `/`)
- [ ] Loads without errors
- [ ] All stat cards render with data
- [ ] NEW: Active Tech Sessions widget shows (even if empty: "No techs currently clocked in")
- [ ] NEW: Add-On Metrics card shows (even if 0: "Today's Add-Ons: 0 presented")
- [ ] Balance widget has date filter (Today / This Week / This Month / Custom)
- [ ] All clickable elements navigate correctly

**Repair Orders** (`/work-orders` or `/repair-orders`)
- [ ] Loads without errors
- [ ] NEW: Tab toggle exists: [Repair Orders] [Estimates]
- [ ] Repair Orders tab shows only actual ROs (is_estimate = false)
- [ ] Estimates tab shows only estimates (is_estimate = true)
- [ ] "New Repair Order" button works
- [ ] "New Estimate" button works (on Estimates tab)
- [ ] Clicking an RO row opens the detail page

**RO Detail Page** (`/work-orders/:id` or `/repair-orders/:id`)
- [ ] Loads without errors
- [ ] Service lines render correctly
- [ ] NEW: Parts Pay Type dropdown on each line (Customer Pay / Internal / Warranty)
- [ ] NEW: Labor Pay Type dropdown on each line
- [ ] NEW: When Internal/Warranty selected, conditional fields appear (retail_value_override, warranty_vendor, warranty_claim_number)
- [ ] NEW: Line origin indicator (* for add-ons, icon for inspection lines)
- [ ] NEW: Tech assignment display on each line
- [ ] NEW: Authorization status badges on add-on lines
- [ ] NEW: Customer Total vs Internal/Warranty summary at bottom
- [ ] Add line button works
- [ ] Save/update works
- [ ] If this is a converted estimate, shows link to original estimate

**Estimate Detail Page**
- [ ] Same as RO detail but shows "Estimate" in header
- [ ] Shows EST-XXXXX number
- [ ] "Convert to Repair Order" button exists and works
- [ ] If already converted, shows link to the RO instead of convert button

**Tech Portal** (`/tech-portal`)
- [ ] Page exists and loads
- [ ] Login screen appears (employee number + optional PIN)
- [ ] After login, shows tech's assigned ROs
- [ ] Clock In button works
- [ ] Clock Out button works
- [ ] **NO PRICING VISIBLE** — verify zero dollar amounts anywhere on this page
- [ ] Line status indicators work (✅ Done, ⏱ Working, ○ Ready)
- [ ] Add-on lines show asterisk indicator

**Customers** (`/customers`)
- [ ] Loads without errors
- [ ] Search works
- [ ] Click to view customer detail

**Vehicles** (`/vehicles`)
- [ ] Loads without errors
- [ ] Vehicle list renders

**Inspections/DVI** (`/inspections`)
- [ ] Loads without errors
- [ ] Inspection list renders

**Schedule** (`/schedule`)
- [ ] Loads without errors
- [ ] Calendar renders

**Parts** (`/parts`)
- [ ] Loads without errors

**Reports** (`/reports`)
- [ ] Loads without errors
- [ ] NEW: Monthly Summary report page exists and renders
- [ ] NEW: Advisor Performance report page exists and renders
- [ ] NEW: Tech Efficiency report page exists and renders
- [ ] All existing report pages still work
- [ ] Export to Excel button works on each report

**Settings** (`/settings`)
- [ ] All settings sub-pages load
- [ ] NEW: Campaign Settings page exists (`/settings/campaigns`)
- [ ] Campaign toggle (enable/disable) works
- [ ] Follow-up days can be edited
- [ ] Channel selector works (Email / SMS / Both)
- [ ] Template editors load and save
- [ ] Staff page shows employee_number and pin_code fields

**AI Help Assistant**
- [ ] Opens when clicking the help/assistant button
- [ ] Can type a message and get a response
- [ ] Navigation links render as tappable blue pills (NOT raw [[nav:...]] text)
- [ ] Clicking a nav link closes chat and navigates to the correct page
- [ ] Suggestion buttons appear and work

---

## PART 4: UPDATE AI HELP NAVIGATION MAP

This is critical. We added many new pages and features. The navigation map (likely in `navMap.ts` or similar) needs to be updated with ALL new routes. The AI system prompt also needs to know about the new features so it can help users find them.

### Find the Navigation Map File

Search the codebase for:
- A file containing `NAV_MAP` or `navMap` or `navigationMap`
- A file containing `[[nav:` patterns
- A file containing route-to-label mappings used by the AI assistant

### Add These New Navigation Entries

Add ALL of the following to the navigation map. Use the exact same format/structure as the existing entries. Each entry needs: key, label, route, toast message, keywords, and optional icon/highlightId.

```typescript
// ═══════════════════════════════════════════════
// NEW ENTRIES TO ADD TO NAV_MAP
// ═══════════════════════════════════════════════

// --- Estimates ---
{
  key: 'estimates',
  label: 'Estimates',
  route: '/estimates',  // or wherever estimates tab lives — check actual routes
  toast: 'Estimates',
  keywords: ['estimates', 'quotes', 'estimate list', 'price quotes', 'bids'],
  icon: '📝',
},
{
  key: 'new-estimate',
  label: 'New Estimate',
  route: '/estimates/new',  // or the route to create a new estimate
  toast: 'Create New Estimate',
  keywords: ['new estimate', 'create estimate', 'make estimate', 'write estimate', 'new quote'],
  icon: '📝',
},
{
  key: 'convert-estimate',
  label: 'Convert Estimate',
  route: '/estimates',
  toast: 'Convert an Estimate to a Repair Order',
  keywords: ['convert estimate', 'estimate to ro', 'estimate to repair order', 'approve estimate'],
  icon: '🔄',
},

// --- Tech Portal ---
{
  key: 'tech-portal',
  label: 'Tech Portal',
  route: '/tech-portal',
  toast: 'Technician Portal',
  keywords: ['tech portal', 'technician portal', 'technician view', 'tech login', 'clock in', 'clock out', 'tech screen', 'shop floor'],
  icon: '🔧',
},

// --- Tech Sessions / Time Tracking ---
{
  key: 'tech-sessions',
  label: 'Active Techs',
  route: '/dashboard',
  highlightId: 'active-tech-sessions',
  toast: 'Active Technician Sessions',
  keywords: ['tech sessions', 'active techs', 'who is working', 'clock in', 'clock out', 'time tracking', 'tech time', 'labor clock'],
  icon: '⏱️',
},

// --- Add-On Metrics ---
{
  key: 'addon-metrics',
  label: 'Add-On Metrics',
  route: '/dashboard',
  highlightId: 'addon-metrics-card',
  toast: 'Add-On / Upsell Metrics',
  keywords: ['add-on metrics', 'addon', 'upsell', 'upsell rate', 'add-on approval', 'inspection add-ons', 'upsell tracking'],
  icon: '📊',
},

// --- Labor Types ---
{
  key: 'labor-types',
  label: 'Labor Types',
  route: '/work-orders',
  toast: 'Labor Type Classification — Customer Pay, Internal, Warranty',
  keywords: ['labor type', 'labor types', 'customer pay', 'internal', 'warranty', 'warranty labor', 'internal labor', 'pay type'],
  icon: '🏷️',
},

// --- Warranty ---
{
  key: 'warranty',
  label: 'Warranty Repairs',
  route: '/work-orders',
  toast: 'Warranty Service Lines',
  keywords: ['warranty', 'warranty repair', 'warranty parts', 'warranty claim', 'napa warranty', 'carquest warranty', 'vendor warranty'],
  icon: '🛡️',
},

// --- Declined Services ---
{
  key: 'declined-services',
  label: 'Declined Services',
  route: '/reports/declined-services',  // or wherever this lives — check routes
  toast: 'Declined Repairs & Follow-Up',
  keywords: ['declined', 'declined services', 'declined repairs', 'customer declined', 'follow up', 'follow-up', 'declined work'],
  icon: '❌',
},

// --- Follow-Up Campaigns ---
{
  key: 'campaigns',
  label: 'Follow-Up Campaigns',
  route: '/settings/campaigns',
  toast: 'Declined Repair Follow-Up Campaign Settings',
  keywords: ['campaigns', 'follow-up campaigns', 'follow up settings', 'declined follow-up', 'automated follow-up', 'email campaign', 'sms campaign', 'drip campaign'],
  icon: '📧',
},

// --- Monthly Summary Report ---
{
  key: 'report-monthly',
  label: 'Monthly Summary',
  route: '/reports/monthly-summary',
  toast: 'Monthly Summary Report',
  keywords: ['monthly summary', 'monthly report', 'month report', 'end of month', 'monthly numbers', 'monthly revenue', 'owner report'],
  icon: '📅',
},

// --- Advisor Performance Report ---
{
  key: 'report-advisor',
  label: 'Advisor Performance',
  route: '/reports/advisor-performance',
  toast: 'Service Advisor Performance Report',
  keywords: ['advisor performance', 'advisor report', 'service advisor', 'upsell performance', 'advisor metrics', 'advisor conversion', 'add-on rate'],
  icon: '👔',
},

// --- Tech Efficiency Report ---
{
  key: 'report-tech-efficiency',
  label: 'Tech Efficiency',
  route: '/reports/tech-efficiency',
  toast: 'Technician Efficiency Report',
  keywords: ['tech efficiency', 'technician efficiency', 'tech report', 'billed hours', 'actual hours', 'efficiency ratio', 'tech performance', 'flat rate', 'book time'],
  icon: '⚡',
},

// --- Locations ---
{
  key: 'locations',
  label: 'Shop Locations',
  route: '/settings/locations',  // or wherever location management lives
  toast: 'Shop Location Management',
  keywords: ['locations', 'shop locations', 'multi-location', 'multiple locations', 'second location', 'branches'],
  icon: '📍',
},

// --- Employee Numbers ---
{
  key: 'employee-numbers',
  label: 'Employee Setup',
  route: '/settings/staff',
  toast: 'Staff — Employee Numbers & PINs',
  keywords: ['employee number', 'employee numbers', 'tech number', 'advisor number', 'pin code', 'staff setup', 'employee id'],
  icon: '🔢',
},

// --- Customer Authorization ---
{
  key: 'authorization',
  label: 'Customer Authorization',
  route: '/work-orders',
  toast: 'Customer Repair Authorization',
  keywords: ['authorization', 'authorize', 'customer approval', 'repair approval', 'customer signature', 'sign off', 'approve repairs'],
  icon: '✍️',
},

// --- RO Print / Hard Card ---
{
  key: 'print-ro',
  label: 'Print Repair Order',
  route: '/work-orders',
  toast: 'Print or PDF a Repair Order (Hard Card)',
  keywords: ['print', 'print ro', 'hard card', 'print repair order', 'pdf', 'print invoice'],
  icon: '🖨️',
},

// --- Quick RO ---
{
  key: 'quick-ro',
  label: 'Quick Repair Order',
  route: '/work-orders/new',  // or the quick RO modal trigger route
  toast: 'Quick RO — Fast repair order creation',
  keywords: ['quick ro', 'quick repair order', 'fast ro', 'new ro', 'create repair order', 'new repair order'],
  icon: '⚡',
},
```

### CRITICAL: Match Routes to Actual Codebase

The routes above are my BEST GUESS based on what we planned. **You MUST scan the actual router configuration in the codebase and use the real routes.** Check:
- The router file (likely `client/src/App.tsx` or a routes file)
- The navigation menu component
- The sidebar or top nav component

For EVERY entry in the nav map, verify the `route` value actually exists in the router. If it doesn't, either:
1. The page was built but at a different route → update the nav map entry
2. The page doesn't exist yet → note it as missing (we'll build it)
3. The page is a sub-tab of another page → use the parent route with a hash or query param

### Update the AI System Prompt

Find the file that builds the AI help system prompt (likely `routes/aiHelp.ts` or similar — search for `buildNavSystemPrompt` or the string "Navigation Links" or "[[nav:").

The system prompt must be updated to tell Claude about all the new features. Add this section to the system prompt (in addition to whatever exists):

```
## New Features (recently added)

PCB Auto now has these new features that users may ask about:

**Estimates vs Repair Orders:** Estimates and Repair Orders are separate. Estimates are quotes that can be converted to ROs. They have different number sequences (EST-XXXXX vs XXXXX). Users can find estimates on the [[nav:estimates]] page and convert them to ROs from there.

**Labor Types:** Each service line on an RO now has TWO pay type classifications — one for parts and one for labor. The three types are Customer Pay (customer pays), Internal (shop absorbs the cost), and Warranty (covered by vendor warranty like NAPA or CarQuest). This is configured on each line in the [[nav:work-orders]] detail page. See [[nav:labor-types]] for more.

**Tech Portal:** Technicians now have their own view at [[nav:tech-portal]] where they can clock in and out of specific RO lines. This tracks exactly who worked on what and for how long. Techs log in with their employee number. No pricing is visible in the tech portal.

**Add-On Tracking:** Lines added after the initial RO creation are automatically flagged as add-ons with an asterisk (*). This tracks upsell effectiveness — how many add-on lines are presented to customers and how many are approved. See [[nav:addon-metrics]] on the dashboard.

**Declined Repair Follow-Ups:** When a customer declines a repair, it's automatically saved. The shop can configure automated follow-up emails or texts to be sent after a configurable number of days (e.g., 3, 7, 14 days). Configure this in [[nav:campaigns]].

**Reports:** Three new reports are available:
- [[nav:report-monthly]] — Total ROs, revenue, hours sold, average RO value, add-on rates
- [[nav:report-advisor]] — Per-advisor: ROs handled, add-on conversion rate, total revenue
- [[nav:report-tech-efficiency]] — Per-tech: billed hours vs actual hours, efficiency percentage

**Multi-Location RO Numbers:** RO numbers are prefixed by location number. Location 1 = 1XXXX, Location 2 = 2XXXX. Manage locations in [[nav:locations]].

**Customer Authorization:** Every repair and add-on must be authorized by the customer with timestamps. The system can send SMS confirmations via Twilio. Customer signatures can be captured digitally. See [[nav:authorization]].

**Employee Numbers:** Each tech and advisor has a unique employee number used throughout the system instead of names. Set these up in [[nav:employee-numbers]].

**Quick RO:** For fast repair order creation (e.g., just an inspection), use [[nav:quick-ro]].
```

### Update Contextual Suggestions

Find the code that returns page-specific quick-prompt suggestions (likely in the AI help route or a suggestions config). Add suggestions for the new pages:

```typescript
// Add to contextSuggestions map or equivalent

'/tech-portal': [
  { text: 'How do I clock into a repair order?', icon: '⏱️' },
  { text: 'Can I work on two lines at once?', icon: '🔧' },
  { text: 'What does the asterisk mean on a line?', icon: '❓' },
  { text: 'How do I see my completed work?', icon: '✅' },
],

'/estimates': [
  { text: 'How do I convert an estimate to an RO?', icon: '🔄' },
  { text: 'What is the difference between estimates and ROs?', icon: '❓' },
  { text: 'How do I create a new estimate?', icon: '📝' },
  { text: 'Can I link an estimate to an existing customer?', icon: '👤' },
],

'/reports/monthly-summary': [
  { text: 'What does this report show me?', icon: '📊' },
  { text: 'How is average RO value calculated?', icon: '💰' },
  { text: 'What is the add-on approval rate?', icon: '📈' },
  { text: 'Can I export this to Excel?', icon: '📥' },
],

'/reports/advisor-performance': [
  { text: 'How is advisor conversion rate calculated?', icon: '📊' },
  { text: 'What is a good add-on approval rate?', icon: '✅' },
  { text: 'How do I compare advisor performance?', icon: '👔' },
],

'/reports/tech-efficiency': [
  { text: 'What does efficiency percentage mean?', icon: '⚡' },
  { text: 'What is a good tech efficiency rate?', icon: '📊' },
  { text: 'How are billed hours calculated?', icon: '⏱️' },
  { text: 'What does the red/green flag mean?', icon: '🚦' },
],

'/settings/campaigns': [
  { text: 'How do follow-up campaigns work?', icon: '📧' },
  { text: 'What merge fields can I use in templates?', icon: '🔤' },
  { text: 'When are follow-up messages sent?', icon: '⏰' },
  { text: 'Can I send a test follow-up?', icon: '🧪' },
],
```

Also update existing page suggestions to reference new features where relevant:

```typescript
// Update dashboard suggestions to include new widgets
'/dashboard': [
  // ... keep existing suggestions ...
  { text: 'Who is currently working in the shop?', icon: '🔧' },
  { text: 'How are my advisors performing on upsells?', icon: '📊' },
  { text: 'Show me today\'s add-on metrics', icon: '📈' },
],

// Update work orders suggestions
'/work-orders': [
  // ... keep existing suggestions ...
  { text: 'How do labor types work?', icon: '🏷️' },
  { text: 'How do I mark a part as warranty?', icon: '🛡️' },
  { text: 'What does the asterisk on a line mean?', icon: '❓' },
  { text: 'How do I authorize add-on repairs?', icon: '✍️' },
],

// Update settings suggestions
'/settings': [
  // ... keep existing suggestions ...
  { text: 'How do I set up follow-up campaigns?', icon: '📧' },
  { text: 'Where do I set employee numbers?', icon: '🔢' },
  { text: 'How do I add a second shop location?', icon: '📍' },
],
```

---

## PART 5: AI HELP FUNCTIONAL TESTING

After updating the nav map and system prompt, test the AI Help Assistant with these exact questions. For each one, verify the response includes the correct navigation link AND that clicking the link navigates to the right place.

### Test Questions:

1. **"Where are my estimates?"**
   - Expected: Response mentions estimates page with [[nav:estimates]] link
   - Click link → navigates to estimates page

2. **"How do I convert an estimate to a repair order?"**
   - Expected: Explains the process, includes [[nav:estimates]] and/or [[nav:convert-estimate]] link

3. **"What is the tech portal?"**
   - Expected: Explains tech portal, includes [[nav:tech-portal]] link
   - Click link → navigates to /tech-portal

4. **"How do warranty repairs work?"**
   - Expected: Explains the parts/labor pay type system, includes [[nav:warranty]] or [[nav:labor-types]] link

5. **"How is my advisor doing?"**
   - Expected: Mentions the advisor performance report, includes [[nav:report-advisor]] link
   - Click link → navigates to advisor performance report page

6. **"What is tech efficiency?"**
   - Expected: Explains billed vs actual hours, includes [[nav:report-tech-efficiency]] link

7. **"Where do I set up follow-up campaigns?"**
   - Expected: Mentions campaign settings, includes [[nav:campaigns]] link
   - Click link → navigates to settings/campaigns

8. **"Who is working right now?"**
   - Expected: Explains the active tech sessions widget, includes [[nav:tech-sessions]] link

9. **"How do I clock in?"**
   - Expected: Explains the tech portal clock-in process, includes [[nav:tech-portal]] link

10. **"Show me my monthly numbers"**
    - Expected: Mentions the monthly summary report, includes [[nav:report-monthly]] link

11. **"How do add-on lines work?"**
    - Expected: Explains the add-on tracking system, includes [[nav:addon-metrics]] link

12. **"What are declined services?"**
    - Expected: Explains declined repair tracking and follow-ups, includes [[nav:declined-services]] and [[nav:campaigns]] links

### For Each Test:
- [ ] AI responds with relevant information (not a generic "I don't know")
- [ ] Navigation link(s) render as blue tappable pills (NOT raw [[nav:...]] text)
- [ ] Clicking the link closes the chat panel
- [ ] App navigates to the correct page
- [ ] If a highlightId is specified, the target element gets the blue pulse highlight animation
- [ ] Toast notification appears with the correct message

**If any nav link renders as raw text like [[nav:something]]**, the AIMessageRenderer parser is broken. Fix it. Common causes:
- The regex pattern doesn't match the token format
- The navMap lookup is failing (key mismatch)
- The renderer is escaping the brackets before parsing

**If a nav link navigates to the wrong page or a 404**, the route in the nav map is wrong. Update it to match the actual router config.

---

## PART 6: CROSS-CUTTING CHECKS

### Navigation Menu
- [ ] All new pages are accessible from the main navigation or sub-navigation
- [ ] Tech Portal has a nav link somewhere (main nav or dashboard)
- [ ] Estimates tab is reachable from the RO list page
- [ ] New report pages are in the Reports section
- [ ] Campaign Settings is in the Settings section

### Mobile Responsiveness
- [ ] Dashboard with new widgets renders on mobile (375px width)
- [ ] Tech Portal is usable on a tablet (768px width) — this is its primary use case
- [ ] RO detail page with new pay type dropdowns doesn't overflow on mobile
- [ ] AI Help chat panel works on mobile

### Data Flow
- [ ] Creating an estimate → converting to RO → adding lines → closing RO → checking reports = full data pipeline works
- [ ] Tech clock-in → work → clock-out → RO close → tech efficiency report = time tracking pipeline works
- [ ] Decline a line → check declined services → campaign settings configured → follow-up would send = campaign pipeline works

### Console Errors
- [ ] Open browser DevTools console on EVERY page listed above
- [ ] Zero JavaScript errors on every page
- [ ] Zero TypeScript type errors at build time
- [ ] Zero uncaught promise rejections
- [ ] Zero 404 errors for API calls

---

## PART 7: FINAL VERIFICATION

Run the app. Click through every single page in this order:

1. Dashboard → verify all widgets including new ones
2. Repair Orders → verify list with tab toggle
3. Create New Estimate → fill out, save
4. View Estimate → verify EST- number
5. Convert to RO → verify new RO number
6. RO Detail → test pay type dropdowns, add a line (should be flagged as add-on)
7. Tech Portal → login with employee number, clock in, clock out
8. Customers → verify list and detail pages
9. Vehicles → verify list
10. Inspections → verify list
11. Schedule → verify calendar
12. Reports → Monthly Summary, Advisor Performance, Tech Efficiency
13. Settings → Staff (employee numbers), Campaigns, all other sub-pages
14. AI Help → ask 3 different questions, verify nav links work

**If everything passes, we're done. If anything fails, fix it and re-test that section.**

Report back with:
1. Number of issues found
2. Number of issues fixed
3. Any issues that could NOT be fixed and why
4. Confirmation that all 12 AI help test questions produce working nav links
