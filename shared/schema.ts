import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, real, boolean, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Business type enum values
export const BUSINESS_TYPES = [
  "restaurant",
  "retail",
  "service",
  "convenience",
  "auto",
  "medical",
  "salon",
  "other"
] as const;

export type BusinessType = typeof BUSINESS_TYPES[number];

// Drop status enum values
export const DROP_STATUSES = ["pending", "picked_up", "converted", "lost"] as const;
export type DropStatus = typeof DROP_STATUSES[number];

// Outcome enum values
export const OUTCOME_TYPES = [
  "signed",
  "interested_appointment",
  "interested_later",
  "not_interested",
  "closed",
  "not_found"
] as const;
export type OutcomeType = typeof OUTCOME_TYPES[number];

// Brochure status enum values
export const BROCHURE_STATUSES = ["available", "deployed", "returned", "lost"] as const;
export type BrochureStatus = typeof BROCHURE_STATUSES[number];

// Organization member role enum values
export const ORG_MEMBER_ROLES = ["master_admin", "relationship_manager", "agent"] as const;
export type OrgMemberRole = typeof ORG_MEMBER_ROLES[number];

// Organizations table
export const organizations = pgTable("organizations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  brochures: many(brochures),
  drops: many(drops),
}));

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

// Organization members table
export const organizationMembers = pgTable("organization_members", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").notNull(),
  role: varchar("role", { length: 30 }).notNull(),
  managerId: integer("manager_id").references(() => organizationMembers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("org_user_unique").on(table.orgId, table.userId),
]);

export const organizationMembersRelations = relations(organizationMembers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.orgId],
    references: [organizations.id],
  }),
  manager: one(organizationMembers, {
    fields: [organizationMembers.managerId],
    references: [organizationMembers.id],
    relationName: "managerAgents",
  }),
  agents: many(organizationMembers, {
    relationName: "managerAgents",
  }),
}));

export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({
  id: true,
  createdAt: true,
}).extend({
  role: z.enum(ORG_MEMBER_ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${ORG_MEMBER_ROLES.join(", ")}` })
  }),
});
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
export type OrganizationMember = typeof organizationMembers.$inferSelect;

// Brochures table
export const brochures = pgTable("brochures", {
  id: varchar("id", { length: 50 }).primaryKey(),
  batch: varchar("batch", { length: 100 }),
  status: varchar("status", { length: 20 }).default("available").notNull(),
  orgId: integer("org_id").references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const brochuresRelations = relations(brochures, ({ one, many }) => ({
  drops: many(drops),
  organization: one(organizations, {
    fields: [brochures.orgId],
    references: [organizations.id],
  }),
}));

export const insertBrochureSchema = createInsertSchema(brochures).omit({
  createdAt: true,
});
export type InsertBrochure = z.infer<typeof insertBrochureSchema>;
export type Brochure = typeof brochures.$inferSelect;

// Drops table
export const drops = pgTable("drops", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  brochureId: varchar("brochure_id", { length: 50 }).notNull().references(() => brochures.id),
  agentId: varchar("agent_id").notNull(),
  
  // Location data
  latitude: real("latitude"),
  longitude: real("longitude"),
  address: text("address"),
  
  // Business data
  businessName: text("business_name"),
  businessType: varchar("business_type", { length: 50 }),
  businessPhone: varchar("business_phone", { length: 30 }),
  contactName: varchar("contact_name", { length: 100 }),
  
  // Notes
  textNotes: text("text_notes"),
  voiceNoteUrl: text("voice_note_url"),
  voiceTranscript: text("voice_transcript"),
  
  // Timing
  droppedAt: timestamp("dropped_at").defaultNow().notNull(),
  pickupScheduledFor: timestamp("pickup_scheduled_for"),
  pickupReminderSent: boolean("pickup_reminder_sent").default(false),
  
  // Status tracking
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  outcome: varchar("outcome", { length: 30 }),
  outcomeNotes: text("outcome_notes"),
  pickedUpAt: timestamp("picked_up_at"),
  
  // Organization (for reporting)
  orgId: integer("org_id").references(() => organizations.id),
});

export const dropsRelations = relations(drops, ({ one, many }) => ({
  brochure: one(brochures, {
    fields: [drops.brochureId],
    references: [brochures.id],
  }),
  reminders: many(reminders),
  organization: one(organizations, {
    fields: [drops.orgId],
    references: [organizations.id],
  }),
}));

export const insertDropSchema = createInsertSchema(drops).omit({
  id: true,
  droppedAt: true,
  pickupReminderSent: true,
  pickedUpAt: true,
}).extend({
  status: z.enum(DROP_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${DROP_STATUSES.join(", ")}` })
  }).optional(),
  outcome: z.enum(OUTCOME_TYPES, {
    errorMap: () => ({ message: `Outcome must be one of: ${OUTCOME_TYPES.join(", ")}` })
  }).optional().nullable(),
  businessType: z.enum(BUSINESS_TYPES, {
    errorMap: () => ({ message: `Business type must be one of: ${BUSINESS_TYPES.join(", ")}` })
  }).optional().nullable(),
  pickupScheduledFor: z.union([z.date(), z.string()]).pipe(
    z.coerce.date().refine(
      (date) => date > new Date(),
      { message: "Pickup date must be in the future" }
    )
  ).optional().nullable(),
});
export type InsertDrop = z.infer<typeof insertDropSchema>;
export type Drop = typeof drops.$inferSelect;

// Reminders table
export const reminders = pgTable("reminders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  dropId: integer("drop_id").notNull().references(() => drops.id),
  agentId: varchar("agent_id").notNull(),
  remindAt: timestamp("remind_at").notNull(),
  sent: boolean("sent").default(false),
  sentAt: timestamp("sent_at"),
  method: varchar("method", { length: 20 }),
});

export const remindersRelations = relations(reminders, ({ one }) => ({
  drop: one(drops, {
    fields: [reminders.dropId],
    references: [drops.id],
  }),
}));

export const insertReminderSchema = createInsertSchema(reminders).omit({
  id: true,
  sent: true,
  sentAt: true,
});
export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;

// Extended drop type with brochure info for frontend
export type DropWithBrochure = Drop & {
  brochure?: Brochure;
};

// Reminder hours options
export const REMINDER_HOURS_OPTIONS = [6, 12, 24, 48] as const;
export type ReminderHours = typeof REMINDER_HOURS_OPTIONS[number];

// User preferences table
export const userPreferences = pgTable("user_preferences", {
  userId: varchar("user_id").primaryKey(),
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
  reminderHoursBefore: integer("reminder_hours_before").default(24).notNull(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  pushNotifications: boolean("push_notifications").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  createdAt: true,
  updatedAt: true,
});
export const updateUserPreferencesSchema = insertUserPreferencesSchema.partial().omit({
  userId: true,
});
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UpdateUserPreferences = z.infer<typeof updateUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
