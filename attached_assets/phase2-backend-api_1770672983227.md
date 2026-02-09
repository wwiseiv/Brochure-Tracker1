# PCB Auto — Repair Orders v2: PHASE 2 — Backend API Routes

## INSTRUCTIONS

This is Phase 2 of 4. **Phase 1 (database schema) must be completed first.** All the tables and columns referenced below must already exist in the database and in the Drizzle schema file.

In this phase, add new API routes and modify existing ones. **Do NOT touch any frontend/UI code yet.** Build the routes, test them with direct API calls or Drizzle Studio, and confirm they work before moving to Phase 3.

**Do NOT break existing routes.** All current RO endpoints must continue working exactly as they do now.

---

## 2A. ESTIMATE ROUTES

Estimates use the same `pcb_repair_orders` table but with `is_estimate = true` and their own numbering system.

### New Routes:

```
GET    /api/pcbauto/v1/estimates                -- List all estimates for tenant
POST   /api/pcbauto/v1/estimates                -- Create new estimate
GET    /api/pcbauto/v1/estimates/:id            -- Get estimate detail with service lines
PATCH  /api/pcbauto/v1/estimates/:id            -- Update estimate
POST   /api/pcbauto/v1/estimates/:id/convert    -- Convert estimate to RO
DELETE /api/pcbauto/v1/estimates/:id            -- Delete estimate (only if NOT converted)
```

### Create Estimate Logic:
1. Get or create the tenant's pcb_estimate_sequences row
2. Increment `current_number` atomically (SELECT ... FOR UPDATE, then UPDATE)
3. Generate estimate_number = `prefix + current_number` (e.g., "EST-10001")
4. Insert into pcb_repair_orders with `is_estimate = true`, `estimate_number = "EST-10001"`
5. The `ro_number` field should be NULL for estimates — they don't get RO numbers
6. Return the created estimate

### Convert Estimate to RO Logic:
1. Verify the estimate exists and `converted_to_ro_id` is NULL (not already converted)
2. Generate a new RO number using the location-based sequence (see 2B below)
3. Create a NEW pcb_repair_orders record with `is_estimate = false`, the generated RO number, and all the same customer/vehicle/line data copied from the estimate
4. Copy ALL pcb_service_lines from the estimate to the new RO (new UUIDs, same data)
5. Update the original estimate: set `converted_to_ro_id = newRO.id`
6. Update the new RO: set `converted_from_estimate_id = estimate.id`
7. Log event in pcb_ro_events: `event_type = 'estimate_converted'`
8. Return the new RO

### Modify Existing RO List Route:
The existing `GET /api/pcbauto/v1/repair-orders` (or whatever the current list route is) should:
- Add a query parameter: `?type=ro` (default) or `?type=estimate` or `?type=all`
- When `type=ro`: filter `WHERE is_estimate = false` (current behavior, keep as default)
- When `type=estimate`: filter `WHERE is_estimate = true`
- When `type=all`: no filter on is_estimate

---

## 2B. LOCATION ROUTES

```
GET    /api/pcbauto/v1/locations                -- List all locations for tenant
POST   /api/pcbauto/v1/locations                -- Create new location
PATCH  /api/pcbauto/v1/locations/:id            -- Update location details
```

### Auto-Create Default Location:
Add middleware or a check to the RO creation flow: if the tenant has NO locations in pcb_locations, auto-create one:
```
location_number = 1
name = "Main Shop" (or the tenant's business name)
is_primary = true
address = copy from tenant record if available
```
Also create the corresponding pcb_ro_sequences row with `current_number = 0`.

### RO Number Generation Utility:
Create a reusable server-side function. This is used by both RO creation and estimate-to-RO conversion.

```typescript
async function generateRONumber(tenantId: string, locationId: string): Promise<number> {
  // Must be in a transaction to prevent duplicates
  return await db.transaction(async (tx) => {
    // 1. Get location number
    const location = await tx.select()
      .from(pcbLocations)
      .where(eq(pcbLocations.id, locationId))
      .limit(1);

    const locationNumber = location[0].locationNumber; // e.g., 1, 2, 3

    // 2. Lock and increment the sequence
    const seq = await tx.select()
      .from(pcbRoSequences)
      .where(and(
        eq(pcbRoSequences.tenantId, tenantId),
        eq(pcbRoSequences.locationId, locationId)
      ))
      .for('update')  // row lock
      .limit(1);

    let nextNumber;
    if (seq.length === 0) {
      // First RO for this location — create sequence
      nextNumber = 1;
      await tx.insert(pcbRoSequences).values({
        tenantId,
        locationId,
        currentNumber: 1
      });
    } else {
      nextNumber = seq[0].currentNumber + 1;
      await tx.update(pcbRoSequences)
        .set({ currentNumber: nextNumber, updatedAt: new Date() })
        .where(eq(pcbRoSequences.id, seq[0].id));
    }

    // 3. Generate the RO number: location prefix + sequence
    // Location 1, sequence 42 = 10042
    // Location 2, sequence 1 = 20001
    const roNumber = (locationNumber * 10000) + nextNumber;
    return roNumber;
  });
}
```

### Update Existing RO Creation:
Modify the existing POST route for creating repair orders:
1. If no `location_id` is provided in the request, use the tenant's primary location
2. Call `generateRONumber(tenantId, locationId)` to get the RO number
3. Set `is_estimate = false` explicitly
4. Set `advisor_employee_id` from the request (should be required)
5. Set `mileage_in` from the request if provided

---

## 2C. TECH SESSION ROUTES

```
POST   /api/pcbauto/v1/tech-sessions/clock-in    -- Clock tech into a service line
POST   /api/pcbauto/v1/tech-sessions/clock-out    -- Clock tech out of current line
GET    /api/pcbauto/v1/tech-sessions/active        -- Get all active sessions for tenant
GET    /api/pcbauto/v1/tech-sessions/ro/:roId      -- Get all sessions for a specific RO
GET    /api/pcbauto/v1/tech-sessions/tech/:techId  -- Get session history for a tech
```

### Clock-In Request Body:
```json
{
  "tech_employee_id": "uuid",
  "service_line_id": "uuid",
  "repair_order_id": "uuid"
}
```

### Clock-In Logic:
```
1. Verify the tech, service line, and RO all exist and belong to the tenant
2. Check if this tech has an active session (is_active = true) anywhere
3. If yes:
   a. Auto-clock-out of that session (set clock_out = NOW())
   b. Calculate duration_minutes = EXTRACT(EPOCH FROM (NOW() - clock_in)) / 60, round to integer
   c. Set is_active = false
4. Create new pcb_tech_sessions record:
   - tenant_id, repair_order_id, service_line_id, tech_employee_id
   - clock_in = NOW()
   - is_active = true
5. Log event in pcb_ro_events: event_type = 'tech_clock_in', metadata includes tech_employee_id and line description
6. Return the new session with the auto-closed previous session if applicable
```

### Clock-Out Request Body:
```json
{
  "tech_employee_id": "uuid"
}
```

### Clock-Out Logic:
```
1. Find the tech's active session (is_active = true)
2. If no active session found, return 404 with message "Tech is not clocked into any line"
3. Set clock_out = NOW()
4. Calculate duration_minutes
5. Set is_active = false
6. Log event in pcb_ro_events: event_type = 'tech_clock_out'
7. Return the updated session
```

### Active Sessions Query:
Return all sessions where `is_active = true` for the tenant, joined with employee name/number, RO number, and service line description. This feeds the advisor dashboard.

---

## 2D. SERVICE LINE UPDATES

Modify the existing service line create/update routes to handle the new fields.

### When Creating a Service Line (after initial RO save):
- If the RO already has a `created_at` timestamp that is more than 60 seconds old, automatically set `line_origin = 'addon'`
- Always set `added_at = NOW()` and `added_by_user_id` from the authenticated user
- Default `parts_pay_type = 'customer_pay'` and `labor_pay_type = 'customer_pay'`

### When Updating a Service Line:
- Allow updating: `parts_pay_type`, `labor_pay_type`, `retail_value_override`, `warranty_vendor`, `warranty_claim_number`
- When `parts_pay_type` or `labor_pay_type` changes to 'internal' or 'warranty', require `retail_value_override` to be set (the retail amount for tax purposes)
- When approval_status changes to 'declined', automatically create a pcb_declined_services record:
  ```
  1. Copy customer_id, vehicle_id from the parent RO
  2. Copy service_description from the line's description
  3. Copy estimated_cost from the line's total (unit_price * quantity)
  4. Set declined_at = NOW()
  ```
- When approval_status changes to 'approved', set `authorization_timestamp = NOW()` and `customer_responded_at = NOW()`

---

## 2E. AUTHORIZATION ROUTES

```
POST   /api/pcbauto/v1/repair-orders/:id/authorize-addon    -- Record authorization for add-on lines
POST   /api/pcbauto/v1/repair-orders/:id/send-authorization  -- Send authorization request via SMS
POST   /api/pcbauto/v1/repair-orders/:id/signature           -- Save customer signature on RO
```

### Record Authorization:
```json
// Request body
{
  "line_ids": ["uuid1", "uuid2"],
  "method": "phone",  // in_person, phone, text, email, portal
  "approved": true
}
```
For each line_id:
1. Update `approval_status` to 'approved' or 'declined'
2. Set `authorization_method`, `authorization_timestamp = NOW()`, `customer_responded_at = NOW()`
3. If declined, create pcb_declined_services record
4. Log event in pcb_ro_events

### Send Authorization via SMS:
1. Get the customer's phone from the RO's linked customer record
2. Build message listing the add-on lines needing approval with descriptions and prices
3. Send via Twilio using the existing SMS integration
4. Store the Twilio message SID as `authorization_confirmation_id` on each line
5. Set `authorization_confirmation_sent = true`
6. Set `presented_to_customer = true`, `presented_at = NOW()`, `presented_by_advisor_id` from auth user
7. If there's an existing estimate approval portal link, include it in the SMS so customer can approve digitally

### Save Signature:
```json
{
  "signature_data": "data:image/png;base64,...",
  "method": "digital"  // digital, paper, verbal
}
```
1. Save to pcb_repair_orders: `customer_signature_data`, `customer_signature_timestamp = NOW()`, `customer_signature_ip` from request, `customer_signature_method`
2. Log event in pcb_ro_events: event_type = 'customer_signed'

---

## 2F. DECLINED SERVICES & CAMPAIGN ROUTES

```
GET    /api/pcbauto/v1/declined-services                      -- List declined services (with filters)
GET    /api/pcbauto/v1/declined-services/customer/:customerId  -- For a specific customer
GET    /api/pcbauto/v1/declined-services/pending-followup      -- Services needing follow-up
POST   /api/pcbauto/v1/declined-services/:id/send-followup     -- Send follow-up manually

GET    /api/pcbauto/v1/campaign-settings                       -- Get tenant's campaign settings
PUT    /api/pcbauto/v1/campaign-settings                       -- Update campaign settings
```

### Pending Follow-Up Query:
```sql
SELECT ds.*, c.first_name, c.last_name, c.email, c.phone,
       v.year, v.make, v.model
FROM pcb_declined_services ds
JOIN pcb_customers c ON ds.customer_id = c.id
JOIN pcb_vehicles v ON ds.vehicle_id = v.id
WHERE ds.tenant_id = $1
  AND ds.follow_up_sent = false
  AND ds.converted_to_ro_id IS NULL
ORDER BY ds.declined_at ASC;
```

### Send Follow-Up:
1. Get the declined service record
2. Get campaign settings for the tenant
3. Build the message using the template, replacing merge fields:
   - `{customer_name}` → customer first + last name
   - `{vehicle_year_make_model}` → "2019 Honda Accord"
   - `{service_description}` → the declined service description
   - `{shop_name}` → tenant business name
   - `{shop_phone}` → tenant phone
4. Send via the configured channel (email via Resend, SMS via Twilio, or both)
5. Update: `follow_up_sent = true`, `follow_up_sent_at = NOW()`

---

## 2G. RO CLOSE LOGIC

**Modify the existing route that changes RO status to 'completed' or 'closed'.** Add the snapshot generation step.

### When RO Status Changes to Closed/Completed:

```
1. Check for active tech sessions on this RO
   - Query: pcb_tech_sessions WHERE repair_order_id = roId AND is_active = true
   - If any found, auto-clock-out all of them (set clock_out = NOW(), calculate duration, set is_active = false, auto_clocked_out = true)

2. Query all service lines for this RO

3. Query all tech sessions for this RO (now all closed)

4. Build the snapshot record:
   - total_lines = count of all service lines
   - original_lines = count where line_origin = 'original'
   - addon_lines = count where line_origin IN ('addon', 'inspection')
   - inspection_lines = count where line_origin = 'inspection'
   - approved_addon_lines = count where line_origin != 'original' AND approval_status = 'approved'
   - declined_addon_lines = count where line_origin != 'original' AND approval_status = 'declined'
   - total_parts_revenue = SUM of (unit_price * quantity) for lines where line_type = 'part' AND parts_pay_type = 'customer_pay'
   - total_labor_revenue = SUM of (unit_price * quantity) for lines where line_type = 'labor' AND labor_pay_type = 'customer_pay'
   - total_fees_revenue = SUM for line_type IN ('fee', 'shop_supply')
   - total_sublet_revenue = SUM for line_type = 'sublet'
   - total_discount = SUM for line_type = 'discount'
   - total_customer_pay = sum of all customer_pay amounts
   - total_internal_charges = sum of retail_value_override for internal pay type lines
   - total_warranty_charges = sum of retail_value_override for warranty pay type lines
   - total_billed_hours = SUM of labor_hours across all labor lines
   - total_actual_hours = SUM of duration_minutes / 60 from all tech sessions
   - tech_summary = JSON array of per-tech aggregations

5. Insert into pcb_ro_close_snapshots

6. For any service lines with approval_status = 'declined' that don't already have a pcb_declined_services record, create one

7. Log event: event_type = 'ro_closed'

8. Continue with existing close logic (QBO sync, etc.)
```

This MUST happen in a single database transaction. If the snapshot insert fails, the RO should NOT be marked as closed.

---

## 2H. REPORTING ROUTES

```
GET /api/pcbauto/v1/reports/monthly-summary?start=YYYY-MM-DD&end=YYYY-MM-DD
GET /api/pcbauto/v1/reports/advisor-performance?start=YYYY-MM-DD&end=YYYY-MM-DD&advisor_id=UUID
GET /api/pcbauto/v1/reports/tech-efficiency?start=YYYY-MM-DD&end=YYYY-MM-DD&tech_id=UUID
```

### Monthly Summary Query:
```sql
SELECT
  COUNT(*) as total_ros,
  COALESCE(AVG(total_lines), 0) as avg_lines_per_ro,
  COALESCE(AVG(addon_lines), 0) as avg_addon_lines_per_ro,
  COALESCE(SUM(total_billed_hours), 0) as total_hours_sold,
  COALESCE(SUM(total_labor_revenue), 0) as total_labor_revenue,
  COALESCE(SUM(total_parts_revenue), 0) as total_parts_revenue,
  COALESCE(SUM(total_fees_revenue), 0) as total_fees_revenue,
  COALESCE(AVG(total_customer_pay), 0) as avg_ro_value,
  COALESCE(SUM(total_customer_pay), 0) as total_revenue,
  COALESCE(SUM(total_internal_charges), 0) as total_internal_charges,
  COALESCE(SUM(total_warranty_charges), 0) as total_warranty_charges,
  CASE WHEN SUM(addon_lines) > 0
    THEN ROUND(SUM(approved_addon_lines)::numeric / NULLIF(SUM(addon_lines), 0) * 100, 1)
    ELSE 0 END as addon_approval_rate_pct
FROM pcb_ro_close_snapshots
WHERE tenant_id = $1
  AND closed_at >= $2::timestamptz
  AND closed_at < $3::timestamptz;
```

### Advisor Performance Query:
Same as above but add `GROUP BY advisor_employee_id` and JOIN with pcb_employees for name/number. If `advisor_id` param is provided, filter to that advisor. Otherwise return all advisors.

### Tech Efficiency Query:
```sql
SELECT
  t.tech_employee_id,
  e.employee_number,
  e.first_name || ' ' || e.last_name as tech_name,
  COUNT(DISTINCT t.service_line_id) as lines_completed,
  COALESCE(SUM(t.duration_minutes), 0) / 60.0 as actual_hours,
  COALESCE(SUM(sl.labor_hours), 0) as billed_hours,
  CASE WHEN SUM(t.duration_minutes) > 0
    THEN ROUND(SUM(sl.labor_hours)::numeric / NULLIF(SUM(t.duration_minutes) / 60.0, 0) * 100, 1)
    ELSE 0 END as efficiency_pct
FROM pcb_tech_sessions t
JOIN pcb_employees e ON t.tech_employee_id = e.id
LEFT JOIN pcb_service_lines sl ON t.service_line_id = sl.id
WHERE t.tenant_id = $1
  AND t.clock_in >= $2::timestamptz
  AND t.clock_in < $3::timestamptz
  AND t.clock_out IS NOT NULL
GROUP BY t.tech_employee_id, e.employee_number, e.first_name, e.last_name
ORDER BY efficiency_pct DESC;
```

---

## AFTER COMPLETING PHASE 2

1. Test every new route using Drizzle Studio or direct HTTP calls
2. Create a test estimate, verify it gets an EST- number
3. Convert the test estimate to an RO, verify it gets a location-based RO number
4. Test clock-in/clock-out — verify a tech can only be clocked into one line at a time
5. Test RO close — verify the snapshot is created with correct aggregations
6. Verify all existing RO functionality still works (create, update, list, delete)
7. Start the app and confirm no errors

Do NOT move to Phase 3 (frontend) until all routes are tested and working.
