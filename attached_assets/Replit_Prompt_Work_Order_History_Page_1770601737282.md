# REPLIT TASK: Build Work Order & Invoice History — Search, Filter, Lookup

## PRIORITY: CRITICAL — This is a core feature that is currently missing

---

## What's Missing

There is currently no way to look up past work orders, invoices, estimates, or quotes in PCB Auto. A service advisor at the counter needs to be able to:

- Find a customer's previous repair orders instantly
- Look up all paid invoices for a date range
- Find all open/unpaid invoices
- Search by customer name, phone, vehicle, RO number, or VIN
- Filter by status (Quote, Estimate, Approved, In Progress, Invoiced, Paid, Void)
- See the dollar amount, date, status, customer, and vehicle at a glance
- Click into any RO to view the full detail

This page should be **the most-used page in the entire application** after the dashboard.

---

## What To Build

### New Page: Work Order History (or "Repair Orders" / "History")

**URL Route:** `/repair-orders` or `/work-orders` (use whatever convention the app already follows)

**Nav Placement:** This should be a PRIMARY navigation item in the sidebar — not buried in a submenu. It should be near the top, right after Dashboard. Label it "Repair Orders" or "Work Orders".

---

## Page Layout

### Top Section: Search Bar + Filters

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔍 Search by customer name, phone, vehicle, VIN, or RO #          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Status: All ▼│ │ Date Range ▼ │ │ Sort: ▼  │ │ Export CSV 📥│   │
│  └──────────────┘ └──────────────┘ └──────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

**Search Bar:**
- Full-width text input at the top
- Searches across: customer first name, last name, phone number, email, vehicle year/make/model, VIN, and RO number
- Search should be instant (filter as you type) OR on Enter — whichever pattern the app already uses
- Placeholder text: "Search by customer, phone, vehicle, VIN, or RO #..."

**Status Filter Dropdown:**
- Options: All, Quote, Estimate, Approved, In Progress, Invoiced, Paid, Void/Cancelled
- Default: "All"
- When a status is selected, the table immediately filters
- Show a count badge next to each status if possible (e.g., "Paid (47)")

**Quick Filter Buttons (optional but very useful):**
- Row of clickable tabs/pills above the table:
  `All  |  Open  |  In Progress  |  Invoiced  |  Paid  |  Quotes`
- These are just shortcuts for the status dropdown
- Active tab should be visually highlighted

**Date Range Filter:**
- Preset options: Today, This Week, This Month, Last 30 Days, Last 90 Days, This Year, All Time, Custom Range
- Custom Range opens a date picker with Start Date and End Date
- Default: "All Time" (or "Last 90 Days" for performance)

**Sort Options:**
- Date (newest first) — DEFAULT
- Date (oldest first)
- Customer Name (A-Z)
- Amount (highest first)
- Amount (lowest first)
- Status

**Export Button:**
- Exports the currently filtered view as CSV
- Includes: RO #, Date, Customer Name, Vehicle, Status, Subtotal, Tax, Total, Paid Amount, Balance Due

---

### Main Section: Work Order Table

```
┌────────┬────────────┬──────────────────┬───────────────────┬───────────┬──────────┬──────────┬─────────┐
│ RO #   │ Date       │ Customer         │ Vehicle           │ Status    │ Total    │ Balance  │ Actions │
├────────┼────────────┼──────────────────┼───────────────────┼───────────┼──────────┼──────────┼─────────┤
│ 1047   │ 02/08/2025 │ Mike Tarrabini   │ 2019 Honda Accord │ ● Paid    │ $1,247.83│ $0.00    │ 👁 ✏️ 🖨 │
│ 1046   │ 02/07/2025 │ Sarah Johnson    │ 2021 Toyota Camry │ ● Invoiced│ $892.50  │ $892.50  │ 👁 ✏️ 🖨 │
│ 1045   │ 02/06/2025 │ James Wilson     │ 2018 Ford F-150   │ ● In Prog │ $2,340.00│ $2,340.00│ 👁 ✏️ 🖨 │
│ 1044   │ 02/05/2025 │ Lisa Chen        │ 2020 BMW X3       │ ○ Quote   │ $675.00  │ —        │ 👁 ✏️ 🖨 │
└────────┴────────────┴──────────────────┴───────────────────┴───────────┴──────────┴──────────┴─────────┘
                                                                         Showing 1-25 of 142  < 1 2 3 4 5 6 >
```

**Table Columns:**

| Column | Description | Sortable? |
|--------|-------------|-----------|
| RO # | Auto-incrementing repair order number | Yes |
| Date | Date created (or date of last status change) — format: MM/DD/YYYY | Yes |
| Customer | Full name, clickable → goes to customer profile | Yes |
| Vehicle | Year Make Model (e.g., "2019 Honda Accord") | Yes |
| Status | Color-coded badge (see below) | Yes |
| Total | Invoice total with dual pricing (show card price by default, or cash — be consistent) | Yes |
| Balance | Amount still owed. $0.00 if fully paid. Shows the unpaid amount if partially paid. | Yes |
| Actions | View (eye icon), Edit (pencil), Print/PDF (printer icon) | No |

**Status Badges (color-coded):**

| Status | Color | Badge Style |
|--------|-------|-------------|
| Quote | Gray | ○ outline |
| Estimate | Blue | ○ outline |
| Approved | Blue | ● filled |
| In Progress | Orange/Yellow | ● filled |
| Invoiced | Purple | ● filled |
| Paid | Green | ● filled |
| Void / Cancelled | Red | ● filled, strikethrough or dimmed row |

**Row Click Behavior:**
- Clicking anywhere on a row (not just the eye icon) should open the full RO detail page
- Rows should have a hover effect (slight highlight) to indicate they're clickable

**Pagination:**
- 25 rows per page by default
- Show "Showing 1-25 of 142" with page navigation
- Or use infinite scroll if the app already uses that pattern

---

### Action Column Details

**View (👁 eye icon):**
- Opens the full repair order detail page
- Should show all line items, customer info, vehicle info, notes, payment history, inspection link (if any)

**Edit (✏️ pencil icon):**
- Opens the RO in edit mode
- Only available for non-Paid, non-Void statuses (you shouldn't be editing a paid invoice without voiding it first)
- For Paid ROs, the edit button should be dimmed or hidden

**Print / PDF (🖨 printer icon):**
- Generates a printable view or PDF of the invoice/estimate
- Should include: shop name/address, customer info, vehicle info, all line items with dual pricing, totals, payment status
- Opens in a new tab or triggers a download

---

### Empty State

If there are no repair orders at all (new shop, no data):

```
┌─────────────────────────────────────────────────┐
│                                                   │
│        🔧  No Repair Orders Yet                  │
│                                                   │
│   Create your first repair order to get started.  │
│                                                   │
│        [ + New Repair Order ]                     │
│                                                   │
└─────────────────────────────────────────────────┘
```

If a search/filter returns no results:

```
┌─────────────────────────────────────────────────┐
│                                                   │
│        🔍  No results found                      │
│                                                   │
│   Try adjusting your search or filters.           │
│                                                   │
│        [ Clear Filters ]                          │
│                                                   │
└─────────────────────────────────────────────────┘
```

---

### Summary Stats Bar (above the table)

A small stats bar showing totals for the current filter:

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Total ROs    │ Total Billed │ Total Paid   │ Outstanding  │ Avg Ticket   │
│    142       │  $87,432.50  │  $71,200.00  │  $16,232.50  │   $615.72    │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

These numbers should update when filters change. For example, if you filter to "This Month" + "Paid", the stats show only paid ROs from this month.

---

## Database Query Requirements

The page needs to query repair orders with JOINs to:
- **Customers** (for name, phone, email)
- **Vehicles** (for year, make, model, VIN)
- **Payments** (to calculate balance due)
- **Line Items** (to calculate totals if not stored on the RO record)

### Key Queries:

**All ROs with customer and vehicle info:**
```sql
SELECT 
  ro.id, ro.ro_number, ro.created_at, ro.status, ro.total, ro.subtotal, ro.tax,
  c.first_name, c.last_name, c.phone, c.email,
  v.year, v.make, v.model, v.vin,
  COALESCE(SUM(p.amount), 0) as paid_amount,
  (ro.total - COALESCE(SUM(p.amount), 0)) as balance_due
FROM repair_orders ro
LEFT JOIN customers c ON ro.customer_id = c.id
LEFT JOIN vehicles v ON ro.vehicle_id = v.id
LEFT JOIN payments p ON p.repair_order_id = ro.id
WHERE ro.shop_id = $1
GROUP BY ro.id, c.id, v.id
ORDER BY ro.created_at DESC
LIMIT 25 OFFSET $2
```

**Search query (add WHERE clauses):**
```sql
AND (
  c.first_name ILIKE '%search%' 
  OR c.last_name ILIKE '%search%'
  OR c.phone ILIKE '%search%'
  OR c.email ILIKE '%search%'
  OR v.vin ILIKE '%search%'
  OR CONCAT(v.year, ' ', v.make, ' ', v.model) ILIKE '%search%'
  OR ro.ro_number::text ILIKE '%search%'
)
```

**Status filter:**
```sql
AND ro.status = $3
```

**Date range filter:**
```sql
AND ro.created_at >= $4 AND ro.created_at <= $5
```

Adjust column/table names to match whatever the actual database schema uses. The above is the intent — adapt to the real schema.

---

## API Endpoints Needed

If these don't exist, create them:

### GET /api/repair-orders
Query params:
- `search` — search string
- `status` — filter by status
- `from` — start date (ISO)
- `to` — end date (ISO)
- `sort` — column to sort by
- `order` — asc or desc
- `page` — page number
- `limit` — results per page (default 25)

Response:
```json
{
  "data": [
    {
      "id": 123,
      "ro_number": 1047,
      "created_at": "2025-02-08T14:30:00Z",
      "status": "paid",
      "subtotal": 1147.83,
      "tax": 100.00,
      "total": 1247.83,
      "paid_amount": 1247.83,
      "balance_due": 0.00,
      "customer": {
        "id": 45,
        "first_name": "Mike",
        "last_name": "Tarrabini",
        "phone": "209-555-1234"
      },
      "vehicle": {
        "id": 67,
        "year": 2019,
        "make": "Honda",
        "model": "Accord",
        "vin": "1HGCV1F34KA000000"
      }
    }
  ],
  "total": 142,
  "page": 1,
  "limit": 25,
  "stats": {
    "total_ros": 142,
    "total_billed": 87432.50,
    "total_paid": 71200.00,
    "outstanding": 16232.50,
    "avg_ticket": 615.72
  }
}
```

### GET /api/repair-orders/:id
Returns full RO detail with all line items, payments, inspection reference, notes, and audit trail.

### GET /api/repair-orders/:id/pdf
Returns a PDF of the invoice/estimate for printing or download.

---

## UI/UX Requirements

- **Speed matters.** This page will be used dozens of times per day. Search should be fast. Filters should be instant. Pagination should not require a full page reload.
- **Mobile responsive.** On mobile, the table should either become a card list (one RO per card) or be horizontally scrollable. The search bar and filters should stack vertically on mobile.
- **Keyboard friendly.** Pressing Enter in the search bar should trigger search. Tab should move through filters logically.
- **Consistent with existing app.** Use the same component library, colors, fonts, spacing, and patterns already in PCB Auto. This page should feel native, not bolted on.

---

## Seed Data

If the database is empty and there are no repair orders to display, **create 10-15 sample repair orders** across different statuses so the page isn't blank during development and demo:

- 3-4 Paid (various dates in last 30 days)
- 2-3 Invoiced (last 7 days)
- 2-3 In Progress (current)
- 1-2 Quotes/Estimates (current)
- 1 Void/Cancelled

Each should have a customer, a vehicle, 2-4 line items (mix of labor and parts), and realistic totals ($200 - $3,000 range). Use realistic auto repair descriptions (brake job, oil change, timing belt, AC recharge, check engine diagnosis, etc.).

---

## Connection to Existing Features

- **Customer page:** If a customer profile page exists, add a "Work Order History" section/tab showing all ROs for that customer (filtered view of the same data)
- **Vehicle page:** If a vehicle detail page exists, add a "Service History" section showing all ROs for that vehicle
- **Dashboard:** If dashboard widgets show stats, make sure the "Total Revenue" or "Open ROs" numbers link to this page with the appropriate filter pre-applied
- **New RO button:** The page should have a prominent "+ New Repair Order" button in the top-right that goes to the RO creation flow

---

## DO NOT

- ❌ Build this as a separate/disconnected page — it must integrate with existing routing and navigation
- ❌ Skip the search functionality — this is the single most important feature of the page
- ❌ Show all columns on mobile — use a responsive card layout or hide less-important columns
- ❌ Forget pagination — loading 500+ ROs at once will destroy performance
- ❌ Skip the empty state — a blank table with no message is unacceptable
- ❌ Forget to wire up the action buttons (view, edit, print)
- ❌ Use the word "surcharge" anywhere

---

## Test Checklist

```
☐ Page loads without errors
☐ Nav link goes to correct page and is highlighted when active
☐ Search works (by name, phone, vehicle, VIN, RO number)
☐ Status filter works (each status, plus "All")
☐ Date range filter works (presets and custom range)
☐ Sort works (each column, asc and desc)
☐ Table renders with correct data
☐ Status badges show correct colors
☐ Balance column shows $0.00 for paid, correct balance for unpaid
☐ Clicking a row opens the RO detail
☐ View button works
☐ Edit button works (disabled for Paid/Void)
☐ Print/PDF button generates output
☐ Pagination works (next/previous/specific page)
☐ Summary stats update when filters change
☐ Empty state displays when no data
☐ "No results" state displays when search/filter returns nothing
☐ "+ New Repair Order" button works
☐ Export CSV button works
☐ Page is responsive on mobile
☐ Page loads fast (under 2 seconds)
☐ No console errors
```
