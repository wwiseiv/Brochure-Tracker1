/**
 * PCB Auto — Enhanced Dashboard API Routes
 * 
 * Add these to your Express router.
 * Assumes you have:
 *   - req.tenantId (from auth middleware)
 *   - req.user with { id, role } (from auth middleware)
 *   - db (your Drizzle instance)
 *   - All pcb_* tables imported from schema
 */

import { Router, Request, Response } from "express";
import { eq, and, sql, gte, lte, ne, inArray, desc, asc, count } from "drizzle-orm";
import { db } from "../db"; // adjust import path

// Import your existing schema tables
// import {
//   pcbRepairOrders, pcbAppointments, pcbBays, pcbEmployees,
//   pcbPayments, pcbCustomers, pcbServiceLines,
// } from "@shared/schema";

// Import new schema additions
// import {
//   pcbStaffAvailability, pcbStaffTimeOff, pcbDashboardVisibility,
//   DEFAULT_VISIBILITY, DASHBOARD_CARDS,
// } from "@shared/schema";

const router = Router();


// ============================================
// GET /api/dashboard/enhanced
// Main dashboard data endpoint with role-aware filtering
// ============================================
router.get("/api/dashboard/enhanced", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const userRole = req.user?.role || "owner";
    const userId = req.user?.id;

    // Date range from query params (defaults to today)
    const dateFrom = req.query.dateFrom as string || new Date().toISOString().split("T")[0];
    const dateTo = req.query.dateTo as string || new Date().toISOString().split("T")[0];
    const showAllOpenROs = req.query.showAllOpen === "true";

    const startOfDay = `${dateFrom}T00:00:00Z`;
    const endOfDay = `${dateTo}T23:59:59Z`;

    // 1. Get visibility settings for this user's role
    const visibilityRows = await db
      .select()
      .from(pcbDashboardVisibility)
      .where(
        and(
          eq(pcbDashboardVisibility.tenantId, tenantId),
          eq(pcbDashboardVisibility.role, userRole)
        )
      );

    // Build visibility map (fall back to defaults if no settings exist)
    const visibility: Record<string, boolean> = {};
    const defaults = DEFAULT_VISIBILITY[userRole] || DEFAULT_VISIBILITY.owner;

    for (const cardKey of DASHBOARD_CARDS) {
      const row = visibilityRows.find((r) => r.cardKey === cardKey);
      visibility[cardKey] = row ? row.isVisible : defaults[cardKey];
    }

    // 2. Build response based on visibility
    const dashboardData: any = { visibility };

    // ── Revenue (role-gated) ──
    if (visibility.revenue) {
      const [revenueResult] = await db.execute(sql`
        SELECT
          COALESCE(SUM(CASE WHEN method = 'cash' THEN amount ELSE 0 END), 0) as cash_total,
          COALESCE(SUM(CASE WHEN method != 'cash' THEN amount ELSE 0 END), 0) as card_total,
          COALESCE(SUM(amount), 0) as total_revenue,
          COUNT(*) as payment_count
        FROM pcb_payments
        WHERE tenant_id = ${tenantId}
          AND status IN ('captured', 'settled')
          AND created_at >= ${startOfDay}::timestamptz
          AND created_at <= ${endOfDay}::timestamptz
      `);
      dashboardData.revenue = revenueResult;
    }

    // ── Cars In Shop ──
    if (visibility.cars_in_shop) {
      const [carsResult] = await db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('in_progress', 'waiting_parts', 'quality_check')) as in_progress,
          COUNT(*) FILTER (WHERE status IN ('approved', 'estimate', 'sent')) as waiting,
          COUNT(*) FILTER (WHERE status NOT IN ('paid', 'cancelled')) as total
        FROM pcb_repair_orders
        WHERE tenant_id = ${tenantId}
          AND status NOT IN ('paid', 'cancelled')
      `);
      dashboardData.carsInShop = carsResult;
    }

    // ── ARO (role-gated) ──
    if (visibility.aro) {
      const [aroResult] = await db.execute(sql`
        SELECT
          COALESCE(AVG(total_card_price), 0) as avg_repair_order,
          COUNT(*) as ro_count
        FROM pcb_repair_orders
        WHERE tenant_id = ${tenantId}
          AND status IN ('invoiced', 'paid')
          AND created_at >= ${startOfDay}::timestamptz
          AND created_at <= ${endOfDay}::timestamptz
      `);
      dashboardData.aro = aroResult;
    }

    // ── Approval Rate ──
    if (visibility.approval_rate) {
      const [approvalResult] = await db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status IN ('approved', 'in_progress', 'waiting_parts',
            'quality_check', 'completed', 'invoiced', 'paid')) as approved_count,
          COUNT(*) FILTER (WHERE status NOT IN ('estimate', 'cancelled')) as sent_count,
          CASE
            WHEN COUNT(*) FILTER (WHERE status NOT IN ('estimate', 'cancelled')) > 0
            THEN ROUND(
              100.0 * COUNT(*) FILTER (WHERE status IN ('approved', 'in_progress', 'waiting_parts',
                'quality_check', 'completed', 'invoiced', 'paid'))
              / COUNT(*) FILTER (WHERE status NOT IN ('estimate', 'cancelled')),
              1
            )
            ELSE 0
          END as approval_rate
        FROM pcb_repair_orders
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${startOfDay}::timestamptz
          AND created_at <= ${endOfDay}::timestamptz
      `);
      dashboardData.approvalRate = approvalResult;
    }

    // ── Fees Saved (role-gated, owner/admin only by default) ──
    if (visibility.fees_saved) {
      const [feesResult] = await db.execute(sql`
        SELECT
          COALESCE(SUM(
            CASE WHEN method = 'cash' AND is_dual_priced = TRUE
            THEN (card_price - cash_price) ELSE 0 END
          ), 0) as fees_saved,
          COALESCE(SUM(
            CASE WHEN method != 'cash' THEN amount ELSE 0 END
          ), 0) as card_volume
        FROM pcb_payments
        WHERE tenant_id = ${tenantId}
          AND status IN ('captured', 'settled')
          AND created_at >= ${startOfDay}::timestamptz
          AND created_at <= ${endOfDay}::timestamptz
      `);
      dashboardData.feesSaved = feesResult;
    }

    // ── Appointments / Availability ──
    if (visibility.appointments_availability) {
      // Get bay capacity
      const bays = await db.execute(sql`
        SELECT
          b.id, b.bay_number, b.name, b.sellable_hours_per_day,
          COALESCE(SUM(a.estimated_labor_hours), 0) as hours_booked,
          b.sellable_hours_per_day - COALESCE(SUM(a.estimated_labor_hours), 0) as hours_available,
          COUNT(a.id) as appointment_count
        FROM pcb_bays b
        LEFT JOIN pcb_appointments a
          ON a.bay_id = b.id
          AND a.scheduled_start >= ${startOfDay}::timestamptz
          AND a.scheduled_start <= ${endOfDay}::timestamptz
          AND a.status NOT IN ('cancelled', 'no_show')
        WHERE b.tenant_id = ${tenantId}
          AND b.active = TRUE
        GROUP BY b.id
        ORDER BY b.sort_order, b.bay_number
      `);

      // Get total appointments for range
      const [appointmentCounts] = await db.execute(sql`
        SELECT
          COUNT(*) as total_scheduled,
          COALESCE(SUM(estimated_labor_hours), 0) as total_hours_booked
        FROM pcb_appointments
        WHERE tenant_id = ${tenantId}
          AND scheduled_start >= ${startOfDay}::timestamptz
          AND scheduled_start <= ${endOfDay}::timestamptz
          AND status NOT IN ('cancelled', 'no_show')
      `);

      // Calculate totals
      const totalSellableHours = (bays as any[]).reduce(
        (sum: number, b: any) => sum + parseFloat(b.sellable_hours_per_day || "0"), 0
      );
      const totalHoursBooked = parseFloat((appointmentCounts as any)?.total_hours_booked || "0");

      dashboardData.appointmentsAvailability = {
        bays,
        totalScheduled: parseInt((appointmentCounts as any)?.total_scheduled || "0"),
        totalSellableHours,
        totalHoursBooked,
        totalHoursAvailable: totalSellableHours - totalHoursBooked,
        utilization: totalSellableHours > 0
          ? Math.round((totalHoursBooked / totalSellableHours) * 100)
          : 0,
      };
    }

    // ── Open ROs (with date filter or show-all) ──
    if (visibility.open_ros) {
      let roQuery = sql`
        SELECT
          ro.id, ro.ro_number, ro.status, ro.created_at,
          ro.total_card_price, ro.total_cash_price,
          ro.assigned_tech_id,
          c.first_name as customer_first, c.last_name as customer_last,
          v.year as vehicle_year, v.make as vehicle_make, v.model as vehicle_model
        FROM pcb_repair_orders ro
        LEFT JOIN pcb_customers c ON ro.customer_id = c.id
        LEFT JOIN pcb_vehicles v ON ro.vehicle_id = v.id
        WHERE ro.tenant_id = ${tenantId}
          AND ro.status NOT IN ('paid', 'cancelled')
      `;

      // If technician role, only show their assigned ROs
      if (userRole === "technician" && userId) {
        roQuery = sql`${roQuery} AND ro.assigned_tech_id = ${userId}`;
      }

      // Date filter (unless showing all open)
      if (!showAllOpenROs) {
        roQuery = sql`${roQuery}
          AND ro.created_at >= ${startOfDay}::timestamptz
          AND ro.created_at <= ${endOfDay}::timestamptz`;
      }

      roQuery = sql`${roQuery} ORDER BY ro.created_at DESC LIMIT 50`;

      const openROs = await db.execute(roQuery);

      // Get total count (for "X open ROs" badge)
      const [roCount] = await db.execute(sql`
        SELECT COUNT(*) as total_open
        FROM pcb_repair_orders
        WHERE tenant_id = ${tenantId}
          AND status NOT IN ('paid', 'cancelled')
          ${userRole === "technician" && userId
            ? sql`AND assigned_tech_id = ${userId}`
            : sql``}
      `);

      dashboardData.openROs = {
        items: openROs,
        totalOpen: parseInt((roCount as any)?.total_open || "0"),
        showingAll: showAllOpenROs,
      };
    }

    // ── Shop Stats (advisor daily view) ──
    if (visibility.shop_stats) {
      // Who's off today
      const today = new Date().toISOString().split("T")[0];
      const dayOfWeek = new Date().getDay(); // 0=Sunday

      const staffOff = await db.execute(sql`
        SELECT e.id, e.first_name, e.last_name, e.role,
          COALESCE(t.reason, 'Day off') as reason
        FROM pcb_employees e
        LEFT JOIN pcb_staff_time_off t
          ON t.employee_id = e.id
          AND t.date = ${today}::date
        LEFT JOIN pcb_staff_availability a
          ON a.employee_id = e.id
          AND a.day_of_week = ${dayOfWeek}
        WHERE e.tenant_id = ${tenantId}
          AND e.active = TRUE
          AND (
            t.id IS NOT NULL
            OR (a.id IS NOT NULL AND a.is_working = FALSE)
            OR a.id IS NULL
          )
      `);

      // Hours sold today (from completed/in-progress ROs)
      const [hoursSold] = await db.execute(sql`
        SELECT COALESCE(SUM(sl.estimated_hours), 0) as hours_sold
        FROM pcb_service_lines sl
        JOIN pcb_repair_orders ro ON sl.work_order_id = ro.id
        WHERE ro.tenant_id = ${tenantId}
          AND ro.status IN ('in_progress', 'waiting_parts', 'quality_check', 'completed', 'invoiced', 'paid')
          AND ro.created_at >= ${startOfDay}::timestamptz
          AND ro.created_at <= ${endOfDay}::timestamptz
          AND sl.line_type = 'labor'
      `);

      // Pending customer approvals
      const [pendingApprovals] = await db.execute(sql`
        SELECT COUNT(*) as pending_count
        FROM pcb_repair_orders
        WHERE tenant_id = ${tenantId}
          AND status = 'sent'
      `);

      dashboardData.shopStats = {
        staffOff,
        hoursSold: parseFloat((hoursSold as any)?.hours_sold || "0"),
        pendingApprovals: parseInt((pendingApprovals as any)?.pending_count || "0"),
      };
    }

    // ── Quick Actions config ──
    if (visibility.quick_actions) {
      dashboardData.quickActions = {
        canCreateRO: ["owner", "admin", "service_advisor"].includes(userRole),
        canSearchCustomer: true,
        canEditCustomer: ["owner", "admin", "service_advisor"].includes(userRole),
        canCreateAppointment: ["owner", "admin", "service_advisor"].includes(userRole),
      };
    }

    return res.json(dashboardData);
  } catch (error) {
    console.error("Dashboard enhanced error:", error);
    return res.status(500).json({ error: "Failed to load dashboard data" });
  }
});


// ============================================
// GET /api/dashboard/visibility
// Get visibility settings for the current tenant
// ============================================
router.get("/api/dashboard/visibility", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;

    const rows = await db
      .select()
      .from(pcbDashboardVisibility)
      .where(eq(pcbDashboardVisibility.tenantId, tenantId));

    // If no settings exist, return defaults
    if (rows.length === 0) {
      return res.json({ settings: DEFAULT_VISIBILITY, isDefault: true });
    }

    // Group by role
    const settings: Record<string, Record<string, boolean>> = {};
    for (const row of rows) {
      if (!settings[row.role]) settings[row.role] = {};
      settings[row.role][row.cardKey] = row.isVisible;
    }

    return res.json({ settings, isDefault: false });
  } catch (error) {
    console.error("Visibility fetch error:", error);
    return res.status(500).json({ error: "Failed to load visibility settings" });
  }
});


// ============================================
// PUT /api/dashboard/visibility
// Update visibility settings (owner/admin only)
// ============================================
router.put("/api/dashboard/visibility", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const userRole = req.user?.role;

    if (!["owner", "admin"].includes(userRole)) {
      return res.status(403).json({ error: "Only owners and admins can change dashboard visibility" });
    }

    const { settings } = req.body;
    // settings shape: { role: { cardKey: boolean } }

    if (!settings || typeof settings !== "object") {
      return res.status(400).json({ error: "Invalid settings format" });
    }

    // Upsert all visibility rows
    const upserts: Array<{
      tenantId: string; cardKey: string; role: string; isVisible: boolean;
    }> = [];

    for (const [role, cards] of Object.entries(settings)) {
      for (const [cardKey, isVisible] of Object.entries(cards as Record<string, boolean>)) {
        upserts.push({ tenantId, cardKey, role, isVisible });
      }
    }

    // Use a transaction for atomic update
    await db.transaction(async (tx) => {
      for (const row of upserts) {
        await tx
          .insert(pcbDashboardVisibility)
          .values({
            tenantId: row.tenantId,
            cardKey: row.cardKey,
            role: row.role,
            isVisible: row.isVisible,
          })
          .onConflictDoUpdate({
            target: [
              pcbDashboardVisibility.tenantId,
              pcbDashboardVisibility.cardKey,
              pcbDashboardVisibility.role,
            ],
            set: {
              isVisible: sql`EXCLUDED.is_visible`,
              updatedAt: sql`NOW()`,
            },
          });
      }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Visibility update error:", error);
    return res.status(500).json({ error: "Failed to update visibility settings" });
  }
});


// ============================================
// GET /api/staff/availability
// Get weekly schedule for all staff
// ============================================
router.get("/api/staff/availability", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const employeeId = req.query.employeeId as string;

    let query = sql`
      SELECT
        sa.*,
        e.first_name, e.last_name, e.role
      FROM pcb_staff_availability sa
      JOIN pcb_employees e ON sa.employee_id = e.id
      WHERE sa.tenant_id = ${tenantId}
    `;

    if (employeeId) {
      query = sql`${query} AND sa.employee_id = ${employeeId}`;
    }

    query = sql`${query} ORDER BY e.last_name, e.first_name, sa.day_of_week`;

    const rows = await db.execute(query);
    return res.json(rows);
  } catch (error) {
    console.error("Staff availability error:", error);
    return res.status(500).json({ error: "Failed to load staff availability" });
  }
});


// ============================================
// PUT /api/staff/availability/:employeeId
// Set weekly schedule for an employee
// ============================================
router.put("/api/staff/availability/:employeeId", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const { employeeId } = req.params;
    const { schedule } = req.body;
    // schedule: [{ dayOfWeek: 0-6, startTime: "08:00", endTime: "17:00", isWorking: true }]

    if (!Array.isArray(schedule)) {
      return res.status(400).json({ error: "Schedule must be an array" });
    }

    await db.transaction(async (tx) => {
      // Delete existing schedule for this employee
      await tx.execute(sql`
        DELETE FROM pcb_staff_availability
        WHERE tenant_id = ${tenantId} AND employee_id = ${employeeId}
      `);

      // Insert new schedule
      for (const day of schedule) {
        await tx.insert(pcbStaffAvailability).values({
          tenantId,
          employeeId,
          dayOfWeek: day.dayOfWeek,
          startTime: day.startTime,
          endTime: day.endTime,
          isWorking: day.isWorking,
        });
      }
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("Staff availability update error:", error);
    return res.status(500).json({ error: "Failed to update staff availability" });
  }
});


// ============================================
// GET /api/staff/time-off
// Get time off entries for date range
// ============================================
router.get("/api/staff/time-off", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const dateFrom = req.query.dateFrom as string || new Date().toISOString().split("T")[0];
    const dateTo = req.query.dateTo as string || dateFrom;

    const rows = await db.execute(sql`
      SELECT
        t.*,
        e.first_name, e.last_name, e.role
      FROM pcb_staff_time_off t
      JOIN pcb_employees e ON t.employee_id = e.id
      WHERE t.tenant_id = ${tenantId}
        AND t.date >= ${dateFrom}::date
        AND t.date <= ${dateTo}::date
      ORDER BY t.date, e.last_name
    `);

    return res.json(rows);
  } catch (error) {
    console.error("Time off fetch error:", error);
    return res.status(500).json({ error: "Failed to load time off" });
  }
});


// ============================================
// POST /api/staff/time-off
// Add a time off entry
// ============================================
router.post("/api/staff/time-off", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const { employeeId, date, reason, isFullDay, startTime, endTime } = req.body;

    if (!employeeId || !date) {
      return res.status(400).json({ error: "employeeId and date are required" });
    }

    const [entry] = await db
      .insert(pcbStaffTimeOff)
      .values({
        tenantId,
        employeeId,
        date,
        reason,
        isFullDay: isFullDay ?? true,
        startTime,
        endTime,
      })
      .onConflictDoUpdate({
        target: [pcbStaffTimeOff.tenantId, pcbStaffTimeOff.employeeId, pcbStaffTimeOff.date],
        set: {
          reason: sql`EXCLUDED.reason`,
          isFullDay: sql`EXCLUDED.is_full_day`,
          startTime: sql`EXCLUDED.start_time`,
          endTime: sql`EXCLUDED.end_time`,
        },
      })
      .returning();

    return res.json(entry);
  } catch (error) {
    console.error("Time off create error:", error);
    return res.status(500).json({ error: "Failed to add time off" });
  }
});


// ============================================
// DELETE /api/staff/time-off/:id
// Remove a time off entry
// ============================================
router.delete("/api/staff/time-off/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    await db.execute(sql`
      DELETE FROM pcb_staff_time_off
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `);

    return res.json({ success: true });
  } catch (error) {
    console.error("Time off delete error:", error);
    return res.status(500).json({ error: "Failed to delete time off" });
  }
});


// ============================================
// PUT /api/bays/:id
// Update bay configuration (sellable hours, etc.)
// ============================================
router.put("/api/bays/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { name, sellableHoursPerDay, bayType, active, sortOrder } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (sellableHoursPerDay !== undefined) updates.sellable_hours_per_day = sellableHoursPerDay;
    if (bayType !== undefined) updates.bay_type = bayType;
    if (active !== undefined) updates.active = active;
    if (sortOrder !== undefined) updates.sort_order = sortOrder;

    await db.execute(sql`
      UPDATE pcb_bays
      SET ${sql.raw(
        Object.entries(updates)
          .map(([k, v]) => `${k} = '${v}'`)
          .join(", ")
      )}
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `);

    return res.json({ success: true });
  } catch (error) {
    console.error("Bay update error:", error);
    return res.status(500).json({ error: "Failed to update bay" });
  }
});


export { router as dashboardEnhancedRouter };
