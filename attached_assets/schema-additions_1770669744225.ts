/**
 * PCB Auto — Dashboard Enhancement Schema Additions
 * 
 * ADD these to your existing shared/schema.ts (or db/schema.ts)
 * These extend existing tables and add new ones.
 * 
 * After adding, run: npx drizzle-kit generate
 *                    npx drizzle-kit push
 */

import {
  pgTable, uuid, varchar, integer, decimal, boolean,
  timestamp, time, date, unique, index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Reference your existing tables ───
// Import these from your existing schema file:
// import { tenants, pcbEmployees, pcbBays, pcbAppointments, pcbServiceLines } from "./schema";

// ============================================
// EXTEND pcb_bays — add to your existing pcbBays table definition
// ============================================
// Add these columns to your existing pcb_bays pgTable:
//   sellableHoursPerDay: decimal("sellable_hours_per_day", { precision: 4, scale: 1 }).default("8.0"),
//   sortOrder: integer("sort_order").default(0),

// ============================================
// EXTEND pcb_appointments — add to your existing table
// ============================================
// Add this column to your existing pcb_appointments pgTable:
//   estimatedLaborHours: decimal("estimated_labor_hours", { precision: 5, scale: 2 }),

// ============================================
// EXTEND pcb_service_lines — add to your existing table
// ============================================
// Add this column to your existing pcb_service_lines/service_lines pgTable:
//   estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),


// ============================================
// NEW TABLE: Staff Availability (weekly schedule)
// ============================================
export const pcbStaffAvailability = pgTable("pcb_staff_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  employeeId: uuid("employee_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 6=Saturday
  startTime: time("start_time").notNull().default("08:00"),
  endTime: time("end_time").notNull().default("17:00"),
  isWorking: boolean("is_working").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  unique().on(table.tenantId, table.employeeId, table.dayOfWeek),
  index("idx_pcb_staff_avail_tenant").on(table.tenantId, table.employeeId),
]);


// ============================================
// NEW TABLE: Staff Time Off (specific dates)
// ============================================
export const pcbStaffTimeOff = pgTable("pcb_staff_time_off", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  employeeId: uuid("employee_id").notNull(),
  date: date("date").notNull(),
  reason: varchar("reason", { length: 255 }),
  isFullDay: boolean("is_full_day").default(true),
  startTime: time("start_time"),
  endTime: time("end_time"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  unique().on(table.tenantId, table.employeeId, table.date),
  index("idx_pcb_time_off_tenant").on(table.tenantId, table.date),
  index("idx_pcb_time_off_employee").on(table.employeeId, table.date),
]);


// ============================================
// NEW TABLE: Dashboard Visibility (role-based toggles)
// ============================================
export const pcbDashboardVisibility = pgTable("pcb_dashboard_visibility", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  cardKey: varchar("card_key", { length: 50 }).notNull(),
  role: varchar("role", { length: 30 }).notNull(),
  isVisible: boolean("is_visible").default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  unique().on(table.tenantId, table.cardKey, table.role),
  index("idx_pcb_dash_vis_tenant").on(table.tenantId, table.role),
]);


// ============================================
// RELATIONS
// ============================================
export const pcbStaffAvailabilityRelations = relations(pcbStaffAvailability, ({ one }) => ({
  // employee: one(pcbEmployees, {
  //   fields: [pcbStaffAvailability.employeeId],
  //   references: [pcbEmployees.id],
  // }),
}));

export const pcbStaffTimeOffRelations = relations(pcbStaffTimeOff, ({ one }) => ({
  // employee: one(pcbEmployees, {
  //   fields: [pcbStaffTimeOff.employeeId],
  //   references: [pcbEmployees.id],
  // }),
}));


// ============================================
// TYPE EXPORTS
// ============================================
export type StaffAvailability = typeof pcbStaffAvailability.$inferSelect;
export type NewStaffAvailability = typeof pcbStaffAvailability.$inferInsert;
export type StaffTimeOff = typeof pcbStaffTimeOff.$inferSelect;
export type NewStaffTimeOff = typeof pcbStaffTimeOff.$inferInsert;
export type DashboardVisibility = typeof pcbDashboardVisibility.$inferSelect;
export type NewDashboardVisibility = typeof pcbDashboardVisibility.$inferInsert;


// ============================================
// DEFAULT VISIBILITY CONFIG
// ============================================
// Use this to seed defaults when a new tenant is created
// or when the visibility settings page loads for the first time

export const DASHBOARD_CARDS = [
  "revenue",
  "cars_in_shop",
  "aro",
  "approval_rate",
  "fees_saved",
  "appointments_availability",
  "open_ros",
  "quick_actions",
  "shop_stats",
] as const;

export type DashboardCardKey = typeof DASHBOARD_CARDS[number];

export const DEFAULT_VISIBILITY: Record<string, Record<DashboardCardKey, boolean>> = {
  owner: {
    revenue: true,
    cars_in_shop: true,
    aro: true,
    approval_rate: true,
    fees_saved: true,
    appointments_availability: true,
    open_ros: true,
    quick_actions: true,
    shop_stats: true,
  },
  admin: {
    revenue: true,
    cars_in_shop: true,
    aro: true,
    approval_rate: true,
    fees_saved: true,
    appointments_availability: true,
    open_ros: true,
    quick_actions: true,
    shop_stats: true,
  },
  service_advisor: {
    revenue: false,      // default OFF for advisors
    cars_in_shop: true,
    aro: false,          // default OFF
    approval_rate: true,
    fees_saved: false,   // default OFF
    appointments_availability: true,
    open_ros: true,
    quick_actions: true,
    shop_stats: true,
  },
  technician: {
    revenue: false,
    cars_in_shop: true,
    aro: false,
    approval_rate: false,
    fees_saved: false,
    appointments_availability: true,
    open_ros: true,      // filtered to "own only" in the component
    quick_actions: true,
    shop_stats: false,
  },
  bookkeeper: {
    revenue: true,
    cars_in_shop: false,
    aro: true,
    approval_rate: false,
    fees_saved: true,
    appointments_availability: false,
    open_ros: false,
    quick_actions: false,
    shop_stats: false,
  },
};
