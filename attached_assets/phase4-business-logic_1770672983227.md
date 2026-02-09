# PCB Auto — Repair Orders v2: PHASE 4 — Business Logic & Background Jobs

## INSTRUCTIONS

This is Phase 4 of 4 (final phase). **Phases 1-3 must be completed first.** The database schema, API routes, and frontend UI must all be working before this phase.

This phase adds automated background jobs, business rule enforcement, and integration logic that ties everything together. These are the systems that run without user interaction — schedulers, triggers, and validation rules.

---

## 4A. AUTO CLOCK-OUT SCHEDULER

Technicians sometimes forget to clock out. The system needs to catch this automatically.

### What to Build:
A background job that runs on a schedule (every hour, or at a configurable time like 7:00 PM daily).

### Logic:
```
1. Query pcb_tech_sessions WHERE is_active = true
2. For each active session, check if clock_in is more than MAX_HOURS ago
   - MAX_HOURS should be configurable per tenant (default: 10 hours)
   - Store as a setting in pcb_campaign_settings or a new pcb_shop_settings table
3. For sessions exceeding MAX_HOURS:
   a. Set clock_out = NOW()
   b. Calculate duration_minutes = EXTRACT(EPOCH FROM (clock_out - clock_in)) / 60
   c. Set is_active = false
   d. Set auto_clocked_out = true
   e. Log event in pcb_ro_events:
      event_type = 'auto_clock_out'
      metadata = { tech_employee_id, service_line_id, hours_elapsed, reason: 'exceeded_max_hours' }
4. After processing, log a summary: "Auto-clocked out X techs"
```

### Implementation Options for Replit:
Since Replit doesn't have a native cron scheduler, use one of these approaches:
- **Option A (recommended):** Use `setInterval` in your server startup to run the check every hour
- **Option B:** Use a simple endpoint `POST /api/pcbauto/v1/admin/run-auto-clockout` that can be called by an external cron service (like cron-job.org) or manually
- **Option C:** Run the check as part of the daily closing routine (when the last RO of the day is closed)

```typescript
// Example: Option A — interval in server.ts
import { autoClockOutExpiredSessions } from './jobs/autoClockOut';

// Run every hour
setInterval(async () => {
  try {
    const count = await autoClockOutExpiredSessions();
    if (count > 0) {
      console.log(`[Auto Clock-Out] Closed ${count} expired tech sessions`);
    }
  } catch (err) {
    console.error('[Auto Clock-Out] Error:', err);
  }
}, 60 * 60 * 1000); // every 60 minutes
```

---

## 4B. DECLINED REPAIR FOLLOW-UP SCHEDULER

Automatically send follow-up emails/texts to customers who declined repairs, based on the shop's configured timing.

### What to Build:
A background job that runs daily (or every few hours).

### Logic:
```
1. Query all tenants where pcb_campaign_settings.declined_followup_enabled = true
2. For each tenant, get their follow-up day intervals (e.g., [3, 7, 14])
3. For each day interval, query pcb_declined_services WHERE:
   - tenant_id = current tenant
   - follow_up_sent = false
   - converted_to_ro_id IS NULL (customer hasn't already booked the repair)
   - declined_at + interval_days <= NOW()
   - declined_at + interval_days > NOW() - INTERVAL '1 day'
     (this prevents re-sending if the job runs multiple times)
4. For each matching declined service:
   a. Get the customer's contact info (email, phone)
   b. Get the campaign template for this tenant
   c. Replace merge fields in the template:
      - {customer_name} → customer first_name + " " + last_name
      - {vehicle_year_make_model} → vehicle year + " " + make + " " + model
      - {service_description} → declined service description
      - {shop_name} → tenant business name
      - {shop_phone} → tenant phone number
   d. Send the message:
      - If channel = 'email': Use Resend (existing integration)
      - If channel = 'sms': Use Twilio (existing integration)
      - If channel = 'both': Send both
   e. Update the declined service record:
      - follow_up_sent = true
      - follow_up_sent_at = NOW()
   f. Log event in pcb_ro_events for the original RO:
      event_type = 'declined_followup_sent'
      metadata = { declined_service_id, channel, customer_id }
```

### Default Templates (if tenant hasn't customized):

**Email:**
```
Subject: Recommended Service for Your {vehicle_year_make_model}

Hi {customer_name},

During your recent visit to {shop_name}, our technician recommended the following service for your {vehicle_year_make_model}:

• {service_description}

This recommendation was made to help keep your vehicle running safely and reliably. We wanted to follow up in case you'd like to schedule this service.

Give us a call at {shop_phone} or reply to this email to set up an appointment.

Thank you,
{shop_name}
```

**SMS:**
```
Hi {customer_name}, this is {shop_name}. We recommended {service_description} for your {vehicle_year_make_model} during your recent visit. Ready to schedule? Call {shop_phone}. Reply STOP to opt out.
```

### Scheduler Setup:
Same pattern as 4A — use `setInterval` to run every 4 hours, or create a callable endpoint.

```typescript
// Run every 4 hours
setInterval(async () => {
  try {
    const results = await processDeclinedFollowUps();
    if (results.sent > 0) {
      console.log(`[Follow-Up Campaign] Sent ${results.sent} follow-ups across ${results.tenants} tenants`);
    }
  } catch (err) {
    console.error('[Follow-Up Campaign] Error:', err);
  }
}, 4 * 60 * 60 * 1000);
```

---

## 4C. RO CLOSE VALIDATION & ENFORCEMENT

Add validation rules that run when an RO status changes to 'completed' or 'closed'.

### Validation Checks (run BEFORE allowing close):

```
1. ACTIVE TECH SESSIONS CHECK
   - Query pcb_tech_sessions WHERE repair_order_id = roId AND is_active = true
   - If any found:
     a. Return a warning to the frontend: "Tech #104 is still clocked into Line 2. Clock out before closing?"
     b. Offer options: [Auto Clock-Out All & Close] or [Cancel]
     c. If user confirms, auto-clock-out all active sessions before proceeding

2. UNSIGNED RO WARNING
   - If customer_signature_data is NULL:
     a. Return a warning: "Customer has not signed this RO. Close anyway?"
     b. Allow override (some shops get signatures on paper)

3. MILEAGE CHECK
   - If mileage_in is NULL:
     a. Return a warning: "Mileage was not recorded. Enter mileage before closing?"
     b. Allow override

4. PENDING ADD-ON LINES
   - Query service lines WHERE line_origin != 'original' AND approval_status = 'pending'
   - If any found:
     a. Return a warning: "3 add-on lines are still pending customer approval."
     b. Offer: [Mark as Declined & Close] or [Cancel]
     c. If user confirms, set pending add-ons to 'declined' and create declined_services records
```

### Post-Close Actions (run AFTER status change, in a transaction):
This is the snapshot generation from Phase 2, section 2G. Ensure it runs as part of the close flow:

1. Auto-clock-out any remaining active sessions
2. Generate the pcb_ro_close_snapshots record
3. Create pcb_declined_services records for any declined lines
4. Update vehicle mileage: set pcb_vehicles.mileage_last_known = mileage_out (if provided)
5. Log pcb_ro_events: event_type = 'ro_closed'
6. Trigger QBO sync if connected (existing functionality)

---

## 4D. ADD-ON LINE AUTO-DETECTION

When a new service line is created on an existing RO, automatically determine if it's an add-on.

### Logic (in the service line creation handler):

```typescript
async function determineLineOrigin(repairOrderId: string, requestSource?: string): Promise<string> {
  // If explicitly marked as inspection-generated
  if (requestSource === 'inspection' || requestSource === 'dvi') {
    return 'inspection';
  }

  // Get the RO creation timestamp
  const ro = await db.select({ createdAt: pcbRepairOrders.createdAt })
    .from(pcbRepairOrders)
    .where(eq(pcbRepairOrders.id, repairOrderId))
    .limit(1);

  if (!ro.length) return 'original';

  const roCreatedAt = new Date(ro[0].createdAt);
  const now = new Date();
  const secondsSinceCreation = (now.getTime() - roCreatedAt.getTime()) / 1000;

  // If the RO was created more than 5 minutes ago, this is an add-on
  // 5 minutes gives the advisor time to finish entering the initial lines
  if (secondsSinceCreation > 300) {
    return 'addon';
  }

  return 'original';
}
```

Use this function every time a new service line is created. Set the result as `line_origin` on the new line.

---

## 4E. SMS AUTHORIZATION CONFIRMATION

When an add-on line is approved (approval_status changes from 'pending' to 'approved'), send an SMS confirmation to the customer as proof of authorization.

### Trigger:
Add this to the service line update handler (or the authorize-addon route):

```typescript
async function sendAuthorizationConfirmation(repairOrderId: string, lineId: string) {
  // 1. Get the RO with customer info
  const ro = await getROWithCustomer(repairOrderId);
  if (!ro || !ro.customer?.phone) return;

  // 2. Get the service line
  const line = await getServiceLine(lineId);
  if (!line) return;

  // 3. Get tenant info for shop name
  const tenant = await getTenant(ro.tenantId);

  // 4. Build the confirmation message
  const message = `${tenant.businessName}: You authorized the following repair on your ${ro.vehicle.year} ${ro.vehicle.make} ${ro.vehicle.model}:\n` +
    `- ${line.description}\n` +
    `Authorized at ${new Date().toLocaleString()}.\n` +
    `Questions? Call ${tenant.phone}. Reply STOP to opt out.`;

  // 5. Send via Twilio (use existing SMS integration)
  const result = await sendSMS(ro.customer.phone, message);

  // 6. Update the service line with confirmation details
  await db.update(pcbServiceLines)
    .set({
      authorizationConfirmationSent: true,
      authorizationConfirmationId: result.sid, // Twilio message SID
    })
    .where(eq(pcbServiceLines.id, lineId));

  // 7. Log event
  await logROEvent(repairOrderId, 'authorization_sms_sent', {
    lineId,
    customerPhone: ro.customer.phone,
    twilioSid: result.sid
  });
}
```

### When to Send:
- Only for add-on lines (`line_origin != 'original'`)
- Only when approval_status changes TO 'approved'
- Only if the customer has a phone number on file
- Only if the shop has Twilio configured

---

## 4F. DEFAULT DATA SEEDING

When a new tenant is set up (or for existing tenants missing this data), ensure these defaults exist:

### Auto-Create on First RO Attempt:
```
1. If pcb_locations has no rows for this tenant:
   - Create Location 1: location_number=1, name="Main Shop", is_primary=true
   - Create pcb_ro_sequences: location_id=new location, current_number=0

2. If pcb_estimate_sequences has no row for this tenant:
   - Create: current_number=10000, prefix="EST-"

3. If pcb_campaign_settings has no row for this tenant:
   - Create with defaults: enabled=true, days=[3,7,14], channel='email'
   - Use the default email and SMS templates from 4B
```

### Employee Number Auto-Generation:
When creating a new employee in pcb_employees and `employee_number` is not provided:
```
1. Query MAX(employee_number::integer) for this tenant
2. If none exist, start at 101
3. Otherwise, increment by 1
4. Set as the new employee's number
```

---

## 4G. EVERY-VEHICLE-NEEDS-AN-RO ENFORCEMENT

The consultant was emphatic: every vehicle in the shop MUST have an RO. While we can't physically prevent a car from entering the bay, we can add system-level reminders.

### Implementation:
Add a check on the Schedule/Calendar page (if it exists):
- If a vehicle is scheduled for today and does NOT have an open RO, show a red warning banner: "⚠️ 2019 Honda Accord (Smith) is scheduled for today but has no Repair Order. [Create RO]"

On the Dashboard:
- If there are appointments today without corresponding ROs, show an alert card

This is more of a UX reminder than a hard block — the system can't prevent someone from physically driving a car in, but it should make it very obvious when the paperwork is missing.

---

## 4H. QUICK RO CREATION

Add a "Quick RO" flow for vehicles that just need an inspection or simple one-line service. This makes it easy to comply with the every-vehicle-needs-an-RO rule.

### Quick RO Button (on Dashboard or RO list):
When clicked, show a minimal form:
```
┌────────────────────────────────────────┐
│  Quick Repair Order                     │
│  ──────────────────                     │
│                                         │
│  Customer: [ search/select        ▼ ]   │
│  Vehicle:  [ auto-populated       ▼ ]   │
│  Advisor:  [ current user            ]  │
│  Mileage:  [ __________ ]              │
│                                         │
│  Service:  [ Vehicle Inspection    ▼ ]  │
│            [ Oil Change               ] │
│            [ Tire Rotation            ] │
│            [ Custom...                ] │
│                                         │
│        [ Cancel ]  [ Create RO ]        │
└────────────────────────────────────────┘
```

1. Select customer (search existing or quick-add)
2. Select vehicle (auto-populated from customer)
3. Advisor defaults to current logged-in user
4. Pick from common services or type custom
5. Creates the RO with one line, generates number, done

This should take less than 30 seconds.

---

## AFTER COMPLETING PHASE 4

### Full System Test Checklist:

1. **Create an estimate** → Verify it gets an EST- number
2. **Convert the estimate to an RO** → Verify it gets a location-based number (e.g., 10001)
3. **Add service lines to the RO** with different pay types:
   - Line 1: Customer Pay (both parts and labor)
   - Line 2: Warranty part, Customer Pay labor
   - Line 3: Internal (both) — verify retail_value_override is required
4. **Clock a tech into Line 1** from the Tech Portal → Verify no pricing visible
5. **Clock the tech out** → Verify duration is calculated
6. **Clock the tech into Line 2** → Verify auto-clock-out of Line 1
7. **Add an add-on line** to the RO → Verify it's flagged with asterisk/badge
8. **Approve the add-on** → Verify SMS confirmation is sent (if Twilio configured)
9. **Decline another add-on** → Verify it appears in pcb_declined_services
10. **Close the RO** → Verify:
    - Active tech sessions are closed
    - Snapshot is created in pcb_ro_close_snapshots
    - Declined services are recorded
11. **Check reports** → Verify monthly summary, advisor, and tech reports show data
12. **Wait for follow-up scheduler** → Or trigger manually, verify declined repair email/SMS sends
13. **Check dashboard** → Active techs widget, add-on metrics, balance filter
14. **Print the RO** → Verify hard card format with all required fields
15. **Create a Quick RO** → Verify the fast flow works

### If Everything Passes:
The Repair Orders v2 update is complete. The system now supports:
- Separate estimate and RO numbering
- Multi-location RO numbering
- Per-line labor type classification (Customer Pay / Internal / Warranty)
- Technician clock in/out per line with time tracking
- Add-on line detection and upsell metrics
- Customer authorization documentation with SMS confirmation
- Declined repair tracking with automated follow-up campaigns
- Immutable RO close snapshots for monthly reporting
- Advisor performance and tech efficiency reports
- Quick RO creation for compliance

The consultant's next round of feedback will build on this foundation.
