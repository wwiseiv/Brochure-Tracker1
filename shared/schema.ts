import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, real, boolean, timestamp, integer, unique, jsonb, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Re-export chat models
export * from "./models/chat";

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
  isPrimary: boolean("is_primary").default(false).notNull(),
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
  managerId: integer("manager_id"),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  company: varchar("company", { length: 150 }),
  territory: varchar("territory", { length: 100 }),
  profilePhotoUrl: text("profile_photo_url"),
  companyLogoUrl: text("company_logo_url"),
  profileComplete: boolean("profile_complete").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

export const insertOrganizationMemberSchema = z.object({
  orgId: z.number(),
  userId: z.string(),
  role: z.enum(ORG_MEMBER_ROLES, {
    errorMap: () => ({ message: `Role must be one of: ${ORG_MEMBER_ROLES.join(", ")}` })
  }),
  managerId: z.number().nullable().optional(),
  firstName: z.string().max(100).nullable().optional(),
  lastName: z.string().max(100).nullable().optional(),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  company: z.string().max(150).nullable().optional(),
  territory: z.string().max(100).nullable().optional(),
  profilePhotoUrl: z.string().nullable().optional(),
  companyLogoUrl: z.string().nullable().optional(),
  profileComplete: z.boolean().optional(),
});
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
export type OrganizationMember = typeof organizationMembers.$inferSelect;

// RBAC Role and Stage types
export const USER_ROLES = ['admin', 'manager', 'agent'] as const;
export type UserRoleType = typeof USER_ROLES[number];

export const AGENT_STAGES = ['trainee', 'active', 'senior'] as const;
export type AgentStageType = typeof AGENT_STAGES[number];

// User permissions table - RBAC with roles, stages, and feature overrides
export const userPermissions = pgTable("user_permissions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().unique(),
  orgId: integer("org_id").references(() => organizations.id),
  
  // RBAC role: admin (full access), manager (team oversight), agent (controlled by stage)
  role: varchar("role", { length: 20 }).default("agent").notNull(),
  
  // Agent stage: trainee (training only), active (CRM/drops), senior (all features)
  agentStage: varchar("agent_stage", { length: 20 }).default("trainee"),
  
  // Per-user feature overrides: { "feature_id": true/false }
  featureOverrides: jsonb("feature_overrides").default({}).notNull(),
  
  // Legacy feature toggles (deprecated - use featureOverrides instead)
  canViewLeaderboard: boolean("can_view_leaderboard").default(false).notNull(),
  canAccessCoach: boolean("can_access_coach").default(true).notNull(),
  canAccessEquipIQ: boolean("can_access_equip_iq").default(true).notNull(),
  canExportData: boolean("can_export_data").default(true).notNull(),
  canRecordMeetings: boolean("can_record_meetings").default(true).notNull(),
  canManageReferrals: boolean("can_manage_referrals").default(true).notNull(),
  canViewDailyEdge: boolean("can_view_daily_edge").default(true).notNull(),
  canAccessSequences: boolean("can_access_sequences").default(true).notNull(),
  canAccessProposals: boolean("can_access_proposals").default(true).notNull(),
  
  // Metadata
  setBy: varchar("set_by"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserPermissionsSchema = createInsertSchema(userPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserPermissions = z.infer<typeof insertUserPermissionsSchema>;
export type UserPermissions = typeof userPermissions.$inferSelect;

// Permission audit log - track all permission changes
export const permissionAuditLog = pgTable("permission_audit_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orgId: integer("org_id").references(() => organizations.id),
  changedByUserId: varchar("changed_by_user_id"),
  targetUserId: varchar("target_user_id"),
  changeType: varchar("change_type", { length: 50 }).notNull(),
  oldRole: varchar("old_role", { length: 20 }),
  newRole: varchar("new_role", { length: 20 }),
  oldStage: varchar("old_stage", { length: 20 }),
  newStage: varchar("new_stage", { length: 20 }),
  featureId: varchar("feature_id", { length: 100 }),
  oldOverride: boolean("old_override"),
  newOverride: boolean("new_override"),
  presetId: varchar("preset_id", { length: 100 }),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPermissionAuditLogSchema = createInsertSchema(permissionAuditLog).omit({
  id: true,
  createdAt: true,
});
export type InsertPermissionAuditLog = z.infer<typeof insertPermissionAuditLogSchema>;
export type PermissionAuditLog = typeof permissionAuditLog.$inferSelect;

// Organization-level feature toggles (master switch for org)
export const organizationFeatures = pgTable("organization_features", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  featureId: varchar("feature_id", { length: 100 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  disabledReason: text("disabled_reason"),
  disabledBy: varchar("disabled_by"),
  disabledAt: timestamp("disabled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOrganizationFeaturesSchema = createInsertSchema(organizationFeatures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrganizationFeatures = z.infer<typeof insertOrganizationFeaturesSchema>;
export type OrganizationFeatures = typeof organizationFeatures.$inferSelect;

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
  
  // Link to merchant (for visit history tracking)
  merchantId: integer("merchant_id").references(() => merchants.id),
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
  merchant: one(merchants, {
    fields: [drops.merchantId],
    references: [merchants.id],
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

// Merchant status types
export const MERCHANT_STATUSES = ["prospect", "converted", "lost"] as const;
export type MerchantStatus = typeof MERCHANT_STATUSES[number];

// Merchants table (for Merchant Profiles)
export const merchants = pgTable("merchants", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  businessName: text("business_name").notNull(),
  businessType: varchar("business_type", { length: 50 }),
  businessPhone: varchar("business_phone", { length: 30 }),
  contactName: varchar("contact_name", { length: 100 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("prospect").notNull(),
  totalDrops: integer("total_drops").default(0),
  totalConversions: integer("total_conversions").default(0),
  leadScore: integer("lead_score"),
  lastVisitAt: timestamp("last_visit_at"),
  createdBy: varchar("created_by", { length: 255 }),
  isSample: boolean("is_sample").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const merchantsRelations = relations(merchants, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [merchants.orgId],
    references: [organizations.id],
  }),
  referralsGiven: many(referrals, { relationName: "sourceMerchant" }),
  referralsReceived: many(referrals, { relationName: "referredMerchant" }),
  drops: many(drops),
  proposals: many(proposals),
  statementExtractions: many(statementExtractions),
}));

export const insertMerchantSchema = createInsertSchema(merchants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalDrops: true,
  totalConversions: true,
});
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Merchant = typeof merchants.$inferSelect;

// Agent Inventory table (for Inventory Tracking)
export const agentInventory = pgTable("agent_inventory", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  agentId: varchar("agent_id").notNull(),
  brochuresOnHand: integer("brochures_on_hand").default(0).notNull(),
  brochuresDeployed: integer("brochures_deployed").default(0).notNull(),
  lowStockThreshold: integer("low_stock_threshold").default(10).notNull(),
  lastRestockAt: timestamp("last_restock_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAgentInventorySchema = createInsertSchema(agentInventory).omit({
  id: true,
  updatedAt: true,
});
export type InsertAgentInventory = z.infer<typeof insertAgentInventorySchema>;
export type AgentInventory = typeof agentInventory.$inferSelect;

// Inventory Log table (for tracking inventory changes)
export const inventoryLogs = pgTable("inventory_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  agentId: varchar("agent_id").notNull(),
  changeType: varchar("change_type", { length: 30 }).notNull(), // restock, deploy, return, adjustment
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInventoryLogSchema = createInsertSchema(inventoryLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertInventoryLog = z.infer<typeof insertInventoryLogSchema>;
export type InventoryLog = typeof inventoryLogs.$inferSelect;

// Referrals table (for Referral Tracking)
export const referrals = pgTable("referrals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  sourceDropId: integer("source_drop_id").references(() => drops.id),
  sourceMerchantId: integer("source_merchant_id").references(() => merchants.id),
  referredMerchantId: integer("referred_merchant_id").references(() => merchants.id),
  referredBusinessName: text("referred_business_name").notNull(),
  referredContactName: varchar("referred_contact_name", { length: 100 }),
  referredPhone: varchar("referred_phone", { length: 30 }),
  status: varchar("status", { length: 30 }).default("pending").notNull(), // pending, contacted, converted, lost
  notes: text("notes"),
  agentId: varchar("agent_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  convertedAt: timestamp("converted_at"),
  // Referring party info (the person who gave the referral)
  referringPartyName: varchar("referring_party_name", { length: 100 }),
  referringPartyEmail: varchar("referring_party_email", { length: 255 }),
  referringPartyPhone: varchar("referring_party_phone", { length: 30 }),
  referringPartyAddress: text("referring_party_address"),
  referringPartyBusinessName: varchar("referring_party_business_name", { length: 200 }),
  thankYouEmailSentAt: timestamp("thank_you_email_sent_at"),
});

export const referralsRelations = relations(referrals, ({ one }) => ({
  organization: one(organizations, {
    fields: [referrals.orgId],
    references: [organizations.id],
  }),
  sourceDrop: one(drops, {
    fields: [referrals.sourceDropId],
    references: [drops.id],
  }),
  sourceMerchant: one(merchants, {
    fields: [referrals.sourceMerchantId],
    references: [merchants.id],
    relationName: "sourceMerchant",
  }),
  referredMerchant: one(merchants, {
    fields: [referrals.referredMerchantId],
    references: [merchants.id],
    relationName: "referredMerchant",
  }),
}));

export const REFERRAL_STATUSES = ["pending", "contacted", "converted", "lost"] as const;
export type ReferralStatus = typeof REFERRAL_STATUSES[number];

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  convertedAt: true,
}).extend({
  status: z.enum(REFERRAL_STATUSES).optional(),
});
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

// Follow-up Sequences table
export const followUpSequences = pgTable("follow_up_sequences", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFollowUpSequenceSchema = createInsertSchema(followUpSequences).omit({
  id: true,
  createdAt: true,
});
export type InsertFollowUpSequence = z.infer<typeof insertFollowUpSequenceSchema>;
export type FollowUpSequence = typeof followUpSequences.$inferSelect;

// Follow-up Steps table
export const followUpSteps = pgTable("follow_up_steps", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sequenceId: integer("sequence_id").notNull().references(() => followUpSequences.id),
  stepNumber: integer("step_number").notNull(),
  delayDays: integer("delay_days").notNull(), // days after drop to execute
  actionType: varchar("action_type", { length: 30 }).notNull(), // email, call_reminder, sms
  subject: varchar("subject", { length: 200 }),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const FOLLOW_UP_ACTION_TYPES = ["email", "call_reminder", "sms"] as const;
export type FollowUpActionType = typeof FOLLOW_UP_ACTION_TYPES[number];

export const insertFollowUpStepSchema = createInsertSchema(followUpSteps).omit({
  id: true,
  createdAt: true,
}).extend({
  actionType: z.enum(FOLLOW_UP_ACTION_TYPES),
});
export type InsertFollowUpStep = z.infer<typeof insertFollowUpStepSchema>;
export type FollowUpStep = typeof followUpSteps.$inferSelect;

// Follow-up Executions table (tracks active sequences for drops)
export const followUpExecutions = pgTable("follow_up_executions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  dropId: integer("drop_id").notNull().references(() => drops.id),
  sequenceId: integer("sequence_id").notNull().references(() => followUpSequences.id),
  currentStep: integer("current_step").default(1).notNull(),
  status: varchar("status", { length: 30 }).default("active").notNull(), // active, completed, cancelled
  nextExecutionAt: timestamp("next_execution_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFollowUpExecutionSchema = createInsertSchema(followUpExecutions).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});
export type InsertFollowUpExecution = z.infer<typeof insertFollowUpExecutionSchema>;
export type FollowUpExecution = typeof followUpExecutions.$inferSelect;

// Activity Events table (for Team Activity Feed)
export const activityEvents = pgTable("activity_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  agentId: varchar("agent_id").notNull(),
  agentName: varchar("agent_name", { length: 100 }),
  eventType: varchar("event_type", { length: 50 }).notNull(), // drop_created, pickup_completed, deal_signed, referral_added, etc.
  entityType: varchar("entity_type", { length: 30 }), // drop, merchant, referral
  entityId: integer("entity_id"),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ACTIVITY_EVENT_TYPES = [
  "drop_created",
  "pickup_completed",
  "deal_signed",
  "referral_added",
  "referral_converted",
  "inventory_restock",
  "sequence_started",
  "milestone_reached"
] as const;
export type ActivityEventType = typeof ACTIVITY_EVENT_TYPES[number];

export const insertActivityEventSchema = z.object({
  orgId: z.number(),
  agentId: z.string(),
  agentName: z.string().nullable().optional(),
  eventType: z.enum(ACTIVITY_EVENT_TYPES),
  entityType: z.string().nullable().optional(),
  entityId: z.number().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  metadata: z.string().nullable().optional(),
});
export type InsertActivityEvent = z.infer<typeof insertActivityEventSchema>;
export type ActivityEvent = typeof activityEvents.$inferSelect;

// AI Summaries table (for AI Call/Visit Summaries)
export const aiSummaries = pgTable("ai_summaries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  dropId: integer("drop_id").notNull().references(() => drops.id),
  summary: text("summary"),
  keyTakeaways: text("key_takeaways"), // JSON array
  objections: text("objections"), // JSON array
  nextSteps: text("next_steps"), // JSON array
  sentiment: varchar("sentiment", { length: 20 }), // positive, neutral, negative
  hotLead: boolean("hot_lead").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiSummarySchema = createInsertSchema(aiSummaries).omit({
  id: true,
  createdAt: true,
});
export type InsertAiSummary = z.infer<typeof insertAiSummarySchema>;
export type AiSummary = typeof aiSummaries.$inferSelect;

// Lead Scores table (for Lead Scoring)
export const leadScores = pgTable("lead_scores", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  dropId: integer("drop_id").notNull().references(() => drops.id).unique(),
  score: integer("score").notNull(), // 0-100
  tier: varchar("tier", { length: 20 }).notNull(), // hot, warm, cold
  factors: text("factors"), // JSON array of scoring factors
  predictedConversion: real("predicted_conversion"), // 0-1 probability
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

export const LEAD_TIERS = ["hot", "warm", "cold"] as const;
export type LeadTier = typeof LEAD_TIERS[number];

export const insertLeadScoreSchema = z.object({
  dropId: z.number(),
  score: z.number(),
  tier: z.enum(LEAD_TIERS),
  factors: z.string().nullable().optional(),
  predictedConversion: z.number().nullable().optional(),
});
export type InsertLeadScore = z.infer<typeof insertLeadScoreSchema>;
export type LeadScore = typeof leadScores.$inferSelect;

// Offline Queue table (for Better Offline Mode)
export const offlineQueue = pgTable("offline_queue", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: varchar("agent_id").notNull(),
  actionType: varchar("action_type", { length: 30 }).notNull(), // create_drop, update_drop, log_outcome
  payload: text("payload").notNull(), // JSON payload
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, synced, failed
  attempts: integer("attempts").default(0).notNull(),
  lastAttemptAt: timestamp("last_attempt_at"),
  syncedAt: timestamp("synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOfflineQueueSchema = createInsertSchema(offlineQueue).omit({
  id: true,
  createdAt: true,
  syncedAt: true,
});
export type InsertOfflineQueue = z.infer<typeof insertOfflineQueueSchema>;
export type OfflineQueue = typeof offlineQueue.$inferSelect;

// Reminder hours options
export const REMINDER_HOURS_OPTIONS = [6, 12, 24, 48] as const;
export type ReminderHours = typeof REMINDER_HOURS_OPTIONS[number];

// Invitation status enum values
export const INVITATION_STATUSES = ["pending", "accepted", "expired", "cancelled"] as const;
export type InvitationStatus = typeof INVITATION_STATUSES[number];

// Invitations table (for email invites to join organization)
export const invitations = pgTable("invitations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 30 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  invitedBy: varchar("invited_by").notNull(),
  managerId: integer("manager_id").references(() => organizationMembers.id),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.orgId],
    references: [organizations.id],
  }),
  manager: one(organizationMembers, {
    fields: [invitations.managerId],
    references: [organizationMembers.id],
  }),
}));

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
}).extend({
  role: z.enum(ORG_MEMBER_ROLES),
  status: z.enum(INVITATION_STATUSES).optional(),
});
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;

// Feedback submissions table (for feature suggestions and help requests)
export const feedbackSubmissions = pgTable("feedback_submissions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id"),
  userName: varchar("user_name", { length: 100 }),
  userEmail: varchar("user_email", { length: 255 }),
  type: varchar("type", { length: 30 }).notNull(), // feature_suggestion, help_request, bug_report
  subject: varchar("subject", { length: 200 }).notNull(),
  message: text("message").notNull(),
  attachments: jsonb("attachments").$type<{ objectPath: string; name: string; size: number; contentType: string }[]>(),
  status: varchar("status", { length: 20 }).default("new").notNull(),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const FEEDBACK_TYPES = ["feature_suggestion", "help_request", "bug_report"] as const;
export type FeedbackType = typeof FEEDBACK_TYPES[number];

export const feedbackAttachmentSchema = z.object({
  objectPath: z.string(),
  name: z.string(),
  size: z.number(),
  contentType: z.string(),
});

export const insertFeedbackSubmissionSchema = createInsertSchema(feedbackSubmissions).omit({
  id: true,
  createdAt: true,
  status: true,
  adminNotes: true,
}).extend({
  type: z.enum(FEEDBACK_TYPES),
  attachments: z.array(feedbackAttachmentSchema).optional(),
});
export type InsertFeedbackSubmission = z.infer<typeof insertFeedbackSubmissionSchema>;
export type FeedbackSubmission = typeof feedbackSubmissions.$inferSelect;

// User preferences table
export const userPreferences = pgTable("user_preferences", {
  userId: varchar("user_id").primaryKey(),
  notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
  reminderHoursBefore: integer("reminder_hours_before").default(24).notNull(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  pushNotifications: boolean("push_notifications").default(true).notNull(),
  notificationEmail: varchar("notification_email"),
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

// Role-play session types
export const ROLEPLAY_SCENARIOS = [
  "cold_approach",
  "objection_handling", 
  "closing",
  "follow_up",
  "general_practice"
] as const;
export type RoleplayScenario = typeof ROLEPLAY_SCENARIOS[number];

// Role-play modes
export const ROLEPLAY_MODES = ["roleplay", "coaching"] as const;
export type RoleplayMode = typeof ROLEPLAY_MODES[number];

// Role-play sessions table (for AI conversation role-play training)
export const roleplaySessions = pgTable("roleplay_sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: varchar("agent_id").notNull(),
  dropId: integer("drop_id").references(() => drops.id),
  personaId: integer("persona_id"), // References roleplayPersonas
  scenario: varchar("scenario", { length: 50 }).notNull(),
  mode: varchar("mode", { length: 20 }).default("roleplay").notNull(),
  businessContext: text("business_context"),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  feedback: text("feedback"),
  performanceScore: integer("performance_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const insertRoleplaySessionSchema = z.object({
  agentId: z.string(),
  dropId: z.number().nullable().optional(),
  personaId: z.number().nullable().optional(),
  scenario: z.enum(ROLEPLAY_SCENARIOS),
  mode: z.enum(ROLEPLAY_MODES).optional(),
  businessContext: z.string().nullable().optional(),
  status: z.string().optional(),
});
export type InsertRoleplaySession = z.infer<typeof insertRoleplaySessionSchema>;
export type RoleplaySession = typeof roleplaySessions.$inferSelect;

// Role-play messages table (stores conversation history)
export const roleplayMessages = pgTable("roleplay_messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sessionId: integer("session_id").notNull().references(() => roleplaySessions.id),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRoleplayMessageSchema = createInsertSchema(roleplayMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertRoleplayMessage = z.infer<typeof insertRoleplayMessageSchema>;
export type RoleplayMessage = typeof roleplayMessages.$inferSelect;

export type RoleplaySessionWithMessages = RoleplaySession & {
  messages: RoleplayMessage[];
};

// Role-play personas table (7 specific personas + 1 general combined)
export const roleplayPersonas = pgTable("roleplay_personas", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 100 }).notNull(),
  businessType: varchar("business_type", { length: 50 }).notNull(),
  personality: text("personality").notNull(), // Detailed personality description
  background: text("background").notNull(), // Business background and history
  painPoints: text("pain_points").array(), // Current challenges they face
  objections: text("objections").array(), // Common objections they raise
  communicationStyle: varchar("communication_style", { length: 50 }).notNull(),
  difficultyLevel: varchar("difficulty_level", { length: 20 }).notNull(), // easy, medium, hard
  isGeneral: boolean("is_general").default(false).notNull(), // True for the combined general persona
  isActive: boolean("is_active").default(true).notNull(),
  systemPrompt: text("system_prompt").notNull(), // AI system prompt for this persona
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRoleplayPersonaSchema = createInsertSchema(roleplayPersonas).omit({
  id: true,
  createdAt: true,
});
export type InsertRoleplayPersona = z.infer<typeof insertRoleplayPersonaSchema>;
export type RoleplayPersona = typeof roleplayPersonas.$inferSelect;

// Brochure holder types for custody tracking
export const HOLDER_TYPES = ["house", "relationship_manager", "agent"] as const;
export type HolderType = typeof HOLDER_TYPES[number];

// Brochure Locations table (tracks current holder of each brochure)
export const brochureLocations = pgTable("brochure_locations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  brochureId: varchar("brochure_id", { length: 50 }).notNull().references(() => brochures.id).unique(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  holderType: varchar("holder_type", { length: 30 }).notNull(), // house, relationship_manager, agent
  holderId: varchar("holder_id"), // userId for RM/agent, null for house
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedBy: varchar("assigned_by"), // userId who made the assignment
  notes: text("notes"),
});

export const brochureLocationsRelations = relations(brochureLocations, ({ one }) => ({
  brochure: one(brochures, {
    fields: [brochureLocations.brochureId],
    references: [brochures.id],
  }),
  organization: one(organizations, {
    fields: [brochureLocations.orgId],
    references: [organizations.id],
  }),
}));

export const insertBrochureLocationSchema = createInsertSchema(brochureLocations).omit({
  id: true,
  assignedAt: true,
}).extend({
  holderType: z.enum(HOLDER_TYPES),
});
export type InsertBrochureLocation = z.infer<typeof insertBrochureLocationSchema>;
export type BrochureLocation = typeof brochureLocations.$inferSelect;

// Brochure Location History table (tracks transfers between holders)
export const brochureLocationHistory = pgTable("brochure_location_history", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  brochureId: varchar("brochure_id", { length: 50 }).notNull().references(() => brochures.id),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  fromHolderType: varchar("from_holder_type", { length: 30 }), // null if initial registration
  fromHolderId: varchar("from_holder_id"),
  toHolderType: varchar("to_holder_type", { length: 30 }).notNull(),
  toHolderId: varchar("to_holder_id"),
  transferredBy: varchar("transferred_by").notNull(), // userId who made the transfer
  transferType: varchar("transfer_type", { length: 30 }).notNull(), // register, assign, return, deploy, lost
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const brochureLocationHistoryRelations = relations(brochureLocationHistory, ({ one }) => ({
  brochure: one(brochures, {
    fields: [brochureLocationHistory.brochureId],
    references: [brochures.id],
  }),
  organization: one(organizations, {
    fields: [brochureLocationHistory.orgId],
    references: [organizations.id],
  }),
}));

export const TRANSFER_TYPES = ["register", "assign", "return", "deploy", "lost"] as const;
export type TransferType = typeof TRANSFER_TYPES[number];

export const insertBrochureLocationHistorySchema = createInsertSchema(brochureLocationHistory).omit({
  id: true,
  createdAt: true,
}).extend({
  toHolderType: z.enum(HOLDER_TYPES),
  fromHolderType: z.enum(HOLDER_TYPES).optional().nullable(),
  transferType: z.enum(TRANSFER_TYPES),
});
export type InsertBrochureLocationHistory = z.infer<typeof insertBrochureLocationHistorySchema>;
export type BrochureLocationHistory = typeof brochureLocationHistory.$inferSelect;

// Extended brochure type with location info
export type BrochureWithLocation = Brochure & {
  location?: BrochureLocation;
};

// Meeting recording status enum
export const MEETING_RECORDING_STATUSES = ["recording", "processing", "completed", "failed"] as const;
export type MeetingRecordingStatus = typeof MEETING_RECORDING_STATUSES[number];

// Meeting recordings table (tracks field recordings for sales coaching repository)
export const meetingRecordings = pgTable("meeting_recordings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: varchar("agent_id").notNull(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  merchantId: integer("merchant_id").references(() => merchants.id),
  dropId: integer("drop_id").references(() => drops.id),
  dealId: integer("deal_id").references(() => deals.id),
  businessName: varchar("business_name", { length: 255 }),
  contactName: varchar("contact_name", { length: 255 }),
  businessPhone: varchar("business_phone", { length: 50 }),
  recordingUrl: text("recording_url"),
  durationSeconds: integer("duration_seconds"),
  status: varchar("status", { length: 30 }).default("recording").notNull(),
  transcription: text("transcription"), // Full audio transcription
  aiSummary: text("ai_summary"),
  keyTakeaways: text("key_takeaways").array(),
  objections: text("objections").array(), // Merchant objections identified by AI
  concerns: text("concerns").array(), // Merchant concerns identified by AI
  actionItems: text("action_items").array(), // Action items for follow-up
  sentiment: varchar("sentiment", { length: 30 }),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const meetingRecordingsRelations = relations(meetingRecordings, ({ one }) => ({
  organization: one(organizations, {
    fields: [meetingRecordings.orgId],
    references: [organizations.id],
  }),
  merchant: one(merchants, {
    fields: [meetingRecordings.merchantId],
    references: [merchants.id],
  }),
  drop: one(drops, {
    fields: [meetingRecordings.dropId],
    references: [drops.id],
  }),
  deal: one(deals, {
    fields: [meetingRecordings.dealId],
    references: [deals.id],
  }),
}));

export const insertMeetingRecordingSchema = createInsertSchema(meetingRecordings).omit({
  id: true,
  createdAt: true,
  emailSentAt: true,
});
export type InsertMeetingRecording = z.infer<typeof insertMeetingRecordingSchema>;
export type MeetingRecording = typeof meetingRecordings.$inferSelect;

// Voice notes table - stores transcribed voice recordings for merchants
export const voiceNotes = pgTable("voice_notes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  merchantId: integer("merchant_id").notNull().references(() => merchants.id),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").notNull(),
  transcription: text("transcription").notNull(),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const voiceNotesRelations = relations(voiceNotes, ({ one }) => ({
  merchant: one(merchants, {
    fields: [voiceNotes.merchantId],
    references: [merchants.id],
  }),
  organization: one(organizations, {
    fields: [voiceNotes.orgId],
    references: [organizations.id],
  }),
}));

export const insertVoiceNoteSchema = createInsertSchema(voiceNotes).omit({
  id: true,
  createdAt: true,
});
export type InsertVoiceNote = z.infer<typeof insertVoiceNoteSchema>;
export type VoiceNote = typeof voiceNotes.$inferSelect;

// Training documents table - stores synced content from Google Drive for AI coaching
export const trainingDocuments = pgTable("training_documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  driveFileId: varchar("drive_file_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 500 }).notNull(),
  content: text("content").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const insertTrainingDocumentSchema = createInsertSchema(trainingDocuments).omit({
  id: true,
  syncedAt: true,
});
export type InsertTrainingDocument = z.infer<typeof insertTrainingDocumentSchema>;
export type TrainingDocument = typeof trainingDocuments.$inferSelect;

// Daily Edge Belief Systems
export const DAILY_EDGE_BELIEFS = ["fulfilment", "control", "resilience", "influence", "communication"] as const;
export type DailyEdgeBelief = typeof DAILY_EDGE_BELIEFS[number];

// Daily Edge Content Types
export const DAILY_EDGE_CONTENT_TYPES = ["quote", "insight", "challenge", "iconic_story", "journey_motivator"] as const;
export type DailyEdgeContentType = typeof DAILY_EDGE_CONTENT_TYPES[number];

// Daily Edge Content table - stores motivation/mindset training content
export const dailyEdgeContent = pgTable("daily_edge_content", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  belief: varchar("belief", { length: 50 }).notNull(),
  contentType: varchar("content_type", { length: 30 }).notNull(),
  title: varchar("title", { length: 200 }),
  content: text("content").notNull(),
  source: varchar("source", { length: 100 }),
  difficulty: varchar("difficulty", { length: 20 }).default("all"),
  tags: text("tags").array(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDailyEdgeContentSchema = createInsertSchema(dailyEdgeContent).omit({
  id: true,
  createdAt: true,
});
export type InsertDailyEdgeContent = z.infer<typeof insertDailyEdgeContentSchema>;
export type DailyEdgeContent = typeof dailyEdgeContent.$inferSelect;

// User Daily Edge engagement table - tracks which content users have seen
export const userDailyEdge = pgTable("user_daily_edge", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  contentId: integer("content_id").notNull().references(() => dailyEdgeContent.id),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
  completedChallenge: boolean("completed_challenge").default(false),
  reflection: text("reflection"),
  rating: integer("rating"),
});

export const userDailyEdgeRelations = relations(userDailyEdge, ({ one }) => ({
  content: one(dailyEdgeContent, {
    fields: [userDailyEdge.contentId],
    references: [dailyEdgeContent.id],
  }),
}));

export const insertUserDailyEdgeSchema = createInsertSchema(userDailyEdge).omit({
  id: true,
  viewedAt: true,
});
export type InsertUserDailyEdge = z.infer<typeof insertUserDailyEdgeSchema>;
export type UserDailyEdge = typeof userDailyEdge.$inferSelect;

// User Belief Progress table - tracks overall progress through each belief system
export const userBeliefProgress = pgTable("user_belief_progress", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  belief: varchar("belief", { length: 50 }).notNull(),
  contentViewed: integer("content_viewed").default(0),
  challengesCompleted: integer("challenges_completed").default(0),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivity: timestamp("last_activity"),
}, (table) => ({
  userBeliefUnique: unique().on(table.userId, table.belief),
}));

export const insertUserBeliefProgressSchema = createInsertSchema(userBeliefProgress).omit({
  id: true,
});
export type InsertUserBeliefProgress = z.infer<typeof insertUserBeliefProgressSchema>;
export type UserBeliefProgress = typeof userBeliefProgress.$inferSelect;

// Daily Edge Streaks table - tracks consecutive days of engagement
export const dailyEdgeStreaks = pgTable("daily_edge_streaks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().unique(),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActiveDate: timestamp("last_active_date"),
  totalDaysActive: integer("total_days_active").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDailyEdgeStreakSchema = createInsertSchema(dailyEdgeStreaks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDailyEdgeStreak = z.infer<typeof insertDailyEdgeStreakSchema>;
export type DailyEdgeStreak = typeof dailyEdgeStreaks.$inferSelect;

// ============================================
// EquipIQ - Equipment Recommendation System
// ============================================

// Equipment vendors (SwipeSimple, Dejavoo, MX POS, etc.)
export const equipmentVendors = pgTable("equipment_vendors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  vendorId: varchar("vendor_id", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  company: varchar("company", { length: 100 }),
  website: varchar("website", { length: 255 }),
  description: text("description"),
  targetMarket: text("target_market"),
  pricingModel: varchar("pricing_model", { length: 100 }),
  support: text("support"),
  keyDifferentiators: text("key_differentiators").array(),
  logoUrl: varchar("logo_url", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEquipmentVendorSchema = createInsertSchema(equipmentVendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEquipmentVendor = z.infer<typeof insertEquipmentVendorSchema>;
export type EquipmentVendor = typeof equipmentVendors.$inferSelect;

// Equipment products (terminals, POS systems, software)
export const equipmentProducts = pgTable("equipment_products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  vendorId: varchar("vendor_id", { length: 50 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // hardware, software
  type: varchar("type", { length: 50 }).notNull(), // countertop, wireless, mobile, pos_system, gateway, etc.
  name: varchar("name", { length: 200 }).notNull(),
  model: varchar("model", { length: 100 }),
  description: text("description"),
  features: text("features").array(),
  bestFor: text("best_for").array(),
  priceRange: varchar("price_range", { length: 100 }),
  url: varchar("url", { length: 255 }),
  imageUrl: varchar("image_url", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEquipmentProductSchema = createInsertSchema(equipmentProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEquipmentProduct = z.infer<typeof insertEquipmentProductSchema>;
export type EquipmentProduct = typeof equipmentProducts.$inferSelect;

// Equipment business types for matching
export const equipmentBusinessTypes = pgTable("equipment_business_types", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  keywords: text("keywords").array(),
});

export const insertEquipmentBusinessTypeSchema = createInsertSchema(equipmentBusinessTypes).omit({
  id: true,
});
export type InsertEquipmentBusinessType = z.infer<typeof insertEquipmentBusinessTypeSchema>;
export type EquipmentBusinessType = typeof equipmentBusinessTypes.$inferSelect;

// Equipment recommendation sessions (for tracking agent recommendations)
export const equipmentRecommendationSessions = pgTable("equipment_recommendation_sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  businessType: varchar("business_type", { length: 100 }),
  monthlyVolume: varchar("monthly_volume", { length: 50 }),
  mobilityNeeds: varchar("mobility_needs", { length: 50 }),
  integrationNeeds: text("integration_needs").array(),
  budgetPriority: varchar("budget_priority", { length: 50 }),
  recommendedProducts: integer("recommended_products").array(),
  aiResponse: text("ai_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEquipmentRecommendationSessionSchema = createInsertSchema(equipmentRecommendationSessions).omit({
  id: true,
  createdAt: true,
});
export type InsertEquipmentRecommendationSession = z.infer<typeof insertEquipmentRecommendationSessionSchema>;
export type EquipmentRecommendationSession = typeof equipmentRecommendationSessions.$inferSelect;

// Equipment training quiz results
export const equipmentQuizResults = pgTable("equipment_quiz_results", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  vendorId: varchar("vendor_id", { length: 50 }),
  difficulty: varchar("difficulty", { length: 20 }), // beginner, intermediate, advanced
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  score: real("score").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const insertEquipmentQuizResultSchema = createInsertSchema(equipmentQuizResults).omit({
  id: true,
  completedAt: true,
});
export type InsertEquipmentQuizResult = z.infer<typeof insertEquipmentQuizResultSchema>;
export type EquipmentQuizResult = typeof equipmentQuizResults.$inferSelect;

// ============================================
// Presentation Training System
// ============================================

// Presentation Modules table (8 modules for the training curriculum)
export const presentationModules = pgTable("presentation_modules", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  moduleNumber: integer("module_number").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const presentationModulesRelations = relations(presentationModules, ({ many }) => ({
  lessons: many(presentationLessons),
}));

export const insertPresentationModuleSchema = createInsertSchema(presentationModules).omit({
  id: true,
  createdAt: true,
});
export type InsertPresentationModule = z.infer<typeof insertPresentationModuleSchema>;
export type PresentationModule = typeof presentationModules.$inferSelect;

// Presentation Lessons table (individual lessons within modules)
export const presentationLessons = pgTable("presentation_lessons", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  moduleId: integer("module_id").notNull().references(() => presentationModules.id),
  lessonNumber: integer("lesson_number").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  scriptText: text("script_text"),
  psychology: text("psychology"),
  timing: text("timing"),
  commonMistakes: text("common_mistakes"),
  practicePrompt: text("practice_prompt"),
  videoId: varchar("video_id", { length: 10 }),
  paragraphId: varchar("paragraph_id", { length: 20 }),
  mechanism: varchar("mechanism", { length: 100 }),
  psychologyTag: varchar("psychology_tag", { length: 100 }),
  whenToUse: text("when_to_use"),
  keyQuestions: text("key_questions").array(),
  whyItWorksEnhanced: jsonb("why_it_works_enhanced"),
  practiceDrill: jsonb("practice_drill"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const presentationLessonsRelations = relations(presentationLessons, ({ one, many }) => ({
  module: one(presentationModules, {
    fields: [presentationLessons.moduleId],
    references: [presentationModules.id],
  }),
  progress: many(presentationProgress),
  quizzes: many(presentationQuizzes),
}));

export const insertPresentationLessonSchema = createInsertSchema(presentationLessons).omit({
  id: true,
  createdAt: true,
});
export type InsertPresentationLesson = z.infer<typeof insertPresentationLessonSchema>;
export type PresentationLesson = typeof presentationLessons.$inferSelect;

// Presentation Progress table (tracks user progress through lessons)
export const presentationProgress = pgTable("presentation_progress", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  lessonId: integer("lesson_id").notNull().references(() => presentationLessons.id),
  userId: varchar("user_id").notNull(),
  completed: boolean("completed").default(false).notNull(),
  practiceRecorded: boolean("practice_recorded").default(false).notNull(),
  quizPassed: boolean("quiz_passed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  lessonUserUnique: unique().on(table.lessonId, table.userId),
}));

export const presentationProgressRelations = relations(presentationProgress, ({ one }) => ({
  lesson: one(presentationLessons, {
    fields: [presentationProgress.lessonId],
    references: [presentationLessons.id],
  }),
}));

export const insertPresentationProgressSchema = createInsertSchema(presentationProgress).omit({
  id: true,
  createdAt: true,
});
export type InsertPresentationProgress = z.infer<typeof insertPresentationProgressSchema>;
export type PresentationProgress = typeof presentationProgress.$inferSelect;

// Presentation Quizzes table (quiz questions for each lesson)
export const presentationQuizzes = pgTable("presentation_quizzes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  lessonId: integer("lesson_id").notNull().references(() => presentationLessons.id),
  question: text("question").notNull(),
  options: text("options").array().notNull(),
  correctIndex: integer("correct_index").notNull(),
  explanation: text("explanation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const presentationQuizzesRelations = relations(presentationQuizzes, ({ one }) => ({
  lesson: one(presentationLessons, {
    fields: [presentationQuizzes.lessonId],
    references: [presentationLessons.id],
  }),
}));

export const insertPresentationQuizSchema = createInsertSchema(presentationQuizzes).omit({
  id: true,
  createdAt: true,
});
export type InsertPresentationQuiz = z.infer<typeof insertPresentationQuizSchema>;
export type PresentationQuiz = typeof presentationQuizzes.$inferSelect;

// Presentation Practice Responses table (stores user practice attempts with AI feedback)
export const presentationPracticeResponses = pgTable("presentation_practice_responses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  lessonId: integer("lesson_id").notNull().references(() => presentationLessons.id),
  userId: varchar("user_id").notNull(),
  practiceResponse: text("practice_response").notNull(),
  aiFeedback: text("ai_feedback"),
  feedbackScore: integer("feedback_score"), // 1-100 score from AI
  strengths: text("strengths").array(), // What the user did well
  improvements: text("improvements").array(), // Areas to improve
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const presentationPracticeResponsesRelations = relations(presentationPracticeResponses, ({ one }) => ({
  lesson: one(presentationLessons, {
    fields: [presentationPracticeResponses.lessonId],
    references: [presentationLessons.id],
  }),
}));

export const insertPresentationPracticeResponseSchema = createInsertSchema(presentationPracticeResponses).omit({
  id: true,
  createdAt: true,
});
export type InsertPresentationPracticeResponse = z.infer<typeof insertPresentationPracticeResponseSchema>;
export type PresentationPracticeResponse = typeof presentationPracticeResponses.$inferSelect;

// Extended types for presentation training
export type PresentationModuleWithLessons = PresentationModule & {
  lessons: PresentationLesson[];
};

export type PresentationLessonWithProgress = PresentationLesson & {
  progress?: PresentationProgress;
  quizzes?: PresentationQuiz[];
};

// ============================================
// Proposal Generator - Merchant Processing Proposals
// ============================================

export const proposals = pgTable("proposals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  merchantId: integer("merchant_id").references(() => merchants.id),
  
  // Merchant info
  merchantName: varchar("merchant_name", { length: 255 }).notNull(),
  preparedDate: timestamp("prepared_date").defaultNow().notNull(),
  agentName: varchar("agent_name", { length: 255 }),
  agentTitle: varchar("agent_title", { length: 255 }),
  
  // Current state data (parsed from uploads)
  currentState: jsonb("current_state").$type<{
    totalVolume: number;
    totalTransactions: number;
    avgTicket: number;
    cardBreakdown: {
      visa: { volume: number; transactions: number; ratePercent: number; perTxFee: number; totalCost: number };
      mastercard: { volume: number; transactions: number; ratePercent: number; perTxFee: number; totalCost: number };
      discover: { volume: number; transactions: number; ratePercent: number; perTxFee: number; totalCost: number };
      amex: { volume: number; transactions: number; ratePercent: number; perTxFee: number; totalCost: number };
    };
    fees: {
      statementFee: number;
      pciNonCompliance: number;
      creditPassthrough: number;
      otherFees: number;
      batchHeader: number;
    };
    totalMonthlyCost: number;
    effectiveRatePercent: number;
  }>(),
  
  // Interchange Plus option
  optionInterchangePlus: jsonb("option_interchange_plus").$type<{
    discountRatePercent: number;
    perTransactionFee: number;
    projectedCosts: {
      visaCost: number;
      mastercardCost: number;
      discoverCost: number;
      amexCost: number;
      transactionFees: number;
      onFileFee: number;
      creditPassthrough: number;
      otherFees: number;
    };
    totalMonthlyCost: number;
    monthlySavings: number;
    savingsPercent: number;
    annualSavings: number;
  }>(),
  
  // Dual Pricing option
  optionDualPricing: jsonb("option_dual_pricing").$type<{
    merchantDiscountRate: number;
    perTransactionFee: number;
    monthlyProgramFee: number;
    projectedCosts: {
      processingCost: number;
      dualPricingMonthly: number;
      creditPassthrough: number;
      otherFees: number;
    };
    totalMonthlyCost: number;
    monthlySavings: number;
    savingsPercent: number;
    annualSavings: number;
  }>(),
  
  // Equipment selection
  selectedTerminalId: integer("selected_terminal_id"),
  terminalName: varchar("terminal_name", { length: 255 }),
  terminalFeatures: text("terminal_features").array(),
  terminalImageUrl: varchar("terminal_image_url", { length: 500 }),
  whySelected: text("why_selected"),
  
  // Generated proposal content
  proposalBlueprint: jsonb("proposal_blueprint"),
  
  // Document URLs
  pdfUrl: varchar("pdf_url", { length: 500 }),
  docxUrl: varchar("docx_url", { length: 500 }),
  
  // Status
  status: varchar("status", { length: 50 }).default("draft").notNull(), // draft, generated, sent
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const proposalsRelations = relations(proposals, ({ one }) => ({
  organization: one(organizations, {
    fields: [proposals.organizationId],
    references: [organizations.id],
  }),
  merchant: one(merchants, {
    fields: [proposals.merchantId],
    references: [merchants.id],
  }),
}));

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;

// ============================================
// Proposal Jobs - Agentic Workflow Tracking
// ============================================

export type ProposalJobStep = 
  | "parsing_documents"
  | "scraping_website"
  | "extracting_pricing"
  | "ai_analysis"
  | "generating_images"
  | "building_document"
  | "finalizing";

export type ProposalJobStatus = "pending" | "running" | "completed" | "failed";

export interface ProposalJobStepStatus {
  step: ProposalJobStep;
  status: ProposalJobStatus;
  message: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface MerchantScrapedData {
  logoUrl: string | null;
  logoBase64: string | null;
  businessName: string | null;
  businessDescription: string | null;
  address: string | null;
  phone: string | null;
  industry: string | null;
  websiteUrl: string | null;
  ownerName?: string | null;
  email?: string | null;
}

export interface SalespersonInfo {
  name: string;
  title: string;
  email: string;
  phone: string;
  photoUrl?: string;
}

export interface PricingComparison {
  currentProcessor: {
    monthlyVolume: number;
    monthlyTransactions: number;
    avgTicket: number;
    monthlyFees: number;
    effectiveRate: number;
    annualCost: number;
    cardBreakdown: {
      visa: { volume: number; cost: number };
      mastercard: { volume: number; cost: number };
      discover: { volume: number; cost: number };
      amex: { volume: number; cost: number };
    };
  };
  dualPricing?: {
    monthlyFees: number;
    monthlySavings: number;
    annualSavings: number;
    savingsPercent: number;
    programFee: number;
  };
  interchangePlus?: {
    monthlyFees: number;
    monthlySavings: number;
    annualSavings: number;
    savingsPercent: number;
    discountRate: number;
    perTxFee: number;
  };
  recommendedOption: "dual_pricing" | "interchange_plus";
}

export const proposalJobs = pgTable("proposal_jobs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  currentStep: varchar("current_step", { length: 100 }),
  
  steps: jsonb("steps").$type<ProposalJobStepStatus[]>().default([]),
  
  merchantWebsiteUrl: varchar("merchant_website_url", { length: 500 }),
  merchantScrapedData: jsonb("merchant_scraped_data").$type<MerchantScrapedData>(),
  
  salespersonInfo: jsonb("salesperson_info").$type<SalespersonInfo>(),
  
  pricingComparison: jsonb("pricing_comparison").$type<PricingComparison>(),
  
  generatedImages: jsonb("generated_images").$type<{
    heroBanner?: string;
    comparisonBackground?: string;
    trustVisual?: string;
  }>(),
  
  aiGeneratedContent: jsonb("ai_generated_content").$type<{
    executiveSummary?: string;
    opportunityStatement?: string;
    recommendationSummary?: string;
    recommendationReasons?: string[];
    valuePropositions?: string[];
    industryInsights?: string;
    closingStatement?: string;
    urgencyMessage?: string;
  }>(),
  
  selectedEquipmentId: integer("selected_equipment_id"),
  outputFormat: varchar("output_format", { length: 10 }).default("pdf"),
  proposalStyle: varchar("proposal_style", { length: 20 }).default("one-page"),
  
  proposalId: integer("proposal_id").references(() => proposals.id),
  pdfUrl: text("pdf_url"),
  docxUrl: text("docx_url"),
  
  errors: text("errors").array().default([]),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertProposalJobSchema = createInsertSchema(proposalJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});
export type InsertProposalJob = z.infer<typeof insertProposalJobSchema>;
export type ProposalJob = typeof proposalJobs.$inferSelect;

// ============================================
// E-Signature Document Library
// ============================================

// Document categories
export const ESIGN_DOCUMENT_CATEGORIES = ["application", "equipment", "compliance", "addendum", "internal"] as const;
export type ESignDocumentCategory = typeof ESIGN_DOCUMENT_CATEGORIES[number];

// Form field types
export const ESIGN_FIELD_TYPES = ["text", "number", "email", "phone", "date", "select", "checkbox", "signature", "ssn", "ein", "currency", "percentage", "textarea"] as const;
export type ESignFieldType = typeof ESIGN_FIELD_TYPES[number];

// E-signature providers
export const ESIGN_PROVIDERS = ["signnow", "docusign", "hellosign", "pandadoc"] as const;
export type ESignProvider = typeof ESIGN_PROVIDERS[number];

// E-signature request statuses
export const ESIGN_STATUSES = ["draft", "pending_send", "sent", "viewed", "partially_signed", "completed", "declined", "expired", "voided"] as const;
export type ESignStatus = typeof ESIGN_STATUSES[number];

// Signer roles
export const SIGNER_ROLES = ["merchant_owner", "merchant_officer", "guarantor", "agent"] as const;
export type SignerRole = typeof SIGNER_ROLES[number];

// Signer statuses
export const SIGNER_STATUSES = ["pending", "sent", "viewed", "signed", "declined"] as const;
export type SignerStatus = typeof SIGNER_STATUSES[number];

// E-signature document templates (stored in DB for customization)
export const esignDocumentTemplates = pgTable("esign_document_templates", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(),
  thumbnailPath: varchar("thumbnail_path", { length: 255 }),
  pdfPath: varchar("pdf_path", { length: 255 }),
  pageIndex: integer("page_index"),
  signNowTemplateId: varchar("signnow_template_id", { length: 100 }),
  formFields: jsonb("form_fields").$type<{
    id: string;
    fieldName: string;
    label: string;
    type: ESignFieldType;
    required: boolean;
    placeholder?: string;
    defaultValue?: string;
    options?: { value: string; label: string }[];
    mappedFrom?: string;
  }[]>().default([]),
  isRequired: boolean("is_required").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEsignDocumentTemplateSchema = createInsertSchema(esignDocumentTemplates).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertEsignDocumentTemplate = z.infer<typeof insertEsignDocumentTemplateSchema>;
export type EsignDocumentTemplate = typeof esignDocumentTemplates.$inferSelect;

// E-signature document packages (predefined sets of documents)
export const esignDocumentPackages = pgTable("esign_document_packages", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  documentTemplateIds: text("document_template_ids").array().default([]),
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEsignDocumentPackageSchema = createInsertSchema(esignDocumentPackages).omit({
  createdAt: true,
});
export type InsertEsignDocumentPackage = z.infer<typeof insertEsignDocumentPackageSchema>;
export type EsignDocumentPackage = typeof esignDocumentPackages.$inferSelect;

// E-signature requests (actual signing sessions)
export const esignRequests = pgTable("esign_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orgId: integer("org_id").notNull().references(() => organizations.id),
  agentId: varchar("agent_id").notNull(),
  merchantId: integer("merchant_id").references(() => merchants.id),
  dealId: integer("deal_id").references(() => deals.id),
  
  // Document info
  documentIds: text("document_ids").array().default([]),
  packageId: varchar("package_id", { length: 100 }),
  
  // Merchant info snapshot
  merchantName: varchar("merchant_name", { length: 255 }),
  merchantEmail: varchar("merchant_email", { length: 255 }),
  merchantPhone: varchar("merchant_phone", { length: 30 }),
  
  // Form field values (filled by user)
  fieldValues: jsonb("field_values").$type<Record<string, any>>().default({}),
  
  // E-signature provider info
  provider: varchar("provider", { length: 50 }),
  externalRequestId: varchar("external_request_id", { length: 255 }),
  
  // Status tracking
  status: varchar("status", { length: 30 }).default("draft").notNull(),
  
  // Signers info
  signers: jsonb("signers").$type<{
    id: string;
    name: string;
    email: string;
    role: SignerRole;
    status: SignerStatus;
    signedAt?: string;
    ipAddress?: string;
  }[]>().default([]),
  
  // Signed document URL
  signedDocumentUrl: text("signed_document_url"),
  
  // Timestamps
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const esignRequestsRelations = relations(esignRequests, ({ one }) => ({
  organization: one(organizations, {
    fields: [esignRequests.orgId],
    references: [organizations.id],
  }),
  merchant: one(merchants, {
    fields: [esignRequests.merchantId],
    references: [merchants.id],
  }),
  deal: one(deals, {
    fields: [esignRequests.dealId],
    references: [deals.id],
  }),
}));

export const insertEsignRequestSchema = createInsertSchema(esignRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
  viewedAt: true,
  completedAt: true,
});
export type InsertEsignRequest = z.infer<typeof insertEsignRequestSchema>;
export type EsignRequest = typeof esignRequests.$inferSelect;

// Extended merchant type for e-signature with full address info
export interface EsignMerchantRecord {
  id: string;
  businessName: string;
  dbaName?: string;
  corporateLegalName?: string;
  businessAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  mailingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  businessPhone: string;
  businessEmail: string;
  businessWebsite?: string;
  federalTaxId?: string;
  businessType?: string;
  ownershipType?: string;
  yearsInBusiness?: number;
  averageTicket?: number;
  annualVolume?: number;
  owner: {
    firstName: string;
    lastName: string;
    fullName?: string;
    email: string;
    phone: string;
    dateOfBirth?: string;
    ssn?: string;
    homeAddress?: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
    ownershipPercentage?: number;
  };
  status: string;
}

// ==================== STATEMENT LEARNING SYSTEM ====================

// Fee categories for the fee dictionary
export const FEE_CATEGORIES = [
  "interchange",
  "network",
  "assessment",
  "processor",
  "monthly",
  "compliance",
  "equipment",
  "markup",
  "other"
] as const;
export type FeeCategory = typeof FEE_CATEGORIES[number];

// Processor names for statement extraction
export const PROCESSOR_NAMES = [
  "CardConnect",
  "First Data",
  "Fiserv",
  "TSYS",
  "Worldpay",
  "Vantiv",
  "Square",
  "Stripe",
  "Heartland",
  "Elavon",
  "Clover",
  "Toast",
  "Global Payments",
  "Chase Paymentech",
  "Wells Fargo",
  "PNC Merchant Services",
  "Gravity Payments",
  "PayPal",
  "Unknown"
] as const;
export type ProcessorName = typeof PROCESSOR_NAMES[number];

// Fee dictionary table - stores fee definitions for learning
export const feeDictionary = pgTable("fee_dictionary", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  feeName: varchar("fee_name", { length: 100 }).notNull(),
  feeAliases: text("fee_aliases").array(),
  category: varchar("category", { length: 50 }).notNull(),
  description: text("description"),
  cardBrand: varchar("card_brand", { length: 30 }),
  typicalAmountType: varchar("typical_amount_type", { length: 30 }),
  typicalAmountMin: real("typical_amount_min"),
  typicalAmountMax: real("typical_amount_max"),
  isNegotiable: boolean("is_negotiable").default(false),
  salesTalkingPoint: text("sales_talking_point"),
  processorSpecific: varchar("processor_specific", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFeeDictionarySchema = createInsertSchema(feeDictionary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFeeDictionary = z.infer<typeof insertFeeDictionarySchema>;
export type FeeDictionary = typeof feeDictionary.$inferSelect;

// Statement extractions table - stores successful extractions for learning
export const statementExtractions = pgTable("statement_extractions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orgId: integer("org_id").references(() => organizations.id),
  userId: varchar("user_id", { length: 255 }),
  merchantId: integer("merchant_id").references(() => merchants.id),
  
  processorName: varchar("processor_name", { length: 100 }).notNull(),
  processorConfidence: real("processor_confidence"),
  
  statementHash: varchar("statement_hash", { length: 64 }),
  anonymizedText: text("anonymized_text"),
  
  volumeRange: varchar("volume_range", { length: 30 }),
  transactionCount: integer("transaction_count"),
  effectiveRate: real("effective_rate"),
  
  extractedData: jsonb("extracted_data").$type<{
    merchantName?: string;
    totalVolume: number;
    totalTransactions: number;
    totalFees: number;
    effectiveRate: number;
    cardMix?: {
      visa?: { volume: number; transactions: number };
      mastercard?: { volume: number; transactions: number };
      discover?: { volume: number; transactions: number };
      amex?: { volume: number; transactions: number };
      debit?: { volume: number; transactions: number };
    };
    feeBreakdown?: Record<string, number>;
  }>(),
  
  extractionMethod: varchar("extraction_method", { length: 50 }),
  extractionConfidence: real("extraction_confidence"),
  extractionPrompt: text("extraction_prompt"),
  
  wasSuccessful: boolean("was_successful").default(true),
  userCorrected: boolean("user_corrected").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const statementExtractionsRelations = relations(statementExtractions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [statementExtractions.orgId],
    references: [organizations.id],
  }),
  merchant: one(merchants, {
    fields: [statementExtractions.merchantId],
    references: [merchants.id],
  }),
  corrections: many(extractionCorrections),
}));

export const insertStatementExtractionSchema = createInsertSchema(statementExtractions).omit({
  id: true,
  createdAt: true,
});
export type InsertStatementExtraction = z.infer<typeof insertStatementExtractionSchema>;
export type StatementExtraction = typeof statementExtractions.$inferSelect;

// Extraction corrections table - stores user corrections for learning
export const extractionCorrections = pgTable("extraction_corrections", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  extractionId: integer("extraction_id").notNull().references(() => statementExtractions.id),
  userId: varchar("user_id", { length: 255 }),
  orgId: integer("org_id").references(() => organizations.id),
  
  fieldName: varchar("field_name", { length: 100 }).notNull(),
  originalValue: text("original_value"),
  correctedValue: text("corrected_value").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const extractionCorrectionsRelations = relations(extractionCorrections, ({ one }) => ({
  extraction: one(statementExtractions, {
    fields: [extractionCorrections.extractionId],
    references: [statementExtractions.id],
  }),
  organization: one(organizations, {
    fields: [extractionCorrections.orgId],
    references: [organizations.id],
  }),
}));

export const insertExtractionCorrectionSchema = createInsertSchema(extractionCorrections).omit({
  id: true,
  createdAt: true,
});
export type InsertExtractionCorrection = z.infer<typeof insertExtractionCorrectionSchema>;
export type ExtractionCorrection = typeof extractionCorrections.$inferSelect;

// ============================================
// AI-Powered Prospect Finder
// ============================================

export const PROSPECT_STATUSES = [
  "discovered",
  "contacted", 
  "qualified",
  "proposal_sent",
  "negotiating",
  "won",
  "lost",
  "disqualified"
] as const;
export type ProspectStatus = typeof PROSPECT_STATUSES[number];

export const PROSPECT_SOURCES = ["ai_search", "manual", "import"] as const;
export type ProspectSource = typeof PROSPECT_SOURCES[number];

export const prospects = pgTable("prospects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").references(() => organizations.id),
  agentId: varchar("agent_id", { length: 255 }).notNull(),
  
  businessName: varchar("business_name", { length: 255 }).notNull(),
  dbaName: varchar("dba_name", { length: 255 }),
  addressLine1: varchar("address_line1", { length: 255 }),
  addressLine2: varchar("address_line2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 500 }),
  
  mccCode: varchar("mcc_code", { length: 4 }),
  mccDescription: varchar("mcc_description", { length: 255 }),
  businessType: varchar("business_type", { length: 100 }),
  riskLevel: integer("risk_level").default(1),
  
  hoursOfOperation: varchar("hours_of_operation", { length: 255 }),
  ownerName: varchar("owner_name", { length: 255 }),
  yearEstablished: varchar("year_established", { length: 10 }),
  businessDescription: text("business_description"),
  
  source: varchar("source", { length: 50 }).default("ai_search"),
  aiConfidenceScore: numeric("ai_confidence_score", { precision: 3, scale: 2 }),
  searchQuery: text("search_query"),
  
  status: varchar("status", { length: 20 }).default("discovered").notNull(),
  
  lastContactDate: timestamp("last_contact_date"),
  nextFollowupDate: timestamp("next_followup_date"),
  contactAttempts: integer("contact_attempts").default(0),
  notes: text("notes"),
  
  convertedToMerchantId: integer("converted_to_merchant_id").references(() => merchants.id),
  convertedAt: timestamp("converted_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const prospectsRelations = relations(prospects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [prospects.organizationId],
    references: [organizations.id],
  }),
  convertedMerchant: one(merchants, {
    fields: [prospects.convertedToMerchantId],
    references: [merchants.id],
  }),
  activities: many(prospectActivities),
}));

export const insertProspectSchema = createInsertSchema(prospects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProspect = z.infer<typeof insertProspectSchema>;
export type Prospect = typeof prospects.$inferSelect;

export const prospectActivities = pgTable("prospect_activities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  prospectId: integer("prospect_id").notNull().references(() => prospects.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id", { length: 255 }).notNull(),
  
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const prospectActivitiesRelations = relations(prospectActivities, ({ one }) => ({
  prospect: one(prospects, {
    fields: [prospectActivities.prospectId],
    references: [prospects.id],
  }),
}));

export const insertProspectActivitySchema = createInsertSchema(prospectActivities).omit({
  id: true,
  createdAt: true,
});
export type InsertProspectActivity = z.infer<typeof insertProspectActivitySchema>;
export type ProspectActivity = typeof prospectActivities.$inferSelect;

// Prospect search job statuses for background processing
export const PROSPECT_JOB_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export type ProspectJobStatus = typeof PROSPECT_JOB_STATUSES[number];

export const prospectSearches = pgTable("prospect_searches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: varchar("agent_id", { length: 255 }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  
  // Search Parameters
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  locationDisplay: varchar("location_display", { length: 100 }),
  businessTypes: text("business_types").array(),
  businessTypesDisplay: varchar("business_types_display", { length: 500 }),
  radiusMiles: integer("radius_miles").default(10),
  maxResults: integer("max_results").default(10),
  
  // Job Status for Background Processing
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  progress: integer("progress").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Results (stored as JSONB when complete)
  results: jsonb("results"),
  resultsCount: integer("results_count"),
  
  // Error Handling
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  // Notification Tracking
  notificationSent: boolean("notification_sent").default(false),
  notificationSentAt: timestamp("notification_sent_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const prospectSearchesRelations = relations(prospectSearches, ({ one }) => ({
  organization: one(organizations, {
    fields: [prospectSearches.organizationId],
    references: [organizations.id],
  }),
}));

export const insertProspectSearchSchema = createInsertSchema(prospectSearches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
  results: true,
  resultsCount: true,
  errorMessage: true,
  notificationSent: true,
  notificationSentAt: true,
});
export type InsertProspectSearch = z.infer<typeof insertProspectSearchSchema>;
export type ProspectSearch = typeof prospectSearches.$inferSelect;

// Statement Analysis Job statuses for background processing
export const STATEMENT_JOB_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export type StatementJobStatus = typeof STATEMENT_JOB_STATUSES[number];

export const statementAnalysisJobs = pgTable("statement_analysis_jobs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: varchar("agent_id", { length: 255 }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  
  // Job Configuration
  jobName: varchar("job_name", { length: 255 }),
  fileNames: text("file_names").array(),
  fileUrls: text("file_urls").array(),
  extractedTexts: text("extracted_texts").array(),
  
  // Job Status for Background Processing
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  progress: integer("progress").default(0),
  progressMessage: varchar("progress_message", { length: 255 }),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Results (stored as JSONB when complete)
  results: jsonb("results"),
  
  // Error Handling
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  // Notification Tracking
  notificationSent: boolean("notification_sent").default(false),
  notificationSentAt: timestamp("notification_sent_at"),
  
  // Validation & Manual Review (for hardened extraction)
  confidence: integer("confidence"),
  needsManualReview: boolean("needs_manual_review").default(false),
  reviewReasons: jsonb("review_reasons"),
  validationResult: jsonb("validation_result"),
  manuallyReviewed: boolean("manually_reviewed").default(false),
  reviewedAt: timestamp("reviewed_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const statementAnalysisJobsRelations = relations(statementAnalysisJobs, ({ one }) => ({
  organization: one(organizations, {
    fields: [statementAnalysisJobs.organizationId],
    references: [organizations.id],
  }),
}));

export const insertStatementAnalysisJobSchema = createInsertSchema(statementAnalysisJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
  results: true,
  errorMessage: true,
  notificationSent: true,
  notificationSentAt: true,
  confidence: true,
  needsManualReview: true,
  reviewReasons: true,
  validationResult: true,
  manuallyReviewed: true,
  reviewedAt: true,
});
export type InsertStatementAnalysisJob = z.infer<typeof insertStatementAnalysisJobSchema>;
export type StatementAnalysisJob = typeof statementAnalysisJobs.$inferSelect;

// Proposal Parse Jobs for background processing
export const PROPOSAL_PARSE_JOB_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export type ProposalParseJobStatus = typeof PROPOSAL_PARSE_JOB_STATUSES[number];

export const proposalParseJobs = pgTable("proposal_parse_jobs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: varchar("agent_id", { length: 255 }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  
  // Job Configuration
  jobName: varchar("job_name", { length: 255 }),
  fileNames: text("file_names").array(),
  filePaths: text("file_paths").array(),
  fileMimeTypes: text("file_mime_types").array(),
  
  // Job Status for Background Processing
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  progress: integer("progress").default(0),
  progressMessage: varchar("progress_message", { length: 255 }),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Results (stored as JSONB when complete)
  parsedData: jsonb("parsed_data"),
  extractionWarnings: text("extraction_warnings").array(),
  
  // Error Handling
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  // Notification Tracking
  notificationSent: boolean("notification_sent").default(false),
  notificationSentAt: timestamp("notification_sent_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const proposalParseJobsRelations = relations(proposalParseJobs, ({ one }) => ({
  organization: one(organizations, {
    fields: [proposalParseJobs.organizationId],
    references: [organizations.id],
  }),
}));

export const insertProposalParseJobSchema = createInsertSchema(proposalParseJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
  parsedData: true,
  extractionWarnings: true,
  errorMessage: true,
  notificationSent: true,
  notificationSentAt: true,
});
export type InsertProposalParseJob = z.infer<typeof insertProposalParseJobSchema>;
export type ProposalParseJob = typeof proposalParseJobs.$inferSelect;

// Push notification subscriptions for web push
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  
  endpoint: text("endpoint").notNull(),
  keysP256dh: text("keys_p256dh").notNull(),
  keysAuth: text("keys_auth").notNull(),
  userAgent: text("user_agent"),
  
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [pushSubscriptions.organizationId],
    references: [organizations.id],
  }),
}));

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// Email Digest Preferences table
export const emailDigestPreferences = pgTable("email_digest_preferences", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  organizationId: integer("organization_id"),
  
  // Enable/Disable
  dailyDigestEnabled: boolean("daily_digest_enabled").default(false).notNull(),
  weeklyDigestEnabled: boolean("weekly_digest_enabled").default(false).notNull(),
  
  // Immediate/threshold-based digest (new feature)
  immediateDigestEnabled: boolean("immediate_digest_enabled").default(false).notNull(),
  immediateThreshold: integer("immediate_threshold").default(5).notNull(), // Send when this many notifications accumulate
  
  // Pause functionality (new feature)
  pausedUntil: timestamp("paused_until"), // If set and > now, digests are paused
  
  // Delivery Settings
  emailAddress: varchar("email_address", { length: 255 }).notNull(),
  timezone: varchar("timezone", { length: 50 }).default("America/New_York").notNull(),
  dailySendTime: varchar("daily_send_time", { length: 10 }).default("06:00").notNull(),
  weeklySendDay: varchar("weekly_send_day", { length: 10 }).default("monday").notNull(),
  weeklySendTime: varchar("weekly_send_time", { length: 10 }).default("06:00").notNull(),
  
  // Business hours for immediate digests (new feature)
  businessHoursStart: integer("business_hours_start").default(8).notNull(), // 8 AM
  businessHoursEnd: integer("business_hours_end").default(20).notNull(), // 8 PM
  
  // Content Preferences
  includeAppointments: boolean("include_appointments").default(true).notNull(),
  includeFollowups: boolean("include_followups").default(true).notNull(),
  includeStaleDeals: boolean("include_stale_deals").default(true).notNull(),
  includePipelineSummary: boolean("include_pipeline_summary").default(true).notNull(),
  includeRecentWins: boolean("include_recent_wins").default(true).notNull(),
  includeAiTips: boolean("include_ai_tips").default(true).notNull(),
  includeQuarterlyCheckins: boolean("include_quarterly_checkins").default(true).notNull(),
  includeNewReferrals: boolean("include_new_referrals").default(true).notNull(),
  
  // Additional Settings
  appointmentLookaheadDays: integer("appointment_lookahead_days").default(1).notNull(),
  staleDealThresholdDays: integer("stale_deal_threshold_days").default(7).notNull(),
  
  // Tracking
  lastDailySentAt: timestamp("last_daily_sent_at"),
  lastWeeklySentAt: timestamp("last_weekly_sent_at"),
  lastImmediateSentAt: timestamp("last_immediate_sent_at"), // new
  totalEmailsSent: integer("total_emails_sent").default(0).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailDigestPreferencesRelations = relations(emailDigestPreferences, ({ one }) => ({
  organization: one(organizations, {
    fields: [emailDigestPreferences.organizationId],
    references: [organizations.id],
  }),
}));

export const insertEmailDigestPreferencesSchema = createInsertSchema(emailDigestPreferences).omit({
  id: true,
  lastDailySentAt: true,
  lastWeeklySentAt: true,
  totalEmailsSent: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmailDigestPreferences = z.infer<typeof insertEmailDigestPreferencesSchema>;
export type EmailDigestPreferences = typeof emailDigestPreferences.$inferSelect;

// Email Digest History table
export const emailDigestHistory = pgTable("email_digest_history", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  digestType: varchar("digest_type", { length: 10 }).notNull(), // 'daily' or 'weekly'
  
  // Content tracking
  appointmentsCount: integer("appointments_count"),
  followupsCount: integer("followups_count"),
  staleDealsCount: integer("stale_deals_count"),
  pipelineValue: integer("pipeline_value"),
  
  // Delivery status
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, sent, failed
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  
  // Email metadata
  subjectLine: text("subject_line"),
  emailProviderId: varchar("email_provider_id", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmailDigestHistorySchema = createInsertSchema(emailDigestHistory).omit({
  id: true,
  createdAt: true,
});
export type InsertEmailDigestHistory = z.infer<typeof insertEmailDigestHistorySchema>;
export type EmailDigestHistory = typeof emailDigestHistory.$inferSelect;

// ============================================================================
// DEAL PIPELINE SYSTEM
// Complete merchant services sales lifecycle management
// ============================================================================

// Pipeline stage enum - 14 stages across 4 phases
export const PIPELINE_STAGES = [
  // Phase 1: Prospecting
  "prospect",
  "cold_call",
  "appointment_set",
  // Phase 2: Active Selling
  "presentation_made",
  "proposal_sent",
  "statement_analysis",
  "negotiating",
  "follow_up",
  // Phase 3: Closing
  "documents_sent",
  "documents_signed",
  "sold",
  "dead",
  // Phase 4: Post-Sale
  "installation_scheduled",
  "active_merchant"
] as const;
export type PipelineStage = typeof PIPELINE_STAGES[number];

// Deal source types
export const DEAL_SOURCES = [
  "prospect_finder",
  "referral",
  "cold_call",
  "walk_in",
  "brochure_response",
  "business_card",
  "other"
] as const;
export type DealSource = typeof DEAL_SOURCES[number];

// Deal temperature
export const DEAL_TEMPERATURES = ["hot", "warm", "cold"] as const;
export type DealTemperature = typeof DEAL_TEMPERATURES[number];

// Deal E-Sign status (simplified for deals - references main ESignStatus)
export const DEAL_ESIGN_STATUSES = ["not_sent", "sent", "viewed", "signed"] as const;
export type DealESignStatus = typeof DEAL_ESIGN_STATUSES[number];

// Contact preferred methods
export const CONTACT_METHODS = ["phone", "email", "text"] as const;
export type ContactMethod = typeof CONTACT_METHODS[number];

// Follow-up methods
export const FOLLOW_UP_METHODS = ["phone", "email", "text", "visit"] as const;
export type FollowUpMethod = typeof FOLLOW_UP_METHODS[number];

// Follow-up outcomes
export const FOLLOW_UP_OUTCOMES = [
  "no_answer",
  "left_voicemail",
  "spoke_interested",
  "spoke_needs_time",
  "spoke_objection",
  "spoke_ready",
  "not_interested",
  "callback_scheduled",
  "meeting_scheduled"
] as const;
export type FollowUpOutcome = typeof FOLLOW_UP_OUTCOMES[number];

// Upsell product statuses
export const UPSELL_STATUSES = ["not_discussed", "offered", "interested", "sold", "not_interested"] as const;
export type UpsellStatus = typeof UPSELL_STATUSES[number];

// Deals table - Core sales opportunity tracking
export const deals = pgTable("deals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Core Business Information
  businessName: varchar("business_name", { length: 255 }).notNull(),
  businessAddress: text("business_address"),
  businessCity: varchar("business_city", { length: 100 }),
  businessState: varchar("business_state", { length: 2 }),
  businessZip: varchar("business_zip", { length: 10 }),
  businessPhone: varchar("business_phone", { length: 30 }),
  businessEmail: varchar("business_email", { length: 255 }),
  website: varchar("website", { length: 500 }),
  mccCode: varchar("mcc_code", { length: 4 }),
  businessType: varchar("business_type", { length: 100 }),
  
  // Primary Contact
  contactName: varchar("contact_name", { length: 100 }),
  contactTitle: varchar("contact_title", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 30 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPreferredMethod: varchar("contact_preferred_method", { length: 20 }),
  
  // Additional Contacts (JSON array)
  additionalContacts: jsonb("additional_contacts"),
  
  // Pipeline Status
  currentStage: varchar("current_stage", { length: 30 }).default("prospect").notNull(),
  stageEnteredAt: timestamp("stage_entered_at").defaultNow().notNull(),
  previousStage: varchar("previous_stage", { length: 30 }),
  
  // Deal Value
  estimatedMonthlyVolume: numeric("estimated_monthly_volume", { precision: 12, scale: 2 }),
  estimatedCommission: numeric("estimated_commission", { precision: 10, scale: 2 }),
  dealProbability: integer("deal_probability"), // 0-100
  
  // Follow-Up Tracking
  followUpAttemptCount: integer("follow_up_attempt_count").default(0).notNull(),
  maxFollowUpAttempts: integer("max_follow_up_attempts").default(5).notNull(),
  lastFollowUpAt: timestamp("last_follow_up_at"),
  lastFollowUpMethod: varchar("last_follow_up_method", { length: 20 }),
  lastFollowUpOutcome: varchar("last_follow_up_outcome", { length: 30 }),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  nextFollowUpMethod: varchar("next_follow_up_method", { length: 20 }),
  
  // Source & Attribution
  sourceType: varchar("source_type", { length: 30 }).default("cold_call").notNull(),
  sourceDetails: text("source_details"),
  referralId: integer("referral_id").references(() => referrals.id),
  prospectId: integer("prospect_id").references(() => prospects.id),
  
  // Assignment
  assignedAgentId: varchar("assigned_agent_id", { length: 255 }).notNull(),
  previousAgentId: varchar("previous_agent_id", { length: 255 }),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  
  // Temperature & Priority
  temperature: varchar("temperature", { length: 10 }).default("warm").notNull(),
  
  // Appointment tracking
  appointmentDate: timestamp("appointment_date"),
  appointmentNotes: text("appointment_notes"),
  
  // Lifecycle Dates
  lastActivityAt: timestamp("last_activity_at"),
  lastActivityType: varchar("last_activity_type", { length: 50 }),
  closedAt: timestamp("closed_at"),
  closedReason: text("closed_reason"),
  wonAt: timestamp("won_at"),
  
  // Post-Sale Fields
  installationScheduledAt: timestamp("installation_scheduled_at"),
  installationCompletedAt: timestamp("installation_completed_at"),
  goLiveAt: timestamp("go_live_at"),
  lastQuarterlyCheckinAt: timestamp("last_quarterly_checkin_at"),
  nextQuarterlyCheckinAt: timestamp("next_quarterly_checkin_at"),
  quarterlyCheckinFrequencyDays: integer("quarterly_checkin_frequency_days").default(90),
  
  // Upsell Tracking (JSON)
  upsellOpportunities: jsonb("upsell_opportunities"),
  
  // Location (for mapping/routing)
  latitude: real("latitude"),
  longitude: real("longitude"),
  
  // E-Sign Status
  esignStatus: varchar("esign_status", { length: 20 }).default("not_sent"),
  esignSentAt: timestamp("esign_sent_at"),
  esignViewedAt: timestamp("esign_viewed_at"),
  esignSignedAt: timestamp("esign_signed_at"),
  signedApplicationUrl: text("signed_application_url"),
  
  // Linked Records (for foreign keys, stored as IDs)
  merchantId: integer("merchant_id").references(() => merchants.id),
  
  // Notes & Manager Tools
  notes: text("notes"),
  managerNotes: text("manager_notes"),
  flaggedForReview: boolean("flagged_for_review").default(false).notNull(),
  flaggedAt: timestamp("flagged_at"),
  flaggedBy: varchar("flagged_by", { length: 255 }),
  
  // Tags (JSON array)
  tags: jsonb("tags"),
  
  // Soft Delete / Archive
  archived: boolean("archived").default(false).notNull(),
  archivedAt: timestamp("archived_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: varchar("created_by", { length: 255 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: varchar("updated_by", { length: 255 }),
});

export const dealsRelations = relations(deals, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [deals.organizationId],
    references: [organizations.id],
  }),
  referral: one(referrals, {
    fields: [deals.referralId],
    references: [referrals.id],
  }),
  prospect: one(prospects, {
    fields: [deals.prospectId],
    references: [prospects.id],
  }),
  merchant: one(merchants, {
    fields: [deals.merchantId],
    references: [merchants.id],
  }),
  activities: many(dealActivities),
  attachments: many(dealAttachments),
}));

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  stageEnteredAt: true,
  assignedAt: true,
});
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;

// Activity types for deals
export const DEAL_ACTIVITY_TYPES = [
  "call",
  "email",
  "text",
  "visit",
  "meeting",
  "presentation",
  "proposal_sent",
  "statement_analyzed",
  "esign_sent",
  "esign_viewed",
  "esign_signed",
  "follow_up",
  "stage_change",
  "note",
  "voicemail",
  "appointment_scheduled",
  "appointment_completed",
  "installation_scheduled",
  "installation_completed",
  "quarterly_checkin",
  "referral_requested",
  "deal_created",
  "deal_reassigned",
  "manager_note",
  "brochure_drop",
  "other"
] as const;
export type DealActivityType = typeof DEAL_ACTIVITY_TYPES[number];

// Merchant Intelligence table - Cached website scraping and transcript analysis for role-play
export const merchantIntelligence = pgTable("merchant_intelligence", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  
  // Can be linked to deal, merchant, or drop
  dealId: integer("deal_id").references(() => deals.id, { onDelete: "cascade" }),
  merchantId: integer("merchant_id").references(() => merchants.id, { onDelete: "cascade" }),
  dropId: integer("drop_id").references(() => drops.id, { onDelete: "cascade" }),
  
  // Website Intelligence
  websiteUrl: text("website_url"),
  websiteScrapedAt: timestamp("website_scraped_at"),
  websiteStatus: varchar("website_status", { length: 20 }).default("pending"), // pending, scraping, completed, failed
  
  // Scraped Business Details
  scrapedBusinessName: text("scraped_business_name"),
  scrapedDescription: text("scraped_description"),
  scrapedIndustry: text("scraped_industry"),
  scrapedServices: jsonb("scraped_services"), // string[]
  scrapedHours: text("scraped_hours"),
  scrapedOwnerName: text("scraped_owner_name"),
  scrapedMenuItems: jsonb("scraped_menu_items"), // For restaurants: string[]
  scrapedPricingIndicators: text("scraped_pricing_indicators"),
  scrapedUniqueSellingPoints: jsonb("scraped_unique_selling_points"), // string[]
  scrapedRecentNews: text("scraped_recent_news"),
  scrapedEstablishedYear: varchar("scraped_established_year", { length: 10 }),
  
  // Transcript Intelligence (extracted from meeting recordings)
  transcriptAnalyzedAt: timestamp("transcript_analyzed_at"),
  transcriptStatus: varchar("transcript_status", { length: 20 }).default("pending"), // pending, analyzing, completed, failed
  
  // Communication Style Analysis
  communicationStyle: varchar("communication_style", { length: 30 }), // formal, casual, direct, analytical
  decisionMakingStyle: varchar("decision_making_style", { length: 50 }), // quick, deliberate, consensus_needed, price_focused
  keyStakeholders: jsonb("key_stakeholders"), // Array of stakeholder names/roles
  
  // Objections & Concerns from transcripts
  knownObjections: jsonb("known_objections"), // string[] of actual objections raised
  knownConcerns: jsonb("known_concerns"), // string[] of concerns expressed
  questionsAsked: jsonb("questions_asked"), // string[] of questions they asked
  
  // Interests & Priorities
  interestsExpressed: jsonb("interests_expressed"), // string[] of things they showed interest in
  painPoints: jsonb("pain_points"), // string[] of problems they mentioned
  
  // Combined AI-Generated Context
  roleplayPersonaPrompt: text("roleplay_persona_prompt"), // Pre-generated prompt for AI role-play
  coachingContextSummary: text("coaching_context_summary"), // Summary for coaching mode
  
  // Metadata
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const merchantIntelligenceRelations = relations(merchantIntelligence, ({ one }) => ({
  deal: one(deals, {
    fields: [merchantIntelligence.dealId],
    references: [deals.id],
  }),
  merchant: one(merchants, {
    fields: [merchantIntelligence.merchantId],
    references: [merchants.id],
  }),
  drop: one(drops, {
    fields: [merchantIntelligence.dropId],
    references: [drops.id],
  }),
}));

export const insertMerchantIntelligenceSchema = createInsertSchema(merchantIntelligence).omit({
  id: true,
  createdAt: true,
  lastUpdatedAt: true,
});
export type InsertMerchantIntelligence = z.infer<typeof insertMerchantIntelligenceSchema>;
export type MerchantIntelligence = typeof merchantIntelligence.$inferSelect;

// Deal Activities table - Activity timeline for deals
export const dealActivities = pgTable("deal_activities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  dealId: integer("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  // Activity Details
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  activitySubtype: varchar("activity_subtype", { length: 50 }),
  
  // Timing
  activityAt: timestamp("activity_at").defaultNow().notNull(),
  
  // Who
  agentId: varchar("agent_id", { length: 255 }).notNull(),
  agentName: varchar("agent_name", { length: 100 }),
  
  // Details
  description: text("description"),
  notes: text("notes"),
  
  // For Follow-Up Activities
  followUpAttemptNumber: integer("follow_up_attempt_number"),
  followUpMethod: varchar("follow_up_method", { length: 20 }),
  followUpOutcome: varchar("follow_up_outcome", { length: 30 }),
  
  // For Stage Change Activities
  fromStage: varchar("from_stage", { length: 30 }),
  toStage: varchar("to_stage", { length: 30 }),
  stageChangeReason: text("stage_change_reason"),
  
  // For Communication Activities
  communicationDirection: varchar("communication_direction", { length: 10 }), // outbound/inbound
  communicationDurationSeconds: integer("communication_duration_seconds"),
  
  // Attachments
  voiceNoteUrl: text("voice_note_url"),
  attachmentUrls: jsonb("attachment_urls"),
  
  // Linking
  linkedProposalId: integer("linked_proposal_id"),
  linkedStatementId: integer("linked_statement_id"),
  linkedEsignId: integer("linked_esign_id"),
  linkedMeetingId: integer("linked_meeting_id"),
  linkedBrochureDropId: integer("linked_brochure_drop_id"),
  
  // System Generated
  isSystemGenerated: boolean("is_system_generated").default(false).notNull(),
  
  // Timestamp
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dealActivitiesRelations = relations(dealActivities, ({ one }) => ({
  deal: one(deals, {
    fields: [dealActivities.dealId],
    references: [deals.id],
  }),
  organization: one(organizations, {
    fields: [dealActivities.organizationId],
    references: [organizations.id],
  }),
}));

export const insertDealActivitySchema = createInsertSchema(dealActivities).omit({
  id: true,
  createdAt: true,
});
export type InsertDealActivity = z.infer<typeof insertDealActivitySchema>;
export type DealActivity = typeof dealActivities.$inferSelect;

// Pipeline Stage Configuration - Admin configurable
export const pipelineStageConfig = pgTable("pipeline_stage_config", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  stageKey: varchar("stage_key", { length: 30 }).notNull(),
  stageName: varchar("stage_name", { length: 100 }).notNull(),
  stageOrder: integer("stage_order").notNull(),
  
  color: varchar("color", { length: 20 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  
  probabilityPercent: integer("probability_percent").default(0).notNull(),
  staleThresholdDays: integer("stale_threshold_days").default(7).notNull(),
  
  isTerminal: boolean("is_terminal").default(false).notNull(),
  isClosingStage: boolean("is_closing_stage").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  
  requiredFields: jsonb("required_fields"),
  requiredAttachments: jsonb("required_attachments"),
  automationRules: jsonb("automation_rules"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueStagePerOrg: unique().on(table.organizationId, table.stageKey),
}));

export const pipelineStageConfigRelations = relations(pipelineStageConfig, ({ one }) => ({
  organization: one(organizations, {
    fields: [pipelineStageConfig.organizationId],
    references: [organizations.id],
  }),
}));

export const insertPipelineStageConfigSchema = createInsertSchema(pipelineStageConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPipelineStageConfig = z.infer<typeof insertPipelineStageConfigSchema>;
export type PipelineStageConfig = typeof pipelineStageConfig.$inferSelect;

// Loss Reasons - Configurable loss reasons
export const lossReasons = pgTable("loss_reasons", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  
  reasonText: varchar("reason_text", { length: 200 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  
  requiresCompetitorName: boolean("requires_competitor_name").default(false).notNull(),
  requiresFollowUp: boolean("requires_follow_up").default(false).notNull(),
  followUpDays: integer("follow_up_days"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const lossReasonsRelations = relations(lossReasons, ({ one }) => ({
  organization: one(organizations, {
    fields: [lossReasons.organizationId],
    references: [organizations.id],
  }),
}));

export const insertLossReasonSchema = createInsertSchema(lossReasons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLossReason = z.infer<typeof insertLossReasonSchema>;
export type LossReason = typeof lossReasons.$inferSelect;

// Deal Attachments - Link external records to deals
export const DEAL_ATTACHMENT_TYPES = [
  "proposal",
  "statement",
  "esign_document",
  "meeting_recording",
  "brochure_drop",
  "photo",
  "document",
  "other"
] as const;
export type DealAttachmentType = typeof DEAL_ATTACHMENT_TYPES[number];

export const dealAttachments = pgTable("deal_attachments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  dealId: integer("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
  
  attachmentType: varchar("attachment_type", { length: 30 }).notNull(),
  attachmentId: integer("attachment_id"), // FK to the related record
  url: text("url"),
  name: varchar("name", { length: 255 }),
  description: text("description"),
  
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dealAttachmentsRelations = relations(dealAttachments, ({ one }) => ({
  deal: one(deals, {
    fields: [dealAttachments.dealId],
    references: [deals.id],
  }),
}));

export const insertDealAttachmentSchema = createInsertSchema(dealAttachments).omit({
  id: true,
  createdAt: true,
});
export type InsertDealAttachment = z.infer<typeof insertDealAttachmentSchema>;
export type DealAttachment = typeof dealAttachments.$inferSelect;

// Default pipeline stage configurations
export const DEFAULT_PIPELINE_STAGES: Omit<InsertPipelineStageConfig, 'organizationId'>[] = [
  { stageKey: "prospect", stageName: "Prospect", stageOrder: 1, color: "gray", probabilityPercent: 10, staleThresholdDays: 14, isTerminal: false, isClosingStage: false, isActive: true },
  { stageKey: "cold_call", stageName: "Cold Call / Drop-In", stageOrder: 2, color: "blue", probabilityPercent: 15, staleThresholdDays: 7, isTerminal: false, isClosingStage: false, isActive: true },
  { stageKey: "appointment_set", stageName: "Appointment Set", stageOrder: 3, color: "lightblue", probabilityPercent: 25, staleThresholdDays: 14, isTerminal: false, isClosingStage: false, isActive: true, requiredFields: ["appointmentDate"] },
  { stageKey: "presentation_made", stageName: "Presentation Made", stageOrder: 4, color: "purple", probabilityPercent: 35, staleThresholdDays: 7, isTerminal: false, isClosingStage: false, isActive: true },
  { stageKey: "proposal_sent", stageName: "Proposal Sent", stageOrder: 5, color: "indigo", probabilityPercent: 50, staleThresholdDays: 5, isTerminal: false, isClosingStage: false, isActive: true },
  { stageKey: "statement_analysis", stageName: "Statement Analysis", stageOrder: 6, color: "cyan", probabilityPercent: 55, staleThresholdDays: 5, isTerminal: false, isClosingStage: false, isActive: true },
  { stageKey: "negotiating", stageName: "Negotiating", stageOrder: 7, color: "orange", probabilityPercent: 65, staleThresholdDays: 7, isTerminal: false, isClosingStage: false, isActive: true },
  { stageKey: "follow_up", stageName: "Follow-Up", stageOrder: 8, color: "yellow", probabilityPercent: 40, staleThresholdDays: 7, isTerminal: false, isClosingStage: false, isActive: true },
  { stageKey: "documents_sent", stageName: "Documents Sent", stageOrder: 9, color: "amber", probabilityPercent: 80, staleThresholdDays: 3, isTerminal: false, isClosingStage: true, isActive: true },
  { stageKey: "documents_signed", stageName: "Documents Signed", stageOrder: 10, color: "lime", probabilityPercent: 95, staleThresholdDays: 5, isTerminal: false, isClosingStage: true, isActive: true },
  { stageKey: "sold", stageName: "Sold / Won", stageOrder: 11, color: "green", probabilityPercent: 100, staleThresholdDays: 0, isTerminal: true, isClosingStage: true, isActive: true },
  { stageKey: "dead", stageName: "Dead / Lost", stageOrder: 12, color: "red", probabilityPercent: 0, staleThresholdDays: 0, isTerminal: true, isClosingStage: false, isActive: true, requiredFields: ["closedReason"] },
  { stageKey: "installation_scheduled", stageName: "Installation Scheduled", stageOrder: 13, color: "teal", probabilityPercent: 100, staleThresholdDays: 14, isTerminal: false, isClosingStage: true, isActive: true, requiredFields: ["installationScheduledAt"] },
  { stageKey: "active_merchant", stageName: "Active Merchant", stageOrder: 14, color: "emerald", probabilityPercent: 100, staleThresholdDays: 90, isTerminal: false, isClosingStage: true, isActive: true },
];

// Default loss reasons
export const DEFAULT_LOSS_REASONS: Omit<InsertLossReason, 'organizationId'>[] = [
  { reasonText: "Price / Fees too high", sortOrder: 1, isActive: true, requiresCompetitorName: false, requiresFollowUp: false },
  { reasonText: "Staying with current processor", sortOrder: 2, isActive: true, requiresCompetitorName: false, requiresFollowUp: true, followUpDays: 180 },
  { reasonText: "Went with competitor", sortOrder: 3, isActive: true, requiresCompetitorName: true, requiresFollowUp: false },
  { reasonText: "Bad timing / Not ready now", sortOrder: 4, isActive: true, requiresCompetitorName: false, requiresFollowUp: true, followUpDays: 90 },
  { reasonText: "Business closing or closed", sortOrder: 5, isActive: true, requiresCompetitorName: false, requiresFollowUp: false },
  { reasonText: "Could not reach / Ghosted", sortOrder: 6, isActive: true, requiresCompetitorName: false, requiresFollowUp: true, followUpDays: 30 },
  { reasonText: "Not a good fit for our services", sortOrder: 7, isActive: true, requiresCompetitorName: false, requiresFollowUp: false },
  { reasonText: "Under contract with current provider", sortOrder: 8, isActive: true, requiresCompetitorName: false, requiresFollowUp: true, followUpDays: 365 },
  { reasonText: "Decision maker unavailable", sortOrder: 9, isActive: true, requiresCompetitorName: false, requiresFollowUp: true, followUpDays: 30 },
  { reasonText: "Other", sortOrder: 10, isActive: true, requiresCompetitorName: false, requiresFollowUp: false },
];

// Type for Deal with related data
export type DealWithRelations = Deal & {
  activities?: DealActivity[];
  attachments?: DealAttachment[];
  referral?: Referral | null;
  prospect?: Prospect | null;
  merchant?: Merchant | null;
};

// Marketing Industry Tags
export const MARKETING_INDUSTRIES = [
  "liquor_stores",
  "restaurants_bars",
  "pizzerias",
  "food_trucks",
  "automotive",
  "veterinarians",
  "salons_spas",
  "rock_gravel",
  "b2b_level23",
  "merchant_cash_advance",
  "general",
  "pos_hotsauce"
] as const;
export type MarketingIndustry = typeof MARKETING_INDUSTRIES[number];

// Marketing Templates - Pre-designed flyer templates
export const marketingTemplates = pgTable("marketing_templates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  industry: varchar("industry", { length: 50 }).notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  pdfUrl: text("pdf_url"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMarketingTemplateSchema = createInsertSchema(marketingTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMarketingTemplate = z.infer<typeof insertMarketingTemplateSchema>;
export type MarketingTemplate = typeof marketingTemplates.$inferSelect;

// Generated Marketing Materials - Track materials sent by reps
export const generatedMarketingMaterials = pgTable("generated_marketing_materials", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  templateId: integer("template_id").references(() => marketingTemplates.id),
  
  repName: varchar("rep_name", { length: 200 }),
  repPhone: varchar("rep_phone", { length: 30 }),
  repEmail: varchar("rep_email", { length: 255 }),
  
  recipientBusinessName: varchar("recipient_business_name", { length: 255 }),
  recipientEmail: varchar("recipient_email", { length: 255 }),
  
  generatedPdfUrl: text("generated_pdf_url"),
  sentAt: timestamp("sent_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const generatedMarketingMaterialsRelations = relations(generatedMarketingMaterials, ({ one }) => ({
  template: one(marketingTemplates, {
    fields: [generatedMarketingMaterials.templateId],
    references: [marketingTemplates.id],
  }),
}));

export const insertGeneratedMarketingMaterialSchema = createInsertSchema(generatedMarketingMaterials).omit({
  id: true,
  createdAt: true,
});
export type InsertGeneratedMarketingMaterial = z.infer<typeof insertGeneratedMarketingMaterialSchema>;
export type GeneratedMarketingMaterial = typeof generatedMarketingMaterials.$inferSelect;

// Default Marketing Templates (pre-seeded)
export const DEFAULT_MARKETING_TEMPLATES: Omit<InsertMarketingTemplate, 'id'>[] = [
  { name: "Liquor Stores Dual Pricing", description: "Perfect for liquor stores looking to eliminate processing fees", industry: "liquor_stores", thumbnailUrl: "/marketing/liquor-stores.png", pdfUrl: "/marketing/liquor-stores.pdf", isActive: true, sortOrder: 1 },
  { name: "Restaurants & Bars", description: "For restaurants and bars ready to save on credit card fees", industry: "restaurants_bars", thumbnailUrl: "/marketing/restaurants-bars.png", isActive: true, sortOrder: 2 },
  { name: "Pizzerias", description: "Tailored messaging for pizzerias and delivery businesses", industry: "pizzerias", thumbnailUrl: "/marketing/pizzerias.png", isActive: true, sortOrder: 3 },
  { name: "Food Trucks", description: "Mobile-friendly solutions for food truck operators", industry: "food_trucks", thumbnailUrl: "/marketing/food-trucks.png", isActive: true, sortOrder: 4 },
  { name: "Automotive Industry", description: "For auto repair shops and car dealerships", industry: "automotive", thumbnailUrl: "/marketing/automotive.png", isActive: true, sortOrder: 5 },
  { name: "Veterinarians", description: "Specialized for veterinary clinics and animal hospitals", industry: "veterinarians", thumbnailUrl: "/marketing/veterinarians.png", isActive: true, sortOrder: 6 },
  { name: "Salons & Spas", description: "Beauty and wellness industry focused flyer", industry: "salons_spas", thumbnailUrl: "/marketing/salons-spas.png", isActive: true, sortOrder: 7 },
  { name: "Rock & Gravel Businesses", description: "For construction materials and aggregate suppliers", industry: "rock_gravel", thumbnailUrl: "/marketing/rock-gravel.png", isActive: true, sortOrder: 8 },
  { name: "Level 2 & 3 Processing (B2B)", description: "Lower rates for businesses accepting corporate cards", industry: "b2b_level23", thumbnailUrl: "/marketing/b2b-level23.png", isActive: true, sortOrder: 9 },
  { name: "HotSauce POS", description: "Restaurant POS system with dual pricing built-in", industry: "pos_hotsauce", thumbnailUrl: "/marketing/hotsauce-pos.png", isActive: true, sortOrder: 10 },
  { name: "Merchant Cash Advance", description: "Fast funding for business owners", industry: "merchant_cash_advance", thumbnailUrl: "/marketing/cash-advance.png", isActive: true, sortOrder: 11 },
  { name: "Who is PCBancard?", description: "General company overview flyer", industry: "general", thumbnailUrl: "/marketing/pcbancard-intro.png", isActive: true, sortOrder: 12 },
];

// Marketing RAG Content - Store flyer snippets for RAG retrieval
export const marketingRagContent = pgTable("marketing_rag_content", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  templateId: integer("template_id").references(() => marketingTemplates.id),
  contentType: varchar("content_type", { length: 50 }).notNull(), // headline, subhead, bullet, cta, disclaimer
  content: text("content").notNull(),
  industry: varchar("industry", { length: 50 }),
  tags: text("tags").array(),
  metadata: jsonb("metadata"), // additional context
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMarketingRagContentSchema = createInsertSchema(marketingRagContent).omit({
  id: true,
  createdAt: true,
});
export type InsertMarketingRagContent = z.infer<typeof insertMarketingRagContentSchema>;
export type MarketingRagContent = typeof marketingRagContent.$inferSelect;

// Marketing Approved Claims - Brand-safe messaging library
export const marketingApprovedClaims = pgTable("marketing_approved_claims", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  claim: text("claim").notNull(),
  category: varchar("category", { length: 100 }), // savings, compliance, technology, etc.
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMarketingApprovedClaimSchema = createInsertSchema(marketingApprovedClaims).omit({
  id: true,
  createdAt: true,
});
export type InsertMarketingApprovedClaim = z.infer<typeof insertMarketingApprovedClaimSchema>;
export type MarketingApprovedClaim = typeof marketingApprovedClaims.$inferSelect;

// Marketing Generation Jobs - Track AI flyer generation requests
export const GENERATION_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export type GenerationStatus = typeof GENERATION_STATUSES[number];

export const marketingGenerationJobs = pgTable("marketing_generation_jobs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  prompt: text("prompt").notNull(),
  industry: varchar("industry", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  generatedContent: jsonb("generated_content"), // headline, bullets, cta, etc.
  heroImageUrl: text("hero_image_url"),
  finalFlyerUrl: text("final_flyer_url"),
  errorMessage: text("error_message"),
  repName: varchar("rep_name", { length: 200 }),
  repPhone: varchar("rep_phone", { length: 30 }),
  repEmail: varchar("rep_email", { length: 255 }),
  businessWebsite: text("business_website"), // Optional website URL for business customization
  businessInfo: jsonb("business_info"), // Extracted business info from website (name, colors, description)
  savedToLibrary: boolean("saved_to_library").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertMarketingGenerationJobSchema = createInsertSchema(marketingGenerationJobs).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});
export type InsertMarketingGenerationJob = z.infer<typeof insertMarketingGenerationJobSchema>;
export type MarketingGenerationJob = typeof marketingGenerationJobs.$inferSelect;

// Hidden Static Marketing Templates - Track which static templates are hidden by admins
export const hiddenMarketingTemplates = pgTable("hidden_marketing_templates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  staticTemplateId: integer("static_template_id").notNull(), // ID from STATIC_TEMPLATES array
  hiddenBy: varchar("hidden_by").notNull(), // User ID who hid it
  hiddenAt: timestamp("hidden_at").defaultNow().notNull(),
});

export const insertHiddenMarketingTemplateSchema = createInsertSchema(hiddenMarketingTemplates).omit({
  id: true,
  hiddenAt: true,
});
export type InsertHiddenMarketingTemplate = z.infer<typeof insertHiddenMarketingTemplateSchema>;
export type HiddenMarketingTemplate = typeof hiddenMarketingTemplates.$inferSelect;

// Default Approved Claims for dual pricing marketing
export const DEFAULT_APPROVED_CLAIMS = [
  { claim: "Eliminate up to 100% of your credit card processing fees", category: "savings" },
  { claim: "Let customers choose how they pay", category: "compliance" },
  { claim: "Dual pricing is legal and compliant in all 50 states", category: "compliance" },
  { claim: "No more losing 3-4% on every transaction", category: "savings" },
  { claim: "Same product, cash or card—you keep more profit", category: "savings" },
  { claim: "Simple, transparent pricing your customers will love", category: "transparency" },
  { claim: "Next-day funding on all transactions", category: "technology" },
  { claim: "Free terminal with approved application", category: "equipment" },
  { claim: "24/7 US-based customer support", category: "support" },
  { claim: "No hidden fees, no monthly minimums", category: "transparency" },
  { claim: "PCI-compliant terminals and systems", category: "security" },
  { claim: "Accept all major cards: Visa, Mastercard, Amex, Discover", category: "technology" },
];

// =====================================================
// USER IMPERSONATION SYSTEM
// =====================================================

// Impersonation session statuses
export const IMPERSONATION_SESSION_STATUSES = ["active", "ended", "expired"] as const;
export type ImpersonationSessionStatus = typeof IMPERSONATION_SESSION_STATUSES[number];

// Impersonation sessions table - tracks active and past impersonation sessions
export const impersonationSessions = pgTable("impersonation_sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  originalUserId: varchar("original_user_id", { length: 255 }).notNull(),
  impersonatedUserId: varchar("impersonated_user_id", { length: 255 }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  
  sessionToken: varchar("session_token", { length: 500 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  expiresAt: timestamp("expires_at").notNull(),
});

export const impersonationSessionsRelations = relations(impersonationSessions, ({ one }) => ({
  organization: one(organizations, {
    fields: [impersonationSessions.organizationId],
    references: [organizations.id],
  }),
}));

export const insertImpersonationSessionSchema = createInsertSchema(impersonationSessions).omit({
  id: true,
  startedAt: true,
  endedAt: true,
});
export type InsertImpersonationSession = z.infer<typeof insertImpersonationSessionSchema>;
export type ImpersonationSession = typeof impersonationSessions.$inferSelect;

// Impersonation action types
export const IMPERSONATION_ACTIONS = ["start", "end", "action_performed", "expired"] as const;
export type ImpersonationAction = typeof IMPERSONATION_ACTIONS[number];

// Impersonation audit log - tracks all impersonation events for compliance
export const impersonationAuditLog = pgTable("impersonation_audit_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sessionId: integer("session_id").references(() => impersonationSessions.id),
  originalUserId: varchar("original_user_id", { length: 255 }).notNull(),
  impersonatedUserId: varchar("impersonated_user_id", { length: 255 }).notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  
  action: varchar("action", { length: 50 }).notNull(),
  actionDetails: jsonb("action_details"),
  
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const impersonationAuditLogRelations = relations(impersonationAuditLog, ({ one }) => ({
  session: one(impersonationSessions, {
    fields: [impersonationAuditLog.sessionId],
    references: [impersonationSessions.id],
  }),
  organization: one(organizations, {
    fields: [impersonationAuditLog.organizationId],
    references: [organizations.id],
  }),
}));

export const insertImpersonationAuditLogSchema = createInsertSchema(impersonationAuditLog).omit({
  id: true,
  createdAt: true,
});
export type InsertImpersonationAuditLog = z.infer<typeof insertImpersonationAuditLogSchema>;
export type ImpersonationAuditLog = typeof impersonationAuditLog.$inferSelect;

// Marketing Imported Flyers - For RAG learning from existing marketing materials
export const marketingImportedFlyers = pgTable("marketing_imported_flyers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sourceType: varchar("source_type", { length: 50 }).notNull(), // 'drive_import', 'upload', 'url'
  sourceUrl: text("source_url").notNull(), // Local or remote URL
  originalFileName: text("original_file_name").notNull(),
  fileType: varchar("file_type", { length: 20 }), // 'pdf', 'png', 'jpg', 'jpeg'
  industry: varchar("industry", { length: 50 }),
  extractedContent: jsonb("extracted_content"), // AI-extracted content from the flyer
  isProcessed: boolean("is_processed").default(false).notNull(),
  processingError: text("processing_error"),
  importedBy: varchar("imported_by", { length: 255 }),
  importedAt: timestamp("imported_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

export const insertMarketingImportedFlyerSchema = createInsertSchema(marketingImportedFlyers).omit({
  id: true,
  importedAt: true,
});
export type InsertMarketingImportedFlyer = z.infer<typeof insertMarketingImportedFlyerSchema>;
export type MarketingImportedFlyer = typeof marketingImportedFlyers.$inferSelect;

// Gamification Profiles - tracks overall XP, level, streaks per user
export const gamificationProfiles = pgTable("gamification_profiles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().unique(),
  totalXp: integer("total_xp").default(0).notNull(),
  currentLevel: integer("current_level").default(1).notNull(),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastActivityDate: date("last_activity_date"),
  badgesEarned: integer("badges_earned").default(0).notNull(),
  certificatesEarned: integer("certificates_earned").default(0).notNull(),
  skillScore: integer("skill_score").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGamificationProfileSchema = createInsertSchema(gamificationProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGamificationProfile = z.infer<typeof insertGamificationProfileSchema>;
export type GamificationProfile = typeof gamificationProfiles.$inferSelect;

// XP Ledger - immutable log of every XP earn event
export const xpLedger = pgTable("xp_ledger", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  amount: integer("amount").notNull(),
  source: varchar("source", { length: 50 }).notNull(),
  sourceId: varchar("source_id", { length: 100 }),
  description: text("description"),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

export const insertXpLedgerSchema = createInsertSchema(xpLedger).omit({
  id: true,
  earnedAt: true,
});
export type InsertXpLedger = z.infer<typeof insertXpLedgerSchema>;
export type XpLedger = typeof xpLedger.$inferSelect;

// Badges Earned - tracks which badges each user has earned
export const badgesEarned = pgTable("badges_earned", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  badgeId: varchar("badge_id", { length: 50 }).notNull(),
  badgeLevel: integer("badge_level").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserBadge: unique().on(table.userId, table.badgeId),
}));

export const insertBadgesEarnedSchema = createInsertSchema(badgesEarned).omit({
  id: true,
  earnedAt: true,
});
export type InsertBadgesEarned = z.infer<typeof insertBadgesEarnedSchema>;
export type BadgesEarned = typeof badgesEarned.$inferSelect;

// Certificates - training completion certificates
export const certificates = pgTable("certificates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  certificateType: varchar("certificate_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  verificationCode: varchar("verification_code", { length: 20 }).notNull().unique(),
  pdfUrl: text("pdf_url"),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({
  id: true,
  issuedAt: true,
});
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificates.$inferSelect;

// Gamification Daily Log - tracks daily activity for streak calculation and daily caps
export const gamificationDailyLog = pgTable("gamification_daily_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  logDate: date("log_date").notNull(),
  xpEarned: integer("xp_earned").default(0).notNull(),
  activitiesCompleted: integer("activities_completed").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserDate: unique().on(table.userId, table.logDate),
}));

export const insertGamificationDailyLogSchema = createInsertSchema(gamificationDailyLog).omit({
  id: true,
  updatedAt: true,
});
export type InsertGamificationDailyLog = z.infer<typeof insertGamificationDailyLogSchema>;
export type GamificationDailyLog = typeof gamificationDailyLog.$inferSelect;

// Interactive Training Sessions - stores session results for all 4 modes
export const trainingSessions = pgTable("training_sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  mode: varchar("mode", { length: 50 }).notNull(), // 'roleplay', 'gauntlet', 'scenario', 'delivery_analyzer'
  personaId: varchar("persona_id", { length: 100 }),
  difficulty: varchar("difficulty", { length: 20 }),
  scenarioId: varchar("scenario_id", { length: 100 }),
  scorePercent: integer("score_percent"),
  scoreDetails: jsonb("score_details"),
  aiFeedback: jsonb("ai_feedback"),
  turnCount: integer("turn_count"),
  durationSeconds: integer("duration_seconds"),
  objectionsAttempted: integer("objections_attempted"),
  objectionsPassed: integer("objections_passed"),
  perfectRun: boolean("perfect_run").default(false),
  stagesDetected: jsonb("stages_detected"),
  coveragePercent: integer("coverage_percent"),
  xpAwarded: integer("xp_awarded").default(0),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const insertTrainingSessionSchema = createInsertSchema(trainingSessions).omit({
  id: true,
  startedAt: true,
});
export type InsertTrainingSession = z.infer<typeof insertTrainingSessionSchema>;
export type TrainingSession = typeof trainingSessions.$inferSelect;

// Interactive Training Messages - conversation history for roleplay sessions
export const trainingMessages = pgTable("training_messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sessionId: integer("session_id").notNull(),
  role: varchar("role", { length: 20 }).notNull(), // 'user', 'assistant', 'system', 'coach'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrainingMessageSchema = createInsertSchema(trainingMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertTrainingMessage = z.infer<typeof insertTrainingMessageSchema>;
export type TrainingMessage = typeof trainingMessages.$inferSelect;

// Gauntlet Responses - per-objection detail for tracking
export const gauntletResponses = pgTable("gauntlet_responses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sessionId: integer("session_id").notNull(),
  objectionId: varchar("objection_id", { length: 100 }).notNull(),
  objectionText: text("objection_text"),
  userResponse: text("user_response"),
  keywordScore: integer("keyword_score"),
  aiScore: integer("ai_score"),
  aiFeedback: text("ai_feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGauntletResponseSchema = createInsertSchema(gauntletResponses).omit({
  id: true,
  createdAt: true,
});
export type InsertGauntletResponse = z.infer<typeof insertGauntletResponseSchema>;
export type GauntletResponse = typeof gauntletResponses.$inferSelect;

// Earned Items table - Tracks every badge, tier, seal, or stage completion an agent earns
export const earnedItems = pgTable("earned_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // "tier" | "badge" | "seal" | "stage"
  assetId: varchar("asset_id", { length: 100 }).notNull(), // Must match key in certificate-assets.json
  title: varchar("title", { length: 200 }).notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  metadata: jsonb("metadata").default({}),
}, (table) => ({
  uniqueUserAsset: unique().on(table.userId, table.assetId),
}));

export const insertEarnedItemSchema = createInsertSchema(earnedItems).omit({
  id: true,
  earnedAt: true,
});
export type InsertEarnedItem = z.infer<typeof insertEarnedItemSchema>;
export type EarnedItem = typeof earnedItems.$inferSelect;

// Generated Certificates table - Records every PDF certificate generated with verification codes
export const generatedCertificates = pgTable("generated_certificates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  certificateType: varchar("certificate_type", { length: 50 }).notNull(), // "tier_certificate" | "module_certificate" | "partner_certificate" | "stage_certificate"
  borderId: varchar("border_id", { length: 100 }).notNull().default("border.master"),
  primaryAssetId: varchar("primary_asset_id", { length: 100 }).notNull(),
  secondaryAssetIds: jsonb("secondary_asset_ids").default([]),
  recipientName: varchar("recipient_name", { length: 200 }).notNull(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  issuedBy: varchar("issued_by", { length: 200 }).notNull().default("PCBancard Training Division"),
  verificationCode: varchar("verification_code", { length: 20 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  pdfPath: text("pdf_path"),
  metadata: jsonb("metadata").default({}),
});

export const insertGeneratedCertificateSchema = createInsertSchema(generatedCertificates).omit({
  id: true,
  issuedAt: true,
});
export type InsertGeneratedCertificate = z.infer<typeof insertGeneratedCertificateSchema>;
export type GeneratedCertificate = typeof generatedCertificates.$inferSelect;

// Video Watch Progress - tracks agent video watching for Sales Videos training
export const videoWatchProgress = pgTable("video_watch_progress", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  videoId: varchar("video_id", { length: 50 }).notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  watchTimeSeconds: integer("watch_time_seconds").default(0),
  completed: boolean("completed").default(false),
  lastWatchedAt: timestamp("last_watched_at").defaultNow(),
}, (table) => ({
  uniqueUserVideo: unique().on(table.userId, table.videoId),
}));

export const insertVideoWatchProgressSchema = createInsertSchema(videoWatchProgress).omit({
  id: true,
  startedAt: true,
  lastWatchedAt: true,
});
export type InsertVideoWatchProgress = z.infer<typeof insertVideoWatchProgressSchema>;
export type VideoWatchProgress = typeof videoWatchProgress.$inferSelect;

// Trust Assessments table - tracks individual trust score assessments during sessions
export const trustAssessments = pgTable("trust_assessments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sessionId: integer("session_id").notNull(),
  sessionType: varchar("session_type", { length: 20 }).notNull(), // 'training' or 'roleplay'
  messageIndex: integer("message_index").notNull(),
  trustScoreBefore: integer("trust_score_before").notNull(),
  trustScoreAfter: integer("trust_score_after").notNull(),
  trustDelta: integer("trust_delta").notNull(),
  moodBand: varchar("mood_band", { length: 20 }).notNull(), // 'guarded', 'warming', 'engaged'
  deceptionType: varchar("deception_type", { length: 30 }),
  deceptionDeployed: boolean("deception_deployed").default(false),
  deceptionCaught: boolean("deception_caught"),
  rationale: text("rationale"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrustAssessmentSchema = createInsertSchema(trustAssessments).omit({
  id: true,
  createdAt: true,
});
export type InsertTrustAssessment = z.infer<typeof insertTrustAssessmentSchema>;
export type TrustAssessment = typeof trustAssessments.$inferSelect;

// Trust Session Summaries table - aggregated trust data for entire sessions
export const trustSessionSummaries = pgTable("trust_session_summaries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sessionId: integer("session_id").notNull(),
  sessionType: varchar("session_type", { length: 20 }).notNull(),
  agentId: varchar("agent_id").notNull(),
  startScore: integer("start_score").notNull().default(50),
  endScore: integer("end_score").notNull(),
  peakScore: integer("peak_score").notNull(),
  lowestScore: integer("lowest_score").notNull(),
  avgScore: integer("avg_score").notNull(),
  totalDeceptions: integer("total_deceptions").default(0),
  deceptionsCaught: integer("deceptions_caught").default(0),
  moodTransitions: jsonb("mood_transitions"),
  trustProgression: jsonb("trust_progression"),
  deceptionDetails: jsonb("deception_details"),
  coachingInsights: text("coaching_insights"),
  difficultyUsed: varchar("difficulty_used", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrustSessionSummarySchema = createInsertSchema(trustSessionSummaries).omit({
  id: true,
  createdAt: true,
});
export type InsertTrustSessionSummary = z.infer<typeof insertTrustSessionSummarySchema>;
export type TrustSessionSummary = typeof trustSessionSummaries.$inferSelect;

// Agent Trust Profiles table - adaptive difficulty and trust pattern tracking
export const agentTrustProfiles = pgTable("agent_trust_profiles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: varchar("agent_id").notNull().unique(),
  avgTrustLast5: integer("avg_trust_last5").default(50),
  totalSessions: integer("total_sessions").default(0),
  patternFlags: jsonb("pattern_flags").default({}),
  adaptiveDifficulty: varchar("adaptive_difficulty", { length: 20 }).default("normal"),
  lastSessionAt: timestamp("last_session_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAgentTrustProfileSchema = createInsertSchema(agentTrustProfiles).omit({
  id: true,
  updatedAt: true,
});
export type InsertAgentTrustProfile = z.infer<typeof insertAgentTrustProfileSchema>;
export type AgentTrustProfile = typeof agentTrustProfiles.$inferSelect;
