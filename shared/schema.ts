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
  totalDrops: integer("total_drops").default(0),
  totalConversions: integer("total_conversions").default(0),
  leadScore: integer("lead_score"),
  lastVisitAt: timestamp("last_visit_at"),
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
  status: varchar("status", { length: 20 }).default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const FEEDBACK_TYPES = ["feature_suggestion", "help_request", "bug_report"] as const;
export type FeedbackType = typeof FEEDBACK_TYPES[number];

export const insertFeedbackSubmissionSchema = createInsertSchema(feedbackSubmissions).omit({
  id: true,
  createdAt: true,
  status: true,
}).extend({
  type: z.enum(FEEDBACK_TYPES),
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
