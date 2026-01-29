import { 
  brochures, 
  drops, 
  reminders,
  userPreferences,
  organizations,
  organizationMembers,
  merchants,
  agentInventory,
  inventoryLogs,
  referrals,
  followUpSequences,
  followUpSteps,
  followUpExecutions,
  activityEvents,
  aiSummaries,
  leadScores,
  offlineQueue,
  invitations,
  feedbackSubmissions,
  roleplaySessions,
  roleplayMessages,
  brochureLocations,
  brochureLocationHistory,
  meetingRecordings,
  type Brochure,
  type InsertBrochure,
  type Drop,
  type InsertDrop,
  type Reminder,
  type InsertReminder,
  type DropWithBrochure,
  type UserPreferences,
  type UpdateUserPreferences,
  type Organization,
  type InsertOrganization,
  type OrganizationMember,
  type InsertOrganizationMember,
  type OrgMemberRole,
  type Merchant,
  type InsertMerchant,
  type AgentInventory,
  type InsertAgentInventory,
  type InventoryLog,
  type InsertInventoryLog,
  type Referral,
  type InsertReferral,
  type FollowUpSequence,
  type InsertFollowUpSequence,
  type FollowUpStep,
  type InsertFollowUpStep,
  type FollowUpExecution,
  type InsertFollowUpExecution,
  type ActivityEvent,
  type InsertActivityEvent,
  type AiSummary,
  type InsertAiSummary,
  type LeadScore,
  type InsertLeadScore,
  type OfflineQueue,
  type InsertOfflineQueue,
  type Invitation,
  type InsertInvitation,
  type FeedbackSubmission,
  type InsertFeedbackSubmission,
  type RoleplaySession,
  type InsertRoleplaySession,
  type RoleplayMessage,
  type InsertRoleplayMessage,
  type RoleplaySessionWithMessages,
  type BrochureLocation,
  type InsertBrochureLocation,
  type BrochureLocationHistory,
  type InsertBrochureLocationHistory,
  type BrochureWithLocation,
  type HolderType,
  type MeetingRecording,
  type InsertMeetingRecording,
  voiceNotes,
  type VoiceNote,
  type InsertVoiceNote,
  trainingDocuments,
  type TrainingDocument,
  type InsertTrainingDocument,
  dailyEdgeContent,
  userDailyEdge,
  userBeliefProgress,
  dailyEdgeStreaks,
  type DailyEdgeContent,
  type InsertDailyEdgeContent,
  type UserDailyEdge,
  type InsertUserDailyEdge,
  type UserBeliefProgress,
  type InsertUserBeliefProgress,
  type DailyEdgeStreak,
  type InsertDailyEdgeStreak,
  DAILY_EDGE_BELIEFS,
  DAILY_EDGE_CONTENT_TYPES,
  equipmentVendors,
  equipmentProducts,
  equipmentBusinessTypes,
  equipmentRecommendationSessions,
  equipmentQuizResults,
  type EquipmentVendor,
  type InsertEquipmentVendor,
  type EquipmentProduct,
  type InsertEquipmentProduct,
  type EquipmentBusinessType,
  type InsertEquipmentBusinessType,
  type EquipmentRecommendationSession,
  type InsertEquipmentRecommendationSession,
  type EquipmentQuizResult,
  type InsertEquipmentQuizResult,
  userPermissions,
  type UserPermissions,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray, gte, lte, isNull, notInArray } from "drizzle-orm";

export interface IStorage {
  // Brochures
  getBrochure(id: string): Promise<Brochure | undefined>;
  createBrochure(brochure: InsertBrochure): Promise<Brochure>;
  updateBrochureStatus(id: string, status: string): Promise<Brochure | undefined>;
  
  // Drops
  getDrop(id: number): Promise<DropWithBrochure | undefined>;
  getDropsByAgent(agentId: string): Promise<DropWithBrochure[]>;
  getDropsByOrganization(agentIds: string[]): Promise<DropWithBrochure[]>;
  getDropsByMerchant(merchantId: number, orgId: number): Promise<Drop[]>;
  createDrop(drop: InsertDrop): Promise<Drop>;
  updateDrop(id: number, data: Partial<Drop>): Promise<Drop | undefined>;
  
  // Reminders
  getReminder(id: number): Promise<Reminder | undefined>;
  getRemindersByDrop(dropId: number): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: number, data: Partial<Reminder>): Promise<Reminder | undefined>;
  
  // Demo data
  seedDemoData(agentId: string, orgId?: number | null): Promise<void>;
  
  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  createUserPreferences(userId: string): Promise<UserPreferences>;
  updateUserPreferences(userId: string, data: UpdateUserPreferences): Promise<UserPreferences | undefined>;
  
  // Organizations
  getOrganization(id: number): Promise<Organization | undefined>;
  getPrimaryOrganization(): Promise<Organization | undefined>;
  createOrganization(data: InsertOrganization): Promise<Organization>;
  getOrganizationMember(orgId: number, userId: string): Promise<OrganizationMember | undefined>;
  getUserMembership(userId: string): Promise<(OrganizationMember & { organization: Organization }) | undefined>;
  getOrganizationMembers(orgId: number): Promise<OrganizationMember[]>;
  createOrganizationMember(data: InsertOrganizationMember): Promise<OrganizationMember>;
  updateOrganizationMember(id: number, data: Partial<Pick<OrganizationMember, 'role' | 'managerId'>>): Promise<OrganizationMember | undefined>;
  updateOrganizationMemberRole(id: number, role: OrgMemberRole): Promise<OrganizationMember | undefined>;
  updateMemberProfile(id: number, data: { firstName?: string; lastName?: string; email?: string; phone?: string; profileComplete?: boolean }): Promise<OrganizationMember | undefined>;
  deleteOrganizationMember(id: number): Promise<boolean>;
  getAgentsByManager(managerId: number): Promise<OrganizationMember[]>;
  
  // Invitations
  createInvitation(data: InsertInvitation): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  getPendingInvitationByEmail(email: string): Promise<Invitation | undefined>;
  getInvitationsByOrg(orgId: number): Promise<Invitation[]>;
  updateInvitationStatus(id: number, status: string, acceptedAt?: Date): Promise<Invitation | undefined>;
  cancelInvitation(id: number): Promise<void>;
  
  // Feedback
  createFeedbackSubmission(data: InsertFeedbackSubmission): Promise<FeedbackSubmission>;
  
  // Roleplay Sessions
  createRoleplaySession(data: InsertRoleplaySession): Promise<RoleplaySession>;
  getRoleplaySession(id: number): Promise<RoleplaySessionWithMessages | undefined>;
  getRoleplaySessionsByAgent(agentId: string): Promise<RoleplaySession[]>;
  updateRoleplaySession(id: number, data: Partial<RoleplaySession>): Promise<RoleplaySession | undefined>;
  createRoleplayMessage(data: InsertRoleplayMessage): Promise<RoleplayMessage>;
  getRoleplayMessages(sessionId: number): Promise<RoleplayMessage[]>;
  deleteRoleplaySession(id: number): Promise<boolean>;
  deleteAllRoleplaySessions(agentId: string): Promise<number>;
  
  // Brochure Locations (Individual brochure custody tracking)
  getBrochureLocation(brochureId: string): Promise<BrochureLocation | undefined>;
  getBrochuresByHolder(orgId: number, holderType: HolderType, holderId?: string): Promise<BrochureWithLocation[]>;
  getHouseInventory(orgId: number): Promise<BrochureWithLocation[]>;
  createBrochureLocation(data: InsertBrochureLocation): Promise<BrochureLocation>;
  updateBrochureLocation(brochureId: string, data: Partial<BrochureLocation>): Promise<BrochureLocation | undefined>;
  transferBrochure(
    brochureId: string, 
    toHolderType: HolderType, 
    toHolderId: string | null, 
    transferredBy: string,
    transferType: string,
    notes?: string
  ): Promise<BrochureLocation>;
  getBrochureHistory(brochureId: string): Promise<BrochureLocationHistory[]>;
  createBrochureLocationHistory(data: InsertBrochureLocationHistory): Promise<BrochureLocationHistory>;
  registerBrochure(brochureId: string, orgId: number, registeredBy: string, notes?: string): Promise<BrochureWithLocation>;
  getBrochuresWithLocations(orgId: number): Promise<BrochureWithLocation[]>;
  
  // Meeting Recordings
  createMeetingRecording(data: InsertMeetingRecording): Promise<MeetingRecording>;
  getMeetingRecording(id: number): Promise<MeetingRecording | undefined>;
  getMeetingRecordingsByAgent(agentId: string): Promise<MeetingRecording[]>;
  getMeetingRecordingsByOrg(orgId: number): Promise<MeetingRecording[]>;
  getMeetingRecordingsByMerchant(merchantId: number): Promise<MeetingRecording[]>;
  updateMeetingRecording(id: number, data: Partial<MeetingRecording>): Promise<MeetingRecording | undefined>;
  
  // Voice Notes
  createVoiceNote(data: InsertVoiceNote): Promise<VoiceNote>;
  getVoiceNotesByMerchant(merchantId: number, orgId: number): Promise<VoiceNote[]>;
  getVoiceNote(id: number): Promise<VoiceNote | undefined>;
  deleteVoiceNote(id: number, orgId: number): Promise<void>;
  
  // Training Documents
  getTrainingDocuments(): Promise<TrainingDocument[]>;
  getTrainingDocument(driveFileId: string): Promise<TrainingDocument | undefined>;
  upsertTrainingDocument(data: InsertTrainingDocument): Promise<TrainingDocument>;
  deleteTrainingDocument(driveFileId: string): Promise<void>;
  getTrainingKnowledgeContext(): Promise<string>;
  
  // Daily Edge
  getDailyEdgeContent(belief?: string, contentType?: string): Promise<DailyEdgeContent[]>;
  getTodaysDailyEdge(userId: string): Promise<{ belief: string; content: Record<string, DailyEdgeContent | null> }>;
  recordDailyEdgeView(userId: string, contentId: number, reflection?: string): Promise<UserDailyEdge>;
  getUserDailyEdgeProgress(userId: string): Promise<{ totalViewed: number; challengesCompleted: number; streak: DailyEdgeStreak | null }>;
  getUserBeliefProgress(userId: string): Promise<UserBeliefProgress[]>;
  updateBeliefProgress(userId: string, belief: string, viewedContent?: boolean, completedChallenge?: boolean): Promise<UserBeliefProgress>;
  updateDailyEdgeStreak(userId: string): Promise<DailyEdgeStreak>;
  seedDailyEdgeContent(content: InsertDailyEdgeContent[]): Promise<DailyEdgeContent[]>;
  getDailyEdgeStreak(userId: string): Promise<DailyEdgeStreak | undefined>;
  markChallengeCompleted(userId: string, contentId: number): Promise<UserDailyEdge | undefined>;
  
  // User Permissions
  getUserPermissions(userId: string): Promise<UserPermissions | undefined>;
  createUserPermissions(userId: string): Promise<UserPermissions>;
  updateUserPermissions(userId: string, data: Partial<UserPermissions>): Promise<UserPermissions | undefined>;
  getAllUserPermissions(): Promise<UserPermissions[]>;
}

export class DatabaseStorage implements IStorage {
  // Brochures
  async getBrochure(id: string): Promise<Brochure | undefined> {
    const [brochure] = await db.select().from(brochures).where(eq(brochures.id, id));
    return brochure;
  }

  async createBrochure(brochure: InsertBrochure): Promise<Brochure> {
    const [created] = await db.insert(brochures).values(brochure).returning();
    return created;
  }

  async updateBrochureStatus(id: string, status: string): Promise<Brochure | undefined> {
    const [updated] = await db
      .update(brochures)
      .set({ status })
      .where(eq(brochures.id, id))
      .returning();
    return updated;
  }

  // Drops
  async getDrop(id: number): Promise<DropWithBrochure | undefined> {
    const result = await db
      .select()
      .from(drops)
      .leftJoin(brochures, eq(drops.brochureId, brochures.id))
      .where(eq(drops.id, id));
    
    if (result.length === 0) return undefined;
    
    const { drops: drop, brochures: brochure } = result[0];
    return { ...drop, brochure: brochure || undefined };
  }

  async getDropsByAgent(agentId: string): Promise<DropWithBrochure[]> {
    const result = await db
      .select()
      .from(drops)
      .leftJoin(brochures, eq(drops.brochureId, brochures.id))
      .where(eq(drops.agentId, agentId))
      .orderBy(desc(drops.droppedAt));
    
    return result.map(({ drops: drop, brochures: brochure }) => ({
      ...drop,
      brochure: brochure || undefined,
    }));
  }

  async getDropsByOrganization(agentIds: string[]): Promise<DropWithBrochure[]> {
    if (agentIds.length === 0) return [];
    
    const result = await db
      .select()
      .from(drops)
      .leftJoin(brochures, eq(drops.brochureId, brochures.id))
      .where(inArray(drops.agentId, agentIds))
      .orderBy(desc(drops.droppedAt));
    
    return result.map(({ drops: drop, brochures: brochure }) => ({
      ...drop,
      brochure: brochure || undefined,
    }));
  }

  async createDrop(drop: InsertDrop): Promise<Drop> {
    const [created] = await db.insert(drops).values(drop).returning();
    return created;
  }

  async updateDrop(id: number, data: Partial<Drop>): Promise<Drop | undefined> {
    const [updated] = await db
      .update(drops)
      .set(data)
      .where(eq(drops.id, id))
      .returning();
    return updated;
  }

  // Reminders
  async getReminder(id: number): Promise<Reminder | undefined> {
    const [reminder] = await db.select().from(reminders).where(eq(reminders.id, id));
    return reminder;
  }

  async getRemindersByDrop(dropId: number): Promise<Reminder[]> {
    return db.select().from(reminders).where(eq(reminders.dropId, dropId));
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const [created] = await db.insert(reminders).values(reminder).returning();
    return created;
  }

  async updateReminder(id: number, data: Partial<Reminder>): Promise<Reminder | undefined> {
    const [updated] = await db
      .update(reminders)
      .set(data)
      .where(eq(reminders.id, id))
      .returning();
    return updated;
  }

  async seedDemoData(agentId: string, orgId?: number | null): Promise<void> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const demoData = [
      {
        brochureId: `DEMO-${agentId.slice(0, 8)}-001`,
        businessName: "Golden Gate Bistro",
        businessType: "restaurant",
        businessPhone: "(415) 555-0123",
        contactName: "Maria Santos",
        address: "123 Market Street, San Francisco, CA 94102",
        latitude: 37.7749,
        longitude: -122.4194,
        textNotes: "Owner was very interested in payment processing solutions. High foot traffic location near Union Square. Best time to follow up is after lunch rush around 2pm.",
        pickupScheduledFor: tomorrow,
        status: "pending",
      },
      {
        brochureId: `DEMO-${agentId.slice(0, 8)}-002`,
        businessName: "Tech Auto Repair",
        businessType: "auto",
        businessPhone: "(415) 555-0456",
        contactName: "James Chen",
        address: "789 Mission Street, San Francisco, CA 94103",
        latitude: 37.7851,
        longitude: -122.4056,
        textNotes: "Busy auto shop with 3 service bays. Currently using outdated payment terminal. Manager interested in modern POS system.",
        pickupScheduledFor: nextWeek,
        status: "pending",
      },
      {
        brochureId: `DEMO-${agentId.slice(0, 8)}-003`,
        businessName: "Sunset Nail Spa",
        businessType: "salon",
        businessPhone: "(415) 555-0789",
        contactName: "Lisa Nguyen",
        address: "456 Irving Street, San Francisco, CA 94122",
        latitude: 37.7642,
        longitude: -122.4621,
        textNotes: "Popular nail salon in Sunset district. Owner mentioned they need better tip handling for employees.",
        pickupScheduledFor: yesterday,
        status: "pending",
      },
    ];

    for (const demo of demoData) {
      try {
        const existingBrochure = await this.getBrochure(demo.brochureId);
        if (!existingBrochure) {
          await this.createBrochure({
            id: demo.brochureId,
            batch: "Demo Batch",
            status: "deployed",
          });
        }

        // Insert directly to bypass schema validation for demo data
        await db.insert(drops).values({
          brochureId: demo.brochureId,
          agentId: agentId,
          orgId: orgId ?? null,
          businessName: demo.businessName,
          businessType: demo.businessType,
          businessPhone: demo.businessPhone,
          contactName: demo.contactName,
          address: demo.address,
          latitude: demo.latitude,
          longitude: demo.longitude,
          textNotes: demo.textNotes,
          pickupScheduledFor: demo.pickupScheduledFor,
          status: demo.status,
        });
      } catch (error) {
        console.error(`Error seeding demo data for ${demo.businessName}:`, error);
      }
    }
  }

  // User Preferences
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async createUserPreferences(userId: string): Promise<UserPreferences> {
    const [created] = await db.insert(userPreferences).values({
      userId,
      notificationsEnabled: true,
      reminderHoursBefore: 24,
      emailNotifications: true,
      pushNotifications: true,
    }).returning();
    return created;
  }

  async updateUserPreferences(userId: string, data: UpdateUserPreferences): Promise<UserPreferences | undefined> {
    const [updated] = await db
      .update(userPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId))
      .returning();
    return updated;
  }

  // Organizations
  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getPrimaryOrganization(): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.isPrimary, true)).limit(1);
    return org;
  }

  async createOrganization(data: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(data).returning();
    return created;
  }

  async getOrganizationMember(orgId: number, userId: string): Promise<OrganizationMember | undefined> {
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)));
    return member;
  }

  async getOrganizationMembers(orgId: number): Promise<OrganizationMember[]> {
    return db.select().from(organizationMembers).where(eq(organizationMembers.orgId, orgId));
  }

  async createOrganizationMember(data: InsertOrganizationMember): Promise<OrganizationMember> {
    const [created] = await db.insert(organizationMembers).values(data).returning();
    return created;
  }

  async getUserMembership(userId: string): Promise<(OrganizationMember & { organization: Organization }) | undefined> {
    const result = await db
      .select()
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.orgId, organizations.id))
      .where(eq(organizationMembers.userId, userId));
    
    if (result.length === 0) return undefined;
    
    const { organization_members: member, organizations: org } = result[0];
    return { ...member, organization: org };
  }

  async updateOrganizationMember(id: number, data: Partial<Pick<OrganizationMember, 'role' | 'managerId'>>): Promise<OrganizationMember | undefined> {
    const [updated] = await db
      .update(organizationMembers)
      .set(data)
      .where(eq(organizationMembers.id, id))
      .returning();
    return updated;
  }

  async updateOrganizationMemberRole(id: number, role: OrgMemberRole): Promise<OrganizationMember | undefined> {
    const [updated] = await db
      .update(organizationMembers)
      .set({ role })
      .where(eq(organizationMembers.id, id))
      .returning();
    return updated;
  }

  async updateMemberProfile(id: number, data: { firstName?: string; lastName?: string; email?: string; phone?: string; profileComplete?: boolean }): Promise<OrganizationMember | undefined> {
    const [updated] = await db
      .update(organizationMembers)
      .set(data)
      .where(eq(organizationMembers.id, id))
      .returning();
    return updated;
  }

  async deleteOrganizationMember(id: number): Promise<boolean> {
    const result = await db
      .delete(organizationMembers)
      .where(eq(organizationMembers.id, id))
      .returning();
    return result.length > 0;
  }

  async getAgentsByManager(managerId: number): Promise<OrganizationMember[]> {
    return db.select().from(organizationMembers).where(eq(organizationMembers.managerId, managerId));
  }

  // Merchants
  async getMerchant(id: number): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants).where(eq(merchants.id, id));
    return merchant;
  }

  async getMerchantsByOrg(orgId: number): Promise<Merchant[]> {
    return db.select().from(merchants).where(eq(merchants.orgId, orgId)).orderBy(desc(merchants.lastVisitAt));
  }

  async getMerchantsByAgentIds(orgId: number, agentIds: string[]): Promise<Merchant[]> {
    if (agentIds.length === 0) return [];
    
    // Get unique merchant IDs from drops made by these agents
    const dropsWithMerchants = await db
      .select({ merchantId: drops.merchantId })
      .from(drops)
      .where(and(
        eq(drops.orgId, orgId),
        inArray(drops.agentId, agentIds),
        sql`${drops.merchantId} IS NOT NULL`
      ));
    
    const merchantIds = [...new Set(dropsWithMerchants.map(d => d.merchantId).filter(Boolean))] as number[];
    
    if (merchantIds.length === 0) return [];
    
    return db.select().from(merchants)
      .where(and(eq(merchants.orgId, orgId), inArray(merchants.id, merchantIds)))
      .orderBy(desc(merchants.lastVisitAt));
  }

  async getMerchantByBusinessName(orgId: number, businessName: string): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants)
      .where(and(eq(merchants.orgId, orgId), eq(merchants.businessName, businessName)));
    return merchant;
  }

  async createMerchant(data: InsertMerchant): Promise<Merchant> {
    const [created] = await db.insert(merchants).values(data).returning();
    return created;
  }

  async updateMerchant(id: number, data: Partial<Merchant>): Promise<Merchant | undefined> {
    const [updated] = await db.update(merchants).set({ ...data, updatedAt: new Date() }).where(eq(merchants.id, id)).returning();
    return updated;
  }

  async getDropsByMerchant(merchantId: number, orgId: number): Promise<Drop[]> {
    return db.select().from(drops).where(
      and(eq(drops.merchantId, merchantId), eq(drops.orgId, orgId))
    ).orderBy(desc(drops.droppedAt));
  }

  // Agent Inventory
  async getAgentInventory(orgId: number, agentId: string): Promise<AgentInventory | undefined> {
    const [inv] = await db.select().from(agentInventory)
      .where(and(eq(agentInventory.orgId, orgId), eq(agentInventory.agentId, agentId)));
    return inv;
  }

  async getAllAgentInventory(orgId: number): Promise<AgentInventory[]> {
    return db.select().from(agentInventory).where(eq(agentInventory.orgId, orgId));
  }

  async createOrUpdateAgentInventory(data: InsertAgentInventory): Promise<AgentInventory> {
    const existing = await this.getAgentInventory(data.orgId, data.agentId);
    if (existing) {
      const [updated] = await db.update(agentInventory)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(agentInventory.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(agentInventory).values(data).returning();
    return created;
  }

  async updateAgentInventory(id: number, data: Partial<AgentInventory>): Promise<AgentInventory | undefined> {
    const [updated] = await db.update(agentInventory)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agentInventory.id, id))
      .returning();
    return updated;
  }

  async createInventoryLog(data: InsertInventoryLog): Promise<InventoryLog> {
    const [created] = await db.insert(inventoryLogs).values(data).returning();
    return created;
  }

  async getInventoryLogs(orgId: number, agentId?: string): Promise<InventoryLog[]> {
    if (agentId) {
      return db.select().from(inventoryLogs)
        .where(and(eq(inventoryLogs.orgId, orgId), eq(inventoryLogs.agentId, agentId)))
        .orderBy(desc(inventoryLogs.createdAt));
    }
    return db.select().from(inventoryLogs)
      .where(eq(inventoryLogs.orgId, orgId))
      .orderBy(desc(inventoryLogs.createdAt));
  }

  // Referrals
  async getReferral(id: number): Promise<Referral | undefined> {
    const [ref] = await db.select().from(referrals).where(eq(referrals.id, id));
    return ref;
  }

  async getReferralsByOrg(orgId: number): Promise<Referral[]> {
    return db.select().from(referrals).where(eq(referrals.orgId, orgId)).orderBy(desc(referrals.createdAt));
  }

  async getReferralsByAgent(agentId: string): Promise<Referral[]> {
    return db.select().from(referrals).where(eq(referrals.agentId, agentId)).orderBy(desc(referrals.createdAt));
  }

  async createReferral(data: InsertReferral): Promise<Referral> {
    const [created] = await db.insert(referrals).values(data).returning();
    return created;
  }

  async updateReferral(id: number, data: Partial<Referral>): Promise<Referral | undefined> {
    const [updated] = await db.update(referrals).set(data).where(eq(referrals.id, id)).returning();
    return updated;
  }

  async deleteReferral(id: number): Promise<void> {
    await db.delete(referrals).where(eq(referrals.id, id));
  }

  // Follow-up Sequences
  async getFollowUpSequence(id: number): Promise<FollowUpSequence | undefined> {
    const [seq] = await db.select().from(followUpSequences).where(eq(followUpSequences.id, id));
    return seq;
  }

  async getFollowUpSequencesByOrg(orgId: number): Promise<FollowUpSequence[]> {
    return db.select().from(followUpSequences).where(eq(followUpSequences.orgId, orgId));
  }

  async createFollowUpSequence(data: InsertFollowUpSequence): Promise<FollowUpSequence> {
    const [created] = await db.insert(followUpSequences).values(data).returning();
    return created;
  }

  async updateFollowUpSequence(id: number, data: Partial<FollowUpSequence>): Promise<FollowUpSequence | undefined> {
    const [updated] = await db.update(followUpSequences).set(data).where(eq(followUpSequences.id, id)).returning();
    return updated;
  }

  async deleteFollowUpSequence(id: number): Promise<boolean> {
    const result = await db.delete(followUpSequences).where(eq(followUpSequences.id, id)).returning();
    return result.length > 0;
  }

  // Follow-up Steps
  async getFollowUpSteps(sequenceId: number): Promise<FollowUpStep[]> {
    return db.select().from(followUpSteps).where(eq(followUpSteps.sequenceId, sequenceId)).orderBy(followUpSteps.stepNumber);
  }

  async createFollowUpStep(data: InsertFollowUpStep): Promise<FollowUpStep> {
    const [created] = await db.insert(followUpSteps).values(data).returning();
    return created;
  }

  async updateFollowUpStep(id: number, data: Partial<FollowUpStep>): Promise<FollowUpStep | undefined> {
    const [updated] = await db.update(followUpSteps).set(data).where(eq(followUpSteps.id, id)).returning();
    return updated;
  }

  async deleteFollowUpStep(id: number): Promise<boolean> {
    const result = await db.delete(followUpSteps).where(eq(followUpSteps.id, id)).returning();
    return result.length > 0;
  }

  // Follow-up Executions
  async getFollowUpExecution(id: number): Promise<FollowUpExecution | undefined> {
    const [exec] = await db.select().from(followUpExecutions).where(eq(followUpExecutions.id, id));
    return exec;
  }

  async getActiveExecutionsForDrop(dropId: number): Promise<FollowUpExecution[]> {
    return db.select().from(followUpExecutions)
      .where(and(eq(followUpExecutions.dropId, dropId), eq(followUpExecutions.status, "active")));
  }

  async createFollowUpExecution(data: InsertFollowUpExecution): Promise<FollowUpExecution> {
    const [created] = await db.insert(followUpExecutions).values(data).returning();
    return created;
  }

  async updateFollowUpExecution(id: number, data: Partial<FollowUpExecution>): Promise<FollowUpExecution | undefined> {
    const [updated] = await db.update(followUpExecutions).set(data).where(eq(followUpExecutions.id, id)).returning();
    return updated;
  }

  // Activity Events
  async createActivityEvent(data: InsertActivityEvent): Promise<ActivityEvent> {
    const [created] = await db.insert(activityEvents).values(data).returning();
    return created;
  }

  async getActivityEventsByOrg(orgId: number, limit: number = 50): Promise<ActivityEvent[]> {
    return db.select().from(activityEvents)
      .where(eq(activityEvents.orgId, orgId))
      .orderBy(desc(activityEvents.createdAt))
      .limit(limit);
  }

  async getActivityEventsByAgent(agentId: string, limit: number = 50): Promise<ActivityEvent[]> {
    return db.select().from(activityEvents)
      .where(eq(activityEvents.agentId, agentId))
      .orderBy(desc(activityEvents.createdAt))
      .limit(limit);
  }

  async getActivityEventsByAgentIds(agentIds: string[], limit: number = 50): Promise<ActivityEvent[]> {
    if (agentIds.length === 0) return [];
    return db.select().from(activityEvents)
      .where(inArray(activityEvents.agentId, agentIds))
      .orderBy(desc(activityEvents.createdAt))
      .limit(limit);
  }

  // AI Summaries
  async getAiSummary(dropId: number): Promise<AiSummary | undefined> {
    const [summary] = await db.select().from(aiSummaries).where(eq(aiSummaries.dropId, dropId));
    return summary;
  }

  async createAiSummary(data: InsertAiSummary): Promise<AiSummary> {
    const [created] = await db.insert(aiSummaries).values(data).returning();
    return created;
  }

  async updateAiSummary(id: number, data: Partial<AiSummary>): Promise<AiSummary | undefined> {
    const [updated] = await db.update(aiSummaries).set(data).where(eq(aiSummaries.id, id)).returning();
    return updated;
  }

  // Lead Scores
  async getLeadScore(dropId: number): Promise<LeadScore | undefined> {
    const [score] = await db.select().from(leadScores).where(eq(leadScores.dropId, dropId));
    return score;
  }

  async createOrUpdateLeadScore(data: InsertLeadScore): Promise<LeadScore> {
    const existing = await this.getLeadScore(data.dropId);
    if (existing) {
      const [updated] = await db.update(leadScores)
        .set({ ...data, calculatedAt: new Date() })
        .where(eq(leadScores.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(leadScores).values(data).returning();
    return created;
  }

  // Offline Queue
  async createOfflineQueueItem(data: InsertOfflineQueue): Promise<OfflineQueue> {
    const [created] = await db.insert(offlineQueue).values(data).returning();
    return created;
  }

  async getPendingOfflineItems(agentId: string): Promise<OfflineQueue[]> {
    return db.select().from(offlineQueue)
      .where(and(eq(offlineQueue.agentId, agentId), eq(offlineQueue.status, "pending")))
      .orderBy(offlineQueue.createdAt);
  }

  async updateOfflineQueueItem(id: number, data: Partial<OfflineQueue>): Promise<OfflineQueue | undefined> {
    const [updated] = await db.update(offlineQueue).set(data).where(eq(offlineQueue.id, id)).returning();
    return updated;
  }

  // Get drops with lead scores for a date range (for route optimization)
  async getDropsForRoute(agentId: string, date: Date): Promise<DropWithBrochure[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const result = await db
      .select()
      .from(drops)
      .leftJoin(brochures, eq(drops.brochureId, brochures.id))
      .where(and(
        eq(drops.agentId, agentId),
        eq(drops.status, "pending"),
        gte(drops.pickupScheduledFor, startOfDay),
        lte(drops.pickupScheduledFor, endOfDay)
      ))
      .orderBy(drops.pickupScheduledFor);
    
    return result.map(({ drops: drop, brochures: brochure }) => ({
      ...drop,
      brochure: brochure || undefined,
    }));
  }

  // Invitations
  async createInvitation(data: InsertInvitation): Promise<Invitation> {
    const [created] = await db.insert(invitations).values(data).returning();
    return created;
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    const [invitation] = await db.select().from(invitations).where(eq(invitations.token, token));
    return invitation;
  }

  async getPendingInvitationByEmail(email: string): Promise<Invitation | undefined> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email.toLowerCase()),
          eq(invitations.status, "pending")
        )
      )
      .limit(1);
    return invitation;
  }

  async getInvitationsByOrg(orgId: number): Promise<Invitation[]> {
    return db.select().from(invitations).where(eq(invitations.orgId, orgId)).orderBy(desc(invitations.createdAt));
  }

  async updateInvitationStatus(id: number, status: string, acceptedAt?: Date): Promise<Invitation | undefined> {
    const [updated] = await db
      .update(invitations)
      .set({ status, acceptedAt: acceptedAt ?? null })
      .where(eq(invitations.id, id))
      .returning();
    return updated;
  }

  async cancelInvitation(id: number): Promise<void> {
    await db.update(invitations).set({ status: "cancelled" }).where(eq(invitations.id, id));
  }

  // Feedback
  async createFeedbackSubmission(data: InsertFeedbackSubmission): Promise<FeedbackSubmission> {
    const [created] = await db.insert(feedbackSubmissions).values(data).returning();
    return created;
  }

  // Role-play Sessions
  async createRoleplaySession(data: InsertRoleplaySession): Promise<RoleplaySession> {
    const [created] = await db.insert(roleplaySessions).values(data).returning();
    return created;
  }

  async getRoleplaySession(id: number): Promise<RoleplaySessionWithMessages | undefined> {
    const [session] = await db.select().from(roleplaySessions).where(eq(roleplaySessions.id, id));
    if (!session) return undefined;
    
    const messages = await db
      .select()
      .from(roleplayMessages)
      .where(eq(roleplayMessages.sessionId, id))
      .orderBy(roleplayMessages.createdAt);
    
    return { ...session, messages };
  }

  async getRoleplaySessionsByAgent(agentId: string): Promise<RoleplaySession[]> {
    return db
      .select()
      .from(roleplaySessions)
      .where(eq(roleplaySessions.agentId, agentId))
      .orderBy(desc(roleplaySessions.createdAt));
  }

  async updateRoleplaySession(id: number, data: Partial<RoleplaySession>): Promise<RoleplaySession | undefined> {
    const [updated] = await db
      .update(roleplaySessions)
      .set(data)
      .where(eq(roleplaySessions.id, id))
      .returning();
    return updated;
  }

  async createRoleplayMessage(data: InsertRoleplayMessage): Promise<RoleplayMessage> {
    const [created] = await db.insert(roleplayMessages).values(data).returning();
    return created;
  }

  async getRoleplayMessages(sessionId: number): Promise<RoleplayMessage[]> {
    return db
      .select()
      .from(roleplayMessages)
      .where(eq(roleplayMessages.sessionId, sessionId))
      .orderBy(roleplayMessages.createdAt);
  }

  async deleteRoleplaySession(id: number): Promise<boolean> {
    await db.delete(roleplayMessages).where(eq(roleplayMessages.sessionId, id));
    const result = await db.delete(roleplaySessions).where(eq(roleplaySessions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteAllRoleplaySessions(agentId: string): Promise<number> {
    const sessions = await db.select({ id: roleplaySessions.id })
      .from(roleplaySessions)
      .where(eq(roleplaySessions.agentId, agentId));
    
    if (sessions.length === 0) return 0;
    
    const sessionIds = sessions.map(s => s.id);
    
    await db.delete(roleplayMessages).where(inArray(roleplayMessages.sessionId, sessionIds));
    const result = await db.delete(roleplaySessions).where(eq(roleplaySessions.agentId, agentId));
    return result.rowCount ?? 0;
  }

  // Brochure Locations (Individual brochure custody tracking)
  async getBrochureLocation(brochureId: string): Promise<BrochureLocation | undefined> {
    const [location] = await db.select().from(brochureLocations).where(eq(brochureLocations.brochureId, brochureId));
    return location;
  }

  async getBrochuresByHolder(orgId: number, holderType: HolderType, holderId?: string): Promise<BrochureWithLocation[]> {
    const conditions = [
      eq(brochureLocations.orgId, orgId),
      eq(brochureLocations.holderType, holderType),
    ];
    
    if (holderId) {
      conditions.push(eq(brochureLocations.holderId, holderId));
    }
    
    const result = await db
      .select()
      .from(brochureLocations)
      .innerJoin(brochures, eq(brochureLocations.brochureId, brochures.id))
      .where(and(...conditions))
      .orderBy(desc(brochureLocations.assignedAt));
    
    return result.map(({ brochures: brochure, brochure_locations: location }) => ({
      ...brochure,
      location,
    }));
  }

  async getHouseInventory(orgId: number): Promise<BrochureWithLocation[]> {
    return this.getBrochuresByHolder(orgId, "house");
  }

  async createBrochureLocation(data: InsertBrochureLocation): Promise<BrochureLocation> {
    const [created] = await db.insert(brochureLocations).values(data).returning();
    return created;
  }

  async updateBrochureLocation(brochureId: string, data: Partial<BrochureLocation>): Promise<BrochureLocation | undefined> {
    const [updated] = await db
      .update(brochureLocations)
      .set(data)
      .where(eq(brochureLocations.brochureId, brochureId))
      .returning();
    return updated;
  }

  async transferBrochure(
    brochureId: string,
    toHolderType: HolderType,
    toHolderId: string | null,
    transferredBy: string,
    transferType: string,
    notes?: string
  ): Promise<BrochureLocation> {
    const currentLocation = await this.getBrochureLocation(brochureId);
    
    if (!currentLocation) {
      throw new Error(`Brochure ${brochureId} not found in location tracking`);
    }
    
    // Record history
    await this.createBrochureLocationHistory({
      brochureId,
      orgId: currentLocation.orgId,
      fromHolderType: currentLocation.holderType as HolderType,
      fromHolderId: currentLocation.holderId,
      toHolderType,
      toHolderId,
      transferredBy,
      transferType: transferType as any,
      notes,
    });
    
    // Update current location
    const updated = await this.updateBrochureLocation(brochureId, {
      holderType: toHolderType,
      holderId: toHolderId,
      assignedBy: transferredBy,
      assignedAt: new Date(),
      notes,
    });
    
    return updated!;
  }

  async getBrochureHistory(brochureId: string): Promise<BrochureLocationHistory[]> {
    return db
      .select()
      .from(brochureLocationHistory)
      .where(eq(brochureLocationHistory.brochureId, brochureId))
      .orderBy(desc(brochureLocationHistory.createdAt));
  }

  async createBrochureLocationHistory(data: InsertBrochureLocationHistory): Promise<BrochureLocationHistory> {
    const [created] = await db.insert(brochureLocationHistory).values(data).returning();
    return created;
  }

  async registerBrochure(brochureId: string, orgId: number, registeredBy: string, notes?: string): Promise<BrochureWithLocation> {
    // Create or get the brochure record
    let brochure = await this.getBrochure(brochureId);
    if (!brochure) {
      brochure = await this.createBrochure({
        id: brochureId,
        status: "available",
        orgId,
      });
    }
    
    // Check if already tracked
    const existingLocation = await this.getBrochureLocation(brochureId);
    if (existingLocation) {
      return { ...brochure, location: existingLocation };
    }
    
    // Create location record (starts in house inventory)
    const location = await this.createBrochureLocation({
      brochureId,
      orgId,
      holderType: "house",
      holderId: null,
      assignedBy: registeredBy,
      notes,
    });
    
    // Record history
    await this.createBrochureLocationHistory({
      brochureId,
      orgId,
      fromHolderType: null,
      fromHolderId: null,
      toHolderType: "house",
      toHolderId: null,
      transferredBy: registeredBy,
      transferType: "register",
      notes: notes || "Initial registration to house inventory",
    });
    
    return { ...brochure, location };
  }

  async getBrochuresWithLocations(orgId: number): Promise<BrochureWithLocation[]> {
    const result = await db
      .select()
      .from(brochures)
      .leftJoin(brochureLocations, eq(brochures.id, brochureLocations.brochureId))
      .where(eq(brochures.orgId, orgId))
      .orderBy(desc(brochureLocations.assignedAt));
    
    return result.map(({ brochures: brochure, brochure_locations: location }) => ({
      ...brochure,
      location: location || undefined,
    }));
  }

  // Meeting Recordings
  async createMeetingRecording(data: InsertMeetingRecording): Promise<MeetingRecording> {
    const [created] = await db.insert(meetingRecordings).values(data).returning();
    return created;
  }

  async getMeetingRecording(id: number): Promise<MeetingRecording | undefined> {
    const [recording] = await db.select().from(meetingRecordings).where(eq(meetingRecordings.id, id));
    return recording;
  }

  async getMeetingRecordingsByAgent(agentId: string): Promise<MeetingRecording[]> {
    return db
      .select()
      .from(meetingRecordings)
      .where(eq(meetingRecordings.agentId, agentId))
      .orderBy(desc(meetingRecordings.createdAt));
  }

  async getMeetingRecordingsByOrg(orgId: number): Promise<MeetingRecording[]> {
    return db
      .select()
      .from(meetingRecordings)
      .where(eq(meetingRecordings.orgId, orgId))
      .orderBy(desc(meetingRecordings.createdAt));
  }

  async getMeetingRecordingsByMerchant(merchantId: number): Promise<MeetingRecording[]> {
    return db
      .select()
      .from(meetingRecordings)
      .where(eq(meetingRecordings.merchantId, merchantId))
      .orderBy(desc(meetingRecordings.createdAt));
  }

  async updateMeetingRecording(id: number, data: Partial<MeetingRecording>): Promise<MeetingRecording | undefined> {
    const [updated] = await db
      .update(meetingRecordings)
      .set(data)
      .where(eq(meetingRecordings.id, id))
      .returning();
    return updated;
  }

  // Voice Notes
  async createVoiceNote(data: InsertVoiceNote): Promise<VoiceNote> {
    const [created] = await db.insert(voiceNotes).values(data).returning();
    return created;
  }

  async getVoiceNotesByMerchant(merchantId: number, orgId: number): Promise<VoiceNote[]> {
    return db
      .select()
      .from(voiceNotes)
      .where(and(eq(voiceNotes.merchantId, merchantId), eq(voiceNotes.orgId, orgId)))
      .orderBy(desc(voiceNotes.createdAt));
  }

  async getVoiceNote(id: number): Promise<VoiceNote | undefined> {
    const [note] = await db.select().from(voiceNotes).where(eq(voiceNotes.id, id));
    return note;
  }

  async deleteVoiceNote(id: number, orgId: number): Promise<void> {
    await db.delete(voiceNotes).where(and(eq(voiceNotes.id, id), eq(voiceNotes.orgId, orgId)));
  }

  // Training Documents
  async getTrainingDocuments(): Promise<TrainingDocument[]> {
    return db
      .select()
      .from(trainingDocuments)
      .where(eq(trainingDocuments.isActive, true))
      .orderBy(desc(trainingDocuments.syncedAt));
  }

  async getTrainingDocument(driveFileId: string): Promise<TrainingDocument | undefined> {
    const [doc] = await db
      .select()
      .from(trainingDocuments)
      .where(eq(trainingDocuments.driveFileId, driveFileId));
    return doc;
  }

  async upsertTrainingDocument(data: InsertTrainingDocument): Promise<TrainingDocument> {
    // Check if document exists
    const existing = await this.getTrainingDocument(data.driveFileId);
    
    if (existing) {
      // Update existing document
      const [updated] = await db
        .update(trainingDocuments)
        .set({
          name: data.name,
          content: data.content,
          mimeType: data.mimeType,
          syncedAt: new Date(),
          isActive: data.isActive ?? true,
        })
        .where(eq(trainingDocuments.driveFileId, data.driveFileId))
        .returning();
      return updated;
    } else {
      // Insert new document
      const [created] = await db.insert(trainingDocuments).values(data).returning();
      return created;
    }
  }

  async deleteTrainingDocument(driveFileId: string): Promise<void> {
    await db.delete(trainingDocuments).where(eq(trainingDocuments.driveFileId, driveFileId));
  }

  async getTrainingKnowledgeContext(): Promise<string> {
    const docs = await this.getTrainingDocuments();
    
    if (docs.length === 0) {
      return '';
    }

    let context = '\n\n--- CUSTOM TRAINING MATERIALS ---\n';
    context += 'The following materials have been provided by the sales team:\n\n';

    for (const doc of docs) {
      // Limit each document to prevent token overload
      const truncatedContent = doc.content.substring(0, 3000);
      context += `### ${doc.name}\n${truncatedContent}\n\n`;
    }

    context += '--- END CUSTOM TRAINING MATERIALS ---\n';
    
    return context;
  }

  // Daily Edge Methods
  async getDailyEdgeContent(belief?: string, contentType?: string): Promise<DailyEdgeContent[]> {
    let query = db.select().from(dailyEdgeContent).where(eq(dailyEdgeContent.isActive, true));
    
    const conditions = [eq(dailyEdgeContent.isActive, true)];
    if (belief) {
      conditions.push(eq(dailyEdgeContent.belief, belief));
    }
    if (contentType) {
      conditions.push(eq(dailyEdgeContent.contentType, contentType));
    }
    
    return db
      .select()
      .from(dailyEdgeContent)
      .where(and(...conditions))
      .orderBy(dailyEdgeContent.displayOrder, dailyEdgeContent.id);
  }

  async getTodaysDailyEdge(userId: string): Promise<{ belief: string; content: Record<string, DailyEdgeContent | null> }> {
    // Get day of week (0=Sunday, 1=Monday, etc.)
    const dayOfWeek = new Date().getDay();
    
    // Map day to belief: Mon=fulfilment, Tue=control, Wed=resilience, Thu=influence, Fri=communication
    // Weekend (0=Sunday, 6=Saturday) = user's choice (use a random/rotating belief)
    const beliefMap: Record<number, string> = {
      1: "fulfilment",
      2: "control", 
      3: "resilience",
      4: "influence",
      5: "communication",
    };
    
    let todaysBelief: string;
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekend - rotate through beliefs based on user's progress
      const progress = await this.getUserBeliefProgress(userId);
      if (progress.length > 0) {
        // Pick the belief with least content viewed
        const sorted = progress.sort((a, b) => (a.contentViewed || 0) - (b.contentViewed || 0));
        todaysBelief = sorted[0].belief;
      } else {
        // Default to first belief
        todaysBelief = DAILY_EDGE_BELIEFS[0];
      }
    } else {
      todaysBelief = beliefMap[dayOfWeek] || DAILY_EDGE_BELIEFS[0];
    }
    
    // Get content user has already viewed
    const viewedContent = await db
      .select({ contentId: userDailyEdge.contentId })
      .from(userDailyEdge)
      .where(eq(userDailyEdge.userId, userId));
    
    const viewedIds = viewedContent.map(v => v.contentId);
    
    // Get one item of each content type for today's belief
    const contentResult: Record<string, DailyEdgeContent | null> = {};
    
    for (const contentType of DAILY_EDGE_CONTENT_TYPES) {
      // Build conditions
      const conditions = [
        eq(dailyEdgeContent.isActive, true),
        eq(dailyEdgeContent.belief, todaysBelief),
        eq(dailyEdgeContent.contentType, contentType),
      ];
      
      // Add not-in condition only if user has viewed content
      if (viewedIds.length > 0) {
        conditions.push(notInArray(dailyEdgeContent.id, viewedIds));
      }
      
      // Try to get unseen content first
      const [unseenItem] = await db
        .select()
        .from(dailyEdgeContent)
        .where(and(...conditions))
        .orderBy(dailyEdgeContent.displayOrder, dailyEdgeContent.id)
        .limit(1);
      
      if (unseenItem) {
        contentResult[contentType] = unseenItem;
      } else {
        // Fall back to any content of this type (user has seen all)
        const [anyItem] = await db
          .select()
          .from(dailyEdgeContent)
          .where(and(
            eq(dailyEdgeContent.isActive, true),
            eq(dailyEdgeContent.belief, todaysBelief),
            eq(dailyEdgeContent.contentType, contentType)
          ))
          .orderBy(dailyEdgeContent.displayOrder, dailyEdgeContent.id)
          .limit(1);
        
        contentResult[contentType] = anyItem || null;
      }
    }
    
    return {
      belief: todaysBelief,
      content: contentResult,
    };
  }

  async recordDailyEdgeView(userId: string, contentId: number, reflection?: string): Promise<UserDailyEdge> {
    // Get content to determine belief
    const [content] = await db
      .select()
      .from(dailyEdgeContent)
      .where(eq(dailyEdgeContent.id, contentId));
    
    if (!content) {
      throw new Error("Content not found");
    }
    
    // Record the view
    const [created] = await db
      .insert(userDailyEdge)
      .values({
        userId,
        contentId,
        reflection: reflection || null,
        completedChallenge: false,
      })
      .returning();
    
    // Update belief progress
    await this.updateBeliefProgress(userId, content.belief, true, false);
    
    // Update streak
    await this.updateDailyEdgeStreak(userId);
    
    return created;
  }

  async getUserDailyEdgeProgress(userId: string): Promise<{ totalViewed: number; challengesCompleted: number; streak: DailyEdgeStreak | null }> {
    // Count total viewed
    const [viewedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userDailyEdge)
      .where(eq(userDailyEdge.userId, userId));
    
    // Count challenges completed
    const [challengeResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userDailyEdge)
      .where(and(
        eq(userDailyEdge.userId, userId),
        eq(userDailyEdge.completedChallenge, true)
      ));
    
    // Get streak
    const streak = await this.getDailyEdgeStreak(userId);
    
    return {
      totalViewed: viewedResult?.count || 0,
      challengesCompleted: challengeResult?.count || 0,
      streak: streak || null,
    };
  }

  async getUserBeliefProgress(userId: string): Promise<UserBeliefProgress[]> {
    return db
      .select()
      .from(userBeliefProgress)
      .where(eq(userBeliefProgress.userId, userId));
  }

  async updateBeliefProgress(userId: string, belief: string, viewedContent?: boolean, completedChallenge?: boolean): Promise<UserBeliefProgress> {
    // Check if progress exists
    const [existing] = await db
      .select()
      .from(userBeliefProgress)
      .where(and(
        eq(userBeliefProgress.userId, userId),
        eq(userBeliefProgress.belief, belief)
      ));
    
    if (existing) {
      // Update existing progress
      const updates: Partial<UserBeliefProgress> = {
        lastActivity: new Date(),
      };
      
      if (viewedContent) {
        updates.contentViewed = (existing.contentViewed || 0) + 1;
      }
      if (completedChallenge) {
        updates.challengesCompleted = (existing.challengesCompleted || 0) + 1;
      }
      
      const [updated] = await db
        .update(userBeliefProgress)
        .set(updates)
        .where(eq(userBeliefProgress.id, existing.id))
        .returning();
      
      return updated;
    } else {
      // Create new progress record
      const [created] = await db
        .insert(userBeliefProgress)
        .values({
          userId,
          belief,
          contentViewed: viewedContent ? 1 : 0,
          challengesCompleted: completedChallenge ? 1 : 0,
          currentStreak: 0,
          longestStreak: 0,
          lastActivity: new Date(),
        })
        .returning();
      
      return created;
    }
  }

  async updateDailyEdgeStreak(userId: string): Promise<DailyEdgeStreak> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [existing] = await db
      .select()
      .from(dailyEdgeStreaks)
      .where(eq(dailyEdgeStreaks.userId, userId));
    
    if (existing) {
      const lastActive = existing.lastActiveDate ? new Date(existing.lastActiveDate) : null;
      let newStreak = existing.currentStreak || 0;
      
      if (lastActive) {
        lastActive.setHours(0, 0, 0, 0);
        const dayDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dayDiff === 0) {
          // Already active today, no change needed
          return existing;
        } else if (dayDiff === 1) {
          // Consecutive day
          newStreak = (existing.currentStreak || 0) + 1;
        } else {
          // Streak broken
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }
      
      const longestStreak = Math.max(existing.longestStreak || 0, newStreak);
      
      const [updated] = await db
        .update(dailyEdgeStreaks)
        .set({
          currentStreak: newStreak,
          longestStreak,
          lastActiveDate: new Date(),
          totalDaysActive: (existing.totalDaysActive || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(dailyEdgeStreaks.id, existing.id))
        .returning();
      
      return updated;
    } else {
      // Create new streak record
      const [created] = await db
        .insert(dailyEdgeStreaks)
        .values({
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: new Date(),
          totalDaysActive: 1,
        })
        .returning();
      
      return created;
    }
  }

  async seedDailyEdgeContent(content: InsertDailyEdgeContent[]): Promise<DailyEdgeContent[]> {
    if (content.length === 0) return [];
    
    const created = await db
      .insert(dailyEdgeContent)
      .values(content)
      .returning();
    
    return created;
  }

  async getDailyEdgeStreak(userId: string): Promise<DailyEdgeStreak | undefined> {
    const [streak] = await db
      .select()
      .from(dailyEdgeStreaks)
      .where(eq(dailyEdgeStreaks.userId, userId));
    
    return streak;
  }

  async markChallengeCompleted(userId: string, contentId: number): Promise<UserDailyEdge | undefined> {
    // Get the content to find the belief
    const [content] = await db
      .select()
      .from(dailyEdgeContent)
      .where(eq(dailyEdgeContent.id, contentId));
    
    if (!content) {
      return undefined;
    }
    
    // Check if user has already viewed this content
    const [existingView] = await db
      .select()
      .from(userDailyEdge)
      .where(and(
        eq(userDailyEdge.userId, userId),
        eq(userDailyEdge.contentId, contentId)
      ));
    
    if (existingView) {
      // Update existing view record
      const [updated] = await db
        .update(userDailyEdge)
        .set({ completedChallenge: true })
        .where(eq(userDailyEdge.id, existingView.id))
        .returning();
      
      // Update belief progress
      await this.updateBeliefProgress(userId, content.belief, false, true);
      
      return updated;
    } else {
      // Create new view record with challenge completed
      const [created] = await db
        .insert(userDailyEdge)
        .values({
          userId,
          contentId,
          completedChallenge: true,
        })
        .returning();
      
      // Update belief progress
      await this.updateBeliefProgress(userId, content.belief, true, true);
      
      // Update streak
      await this.updateDailyEdgeStreak(userId);
      
      return created;
    }
  }

  // ============================================
  // EquipIQ - Equipment Recommendation System
  // ============================================

  async getEquipmentVendors(): Promise<EquipmentVendor[]> {
    return db.select().from(equipmentVendors).where(eq(equipmentVendors.isActive, true));
  }

  async getEquipmentVendorById(vendorId: string): Promise<EquipmentVendor | undefined> {
    const [vendor] = await db.select().from(equipmentVendors).where(eq(equipmentVendors.vendorId, vendorId));
    return vendor;
  }

  async createEquipmentVendor(data: InsertEquipmentVendor): Promise<EquipmentVendor> {
    const [vendor] = await db.insert(equipmentVendors).values(data).returning();
    return vendor;
  }

  async getEquipmentProducts(vendorId?: string): Promise<EquipmentProduct[]> {
    if (vendorId) {
      return db.select().from(equipmentProducts)
        .where(and(eq(equipmentProducts.vendorId, vendorId), eq(equipmentProducts.isActive, true)));
    }
    return db.select().from(equipmentProducts).where(eq(equipmentProducts.isActive, true));
  }

  async getEquipmentProductById(id: number): Promise<EquipmentProduct | undefined> {
    const [product] = await db.select().from(equipmentProducts).where(eq(equipmentProducts.id, id));
    return product;
  }

  async createEquipmentProduct(data: InsertEquipmentProduct): Promise<EquipmentProduct> {
    const [product] = await db.insert(equipmentProducts).values(data).returning();
    return product;
  }

  async searchEquipmentProducts(query: string): Promise<EquipmentProduct[]> {
    const lowercaseQuery = query.toLowerCase();
    return db.select().from(equipmentProducts)
      .where(and(
        eq(equipmentProducts.isActive, true),
        sql`(
          LOWER(${equipmentProducts.name}) LIKE ${'%' + lowercaseQuery + '%'} OR
          LOWER(${equipmentProducts.description}) LIKE ${'%' + lowercaseQuery + '%'} OR
          LOWER(${equipmentProducts.type}) LIKE ${'%' + lowercaseQuery + '%'} OR
          LOWER(${equipmentProducts.category}) LIKE ${'%' + lowercaseQuery + '%'}
        )`
      ));
  }

  async getEquipmentBusinessTypes(): Promise<EquipmentBusinessType[]> {
    return db.select().from(equipmentBusinessTypes);
  }

  async createEquipmentBusinessType(data: InsertEquipmentBusinessType): Promise<EquipmentBusinessType> {
    const [bt] = await db.insert(equipmentBusinessTypes).values(data).returning();
    return bt;
  }

  async createEquipmentRecommendationSession(data: InsertEquipmentRecommendationSession): Promise<EquipmentRecommendationSession> {
    const [session] = await db.insert(equipmentRecommendationSessions).values(data).returning();
    return session;
  }

  async getEquipmentRecommendationSessions(userId: string): Promise<EquipmentRecommendationSession[]> {
    return db.select().from(equipmentRecommendationSessions)
      .where(eq(equipmentRecommendationSessions.userId, userId))
      .orderBy(desc(equipmentRecommendationSessions.createdAt));
  }

  async createEquipmentQuizResult(data: InsertEquipmentQuizResult): Promise<EquipmentQuizResult> {
    const [result] = await db.insert(equipmentQuizResults).values(data).returning();
    return result;
  }

  async getEquipmentQuizResults(userId: string): Promise<EquipmentQuizResult[]> {
    return db.select().from(equipmentQuizResults)
      .where(eq(equipmentQuizResults.userId, userId))
      .orderBy(desc(equipmentQuizResults.completedAt));
  }

  async getEquipmentProductsByType(type: string): Promise<EquipmentProduct[]> {
    return db.select().from(equipmentProducts)
      .where(and(eq(equipmentProducts.type, type), eq(equipmentProducts.isActive, true)));
  }

  async getEquipmentProductsByCategory(category: string): Promise<EquipmentProduct[]> {
    return db.select().from(equipmentProducts)
      .where(and(eq(equipmentProducts.category, category), eq(equipmentProducts.isActive, true)));
  }

  // User Permissions
  async getUserPermissions(userId: string): Promise<UserPermissions | undefined> {
    const [perms] = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
    return perms;
  }

  async createUserPermissions(userId: string): Promise<UserPermissions> {
    const [perms] = await db.insert(userPermissions).values({ userId }).returning();
    return perms;
  }

  async updateUserPermissions(userId: string, data: Partial<UserPermissions>): Promise<UserPermissions | undefined> {
    const { id, userId: _, createdAt, ...updateData } = data as any;
    const [updated] = await db
      .update(userPermissions)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(userPermissions.userId, userId))
      .returning();
    return updated;
  }

  async getAllUserPermissions(): Promise<UserPermissions[]> {
    return db.select().from(userPermissions);
  }
}

export const storage = new DatabaseStorage();
