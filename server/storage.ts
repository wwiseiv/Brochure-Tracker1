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
  roleplayPersonas,
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
  type RoleplayPersona,
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
  type InsertUserPermissions,
  organizationFeatures,
  type OrganizationFeatures,
  type InsertOrganizationFeatures,
  permissionAuditLog,
  type PermissionAuditLog,
  type InsertPermissionAuditLog,
  presentationModules,
  presentationLessons,
  presentationProgress,
  presentationQuizzes,
  type PresentationModule,
  type PresentationLesson,
  type PresentationProgress,
  type InsertPresentationProgress,
  type PresentationQuiz,
  type PresentationModuleWithLessons,
  type PresentationLessonWithProgress,
  proposals,
  type Proposal,
  type InsertProposal,
  statementExtractions,
  type StatementExtraction,
  deals,
  dealActivities,
  dealAttachments,
  pipelineStageConfig,
  lossReasons,
  type Deal,
  type InsertDeal,
  type DealActivity,
  type InsertDealActivity,
  type DealAttachment,
  type InsertDealAttachment,
  type PipelineStageConfig,
  type InsertPipelineStageConfig,
  type LossReason,
  type InsertLossReason,
  type DealWithRelations,
  type PipelineStage,
  DEFAULT_PIPELINE_STAGES,
  DEFAULT_LOSS_REASONS,
  prospectSearches,
  type ProspectSearch,
  type InsertProspectSearch,
  statementAnalysisJobs,
  type StatementAnalysisJob,
  type InsertStatementAnalysisJob,
  proposalParseJobs,
  type ProposalParseJob,
  type InsertProposalParseJob,
  pushSubscriptions,
  type PushSubscription,
  type InsertPushSubscription,
  emailDigestPreferences,
  emailDigestHistory,
  type EmailDigestPreferences,
  type InsertEmailDigestPreferences,
  type EmailDigestHistory,
  type InsertEmailDigestHistory,
  impersonationSessions,
  impersonationAuditLog,
  type ImpersonationSession,
  type InsertImpersonationSession,
  type ImpersonationAuditLog,
  type InsertImpersonationAuditLog,
  merchantIntelligence,
  type MerchantIntelligence,
  type InsertMerchantIntelligence,
  gamificationProfiles,
  xpLedger,
  badgesEarned as badgesEarnedTable,
  certificates,
  gamificationDailyLog,
  type GamificationProfile,
  type InsertGamificationProfile,
  type XpLedger,
  type InsertXpLedger,
  type BadgesEarned,
  type InsertBadgesEarned,
  type Certificate,
  type InsertCertificate,
  type GamificationDailyLog,
  type InsertGamificationDailyLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray, gte, lte, isNull, notInArray, or } from "drizzle-orm";

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
  
  // Merchants
  getMerchant(id: number): Promise<Merchant | undefined>;
  getMerchantsByOrg(orgId: number): Promise<Merchant[]>;
  getMerchantsByAgentIds(orgId: number, agentIds: string[]): Promise<Merchant[]>;
  getMerchantByBusinessName(orgId: number, businessName: string): Promise<Merchant | undefined>;
  createMerchant(data: InsertMerchant): Promise<Merchant>;
  updateMerchant(id: number, data: Partial<Merchant>): Promise<Merchant | undefined>;
  deleteMerchant(id: number, userId: string): Promise<boolean>;
  deleteMerchantWithRole(id: number, orgId: number): Promise<boolean>;
  
  // Drops
  deleteDrop(id: number): Promise<boolean>;
  
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
  updateMemberProfile(id: number, data: { firstName?: string; lastName?: string; email?: string; phone?: string; company?: string | null; territory?: string | null; profilePhotoUrl?: string | null; companyLogoUrl?: string | null; profileComplete?: boolean }): Promise<OrganizationMember | undefined>;
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
  
  // Roleplay Personas
  getRoleplayPersonas(): Promise<RoleplayPersona[]>;
  getRoleplayPersona(id: number): Promise<RoleplayPersona | undefined>;
  
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
  
  // Merchant Intelligence
  getMerchantIntelligence(options: { dealId?: number; merchantId?: number; dropId?: number }): Promise<MerchantIntelligence | undefined>;
  createMerchantIntelligence(data: InsertMerchantIntelligence): Promise<MerchantIntelligence>;
  updateMerchantIntelligence(id: number, data: Partial<MerchantIntelligence>): Promise<MerchantIntelligence | undefined>;
  getMeetingRecordingsByDeal(dealId: number): Promise<MeetingRecording[]>;
  
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
  
  // User Permissions (RBAC)
  getUserPermissions(userId: string): Promise<UserPermissions | undefined>;
  createUserPermissions(data: Partial<InsertUserPermissions> & { userId: string }): Promise<UserPermissions>;
  updateUserPermissions(userId: string, data: Partial<UserPermissions>): Promise<UserPermissions | undefined>;
  getAllUserPermissions(): Promise<UserPermissions[]>;
  getUserPermissionsByOrg(orgId: number): Promise<UserPermissions[]>;
  
  // Organization Features
  getOrganizationFeatures(orgId: number): Promise<OrganizationFeatures[]>;
  setOrganizationFeature(data: InsertOrganizationFeatures): Promise<OrganizationFeatures>;
  
  // Permission Audit Log
  createPermissionAuditLog(data: InsertPermissionAuditLog): Promise<PermissionAuditLog>;
  
  // Email Digest Methods
  getEmailDigestPreferences(userId: string): Promise<EmailDigestPreferences | undefined>;
  createEmailDigestPreferences(data: InsertEmailDigestPreferences): Promise<EmailDigestPreferences>;
  updateEmailDigestPreferences(userId: string, data: Partial<InsertEmailDigestPreferences>): Promise<EmailDigestPreferences | undefined>;
  getEmailDigestHistory(userId: string, limit?: number): Promise<EmailDigestHistory[]>;
  createEmailDigestHistory(data: InsertEmailDigestHistory): Promise<EmailDigestHistory>;
  updateEmailDigestHistory(id: number, data: Partial<InsertEmailDigestHistory>): Promise<EmailDigestHistory | undefined>;
  getDueEmailDigests(digestType: 'daily' | 'weekly' | 'immediate'): Promise<EmailDigestPreferences[]>;
  
  // Presentation Training
  getPresentationModules(): Promise<PresentationModule[]>;
  getPresentationModulesWithLessons(): Promise<PresentationModuleWithLessons[]>;
  getPresentationLesson(id: number): Promise<PresentationLesson | undefined>;
  getPresentationLessonQuizzes(lessonId: number): Promise<PresentationQuiz[]>;
  getUserPresentationProgress(userId: string): Promise<PresentationProgress[]>;
  getUserLessonProgress(userId: string, lessonId: number): Promise<PresentationProgress | undefined>;
  upsertPresentationProgress(data: InsertPresentationProgress): Promise<PresentationProgress>;
  
  // Deal Pipeline
  getDeal(id: number): Promise<Deal | undefined>;
  getDealWithRelations(id: number): Promise<DealWithRelations | undefined>;
  getDealsByAgent(agentId: string): Promise<Deal[]>;
  getDealsByOrganization(orgId: number): Promise<Deal[]>;
  getDealsByStage(orgId: number, stage: PipelineStage): Promise<Deal[]>;
  getDealsByMerchantId(merchantId: number): Promise<Deal[]>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: number, data: Partial<Deal>): Promise<Deal | undefined>;
  changeDealStage(id: number, newStage: PipelineStage, agentId: string, reason?: string): Promise<Deal | undefined>;
  deleteDeal(id: number): Promise<boolean>;
  archiveDeal(id: number): Promise<Deal | undefined>;
  
  // Deal Activities
  getDealActivities(dealId: number): Promise<DealActivity[]>;
  createDealActivity(activity: InsertDealActivity): Promise<DealActivity>;
  
  // Deal Attachments
  getDealAttachments(dealId: number): Promise<DealAttachment[]>;
  createDealAttachment(attachment: InsertDealAttachment): Promise<DealAttachment>;
  deleteDealAttachment(id: number): Promise<boolean>;
  
  // Pipeline Stage Config
  getPipelineStageConfig(orgId: number): Promise<PipelineStageConfig[]>;
  initializePipelineStageConfig(orgId: number): Promise<PipelineStageConfig[]>;
  updatePipelineStageConfig(id: number, data: Partial<PipelineStageConfig>): Promise<PipelineStageConfig | undefined>;
  
  // Loss Reasons
  getLossReasons(orgId: number): Promise<LossReason[]>;
  initializeLossReasons(orgId: number): Promise<LossReason[]>;
  createLossReason(data: InsertLossReason): Promise<LossReason>;
  updateLossReason(id: number, data: Partial<LossReason>): Promise<LossReason | undefined>;
  deleteLossReason(id: number): Promise<boolean>;
  
  // Pipeline Analytics
  getDealCountsByStage(orgId: number): Promise<{stage: string; count: number}[]>;
  getDealsNeedingFollowUp(agentId: string): Promise<Deal[]>;
  getStaleDeals(orgId: number, maxDaysInStage?: number): Promise<Deal[]>;
  getDealsNeedingQuarterlyCheckin(agentId: string): Promise<Deal[]>;
  
  // Prospect Search Jobs
  createProspectSearchJob(data: InsertProspectSearch): Promise<ProspectSearch>;
  getProspectSearchJob(id: number): Promise<ProspectSearch | undefined>;
  getProspectSearchJobsByUser(userId: string): Promise<ProspectSearch[]>;
  updateProspectSearchJob(id: number, updates: Partial<ProspectSearch>): Promise<ProspectSearch | undefined>;
  getPendingProspectSearchJobs(): Promise<ProspectSearch[]>;
  
  // Statement Analysis Jobs
  createStatementAnalysisJob(data: InsertStatementAnalysisJob): Promise<StatementAnalysisJob>;
  getStatementAnalysisJob(id: number): Promise<StatementAnalysisJob | undefined>;
  getStatementAnalysisJobsByUser(userId: string): Promise<StatementAnalysisJob[]>;
  getStatementAnalysisJobsByOrg(orgId: number, agentId?: string): Promise<StatementAnalysisJob[]>;
  updateStatementAnalysisJob(id: number, updates: Partial<StatementAnalysisJob>): Promise<StatementAnalysisJob | undefined>;
  getPendingStatementAnalysisJobs(): Promise<StatementAnalysisJob[]>;
  
  // Push Subscriptions
  createPushSubscription(data: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]>;
  deletePushSubscription(userId: string, endpoint: string): Promise<void>;
  
  // Impersonation
  createImpersonationSession(data: InsertImpersonationSession): Promise<ImpersonationSession>;
  getImpersonationSession(id: number): Promise<ImpersonationSession | undefined>;
  getImpersonationSessionByToken(token: string): Promise<ImpersonationSession | undefined>;
  getActiveImpersonationSessions(originalUserId: string): Promise<ImpersonationSession[]>;
  getAllActiveImpersonationSessions(): Promise<ImpersonationSession[]>;
  endImpersonationSession(id: number): Promise<void>;
  endAllImpersonationSessionsForUser(originalUserId: string): Promise<void>;
  createImpersonationAuditLog(data: InsertImpersonationAuditLog): Promise<ImpersonationAuditLog>;
  getImpersonationAuditLogs(orgId?: number, limit?: number, offset?: number): Promise<ImpersonationAuditLog[]>;
  getImpersonatableUsers(requestingUserId: string, orgId: number): Promise<OrganizationMember[]>;

  // Gamification
  getGamificationProfile(userId: string): Promise<GamificationProfile | undefined>;
  upsertGamificationProfile(userId: string, data: Partial<GamificationProfile>): Promise<GamificationProfile>;
  getXpLedger(userId: string, limit?: number): Promise<XpLedger[]>;
  createXpEntry(data: InsertXpLedger): Promise<XpLedger>;
  getBadgesForUser(userId: string): Promise<BadgesEarned[]>;
  createBadge(data: InsertBadgesEarned): Promise<BadgesEarned>;
  getBadge(userId: string, badgeId: string): Promise<BadgesEarned | undefined>;
  getCertificatesForUser(userId: string): Promise<Certificate[]>;
  createCertificate(data: InsertCertificate): Promise<Certificate>;
  getCertificateByVerification(code: string): Promise<Certificate | undefined>;
  getDailyLog(userId: string, date: string): Promise<GamificationDailyLog | undefined>;
  upsertDailyLog(userId: string, date: string, xpToAdd: number): Promise<GamificationDailyLog>;
  getOrgGamificationProfiles(userIds: string[]): Promise<GamificationProfile[]>;
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
    const [created] = await db.insert(drops).values(drop as any).returning();
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
    const [created] = await db.insert(reminders).values(reminder as any).returning();
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
    const [created] = await db.insert(organizations).values(data as any).returning();
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
    const [created] = await db.insert(organizationMembers).values(data as any).returning();
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

  async updateMemberProfile(id: number, data: { firstName?: string; lastName?: string; email?: string; phone?: string; company?: string | null; territory?: string | null; profilePhotoUrl?: string | null; companyLogoUrl?: string | null; profileComplete?: boolean }): Promise<OrganizationMember | undefined> {
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
    // Get sample merchants that are visible to everyone
    const sampleMerchants = await db.select().from(merchants)
      .where(and(eq(merchants.orgId, orgId), eq(merchants.isSample, true)))
      .orderBy(desc(merchants.lastVisitAt));
    
    if (agentIds.length === 0) return sampleMerchants;
    
    // Get unique merchant IDs from drops made by these agents
    const dropsWithMerchants = await db
      .select({ merchantId: drops.merchantId })
      .from(drops)
      .where(and(
        eq(drops.orgId, orgId),
        inArray(drops.agentId, agentIds),
        sql`${drops.merchantId} IS NOT NULL`
      ));
    
    const merchantIds = Array.from(new Set(dropsWithMerchants.map(d => d.merchantId).filter(Boolean))) as number[];
    
    // Get agent's own merchants (non-sample)
    let agentMerchants: Merchant[] = [];
    if (merchantIds.length > 0) {
      agentMerchants = await db.select().from(merchants)
        .where(and(
          eq(merchants.orgId, orgId), 
          inArray(merchants.id, merchantIds),
          eq(merchants.isSample, false)
        ))
        .orderBy(desc(merchants.lastVisitAt));
    }
    
    // Combine sample merchants + agent's own merchants, avoiding duplicates
    const sampleIds = new Set(sampleMerchants.map(m => m.id));
    const uniqueAgentMerchants = agentMerchants.filter(m => !sampleIds.has(m.id));
    
    return [...sampleMerchants, ...uniqueAgentMerchants];
  }
  
  async deleteMerchant(id: number, userId: string): Promise<boolean> {
    // Only allow deletion if user created the merchant or it's a sample
    const [merchant] = await db.select().from(merchants).where(eq(merchants.id, id));
    if (!merchant) return false;
    
    // Allow deletion if user created it OR if it's a sample merchant
    if (merchant.createdBy === userId || merchant.isSample) {
      await db.delete(merchants).where(eq(merchants.id, id));
      return true;
    }
    
    return false;
  }

  async deleteMerchantWithRole(id: number, orgId: number): Promise<boolean> {
    // Delete merchant after role-based checks have been done in route
    // Also clean up related drops by unlinking them (set merchantId to null)
    const [merchant] = await db.select().from(merchants).where(eq(merchants.id, id));
    if (!merchant || merchant.orgId !== orgId) return false;
    
    // Unlink drops associated with this merchant
    await db.update(drops).set({ merchantId: null }).where(eq(drops.merchantId, id));
    
    // Delete the merchant
    await db.delete(merchants).where(eq(merchants.id, id));
    return true;
  }

  async deleteDrop(id: number): Promise<boolean> {
    // Delete drop and clean up related data
    const [drop] = await db.select().from(drops).where(eq(drops.id, id));
    if (!drop) return false;
    
    // Delete associated reminders
    await db.delete(reminders).where(eq(reminders.dropId, id));
    
    // Update brochure status back to available if it was deployed
    if (drop.brochureId) {
      await db.update(brochures)
        .set({ status: 'available' })
        .where(eq(brochures.id, drop.brochureId));
    }
    
    // Update merchant stats if linked
    if (drop.merchantId) {
      const [merchant] = await db.select().from(merchants).where(eq(merchants.id, drop.merchantId));
      if (merchant && merchant.totalDrops && merchant.totalDrops > 0) {
        await db.update(merchants)
          .set({ totalDrops: merchant.totalDrops - 1 })
          .where(eq(merchants.id, drop.merchantId));
      }
    }
    
    // Delete the drop
    await db.delete(drops).where(eq(drops.id, id));
    return true;
  }

  async getMerchantByBusinessName(orgId: number, businessName: string): Promise<Merchant | undefined> {
    const [merchant] = await db.select().from(merchants)
      .where(and(eq(merchants.orgId, orgId), eq(merchants.businessName, businessName)));
    return merchant;
  }

  async createMerchant(data: InsertMerchant): Promise<Merchant> {
    const [created] = await db.insert(merchants).values(data as any).returning();
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
    const inventoryData = data as { orgId: number; agentId: string };
    const existing = await this.getAgentInventory(inventoryData.orgId, inventoryData.agentId);
    if (existing) {
      const [updated] = await db.update(agentInventory)
        .set({ ...data, updatedAt: new Date() } as any)
        .where(eq(agentInventory.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(agentInventory).values(data as any).returning();
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
    const [created] = await db.insert(inventoryLogs).values(data as any).returning();
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

  async getReferralsByAgentIds(agentIds: string[]): Promise<Referral[]> {
    if (agentIds.length === 0) return [];
    return db.select().from(referrals).where(inArray(referrals.agentId, agentIds)).orderBy(desc(referrals.createdAt));
  }

  async createReferral(data: InsertReferral): Promise<Referral> {
    const [created] = await db.insert(referrals).values(data as any).returning();
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
    const [created] = await db.insert(followUpSequences).values(data as any).returning();
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
    const [created] = await db.insert(followUpSteps).values(data as any).returning();
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
    const [created] = await db.insert(followUpExecutions).values(data as any).returning();
    return created;
  }

  async updateFollowUpExecution(id: number, data: Partial<FollowUpExecution>): Promise<FollowUpExecution | undefined> {
    const [updated] = await db.update(followUpExecutions).set(data).where(eq(followUpExecutions.id, id)).returning();
    return updated;
  }

  // Activity Events
  async createActivityEvent(data: InsertActivityEvent): Promise<ActivityEvent> {
    const [created] = await db.insert(activityEvents).values(data as any).returning();
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
    const [created] = await db.insert(aiSummaries).values(data as any).returning();
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
    const [created] = await db.insert(leadScores).values(data as any).returning();
    return created;
  }

  // Offline Queue
  async createOfflineQueueItem(data: InsertOfflineQueue): Promise<OfflineQueue> {
    const [created] = await db.insert(offlineQueue).values(data as any).returning();
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
    const [created] = await db.insert(invitations).values(data as any).returning();
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
    const [created] = await db.insert(feedbackSubmissions).values(data as any).returning();
    return created;
  }

  // Role-play Sessions
  async createRoleplaySession(data: InsertRoleplaySession): Promise<RoleplaySession> {
    const [created] = await db.insert(roleplaySessions).values(data as any).returning();
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
    const [created] = await db.insert(roleplayMessages).values(data as any).returning();
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

  // Roleplay Personas
  async getRoleplayPersonas(): Promise<RoleplayPersona[]> {
    return db.select().from(roleplayPersonas).where(eq(roleplayPersonas.isActive, true)).orderBy(roleplayPersonas.id);
  }

  async getRoleplayPersona(id: number): Promise<RoleplayPersona | undefined> {
    const [persona] = await db.select().from(roleplayPersonas).where(eq(roleplayPersonas.id, id));
    return persona;
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
    const [created] = await db.insert(brochureLocations).values(data as any).returning();
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
    } as InsertBrochureLocationHistory);
    
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
    const [created] = await db.insert(brochureLocationHistory).values(data as any).returning();
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
    } as InsertBrochureLocation);
    
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
    } as InsertBrochureLocationHistory);
    
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
    const [created] = await db.insert(meetingRecordings).values(data as any).returning();
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
    const [created] = await db.insert(voiceNotes).values(data as any).returning();
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

  // Merchant Intelligence
  async getMerchantIntelligence(options: { dealId?: number; merchantId?: number; dropId?: number }): Promise<MerchantIntelligence | undefined> {
    const conditions = [];
    if (options.dealId) conditions.push(eq(merchantIntelligence.dealId, options.dealId));
    if (options.merchantId) conditions.push(eq(merchantIntelligence.merchantId, options.merchantId));
    if (options.dropId) conditions.push(eq(merchantIntelligence.dropId, options.dropId));
    
    if (conditions.length === 0) return undefined;
    
    const [result] = await db
      .select()
      .from(merchantIntelligence)
      .where(conditions.length === 1 ? conditions[0] : or(...conditions))
      .orderBy(desc(merchantIntelligence.lastUpdatedAt))
      .limit(1);
    return result;
  }

  async createMerchantIntelligence(data: InsertMerchantIntelligence): Promise<MerchantIntelligence> {
    const [created] = await db.insert(merchantIntelligence).values(data as any).returning();
    return created;
  }

  async updateMerchantIntelligence(id: number, data: Partial<MerchantIntelligence>): Promise<MerchantIntelligence | undefined> {
    const [updated] = await db
      .update(merchantIntelligence)
      .set({ ...data, lastUpdatedAt: new Date() })
      .where(eq(merchantIntelligence.id, id))
      .returning();
    return updated;
  }

  async getMeetingRecordingsByDeal(dealId: number): Promise<MeetingRecording[]> {
    return db
      .select()
      .from(meetingRecordings)
      .where(eq(meetingRecordings.dealId, dealId))
      .orderBy(desc(meetingRecordings.createdAt));
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
    const docData = data as any as { driveFileId: string; name: string; content: string; mimeType: string; isActive?: boolean };
    const existing = await this.getTrainingDocument(docData.driveFileId);
    
    if (existing) {
      // Update existing document
      const [updated] = await db
        .update(trainingDocuments)
        .set({
          name: docData.name,
          content: docData.content,
          mimeType: docData.mimeType,
          syncedAt: new Date(),
          isActive: docData.isActive ?? true,
        })
        .where(eq(trainingDocuments.driveFileId, docData.driveFileId))
        .returning();
      return updated;
    } else {
      // Insert new document
      const [created] = await db.insert(trainingDocuments).values(data as any).returning();
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
      .values(content as any)
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
    const [vendor] = await db.insert(equipmentVendors).values(data as any).returning();
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
    const [product] = await db.insert(equipmentProducts).values(data as any).returning();
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
    const [bt] = await db.insert(equipmentBusinessTypes).values(data as any).returning();
    return bt;
  }

  async createEquipmentRecommendationSession(data: InsertEquipmentRecommendationSession): Promise<EquipmentRecommendationSession> {
    const [session] = await db.insert(equipmentRecommendationSessions).values(data as any).returning();
    return session;
  }

  async getEquipmentRecommendationSessions(userId: string): Promise<EquipmentRecommendationSession[]> {
    return db.select().from(equipmentRecommendationSessions)
      .where(eq(equipmentRecommendationSessions.userId, userId))
      .orderBy(desc(equipmentRecommendationSessions.createdAt));
  }

  async createEquipmentQuizResult(data: InsertEquipmentQuizResult): Promise<EquipmentQuizResult> {
    const [result] = await db.insert(equipmentQuizResults).values(data as any).returning();
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

  // User Permissions (RBAC)
  async getUserPermissions(userId: string): Promise<UserPermissions | undefined> {
    const [perms] = await db.select().from(userPermissions).where(eq(userPermissions.userId, userId));
    return perms;
  }

  async createUserPermissions(data: Partial<InsertUserPermissions> & { userId: string }): Promise<UserPermissions> {
    const [perms] = await db.insert(userPermissions).values(data as any).returning();
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

  async getUserPermissionsByOrg(orgId: number): Promise<UserPermissions[]> {
    return db.select().from(userPermissions).where(eq(userPermissions.orgId, orgId));
  }

  // Organization Features
  async getOrganizationFeatures(orgId: number): Promise<OrganizationFeatures[]> {
    return db.select().from(organizationFeatures).where(eq(organizationFeatures.orgId, orgId));
  }

  async setOrganizationFeature(data: InsertOrganizationFeatures): Promise<OrganizationFeatures> {
    const [feature] = await db
      .insert(organizationFeatures)
      .values(data as any)
      .onConflictDoUpdate({
        target: [organizationFeatures.orgId, organizationFeatures.featureId],
        set: { enabled: data.enabled, updatedAt: new Date() }
      })
      .returning();
    return feature;
  }

  // Permission Audit Log
  async createPermissionAuditLog(data: InsertPermissionAuditLog): Promise<PermissionAuditLog> {
    const [log] = await db.insert(permissionAuditLog).values(data as any).returning();
    return log;
  }

  // Email Digest Methods
  async getEmailDigestPreferences(userId: string): Promise<EmailDigestPreferences | undefined> {
    const [prefs] = await db.select().from(emailDigestPreferences).where(eq(emailDigestPreferences.userId, userId));
    return prefs;
  }

  async createEmailDigestPreferences(data: InsertEmailDigestPreferences): Promise<EmailDigestPreferences> {
    const [prefs] = await db.insert(emailDigestPreferences).values(data as any).returning();
    return prefs;
  }

  async updateEmailDigestPreferences(userId: string, data: Partial<InsertEmailDigestPreferences>): Promise<EmailDigestPreferences | undefined> {
    const [prefs] = await db.update(emailDigestPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emailDigestPreferences.userId, userId))
      .returning();
    return prefs;
  }

  async getEmailDigestHistory(userId: string, limit = 20): Promise<EmailDigestHistory[]> {
    return db.select().from(emailDigestHistory)
      .where(eq(emailDigestHistory.userId, userId))
      .orderBy(desc(emailDigestHistory.createdAt))
      .limit(limit);
  }

  async createEmailDigestHistory(data: InsertEmailDigestHistory): Promise<EmailDigestHistory> {
    const [history] = await db.insert(emailDigestHistory).values(data as any).returning();
    return history;
  }

  async updateEmailDigestHistory(id: number, data: Partial<InsertEmailDigestHistory>): Promise<EmailDigestHistory | undefined> {
    const [history] = await db.update(emailDigestHistory)
      .set(data)
      .where(eq(emailDigestHistory.id, id))
      .returning();
    return history;
  }

  async getDueEmailDigests(digestType: 'daily' | 'weekly' | 'immediate'): Promise<EmailDigestPreferences[]> {
    if (digestType === 'daily') {
      return db.select().from(emailDigestPreferences)
        .where(eq(emailDigestPreferences.dailyDigestEnabled, true));
    } else if (digestType === 'weekly') {
      return db.select().from(emailDigestPreferences)
        .where(eq(emailDigestPreferences.weeklyDigestEnabled, true));
    } else {
      return db.select().from(emailDigestPreferences)
        .where(eq(emailDigestPreferences.immediateDigestEnabled, true));
    }
  }

  // Presentation Training
  async getPresentationModules(): Promise<PresentationModule[]> {
    return db.select().from(presentationModules).orderBy(presentationModules.moduleNumber);
  }

  async getPresentationModulesWithLessons(): Promise<PresentationModuleWithLessons[]> {
    const modules = await db.select().from(presentationModules).orderBy(presentationModules.moduleNumber);
    const lessons = await db.select().from(presentationLessons).orderBy(presentationLessons.lessonNumber);
    
    return modules.map(module => ({
      ...module,
      lessons: lessons.filter(lesson => lesson.moduleId === module.id),
    }));
  }

  async getPresentationLesson(id: number): Promise<PresentationLesson | undefined> {
    const [lesson] = await db.select().from(presentationLessons).where(eq(presentationLessons.id, id));
    return lesson;
  }

  async getPresentationLessonQuizzes(lessonId: number): Promise<PresentationQuiz[]> {
    return db.select().from(presentationQuizzes).where(eq(presentationQuizzes.lessonId, lessonId));
  }

  async getUserPresentationProgress(userId: string): Promise<PresentationProgress[]> {
    return db.select().from(presentationProgress).where(eq(presentationProgress.userId, userId));
  }

  async getUserLessonProgress(userId: string, lessonId: number): Promise<PresentationProgress | undefined> {
    const [progress] = await db.select().from(presentationProgress).where(
      and(
        eq(presentationProgress.userId, userId),
        eq(presentationProgress.lessonId, lessonId)
      )
    );
    return progress;
  }

  async upsertPresentationProgress(data: InsertPresentationProgress): Promise<PresentationProgress> {
    const progressData = data as any as { userId: string; lessonId: number; completed?: boolean; practiceRecorded?: boolean; quizPassed?: boolean };
    const existing = await this.getUserLessonProgress(progressData.userId, progressData.lessonId);
    
    if (existing) {
      const updateData: Partial<PresentationProgress> = {};
      if (progressData.completed !== undefined) updateData.completed = progressData.completed;
      if (progressData.practiceRecorded !== undefined) updateData.practiceRecorded = progressData.practiceRecorded;
      if (progressData.quizPassed !== undefined) updateData.quizPassed = progressData.quizPassed;
      if (progressData.completed && !existing.completedAt) updateData.completedAt = new Date();
      
      const [updated] = await db.update(presentationProgress)
        .set(updateData)
        .where(eq(presentationProgress.id, existing.id))
        .returning();
      return updated;
    } else {
      const insertData = {
        ...data,
        completedAt: progressData.completed ? new Date() : null,
      };
      const [created] = await db.insert(presentationProgress).values(insertData as any).returning();
      return created;
    }
  }

  async createProposal(data: InsertProposal): Promise<Proposal> {
    const [created] = await db.insert(proposals).values(data as any).returning();
    return created;
  }

  async getProposal(id: number): Promise<Proposal | undefined> {
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, id));
    return proposal;
  }

  async getProposalsByUser(userId: string): Promise<Proposal[]> {
    return db.select().from(proposals)
      .where(eq(proposals.userId, userId))
      .orderBy(desc(proposals.createdAt));
  }

  async getProposalsByOrganization(orgId: number): Promise<Proposal[]> {
    return db.select().from(proposals)
      .where(eq(proposals.organizationId, orgId))
      .orderBy(desc(proposals.createdAt));
  }

  async updateProposal(id: number, data: Partial<Proposal>): Promise<Proposal | undefined> {
    const { id: _, createdAt, ...updateData } = data as any;
    const [updated] = await db.update(proposals)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(proposals.id, id))
      .returning();
    return updated;
  }

  async deleteProposal(id: number): Promise<void> {
    await db.delete(proposals).where(eq(proposals.id, id));
  }

  async getProposalsByMerchant(merchantId: number): Promise<Proposal[]> {
    return db.select().from(proposals)
      .where(eq(proposals.merchantId, merchantId))
      .orderBy(desc(proposals.createdAt));
  }

  async getStatementExtractionsByUser(userId: string): Promise<StatementExtraction[]> {
    return db.select().from(statementExtractions)
      .where(eq(statementExtractions.userId, userId))
      .orderBy(desc(statementExtractions.createdAt));
  }

  async getStatementExtractionsByOrganization(orgId: number): Promise<StatementExtraction[]> {
    return db.select().from(statementExtractions)
      .where(eq(statementExtractions.orgId, orgId))
      .orderBy(desc(statementExtractions.createdAt));
  }

  async getStatementExtractionsByMerchant(merchantId: number): Promise<StatementExtraction[]> {
    return db.select().from(statementExtractions)
      .where(eq(statementExtractions.merchantId, merchantId))
      .orderBy(desc(statementExtractions.createdAt));
  }

  async getStatementExtraction(id: number): Promise<StatementExtraction | undefined> {
    const [extraction] = await db.select().from(statementExtractions)
      .where(eq(statementExtractions.id, id));
    return extraction;
  }

  async updateStatementExtraction(id: number, data: Partial<StatementExtraction>): Promise<StatementExtraction | undefined> {
    const { id: _, createdAt, ...updateData } = data as any;
    const [updated] = await db.update(statementExtractions)
      .set(updateData)
      .where(eq(statementExtractions.id, id))
      .returning();
    return updated;
  }

  // Deal Pipeline
  async getDeal(id: number): Promise<Deal | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    return deal;
  }

  async getDealWithRelations(id: number): Promise<DealWithRelations | undefined> {
    const [deal] = await db.select().from(deals).where(eq(deals.id, id));
    if (!deal) return undefined;
    
    const activities = await db.select().from(dealActivities)
      .where(eq(dealActivities.dealId, id))
      .orderBy(desc(dealActivities.activityAt));
    
    const attachments = await db.select().from(dealAttachments)
      .where(eq(dealAttachments.dealId, id))
      .orderBy(desc(dealAttachments.createdAt));
    
    return {
      ...deal,
      activities,
      attachments,
    };
  }

  async getDealsByAgent(agentId: string): Promise<Deal[]> {
    return db.select().from(deals)
      .where(and(eq(deals.assignedAgentId, agentId), eq(deals.archived, false)))
      .orderBy(desc(deals.updatedAt));
  }

  async getDealsByOrganization(orgId: number): Promise<Deal[]> {
    return db.select().from(deals)
      .where(and(eq(deals.organizationId, orgId), eq(deals.archived, false)))
      .orderBy(desc(deals.updatedAt));
  }

  async getDealsByStage(orgId: number, stage: PipelineStage): Promise<Deal[]> {
    return db.select().from(deals)
      .where(and(
        eq(deals.organizationId, orgId),
        eq(deals.currentStage, stage),
        eq(deals.archived, false)
      ))
      .orderBy(desc(deals.updatedAt));
  }

  async getDealsByMerchantId(merchantId: number): Promise<Deal[]> {
    return db.select().from(deals)
      .where(and(
        eq(deals.merchantId, merchantId),
        eq(deals.archived, false)
      ))
      .orderBy(desc(deals.updatedAt));
  }

  async createDeal(deal: InsertDeal): Promise<Deal> {
    const [created] = await db.insert(deals).values(deal as any).returning();
    return created;
  }

  async updateDeal(id: number, data: Partial<Deal>): Promise<Deal | undefined> {
    const { id: _, createdAt, ...updateData } = data as any;
    const [updated] = await db.update(deals)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();
    return updated;
  }

  async changeDealStage(id: number, newStage: PipelineStage, agentId: string, reason?: string): Promise<Deal | undefined> {
    const deal = await this.getDeal(id);
    if (!deal) return undefined;

    const previousStage = deal.currentStage;
    const now = new Date();

    const [updated] = await db.update(deals)
      .set({
        currentStage: newStage,
        previousStage: previousStage,
        stageEnteredAt: now,
        updatedAt: now,
        lastActivityAt: now,
        lastActivityType: 'stage_change',
        ...(newStage === 'sold' ? { wonAt: now } : {}),
        ...(newStage === 'dead' ? { closedAt: now, closedReason: reason } : {}),
      })
      .where(eq(deals.id, id))
      .returning();

    if (updated) {
      await db.insert(dealActivities).values({
        dealId: id,
        organizationId: deal.organizationId,
        activityType: 'stage_change',
        agentId: agentId,
        fromStage: previousStage,
        toStage: newStage,
        stageChangeReason: reason,
        description: `Stage changed from ${previousStage} to ${newStage}`,
        isSystemGenerated: false,
      });
    }

    return updated;
  }

  async deleteDeal(id: number): Promise<boolean> {
    const result = await db.delete(deals).where(eq(deals.id, id));
    return true;
  }

  async archiveDeal(id: number): Promise<Deal | undefined> {
    const [updated] = await db.update(deals)
      .set({ archived: true, archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();
    return updated;
  }

  // Deal Activities
  async getDealActivities(dealId: number): Promise<DealActivity[]> {
    return db.select().from(dealActivities)
      .where(eq(dealActivities.dealId, dealId))
      .orderBy(desc(dealActivities.activityAt));
  }

  async createDealActivity(activity: InsertDealActivity): Promise<DealActivity> {
    const activityData = activity as any as { activityType: string; dealId: number };
    const [created] = await db.insert(dealActivities).values(activity as any).returning();
    
    await db.update(deals)
      .set({
        lastActivityAt: new Date(),
        lastActivityType: activityData.activityType,
        updatedAt: new Date(),
      })
      .where(eq(deals.id, activityData.dealId));
    
    return created;
  }

  // Deal Attachments
  async getDealAttachments(dealId: number): Promise<DealAttachment[]> {
    return db.select().from(dealAttachments)
      .where(eq(dealAttachments.dealId, dealId))
      .orderBy(desc(dealAttachments.createdAt));
  }

  async createDealAttachment(attachment: InsertDealAttachment): Promise<DealAttachment> {
    const [created] = await db.insert(dealAttachments).values(attachment as any).returning();
    return created;
  }

  async deleteDealAttachment(id: number): Promise<boolean> {
    await db.delete(dealAttachments).where(eq(dealAttachments.id, id));
    return true;
  }

  // Pipeline Stage Config
  async getPipelineStageConfig(orgId: number): Promise<PipelineStageConfig[]> {
    return db.select().from(pipelineStageConfig)
      .where(eq(pipelineStageConfig.organizationId, orgId))
      .orderBy(pipelineStageConfig.stageOrder);
  }

  async initializePipelineStageConfig(orgId: number): Promise<PipelineStageConfig[]> {
    const existing = await this.getPipelineStageConfig(orgId);
    if (existing.length > 0) return existing;

    const configs = DEFAULT_PIPELINE_STAGES.map(stage => ({
      ...stage,
      organizationId: orgId,
    }));

    const created = await db.insert(pipelineStageConfig).values(configs as any).returning();
    return created;
  }

  async updatePipelineStageConfig(id: number, data: Partial<PipelineStageConfig>): Promise<PipelineStageConfig | undefined> {
    const { id: _, createdAt, ...updateData } = data as any;
    const [updated] = await db.update(pipelineStageConfig)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(pipelineStageConfig.id, id))
      .returning();
    return updated;
  }

  // Loss Reasons
  async getLossReasons(orgId: number): Promise<LossReason[]> {
    return db.select().from(lossReasons)
      .where(eq(lossReasons.organizationId, orgId))
      .orderBy(lossReasons.sortOrder);
  }

  async initializeLossReasons(orgId: number): Promise<LossReason[]> {
    const existing = await this.getLossReasons(orgId);
    if (existing.length > 0) return existing;

    const reasons = DEFAULT_LOSS_REASONS.map(reason => ({
      ...reason,
      organizationId: orgId,
    }));

    const created = await db.insert(lossReasons).values(reasons as any).returning();
    return created;
  }

  async createLossReason(data: InsertLossReason): Promise<LossReason> {
    const [created] = await db.insert(lossReasons).values(data as any).returning();
    return created;
  }

  async updateLossReason(id: number, data: Partial<LossReason>): Promise<LossReason | undefined> {
    const { id: _, createdAt, ...updateData } = data as any;
    const [updated] = await db.update(lossReasons)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(lossReasons.id, id))
      .returning();
    return updated;
  }

  async deleteLossReason(id: number): Promise<boolean> {
    await db.delete(lossReasons).where(eq(lossReasons.id, id));
    return true;
  }

  // Pipeline Analytics
  async getDealCountsByStage(orgId: number): Promise<{stage: string; count: number}[]> {
    const result = await db.select({
      stage: deals.currentStage,
      count: sql<number>`count(*)::int`,
    })
      .from(deals)
      .where(and(eq(deals.organizationId, orgId), eq(deals.archived, false)))
      .groupBy(deals.currentStage);
    
    return result;
  }

  async getDealsNeedingFollowUp(agentId: string): Promise<Deal[]> {
    const now = new Date();
    return db.select().from(deals)
      .where(and(
        eq(deals.assignedAgentId, agentId),
        eq(deals.archived, false),
        lte(deals.nextFollowUpAt, now)
      ))
      .orderBy(deals.nextFollowUpAt);
  }

  async getStaleDeals(orgId: number, maxDaysInStage?: number): Promise<Deal[]> {
    const stageConfigs = await this.getPipelineStageConfig(orgId);
    if (stageConfigs.length === 0) return [];

    const now = new Date();
    const staleDeals: Deal[] = [];
    
    for (const config of stageConfigs) {
      if (config.staleThresholdDays <= 0 || config.isTerminal) continue;
      
      const thresholdDays = maxDaysInStage ?? config.staleThresholdDays;
      const thresholdDate = new Date(now.getTime() - thresholdDays * 24 * 60 * 60 * 1000);
      
      const dealsInStage = await db.select().from(deals)
        .where(and(
          eq(deals.organizationId, orgId),
          eq(deals.currentStage, config.stageKey),
          eq(deals.archived, false),
          lte(deals.stageEnteredAt, thresholdDate)
        ));
      
      staleDeals.push(...dealsInStage);
    }

    return staleDeals.sort((a, b) => 
      new Date(a.stageEnteredAt).getTime() - new Date(b.stageEnteredAt).getTime()
    );
  }

  async getDealsNeedingQuarterlyCheckin(agentId: string): Promise<Deal[]> {
    const now = new Date();
    return db.select().from(deals)
      .where(and(
        eq(deals.assignedAgentId, agentId),
        eq(deals.archived, false),
        eq(deals.currentStage, "active_merchant"),
        lte(deals.nextQuarterlyCheckinAt, now)
      ))
      .orderBy(deals.nextQuarterlyCheckinAt);
  }

  // Prospect Search Jobs
  async createProspectSearchJob(data: InsertProspectSearch): Promise<ProspectSearch> {
    const [created] = await db.insert(prospectSearches).values(data as any).returning();
    return created;
  }

  async getProspectSearchJob(id: number): Promise<ProspectSearch | undefined> {
    const [job] = await db.select().from(prospectSearches).where(eq(prospectSearches.id, id));
    return job;
  }

  async getProspectSearchJobsByUser(userId: string): Promise<ProspectSearch[]> {
    return db.select().from(prospectSearches)
      .where(eq(prospectSearches.agentId, userId))
      .orderBy(desc(prospectSearches.createdAt));
  }

  async updateProspectSearchJob(id: number, updates: Partial<ProspectSearch>): Promise<ProspectSearch | undefined> {
    const [updated] = await db
      .update(prospectSearches)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(prospectSearches.id, id))
      .returning();
    return updated;
  }

  async getPendingProspectSearchJobs(): Promise<ProspectSearch[]> {
    return db.select().from(prospectSearches)
      .where(eq(prospectSearches.status, "pending"))
      .orderBy(prospectSearches.createdAt);
  }

  // Statement Analysis Jobs
  async createStatementAnalysisJob(data: InsertStatementAnalysisJob): Promise<StatementAnalysisJob> {
    const [created] = await db.insert(statementAnalysisJobs).values(data as any).returning();
    return created;
  }

  async getStatementAnalysisJob(id: number): Promise<StatementAnalysisJob | undefined> {
    const [job] = await db.select().from(statementAnalysisJobs).where(eq(statementAnalysisJobs.id, id));
    return job;
  }

  async getStatementAnalysisJobsByUser(userId: string): Promise<StatementAnalysisJob[]> {
    return db.select().from(statementAnalysisJobs)
      .where(eq(statementAnalysisJobs.agentId, userId))
      .orderBy(desc(statementAnalysisJobs.createdAt));
  }

  async getStatementAnalysisJobsByOrg(orgId: number, agentId?: string): Promise<StatementAnalysisJob[]> {
    if (agentId) {
      return db.select().from(statementAnalysisJobs)
        .where(and(
          eq(statementAnalysisJobs.organizationId, orgId),
          eq(statementAnalysisJobs.agentId, agentId)
        ))
        .orderBy(desc(statementAnalysisJobs.createdAt));
    }
    return db.select().from(statementAnalysisJobs)
      .where(eq(statementAnalysisJobs.organizationId, orgId))
      .orderBy(desc(statementAnalysisJobs.createdAt));
  }

  async updateStatementAnalysisJob(id: number, updates: Partial<StatementAnalysisJob>): Promise<StatementAnalysisJob | undefined> {
    const [updated] = await db
      .update(statementAnalysisJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(statementAnalysisJobs.id, id))
      .returning();
    return updated;
  }

  async getPendingStatementAnalysisJobs(): Promise<StatementAnalysisJob[]> {
    return db.select().from(statementAnalysisJobs)
      .where(eq(statementAnalysisJobs.status, "pending"))
      .orderBy(statementAnalysisJobs.createdAt);
  }

  // Push Subscriptions
  async createPushSubscription(data: InsertPushSubscription): Promise<PushSubscription> {
    const pushData = data as any as { userId: string; endpoint: string; keysP256dh?: string; keysAuth?: string; userAgent?: string; organizationId?: number };
    const [existing] = await db.select().from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, pushData.userId),
        eq(pushSubscriptions.endpoint, pushData.endpoint)
      ));
    
    if (existing) {
      const [updated] = await db
        .update(pushSubscriptions)
        .set({
          keysP256dh: pushData.keysP256dh,
          keysAuth: pushData.keysAuth,
          userAgent: pushData.userAgent,
          organizationId: pushData.organizationId,
        })
        .where(eq(pushSubscriptions.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(pushSubscriptions).values(data as any).returning();
    return created;
  }

  async getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(userId: string, endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint)
      ));
  }

  // Proposal Parse Jobs
  async createProposalParseJob(data: InsertProposalParseJob): Promise<ProposalParseJob> {
    const [created] = await db.insert(proposalParseJobs).values(data as any).returning();
    return created;
  }

  async getProposalParseJob(id: number): Promise<ProposalParseJob | undefined> {
    const [job] = await db.select().from(proposalParseJobs).where(eq(proposalParseJobs.id, id));
    return job;
  }

  async getProposalParseJobsByUser(agentId: string): Promise<ProposalParseJob[]> {
    return db.select().from(proposalParseJobs)
      .where(eq(proposalParseJobs.agentId, agentId))
      .orderBy(desc(proposalParseJobs.createdAt));
  }

  async updateProposalParseJob(id: number, updates: Partial<ProposalParseJob>): Promise<void> {
    await db
      .update(proposalParseJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(proposalParseJobs.id, id));
  }

  async deleteProposalParseJob(id: number): Promise<void> {
    await db.delete(proposalParseJobs).where(eq(proposalParseJobs.id, id));
  }

  async getPendingProposalParseJobs(): Promise<ProposalParseJob[]> {
    return db.select().from(proposalParseJobs)
      .where(eq(proposalParseJobs.status, "pending"))
      .orderBy(proposalParseJobs.createdAt);
  }

  // Impersonation
  async createImpersonationSession(data: InsertImpersonationSession): Promise<ImpersonationSession> {
    const [created] = await db.insert(impersonationSessions).values(data as any).returning();
    return created;
  }

  async getImpersonationSession(id: number): Promise<ImpersonationSession | undefined> {
    const [session] = await db.select().from(impersonationSessions).where(eq(impersonationSessions.id, id));
    return session;
  }

  async getImpersonationSessionByToken(token: string): Promise<ImpersonationSession | undefined> {
    const [session] = await db.select().from(impersonationSessions)
      .where(and(
        eq(impersonationSessions.sessionToken, token),
        eq(impersonationSessions.status, "active")
      ));
    return session;
  }

  async getActiveImpersonationSessions(originalUserId: string): Promise<ImpersonationSession[]> {
    return db.select().from(impersonationSessions)
      .where(and(
        eq(impersonationSessions.originalUserId, originalUserId),
        eq(impersonationSessions.status, "active")
      ))
      .orderBy(desc(impersonationSessions.startedAt));
  }

  async getAllActiveImpersonationSessions(): Promise<ImpersonationSession[]> {
    return db.select().from(impersonationSessions)
      .where(eq(impersonationSessions.status, "active"))
      .orderBy(desc(impersonationSessions.startedAt));
  }

  async endImpersonationSession(id: number): Promise<void> {
    await db.update(impersonationSessions)
      .set({ status: "ended", endedAt: new Date() })
      .where(eq(impersonationSessions.id, id));
  }

  async endAllImpersonationSessionsForUser(originalUserId: string): Promise<void> {
    await db.update(impersonationSessions)
      .set({ status: "ended", endedAt: new Date() })
      .where(and(
        eq(impersonationSessions.originalUserId, originalUserId),
        eq(impersonationSessions.status, "active")
      ));
  }

  async createImpersonationAuditLog(data: InsertImpersonationAuditLog): Promise<ImpersonationAuditLog> {
    const [created] = await db.insert(impersonationAuditLog).values(data as any).returning();
    return created;
  }

  async getImpersonationAuditLogs(orgId?: number, limit: number = 50, offset: number = 0): Promise<ImpersonationAuditLog[]> {
    let query = db.select().from(impersonationAuditLog);
    
    if (orgId) {
      query = query.where(eq(impersonationAuditLog.organizationId, orgId)) as any;
    }
    
    return query.orderBy(desc(impersonationAuditLog.createdAt)).limit(limit).offset(offset);
  }

  async getImpersonatableUsers(requestingUserId: string, orgId: number): Promise<OrganizationMember[]> {
    const requestingMember = await this.getOrganizationMember(orgId, requestingUserId);
    if (!requestingMember) return [];

    const allMembers = await this.getOrganizationMembers(orgId);
    
    switch (requestingMember.role) {
      case 'master_admin':
        return allMembers.filter(m => 
          m.userId !== requestingUserId && 
          m.role !== 'master_admin'
        );
      
      case 'relationship_manager':
        return allMembers.filter(m => 
          m.userId !== requestingUserId && 
          m.role === 'agent' &&
          m.managerId === requestingMember.id
        );
      
      default:
        return [];
    }
  }

  // Gamification
  async getGamificationProfile(userId: string): Promise<GamificationProfile | undefined> {
    const [profile] = await db.select().from(gamificationProfiles).where(eq(gamificationProfiles.userId, userId));
    return profile;
  }

  async upsertGamificationProfile(userId: string, data: Partial<GamificationProfile>): Promise<GamificationProfile> {
    const insertData: any = {
      userId,
      totalXp: data.totalXp ?? 0,
      currentLevel: data.currentLevel ?? 1,
      currentStreak: data.currentStreak ?? 0,
      longestStreak: data.longestStreak ?? 0,
      badgesEarned: data.badgesEarned ?? 0,
      certificatesEarned: data.certificatesEarned ?? 0,
      lastActivityDate: data.lastActivityDate ?? null,
    };

    const updateData: any = { updatedAt: new Date() };
    if (data.totalXp !== undefined) updateData.totalXp = data.totalXp;
    if (data.currentLevel !== undefined) updateData.currentLevel = data.currentLevel;
    if (data.currentStreak !== undefined) updateData.currentStreak = data.currentStreak;
    if (data.longestStreak !== undefined) updateData.longestStreak = data.longestStreak;
    if (data.badgesEarned !== undefined) updateData.badgesEarned = data.badgesEarned;
    if (data.certificatesEarned !== undefined) updateData.certificatesEarned = data.certificatesEarned;
    if (data.lastActivityDate !== undefined) updateData.lastActivityDate = data.lastActivityDate;

    const [result] = await db
      .insert(gamificationProfiles)
      .values(insertData)
      .onConflictDoUpdate({
        target: gamificationProfiles.userId,
        set: updateData,
      })
      .returning();
    return result;
  }

  async getXpLedger(userId: string, limit: number = 50): Promise<XpLedger[]> {
    return db.select().from(xpLedger).where(eq(xpLedger.userId, userId)).orderBy(desc(xpLedger.earnedAt)).limit(limit);
  }

  async createXpEntry(data: InsertXpLedger): Promise<XpLedger> {
    const [entry] = await db.insert(xpLedger).values(data).returning();
    return entry;
  }

  async getBadgesForUser(userId: string): Promise<BadgesEarned[]> {
    return db.select().from(badgesEarnedTable).where(eq(badgesEarnedTable.userId, userId)).orderBy(desc(badgesEarnedTable.earnedAt));
  }

  async createBadge(data: InsertBadgesEarned): Promise<BadgesEarned> {
    const [badge] = await db.insert(badgesEarnedTable).values(data).returning();
    return badge;
  }

  async getBadge(userId: string, badgeId: string): Promise<BadgesEarned | undefined> {
    const [badge] = await db
      .select()
      .from(badgesEarnedTable)
      .where(and(eq(badgesEarnedTable.userId, userId), eq(badgesEarnedTable.badgeId, badgeId)));
    return badge;
  }

  async getCertificatesForUser(userId: string): Promise<Certificate[]> {
    return db.select().from(certificates).where(eq(certificates.userId, userId)).orderBy(desc(certificates.issuedAt));
  }

  async createCertificate(data: InsertCertificate): Promise<Certificate> {
    const [cert] = await db.insert(certificates).values(data).returning();
    return cert;
  }

  async getCertificateByVerification(code: string): Promise<Certificate | undefined> {
    const [cert] = await db.select().from(certificates).where(eq(certificates.verificationCode, code));
    return cert;
  }

  async getDailyLog(userId: string, date: string): Promise<GamificationDailyLog | undefined> {
    const [log] = await db
      .select()
      .from(gamificationDailyLog)
      .where(and(eq(gamificationDailyLog.userId, userId), eq(gamificationDailyLog.logDate, date)));
    return log;
  }

  async upsertDailyLog(userId: string, date: string, xpToAdd: number): Promise<GamificationDailyLog> {
    const [result] = await db
      .insert(gamificationDailyLog)
      .values({
        userId,
        logDate: date,
        xpEarned: xpToAdd,
        activitiesCompleted: 1,
      })
      .onConflictDoUpdate({
        target: [gamificationDailyLog.userId, gamificationDailyLog.logDate],
        set: {
          xpEarned: sql`${gamificationDailyLog.xpEarned} + ${xpToAdd}`,
          activitiesCompleted: sql`${gamificationDailyLog.activitiesCompleted} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getOrgGamificationProfiles(userIds: string[]): Promise<GamificationProfile[]> {
    if (userIds.length === 0) return [];
    return db.select().from(gamificationProfiles).where(inArray(gamificationProfiles.userId, userIds));
  }
}

export const storage = new DatabaseStorage();
